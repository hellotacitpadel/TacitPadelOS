import { Client } from "@notionhq/client";
import { Worker } from "@notionhq/workers";
import * as Builder from "@notionhq/workers/builder";
import * as Schema from "@notionhq/workers/schema";
import { j } from "@notionhq/workers/schema-builder";
const worker = new Worker();
export default worker;
const FX_RATES_DATA_SOURCE_ID = "94e5abc1-d98e-4181-8a8e-42f973902924";
const BALANCE_SHEET_DATA_SOURCE_ID = "267afdfb-c3c7-81d9-bc0f-000bb3cd7f70";
const SALES_DATA_SOURCE_ID = "261afdfb-c3c7-81d5-b4a7-000b0f69814f";
const OUTPUT_CURRENCIES = [
    "GBP",
    "USD",
    "EUR",
    "INR",
    "SGD",
    "AUD",
    "JPY",
    "CNY",
    "MYR",
    "THB",
    "HKD",
    "KRW",
    "AED",
    "PHP",
    "VND",
];
const SEEDED_BASE_CURRENCIES = OUTPUT_CURRENCIES;
const QUOTE_CURRENCY = "IDR";
const FX_BACKFILL_START = "2025-09-01";
const DAILY_LOOKBACK_DAYS = 30;
const IDR_STORAGE_DIVISOR = 1000;
const HEADER_SOURCE_VALUE = "balance-sheet-fx-v1";
const FLOAT_EPSILON = 0.0005;
const VALIDATION_CONCURRENCY = 25;
const frankfurterApi = worker.pacer("frankfurterApi", {
    allowedRequests: 1,
    intervalMs: 400,
});
const fxRates = worker.database("fxRates", {
    type: "attached",
    initialTitle: "TP: FX Rates",
    primaryKeyProperty: "Key",
    schema: {
        properties: {
            Name: Schema.title(),
            Key: Schema.richText(),
            "Base Currency": Schema.richText(),
            "Quote Currency": Schema.richText(),
            Rate: Schema.number(),
            "Rate Date": Schema.date(),
            "Effective Rate Date": Schema.date(),
            "Retrieved At": Schema.date(),
            Provider: Schema.richText(),
            "Source URL": Schema.url(),
        },
    },
});
worker.sync("fxRatesDaily", {
    database: fxRates,
    mode: "incremental",
    schedule: "24h",
    execute: async () => {
        const endDate = todayIsoDate();
        const startDate = shiftIsoDate(endDate, -(DAILY_LOOKBACK_DAYS - 1));
        return syncRateWindow(startDate, endDate, [...SEEDED_BASE_CURRENCIES]);
    },
});
worker.sync("fxRatesBackfill", {
    database: fxRates,
    mode: "incremental",
    schedule: "manual",
    execute: async () => {
        return syncRateWindow(FX_BACKFILL_START, todayIsoDate(), [...SEEDED_BASE_CURRENCIES]);
    },
});
worker.tool("updateBalanceSheetFx", {
    title: "Update Balance Sheet FX",
    description: "Recalculate the FX-derived Balance Sheet outputs for one Balance Sheet row.",
    schema: j.object({
        pageIdOrUrl: j
            .string()
            .describe("The Balance Sheet page ID or page URL to recalculate."),
    }),
    execute: async ({ pageIdOrUrl }, context) => {
        const notion = getNotionClient(context);
        return reconcileBalanceSheetRow(notion, parsePageIdOrUrl(pageIdOrUrl));
    },
});
worker.tool("reconcileBalanceSheetFx", {
    title: "Reconcile Balance Sheet FX",
    description: "Preview FX differences without writes by default. Apply only with explicit mode=apply. Set fillMissingPricesOnly=true to populate empty Price fields without changing populated prices or FX audit metadata. Process at most 25 rows per call; use nextCursor for the next batch.",
    schema: j.object({
        pageIdsOrUrls: j.array(j.string()).describe("Explicit Balance Sheet rows; at most 25. Null to scan a batch.").nullable(),
        limit: j.number().describe("Batch size, 1 to 25; defaults to 10.").nullable(),
        mode: j.enum("preview", "apply").describe("Null or preview means NO WRITES. Apply must be explicit.").nullable(),
        startCursor: j.string().describe("Cursor from the preceding scan batch; null for the first batch.").nullable(),
        fillMissingPricesOnly: j.boolean().describe("When true, write only empty Price fields and leave populated prices and FX audit metadata untouched.").nullable(),
    }),
    execute: async ({ pageIdsOrUrls, limit, mode, startCursor, fillMissingPricesOnly }, context) => {
        const notion = getNotionClient(context);
        const resolvedMode = mode ?? "preview";
        if (resolvedMode !== "preview" && resolvedMode !== "apply") {
            throw new Error("mode must be preview or apply.");
        }
        if (pageIdsOrUrls && pageIdsOrUrls.length > 25) {
            throw new Error("Supply at most 25 explicit rows per call.");
        }
        if (pageIdsOrUrls?.length && startCursor) {
            throw new Error("Use either explicit rows or a scan cursor, not both.");
        }
        const batch = pageIdsOrUrls?.length
            ? { pageIds: [...new Set(pageIdsOrUrls.map(parsePageIdOrUrl))], hasMore: false, nextCursor: null }
            : await listBalanceSheetPageBatch(notion, clamp(Math.trunc(limit ?? 10), 1, 25), startCursor);
        const results = [];
        const errors = [];
        for (const pageId of batch.pageIds) {
            try {
                results.push(await reconcileBalanceSheetRow(notion, pageId, resolvedMode === "preview", fillMissingPricesOnly ?? false));
            }
            catch (error) {
                errors.push({ pageId, error: error instanceof Error ? error.message : String(error) });
            }
        }
        return {
            mode: resolvedMode,
            processed: batch.pageIds.length,
            wouldUpdate: results.filter((result) => result.changedFields.length > 0).length,
            updated: results.filter((result) => result.applied).length,
            skipped: results.filter((result) => result.skipped).length,
            errorCount: errors.length,
            hasMore: batch.hasMore,
            nextCursor: batch.nextCursor,
            results,
            errors,
        };
    },
});
worker.tool("previewBalanceSheetRecordTypes", {
    title: "Preview Balance Sheet record types",
    description: "Preview the deterministic Transaction, Forecast and Container classification without writing any Balance Sheet records.",
    schema: j.object({}),
    execute: async (_input, context) => {
        const notion = getNotionClient(context);
        const pages = await listAllBalanceSheetPages(notion);
        const counts = { Transaction: 0, Forecast: 0, Container: 0 };
        const rows = pages.map((page) => {
            const proposedRecordType = inferRecordType(page);
            counts[proposedRecordType] += 1;
            return {
                pageId: page.id,
                item: getRichText(page, "Item") ?? "",
                proposedRecordType,
                reason: recordTypeReason(page, proposedRecordType),
            };
        });
        return { scanned: rows.length, counts, rows };
    },
});
worker.tool("classifyBalanceSheetRecordTypes", {
    title: "Classify Balance Sheet record types",
    description: "Preview or apply the deterministic Record Type migration in bounded batches. Apply must be explicit.",
    schema: j.object({
        mode: j.enum("preview", "apply").describe("Preview makes no writes. Apply is required to update Record Type.").nullable(),
        limit: j.number().describe("Batch size, 1 to 100; defaults to 50.").nullable(),
        startCursor: j.string().describe("Cursor from the preceding batch; null starts from the first row.").nullable(),
    }),
    execute: async ({ mode, limit, startCursor }, context) => {
        const notion = getNotionClient(context);
        const resolvedMode = mode ?? "preview";
        const batch = await listBalanceSheetPageDetailedBatch(notion, clamp(Math.trunc(limit ?? 50), 1, 100), startCursor);
        const counts = { Transaction: 0, Forecast: 0, Container: 0 };
        let changed = 0;
        for (const page of batch.pages) {
            const proposedRecordType = inferRecordType(page);
            counts[proposedRecordType] += 1;
            if (resolvedMode === "apply" &&
                getSelectName(page, "Record Type") !== proposedRecordType) {
                await notion.pages.update({
                    page_id: page.id,
                    properties: { "Record Type": { select: { name: proposedRecordType } } },
                });
                changed += 1;
            }
        }
        return {
            mode: resolvedMode,
            processed: batch.pages.length,
            changed,
            counts,
            hasMore: batch.hasMore,
            nextCursor: batch.nextCursor,
        };
    },
});
worker.tool("migrateBalanceSheetFxSourceInputs", {
    title: "Migrate Balance Sheet FX source inputs",
    description: "Preview or apply the approved, deterministic migration from legacy FX evidence to FX Source Currency and FX Source Amount for direct Transactions only. Sales-linked rows are excluded.",
    schema: j.object({
        mode: j.enum("preview", "apply").describe("Preview makes no writes. Apply is required to populate source inputs.").nullable(),
        limit: j.number().describe("Batch size, 1 to 100; defaults to 50.").nullable(),
        startCursor: j.string().describe("Cursor from the preceding batch; null starts from the first row.").nullable(),
    }),
    execute: async ({ mode, limit, startCursor }, context) => {
        const notion = getNotionClient(context);
        const resolvedMode = mode ?? "preview";
        const batch = await listBalanceSheetPageDetailedBatch(notion, clamp(Math.trunc(limit ?? 50), 1, 100), startCursor);
        const results = [];
        let candidates = 0;
        let changed = 0;
        let held = 0;
        for (const page of batch.pages) {
            const item = getRichText(page, "Item") ?? "";
            if (getSelectName(page, "Record Type") !== "Transaction") {
                results.push({ pageId: page.id, item, outcome: "excluded-non-transaction" });
                continue;
            }
            if (getRelationIds(page, "Sales").length > 0) {
                results.push({ pageId: page.id, item, outcome: "excluded-sales-linked" });
                continue;
            }
            const sourceCurrency = getSelectName(page, "FX Source Currency");
            const sourceAmount = getNumber(page, "FX Source Amount");
            if (sourceCurrency && sourceAmount !== null) {
                results.push({ pageId: page.id, item, outcome: "already-populated" });
                continue;
            }
            if (sourceCurrency || sourceAmount !== null) {
                held += 1;
                results.push({ pageId: page.id, item, outcome: "held-partial-source" });
                continue;
            }
            const source = determineSource(page);
            if (source.kind !== "ok" || !["existing-fx-fields", "single-populated-price"].includes(source.sourceKind)) {
                held += 1;
                results.push({ pageId: page.id, item, outcome: "held-no-unambiguous-legacy-source" });
                continue;
            }
            candidates += 1;
            results.push({
                pageId: page.id,
                item,
                outcome: "candidate",
                sourceCurrency: source.sourceCurrency,
                sourceAmount: source.sourceAmount,
            });
            if (resolvedMode === "apply") {
                await notion.pages.update({
                    page_id: page.id,
                    properties: {
                        "FX Source Currency": { select: { name: source.sourceCurrency } },
                        "FX Source Amount": { number: source.sourceAmount },
                    },
                });
                changed += 1;
            }
        }
        return {
            mode: resolvedMode,
            processed: batch.pages.length,
            candidates,
            changed,
            held,
            hasMore: batch.hasMore,
            nextCursor: batch.nextCursor,
            results,
        };
    },
});
worker.tool("previewBalanceSheetValidation", {
    title: "Preview Balance Sheet validation",
    description: "Read-only summary of validation issues before or after a manual validation run.",
    schema: j.object({}),
    execute: async (_input, context) => {
        const notion = getNotionClient(context);
        const pages = await listAllBalanceSheetPages(notion);
        const salesLinkedPageIds = await listSalesLinkedBalanceSheetPageIds(notion);
        const issueCounts = {};
        const byRecordType = {};
        let salesLinked = 0;
        let salesFormulaPopulated = 0;
        let salesFormulaPositive = 0;
        let flagged = 0;
        for (const page of pages) {
            const recordType = getSelectName(page, "Record Type") ?? "(blank)";
            byRecordType[recordType] = (byRecordType[recordType] ?? 0) + 1;
            const isSalesLinked = salesLinkedPageIds.has(normaliseNotionId(page.id));
            if (isSalesLinked)
                salesLinked += 1;
            const tacitNetSales = getFormulaNumber(page, "Tacit Net Sales (IDR)");
            if (tacitNetSales !== null)
                salesFormulaPopulated += 1;
            if (tacitNetSales !== null && tacitNetSales > 0)
                salesFormulaPositive += 1;
            const issues = getValidationIssues(page, recordType === "(blank)" ? null : recordType, isSalesLinked);
            if (issues.length > 0)
                flagged += 1;
            for (const issue of issues)
                issueCounts[issue] = (issueCounts[issue] ?? 0) + 1;
        }
        return { scanned: pages.length, flagged, salesLinked, salesFormulaPopulated, salesFormulaPositive, byRecordType, issueCounts };
    },
});
worker.tool("inspectBalanceSheetSalesLink", {
    title: "Inspect Balance Sheet Sales relation",
    description: "Diagnostic read-only inspection of a Balance Sheet row's Sales relation.",
    schema: j.object({ pageId: j.string() }),
    execute: async ({ pageId }, context) => {
        const notion = getNotionClient(context);
        const page = (await notion.pages.retrieve({ page_id: pageId }));
        return { pageId: page.id, sales: page.properties?.["Sales"], salesIds: getRelationIds(page, "Sales") };
    },
});
worker.tool("previewSalesBalanceSheetLinks", {
    title: "Preview Sales Balance Sheet links",
    description: "Read-only check that the Worker can read TP: Sales and its reverse Balance Sheet relation.",
    schema: j.object({}),
    execute: async (_input, context) => {
        const notion = getNotionClient(context);
        const pages = [];
        let cursor;
        do {
            const response = await notion.dataSources.query({
                data_source_id: SALES_DATA_SOURCE_ID,
                result_type: "page",
                page_size: 100,
                ...(cursor ? { start_cursor: cursor } : {}),
            });
            pages.push(...response.results);
            cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
        } while (cursor);
        const linkedPageIds = new Set();
        for (const page of pages) {
            for (const id of getRelationIds(page, "Balance Sheet"))
                linkedPageIds.add(id);
        }
        return { scannedSales: pages.length, balanceSheetLinks: linkedPageIds.size };
    },
});
worker.webhook("balanceSheetFx", {
    title: "Balance Sheet FX webhook",
    description: "Refresh FX-derived Balance Sheet outputs when the Balance Sheet automation fires.",
    execute: async (events, context) => {
        const notion = getNotionClient(context);
        for (const event of events) {
            const sourceHeader = getHeader(event.headers, "x-tacitos-source");
            if (sourceHeader && sourceHeader !== HEADER_SOURCE_VALUE) {
                console.warn(`Unexpected X-TacitOS-Source header: ${sourceHeader}`);
            }
            const pageIds = extractBalanceSheetPageIds(event.body);
            if (pageIds.length === 0) {
                throw new Error(`No Balance Sheet page ID found in webhook payload: ${truncateJson(event.body)}`);
            }
            for (const pageId of pageIds) {
                const result = await reconcileBalanceSheetRow(notion, pageId);
                console.log(JSON.stringify({ capability: "balanceSheetFx", ...result }));
            }
        }
    },
});
worker.webhook("balanceSheetValidation", {
    title: "Balance Sheet validation webhook",
    description: "Run the manual whole-Balance-Sheet validation sweep and update only the Review checkbox.",
    execute: async (_events, context) => {
        const notion = getNotionClient(context);
        const pages = await listAllBalanceSheetPages(notion);
        const salesLinkedPageIds = await listSalesLinkedBalanceSheetPageIds(notion);
        const results = [];
        // Webhooks have a five-minute runtime limit. Bounded concurrent writes
        // keep a full database sweep inside that limit without an unbounded burst.
        for (let offset = 0; offset < pages.length; offset += VALIDATION_CONCURRENCY) {
            const batch = pages.slice(offset, offset + VALIDATION_CONCURRENCY);
            results.push(...(await Promise.all(batch.map((page) => validateBalanceSheetPage(notion, page, salesLinkedPageIds)))));
        }
        const flagged = results.filter((result) => result.review);
        const changed = results.filter((result) => result.changed);
        const issueCounts = {};
        for (const result of results) {
            for (const issue of result.issues) {
                issueCounts[issue] = (issueCounts[issue] ?? 0) + 1;
            }
        }
        // Contract readback: re-read every written row and compare the persisted
        // Review value to the computed result. A mismatch means the sweep cannot be
        // reported as complete.
        const mismatches = [];
        for (let offset = 0; offset < changed.length; offset += VALIDATION_CONCURRENCY) {
            const batch = changed.slice(offset, offset + VALIDATION_CONCURRENCY);
            await Promise.all(batch.map(async (result) => {
                const persisted = (await notion.pages.retrieve({ page_id: result.pageId }));
                const persistedReview = getCheckbox(persisted, "Review");
                if (persistedReview !== result.review) {
                    mismatches.push({ pageId: result.pageId, expected: result.review, persisted: persistedReview });
                }
            }));
        }
        console.log(JSON.stringify({
            capability: "balanceSheetValidation",
            complete: mismatches.length === 0,
            scanned: results.length,
            flagged: flagged.length,
            changed: changed.length,
            issueCounts,
            readbackMismatches: mismatches,
        }));
        if (mismatches.length > 0) {
            throw new Error(`Validation readback mismatch on ${mismatches.length} row(s): ${mismatches
                .map((m) => m.pageId)
                .join(", ")}`);
        }
    },
});
async function validateBalanceSheetPage(notion, page, salesLinkedPageIds) {
    const recordType = getSelectName(page, "Record Type");
    const issues = getValidationIssues(page, recordType, salesLinkedPageIds.has(normaliseNotionId(page.id)));
    const review = issues.length > 0;
    const currentReview = getCheckbox(page, "Review");
    let changed = false;
    if (currentReview !== review) {
        await notion.pages.update({
            page_id: page.id,
            properties: { Review: { checkbox: review } },
        });
        changed = true;
    }
    return { pageId: page.id, recordType, review, changed, issues };
}
function getValidationIssues(page, recordType, salesLinked = false) {
    const requiredProperties = [
        "Record Type",
        "Review",
        "In/Out",
        "Transaction Date",
        "Payment Status",
        "Reimbursement Status",
        "Sales",
        "FX Source Currency",
        "FX Source Amount",
        "FX currency used",
        "FX rate used",
        "FX timestamp",
        "Price (IDR)",
    ];
    const missingSchema = requiredProperties.filter((propertyName) => !page.properties?.[propertyName]);
    if (missingSchema.length > 0) {
        throw new Error(`Validation schema is incomplete: missing ${missingSchema.join(", ")}.`);
    }
    if (recordType === "Forecast") {
        return getForecastValidationIssues(page);
    }
    if (recordType === "Container") {
        return getContainerValidationIssues(page);
    }
    if (recordType !== "Transaction") {
        return ["Record Type must be Transaction, Forecast or Container."];
    }
    return getTransactionValidationIssues(page, salesLinked);
}
function inferRecordType(page) {
    const transactionDate = getDateStart(page, "Transaction Date");
    if (getRelationIds(page, "Sub-item").length > 0 && !transactionDate) {
        return "Container";
    }
    if (!transactionDate || transactionRateDate(transactionDate) > todayIsoDate()) {
        return "Forecast";
    }
    return "Transaction";
}
function recordTypeReason(page, recordType) {
    if (recordType === "Container") {
        return "Has sub-items and no Transaction Date.";
    }
    if (recordType === "Forecast") {
        return getDateStart(page, "Transaction Date")
            ? "Transaction Date is in the future."
            : "No Transaction Date.";
    }
    return "Transaction Date is today or in the past.";
}
function getTransactionValidationIssues(page, salesLinked) {
    const issues = [];
    const direction = getSelectName(page, "In/Out");
    const paymentStatus = getSelectName(page, "Payment Status");
    const reimbursementStatus = getSelectName(page, "Reimbursement Status");
    const transactionDate = getDateStart(page, "Transaction Date");
    const fxSourceCurrency = getSelectName(page, "FX Source Currency");
    const fxSourceAmount = getNumber(page, "FX Source Amount");
    const fxAuditComplete = getSelectName(page, "FX currency used") !== null &&
        getNumber(page, "FX rate used") !== null &&
        getDateStart(page, "FX timestamp") !== null &&
        getNumber(page, "Price (IDR)") !== null;
    if (direction !== "Incoming" && direction !== "Outgoing") {
        issues.push("Transaction requires In/Out.");
    }
    if (!transactionDate) {
        issues.push("Transaction requires Transaction Date.");
    }
    else if (transactionRateDate(transactionDate) > todayIsoDate()) {
        issues.push("Transaction Date is in the future; use Forecast until it is actual.");
    }
    if (!paymentStatus) {
        issues.push("Transaction requires Payment Status.");
    }
    // Reimbursement is an outgoing-expense lifecycle. Incoming revenue does not
    // need a reimbursement status or an outgoing status-pair check.
    if (direction === "Outgoing" && !reimbursementStatus) {
        issues.push("Outgoing Transaction requires Reimbursement Status.");
    }
    if (transactionDate &&
        transactionRateDate(transactionDate) <= todayIsoDate() &&
        (paymentStatus === "Unpaid" || paymentStatus === "Deferred")) {
        issues.push("Actual Transaction cannot be Unpaid or Deferred.");
    }
    if (direction === "Outgoing" && !isValidStatusPair(paymentStatus, reimbursementStatus)) {
        issues.push("Outgoing Payment Status and Reimbursement Status are an invalid combination.");
    }
    // A Sales-linked record is recognised by its Sale. It must not be forced
    // into the direct-entry FX model or treated as incomplete for lacking it.
    if (!salesLinked) {
        if (!fxSourceCurrency || fxSourceAmount === null) {
            issues.push("Direct Transaction requires FX Source Currency and FX Source Amount.");
        }
        if (!fxAuditComplete) {
            issues.push("Direct Transaction requires a complete FX output and audit trail.");
        }
    }
    return issues;
}
function getForecastValidationIssues(page) {
    const issues = [];
    const paymentStatus = getSelectName(page, "Payment Status");
    const reimbursementStatus = getSelectName(page, "Reimbursement Status");
    if (paymentStatus === "Paid" || paymentStatus === "Reconciled") {
        issues.push("Forecast cannot be Paid or Reconciled.");
    }
    if (reimbursementStatus === "Claimed" || reimbursementStatus === "Reimbursed") {
        issues.push("Forecast cannot be Claimed or Reimbursed.");
    }
    return issues;
}
function getContainerValidationIssues(page) {
    const issues = [];
    if (getDateStart(page, "Transaction Date")) {
        issues.push("Container must not have Transaction Date.");
    }
    if (getSelectName(page, "Payment Status")) {
        issues.push("Container must not have Payment Status.");
    }
    if (getSelectName(page, "Reimbursement Status")) {
        issues.push("Container must not have Reimbursement Status.");
    }
    if (getSelectName(page, "FX Source Currency") ||
        getNumber(page, "FX Source Amount") !== null ||
        getSelectName(page, "FX currency used") ||
        getNumber(page, "FX rate used") !== null ||
        getDateStart(page, "FX timestamp") ||
        getNumber(page, "Price (IDR)") !== null) {
        issues.push("Container must not hold transaction or FX values.");
    }
    return issues;
}
function isValidStatusPair(paymentStatus, reimbursementStatus) {
    if (paymentStatus === "Unpaid" || paymentStatus === "Deferred") {
        return reimbursementStatus === "Direct";
    }
    if (paymentStatus === "Paid") {
        return ["Direct", "Unclaimed", "Claimed", "Reimbursed"].includes(reimbursementStatus ?? "");
    }
    if (paymentStatus === "Reconciled") {
        return reimbursementStatus === "Direct" || reimbursementStatus === "Reimbursed";
    }
    return false;
}
async function syncRateWindow(startDate, endDate, bases) {
    const nowIso = new Date().toISOString();
    const changes = [];
    for (const base of bases) {
        const rows = await fetchFrankfurterSeries(base, [QUOTE_CURRENCY], startDate, endDate);
        for (const row of rows) {
            changes.push({
                type: "upsert",
                key: buildRateKey(row.date, row.base, row.quote),
                properties: {
                    Name: Builder.title(`${row.base}/${row.quote} · ${row.date}`),
                    Key: Builder.richText(buildRateKey(row.date, row.base, row.quote)),
                    "Base Currency": Builder.richText(row.base),
                    "Quote Currency": Builder.richText(row.quote),
                    Rate: Builder.number(row.rate),
                    "Rate Date": Builder.date(row.date),
                    "Effective Rate Date": Builder.date(row.date),
                    "Retrieved At": Builder.dateTime(nowIso),
                    Provider: Builder.richText("Frankfurter"),
                    "Source URL": Builder.url(row.sourceUrl),
                },
            });
        }
    }
    return {
        changes,
        hasMore: false,
    };
}
async function reconcileBalanceSheetRow(notion, pageId, preview = false, fillMissingPricesOnly = false) {
    const page = (await notion.pages.retrieve({ page_id: pageId }));
    const parent = page.parent;
    const dataSourceId = parent?.data_source_id;
    if (!dataSourceId || normaliseNotionId(dataSourceId) !== BALANCE_SHEET_DATA_SOURCE_ID) {
        throw new Error("Refusing to process a page outside TP: Balance Sheet.");
    }
    if (page.archived || page.in_trash) {
        return { pageId, transactionDate: null, skipped: true, reason: "Row is archived or trashed.", changedFields: [] };
    }
    const rawTransactionDate = getDateStart(page, "Transaction Date");
    const transactionDate = rawTransactionDate ? transactionRateDate(rawTransactionDate) : null;
    if (!transactionDate) {
        return {
            pageId,
            transactionDate: null,
            skipped: true,
            reason: "Transaction Date is empty.",
            changedFields: [],
        };
    }
    if (transactionDate.slice(0, 10) > todayIsoDate()) {
        return { pageId, transactionDate, skipped: true, reason: "Transaction Date is in the future.", changedFields: [] };
    }
    const sourceDecision = determineSource(page);
    if (sourceDecision.kind === "skip") {
        return {
            pageId,
            transactionDate,
            skipped: true,
            reason: sourceDecision.reason,
            changedFields: [],
        };
    }
    if (!Number.isFinite(sourceDecision.sourceAmount)) {
        throw new Error("FX source amount must be finite.");
    }
    const prices = await calculateAllPrices(notion, transactionDate, sourceDecision.sourceCurrency, sourceDecision.sourceAmount);
    const rateUsed = sourceDecision.sourceCurrency === "IDR"
        ? 1
        : (await getBaseToIdrRate(notion, sourceDecision.sourceCurrency, transactionDate)).rate;
    const updateProperties = {};
    const changedFields = [];
    const setPrice = fillMissingPricesOnly ? maybeSetMissingNumber : maybeSetNumber;
    for (const currency of OUTPUT_CURRENCIES) {
        setPrice(updateProperties, changedFields, page, `Price (${currency})`, prices[currency]);
    }
    setPrice(updateProperties, changedFields, page, "Price (IDR)", prices.IDR);
    if (!fillMissingPricesOnly) {
        maybeSetSelect(updateProperties, changedFields, page, "FX currency used", sourceDecision.sourceCurrency);
        maybeSetNumber(updateProperties, changedFields, page, "FX rate used", rateUsed);
    }
    if (changedFields.length > 0 && !preview) {
        if (!fillMissingPricesOnly) {
            updateProperties["FX timestamp"] = {
                date: { start: new Date().toISOString() },
            };
        }
        await notion.pages.update({
            page_id: pageId,
            properties: updateProperties,
        });
    }
    return {
        pageId,
        transactionDate,
        skipped: false,
        sourceCurrency: sourceDecision.sourceCurrency,
        sourceAmount: sourceDecision.sourceAmount,
        rateUsed,
        changedFields,
        applied: changedFields.length > 0 && !preview,
    };
}
function determineSource(page) {
    const fxSourceCurrency = getSelectName(page, "FX Source Currency");
    const fxSourceAmount = getNumber(page, "FX Source Amount");
    const existingCurrencyUsed = getSelectName(page, "FX currency used");
    const salesRelationIds = getRelationIds(page, "Sales");
    const tacitNetSalesIdr = getFormulaNumber(page, "Tacit Net Sales (IDR)");
    if (fxSourceCurrency && fxSourceAmount !== null) {
        return {
            kind: "ok",
            sourceCurrency: fxSourceCurrency,
            sourceAmount: fxSourceAmount,
            sourceKind: "fx-source-fields",
        };
    }
    if (fxSourceCurrency && fxSourceAmount === null) {
        return {
            kind: "skip",
            reason: "FX Source Currency is set but FX Source Amount is empty.",
        };
    }
    if (!fxSourceCurrency && fxSourceAmount !== null) {
        return {
            kind: "skip",
            reason: "FX Source Amount is set but FX Source Currency is empty.",
        };
    }
    if (existingCurrencyUsed) {
        const currentAmount = getStoredAmountForCurrency(page, existingCurrencyUsed);
        if (currentAmount !== null) {
            return {
                kind: "ok",
                sourceCurrency: existingCurrencyUsed,
                sourceAmount: currentAmount,
                sourceKind: "existing-fx-fields",
            };
        }
    }
    if (salesRelationIds.length > 0 && tacitNetSalesIdr !== null) {
        return {
            kind: "ok",
            sourceCurrency: "IDR",
            sourceAmount: tacitNetSalesIdr * IDR_STORAGE_DIVISOR,
            sourceKind: "sales-net-idr",
        };
    }
    const inferred = inferSingleLegacySource(page);
    if (inferred) {
        return {
            kind: "ok",
            sourceCurrency: inferred.currency,
            sourceAmount: inferred.amount,
            sourceKind: "single-populated-price",
        };
    }
    return {
        kind: "skip",
        reason: "No authoritative FX source was found. Expected FX Source Currency + FX Source Amount, an existing FX currency used + matching price, or Sales-driven IDR.",
    };
}
function inferSingleLegacySource(page) {
    const populated = [];
    for (const currency of [...OUTPUT_CURRENCIES, "IDR"]) {
        const amount = getStoredAmountForCurrency(page, currency);
        if (amount !== null) {
            populated.push({ currency, amount });
        }
    }
    if (populated.length === 1) {
        return populated[0];
    }
    return null;
}
async function calculateAllPrices(notion, transactionDate, sourceCurrency, sourceAmount) {
    const sourceUpper = sourceCurrency.toUpperCase();
    const idrFullAmount = sourceUpper === "IDR"
        ? sourceAmount
        : sourceAmount * (await getBaseToIdrRate(notion, sourceUpper, transactionDate)).rate;
    const prices = {};
    for (const currency of OUTPUT_CURRENCIES) {
        const rate = await getBaseToIdrRate(notion, currency, transactionDate);
        prices[currency] = roundCurrency(idrFullAmount / rate.rate, currency);
    }
    prices.IDR = roundCurrency(idrFullAmount / IDR_STORAGE_DIVISOR, "IDR");
    return prices;
}
const rateCache = new Map();
const rateStoreCache = new Map();
async function getBaseToIdrRate(notion, base, date) {
    const baseUpper = base.toUpperCase();
    if (baseUpper === QUOTE_CURRENCY) {
        return {
            base: QUOTE_CURRENCY,
            quote: QUOTE_CURRENCY,
            date,
            rate: 1,
            sourceUrl: "identity",
        };
    }
    const key = buildRateKey(date, baseUpper, QUOTE_CURRENCY);
    const cached = rateCache.get(key);
    if (cached) {
        return cached;
    }
    const promise = (async () => {
        const rates = await getFxRatesFromStore(notion, date);
        const existing = rates.get(baseUpper);
        if (existing) {
            return existing;
        }
        const rows = await fetchFrankfurterSeries(baseUpper, [QUOTE_CURRENCY], date, date, false);
        const row = rows.find((item) => item.quote === QUOTE_CURRENCY);
        if (!row) {
            throw new Error(`No FX rate returned for ${baseUpper}/${QUOTE_CURRENCY} on ${date}.`);
        }
        return row;
    })();
    rateCache.set(key, promise);
    return promise;
}
async function getFxRatesFromStore(notion, date) {
    const cached = rateStoreCache.get(date);
    if (cached) {
        return cached;
    }
    const promise = (async () => {
        const response = await notion.dataSources.query({
            data_source_id: FX_RATES_DATA_SOURCE_ID,
            result_type: "page",
            page_size: 100,
            filter: {
                and: [
                    {
                        property: "Quote Currency",
                        rich_text: { equals: QUOTE_CURRENCY },
                    },
                    {
                        property: "Rate Date",
                        date: { equals: date },
                    },
                ],
            },
        });
        const rates = new Map();
        for (const result of response.results) {
            if (result.object !== "page") {
                continue;
            }
            const page = result;
            const base = getRichText(page, "Base Currency")?.toUpperCase();
            const quote = getRichText(page, "Quote Currency")?.toUpperCase();
            const rateDate = getDateStart(page, "Rate Date");
            const rate = getNumber(page, "Rate");
            const sourceUrl = getUrl(page, "Source URL") ?? "";
            if (base && quote === QUOTE_CURRENCY && rateDate === date && rate !== null) {
                rates.set(base, { base, quote, date: rateDate, rate, sourceUrl });
            }
        }
        return rates;
    })();
    rateStoreCache.set(date, promise);
    return promise;
}
async function fetchFrankfurterSeries(base, quotes, from, to, useSyncPacer = true) {
    if (useSyncPacer) {
        await frankfurterApi.wait();
    }
    else {
        // SDK 0.9.2 initialises declared pacers for syncs only. Tool/webhook
        // lookups are sequential within each run; retain 400 ms request spacing
        // without calling an uninitialised sync-only runtime pacer.
        await new Promise((resolve) => setTimeout(resolve, 400));
    }
    const params = new URLSearchParams({
        base,
        quotes: quotes.join(","),
        from,
        to,
    });
    const sourceUrl = `https://api.frankfurter.dev/v2/rates?${params.toString()}`;
    const response = await fetch(sourceUrl);
    if (!response.ok) {
        throw new Error(`Frankfurter request failed: ${response.status} ${response.statusText}`);
    }
    const payload = (await response.json());
    if (!Array.isArray(payload)) {
        throw new Error(`Unexpected Frankfurter payload: ${truncateJson(payload)}`);
    }
    return payload.map((item) => ({
        base: String(item.base ?? base).toUpperCase(),
        quote: String(item.quote ?? quotes[0]).toUpperCase(),
        date: String(item.date),
        rate: Number(item.rate),
        sourceUrl,
    }));
}
async function listBalanceSheetPageBatch(notion, limit, startCursor) {
    const response = await notion.dataSources.query({
        data_source_id: BALANCE_SHEET_DATA_SOURCE_ID,
        result_type: "page",
        page_size: limit,
        ...(startCursor ? { start_cursor: startCursor } : {}),
        // Stable ordering: applying outputs must not reorder the scan.
        sorts: [{ timestamp: "created_time", direction: "ascending" }],
    });
    return {
        pageIds: response.results.filter((result) => result.object === "page").map((result) => result.id),
        hasMore: response.has_more,
        nextCursor: response.next_cursor,
    };
}
async function listAllBalanceSheetPages(notion) {
    const pages = [];
    let cursor;
    do {
        const response = await notion.dataSources.query({
            data_source_id: BALANCE_SHEET_DATA_SOURCE_ID,
            result_type: "page",
            page_size: 100,
            ...(cursor ? { start_cursor: cursor } : {}),
            sorts: [{ timestamp: "created_time", direction: "ascending" }],
        });
        pages.push(...response.results.filter((result) => result.object === "page" && !result.archived && !result.in_trash));
        cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
    } while (cursor);
    return pages;
}
async function listSalesLinkedBalanceSheetPageIds(notion) {
    const linkedPageIds = new Set();
    let cursor;
    do {
        const response = await notion.dataSources.query({
            data_source_id: SALES_DATA_SOURCE_ID,
            result_type: "page",
            page_size: 100,
            ...(cursor ? { start_cursor: cursor } : {}),
        });
        for (const page of response.results) {
            for (const pageId of getRelationIds(page, "Balance Sheet")) {
                linkedPageIds.add(pageId);
            }
        }
        cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
    } while (cursor);
    return linkedPageIds;
}
async function listBalanceSheetPageDetailedBatch(notion, limit, startCursor) {
    const response = await notion.dataSources.query({
        data_source_id: BALANCE_SHEET_DATA_SOURCE_ID,
        result_type: "page",
        page_size: limit,
        ...(startCursor ? { start_cursor: startCursor } : {}),
        sorts: [{ timestamp: "created_time", direction: "ascending" }],
    });
    return {
        pages: response.results.filter((result) => result.object === "page" && !result.archived && !result.in_trash),
        hasMore: response.has_more,
        nextCursor: response.next_cursor ?? null,
    };
}
function transactionRateDate(value) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value))
        return value;
    const instant = new Date(value);
    if (!Number.isFinite(instant.getTime()))
        throw new Error("Invalid Transaction Date.");
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(instant);
    const part = (type) => parts.find((item) => item.type === type)?.value;
    return `${part("year")}-${part("month")}-${part("day")}`;
}
function getNotionClient(context) {
    const token = process.env.NOTION_API_TOKEN;
    if (token) {
        return new Client({ auth: token });
    }
    if (context?.notion) {
        return context.notion;
    }
    throw new Error("NOTION_API_TOKEN is not configured.");
}
function maybeSetNumber(updateProperties, changedFields, page, propertyName, nextValue) {
    const current = getNumber(page, propertyName);
    if (!numbersEqual(current, nextValue)) {
        updateProperties[propertyName] = { number: nextValue };
        changedFields.push(propertyName);
    }
}
function maybeSetMissingNumber(updateProperties, changedFields, page, propertyName, nextValue) {
    if (getNumber(page, propertyName) === null) {
        updateProperties[propertyName] = { number: nextValue };
        changedFields.push(propertyName);
    }
}
function maybeSetSelect(updateProperties, changedFields, page, propertyName, nextValue) {
    const current = getSelectName(page, propertyName);
    if (current !== nextValue) {
        updateProperties[propertyName] = { select: { name: nextValue } };
        changedFields.push(propertyName);
    }
}
function getStoredAmountForCurrency(page, currency) {
    const current = getNumber(page, `Price (${currency.toUpperCase()})`);
    if (current === null) {
        return null;
    }
    return currency.toUpperCase() === "IDR"
        ? current * IDR_STORAGE_DIVISOR
        : current;
}
function getRichText(page, propertyName) {
    const property = page.properties?.[propertyName];
    if (!property) {
        return null;
    }
    if (property.type === "rich_text") {
        return property.rich_text?.map((item) => item.plain_text ?? "").join("") || null;
    }
    if (property.type === "title") {
        return property.title?.map((item) => item.plain_text ?? "").join("") || null;
    }
    return null;
}
function getUrl(page, propertyName) {
    const property = page.properties?.[propertyName];
    return property?.type === "url" ? property.url ?? null : null;
}
function getDateStart(page, propertyName) {
    const property = page.properties?.[propertyName];
    return property?.type === "date" ? property.date?.start ?? null : null;
}
function getNumber(page, propertyName) {
    const property = page.properties?.[propertyName];
    return property?.type === "number" ? property.number ?? null : null;
}
function getCheckbox(page, propertyName) {
    const property = page.properties?.[propertyName];
    return property?.type === "checkbox" ? property.checkbox === true : null;
}
function getFormulaNumber(page, propertyName) {
    const property = page.properties?.[propertyName];
    return property?.type === "formula" && property.formula?.type === "number"
        ? property.formula.number ?? null
        : null;
}
function getSelectName(page, propertyName) {
    const property = page.properties?.[propertyName];
    if (!property) {
        return null;
    }
    if (property.type === "select") {
        return property.select?.name ?? null;
    }
    if (property.type === "status") {
        return property.status?.name ?? null;
    }
    return null;
}
function getRelationIds(page, propertyName) {
    const property = page.properties?.[propertyName];
    if (property?.type !== "relation" || !Array.isArray(property.relation)) {
        return [];
    }
    return property.relation
        .map((item) => item.id)
        .filter((item) => typeof item === "string")
        .map(normaliseNotionId);
}
function extractBalanceSheetPageIds(body) {
    // Native automation payloads contain metadata UUIDs in source. Those are
    // not pages. The triggering page lives in data.id and takes precedence.
    const triggeringId = body?.data?.id ?? body?.page?.id ??
        (body?.object === "page" ? body?.id : undefined);
    if (typeof triggeringId === "string") {
        const id = tryParsePageId(triggeringId);
        if (id)
            return [id];
    }
    const ids = new Set();
    const selfReference = body?.["TP: Balance Sheet [Self]"] ??
        body?.tpBalanceSheetSelf ?? body?.data?.properties?.["TP: Balance Sheet [Self]"];
    if (selfReference != null)
        collectPossiblePageIds(selfReference, ids);
    if (ids.size === 0) {
        // Explicit manual payload fields only; never recurse through event metadata.
        for (const value of [body?.pageId, body?.page_id, body?.pageIdOrUrl, body?.pageUrl, body?.page]) {
            if (value != null)
                collectPossiblePageIds(value, ids);
        }
    }
    return [...ids];
}
function collectPossiblePageIds(value, ids) {
    if (value == null) {
        return;
    }
    if (typeof value === "string") {
        const id = tryParsePageId(value);
        if (id) {
            ids.add(id);
        }
        return;
    }
    if (Array.isArray(value)) {
        for (const item of value) {
            collectPossiblePageIds(item, ids);
        }
        return;
    }
    if (typeof value === "object") {
        if (typeof value.id === "string") {
            const id = tryParsePageId(value.id);
            if (id) {
                ids.add(id);
            }
        }
        if (typeof value.url === "string") {
            const id = tryParsePageId(value.url);
            if (id) {
                ids.add(id);
            }
        }
        if (typeof value.pageId === "string") {
            const id = tryParsePageId(value.pageId);
            if (id) {
                ids.add(id);
            }
        }
        for (const nested of Object.values(value)) {
            collectPossiblePageIds(nested, ids);
        }
    }
}
function parsePageIdOrUrl(value) {
    const parsed = tryParsePageId(value);
    if (!parsed) {
        throw new Error(`Could not parse a Notion page ID from: ${value}`);
    }
    return parsed;
}
function tryParsePageId(value) {
    const direct = value.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/)?.[0];
    if (direct) {
        return direct.toLowerCase();
    }
    const compact = value.match(/[0-9a-fA-F]{32}/)?.[0];
    if (compact) {
        return normaliseNotionId(compact);
    }
    return null;
}
function normaliseNotionId(value) {
    const compact = value.replace(/-/g, "").toLowerCase();
    if (!/^[0-9a-f]{32}$/.test(compact)) {
        throw new Error(`Invalid Notion ID: ${value}`);
    }
    return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
}
function numbersEqual(left, right) {
    if (left === null && right === null) {
        return true;
    }
    if (left === null || right === null) {
        return false;
    }
    return Math.abs(left - right) < FLOAT_EPSILON;
}
function roundCurrency(value, currency) {
    if (currency === "IDR") {
        return roundTo(value, 3);
    }
    return roundTo(value, 2);
}
function roundTo(value, places) {
    const factor = 10 ** places;
    return Math.round((value + Number.EPSILON) * factor) / factor;
}
function buildRateKey(date, base, quote) {
    return `${date}|${base}|${quote}`;
}
function shiftIsoDate(date, days) {
    const utc = new Date(`${date}T00:00:00Z`);
    utc.setUTCDate(utc.getUTCDate() + days);
    return utc.toISOString().slice(0, 10);
}
function todayIsoDate() {
    return new Date().toISOString().slice(0, 10);
}
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function getHeader(headers, key) {
    const expected = key.toLowerCase();
    for (const [headerKey, headerValue] of Object.entries(headers ?? {})) {
        if (headerKey.toLowerCase() === expected) {
            return headerValue;
        }
    }
    return null;
}
function truncateJson(value, maxLength = 400) {
    const json = JSON.stringify(value);
    if (!json) {
        return "";
    }
    return json.length > maxLength ? `${json.slice(0, maxLength)}…` : json;
}
