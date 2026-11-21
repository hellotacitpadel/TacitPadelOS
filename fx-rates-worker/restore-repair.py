from pathlib import Path
p=Path('src/index.ts'); s=p.read_text()
s=s.replace('const FX_RATES_DATA_SOURCE_ID = "c7261443-196b-4bd5-8d2b-2b5b6afb42f2"','const FX_RATES_DATA_SOURCE_ID = "94e5abc1-d98e-4181-8a8e-42f973902924"')
s=s.replace('  changedFields: string[]\n}', '  changedFields: string[]\n  applied?: boolean\n}')
a=s.index('worker.tool("reconcileBalanceSheetFx",'); b=s.index('\nworker.webhook(',a)
s=s[:a]+'''worker.tool("reconcileBalanceSheetFx", {
  title: "Reconcile Balance Sheet FX",
  description:
    "Preview FX differences without writes by default. Apply only with explicit mode=apply. Process at most 25 rows per call; use nextCursor for the next batch.",
  schema: j.object({
    pageIdsOrUrls: j.array(j.string()).describe("Explicit Balance Sheet rows; at most 25. Null to scan a batch.").nullable(),
    limit: j.number().describe("Batch size, 1 to 25; defaults to 10.").nullable(),
    mode: j.enum("preview", "apply").describe("Null or preview means NO WRITES. Apply must be explicit.").nullable(),
    startCursor: j.string().describe("Cursor from the preceding scan batch; null for the first batch.").nullable(),
  }),
  execute: async ({ pageIdsOrUrls, limit, mode, startCursor }, context) => {
    const notion = getNotionClient(context)
    const resolvedMode = mode ?? "preview"
    if (resolvedMode !== "preview" && resolvedMode !== "apply") {
      throw new Error("mode must be preview or apply.")
    }
    if (pageIdsOrUrls && pageIdsOrUrls.length > 25) {
      throw new Error("Supply at most 25 explicit rows per call.")
    }
    if (pageIdsOrUrls?.length && startCursor) {
      throw new Error("Use either explicit rows or a scan cursor, not both.")
    }
    const batch = pageIdsOrUrls?.length
      ? { pageIds: [...new Set(pageIdsOrUrls.map(parsePageIdOrUrl))], hasMore: false, nextCursor: null }
      : await listBalanceSheetPageBatch(notion, clamp(Math.trunc(limit ?? 10), 1, 25), startCursor)
    const results: ReconcileResult[] = []
    const errors: Array<{ pageId: string; error: string }> = []
    for (const pageId of batch.pageIds) {
      try {
        results.push(await reconcileBalanceSheetRow(notion, pageId, resolvedMode === "preview"))
      } catch (error) {
        errors.push({ pageId, error: error instanceof Error ? error.message : String(error) })
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
    }
  },
})
''' + s[b:]
s=s.replace('  pageId: string\n): Promise<ReconcileResult> {\n  const page = (await notion.pages.retrieve({ page_id: pageId })) as AnyPage', '''  pageId: string,
  preview = false
): Promise<ReconcileResult> {
  const page = (await notion.pages.retrieve({ page_id: pageId })) as AnyPage
  const parent = (page as any).parent
  const dataSourceId = parent?.data_source_id
  if (!dataSourceId || normaliseNotionId(dataSourceId) !== BALANCE_SHEET_DATA_SOURCE_ID) {
    throw new Error("Refusing to process a page outside TP: Balance Sheet.")
  }
  if ((page as any).archived || (page as any).in_trash) {
    return { pageId, transactionDate: null, skipped: true, reason: "Row is archived or trashed.", changedFields: [] }
  }''')
s=s.replace('  const sourceDecision = determineSource(page)', '''  if (transactionDate.slice(0, 10) > todayIsoDate()) {
    return { pageId, transactionDate, skipped: true, reason: "Transaction Date is in the future.", changedFields: [] }
  }

  const sourceDecision = determineSource(page)''',1)
s=s.replace('  const prices = await calculateAllPrices(','''  if (!Number.isFinite(sourceDecision.sourceAmount)) {
    throw new Error("FX source amount must be finite.")
  }

  const prices = await calculateAllPrices(''',1)
s=s.replace('  if (changedFields.length > 0) {\n    updateProperties["FX timestamp"]', '  if (changedFields.length > 0 && !preview) {\n    updateProperties["FX timestamp"]',1)
s=s.replace('    rateUsed,\n    changedFields,\n  }','    rateUsed,\n    changedFields,\n    applied: changedFields.length > 0 && !preview,\n  }',1)
a=s.index('async function listRecentBalanceSheetPageIds('); b=s.index('\nfunction getNotionClient',a)
s=s[:a]+'''async function listBalanceSheetPageBatch(
  notion: Client,
  limit: number,
  startCursor: string | null
): Promise<{ pageIds: string[]; hasMore: boolean; nextCursor: string | null }> {
  const response = await notion.dataSources.query({
    data_source_id: BALANCE_SHEET_DATA_SOURCE_ID,
    result_type: "page",
    page_size: limit,
    ...(startCursor ? { start_cursor: startCursor } : {}),
    // Stable ordering: applying outputs must not reorder the scan.
    sorts: [{ timestamp: "created_time", direction: "ascending" }],
  })
  return {
    pageIds: response.results.filter((result: any) => result.object === "page").map((result: any) => result.id),
    hasMore: response.has_more,
    nextCursor: response.next_cursor,
  }
}
''' + s[b:]
p.write_text(s)