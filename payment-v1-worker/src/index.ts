import crypto from "crypto"
import type { Client } from "@notionhq/client"
import { Worker } from "@notionhq/workers"
import { j } from "@notionhq/workers/schema-builder"

const worker = new Worker()
export default worker

type Product = "Private Lesson" | "Match with Coach" | "Clinic" | "Coaches Academy" | "Play with Coach" | "Player Academy"
type EventStatus = "Inbox" | "Rearrange" | "Pending" | "Confirmed" | "Cancelled"
type SaleStatus = "Confirmed" | "Cancelled" | "Late Cancellation" | "No-Show"
type SaleRole = "Revenue" | "Cost"

const round = (value: number) => Math.round(value)
const jsonOutput = <T>(value: T): any => JSON.parse(JSON.stringify(value))
const paymentV1WebhookHeader = "x-payment-v1-secret"
const balanceSheetDataSourceId = "267afdfb-c3c7-81d9-bc0f-000bb3cd7f70"

const hasValidPaymentV1WebhookSecret = (headers: Record<string, string>) => {
	const expected = process.env.PAYMENT_V1_WEBHOOK_SECRET
	const supplied = headers[paymentV1WebhookHeader]
	if (!expected || !supplied || supplied.length !== expected.length) return false
	return crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
}

type NotionProperty = {
	type: string
	[key: string]: unknown
}

type NotionPage = {
	properties: Record<string, NotionProperty>
}

const property = (page: NotionPage, name: string): NotionProperty | undefined =>
	page.properties[name]

const textValue = (value: NotionProperty | undefined): string => {
	if (!value) return ""
	if (value.type === "title") {
		return ((value.title as Array<{ plain_text: string }> | undefined) ?? [])
			.map((item) => item.plain_text)
			.join("")
	}
	if (value.type === "rich_text") {
		return ((value.rich_text as Array<{ plain_text: string }> | undefined) ?? [])
			.map((item) => item.plain_text)
			.join("")
	}
	if (value.type === "select") {
		return ((value.select as { name?: string } | null)?.name ?? "")
	}
	if (value.type === "status") {
		return ((value.status as { name?: string } | null)?.name ?? "")
	}
	if (value.type === "formula") {
		const formula = value.formula as
			| { type: "string"; string: string | null }
			| { type: "number"; number: number | null }
			| { type: "boolean"; boolean: boolean | null }
			| undefined
		if (!formula) return ""
		if (formula.type === "string") return formula.string ?? ""
		if (formula.type === "number") return String(formula.number ?? "")
		return String(formula.boolean ?? "")
	}
	return ""
}

const numberValue = (value: NotionProperty | undefined): number | null => {
	if (!value) return null
	if (value.type === "number") return (value.number as number | null) ?? null
	if (value.type === "formula") {
		const formula = value.formula as
			| { type: "number"; number: number | null }
			| undefined
		return formula?.type === "number" ? formula.number : null
	}
	if (value.type === "rollup") {
		const rollup = value.rollup as
			| { type: "number"; number: number | null }
			| { type: "array"; array: NotionProperty[] }
			| undefined
		if (!rollup) return null
		if (rollup.type === "number") return rollup.number
		const values = rollup.array
			.map((item) => numberValue(item))
			.filter((item): item is number => item !== null)
		// A coach can have only one HR record. Refuse to choose if that
		// assumption stops being true, rather than silently using a rate.
		return values.length === 1 ? values[0] : null
	}
	return null
}

const booleanValue = (value: NotionProperty | undefined): boolean =>
	value?.type === "checkbox" && value.checkbox === true

const relationIds = (value: NotionProperty | undefined): string[] =>
	value?.type === "relation"
		? ((value.relation as Array<{ id: string }> | undefined) ?? []).map((item) => item.id)
		: []

const peopleIds = (value: NotionProperty | undefined): string[] =>
	value?.type === "people"
		? ((value.people as Array<{ id: string }> | undefined) ?? []).map((person) => person.id)
		: []

const dateValue = (
	value: NotionProperty | undefined
): { start: string | null; end: string | null } | null =>
	value?.type === "date"
		? (() => {
				const date = value.date as
					| { start?: string | null; end?: string | null }
					| null
				return date ? { start: date.start ?? null, end: date.end ?? null } : null
			})()
		: null

const allRelationIds = async (
	notion: Client,
	pageId: string,
	value: NotionProperty | undefined
): Promise<string[]> => {
	const initial = relationIds(value)
	const propertyId = value?.id
	const hasMore = value?.has_more === true
	if (!hasMore) return initial
	if (typeof propertyId !== "string") {
		throw new Error("A paginated relation is missing its property ID.")
	}
	const ids = [...initial]
	let cursor: string | undefined
	do {
		const raw = (await notion.pages.properties.retrieve({
			page_id: pageId,
			property_id: propertyId,
			start_cursor: cursor,
			page_size: 100,
		})) as unknown as {
			results?: Array<{ type?: string; relation?: { id?: string } }>
			next_cursor?: string | null
		}
		for (const item of raw.results ?? []) {
			if (item.type === "relation" && item.relation?.id) ids.push(item.relation.id)
		}
		cursor = raw.next_cursor ?? undefined
	} while (cursor)
	return [...new Set(ids)]
}

const isoWeek = (timestamp: string): string => {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Jakarta",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(new Date(timestamp))
	const get = (type: string) => parts.find((part) => part.type === type)?.value
	const localDate = new Date(`${get("year")}-${get("month")}-${get("day")}T00:00:00Z`)
	const weekday = (localDate.getUTCDay() + 6) % 7
	localDate.setUTCDate(localDate.getUTCDate() - weekday + 3)
	const weekYear = localDate.getUTCFullYear()
	const firstThursday = new Date(Date.UTC(weekYear, 0, 4))
	const firstWeekday = (firstThursday.getUTCDay() + 6) % 7
	firstThursday.setUTCDate(firstThursday.getUTCDate() - firstWeekday + 3)
	const week = 1 + Math.round((localDate.getTime() - firstThursday.getTime()) / 604_800_000)
	return `${weekYear}-W${String(week).padStart(2, "0")}`
}

const scheduledHours = (event: NotionPage): number | null => {
	const scheduled = dateValue(property(event, "Scheduled"))
	if (!scheduled?.start || !scheduled.end) return null
	const hours = (Date.parse(scheduled.end) - Date.parse(scheduled.start)) / 3_600_000
	return Number.isFinite(hours) && hours > 0 ? hours : null
}

const payableHours = async (notion: Client, event: NotionPage): Promise<number | null> => {
	const childIds = relationIds(property(event, "Sub Event"))
	if (childIds.length === 0) return scheduledHours(event)
	let total = 0
	for (const childId of childIds) {
		const rawChild = await notion.pages.retrieve({ page_id: childId })
		if (!("properties" in rawChild)) continue
		const child = rawChild as unknown as NotionPage
		const hours = scheduledHours(child)
		if (textValue(property(child, "Status")) === "Confirmed" && hours !== null) {
			total += hours
		}
	}
	return total
}

const baseRateForCoachLevel = (coachLevel: string | null): number | null => {
	const rates: Record<string, number> = {
		"Head Coach": 500,
		"Senior Coach": 350,
		Coach: 200,
		Instructor: 100,
		Trainee: 100,
	}
	return coachLevel ? rates[coachLevel] ?? null : null
}

const qualifyingWeeklyHours = async (
	notion: Client,
	coachPageId: string,
	referenceEvent: NotionPage,
	referenceEventId: string
): Promise<number | null> => {
	const referenceDate = dateValue(property(referenceEvent, "Scheduled"))?.start
	if (!referenceDate) return null
	const referenceWeek = isoWeek(referenceDate)
	const rawCoach = await notion.pages.retrieve({ page_id: coachPageId })
	if (!("properties" in rawCoach)) throw new Error(`Coach ${coachPageId} could not be re-read.`)
	const coach = rawCoach as unknown as NotionPage
	const eventIds = await allRelationIds(
		notion,
		coachPageId,
		property(coach, "Events (Coach)")
	)
	// The current Event is updated to Confirmed immediately before this
	// calculation. The inverse coach relation can lag that write, so prove the
	// supplied Event names this coach and include it once when the relation has
	// not refreshed yet. All other coach-week Events still come from the full
	// live relation and must be Confirmed.
	if (!relationIds(property(referenceEvent, "Coaches")).includes(coachPageId)) return null
	const candidateEventIds = eventIds.includes(referenceEventId)
		? eventIds
		: [...eventIds, referenceEventId]
	let total = 0
	// The source relation can contain hundreds of historical Events. Read in
	// modest batches so the calculation is complete without a serial timeout.
	for (let index = 0; index < candidateEventIds.length; index += 5) {
		const ids = candidateEventIds.slice(index, index + 5)
		const batch = await Promise.all(
			ids.map((eventId) =>
				eventId === referenceEventId
					? Promise.resolve(referenceEvent)
					: notion.pages.retrieve({ page_id: eventId })
			)
		)
		for (let batchIndex = 0; batchIndex < batch.length; batchIndex += 1) {
			const rawEvent = batch[batchIndex]
			if (!("properties" in rawEvent)) continue
			const event = rawEvent as unknown as NotionPage
			const isReferenceEvent = ids[batchIndex] === referenceEventId
			const start = dateValue(property(event, "Scheduled"))?.start
			const product = textValue(property(event, "Event Type"))
			const hours = scheduledHours(event)
			const qualifies =
				typeof start === "string" &&
				isoWeek(start) === referenceWeek &&
				(isReferenceEvent || textValue(property(event, "Status")) === "Confirmed") &&
				relationIds(property(event, "Sub Event")).length === 0 &&
				["Private Lesson", "Clinic", "Match with Coach", "Play with Coach"].includes(product) &&
				hours !== null
			if (qualifies && hours !== null) total += hours
		}
	}
	return total
}

const priceFieldFor = (
	product: Product,
	coachLevel: string,
	studentCount: number
): string | null => {
	const ratio = `1:${studentCount}`
	if (product === "Private Lesson") {
		return ["Head Coach", "Senior Coach", "Coach", "Instructor", "Trainee"].includes(
			coachLevel
		) && studentCount >= 1 && studentCount <= 4
			? `${coachLevel} ${ratio} (IDR PP)`
			: null
	}
	if (product === "Match with Coach") {
		const prefix =
			coachLevel === "Head Coach"
				? "HC"
				: coachLevel === "Senior Coach"
					? "SC"
					: coachLevel
		return ["HC", "SC", "Coach", "Instructor"].includes(prefix)
			? `Match with Coach ${prefix} (IDR PP)`
			: null
	}
	if (product === "Coaches Academy") return "Coaches Course (IDR PP)"
	return null
}


type CompensationInput = {
	product: Product
	isDirector: boolean
	weeklyHours: number
	totalListPriceIdr: number
	privateLessonRate: number
	playerAcademyRate: number
	coachesAcademyRate: number
	baseRateIdrPerHour: number
	onCourtHours: number
	coachCount: number
}

const calculateCompensation = (input: CompensationInput) => {
	const nonNegative = (name: string, value: number) => {
		if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be a non-negative finite number.`)
	}
	nonNegative("weeklyHours", input.weeklyHours)
	nonNegative("totalListPriceIdr", input.totalListPriceIdr)
	nonNegative("privateLessonRate", input.privateLessonRate)
	nonNegative("playerAcademyRate", input.playerAcademyRate)
	nonNegative("coachesAcademyRate", input.coachesAcademyRate)
	nonNegative("baseRateIdrPerHour", input.baseRateIdrPerHour)
	nonNegative("onCourtHours", input.onCourtHours)
	if (!Number.isFinite(input.coachCount) || input.coachCount < 1) {
		throw new Error("coachCount must be a positive finite number.")
	}
	if (input.isDirector) return { feeIdr: 0, basis: "Director" as const }
	switch (input.product) {
		case "Private Lesson":
			return input.weeklyHours < 20
				? { feeIdr: 0, basis: "Below threshold" as const }
				: { feeIdr: round(input.privateLessonRate * input.totalListPriceIdr), basis: "Percentage" as const }
		case "Match with Coach":
			return { feeIdr: round(input.baseRateIdrPerHour * 1.75 * input.onCourtHours), basis: "Match multiplier" as const }
		case "Play with Coach": {
			if (input.weeklyHours < 20) return { feeIdr: 0, basis: "Below threshold" as const }
			const baseFloor = input.baseRateIdrPerHour * input.onCourtHours
			const percentage = input.privateLessonRate * (input.totalListPriceIdr / input.coachCount)
			return baseFloor >= percentage
				? { feeIdr: round(baseFloor), basis: "Base-rate floor" as const }
				: { feeIdr: round(percentage), basis: "Percentage" as const }
		}
		case "Clinic": {
			if (input.weeklyHours < 20) return { feeIdr: 0, basis: "Below threshold" as const }
			const baseFloor = input.baseRateIdrPerHour * input.onCourtHours
			const percentage = input.privateLessonRate * input.totalListPriceIdr
			return baseFloor >= percentage
				? { feeIdr: round(baseFloor), basis: "Base-rate floor" as const }
				: { feeIdr: round(percentage), basis: "Percentage" as const }
		}
		case "Player Academy":
			return { feeIdr: round(input.playerAcademyRate * input.totalListPriceIdr), basis: "Academy percentage" as const }
		case "Coaches Academy":
			return { feeIdr: round(input.coachesAcademyRate * input.totalListPriceIdr), basis: "Academy percentage" as const }
	}
}

const findBalanceSheetIdForSale = async (
	notion: Client,
	salePageId: string
): Promise<string | null> => {
	const result = await notion.dataSources.query({
		data_source_id: balanceSheetDataSourceId,
		filter: {
			property: "Sales",
			relation: { contains: salePageId },
		},
		page_size: 2,
	})
	if (result.results.length > 1) {
		throw new Error(
			"Duplicate Balance Sheet rows are linked to this Sale; manual reconciliation is required."
		)
	}
	return result.results[0]?.id ?? null
}

const confirmEventIfPaidCapacity = async (notion: Client, eventPageId: string) => {
	// The Event↔Sale and Sale↔Balance Sheet inverse relations can lag immediately
	// after this Worker creates the records. Re-read briefly before deciding that
	// capacity is not met; otherwise a valid payment is left in Processing.
	let last = { paidAttendeeCount: 0, capacity: null as number | null }
	for (let attempt = 0; attempt < 4; attempt += 1) {
		const rawEvent = await notion.pages.retrieve({ page_id: eventPageId })
		if (!("properties" in rawEvent)) throw new Error("Event could not be re-read for capacity confirmation.")
		const event = rawEvent as unknown as NotionPage
		const declaredCapacity = numberValue(property(event, "Capacity"))
		const linkedStudents = relationIds(property(event, "Students"))
		const capacity = declaredCapacity !== null && declaredCapacity >= 1 && Number.isInteger(declaredCapacity)
			? declaredCapacity
			: linkedStudents.length
		const paid = new Set<string>()
		if (capacity < 1) return { confirmed: false, paidAttendeeCount: 0, capacity: null, reason: "no-attendees" }
		for (const saleId of relationIds(property(event, "Sales"))) {
			const rawSale = await notion.pages.retrieve({ page_id: saleId })
			if (!("properties" in rawSale)) continue
			const sale = rawSale as unknown as NotionPage
			const eligible =
				textValue(property(sale, "Sale Role")) === "Revenue" &&
				textValue(property(sale, "Sale Status")) === "Confirmed" &&
				textValue(property(sale, "Payment Processing Status")) === "Processed" &&
				(textValue(property(sale, "Payment Channel")) !== "Bank transfer" || textValue(property(sale, "Paid To")) !== "Tacit" || (dateValue(property(sale, "Payment Verified At")) !== null && peopleIds(property(sale, "Payment Verified By")).length === 1)) &&
				relationIds(property(sale, "Balance Sheet")).length === 1
			if (eligible) for (const studentId of relationIds(property(sale, "Students"))) paid.add(studentId)
		}
		last = { paidAttendeeCount: paid.size, capacity }
		if (paid.size === capacity) {
			const wasPending = ["Pending", "Payment Processing"].includes(textValue(property(event, "Status")))
			if (wasPending) await notion.pages.update({ page_id: eventPageId, properties: { Status: { status: { name: "Confirmed" } } } })
			return { confirmed: true, paidAttendeeCount: paid.size, capacity, reason: null }
		}
		if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 750))
	}
	return { confirmed: false, paidAttendeeCount: last.paidAttendeeCount, capacity: last.capacity, reason: "capacity-not-met" }
}

worker.tool("derivePaymentV1Canary", {
	title: "Derive Payment V1 canary",
	description:
		"No-write calculator for the proposed Payment V1 release path. Validates one fully supplied fixture and returns an 18-step trace. It never creates, updates, or queries Notion records.",
	schema: j.object({
		operationKey: j.string().describe("Stable idempotency key for the proposed operation."),
		product: j.enum("Private Lesson", "Match with Coach", "Clinic", "Coaches Academy", "Play with Coach", "Player Academy").describe("Booked product."),
		eventStatus: j.enum("Inbox", "Rearrange", "Pending", "Confirmed", "Cancelled").describe("Current Event status."),
		saleStatus: j.enum("Confirmed", "Cancelled", "Late Cancellation", "No-Show").describe("Current Sale status."),
		saleRole: j.enum("Revenue", "Cost").describe("Revenue for a paid place; Cost for the single shared settlement row."),
		paymentVerified: j.boolean().describe("Whether the payment verification requirement is satisfied."),
		linkedVerifiedRevenue: j.boolean().describe("For a shared Cost Sale, whether at least one linked non-cancelled Revenue Sale has verified payment."),
		linkedRevenueCourtContributionIdr: j.number().describe("For a shared Cost Sale, the aggregate court contribution already collected from linked Revenue Sales."),
		priceListStatus: j.enum("Proposed", "Active", "Previous").describe("Lifecycle state of the supplied price period."),
		priceListName: j.string().describe("Human-readable source price period."),
		studentCount: j.integer().describe("Students represented by this Revenue Sale."),
		resolvedCoachingRateIdr: j.number().describe("Coaching rate resolved from the price period before adjustments."),
		finalChargedPricePerStudentIdr: j.number().describe("Actual final customer price per student after authorised adjustments."),
		scheduledHours: j.number().describe("Scheduled delivery duration in hours."),
		revenueScope: j.enum("Academy Fees", "Combined").describe("Existing revenue-scope input."),
		courtHourlyRateIdr: j.number().nullable().describe("Existing court hourly rate, or null if none applies."),
		sharedDiscountPercent: j.number().describe("Existing shared-discount percentage as a decimal, for example 0.5."),
		isV1Route: j.boolean().describe("Whether the fixture is explicitly routed Payment V1."),
	}),
	execute: (input) => {
		const issues: string[] = []
		const isJoinable = input.product === "Clinic" || input.product === "Coaches Academy" || input.product === "Play with Coach"
		const isRevenue = input.saleRole === "Revenue"
		const isCost = input.saleRole === "Cost"
		const isPaidPendingRevenueEligible = input.isV1Route && isRevenue && input.eventStatus === "Pending" && isJoinable && input.paymentVerified && input.saleStatus !== "Cancelled"
		const isPaidPendingSharedCostEligible = input.isV1Route && isCost && input.eventStatus === "Pending" && isJoinable && input.saleStatus !== "Cancelled" && input.linkedVerifiedRevenue
		const isConfirmedEligible = input.eventStatus === "Confirmed" && input.saleStatus !== "Cancelled"
		const financialReleaseReady = isConfirmedEligible || isPaidPendingRevenueEligible || isPaidPendingSharedCostEligible
		const financialPricingHours = input.scheduledHours
		const usesHours = input.product === "Private Lesson" || input.product === "Clinic"
		const canReleaseRevenue = financialReleaseReady && isRevenue
		const coachingListValue = canReleaseRevenue ? round(input.studentCount * input.resolvedCoachingRateIdr * (usesHours ? financialPricingHours : 1)) : 0
		const customerGrossValue = canReleaseRevenue ? round(input.studentCount * input.finalChargedPricePerStudentIdr * (usesHours ? financialPricingHours : 1)) : 0
		const academyFees = canReleaseRevenue ? round(coachingListValue * (1 - input.sharedDiscountPercent)) : 0
		const courtRental = !financialReleaseReady || isRevenue || input.product === "Coaches Academy" || input.revenueScope === "Combined" || input.courtHourlyRateIdr === null
			? 0
			: round(financialPricingHours * input.courtHourlyRateIdr)
		const clinicCourtContribution = canReleaseRevenue && input.product === "Clinic"
			? round(input.studentCount * (input.finalChargedPricePerStudentIdr - input.resolvedCoachingRateIdr) * financialPricingHours)
			: 0
		const sharedCostCourtContribution = financialReleaseReady && isCost
			? Math.max(courtRental - input.linkedRevenueCourtContributionIdr, 0)
			: 0
		const totalIncome = financialReleaseReady && isRevenue ? academyFees + clinicCourtContribution : 0

		if (isRevenue && input.studentCount < 1) issues.push("Revenue Sales require at least one student.")
		if (!isRevenue && input.studentCount !== 0) issues.push("Cost Sales must use a student count of zero.")
		if (isCost && input.linkedRevenueCourtContributionIdr < 0) issues.push("Linked Revenue court contribution cannot be negative.")
		if (usesHours && input.scheduledHours <= 0) issues.push("Scheduled hours must be greater than zero for this hourly-priced product.")
		if (input.resolvedCoachingRateIdr < 0 || input.finalChargedPricePerStudentIdr < 0) issues.push("Prices cannot be negative.")
		if (input.sharedDiscountPercent < 0 || input.sharedDiscountPercent > 1) issues.push("Shared discount must be between 0 and 1.")
		if (input.product === "Player Academy" && input.isV1Route) issues.push("Player Academy is fail-closed for Payment V1.")
		if (input.eventStatus === "Cancelled") issues.push("Cancelled Events cannot release financial outputs.")
		if (input.saleStatus === "Cancelled") issues.push("Cancelled Sales cannot release financial outputs.")
		if (input.product === "Clinic" && input.finalChargedPricePerStudentIdr < input.resolvedCoachingRateIdr) issues.push("Clinic customer price is below its resolved coaching rate.")

		const trace = [
			{ step: 1, check: "No-write guard", value: "PASS — this tool has no Notion write path." },
			{ step: 2, check: "Operation key", value: input.operationKey },
			{ step: 3, check: "Product scope", value: input.product },
			{ step: 4, check: "Event state", value: input.eventStatus },
			{ step: 5, check: "Sale state", value: `${input.saleStatus} / ${input.saleRole}` },
			{ step: 6, check: "Payment verification", value: input.paymentVerified ? "verified" : "not verified" },
			{ step: 7, check: "Linked Revenue verification", value: input.linkedVerifiedRevenue ? "verified Revenue present" : "none" },
			{ step: 8, check: "Price-period provenance", value: `${input.priceListName} (${input.priceListStatus})` },
			{ step: 9, check: "V1 route / paid-pending eligibility", value: `${input.isV1Route ? "Payment V1" : "Legacy"} / Revenue=${isPaidPendingRevenueEligible ? "yes" : "no"}, Cost=${isPaidPendingSharedCostEligible ? "yes" : "no"}` },
			{ step: 10, check: "Financial release ready", value: financialReleaseReady ? "yes" : "no" },
			{ step: 11, check: "Financial pricing hours", value: financialPricingHours },
			{ step: 12, check: "Resolved coaching rate", value: input.resolvedCoachingRateIdr },
			{ step: 13, check: "Final customer price per student", value: input.finalChargedPricePerStudentIdr },
			{ step: 14, check: "Coaching list value", value: coachingListValue },
			{ step: 15, check: "Academy Fees before further legacy deductions", value: academyFees },
			{ step: 16, check: "Court contribution", value: isCost ? sharedCostCourtContribution : clinicCourtContribution },
			{ step: 17, check: "Court rental", value: courtRental },
			{ step: 18, check: "Total income / proposed action set", value: `${totalIncome} IDR / none — canary is diagnostic only` },
		]

		return {
			mode: "no-write",
			operationKey: input.operationKey,
			financialReleaseReady,
			calculated: {
				financialPricingHours,
				coachingListValueIdr: coachingListValue,
				customerGrossValueIdr: customerGrossValue,
				academyFeesIdr: academyFees,
				clinicCourtContributionIdr: clinicCourtContribution,
				sharedCostCourtContributionIdr: sharedCostCourtContribution,
				courtRentalIdr: courtRental,
				totalIncomeIdr: totalIncome,
			},
			issues,
			trace,
		}
	},
})


worker.tool("previewPaymentV1Compensation", {
	title: "Preview Payment V1 coach compensation",
	description: "No-write parity calculator inside the Payment V1 Worker. It mirrors the live compensation branches for one verified coach-event input set and returns no Notion mutation.",
	hints: { readOnlyHint: true },
	schema: j.object({
		product: j.enum("Private Lesson", "Match with Coach", "Clinic", "Coaches Academy", "Play with Coach", "Player Academy"),
		isDirector: j.boolean().describe("Verified director result from the coach's Tacit Director tag."),
		weeklyHours: j.number(),
		totalListPriceIdr: j.number(),
		privateLessonRate: j.number(),
		playerAcademyRate: j.number(),
		coachesAcademyRate: j.number(),
		baseRateIdrPerHour: j.number(),
		onCourtHours: j.number(),
		coachCount: j.number(),
	}),
	outputSchema: j.object({
		feeIdr: j.number(),
		basis: j.enum("Director", "Below threshold", "Percentage", "Base-rate floor", "Match multiplier", "Academy percentage"),
		boundary: j.string(),
	}),
	execute: (input) => ({
		...calculateCompensation(input),
		boundary: "No-write preview only. This capability does not read or write Notion, create a Sale, Event, Hourly Rate or Balance Sheet row, or change an automation or formula.",
	}),
})


const directorTagName = "Tacit Director"

const getCoachDirectorState = async (notion: Client, coachPageId: string) => {
	const rawCoach = await notion.pages.retrieve({ page_id: coachPageId })
	if (!("properties" in rawCoach)) throw new Error(`Coach ${coachPageId} could not be read.`)
	const coach = rawCoach as unknown as NotionPage
	const tagIds = relationIds(property(coach, "Global Tags"))
	const tagNames: string[] = []
	let isDirector = false
	for (const tagId of tagIds) {
		const rawTag = await notion.pages.retrieve({ page_id: tagId })
		if (!("properties" in rawTag)) continue
		const tag = rawTag as unknown as NotionPage
		// The Global Tags database uses "Tag" as its title in the workspace,
		// but title-property names are configurable. Fall back to the sole
		// title property's text rather than treating a renamed title as false.
		const tagName =
			textValue(property(tag, "Tag")) ||
			Object.values(tag.properties)
				.filter((candidate) => candidate.type === "title")
				.map((candidate) => textValue(candidate))
				.find(Boolean) ||
			""
		tagNames.push(tagName || `[unreadable:${tagId}]`)
		if (tagName === directorTagName) {
			isDirector = true
			break
		}
	}
	return {
		coachPageId,
		coachName: textValue(property(coach, "Full Name")) || coachPageId,
		coachLevel: textValue(property(coach, "Coach Level")) || null,
		isDirector,
		globalTagIds: tagIds,
		globalTagNames: tagNames,
		privateLessonRate: numberValue(property(coach, "PL %")),
		playerAcademyRate: numberValue(property(coach, "PA %")),
		coachesAcademyRate: numberValue(property(coach, "CA %")),
	}
}

const findCompensationTargetSale = async (notion: Client, event: NotionPage) => {
	const candidates: Array<{ pageId: string; saleRole: string; saleName: string }> = []
	for (const salePageId of relationIds(property(event, "Sales"))) {
		const rawSale = await notion.pages.retrieve({ page_id: salePageId })
		if (!("properties" in rawSale)) continue
		const sale = rawSale as unknown as NotionPage
		candidates.push({
			pageId: salePageId,
			saleRole: textValue(property(sale, "Sale Role")),
			saleName: textValue(property(sale, "Sale")) || salePageId,
		})
	}
	const costSales = candidates.filter((candidate) => candidate.saleRole === "Cost")
	if (costSales.length === 1) return { target: costSales[0], placement: "settlement-cost-sale" as const }
	if (costSales.length > 1) throw new Error("Event has multiple Cost Sales; compensation target is ambiguous.")
	const combinedSales = candidates.filter((candidate) => candidate.saleRole === "Revenue" || candidate.saleRole === "")
	if (combinedSales.length !== 1) throw new Error("Event has no unique combined Sale; compensation target is ambiguous.")
	return { target: combinedSales[0], placement: "single-combined-sale" as const }
}

worker.tool("previewPaymentV1CompensationForEvent", {
	title: "Preview Payment V1 compensation from an Event",
	description: "No-write source-resolution gate. Reads one Event, its coaches and linked Sales to establish director status and the unique existing Sales target. It returns Director-zero results only when all coaches are verified directors; non-director calculation remains fail-closed until every live input is resolved.",
	hints: { readOnlyHint: true },
	schema: j.object({ eventPageId: j.string().describe("Existing Event page ID to inspect.") }),
	outputSchema: j.object({
		mode: j.enum("director-ready", "blocked-non-director"),
		eventPageId: j.string(),
		product: j.string(),
		targetSalePageId: j.string(),
		targetSaleName: j.string(),
		placement: j.enum("settlement-cost-sale", "single-combined-sale"),
		coaches: j.array(j.object({ coachPageId: j.string(), coachName: j.string(), coachLevel: j.string().nullable(), isDirector: j.boolean(), globalTagIds: j.array(j.string()), globalTagNames: j.array(j.string()), privateLessonRate: j.number().nullable(), playerAcademyRate: j.number().nullable(), coachesAcademyRate: j.number().nullable(), feeIdr: j.number().nullable(), basis: j.string().nullable() })),
		blocker: j.string().nullable(),
		boundary: j.string(),
	}),
	execute: async (input, { notion }) => {
		const rawEvent = await notion.pages.retrieve({ page_id: input.eventPageId })
		if (!("properties" in rawEvent)) throw new Error("The supplied page is not a full Notion Event page.")
		const event = rawEvent as unknown as NotionPage
		const product = textValue(property(event, "Event Type"))
		if (!(["Private Lesson", "Match with Coach", "Clinic", "Coaches Academy", "Play with Coach", "Player Academy"] as string[]).includes(product)) {
			throw new Error("Event Type is unresolved or unsupported for compensation.")
		}
		const coachIds = relationIds(property(event, "Coaches"))
		if (coachIds.length < 1 || coachIds.length > 2) throw new Error("Event must have one or two coaches for compensation.")
		const [target, coaches] = await Promise.all([
			findCompensationTargetSale(notion, event),
			Promise.all(coachIds.map((coachId) => getCoachDirectorState(notion, coachId))),
		])
		const allDirectors = coaches.every((coach) => coach.isDirector)
		return {
			mode: allDirectors ? "director-ready" as const : "blocked-non-director" as const,
			eventPageId: input.eventPageId,
			product,
			targetSalePageId: target.target.pageId,
			targetSaleName: target.target.saleName,
			placement: target.placement,
			coaches: coaches.map((coach) => ({
				...coach,
				feeIdr: coach.isDirector ? 0 : null,
				basis: coach.isDirector ? "Director" : null,
			})),
			blocker: allDirectors ? null : "At least one coach is not a verified director; live rate, weekly-hours and price inputs must be resolved before calculation.",
			boundary: "No-write source-resolution gate. It does not update Sales, Events, Hourly Rate, Balance Sheet, formulas or automations.",
		}
	},
})

worker.tool("calculatePaymentV1CompensationForEvent", {
	title: "Calculate Payment V1 compensation from an Event",
	description:
		"Read-only compensation calculation from live Event, coach, HR and Global Tag inputs. It applies no write and fails closed when an input required for a non-director calculation is missing.",
	hints: { readOnlyHint: true },
	schema: j.object({ eventPageId: j.string().describe("Existing confirmed Event page ID to calculate.") }),
	execute: async (input, { notion }) => {
		const rawEvent = await notion.pages.retrieve({ page_id: input.eventPageId })
		if (!("properties" in rawEvent)) throw new Error("The supplied page is not a full Notion Event page.")
		const event = rawEvent as unknown as NotionPage
		const product = textValue(property(event, "Event Type")) as Product
		if (!(["Private Lesson", "Match with Coach", "Clinic", "Coaches Academy", "Play with Coach", "Player Academy"] as string[]).includes(product)) {
			throw new Error("Event Type is unresolved or unsupported for compensation.")
		}
		if (textValue(property(event, "Status")) !== "Confirmed") {
				return jsonOutput({
				mode: "blocked-no-write",
				eventPageId: input.eventPageId,
				blockers: ["Event must be Confirmed before compensation is calculated."],
				})
		}
		const coachIds = relationIds(property(event, "Coaches"))
		if (coachIds.length < 1 || coachIds.length > 2) {
				return jsonOutput({
				mode: "blocked-no-write",
				eventPageId: input.eventPageId,
				blockers: ["Event must have one or two coaches."],
				})
		}
		const [target, coaches, onCourtHours] = await Promise.all([
			findCompensationTargetSale(notion, event),
			Promise.all(coachIds.map((coachId) => getCoachDirectorState(notion, coachId))),
			payableHours(notion, event),
		])
		const weeklyHours = await Promise.all(
			coaches.map((coach) =>
				coach.isDirector
					? Promise.resolve(null)
					: qualifyingWeeklyHours(notion, coach.coachPageId, event, input.eventPageId)
			)
		)
		const totalListPriceIdr = numberValue(property(event, "Tacit List Price (IDR)"))
		const results = coaches.map((coach, index) => {
			if (coach.isDirector) {
				return {
					coachPageId: coach.coachPageId,
					coachName: coach.coachName,
					feeIdr: 0,
					basis: "Director",
					blockers: [] as string[],
				}
			}
			const missing: string[] = []
			const baseRateIdrPerHour = baseRateForCoachLevel(coach.coachLevel)
			if (weeklyHours[index] === null) missing.push("weekly qualifying hours")
			if (totalListPriceIdr === null) missing.push("Tacit List Price")
			if (onCourtHours === null) missing.push("confirmed payable hours")
			if (baseRateIdrPerHour === null) missing.push("coach-level base rate")
			const privateLessonRate = coach.privateLessonRate
			const playerAcademyRate = coach.playerAcademyRate
			// Coaches Academy is a fixed policy rate, not an individual HR band.
			const coachesAcademyRate = product === "Coaches Academy" ? 0.0875 : coach.coachesAcademyRate
			if (["Private Lesson", "Clinic", "Play with Coach"].includes(product) && privateLessonRate === null) missing.push("PL %")
			if (product === "Player Academy" && playerAcademyRate === null) missing.push("PA %")
			if (missing.length > 0) {
				return {
					coachPageId: coach.coachPageId,
					coachName: coach.coachName,
					feeIdr: null,
					basis: null,
					blockers: missing,
				}
			}
			const result = calculateCompensation({
				product,
				isDirector: false,
				weeklyHours: weeklyHours[index] ?? 0,
				totalListPriceIdr: totalListPriceIdr as number,
				privateLessonRate: privateLessonRate ?? 0,
				playerAcademyRate: playerAcademyRate ?? 0,
					coachesAcademyRate: coachesAcademyRate ?? 0,
				baseRateIdrPerHour: baseRateIdrPerHour as number,
				onCourtHours: onCourtHours as number,
				coachCount: coachIds.length,
			})
			return {
				coachPageId: coach.coachPageId,
				coachName: coach.coachName,
				feeIdr: result.feeIdr,
				basis: result.basis,
				blockers: [] as string[],
			}
		})
			return jsonOutput({
			mode: results.some((result) => result.feeIdr === null)
				? "blocked-no-write"
				: "calculated-no-write",
			eventPageId: input.eventPageId,
			product,
			targetSalePageId: target.target.pageId,
			targetSaleName: target.target.saleName,
			placement: target.placement,
			totalListPriceIdr,
			onCourtHours,
			coaches: results,
			totalCoachFeeIdr: results.reduce((sum, result) => sum + (result.feeIdr ?? 0), 0),
			boundary:
				"No-write calculation only. It does not alter Sales, Events, Hourly Rate, Balance Sheet, formulas or automations.",
			})
	},
})

const writePaymentV1Compensation = async (
	notion: Client,
	input: { eventPageId: string; operationKey: string }
) => {
const rawEvent = await notion.pages.retrieve({ page_id: input.eventPageId })
if (!("properties" in rawEvent)) throw new Error("The supplied page is not a full Notion Event page.")
const event = rawEvent as unknown as NotionPage
const product = textValue(property(event, "Event Type")) as Product
const blockers: string[] = []
if (textValue(property(event, "Financial Route")) !== "Payment V1") blockers.push("Event is not routed to Payment V1.")
if (textValue(property(event, "Status")) !== "Confirmed") blockers.push("Event must be Confirmed.")
if (booleanValue(property(event, "Payment Processing Exception"))) blockers.push("Payment Processing Exception is checked.")
if (!(["Private Lesson", "Match with Coach", "Clinic", "Coaches Academy", "Play with Coach", "Player Academy"] as string[]).includes(product)) blockers.push("Event Type is unresolved or unsupported.")
const coachIds = relationIds(property(event, "Coaches"))
if (coachIds.length < 1 || coachIds.length > 2) blockers.push("Event must have one or two coaches.")
if (blockers.length > 0) {
	return jsonOutput({ mode: "blocked-no-write", operationKey: input.operationKey, eventPageId: input.eventPageId, blockers, changed: [] })
}
const [target, coaches, onCourtHours] = await Promise.all([
	findCompensationTargetSale(notion, event),
	Promise.all(coachIds.map((coachId) => getCoachDirectorState(notion, coachId))),
	payableHours(notion, event),
])
const rawTargetSale = await notion.pages.retrieve({ page_id: target.target.pageId })
if (!("properties" in rawTargetSale)) throw new Error("The selected compensation Sale could not be read.")
const targetSale = rawTargetSale as unknown as NotionPage
if (textValue(property(targetSale, "Financial Route")) !== "Payment V1") blockers.push("Target Sale is not routed to Payment V1.")
// A single combined Sale is its own financial unit. Reading its
// formula directly avoids waiting for the Event rollup to refresh.
// A settlement Cost Sale needs the Event-wide total across Revenue rows.
const totalListPriceIdr =
	target.placement === "single-combined-sale"
		? numberValue(property(targetSale, "Tacit List Price (IDR)"))
		: numberValue(property(event, "Tacit List Price (IDR)"))
if (totalListPriceIdr === null) blockers.push("Event Tacit List Price is unavailable.")
if (onCourtHours === null) blockers.push("Confirmed payable hours are unavailable.")
const weeklyHours = await Promise.all(
	coaches.map((coach) =>
		coach.isDirector
			? Promise.resolve(null)
			: qualifyingWeeklyHours(notion, coach.coachPageId, event, input.eventPageId)
	)
)
const results = coaches.map((coach, index) => {
	if (coach.isDirector) {
		return { ...coach, feeIdr: 0, basis: "Director", blockers: [] as string[] }
	}
	const missing: string[] = []
	const baseRateIdrPerHour = baseRateForCoachLevel(coach.coachLevel)
	const coachesAcademyRate = product === "Coaches Academy" ? 0.0875 : coach.coachesAcademyRate
	const requiresWeeklyHours = ["Private Lesson", "Clinic", "Play with Coach"].includes(product)
	if (requiresWeeklyHours && weeklyHours[index] === null) missing.push("weekly qualifying hours")
	if (baseRateIdrPerHour === null) missing.push("coach-level base rate")
	if (["Private Lesson", "Clinic", "Play with Coach"].includes(product) && coach.privateLessonRate === null) missing.push("PL %")
	if (product === "Player Academy" && coach.playerAcademyRate === null) missing.push("PA %")
	if (missing.length > 0 || totalListPriceIdr === null || onCourtHours === null) {
		return { ...coach, feeIdr: null, basis: null, blockers: missing }
	}
	const calculation = calculateCompensation({
		product,
		isDirector: false,
		weeklyHours: weeklyHours[index] ?? 0,
		totalListPriceIdr,
		privateLessonRate: coach.privateLessonRate ?? 0,
		playerAcademyRate: coach.playerAcademyRate ?? 0,
		coachesAcademyRate: coachesAcademyRate ?? 0,
		baseRateIdrPerHour: baseRateIdrPerHour as number,
		onCourtHours: onCourtHours as number,
		coachCount: coachIds.length,
	})
	return { ...coach, feeIdr: calculation.feeIdr, basis: calculation.basis, blockers: [] as string[] }
})
if (blockers.length > 0 || results.some((result) => result.feeIdr === null || result.blockers.length > 0)) {
	return jsonOutput({
		mode: "blocked-no-write",
		operationKey: input.operationKey,
		eventPageId: input.eventPageId,
		targetSalePageId: target.target.pageId,
		blockers: [...blockers, ...results.flatMap((result) => result.blockers)],
		changed: [],
	})
}
const slot1 = results[0]
const slot2 = results[1] ?? null
const existingSlot1Fee = numberValue(property(targetSale, "Shadow Expected Coach Fee (IDR)"))
const existingSlot2Fee = numberValue(property(targetSale, "Shadow Expected Coach Fee 2 (IDR)"))
const existingSlot1Coach = relationIds(property(targetSale, "Target Compensation Coach"))
const existingSlot2Coach = relationIds(property(targetSale, "Target Compensation Coach 2"))
const matchesExisting =
	existingSlot1Fee === slot1.feeIdr &&
	existingSlot1Coach.length === 1 &&
	existingSlot1Coach[0] === slot1.coachPageId &&
	(existingSlot2Fee ?? null) === (slot2?.feeIdr ?? null) &&
	(existingSlot2Coach[0] ?? null) === (slot2?.coachPageId ?? null)
if (matchesExisting) {
	return jsonOutput({
		mode: "idempotent-already-written",
		operationKey: input.operationKey,
		eventPageId: input.eventPageId,
		targetSalePageId: target.target.pageId,
		placement: target.placement,
		coaches: results.map(({ coachPageId, coachName, feeIdr, basis }) => ({ coachPageId, coachName, feeIdr, basis })),
		changed: [],
	})
}
if (existingSlot1Fee !== null || existingSlot2Fee !== null || existingSlot1Coach.length > 0 || existingSlot2Coach.length > 0) {
	return jsonOutput({
		mode: "blocked-no-write",
		operationKey: input.operationKey,
		eventPageId: input.eventPageId,
		targetSalePageId: target.target.pageId,
		blockers: ["Target compensation slots already contain conflicting values; manual reconciliation is required."],
		changed: [],
	})
}
const relation = (id: string) => [{ id }]
await notion.pages.update({
	page_id: target.target.pageId,
	properties: {
		"Target Compensation Coach": { relation: relation(slot1.coachPageId) },
		"Shadow Expected Coach Fee (IDR)": { number: slot1.feeIdr as number },
		"Shadow Coach Fee Basis": { select: { name: slot1.basis as string } },
		"Shadow Applied Coach Level": { select: { name: slot1.coachLevel ?? "None" } },
		"Target Compensation Coach 2": { relation: slot2 ? relation(slot2.coachPageId) : [] },
		"Shadow Expected Coach Fee 2 (IDR)": { number: slot2?.feeIdr ?? null },
		"Shadow Coach Fee Basis 2": { select: slot2 ? { name: slot2.basis as string } : null },
		"Shadow Applied Coach Level 2": { select: slot2 ? { name: slot2.coachLevel ?? "None" } : null },
		"Target Financial Unit": { relation: relation(input.eventPageId) },
		"Target Financial Purpose": { select: { name: "Coach Compensation" } },
		"Target Source System": { rich_text: [{ type: "text", text: { content: "Payment V1" } }] },
		"Target Source Key": { rich_text: [{ type: "text", text: { content: input.eventPageId } }] },
		"Target Source Key 2": { rich_text: slot2 ? [{ type: "text", text: { content: input.eventPageId } }] : [] },
		"Target Source Revision": { rich_text: [{ type: "text", text: { content: "payment-v1-compensation-v1" } }] },
		"Shadow Validation State": { select: { name: "Ready" } },
	},
})
return jsonOutput({
	mode: "written",
	operationKey: input.operationKey,
	eventPageId: input.eventPageId,
	targetSalePageId: target.target.pageId,
	placement: target.placement,
	coaches: results.map(({ coachPageId, coachName, feeIdr, basis }) => ({ coachPageId, coachName, feeIdr, basis })),
	changed: ["Target compensation slots and provenance written to the target Sale."],
})
}

worker.tool("writePaymentV1CompensationForEvent", {
	title: "Write Payment V1 compensation to the target Sale",
	description:
		"Controlled Payment V1-only write. Calculates compensation from live sources, then writes the existing two coach-compensation slots on the one correct Sale. It rejects legacy routes, incomplete inputs, ambiguous targets and conflicting prior values.",
	schema: j.object({
		eventPageId: j.string().describe("Confirmed Payment V1 Event page ID."),
		operationKey: j.string().describe("Stable idempotency key for this compensation write."),
	}),
	execute: async (input, { notion }) => writePaymentV1Compensation(notion, input),
})

worker.tool("inspectPaymentV1CompensationInputs", {
	title: "Inspect Payment V1 compensation inputs",
	description:
		"Read-only source audit for one Event. It exposes the exact live inputs available to the Payment V1 Worker, without calculating or writing compensation. A missing value is reported as missing rather than substituted.",
	hints: { readOnlyHint: true },
	schema: j.object({ eventPageId: j.string().describe("Existing Event page ID to inspect.") }),
	execute: async (input, { notion }) => {
		const rawEvent = await notion.pages.retrieve({ page_id: input.eventPageId })
		if (!("properties" in rawEvent)) throw new Error("The supplied page is not a full Notion Event page.")
		const event = rawEvent as unknown as NotionPage
		const product = textValue(property(event, "Event Type"))
		const scheduled = dateValue(property(event, "Scheduled"))
		const scheduledHours =
			scheduled?.start && scheduled.end
				? (Date.parse(scheduled.end) - Date.parse(scheduled.start)) / 3_600_000
				: null
		const coachIds = relationIds(property(event, "Coaches"))
		const [target, coaches] = await Promise.all([
			findCompensationTargetSale(notion, event),
			Promise.all(coachIds.map((coachId) => getCoachDirectorState(notion, coachId))),
		])
		const weeklyHours = await Promise.all(
			coaches.map((coach) =>
				qualifyingWeeklyHours(notion, coach.coachPageId, event, input.eventPageId)
			)
		)
		return {
			mode: "read-only",
			eventPageId: input.eventPageId,
			product: product || null,
			coachCount: coachIds.length,
			coaches: coaches.map((coach, index) => ({
				...coach,
				weeklyQualifyingHours: weeklyHours[index],
				baseRateIdrPerHour: baseRateForCoachLevel(coach.coachLevel),
			})),
			scheduled: scheduled?.start ?? null,
			scheduledHours: Number.isFinite(scheduledHours) && scheduledHours !== null && scheduledHours >= 0 ? scheduledHours : null,
			eventTacitListPriceIdr: numberValue(property(event, "Tacit List Price (IDR)")),
			targetSalePageId: target.target.pageId,
			targetSaleName: target.target.saleName,
			placement: target.placement,
			unresolvedInputs: [
				"Target Sale list price must be verified against the final target-reader scope before a write path is enabled.",
			],
			boundary:
				"No-write source audit only. It does not change Sales, Events, Hourly Rate, Balance Sheet, formulas or automations.",
		}
	},
})

worker.webhook("onPaymentV1SaleReady", {
	title: "Payment V1 Sale-ready trigger",
	description:
		"Secure ingress for the future TP: Sales Ready to process automation. It rejects requests without the configured shared secret and fails closed until the Sales trigger contract and processor are fully enabled.",
	verify: (request) =>
		hasValidPaymentV1WebhookSecret(request.headers)
			? { status: 202, body: "accepted" }
			: { status: 401, body: "unauthorised" },
	execute: async (events, { notion }) => {
		for (const event of events) {
			const findPageId = (value: unknown): string | null => {
				if (typeof value === "string") {
					if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
						return value
					}
					if (/^[0-9a-f]{32}$/i.test(value)) {
						return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`
					}
					try {
						return findPageId(JSON.parse(value))
					} catch {
						return null
					}
				}
				if (Array.isArray(value)) {
					for (const item of value) {
						const pageId = findPageId(item)
						if (pageId) return pageId
					}
					return null
				}
				if (value && typeof value === "object") {
					const record = value as Record<string, unknown>
					for (const key of ["id", "pageId", "page_id", "value", "string", "plain_text"]) {
						const pageId = findPageId(record[key])
						if (pageId) return pageId
					}
					for (const nestedValue of Object.values(record)) {
						const pageId = findPageId(nestedValue)
						if (pageId) return pageId
					}
				}
				return null
			}
			const webhookData = event.body.data as Record<string, unknown> | undefined
			const webhookProperties = webhookData?.properties as Record<string, unknown> | undefined
			const paymentPageIdProperty = webhookProperties?.[
				"Payment Processing Page ID"
			] as Record<string, unknown> | undefined
			const paymentPageIdFormula = paymentPageIdProperty?.formula as
				| Record<string, unknown>
				| undefined
			const salePageId =
				findPageId(event.body.salePageId) ??
				findPageId(event.body.pageId) ??
				findPageId(event.body["Payment Processing Page ID"]) ??
				findPageId(paymentPageIdFormula?.string)
			if (!salePageId) {
				console.warn(
					"Payment V1 webhook ignored: no salePageId/pageId in webhook body."
				)
				continue
			}
			try {
				const rawSale = await notion.pages.retrieve({ page_id: salePageId })
				if (!("properties" in rawSale)) throw new Error("Sale page could not be read.")
				const sale = rawSale as unknown as NotionPage
				if (textValue(property(sale, "Payment Processing Status")) !== "Ready to process") continue
				if (textValue(property(sale, "Financial Route")) !== "Payment V1") {
					throw new Error("Sale is not routed to Payment V1.")
				}
				if (textValue(property(sale, "Sale Role")) !== "Revenue") {
					throw new Error("Only a Revenue Sale can start Payment V1 processing.")
				}
				const eventIds = relationIds(property(sale, "Events"))
				const studentIds = relationIds(property(sale, "Students"))
				if (eventIds.length !== 1 || studentIds.length < 1) {
					throw new Error("Draft Sale requires exactly one Event and at least one Student.")
				}
				if (
					!dateValue(property(sale, "Payment Verified At")) ||
					peopleIds(property(sale, "Payment Verified By")).length !== 1
				) {
					throw new Error("Exactly one payment verification timestamp and verifier are required.")
				}
				await notion.pages.update({
					page_id: salePageId,
					properties: { "Payment Processing Status": { select: { name: "Processing" } } },
				})
				const rawEvent = await notion.pages.retrieve({ page_id: eventIds[0] })
				if (!("properties" in rawEvent)) throw new Error("Linked Event could not be read.")
				const booking = rawEvent as unknown as NotionPage
				const product = textValue(property(booking, "Event Type")) as Product
				const priceListIds = relationIds(property(booking, "Published Price List"))
				if (product === "Player Academy") throw new Error("Player Academy is fail-closed for Payment V1.")
				if (priceListIds.length !== 1) throw new Error("Event requires exactly one Published Price List.")
				const rawPriceList = await notion.pages.retrieve({ page_id: priceListIds[0] })
				if (!("properties" in rawPriceList)) throw new Error("Published Price List could not be read.")
				const priceList = rawPriceList as unknown as NotionPage
				if (textValue(property(priceList, "Status")) === "Proposed") throw new Error("Published Price List is still Proposed, not approved.")
				const coachLevel = textValue(property(booking, "Coach Level"))
				const capacity = numberValue(property(booking, "Capacity"))
				const sourceField = product === "Clinic"
					? capacity !== null ? `${coachLevel} 1:${capacity} (IDR PP)` : null
					: priceFieldFor(product, coachLevel, studentIds.length)
				const publishedPrice = numberValue(property(booking, "Published Price per Student (IDR)"))
				const resolvedRate = product === "Play with Coach"
					? publishedPrice
					: sourceField ? numberValue(property(priceList, sourceField)) : null
				if (resolvedRate === null) throw new Error("Active Price List does not resolve a rate for this Sale.")
				if ((product === "Clinic" || product === "Play with Coach") && publishedPrice === null) {
					throw new Error("Event requires a published customer price.")
				}
				const finalCharge = product === "Clinic" || product === "Play with Coach" ? publishedPrice : resolvedRate
				if (finalCharge === null) throw new Error("Final customer price could not be resolved.")
				if ((numberValue(property(sale, "Shared Discount %")) ?? 0) !== 0) {
					throw new Error("Discounted processing is not enabled in this V1 trigger.")
				}
				const joinable = product === "Clinic" || product === "Coaches Academy" || product === "Play with Coach"
				let costSaleId: string | null = null
				for (const linkedSaleId of relationIds(property(booking, "Sales"))) {
					const candidateRaw = await notion.pages.retrieve({ page_id: linkedSaleId })
					if (!("properties" in candidateRaw)) continue
					const candidate = candidateRaw as unknown as NotionPage
					if (textValue(property(candidate, "Financial Route")) === "Payment V1" &&
						textValue(property(candidate, "Sale Role")) === "Cost") costSaleId = linkedSaleId
				}
				if (joinable && !costSaleId) {
					const cost = await notion.pages.create({
						parent: { data_source_id: "261afdfb-c3c7-81d5-b4a7-000b0f69814f" },
						properties: {
							Sale: { title: [{ text: { content: `${textValue(property(booking, "Event"))} · Cost` } }] },
							Events: { relation: [{ id: eventIds[0] }] },
							Coaches: { relation: relationIds(property(booking, "Coaches")).map((id) => ({ id })) },
							Organisations: { relation: relationIds(property(booking, "Organisations")).map((id) => ({ id })) },
							Areas: { relation: relationIds(property(booking, "Areas")).map((id) => ({ id })) },
							"Sale Type": { select: { name: product } },
							"Sale Status": { select: { name: "Confirmed" } },
							"Sale Role": { select: { name: "Cost" } },
							"Financial Route": { select: { name: "Payment V1" } },
							"Price List": { relation: [{ id: priceListIds[0] }] },
							"Payment Channel": { select: { name: "Cost" } },
							"Paid To": { select: { name: "N/A (Cost Sale)" } },
							"Revenue Scope": { select: { name: textValue(property(sale, "Revenue Scope")) } },
							"Court Hourly Rate (IDR)": { number: numberValue(property(sale, "Court Hourly Rate (IDR)")) },
						} as never,
					})
					costSaleId = cost.id
				}
				await notion.pages.update({
					page_id: salePageId,
					properties: {
						"Sale Status": { select: { name: "Confirmed" } },
						"Resolved Coaching Rate (IDR)": { number: resolvedRate },
						"Final Charged Price (IDR)": { number: finalCharge },
						"Price List": { relation: [{ id: priceListIds[0] }] },
						...(product === "Clinic" ? { "Clinic (IDR PP)": { number: publishedPrice } } : {}),
						...(costSaleId ? { Item: { relation: [{ id: costSaleId }] } } : {}),
						"Payment Processing Status": { select: { name: "Processed" } },
					} as never,
				})
			} catch (error) {
				console.error(`Payment V1 processing failed for ${salePageId}:`, error)
				try {
					await notion.pages.update({
						page_id: salePageId,
						properties: { "Payment Processing Status": { select: { name: "Exception" } } },
					})
				} catch (statusError) {
					console.error("Could not mark Payment V1 Sale as Exception:", statusError)
				}
			}
		}
	},
})

worker.tool("resolvePaymentV1Quote", {
	title: "Resolve Payment V1 quote",
	description:
		"Read-only quote resolver for one Payment V1 Event. Re-reads the Event and its published Price List (the period covering the lesson date — Previous periods are valid for historical bookings), then returns the locked price inputs and blockers. It never creates or changes records.",
	hints: { readOnlyHint: true },
	schema: j.object({
		eventPageId: j.string().describe("The Notion page ID of the Event to quote."),
		studentCount: j.integer().describe("Number of students represented by the proposed Revenue Sale."),
		plannedCapacity: j.integer().nullable().describe("Planned Event capacity. Required for Clinic rate resolution because the Clinic coaching rate is capacity-based, not paid-attendee-count based."),
		coachLevel: j.enum("Head Coach", "Senior Coach", "Coach", "Instructor", "Trainee").describe("Delivering coach level used for rate-card resolution."),
		discountPercent: j.number().describe("Authorised discount as a decimal from 0 to 1; use 0 when none applies."),
	}),
	execute: async (input, { notion }) => {
		const rawEvent = await notion.pages.retrieve({ page_id: input.eventPageId })
		if (!("properties" in rawEvent)) {
			throw new Error("The supplied page is not a full Notion Event page.")
		}
		const event = rawEvent as unknown as NotionPage
		const product = textValue(property(event, "Event Type")) as Product
		const route = textValue(property(event, "Financial Route"))
		const eventStatus = textValue(property(event, "Status"))
		const publishedPrice = numberValue(
			property(event, "Published Price per Student (IDR)")
		)
		const schedule = dateValue(property(event, "Scheduled"))
		const priceListIds = relationIds(property(event, "Published Price List"))
		const blockers: string[] = []

		if (!Object.values({
			"Private Lesson": "Private Lesson",
			"Match with Coach": "Match with Coach",
			Clinic: "Clinic",
			"Coaches Academy": "Coaches Academy",
			"Play with Coach": "Play with Coach",
			"Player Academy": "Player Academy",
		}).includes(product)) blockers.push("Event Type is unresolved or unsupported.")
		if (route !== "Payment V1") blockers.push("Event is not routed to Payment V1.")
		if (!["Pending", "Payment Processing", "Confirmed"].includes(eventStatus)) {
			blockers.push("Event must be Pending, Payment Processing or Confirmed.")
		}
		if (input.discountPercent < 0 || input.discountPercent > 1) {
			blockers.push("Discount must be between 0 and 1.")
		}
		if (product === "Player Academy") blockers.push("Player Academy is fail-closed for Payment V1.")
		if (
			product === "Private Lesson" &&
			(input.studentCount < 1 || input.studentCount > 4)
		) {
			blockers.push("Private Lesson rate resolution requires one to four students.")
		}
		if (priceListIds.length !== 1) blockers.push("Exactly one Published Price List is required.")

		let priceListName = ""
		let priceListStatus = ""
		let resolvedRate: number | null = null
		let sourceField: string | null = null

		if (priceListIds.length === 1) {
			const rawList = await notion.pages.retrieve({ page_id: priceListIds[0] })
			if (!("properties" in rawList)) {
				blockers.push("Published Price List could not be read.")
			} else {
				const priceList = rawList as unknown as NotionPage
				priceListName = textValue(property(priceList, "Price Period"))
				priceListStatus = textValue(property(priceList, "Status"))
				if (priceListStatus === "Proposed") {
					blockers.push("Published Price List is still Proposed, not approved.")
				}
				sourceField = priceFieldFor(product, input.coachLevel, input.studentCount)
				if (product === "Clinic" && input.plannedCapacity !== null) {
					sourceField = `${input.coachLevel} 1:${input.plannedCapacity} (IDR PP)`
				}
				if (sourceField) resolvedRate = numberValue(property(priceList, sourceField))
			}
		}

		if (
			product === "Clinic" &&
			(input.plannedCapacity === null ||
				input.plannedCapacity < 1 ||
				input.plannedCapacity > 4)
		) {
			blockers.push("Clinic rate resolution requires planned capacity from 1 to 4.")
		}
		if (product === "Match with Coach" && input.studentCount !== 3) {
			blockers.push("Match with Coach requires exactly three students.")
		}
		if (sourceField && resolvedRate === null) {
			blockers.push(`The active Price List has no value for ${sourceField}.`)
		}
		if (
			(product === "Clinic" || product === "Play with Coach") &&
			(publishedPrice === null || publishedPrice < 0)
		) {
			blockers.push("This product requires a non-negative published Event price per student.")
		}

		const customerPriceBeforeDiscount =
			product === "Clinic" || product === "Play with Coach"
				? publishedPrice
				: resolvedRate
		const finalChargedPrice =
			customerPriceBeforeDiscount === null
				? null
				: round(customerPriceBeforeDiscount * (1 - input.discountPercent))
		const durationHours =
			schedule?.start && schedule.end
				? (new Date(schedule.end).getTime() - new Date(schedule.start).getTime()) /
					3_600_000
				: null

		return {
			mode: "read-only",
			eventPageId: input.eventPageId,
			product,
			eventStatus,
			priceList: {
				id: priceListIds[0] ?? null,
				name: priceListName || null,
				status: priceListStatus || null,
				sourceField,
			},
			quote: {
				resolvedCoachingRateIdr: resolvedRate,
				publishedEventPricePerStudentIdr: publishedPrice,
				discountPercent: input.discountPercent,
				finalChargedPricePerStudentIdr: finalChargedPrice,
				scheduledHours: durationHours,
			},
			readyForControlledApply: blockers.length === 0,
			blockers,
			proposedActions: [
				"Quote only — no Event, Sale, Hourly Rate or Balance Sheet record was created or changed.",
				"An authorised controlled apply step must still capture payment verification and complete the idempotent Sale write.",
			],
		}
	},
})

type ApplyPaymentInput = {
	operationKey: string
	eventPageId: string
	studentPageIds: string[]
	paymentVerifiedAt?: string
	paymentVerifiedById?: string
	paymentVerificationNote: string
	paymentChannel: "Bank transfer" | "Courtside" | "Club" | "Ayo" | "Reclub"
	paidTo: "Tacit" | "Club"
	revenueScope: "Academy Fees" | "Combined"
	courtHourlyRateIdr: number | null
	sharedDiscountPercent: number
	discountReasons: string[]
	discountExplanation: string
}

const applyPaymentV1VerifiedSale = async (input: ApplyPaymentInput, notion: Client): Promise<any> => {
		const rawEvent = await notion.pages.retrieve({ page_id: input.eventPageId })
		if (!("properties" in rawEvent)) {
			throw new Error("The supplied page is not a full Notion Event page.")
		}
		const event = rawEvent as unknown as NotionPage
		const product = textValue(property(event, "Event Type")) as Product
		const eventStatus = textValue(property(event, "Status"))
		const eventTitle = textValue(property(event, "Event")) || "Payment V1 Sale"
		const eventStudentIds = relationIds(property(event, "Students"))
		const eventSaleIds = relationIds(property(event, "Sales"))
		const eventCoachIds = relationIds(property(event, "Coaches"))
		const eventOrganisationIds = relationIds(property(event, "Organisations"))
		const eventAreaIds = relationIds(property(event, "Areas"))
		const priceListIds = relationIds(property(event, "Published Price List"))
		const publishedPrice = numberValue(property(event, "Published Price per Student (IDR)"))
		const declaredCapacity = numberValue(property(event, "Capacity"))
		const plannedCapacity = declaredCapacity !== null && declaredCapacity >= 1 && Number.isInteger(declaredCapacity)
			? declaredCapacity
			: eventStudentIds.length
		const coachLevel = textValue(property(event, "Coach Level"))
		const blockers: string[] = []
		const joinable =
			product === "Clinic" ||
			product === "Coaches Academy" ||
			product === "Play with Coach"

		if (!["Pending", "Payment Processing", "Confirmed"].includes(eventStatus)) {
			blockers.push("Event must be Pending, Payment Processing or Confirmed.")
		}
		if (booleanValue(property(event, "Payment Processing Exception"))) {
			blockers.push("Payment Processing Exception is checked.")
		}
		if (product === "Player Academy") blockers.push("Player Academy is fail-closed for Payment V1.")
		if (!product) blockers.push("Event Type is unresolved.")
		if (priceListIds.length !== 1) blockers.push("Exactly one Published Price List is required.")
		if (input.studentPageIds.length < 1) blockers.push("At least one verified attendee is required.")
		if (
			input.studentPageIds.some((studentId) => !eventStudentIds.some((eventStudentId) => eventStudentId.replace(/-/g, "") === studentId.replace(/-/g, "")))
		) {
			blockers.push("Every attendee must already be linked to the Event.")
		}
		if (joinable && input.studentPageIds.length !== 1) {
			blockers.push("Joinable products process exactly one paid attendee per operation.")
		}
		if (product === "Match with Coach" && input.studentPageIds.length !== 3) {
			blockers.push("Match with Coach requires exactly three attendees.")
		}
		if (
			product === "Private Lesson" &&
			(input.studentPageIds.length < 1 || input.studentPageIds.length > 4)
		) {
			blockers.push("Private Lesson requires one to four attendees.")
		}
		if (
			(product === "Private Lesson" || product === "Clinic") &&
			input.revenueScope === "Academy Fees" &&
			(input.courtHourlyRateIdr === null || input.courtHourlyRateIdr < 0)
		) {
			blockers.push("Academy Fees scope requires a non-negative court hourly rate.")
		}
		if (input.paymentChannel === "Bank transfer" && input.paidTo === "Tacit" && (!input.paymentVerifiedAt || !input.paymentVerifiedById)) {
			blockers.push("Bank transfer paid to Tacit requires a verification time and verifier.")
		}
		if (input.sharedDiscountPercent < 0 || input.sharedDiscountPercent > 1) {
			blockers.push("Shared discount must be between 0 and 1.")
		}
		if (input.paymentChannel === "Club" && input.paidTo !== "Club") {
			blockers.push("Club payment channel must be paid to Club.")
		}

		let activePriceList: NotionPage | null = null
		if (priceListIds.length === 1) {
			const rawList = await notion.pages.retrieve({ page_id: priceListIds[0] })
			if (!("properties" in rawList)) {
				blockers.push("Published Price List could not be read.")
			} else {
				activePriceList = rawList as unknown as NotionPage
				if (textValue(property(activePriceList, "Status")) === "Proposed") {
					blockers.push("Published Price List is still Proposed, not approved.")
				}
			}
		}

		let sourceField: string | null = null
		if (product === "Clinic") {
			if (plannedCapacity === null || plannedCapacity < 1 || plannedCapacity > 4) {
				blockers.push("Clinic requires Event Capacity from 1 to 4.")
			} else {
				sourceField = `${coachLevel} 1:${plannedCapacity} (IDR PP)`
			}
		} else {
			sourceField = priceFieldFor(product, coachLevel, input.studentPageIds.length)
		}
		let resolvedCoachingRate: number | null =
			sourceField && activePriceList
				? numberValue(property(activePriceList, sourceField))
				: null
		if (product === "Play with Coach") resolvedCoachingRate = publishedPrice
		if (product !== "Play with Coach" && resolvedCoachingRate === null) {
			blockers.push(
				sourceField
					? `Active Price List has no value for ${sourceField}.`
					: "Product rate could not be resolved from the Active Price List."
			)
		}
		if (
			(product === "Clinic" || product === "Play with Coach") &&
			(publishedPrice === null || publishedPrice < 0)
		) {
			blockers.push("This product requires a non-negative published Event price.")
		}
		const finalChargedPrice =
			product === "Clinic" || product === "Play with Coach"
				? publishedPrice === null ? null : round(publishedPrice * (1 - input.sharedDiscountPercent))
				: resolvedCoachingRate === null ? null : round(resolvedCoachingRate * (1 - input.sharedDiscountPercent))

		if (
			eventCoachIds.length === 0 ||
			eventOrganisationIds.length === 0 ||
			eventAreaIds.length === 0
		) {
			blockers.push("Event must have coaches, organisation and Area relations before payment processing.")
		}
		if (blockers.length > 0) {
			return {
				mode: "blocked-no-write",
				operationKey: input.operationKey,
				eventPageId: input.eventPageId,
				blockers,
				created: [],
				revenueSaleId: null,
				costSaleId: null,
				ledgerId: null,
				capacityConfirmation: null,
				resolvedCoachingRateIdr: null,
				finalChargedPricePerStudentIdr: null,
				note: null,
				neverCreated: ["Hourly Rate"],
			}
		}

		const sameIds = (left: string[], right: string[]) =>
			left.length === right.length &&
			[...left].map((id) => id.replace(/-/g, "")).sort().every((id, index) => id === [...right].map((candidate) => candidate.replace(/-/g, "")).sort()[index])
		let existingRevenueSaleId: string | null = null
		let existingCostSaleId: string | null = null
		for (const saleId of eventSaleIds) {
			const rawSale = await notion.pages.retrieve({ page_id: saleId })
			if (!("properties" in rawSale)) continue
			const sale = rawSale as unknown as NotionPage
			if (textValue(property(sale, "Payment Processing Status")) !== "Processed") continue
			const role = textValue(property(sale, "Sale Role"))
			if (
				role === "Revenue" &&
				sameIds(relationIds(property(sale, "Students")), input.studentPageIds)
			) {
				existingRevenueSaleId = saleId
			}
			if (role === "Cost") existingCostSaleId = saleId
		}
		const relations = (ids: string[]) => ids.map((id) => ({ id }))
		const ensureLedger = async (revenueSaleId: string) => {
			const existingLedgerId = await findBalanceSheetIdForSale(notion, revenueSaleId)
			if (existingLedgerId) return { ledgerId: existingLedgerId, created: false }
			const revenueSale = (await notion.pages.retrieve({ page_id: revenueSaleId })) as unknown as NotionPage
			const saleUniqueId = property(revenueSale, "ID")?.unique_id as { prefix?: string; number?: number } | undefined
			const saleSku = saleUniqueId?.prefix && saleUniqueId.number != null ? `${saleUniqueId.prefix}-${String(saleUniqueId.number).padStart(6, "0")}` : ""
			const saleTitle = textValue(property(revenueSale, "Sale"))
			const ledger = await notion.pages.create({
				parent: { data_source_id: balanceSheetDataSourceId },
				icon: { type: "icon", icon: { name: "upward", color: "green" } } as never,
				properties: {
					Item: {
						title: [
							{
								text: {
									content: `${saleSku ? `${saleSku} · ` : ""}${saleTitle || `${eventTitle} · ${input.operationKey}`}`,
								},
							},
						],
					},
					Sales: { relation: relations([revenueSaleId]) },
					"Record Type": { select: { name: "Transaction" } },
					"In/Out": { select: { name: "Incoming" } },
					"Payment Status": { status: { name: "Paid" } },
					"Transaction Date": { date: { start: input.paymentVerifiedAt || new Date().toISOString() } },
					Organisations: { relation: relations(eventOrganisationIds) },
					Areas: { relation: relations(eventAreaIds) },
					People: { relation: relations(input.studentPageIds) },
					Note: {
						rich_text: [
							{
								text: {
									content: `[${input.operationKey}] Payment V1 verified ledger entry`,
								},
							},
						],
					},
				} as never,
			})
			return { ledgerId: ledger.id, created: true }
		}

		if (existingRevenueSaleId) {
			const ledger = await ensureLedger(existingRevenueSaleId)
			const capacityConfirmation = await confirmEventIfPaidCapacity(notion, input.eventPageId)
			return {
				mode: "idempotent-reuse",
				operationKey: input.operationKey,
				eventPageId: input.eventPageId,
				revenueSaleId: existingRevenueSaleId,
				costSaleId: existingCostSaleId,
				ledgerId: ledger.ledgerId,
				capacityConfirmation,
				created: ledger.created ? ["Balance Sheet ledger"] : [],
				blockers: [],
				resolvedCoachingRateIdr: null,
				finalChargedPricePerStudentIdr: null,
				note: ledger.created
					? "Existing Revenue Sale was reconciled by creating its missing Balance Sheet ledger row."
					: "Existing Revenue Sale and its single Balance Sheet ledger row were reused; no records changed.",
				neverCreated: ["Hourly Rate"],
			}
		}

		const commonProperties = {
			Events: { relation: relations([input.eventPageId]) },
			Coaches: { relation: relations(eventCoachIds) },
			Organisations: { relation: relations(eventOrganisationIds) },
			Areas: { relation: relations(eventAreaIds) },
			"Sale Type": { select: { name: product } },
			"Sale Status": { select: { name: "Confirmed" } },
			"Financial Route": { select: { name: "Payment V1" } },
			"Price List": { relation: relations(priceListIds) },
			"Resolved Coaching Rate (IDR)": { number: resolvedCoachingRate },
			"Final Charged Price (IDR)": { number: finalChargedPrice },
			"Revenue Scope": { select: { name: input.revenueScope } },
			"Court Hourly Rate (IDR)": { number: input.courtHourlyRateIdr },
			"Shared Discount %": { number: input.sharedDiscountPercent },
			"Discount Reason": { multi_select: input.discountReasons.map((name) => ({ name })) },
			"Discount Explanation": { rich_text: input.discountExplanation ? [{ type: "text", text: { content: input.discountExplanation } }] : [] },
		}

		let createdCostSale = false
		if (joinable && !existingCostSaleId) {
			const cost = await notion.pages.create({
				parent: { data_source_id: "261afdfb-c3c7-81d5-b4a7-000b0f69814f" },
				properties: {
					...commonProperties,
					Sale: { title: [{ text: { content: `${eventTitle} · Cost` } }] },
					"Sale Role": { select: { name: "Cost" } },
					"Payment Channel": { select: { name: "Cost" } },
					"Paid To": { select: { name: "N/A (Cost Sale)" } },
				} as never,
			})
			existingCostSaleId = cost.id
			createdCostSale = true
		}

		const revenue = await notion.pages.create({
			parent: { data_source_id: "261afdfb-c3c7-81d5-b4a7-000b0f69814f" },
			properties: {
				...commonProperties,
				Sale: {
					title: [
						{
							text: {
								content: `${eventTitle} · ${input.operationKey}`,
							},
						},
					],
				},
				Students: { relation: relations(input.studentPageIds) },
				"Sale Role": { select: { name: "Revenue" } },
				"Payment Channel": { select: { name: input.paymentChannel } },
				"Paid To": { select: { name: input.paidTo } },
				...(input.paymentVerifiedAt ? { "Payment Verified At": { date: { start: input.paymentVerifiedAt } } } : {}),
				...(input.paymentVerifiedById ? { "Payment Verified By": { people: [{ id: input.paymentVerifiedById }] } } : {}),
				"Payment Verification Note": {
					rich_text: [
						{
							text: {
								content: `[${input.operationKey}] ${input.paymentVerificationNote}`,
							},
						},
					],
				},
				"Payment Processing Status": { select: { name: "Processed" } },
				...(product === "Clinic"
					? { "Clinic (IDR PP)": { number: publishedPrice } }
					: {}),
				...(existingCostSaleId
					? { Item: { relation: relations([existingCostSaleId]) } }
					: {}),
			} as never,
		})
		const ledger = await ensureLedger(revenue.id)
		const capacityConfirmation = await confirmEventIfPaidCapacity(notion, input.eventPageId)

		return {
			mode: "applied",
			operationKey: input.operationKey,
			eventPageId: input.eventPageId,
			revenueSaleId: revenue.id,
			costSaleId: existingCostSaleId,
			ledgerId: ledger.ledgerId,
			capacityConfirmation,
			resolvedCoachingRateIdr: resolvedCoachingRate,
			finalChargedPricePerStudentIdr: finalChargedPrice,
			created: [
				...(createdCostSale ? ["shared Cost Sale"] : []),
				"Revenue Sale",
				...(ledger.created ? ["Balance Sheet ledger"] : []),
			],
			blockers: [],
			note: null,
			neverCreated: ["Hourly Rate"],
		}
}

worker.tool("applyPaymentV1VerifiedSale", {
	title: "Apply verified Payment V1 sale",
	description:
		"Controlled, zero-discount Payment V1 accounting step. Re-reads and validates the Event and its published Price List (the period covering the lesson date), idempotently creates or reuses the permitted V1 Revenue Sale and its one linked Balance Sheet ledger row. At exact paid capacity it confirms the Event. Compensation is deliberately outside this route. It never creates an Hourly Rate.",
	schema: j.object({
		operationKey: j.string().describe("Stable operator-confirmed idempotency key for this payment."),
		eventPageId: j.string().describe("The Payment V1 Event page ID."),
		studentPageIds: j.array(j.string()).describe("Verified attendee page IDs. One paid place for joinable products; the full booked group for Private Lesson or Match with Coach."),
		paymentVerifiedAt: j.string().describe("ISO-8601 timestamp at which payment was verified."),
		paymentVerifiedById: j.string().describe("Notion user ID of the payment verifier."),
		paymentVerificationNote: j.string().describe("Short non-sensitive evidence or director-confirmation note."),
		paymentChannel: j.enum("Bank transfer", "Courtside", "Club", "Ayo", "Reclub").describe("Verified payment route."),
		paidTo: j.enum("Tacit", "Club").describe("Recipient that collected the payment."),
		revenueScope: j.enum("Academy Fees", "Combined").describe("Approved revenue scope copied to the V1 Sales records."),
		courtHourlyRateIdr: j.number().nullable().describe("Court rate used for Academy Fees scope, or null when the product has no separate court rental."),
		sharedDiscountPercent: j.number().describe("Approved shared discount as a decimal from 0 to 1."),
		discountReasons: j.array(j.string()).describe("Approved discount reasons."),
		discountExplanation: j.string().describe("Concise approved discount explanation."),
	}),
	execute: async (input, { notion }) => applyPaymentV1VerifiedSale(input as ApplyPaymentInput, notion),
})

type PaymentV1EventInstruction = {
	operationKey: string
	eventPageId: string
	studentPageIds: string[]
	processingType: "Payment" | "Promo"
	paymentVerifiedAt?: string
	paymentVerifiedById?: string
	paymentVerificationNote: string
	paymentChannel: "Bank transfer" | "Courtside" | "Club" | "Ayo" | "Reclub"
	paidTo: "Tacit" | "Club"
	revenueScope: "Academy Fees" | "Combined"
	courtHourlyRateIdr: number | null
	sharedDiscountPercent: number
	discountReasons: string[]
	discountExplanation: string
}

const jsonObjectsIn = (source: string): unknown[] => {
	const values: unknown[] = []
	for (let start = 0; start < source.length; start += 1) {
		if (source[start] !== "{") continue
		let depth = 0, quoted = false, escaped = false
		for (let end = start; end < source.length; end += 1) {
			const char = source[end]
			if (quoted) {
				if (escaped) escaped = false
				else if (char === "\\") escaped = true
				else if (char === '"') quoted = false
				continue
			}
			if (char === '"') { quoted = true; continue }
			if (char === "{") depth += 1
			if (char === "}") {
				depth -= 1
				if (depth === 0) {
					try { values.push(JSON.parse(source.slice(start, end + 1))) } catch { /* not JSON */ }
					break
				}
			}
		}
	}
	return values
}

const eventInstruction = (event: NotionPage): PaymentV1EventInstruction | null => {
	const raw = textValue(property(event, "Event Log"))
	const candidates = jsonObjectsIn(raw).filter((value): value is Record<string, unknown> =>
		Boolean(value) && typeof value === "object" && !Array.isArray(value)
	)
	for (const item of candidates.reverse()) {
		if (item.processingType !== "Payment" || typeof item.operationKey !== "string" || typeof item.eventPageId !== "string" || !Array.isArray(item.studentPageIds)) continue
		if (typeof item.paymentVerificationNote !== "string") continue
		if (typeof item.paymentChannel !== "string" || typeof item.paidTo !== "string" || typeof item.revenueScope !== "string") continue
		if (typeof item.sharedDiscountPercent !== "number" || !Array.isArray(item.discountReasons) || typeof item.discountExplanation !== "string") continue
		return {
			operationKey: item.operationKey, eventPageId: item.eventPageId,
			studentPageIds: item.studentPageIds.filter((id): id is string => typeof id === "string"),
			processingType: "Payment", paymentVerifiedAt: typeof item.paymentVerifiedAt === "string" ? item.paymentVerifiedAt : undefined, paymentVerifiedById: typeof item.paymentVerifiedById === "string" ? item.paymentVerifiedById : undefined,
			paymentVerificationNote: item.paymentVerificationNote,
			paymentChannel: item.paymentChannel as PaymentV1EventInstruction["paymentChannel"], paidTo: item.paidTo as PaymentV1EventInstruction["paidTo"],
			revenueScope: item.revenueScope as PaymentV1EventInstruction["revenueScope"],
			courtHourlyRateIdr: typeof item.courtHourlyRateIdr === "number" ? item.courtHourlyRateIdr : null,
			sharedDiscountPercent: item.sharedDiscountPercent,
			discountReasons: item.discountReasons.filter((value): value is string => typeof value === "string"),
			discountExplanation: item.discountExplanation,
		}
	}
	return null
}

const eventInstructionFromPageContent = async (
	notion: Client,
	eventPageId: string
): Promise<PaymentV1EventInstruction | null> => {
	const blocks = await notion.blocks.children.list({ block_id: eventPageId, page_size: 100 })
	const content = blocks.results
		.map((block: any) => {
			const typedBlock = block?.[block?.type]
			return Array.isArray(typedBlock?.rich_text)
				? typedBlock.rich_text.map((item: { plain_text?: string }) => item.plain_text ?? "").join("")
				: ""
		})
		.join("\n")
	const candidates = jsonObjectsIn(content).filter((value): value is Record<string, unknown> =>
		Boolean(value) && typeof value === "object" && !Array.isArray(value)
	)
	for (const item of candidates.reverse()) {
		if (item.processingType !== "Payment" || typeof item.operationKey !== "string" || typeof item.eventPageId !== "string" || !Array.isArray(item.studentPageIds)) continue
		if (typeof item.paymentVerificationNote !== "string") continue
		if (typeof item.paymentChannel !== "string" || typeof item.paidTo !== "string" || typeof item.revenueScope !== "string") continue
		if (typeof item.sharedDiscountPercent !== "number" || !Array.isArray(item.discountReasons) || typeof item.discountExplanation !== "string") continue
		return {
			operationKey: item.operationKey,
			eventPageId: item.eventPageId,
			studentPageIds: item.studentPageIds.filter((id): id is string => typeof id === "string"),
			processingType: "Payment",
			paymentVerifiedAt: typeof item.paymentVerifiedAt === "string" ? item.paymentVerifiedAt : undefined,
			paymentVerifiedById: typeof item.paymentVerifiedById === "string" ? item.paymentVerifiedById : undefined,
			paymentVerificationNote: item.paymentVerificationNote,
			paymentChannel: item.paymentChannel as PaymentV1EventInstruction["paymentChannel"],
			paidTo: item.paidTo as PaymentV1EventInstruction["paidTo"],
			revenueScope: item.revenueScope as PaymentV1EventInstruction["revenueScope"],
			courtHourlyRateIdr: typeof item.courtHourlyRateIdr === "number" ? item.courtHourlyRateIdr : null,
			sharedDiscountPercent: item.sharedDiscountPercent,
			discountReasons: item.discountReasons.filter((value): value is string => typeof value === "string"),
			discountExplanation: item.discountExplanation,
		}
	}
	return null
}

const eventIdFromWebhook = (value: unknown, seen = new WeakSet<object>()): string | null => {
	if (typeof value === "string") {
		if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return value
		if (/^[0-9a-f]{32}$/i.test(value)) return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`
		const hyphenatedId = value.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0]
		if (hyphenatedId) return hyphenatedId
		const compactId = value.match(/[0-9a-f]{32}/i)?.[0]
		if (compactId) return `${compactId.slice(0, 8)}-${compactId.slice(8, 12)}-${compactId.slice(12, 16)}-${compactId.slice(16, 20)}-${compactId.slice(20)}`
		try { return eventIdFromWebhook(JSON.parse(value), seen) } catch { return null }
	}
	if (Array.isArray(value)) {
		for (const item of value) {
			const id = eventIdFromWebhook(item, seen)
			if (id) return id
		}
		return null
	}
	if (!value || typeof value !== "object") return null
	if (seen.has(value)) return null
	seen.add(value)
	const record = value as Record<string, unknown>
	const preferredKeys = ["TP: Event [Self]", "eventPageId", "pageId", "page_id", "id", "value", "string", "plain_text"]
	for (const key of preferredKeys) {
		if (!(key in record)) continue
		const id = eventIdFromWebhook(record[key], seen)
		if (id) return id
	}
	for (const item of Object.values(record)) {
		const id = eventIdFromWebhook(item, seen)
		if (id) return id
	}
	return null
}

worker.webhook("onPaymentV1EventProcessing", {
	title: "Payment V1 Event-processing trigger",
	description: "Processes the latest verified Polly payment instruction when an Event enters Payment Processing.",
	// Notion pauses a database automation when its webhook receives a 4xx.
	// Always acknowledge receipt at ingress; validate the shared secret inside
	// the asynchronous handler and ignore invalid calls without writing data.
	verify: () => ({ status: 202, body: "accepted" }),
	execute: async (events, { notion }) => {
		for (const webhookEvent of events) {
			if (!hasValidPaymentV1WebhookSecret(webhookEvent.headers)) {
				console.warn("Payment V1 Event webhook ignored: invalid shared secret.")
				continue
			}
			const body = webhookEvent.body as Record<string, unknown>
			const data = body?.data as Record<string, unknown> | undefined
			const properties = data?.properties as Record<string, unknown> | undefined
			const eventPageId =
				eventIdFromWebhook(properties?.["TP: Event [Self]"]) ??
				eventIdFromWebhook(data?.id) ??
				eventIdFromWebhook(body?.eventPageId) ??
				eventIdFromWebhook(body?.pageId)
			if (!eventPageId) { console.warn("Payment V1 Event webhook ignored: no Event page ID."); continue }
			try {
				const raw = await notion.pages.retrieve({ page_id: eventPageId })
				if (!("properties" in raw)) throw new Error("Event page could not be read.")
				const booking = raw as unknown as NotionPage
				if (textValue(property(booking, "Status")) !== "Payment Processing") continue
				const instruction = eventInstruction(booking) ?? await eventInstructionFromPageContent(notion, eventPageId)
				if (!instruction) throw new Error("No valid payment-v1-instruction was found in Event Log.")
				if (instruction.eventPageId.split("-").join("") !== eventPageId.split("-").join("")) throw new Error("Payment instruction Event ID does not match webhook Event ID.")
				const result = await applyPaymentV1VerifiedSale(instruction, notion)
				if (result.mode === "blocked-no-write") {
					console.warn(`Payment V1 Event processing blocked for ${eventPageId}: ${result.blockers.join(" | ")}`)
					await notion.pages.update({
						page_id: eventPageId,
						properties: { Status: { status: { name: "Pending" } } },
					})
				}
			} catch (error) {
				console.error(`Payment V1 Event processing failed for ${eventPageId}:`, error)
			}
		}
	},
})

worker.tool("confirmPaymentV1PrivateLessonEvent", {
	title: "Validate Payment V1 Private Lesson for booking confirmation",
	description:
		"Read-only proof gate for one processed Payment V1 Private Lesson Revenue Sale and its worker-owned Balance Sheet row. It deliberately does not confirm the Event: booking logic must confirm only when capacity and booking rules are satisfied.",
	schema: j.object({
		operationKey: j.string().describe("Stable operator-confirmed idempotency key for this confirmation."),
		eventPageId: j.string().describe("The Pending Payment V1 Private Lesson Event page ID."),
		revenueSalePageId: j.string().describe("The uniquely linked, already Processed Payment V1 Revenue Sale page ID."),
	}),
	execute: async (input, { notion }) => {
		const rawEvent = await notion.pages.retrieve({ page_id: input.eventPageId })
		if (!("properties" in rawEvent)) {
			throw new Error("The supplied page is not a full Notion Event page.")
		}
		const event = rawEvent as unknown as NotionPage
		const eventStatus = textValue(property(event, "Status"))
		const route = textValue(property(event, "Financial Route"))
		const product = textValue(property(event, "Event Type"))
		const eventSaleIds = relationIds(property(event, "Sales"))
		const blockers: string[] = []

		if (eventStatus !== "Pending" && eventStatus !== "Confirmed") {
			blockers.push("Event must be Pending or already Confirmed.")
		}
		if (route !== "Payment V1") blockers.push("Event is not routed to Payment V1.")
		if (product !== "Private Lesson") {
			blockers.push("This confirmation action is limited to the Private Lesson first-live module.")
		}
		if (booleanValue(property(event, "Payment Processing Exception"))) {
			blockers.push("Payment Processing Exception is checked.")
		}
		if (!eventSaleIds.includes(input.revenueSalePageId)) {
			blockers.push("The supplied Revenue Sale is not linked to the Event.")
		}

		const rawSale = await notion.pages.retrieve({ page_id: input.revenueSalePageId })
		if (!("properties" in rawSale)) {
			throw new Error("The supplied page is not a full Notion Sale page.")
		}
		const sale = rawSale as unknown as NotionPage
		const v1RevenueSales = []
		for (const saleId of eventSaleIds) {
			const rawLinkedSale = await notion.pages.retrieve({ page_id: saleId })
			if (!("properties" in rawLinkedSale)) continue
			const linkedSale = rawLinkedSale as unknown as NotionPage
			if (
				textValue(property(linkedSale, "Financial Route")) === "Payment V1" &&
				textValue(property(linkedSale, "Sale Role")) === "Revenue"
			) {
				v1RevenueSales.push(saleId)
			}
		}

		if (v1RevenueSales.length !== 1 || v1RevenueSales[0] !== input.revenueSalePageId) {
			blockers.push("Event must have exactly one linked Payment V1 Revenue Sale, matching the supplied Sale.")
		}
		if (textValue(property(sale, "Financial Route")) !== "Payment V1") {
			blockers.push("Sale is not routed to Payment V1.")
		}
		if (textValue(property(sale, "Sale Role")) !== "Revenue") {
			blockers.push("Sale is not a Revenue Sale.")
		}
		if (textValue(property(sale, "Payment Processing Status")) !== "Processed") {
			blockers.push("Sale Payment Processing Status is not Processed.")
		}
		if (!dateValue(property(sale, "Payment Verified At"))) {
			blockers.push("Sale is missing Payment Verified At.")
		}
		if (peopleIds(property(sale, "Payment Verified By")).length !== 1) {
			blockers.push("Sale must have exactly one Payment Verified By person.")
		}
		if (relationIds(property(sale, "Price List")).length !== 1) {
			blockers.push("Sale must have exactly one Price List.")
		}
		if (numberValue(property(sale, "Resolved Coaching Rate (IDR)")) === null) {
			blockers.push("Sale is missing Resolved Coaching Rate (IDR).")
		}
		if (numberValue(property(sale, "Final Charged Price (IDR)")) === null) {
			blockers.push("Sale is missing Final Charged Price (IDR).")
		}
		if (relationIds(property(sale, "Events")).length !== 1) {
			blockers.push("Sale must be linked to exactly one Event.")
		}
		const ledgerId = await findBalanceSheetIdForSale(notion, input.revenueSalePageId)
		if (!ledgerId) {
			blockers.push("The Revenue Sale has no linked Balance Sheet ledger row.")
		}

		if (blockers.length > 0) {
			return {
				mode: "blocked-no-write",
				operationKey: input.operationKey,
				eventPageId: input.eventPageId,
				revenueSalePageId: input.revenueSalePageId,
				blockers,
				changed: [],
				ledgerId: null,
				neverCreated: ["Event confirmation", "Hourly Rate"],
			}
		}
		return {
			mode: "payment-and-ledger-validated-awaiting-booking-confirmation",
			operationKey: input.operationKey,
			eventPageId: input.eventPageId,
			revenueSalePageId: input.revenueSalePageId,
			ledgerId,
			blockers: [],
			changed: [],
			neverCreated: ["Event confirmation", "Hourly Rate"],
		}
	},
})

worker.tool("confirmPaymentV1EventAtPaidCapacity", {
	title: "Confirm Payment V1 Event at paid capacity",
	description:
		"Booking-owned confirmation gate for a Payment V1 Event. It confirms only a Pending Event whose verified, processed Revenue Sales have one Balance Sheet row each and whose distinct paid attendees exactly match Event Capacity. It never creates payment or ledger records.",
	schema: j.object({
		operationKey: j.string().describe("Stable idempotency key for the booking confirmation."),
		eventPageId: j.string().describe("The Pending Payment V1 Event page ID."),
	}),
	execute: async (input, { notion }): Promise<any> => {
		const rawEvent = await notion.pages.retrieve({ page_id: input.eventPageId })
		if (!("properties" in rawEvent)) {
			throw new Error("The supplied page is not a full Notion Event page.")
		}
		const event = rawEvent as unknown as NotionPage
		const eventStatus = textValue(property(event, "Status"))
		const route = textValue(property(event, "Financial Route"))
		const capacity = numberValue(property(event, "Capacity"))
		const eventSaleIds = relationIds(property(event, "Sales"))
		const blockers: string[] = []
		const paidStudentIds = new Set<string>()

		if (route !== "Payment V1") blockers.push("Event is not routed to Payment V1.")
		if (eventStatus !== "Pending" && eventStatus !== "Confirmed") {
			blockers.push("Event must be Pending or already Confirmed.")
		}
		if (capacity === null || capacity < 1 || !Number.isInteger(capacity)) {
			blockers.push("Event must have a positive whole-number Capacity.")
		}
		if (booleanValue(property(event, "Payment Processing Exception"))) {
			blockers.push("Payment Processing Exception is checked.")
		}

		for (const saleId of eventSaleIds) {
			const rawSale = await notion.pages.retrieve({ page_id: saleId })
			if (!("properties" in rawSale)) continue
			const sale = rawSale as unknown as NotionPage
			const isEligibleRevenue =
				textValue(property(sale, "Financial Route")) === "Payment V1" &&
				textValue(property(sale, "Sale Role")) === "Revenue" &&
				textValue(property(sale, "Sale Status")) === "Confirmed" &&
				textValue(property(sale, "Payment Processing Status")) === "Processed" &&
				dateValue(property(sale, "Payment Verified At")) !== null &&
				peopleIds(property(sale, "Payment Verified By")).length === 1
			if (!isEligibleRevenue) continue
			if (relationIds(property(sale, "Balance Sheet")).length !== 1) {
				blockers.push(`Eligible Revenue Sale ${saleId} must have exactly one Balance Sheet row.`)
				continue
			}
			for (const studentId of relationIds(property(sale, "Students"))) {
				paidStudentIds.add(studentId)
			}
		}

		const paidAttendeeCount = paidStudentIds.size
		if (capacity !== null && paidAttendeeCount !== capacity) {
			blockers.push(
				`Paid attendee count (${paidAttendeeCount}) must exactly equal Event Capacity (${capacity}).`
			)
		}
		if (blockers.length > 0) {
			return {
				mode: "blocked-no-write",
				operationKey: input.operationKey,
				eventPageId: input.eventPageId,
				paidAttendeeCount,
				capacity,
				blockers,
				changed: [],
				neverCreated: ["Sales", "Balance Sheet", "Hourly Rate"],
			}
		}
		const compensationOperationKey = `${input.operationKey}:compensation`
		const compensationSucceeded = (mode: string) =>
			mode === "written" || mode === "idempotent-already-written"
		const writeCompensation = async (revertPendingOnFailure: boolean) => {
			try {
				const compensation = await writePaymentV1Compensation(notion, {
					eventPageId: input.eventPageId,
					operationKey: compensationOperationKey,
				})
				if (compensationSucceeded(compensation.mode)) return { compensation, blockers: [] as string[] }
				if (revertPendingOnFailure) {
					await notion.pages.update({
						page_id: input.eventPageId,
						properties: { Status: { status: { name: "Pending" } } },
					})
				}
				return {
					compensation,
					blockers: [
						...(compensation.blockers ?? ["Compensation writer did not complete."]),
						...(revertPendingOnFailure ? ["Event confirmation was reverted to Pending."] : []),
					],
				}
			} catch (error) {
				if (revertPendingOnFailure) {
					await notion.pages.update({
						page_id: input.eventPageId,
						properties: { Status: { status: { name: "Pending" } } },
					})
				}
				return {
					compensation: null,
					blockers: [
						`Compensation writer error: ${error instanceof Error ? error.message : String(error)}`,
						...(revertPendingOnFailure ? ["Event confirmation was reverted to Pending."] : []),
					],
				}
			}
		}
		if (eventStatus === "Confirmed") {
			const result = await writeCompensation(false)
			return {
				mode: compensationSucceeded(result.compensation?.mode ?? "")
					? "idempotent-already-confirmed"
					: "blocked-no-write",
				operationKey: input.operationKey,
				eventPageId: input.eventPageId,
				paidAttendeeCount,
				capacity,
				blockers: result.blockers,
				changed: [],
				compensation: result.compensation,
				neverCreated: ["Sales", "Balance Sheet", "Hourly Rate"],
			}
		}
		await notion.pages.update({
			page_id: input.eventPageId,
			properties: { Status: { status: { name: "Confirmed" } } },
		})
		const result = await writeCompensation(true)
		if (!compensationSucceeded(result.compensation?.mode ?? "")) {
			return {
				mode: "blocked-no-write",
				operationKey: input.operationKey,
				eventPageId: input.eventPageId,
				paidAttendeeCount,
				capacity,
				blockers: result.blockers,
				changed: [],
				compensation: result.compensation,
				neverCreated: ["Sales", "Balance Sheet", "Hourly Rate"],
			}
		}
		return {
			mode: "confirmed-at-paid-capacity",
			operationKey: input.operationKey,
			eventPageId: input.eventPageId,
			paidAttendeeCount,
			capacity,
			blockers: [],
			changed: ["Event Status: Pending → Confirmed", ...result.compensation.changed],
			compensation: result.compensation,
			neverCreated: ["Sales", "Balance Sheet", "Hourly Rate"],
		}
	},
})

worker.tool("previewPaymentV1Event", {
	title: "Preview Payment V1 Event",
	description:
		"Read-only readiness check for one Event before Payment V1 processing. Reads the live Event only, identifies blockers and proposes no record writes.",
	hints: { readOnlyHint: true },
	schema: j.object({
		eventPageId: j.string().describe("The Notion page ID of the Event to assess."),
		operationKey: j.string().describe("Stable idempotency key reserved for the proposed payment operation."),
	}),
	execute: async (input, { notion }) => {
		const rawPage = await notion.pages.retrieve({ page_id: input.eventPageId })
		if (!("properties" in rawPage)) {
			throw new Error("The supplied page is not a full Notion Event page.")
		}
		const event = rawPage as unknown as NotionPage
		const eventTitle = textValue(property(event, "Event"))
		const eventStatus = textValue(property(event, "Status"))
		const financialRoute = textValue(property(event, "Financial Route"))
		const product = textValue(property(event, "Event Type"))
		const exception = booleanValue(property(event, "Payment Processing Exception"))
		const publishedPrice = numberValue(property(event, "Published Price per Student (IDR)"))
		const publishedPriceLists = relationIds(property(event, "Published Price List"))
		const saleIds = relationIds(property(event, "Sales"))
		const studentIds = relationIds(property(event, "Students"))
		const scheduled = property(event, "Scheduled")?.date as
			| { start?: string | null; end?: string | null }
			| null
			| undefined
		const isJoinable =
			product === "Clinic" ||
			product === "Coaches Academy" ||
			product === "Play with Coach"
		const blockers: string[] = []

		if (!eventTitle) blockers.push("Event title is missing.")
		if (!product) blockers.push("Event Type is unresolved.")
		if (financialRoute !== "Payment V1") blockers.push("Financial Route is not Payment V1.")
		if (eventStatus !== "Pending" && eventStatus !== "Confirmed") {
			blockers.push("Event must be Pending or Confirmed.")
		}
		if (eventStatus === "Cancelled") blockers.push("Cancelled Events cannot be processed.")
		if (exception) blockers.push("Payment Processing Exception is checked.")
		if (product === "Player Academy") blockers.push("Player Academy is fail-closed for Payment V1.")
		if (isJoinable && publishedPriceLists.length !== 1) {
			blockers.push("Joinable Events require exactly one published Price List.")
		}
		if (isJoinable && (publishedPrice === null || publishedPrice < 0)) {
			blockers.push("Joinable Events require a non-negative published price per student.")
		}
		if (!scheduled?.start) blockers.push("Scheduled date/time is missing.")

		return {
			mode: "read-only",
			operationKey: input.operationKey,
			event: {
				id: input.eventPageId,
				title: eventTitle,
				product,
				status: eventStatus,
				financialRoute,
				paymentProcessingException: exception,
				scheduled: scheduled?.start ?? null,
				publishedPricePerStudentIdr: publishedPrice,
				publishedPriceListIds: publishedPriceLists,
				linkedSales: saleIds.length,
				linkedStudents: studentIds.length,
			},
			readyForPaymentManagementPreview: blockers.length === 0,
			blockers,
			proposedActions: [
				"No Event, Sales, Hourly Rate or Balance Sheet record was created or changed.",
				"Payment verification and pricing resolution remain unavailable until the controlled apply tool and V1 control-plane gates pass.",
			],
		}
	},
})

// Sybil is deliberately separate from Polly. These capabilities are not called by
// either payment webhook and never change an Event's Status.
type SybilAttendanceSnapshot = {
	eventPageId: string
	salePageId: string
	balanceSheetPageId: string
	eventStatus: string
	product: string
	eventStudents: string[]
	saleStudents: string[]
	ledgerPeople: string[]
	eventTitle: string
	saleTitle: string
	ledgerTitle: string
	walletLinks: string[]
	capacity: number | null
	fingerprint: string
}

const normalizedIds = (ids: string[]) => [...new Set(ids.map((id) => id.replace(/-/g, "").toLowerCase()))].sort()
const sameIdSet = (left: string[], right: string[]) => JSON.stringify(normalizedIds(left)) === JSON.stringify(normalizedIds(right))
const sybilFingerprint = (value: Omit<SybilAttendanceSnapshot, "fingerprint">) => {
	const canonical = {
		...value,
		eventStudents: normalizedIds(value.eventStudents),
		saleStudents: normalizedIds(value.saleStudents),
		ledgerPeople: normalizedIds(value.ledgerPeople),
		walletLinks: normalizedIds(value.walletLinks),
		capacity: value.capacity,
	}
	return crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex")
}

type SybilAuditBlock = {
	type?: string
	[key: string]: unknown
}

const sybilEventAuditText = async (notion: Client, eventPageId: string): Promise<string> => {
	const blocks = await notion.blocks.children.list({ block_id: eventPageId, page_size: 100 })
	return blocks.results
		.map((block: any) => {
			const typed = block?.[block?.type]
			return Array.isArray(typed?.rich_text)
				? typed.rich_text.map((item: { plain_text?: string }) => item.plain_text ?? "").join("")
				: ""
		})
		.join("\n")
}

const appendSybilAudit = async (
	notion: Client,
	eventPageId: string,
	text: string
): Promise<void> => {
	const children = notion.blocks.children as unknown as {
		append: (input: { block_id: string; children: SybilAuditBlock[] }) => Promise<unknown>
	}
	await children.append({
		block_id: eventPageId,
		children: [{
			object: "block",
			type: "paragraph",
			paragraph: { rich_text: [{ type: "text", text: { content: text } }] },
		}],
	})
}

const sybilOpenLocks = (audit: string): string[] => {
	const locks = [...audit.matchAll(/\[Sybil:([^\]]+)\] locked/g)].map((match) => match[1])
	return locks.filter((key) =>
		!audit.includes(`[Sybil:${key}] applied`) && !audit.includes(`[Sybil:${key}] rolled back`)
	)
}

const sybilAppliedOperation = (audit: string, operationKey: string): { requestFingerprint: string; afterFingerprint: string } | null => {
	const line = audit.split("\n").find((item) => item.includes(`[Sybil:${operationKey}] applied;`))
	if (!line) return null
	const match = line.match(/request fingerprint: ([a-f0-9]{64}); after fingerprint: ([a-f0-9]{64})/)
	return match ? { requestFingerprint: match[1], afterFingerprint: match[2] } : null
}

const sybilAssertExclusiveLock = async (notion: Client, eventPageId: string, operationKey: string) => {
	const locks = sybilOpenLocks(await sybilEventAuditText(notion, eventPageId))
	if (locks.length !== 1 || locks[0] !== operationKey) {
		throw new Error("Sybil correction lock is not exclusive; no further write is allowed.")
	}
}

const sybilValidateProposedPeople = async (notion: Client, ids: string[]): Promise<string[]> => {
	const blockers: string[] = []
	if (ids.length < 1 || ids.length > 4) blockers.push("Private Lesson corrections require one to four attendees.")
	if (normalizedIds(ids).length !== ids.length) blockers.push("Proposed attendees contain duplicates.")
	for (const id of ids) {
		const raw = await notion.pages.retrieve({ page_id: id })
		if (!("properties" in raw)) blockers.push(`Proposed attendee ${id} is not a readable People page.`)
	}
	return blockers
}

const sybilReadAttendanceSnapshot = async (
	notion: Client,
	input: { eventPageId: string; salePageId: string; balanceSheetPageId: string },
	options: { allowSingleWallet?: boolean } = {}
): Promise<{ snapshot: SybilAttendanceSnapshot | null; blockers: string[] }> => {
	const blockers: string[] = []
	const [rawEvent, rawSale, rawLedger] = await Promise.all([
		notion.pages.retrieve({ page_id: input.eventPageId }),
		notion.pages.retrieve({ page_id: input.salePageId }),
		notion.pages.retrieve({ page_id: input.balanceSheetPageId }),
	])
	if (!("properties" in rawEvent) || !("properties" in rawSale) || !("properties" in rawLedger)) {
		return { snapshot: null, blockers: ["Event, Sale and Balance Sheet must all be full readable pages."] }
	}
	const event = rawEvent as unknown as NotionPage
	const sale = rawSale as unknown as NotionPage
	const ledger = rawLedger as unknown as NotionPage
	const eventStatus = textValue(property(event, "Status"))
	const product = textValue(property(event, "Event Type"))
	const eventStudents = relationIds(property(event, "Students"))
	const saleStudents = relationIds(property(sale, "Students"))
	const ledgerPeople = relationIds(property(ledger, "People"))
	const eventSaleIds = relationIds(property(event, "Sales"))
	const saleEventIds = relationIds(property(sale, "Events"))
	const saleLedgerIds = relationIds(property(sale, "Balance Sheet"))
	const ledgerSaleIds = relationIds(property(ledger, "Sales"))
	const walletLinks = [...relationIds(property(sale, "Group")), ...relationIds(property(sale, "Wallet 2"))]
	const capacity = numberValue(property(event, "Capacity"))
	if (eventStatus !== "Confirmed") blockers.push("Event must remain Confirmed for a Sybil correction.")
	if (product !== "Private Lesson") blockers.push("Build 1 is limited to Private Lesson attendance corrections.")
	if (textValue(property(sale, "Sale Status")) !== "Confirmed") blockers.push("Sale must be Confirmed.")
	if (!eventSaleIds.includes(input.salePageId) || !saleEventIds.includes(input.eventPageId)) blockers.push("Event and Sale are not mutually linked.")
	if (saleLedgerIds.length !== 1 || saleLedgerIds[0] !== input.balanceSheetPageId || !ledgerSaleIds.includes(input.salePageId)) blockers.push("Sale and Balance Sheet must be uniquely and mutually linked.")
	if (!sameIdSet(eventStudents, saleStudents)) blockers.push("Event and Sale attendee sets already differ; manual reconciliation is required.")
	if (!sameIdSet(saleStudents, ledgerPeople)) blockers.push("Sale and Balance Sheet people sets already differ; manual reconciliation is required.")
	// Build 1 refuses wallet rows. The separate wallet tool below permits exactly one
	// named Wallet 1 only after its own draw and remaining-credit checks.
	if (walletLinks.length > 0 && !options.allowSingleWallet) blockers.push("Wallet-linked Sale: Build 1 cannot infer or change wallet allocation.")
	const base = {
		eventPageId: input.eventPageId,
		salePageId: input.salePageId,
		balanceSheetPageId: input.balanceSheetPageId,
		eventStatus,
		product,
		eventStudents,
		saleStudents,
		ledgerPeople,
		eventTitle: textValue(property(event, "Event")),
		saleTitle: textValue(property(sale, "Sale")),
		ledgerTitle: textValue(property(ledger, "Item")),
		walletLinks,
		capacity,
	}
	return { snapshot: { ...base, fingerprint: sybilFingerprint(base) }, blockers }
}

worker.tool("previewSybilAttendanceCorrection", {
	title: "Preview Sybil attendance correction",
	description: "Read-only proof gate for one confirmed, non-wallet Private Lesson. It never writes records or invokes Polly.",
	hints: { readOnlyHint: true },
	schema: j.object({
		eventPageId: j.string(),
		salePageId: j.string(),
		balanceSheetPageId: j.string(),
		proposedStudentPageIds: j.array(j.string()),
		proposedCapacity: j.integer(),
		proposedEventTitle: j.string(),
		proposedSaleTitle: j.string(),
		proposedBalanceSheetTitle: j.string(),
		reason: j.string(),
	}),
	execute: async (input, { notion }) => {
		const checked = await sybilReadAttendanceSnapshot(notion, input)
		const proposed = normalizedIds(input.proposedStudentPageIds)
		const blockers = [...checked.blockers, ...(await sybilValidateProposedPeople(notion, input.proposedStudentPageIds))]
		if (!input.reason.trim()) blockers.push("A correction reason is required.")
		if (input.proposedCapacity !== proposed.length) blockers.push("Proposed Private Lesson capacity must equal the attendee count.")
		if (!input.proposedEventTitle.trim() || !input.proposedSaleTitle.trim() || !input.proposedBalanceSheetTitle.trim()) blockers.push("Exact replacement titles are required.")
		if (checked.snapshot && sameIdSet(checked.snapshot.eventStudents, proposed)) blockers.push("Proposed attendee set does not change the record.")
		return jsonOutput({
			mode: blockers.length ? "blocked-no-write" : "ready-for-approval",
			blockers,
			before: checked.snapshot,
			proposal: {
				studentPageIds: proposed,
				capacity: input.proposedCapacity,
				eventTitle: input.proposedEventTitle,
				saleTitle: input.proposedSaleTitle,
				balanceSheetTitle: input.proposedBalanceSheetTitle,
				reason: input.reason,
			},
			writes: [],
		})
	},
})

worker.tool("applySybilAttendanceCorrection", {
	title: "Apply Sybil attendance correction",
	description: "Explicitly authorised correction of the same existing Event, Sale and Balance Sheet records. Never invokes Polly and never creates financial records.",
	schema: j.object({
		operationKey: j.string(),
		authorisedBy: j.string(),
		reason: j.string(),
		expectedFingerprint: j.string(),
		eventPageId: j.string(),
		salePageId: j.string(),
		balanceSheetPageId: j.string(),
		proposedStudentPageIds: j.array(j.string()),
		proposedCapacity: j.integer(),
		proposedEventTitle: j.string(),
		proposedSaleTitle: j.string(),
		proposedBalanceSheetTitle: j.string(),
	}),
	execute: async (input, { notion }) => {
		const checked = await sybilReadAttendanceSnapshot(notion, input)
		const proposed = normalizedIds(input.proposedStudentPageIds)
		const blockers = [...checked.blockers, ...(await sybilValidateProposedPeople(notion, input.proposedStudentPageIds))]
		if (!input.operationKey.trim() || !input.authorisedBy.trim() || !input.reason.trim()) blockers.push("Operation key, authoriser and reason are required.")
		if (input.proposedCapacity !== proposed.length) blockers.push("Proposed Private Lesson capacity must equal the attendee count.")
		if (!input.proposedEventTitle.trim() || !input.proposedSaleTitle.trim() || !input.proposedBalanceSheetTitle.trim()) blockers.push("Exact replacement titles are required.")
		if (!checked.snapshot || checked.snapshot.fingerprint !== input.expectedFingerprint) blockers.push("Record changed since preview; run a new Sybil preview.")
		if (checked.snapshot && sameIdSet(checked.snapshot.eventStudents, proposed)) blockers.push("Proposed attendee set does not change the record.")
		if (blockers.length) return jsonOutput({ mode: "blocked-no-write", blockers, changed: [] })
		const existingAudit = await sybilEventAuditText(notion, input.eventPageId)
		if (existingAudit.includes(`[Sybil:${input.operationKey}] applied`)) {
			return jsonOutput({ mode: "idempotent-existing-operation", operationKey: input.operationKey, changed: [] })
		}
		if (sybilOpenLocks(existingAudit).length > 0) {
			return jsonOutput({ mode: "blocked-no-write", blockers: ["Another Sybil correction is locked on this Event."], changed: [] })
		}
		const relations = proposed.map((id) => ({ id }))
		const before = checked.snapshot!
		// Page-content lock is deliberately used instead of a database property. A stale
		// lock fails closed and requires review; Polly never reads this content.
		await appendSybilAudit(notion, input.eventPageId, `[Sybil:${input.operationKey}] locked; authorised by ${input.authorisedBy}; reason: ${input.reason}; before fingerprint: ${before.fingerprint}; proposed attendees: ${proposed.join(",")}; proposed capacity: ${input.proposedCapacity}.`)
		await sybilAssertExclusiveLock(notion, input.eventPageId, input.operationKey)
		try {
			await notion.pages.update({ page_id: input.eventPageId, properties: { Students: { relation: relations }, Capacity: { number: input.proposedCapacity }, Event: { title: [{ text: { content: input.proposedEventTitle } }] } } as never })
			await sybilAssertExclusiveLock(notion, input.eventPageId, input.operationKey)
			await notion.pages.update({ page_id: input.salePageId, properties: { Students: { relation: relations }, Sale: { title: [{ text: { content: input.proposedSaleTitle } }] } } as never })
			await sybilAssertExclusiveLock(notion, input.eventPageId, input.operationKey)
			await notion.pages.update({ page_id: input.balanceSheetPageId, properties: { People: { relation: relations }, Item: { title: [{ text: { content: input.proposedBalanceSheetTitle } }] } } as never })
		} catch (error) {
			// Restore only fields Sybil is allowed to touch; unresolved locks remain visible and fail closed.
			await Promise.allSettled([
				notion.pages.update({ page_id: input.eventPageId, properties: { Students: { relation: before.eventStudents.map((id) => ({ id })) }, Capacity: { number: before.capacity }, Event: { title: [{ text: { content: before.eventTitle } }] } } as never }),
				notion.pages.update({ page_id: input.salePageId, properties: { Students: { relation: before.saleStudents.map((id) => ({ id })) }, Sale: { title: [{ text: { content: before.saleTitle } }] } } as never }),
				notion.pages.update({ page_id: input.balanceSheetPageId, properties: { People: { relation: before.ledgerPeople.map((id) => ({ id })) }, Item: { title: [{ text: { content: before.ledgerTitle } }] } } as never }),
			])
			await appendSybilAudit(notion, input.eventPageId, `[Sybil:${input.operationKey}] rolled back; post-lock write failed and only Sybil-owned fields were restored.`).catch(() => undefined)
			throw error
		}
		const after = await sybilReadAttendanceSnapshot(notion, input)
		if (!after.snapshot || !sameIdSet(after.snapshot.eventStudents, proposed) || !sameIdSet(after.snapshot.saleStudents, proposed) || !sameIdSet(after.snapshot.ledgerPeople, proposed)) {
			throw new Error("Sybil post-write readback failed; manual reconciliation is required.")
		}
		await appendSybilAudit(notion, input.eventPageId, `[Sybil:${input.operationKey}] applied; authoriser: ${input.authorisedBy}; attendees: ${before.eventStudents.join(",")} -> ${proposed.join(",")}; capacity: ${before.capacity} -> ${input.proposedCapacity}; Event/Sale/Balance Sheet existing records re-read successfully.`)
		return jsonOutput({
			mode: "applied-existing-records-only",
			operationKey: input.operationKey,
			authorisedBy: input.authorisedBy,
			before,
			after,
			changed: ["Existing Event Students, Capacity and title", "Existing Sale Students and title", "Existing Balance Sheet People and title"],
			neverCreated: ["Event", "Sale", "Balance Sheet", "Hourly Rate", "Wallet"],
		})
	},
})

// Wallet corrections are deliberately separate from the ordinary Sybil route.
// This narrow capability supports one existing Wallet 1 only; it never creates
// a Sale, ledger, wallet, or invokes either Polly webhook.
const multiSelectNames = (value: NotionProperty | undefined): string[] =>
	value?.type === "multi_select"
		? ((value.multi_select as Array<{ name?: string }> | undefined) ?? []).map((item) => item.name ?? "")
		: []

type SybilWalletSnapshot = SybilAttendanceSnapshot & {
	walletPageId: string
	walletRemaining: number
	walletDraw: number
	walletAggregateDraw: number
	walletFundingCheck: string
	hours: number
	headCoachOneToTwoRate: number
	fingerprint: string
}

const sybilWalletFingerprint = (value: Omit<SybilWalletSnapshot, "fingerprint">) =>
	crypto.createHash("sha256").update(JSON.stringify({
		...value,
		eventStudents: normalizedIds(value.eventStudents),
		saleStudents: normalizedIds(value.saleStudents),
		ledgerPeople: normalizedIds(value.ledgerPeople),
		walletLinks: normalizedIds(value.walletLinks),
	})).digest("hex")

const sybilReadWalletAttendanceSnapshot = async (
	notion: Client,
	input: { eventPageId: string; salePageId: string; balanceSheetPageId: string; walletPageId: string }
): Promise<{ snapshot: SybilWalletSnapshot | null; blockers: string[] }> => {
	const checked = await sybilReadAttendanceSnapshot(notion, input, { allowSingleWallet: true })
	const blockers = [...checked.blockers]
	if (!checked.snapshot) return { snapshot: null, blockers }
	const [rawSale, rawWallet] = await Promise.all([
		notion.pages.retrieve({ page_id: input.salePageId }),
		notion.pages.retrieve({ page_id: input.walletPageId }),
	])
	if (!("properties" in rawSale) || !("properties" in rawWallet)) {
		return { snapshot: null, blockers: [...blockers, "Sale and wallet must both be readable pages."] }
	}
	const sale = rawSale as unknown as NotionPage
	const wallet = rawWallet as unknown as NotionPage
	const walletLinks = relationIds(property(sale, "Group"))
	const wallet2Links = relationIds(property(sale, "Wallet 2"))
	const walletDraw = numberValue(property(sale, "Wallet 1 Draw (IDR)"))
	const walletAggregateDraw = numberValue(property(sale, "Wallet Credit Draw (IDR)"))
	const walletRemaining = numberValue(property(wallet, "Wallet Credit Remaining (IDR)"))
	const hours = Number(textValue(property(sale, "Total Hours")))
	const headCoachOneToTwoRate = numberValue(property(sale, "Head Coach 1:2 (IDR PP)"))
	const walletFundingCheck = textValue(property(sale, "Wallet Funding Check"))
	if (walletLinks.length !== 1 || walletLinks[0] !== input.walletPageId) blockers.push("Sale must use exactly the named Wallet 1.")
	if (wallet2Links.length !== 0) blockers.push("Wallet 2 is out of scope for this correction.")
	if (textValue(property(wallet, "Sale Role")) !== "Wallet") blockers.push("Named Wallet 1 is not a wallet parent.")
	if (textValue(property(sale, "Financial Route")) !== "") blockers.push("Wallet correction Build 1 is limited to legacy wallet Sales.")
	if (!multiSelectNames(property(sale, "Discount Reason")).includes("Wallet: Paid")) blockers.push("Sale must retain Wallet: Paid.")
	if (walletDraw === null || walletDraw <= 0) blockers.push("Wallet 1 Draw must be a positive stored amount.")
	if (walletAggregateDraw === null || Math.round(walletAggregateDraw) !== Math.round(walletDraw ?? 0)) blockers.push("Stored Wallet 1 Draw and computed aggregate wallet draw must agree.")
	if (walletRemaining === null || walletRemaining < 0) blockers.push("Wallet remaining credit is invalid.")
	if (!Number.isFinite(hours) || hours <= 0) blockers.push("Sale must have a positive confirmed duration.")
	if (headCoachOneToTwoRate === null || headCoachOneToTwoRate <= 0) blockers.push("Head Coach 1:2 price is unavailable.")
	if (walletFundingCheck !== "✅ OK") blockers.push("Wallet Funding Check must be ✅ OK before correction.")
	const base = {
		...checked.snapshot,
		walletPageId: input.walletPageId,
		walletRemaining: walletRemaining ?? 0,
		walletDraw: walletDraw ?? 0,
		walletAggregateDraw: walletAggregateDraw ?? 0,
		walletFundingCheck,
		hours,
		headCoachOneToTwoRate: headCoachOneToTwoRate ?? 0,
	}
	return { snapshot: { ...base, fingerprint: sybilWalletFingerprint(base) }, blockers }
}

const sybilWalletRequestFingerprint = (input: Record<string, unknown>) =>
	crypto.createHash("sha256").update(JSON.stringify({
		...input,
		proposedStudentPageIds: normalizedIds(input.proposedStudentPageIds as string[]),
	})).digest("hex")

worker.tool("previewSybilWalletAttendanceCorrection", {
	title: "Preview Sybil wallet attendance correction",
	description: "Read-only gate for one legacy Wallet 1-funded Private Lesson. It never writes records or invokes Polly.",
	hints: { readOnlyHint: true },
	schema: j.object({
		eventPageId: j.string(), salePageId: j.string(), balanceSheetPageId: j.string(), walletPageId: j.string(),
		proposedStudentPageIds: j.array(j.string()), proposedCapacity: j.integer(), proposedWalletDrawIdr: j.number(),
		proposedEventTitle: j.string(), proposedSaleTitle: j.string(), proposedBalanceSheetTitle: j.string(), reason: j.string(),
	}),
	execute: async (input, { notion }) => {
		const checked = await sybilReadWalletAttendanceSnapshot(notion, input)
		const proposed = normalizedIds(input.proposedStudentPageIds)
		const blockers = [...checked.blockers, ...(await sybilValidateProposedPeople(notion, input.proposedStudentPageIds))]
		const expectedDraw = checked.snapshot ? Math.round(checked.snapshot.headCoachOneToTwoRate * input.proposedCapacity * checked.snapshot.hours) : 0
		if (!input.reason.trim()) blockers.push("A correction reason is required.")
		if (input.proposedCapacity !== proposed.length || input.proposedCapacity !== 2) blockers.push("Wallet Build 1 supports exactly two attendees and capacity two.")
		if (Math.round(input.proposedWalletDrawIdr) !== expectedDraw) blockers.push(`Proposed wallet draw must equal the verified 1:2 price of ${expectedDraw}.`)
		if (checked.snapshot && input.proposedWalletDrawIdr - checked.snapshot.walletDraw > checked.snapshot.walletRemaining) blockers.push("Wallet has insufficient remaining credit for the additional draw.")
		if (!input.proposedEventTitle.trim() || !input.proposedSaleTitle.trim() || !input.proposedBalanceSheetTitle.trim()) blockers.push("Exact replacement titles are required.")
		if (checked.snapshot && sameIdSet(checked.snapshot.eventStudents, proposed)) blockers.push("Proposed attendee set does not change the record.")
		return jsonOutput({
			mode: blockers.length ? "blocked-no-write" : "ready-for-approval",
			blockers, before: checked.snapshot,
			proposal: { studentPageIds: proposed, capacity: input.proposedCapacity, walletDrawIdr: input.proposedWalletDrawIdr, additionalWalletDrawIdr: checked.snapshot ? input.proposedWalletDrawIdr - checked.snapshot.walletDraw : null, eventTitle: input.proposedEventTitle, saleTitle: input.proposedSaleTitle, balanceSheetTitle: input.proposedBalanceSheetTitle, reason: input.reason },
			writes: [],
		})
	},
})

worker.tool("applySybilWalletAttendanceCorrection", {
	title: "Apply Sybil wallet attendance correction",
	description: "Explicitly authorised in-place correction of one legacy Wallet 1-funded Private Lesson. Never invokes Polly or creates records.",
	schema: j.object({
		operationKey: j.string(), authorisedBy: j.string(), reason: j.string(), expectedFingerprint: j.string(),
		eventPageId: j.string(), salePageId: j.string(), balanceSheetPageId: j.string(), walletPageId: j.string(),
		proposedStudentPageIds: j.array(j.string()), proposedCapacity: j.integer(), proposedWalletDrawIdr: j.number(),
		proposedEventTitle: j.string(), proposedSaleTitle: j.string(), proposedBalanceSheetTitle: j.string(),
	}),
	execute: async (input, { notion }) => {
		const checked = await sybilReadWalletAttendanceSnapshot(notion, input)
		const existingAudit = await sybilEventAuditText(notion, input.eventPageId)
		const requestFingerprint = sybilWalletRequestFingerprint(input)
		const existingApplied = sybilAppliedOperation(existingAudit, input.operationKey)
		if (existingApplied) {
			if (existingApplied.requestFingerprint !== requestFingerprint) return jsonOutput({ mode: "blocked-no-write", blockers: ["Operation key was already applied with a different correction request."], changed: [] })
			if (!checked.snapshot || checked.snapshot.fingerprint !== existingApplied.afterFingerprint) return jsonOutput({ mode: "blocked-no-write", blockers: ["Completed correction changed after it was applied; manual reconciliation is required."], changed: [] })
			return jsonOutput({ mode: "idempotent-existing-operation", operationKey: input.operationKey, changed: [] })
		}
		const proposed = normalizedIds(input.proposedStudentPageIds)
		const blockers = [...checked.blockers, ...(await sybilValidateProposedPeople(notion, input.proposedStudentPageIds))]
		const expectedDraw = checked.snapshot ? Math.round(checked.snapshot.headCoachOneToTwoRate * input.proposedCapacity * checked.snapshot.hours) : 0
		if (!input.operationKey.trim() || !input.authorisedBy.trim() || !input.reason.trim()) blockers.push("Operation key, authoriser and reason are required.")
		if (input.proposedCapacity !== proposed.length || input.proposedCapacity !== 2) blockers.push("Wallet Build 1 supports exactly two attendees and capacity two.")
		if (Math.round(input.proposedWalletDrawIdr) !== expectedDraw) blockers.push(`Proposed wallet draw must equal the verified 1:2 price of ${expectedDraw}.`)
		if (!checked.snapshot || checked.snapshot.fingerprint !== input.expectedFingerprint) blockers.push("Record changed since preview; run a new Sybil wallet preview.")
		if (checked.snapshot && input.proposedWalletDrawIdr - checked.snapshot.walletDraw > checked.snapshot.walletRemaining) blockers.push("Wallet has insufficient remaining credit for the additional draw.")
		if (checked.snapshot && sameIdSet(checked.snapshot.eventStudents, proposed)) blockers.push("Proposed attendee set does not change the record.")
		if (blockers.length) return jsonOutput({ mode: "blocked-no-write", blockers, changed: [] })
		if (sybilOpenLocks(existingAudit).length > 0) return jsonOutput({ mode: "blocked-no-write", blockers: ["Another Sybil correction is locked on this Event."], changed: [] })
		const before = checked.snapshot!
		const relations = proposed.map((id) => ({ id }))
		await appendSybilAudit(notion, input.eventPageId, `[Sybil:${input.operationKey}] locked; authorised by ${input.authorisedBy}; reason: ${input.reason}; before fingerprint: ${before.fingerprint}; wallet draw: ${before.walletDraw} -> ${input.proposedWalletDrawIdr}.`)
		await sybilAssertExclusiveLock(notion, input.eventPageId, input.operationKey)
		try {
			await notion.pages.update({ page_id: input.eventPageId, properties: { Students: { relation: relations }, Capacity: { number: input.proposedCapacity }, Event: { title: [{ text: { content: input.proposedEventTitle } }] } } as never })
			await sybilAssertExclusiveLock(notion, input.eventPageId, input.operationKey)
			await notion.pages.update({ page_id: input.salePageId, properties: { Students: { relation: relations }, "Wallet 1 Draw (IDR)": { number: input.proposedWalletDrawIdr }, "Discount Explanation": { rich_text: [{ text: { content: `Sybil correction: Wallet 1 draw repriced from ${before.walletDraw} to ${input.proposedWalletDrawIdr}; funded by the existing named Wallet 1.` } }] }, Sale: { title: [{ text: { content: input.proposedSaleTitle } }] } } as never })
			await sybilAssertExclusiveLock(notion, input.eventPageId, input.operationKey)
			await notion.pages.update({ page_id: input.balanceSheetPageId, properties: { People: { relation: relations }, Item: { title: [{ text: { content: input.proposedBalanceSheetTitle } }] } } as never })
		} catch (error) {
			await Promise.allSettled([
				notion.pages.update({ page_id: input.eventPageId, properties: { Students: { relation: before.eventStudents.map((id) => ({ id })) }, Capacity: { number: before.capacity }, Event: { title: [{ text: { content: before.eventTitle } }] } } as never }),
				notion.pages.update({ page_id: input.salePageId, properties: { Students: { relation: before.saleStudents.map((id) => ({ id })) }, "Wallet 1 Draw (IDR)": { number: before.walletDraw }, Sale: { title: [{ text: { content: before.saleTitle } }] } } as never }),
				notion.pages.update({ page_id: input.balanceSheetPageId, properties: { People: { relation: before.ledgerPeople.map((id) => ({ id })) }, Item: { title: [{ text: { content: before.ledgerTitle } }] } } as never }),
			])
			await appendSybilAudit(notion, input.eventPageId, `[Sybil:${input.operationKey}] rolled back; post-lock write failed and only Sybil-owned fields were restored.`).catch(() => undefined)
			throw error
		}
		const after = await sybilReadWalletAttendanceSnapshot(notion, input)
		if (!after.snapshot || !sameIdSet(after.snapshot.eventStudents, proposed) || !sameIdSet(after.snapshot.saleStudents, proposed) || !sameIdSet(after.snapshot.ledgerPeople, proposed) || after.snapshot.walletDraw !== input.proposedWalletDrawIdr || after.snapshot.walletAggregateDraw !== input.proposedWalletDrawIdr || after.snapshot.walletFundingCheck !== "✅ OK" || after.snapshot.walletRemaining !== before.walletRemaining - (input.proposedWalletDrawIdr - before.walletDraw)) {
			throw new Error("Sybil wallet post-write readback failed; manual reconciliation is required.")
		}
		await appendSybilAudit(notion, input.eventPageId, `[Sybil:${input.operationKey}] applied; request fingerprint: ${requestFingerprint}; after fingerprint: ${after.snapshot.fingerprint}; authoriser: ${input.authorisedBy}; attendees and existing Wallet 1 draw corrected in place: ${before.walletDraw} -> ${input.proposedWalletDrawIdr}.`)
		return jsonOutput({ mode: "applied-existing-records-only", operationKey: input.operationKey, before, after, changed: ["Existing Event Students, Capacity and title", "Existing Sale Students, Wallet 1 Draw, explanation and title", "Existing Balance Sheet People and title"], neverCreated: ["Event", "Sale", "Balance Sheet", "Wallet", "Hourly Rate"] })
	},
})


// Wallet 2 funding is intentionally a separate, narrow Sybil capability. It only
// adds the second named existing wallet to a legacy wallet-funded two-person lesson.
type SybilWallet2Snapshot = SybilAttendanceSnapshot & {
	wallet1PageId: string; wallet2PageId: string; wallet1Remaining: number; wallet2Remaining: number
	wallet1Draw: number; wallet2Draw: number; walletAggregateDraw: number; walletFundingCheck: string
	hours: number; headCoachOneToTwoRate: number; discountExplanation: string; fingerprint: string
}
const sybilWallet2Fingerprint = (value: Omit<SybilWallet2Snapshot, "fingerprint">) =>
	crypto.createHash("sha256").update(JSON.stringify({ ...value, eventStudents: normalizedIds(value.eventStudents), saleStudents: normalizedIds(value.saleStudents), ledgerPeople: normalizedIds(value.ledgerPeople), walletLinks: normalizedIds(value.walletLinks) })).digest("hex")

const sybilReadWallet2Snapshot = async (notion: Client, input: { eventPageId: string; salePageId: string; balanceSheetPageId: string; wallet1PageId: string; wallet2PageId: string }, options: { allowExistingWallet2?: boolean } = {}): Promise<{ snapshot: SybilWallet2Snapshot | null; blockers: string[] }> => {
	const baseCheck = await sybilReadAttendanceSnapshot(notion, input, { allowSingleWallet: true })
	// Legacy TP861 is known to have an empty ledger People relation. This is the only
	// generic mismatch this route permits; it is reconciled to the proposed people set.
	const blockers = baseCheck.blockers.filter((x) => x !== "Sale and Balance Sheet people sets already differ; manual reconciliation is required.")
	if (!baseCheck.snapshot) return { snapshot: null, blockers }
	const [rawSale, rawW1, rawW2] = await Promise.all([notion.pages.retrieve({ page_id: input.salePageId }), notion.pages.retrieve({ page_id: input.wallet1PageId }), notion.pages.retrieve({ page_id: input.wallet2PageId })])
	if (!("properties" in rawSale) || !("properties" in rawW1) || !("properties" in rawW2)) return { snapshot: null, blockers: [...blockers, "Sale and both wallets must be readable pages."] }
	const sale = rawSale as unknown as NotionPage; const w1 = rawW1 as unknown as NotionPage; const w2 = rawW2 as unknown as NotionPage
	const group = relationIds(property(sale, "Group")); const wallet2Links = relationIds(property(sale, "Wallet 2"))
	const wallet1Draw = numberValue(property(sale, "Wallet 1 Draw (IDR)")); const wallet2Draw = numberValue(property(sale, "Wallet 2 Draw (IDR)")) ?? 0
	const aggregate = numberValue(property(sale, "Wallet Credit Draw (IDR)")); const remaining1 = numberValue(property(w1, "Wallet Credit Remaining (IDR)")); const remaining2 = numberValue(property(w2, "Wallet Credit Remaining (IDR)"))
	const hours = Number(textValue(property(sale, "Total Hours"))); const rate = numberValue(property(sale, "Head Coach 1:2 (IDR PP)")); const funding = textValue(property(sale, "Wallet Funding Check"))
	if (group.length !== 1 || group[0] !== input.wallet1PageId) blockers.push("Sale must retain exactly the named existing Wallet 1.")
	if (!options.allowExistingWallet2 && wallet2Links.length !== 0) blockers.push("Sale must not already have Wallet 2 before this one-time correction.")
	if (options.allowExistingWallet2 && (wallet2Links.length !== 1 || wallet2Links[0] !== input.wallet2PageId)) blockers.push("Sale must retain exactly the named Wallet 2 after correction.")
	if (input.wallet1PageId === input.wallet2PageId) blockers.push("Wallet 2 must be a different existing wallet.")
	if (textValue(property(w1, "Sale Role")) !== "Wallet" || textValue(property(w2, "Sale Role")) !== "Wallet") blockers.push("Both named records must be wallet parents.")
	if (textValue(property(sale, "Financial Route")) !== "") blockers.push("Wallet 2 correction is limited to legacy wallet Sales.")
	if (!multiSelectNames(property(sale, "Discount Reason")).includes("Wallet: Paid")) blockers.push("Sale must retain Wallet: Paid.")
	if (wallet1Draw === null || wallet1Draw <= 0 || (!options.allowExistingWallet2 && wallet2Draw !== 0) || (options.allowExistingWallet2 && wallet2Draw <= 0)) blockers.push(options.allowExistingWallet2 ? "Existing Wallet 1 and Wallet 2 draws must both be positive after correction." : "Existing Wallet 1 draw must be positive and Wallet 2 draw must be zero.")
	if (aggregate === null || Math.round(aggregate) !== Math.round((wallet1Draw ?? 0) + wallet2Draw)) blockers.push("Stored wallet draws and computed aggregate must agree.")
	if (remaining1 === null || remaining1 < 0 || remaining2 === null || remaining2 < 0) blockers.push("Wallet remaining credit is invalid.")
	if (!Number.isFinite(hours) || hours <= 0 || rate === null || rate <= 0) blockers.push("Verified 1:2 pricing is unavailable.")
	if (funding !== "✅ OK") blockers.push("Wallet Funding Check must be ✅ OK before correction.")
	if (!(sameIdSet(baseCheck.snapshot.saleStudents, baseCheck.snapshot.ledgerPeople) || baseCheck.snapshot.ledgerPeople.length === 0)) blockers.push("Legacy ledger People must either match the Sale or be empty.")
	const value = { ...baseCheck.snapshot, wallet1PageId: input.wallet1PageId, wallet2PageId: input.wallet2PageId, wallet1Remaining: remaining1 ?? 0, wallet2Remaining: remaining2 ?? 0, wallet1Draw: wallet1Draw ?? 0, wallet2Draw, walletAggregateDraw: aggregate ?? 0, walletFundingCheck: funding, hours, headCoachOneToTwoRate: rate ?? 0, discountExplanation: textValue(property(sale, "Discount Explanation")) }
	return { snapshot: { ...value, fingerprint: sybilWallet2Fingerprint(value) }, blockers }
}
const sybilWallet2RequestFingerprint = sybilWalletRequestFingerprint

worker.tool("previewSybilWallet2AttendanceCorrection", {
	title: "Preview Sybil Wallet 2 attendance correction", description: "Read-only preflight for adding one existing second wallet to one legacy private lesson. Never writes or invokes Polly.", hints: { readOnlyHint: true },
	schema: j.object({ eventPageId: j.string(), salePageId: j.string(), balanceSheetPageId: j.string(), wallet1PageId: j.string(), wallet2PageId: j.string(), proposedStudentPageIds: j.array(j.string()), proposedCapacity: j.integer(), proposedWallet2DrawIdr: j.number(), proposedEventTitle: j.string(), proposedSaleTitle: j.string(), proposedBalanceSheetTitle: j.string(), reason: j.string() }),
	execute: async (input, { notion }) => {
		const checked = await sybilReadWallet2Snapshot(notion, input); const proposed = normalizedIds(input.proposedStudentPageIds); const blockers = [...checked.blockers, ...(await sybilValidateProposedPeople(notion, input.proposedStudentPageIds))]
		const expectedTotal = checked.snapshot ? Math.round(checked.snapshot.headCoachOneToTwoRate * input.proposedCapacity * checked.snapshot.hours) : 0; const extra = expectedTotal - (checked.snapshot?.wallet1Draw ?? 0)
		if (!input.reason.trim()) blockers.push("A correction reason is required."); if (input.proposedCapacity !== 2 || input.proposedCapacity !== proposed.length) blockers.push("Wallet 2 correction supports exactly two attendees and capacity two."); if (Math.round(input.proposedWallet2DrawIdr) !== extra || extra <= 0) blockers.push(`Wallet 2 draw must equal the verified additional amount of ${extra}.`); if (checked.snapshot && input.proposedWallet2DrawIdr > checked.snapshot.wallet2Remaining) blockers.push("Wallet 2 has insufficient remaining credit."); if (!input.proposedEventTitle.trim() || !input.proposedSaleTitle.trim() || !input.proposedBalanceSheetTitle.trim()) blockers.push("Exact replacement titles are required."); if (checked.snapshot && sameIdSet(checked.snapshot.eventStudents, proposed)) blockers.push("Proposed attendee set does not change the record.")
		return jsonOutput({ mode: blockers.length ? "blocked-no-write" : "ready-for-approval", blockers, before: checked.snapshot, proposal: { studentPageIds: proposed, capacity: input.proposedCapacity, wallet2DrawIdr: input.proposedWallet2DrawIdr, additionalWalletDrawIdr: extra, eventTitle: input.proposedEventTitle, saleTitle: input.proposedSaleTitle, balanceSheetTitle: input.proposedBalanceSheetTitle, reason: input.reason }, writes: [] })
	},
})

worker.tool("applySybilWallet2AttendanceCorrection", {
	title: "Apply Sybil Wallet 2 attendance correction", description: "Explicitly authorised in-place legacy correction. Adds one existing Wallet 2 only; never invokes Polly or creates records.",
	schema: j.object({ operationKey: j.string(), authorisedBy: j.string(), reason: j.string(), expectedFingerprint: j.string(), eventPageId: j.string(), salePageId: j.string(), balanceSheetPageId: j.string(), wallet1PageId: j.string(), wallet2PageId: j.string(), proposedStudentPageIds: j.array(j.string()), proposedCapacity: j.integer(), proposedWallet2DrawIdr: j.number(), proposedEventTitle: j.string(), proposedSaleTitle: j.string(), proposedBalanceSheetTitle: j.string() }),
	execute: async (input, { notion }) => {
		const checked = await sybilReadWallet2Snapshot(notion, input); const audit = await sybilEventAuditText(notion, input.eventPageId); const requestFingerprint = sybilWallet2RequestFingerprint(input); const applied = sybilAppliedOperation(audit, input.operationKey)
		if (applied) { if (applied.requestFingerprint !== requestFingerprint) return jsonOutput({ mode: "blocked-no-write", blockers: ["Operation key was already applied with a different correction request."], changed: [] }); if (!checked.snapshot || checked.snapshot.fingerprint !== applied.afterFingerprint) return jsonOutput({ mode: "blocked-no-write", blockers: ["Completed correction changed after it was applied; manual reconciliation is required."], changed: [] }); return jsonOutput({ mode: "idempotent-existing-operation", operationKey: input.operationKey, changed: [] }) }
		const proposed = normalizedIds(input.proposedStudentPageIds); const blockers = [...checked.blockers, ...(await sybilValidateProposedPeople(notion, input.proposedStudentPageIds))]; const expectedTotal = checked.snapshot ? Math.round(checked.snapshot.headCoachOneToTwoRate * input.proposedCapacity * checked.snapshot.hours) : 0; const extra = expectedTotal - (checked.snapshot?.wallet1Draw ?? 0)
		if (!input.operationKey.trim() || !input.authorisedBy.trim() || !input.reason.trim()) blockers.push("Operation key, authoriser and reason are required."); if (input.proposedCapacity !== 2 || input.proposedCapacity !== proposed.length) blockers.push("Wallet 2 correction supports exactly two attendees and capacity two."); if (Math.round(input.proposedWallet2DrawIdr) !== extra || extra <= 0) blockers.push(`Wallet 2 draw must equal the verified additional amount of ${extra}.`); if (!checked.snapshot || checked.snapshot.fingerprint !== input.expectedFingerprint) blockers.push("Record changed since preview; run a new Wallet 2 preview."); if (checked.snapshot && input.proposedWallet2DrawIdr > checked.snapshot.wallet2Remaining) blockers.push("Wallet 2 has insufficient remaining credit."); if (checked.snapshot && sameIdSet(checked.snapshot.eventStudents, proposed)) blockers.push("Proposed attendee set does not change the record."); if (blockers.length) return jsonOutput({ mode: "blocked-no-write", blockers, changed: [] }); if (sybilOpenLocks(audit).length) return jsonOutput({ mode: "blocked-no-write", blockers: ["Another Sybil correction is locked on this Event."], changed: [] })
		const before = checked.snapshot!; const relations = proposed.map((id) => ({ id })); await appendSybilAudit(notion, input.eventPageId, `[Sybil:${input.operationKey}] locked; authorised by ${input.authorisedBy}; reason: ${input.reason}; before fingerprint: ${before.fingerprint}; Wallet 2 draw: ${before.wallet2Draw} -> ${input.proposedWallet2DrawIdr}.`); await sybilAssertExclusiveLock(notion, input.eventPageId, input.operationKey)
		try { await notion.pages.update({ page_id: input.eventPageId, properties: { Students: { relation: relations }, Capacity: { number: input.proposedCapacity }, Event: { title: [{ text: { content: input.proposedEventTitle } }] } } as never }); await sybilAssertExclusiveLock(notion, input.eventPageId, input.operationKey); await notion.pages.update({ page_id: input.salePageId, properties: { Students: { relation: relations }, "Wallet 2": { relation: [{ id: input.wallet2PageId }] }, "Wallet 2 Draw (IDR)": { number: input.proposedWallet2DrawIdr }, "Discount Explanation": { rich_text: [{ text: { content: `Sybil correction: retained Wallet 1 draw ${before.wallet1Draw}; added Wallet 2 draw ${input.proposedWallet2DrawIdr}.` } }] }, Sale: { title: [{ text: { content: input.proposedSaleTitle } }] } } as never }); await sybilAssertExclusiveLock(notion, input.eventPageId, input.operationKey); await notion.pages.update({ page_id: input.balanceSheetPageId, properties: { People: { relation: relations }, Item: { title: [{ text: { content: input.proposedBalanceSheetTitle } }] } } as never }) } catch (error) { await Promise.allSettled([notion.pages.update({ page_id: input.eventPageId, properties: { Students: { relation: before.eventStudents.map((id) => ({ id })) }, Capacity: { number: before.capacity }, Event: { title: [{ text: { content: before.eventTitle } }] } } as never }), notion.pages.update({ page_id: input.salePageId, properties: { Students: { relation: before.saleStudents.map((id) => ({ id })) }, "Wallet 2": { relation: [] }, "Wallet 2 Draw (IDR)": { number: before.wallet2Draw }, "Discount Explanation": { rich_text: before.discountExplanation ? [{ text: { content: before.discountExplanation } }] : [] }, Sale: { title: [{ text: { content: before.saleTitle } }] } } as never }), notion.pages.update({ page_id: input.balanceSheetPageId, properties: { People: { relation: before.ledgerPeople.map((id) => ({ id })) }, Item: { title: [{ text: { content: before.ledgerTitle } }] } } as never })]); await appendSybilAudit(notion, input.eventPageId, `[Sybil:${input.operationKey}] rolled back; post-lock write failed and only Sybil-owned fields were restored.`).catch(() => undefined); throw error }
		const after = await sybilReadWallet2Snapshot(notion, input, { allowExistingWallet2: true }); if (!after.snapshot || !sameIdSet(after.snapshot.eventStudents, proposed) || !sameIdSet(after.snapshot.saleStudents, proposed) || !sameIdSet(after.snapshot.ledgerPeople, proposed) || after.snapshot.wallet2Draw !== input.proposedWallet2DrawIdr || after.snapshot.walletAggregateDraw !== before.wallet1Draw + input.proposedWallet2DrawIdr || after.snapshot.walletFundingCheck !== "✅ OK" || after.snapshot.wallet2Remaining !== before.wallet2Remaining - input.proposedWallet2DrawIdr) throw new Error("Sybil Wallet 2 post-write readback failed; manual reconciliation is required.")
		await appendSybilAudit(notion, input.eventPageId, `[Sybil:${input.operationKey}] applied; request fingerprint: ${requestFingerprint}; after fingerprint: ${after.snapshot.fingerprint}; authoriser: ${input.authorisedBy}; existing records corrected in place; Wallet 2 draw ${before.wallet2Draw} -> ${input.proposedWallet2DrawIdr}.`); return jsonOutput({ mode: "applied-existing-records-only", operationKey: input.operationKey, before, after, changed: ["Existing Event Students, Capacity and title", "Existing Sale Students, Wallet 2 relation/draw, explanation and title", "Existing Balance Sheet People and title"], neverCreated: ["Event", "Sale", "Balance Sheet", "Wallet", "Hourly Rate"] })
	},
})


worker.tool("previewSybilPaymentCorrection", {
 title: "Preview Sybil payment correction", description: "Read-only payment channel/recipient correction gate; never writes or invokes Polly.", hints: { readOnlyHint: true },
 schema: j.object({ eventPageId:j.string(), salePageId:j.string(), balanceSheetPageId:j.string(), paymentChannel:j.string(), paidTo:j.string(), paymentVerifiedAt:j.string(), paymentVerifiedById:j.string(), reason:j.string() }),
 execute: async (input,{notion}) => { const c=await sybilPaymentSnapshot(notion,input); const blockers=[...c.blockers]; if(!c.snapshot) return jsonOutput({mode:"blocked-no-write",blockers,writes:[]}); if(input.paymentChannel==="Bank transfer"&&input.paidTo==="Tacit"&&(!input.paymentVerifiedAt||!input.paymentVerifiedById)) blockers.push("Bank transfer to Tacit requires verification time and verifier."); if(!input.reason.trim()) blockers.push("Reason is required."); if(!sybilPaymentChannels.has(input.paymentChannel)) blockers.push("Payment Channel is not an allowed value."); if(!sybilPaidTo.has(input.paidTo)) blockers.push("Paid To is not an allowed value."); if(!input.paymentVerifiedById.trim()) blockers.push("Payment verifier is required."); return jsonOutput({mode:blockers.length?"blocked-no-write":"ready-for-approval",blockers,before:c.snapshot,proposal:{paymentChannel:input.paymentChannel,paidTo:input.paidTo,paymentVerifiedAt:input.paymentVerifiedAt,paymentVerifiedById:input.paymentVerifiedById,reason:input.reason},writes:[]}) }
})

const sybilPaymentChannels = new Set(["Ayo", "Bank transfer", "Club", "Courtside", "Reclub", "Wallet"]);
const sybilPaidTo = new Set(["Club", "Tacit"]);
type SybilPaymentSnapshot = SybilAttendanceSnapshot & { channel:string; paidTo:string; verifiedAt:string; verifierIds:string[]; note:string; fingerprint:string }
const sybilPaymentSnapshot=async(notion:Client,input:{eventPageId:string;salePageId:string;balanceSheetPageId:string})=>{const c=await sybilReadAttendanceSnapshot(notion,input);const blockers=[...c.blockers];if(!c.snapshot)return{snapshot:null,blockers};const raw=await notion.pages.retrieve({page_id:input.salePageId});if(!('properties'in raw))return{snapshot:null,blockers:[...blockers,'Sale unreadable.']};const sale=raw as unknown as NotionPage;if(textValue(property(sale,'Financial Route'))!=='Payment V1'||textValue(property(sale,'Sale Role'))!=='Revenue'||textValue(property(sale,'Sale Status'))!=='Confirmed')blockers.push('Requires confirmed Payment V1 Revenue Sale.');const v=dateValue(property(sale,'Payment Verified At'));const x={...c.snapshot,channel:textValue(property(sale,'Payment Channel')),paidTo:textValue(property(sale,'Paid To')),verifiedAt:v?.start??'',verifierIds:peopleIds(property(sale,'Payment Verified By')),note:textValue(property(sale,'Payment Verification Note'))};return{snapshot:{...x,fingerprint:crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex')},blockers}}
worker.tool('applySybilPaymentCorrection',{title:'Apply Sybil payment correction',description:'Explicitly authorised in-place Payment V1 Revenue Sale payment correction with rollback and idempotency.',schema:j.object({operationKey:j.string(),authorisedBy:j.string(),reason:j.string(),expectedFingerprint:j.string(),eventPageId:j.string(),salePageId:j.string(),balanceSheetPageId:j.string(),paymentChannel:j.string(),paidTo:j.string(),paymentVerifiedAt:j.string(),paymentVerifiedById:j.string(),paymentVerificationNote:j.string()}),execute:async(input,{notion})=>{const c=await sybilPaymentSnapshot(notion,input),audit=await sybilEventAuditText(notion,input.eventPageId),req=crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex'),done=sybilAppliedOperation(audit,input.operationKey);if(done){if(done.requestFingerprint!==req)return jsonOutput({mode:'blocked-no-write',blockers:['Operation key was already applied with a different correction request.'],changed:[]});if(!c.snapshot||done.afterFingerprint!==c.snapshot.fingerprint)return jsonOutput({mode:'blocked-no-write',blockers:['Completed correction changed after apply.'],changed:[]});return jsonOutput({mode:'idempotent-existing-operation',operationKey:input.operationKey,changed:[]})}const b=[...c.blockers];if(!c.snapshot||c.snapshot.fingerprint!==input.expectedFingerprint)b.push('Record changed since preview.');if(!input.operationKey||!input.authorisedBy||!input.reason||!input.paymentVerificationNote)b.push('Authorisation, key, reason and verification note required.');if(!sybilPaymentChannels.has(input.paymentChannel))b.push('Payment Channel is not an allowed value.');if(!sybilPaidTo.has(input.paidTo))b.push('Paid To is not an allowed value.');if(!input.paymentVerifiedById.trim())b.push('Payment verifier is required.');if(input.paymentChannel==='Bank transfer'&&input.paidTo==='Tacit'&&(!input.paymentVerifiedAt||!input.paymentVerifiedById))b.push('Bank transfer to Tacit requires verifier and time.');if(input.paymentVerifiedById){const verifier=await notion.users.retrieve({user_id:input.paymentVerifiedById}).catch(()=>null);if(!verifier)b.push('Payment verifier is not a readable workspace user.')}if(b.length)return jsonOutput({mode:'blocked-no-write',blockers:b,changed:[]});if(sybilOpenLocks(audit).length)return jsonOutput({mode:'blocked-no-write',blockers:['Another Sybil correction is locked.'],changed:[]});const before=c.snapshot!;await appendSybilAudit(notion,input.eventPageId,`[Sybil:${input.operationKey}] locked; authorised by ${input.authorisedBy}; reason: ${input.reason}; before fingerprint: ${before.fingerprint}.`);try{await notion.pages.update({page_id:input.salePageId,properties:{'Payment Channel':{select:{name:input.paymentChannel}},'Paid To':{select:{name:input.paidTo}},'Payment Verified At':{date:{start:input.paymentVerifiedAt}},'Payment Verified By':{people:[{id:input.paymentVerifiedById}]},'Payment Verification Note':{rich_text:[{text:{content:`[Sybil:${input.operationKey}] ${input.paymentVerificationNote}`}}]}} as never});const after=await sybilPaymentSnapshot(notion,input);if(!after.snapshot||after.snapshot.channel!==input.paymentChannel||after.snapshot.paidTo!==input.paidTo||new Date(after.snapshot.verifiedAt).getTime()!==new Date(input.paymentVerifiedAt).getTime()||after.snapshot.verifierIds.length!==1||after.snapshot.verifierIds[0]!==input.paymentVerifiedById||after.snapshot.note!==`[Sybil:${input.operationKey}] ${input.paymentVerificationNote}`)throw Error('Payment readback failed.');await appendSybilAudit(notion,input.eventPageId,`[Sybil:${input.operationKey}] applied; request fingerprint: ${req}; after fingerprint: ${after.snapshot.fingerprint}; authoriser: ${input.authorisedBy}.`);return jsonOutput({mode:'applied-existing-record-only',changed:['Existing Sale payment fields'],neverCreated:['Event','Sale','Balance Sheet']})}catch(e){await notion.pages.update({page_id:input.salePageId,properties:{'Payment Channel':{select:{name:before.channel}},'Paid To':{select:{name:before.paidTo}},'Payment Verified At':before.verifiedAt?{date:{start:before.verifiedAt}}:{date:null},'Payment Verified By':{people:before.verifierIds.map(id=>({id}))},'Payment Verification Note':{rich_text:before.note?[{text:{content:before.note}}]:[]}} as never}).catch(()=>undefined);const restored=await sybilPaymentSnapshot(notion,input);if(!restored.snapshot||restored.snapshot.channel!==before.channel||restored.snapshot.paidTo!==before.paidTo||restored.snapshot.verifiedAt!==before.verifiedAt||JSON.stringify(restored.snapshot.verifierIds)!==JSON.stringify(before.verifierIds)||restored.snapshot.note!==before.note)throw Error('Payment correction failed and rollback verification failed.');await appendSybilAudit(notion,input.eventPageId,`[Sybil:${input.operationKey}] rolled back; payment write/readback failed.`).catch(()=>undefined);throw e}}})

worker.tool("sybilBuildInfo", {
	title: "Sybil build information",
	description: "Read-only runtime revision proof for Sybil deployment verification.",
	hints: { readOnlyHint: true },
	schema: j.object({}),
	execute: async () => jsonOutput({ revision: "sybil-build-1-guardrails-r1", pollyWebhookChanged: false, schemaChanged: false }),
})

// ============================================================================
// Player Academy Mode 2 — payment-first, no Event
// ============================================================================

const pricingDataSourceId = "4baafdfb-c3c7-820b-b36b-07519bd502aa"
const peopleDataSourceId = "261afdfb-c3c7-81f8-8cda-000ba9e72403"
const salesDataSourceId = "261afdfb-c3c7-81d5-b4a7-000b0f69814f"

const findActivePriceListId = async (notion: Client): Promise<string | null> => {
	const res = await notion.dataSources.query({
		data_source_id: pricingDataSourceId,
		filter: { property: "Status", select: { equals: "Active" } },
		page_size: 1,
	})
	const first = (res.results[0] ?? null) as { id?: string } | null
	return first?.id ?? null
}

const resolveAcademyFees = async (notion: Client, priceListId: string): Promise<number> => {
	const raw = await notion.pages.retrieve({ page_id: priceListId })
	if (!("properties" in raw)) throw new Error("Active Price List could not be read.")
	const priceList = raw as unknown as NotionPage
	const thousands = numberValue(property(priceList, "Players Academy (IDR PP)"))
	if (thousands === null) throw new Error("Active Price List does not resolve Players Academy (IDR PP).")
	return thousands * 1000
}

const readStudentTribeState = async (
	notion: Client,
	studentPageId: string
): Promise<{ joinedTacitTribe: string | null; tribeNumber: number | null }> => {
	const raw = await notion.pages.retrieve({ page_id: studentPageId })
	if (!("properties" in raw)) throw new Error("Student record could not be read.")
	const student = raw as unknown as NotionPage
	const joined = property(student, "Joined Tacit Tribe")?.date as { start?: string } | null | undefined
	const num = numberValue(property(student, "Tribe Number"))
	return { joinedTacitTribe: joined?.start ?? null, tribeNumber: num }
}

const isTribeActive = (joinedTacitTribe: string | null): boolean => {
	if (!joinedTacitTribe) return false
	const joined = new Date(joinedTacitTribe)
	if (Number.isNaN(joined.getTime())) return false
	const expiry = new Date(joined)
	expiry.setMonth(expiry.getMonth() + 6)
	return expiry.getTime() > Date.now()
}

const tribeDiscountForNumber = (tribeNumber: number): number => {
	if (tribeNumber >= 1 && tribeNumber <= 20) return 0.5
	if (tribeNumber >= 21 && tribeNumber <= 40) return 0.4
	if (tribeNumber >= 41 && tribeNumber <= 60) return 0.3
	if (tribeNumber >= 61 && tribeNumber <= 80) return 0.2
	return 0
}

const findNextAvailableTribeNumber = async (notion: Client): Promise<number | null> => {
	const usedNumbers = new Set<number>()
	let cursor: string | undefined
	do {
		const res = await notion.dataSources.query({
			data_source_id: peopleDataSourceId,
			filter: { property: "Tribe Number", number: { is_not_empty: true } },
			page_size: 100,
			start_cursor: cursor,
		})
		for (const page of res.results) {
			if (!("properties" in page)) continue
			const n = numberValue(property(page as unknown as NotionPage, "Tribe Number"))
			if (n !== null) usedNumbers.add(n)
		}
		cursor = res.has_more ? res.next_cursor ?? undefined : undefined
	} while (cursor)
	for (let n = 1; n <= 80; n++) {
		if (!usedNumbers.has(n)) return n
	}
	return null
}

// Assign a Tribe Number to a person's People record at payment time.
// Writes both fields using the operator-provided join date.
const assignTribeNumberToStudent = async (
	notion: Client,
	studentPageId: string,
	tribeNumber: number,
	joinedTacitTribe: string
): Promise<void> => {
	await notion.pages.update({
		page_id: studentPageId,
		properties: {
			"Tribe Number": { number: tribeNumber },
			"Joined Tacit Tribe": { date: { start: joinedTacitTribe } },
		} as never,
	})
}

// --- Types ---

type PlayerAcademyPurchaseInput = {
	operationKey: string
	studentPageId: string
	coachLevel: "Head Coach" | "Senior Coach" | "Coach" | "Instructor"
	clubPageId: string
	courtRentalIdr: number
	processingType: "Payment" | "Promo"
	paymentChannel: "Bank transfer" | "Courtside" | "Club" | "Ayo" | "Reclub"
	paidTo: "Tacit" | "Club"
	paymentVerifiedAt?: string
	paymentVerifiedById?: string
	paymentVerificationNote: string
	sharedDiscountPercent: number
	discountReasons: string[]
	discountExplanation: string
	joinedTacitTribe?: string
	tribeNumber?: number
}

// --- Main apply function ---

const applyPlayerAcademyPurchase = async (
	input: PlayerAcademyPurchaseInput,
	notion: Client
): Promise<any> => {
	const blockers: string[] = []

	// 1. Validate inputs
	if (!input.operationKey) blockers.push("operationKey is required.")
	if (!input.studentPageId) blockers.push("studentPageId is required.")
	if (!input.clubPageId) blockers.push("clubPageId is required.")
	if (input.courtRentalIdr === undefined || input.courtRentalIdr === null || input.courtRentalIdr < 0) {
		blockers.push("courtRentalIdr is required and must be >= 0.")
	}
	if (input.paymentChannel === "Bank transfer" && input.paidTo === "Tacit") {
		if (!input.paymentVerifiedAt || !input.paymentVerifiedById) {
			blockers.push("Bank transfer to Tacit requires paymentVerifiedAt and paymentVerifiedById.")
		}
	}
	if (blockers.length) {
		return jsonOutput({ mode: "blocked-no-write", operationKey: input.operationKey, blockers, created: [], salePageId: null, tribeNumberAssigned: null })
	}

	// 2. Read student tribe state from People (unsynced, editable).
	// The operator provides join date and confirms the tribe number in the
	// instruction. Operator input takes precedence; fall back to the person's
	// existing People record; else compute next available.
	const tribeState = await readStudentTribeState(notion, input.studentPageId)
	if (input.tribeNumber !== undefined && input.tribeNumber !== null) {
		if (!Number.isInteger(input.tribeNumber) || input.tribeNumber < 1 || input.tribeNumber > 80) {
			return jsonOutput({
				mode: "blocked-no-write",
				operationKey: input.operationKey,
				blockers: ["Tribe Number must be an integer between 1 and 80."],
				created: [],
				salePageId: null,
				tribeNumberAssigned: null,
			})
		}
	}
	let tribeNumber = input.tribeNumber ?? tribeState.tribeNumber
	let joinedTacitTribe = tribeState.joinedTacitTribe ?? input.joinedTacitTribe ?? null
	let discountPercent = input.sharedDiscountPercent
	let discountReasonNames = [...input.discountReasons]
	let discountExplanation = input.discountExplanation

	if (isTribeActive(joinedTacitTribe)) {
		if (tribeNumber === null) {
			const next = await findNextAvailableTribeNumber(notion)
			if (next !== null) tribeNumber = next
		}
		if (tribeNumber !== null) {
			const computed = tribeDiscountForNumber(tribeNumber)
			if (computed > 0) {
				discountPercent = computed
				discountReasonNames = ["Tacit Tribe"]
				const expiry = new Date(joinedTacitTribe!)
				expiry.setMonth(expiry.getMonth() + 6)
				discountExplanation = `Tribe #${tribeNumber}, ${Math.round(computed * 100)}% Shared Discount, expires ${expiry.toISOString().slice(0, 10)}`
			}
		}
	}

	// 3. Active Pricing period
	const activePriceListId = await findActivePriceListId(notion)
	if (!activePriceListId) {
		return jsonOutput({
			mode: "blocked-no-write",
			operationKey: input.operationKey,
			blockers: ["No Active pricing period found."],
			created: [],
			salePageId: null,
			tribeNumberAssigned: null,
		})
	}
	const academyFeesIdr = await resolveAcademyFees(notion, activePriceListId)
	const discountAmountIdr = round(academyFeesIdr * discountPercent)
	const finalChargedPrice = academyFeesIdr - discountAmountIdr + input.courtRentalIdr

	// 4. Create the Sale without an Event
	const saleTitle = `V1 Player Academy · ${input.coachLevel} · ${input.operationKey}`
	const relations = (ids: string[]) => ids.map((id) => ({ id }))
	const sale = await notion.pages.create({
		parent: { data_source_id: salesDataSourceId },
		properties: {
			Sale: { title: [{ text: { content: saleTitle } }] },
			Students: { relation: relations([input.studentPageId]) },
			Organisations: { relation: relations([input.clubPageId]) },
			"Sale Type": { select: { name: "Player Academy" } },
			"Sale Status": { select: { name: "Confirmed" } },
			"Sale Role": { select: { name: "Revenue" } },
			"Financial Route": { select: { name: "Payment V1" } },
			"Price List": { relation: [{ id: activePriceListId }] },
			"Revenue Scope": { select: { name: "Academy Fees" } },
			"Resolved Coaching Rate (IDR)": { number: academyFeesIdr },
			"Final Charged Price (IDR)": { number: finalChargedPrice },
			"Court Hourly Rate (IDR)": { number: input.courtRentalIdr },
			"Shared Discount %": { number: discountPercent },
			"Discount Reason": { multi_select: discountReasonNames.map((name) => ({ name })) },
			"Discount Explanation": {
				rich_text: discountExplanation
					? [{ type: "text", text: { content: discountExplanation } }]
					: [],
			},
			"Payment Channel": { select: { name: input.paymentChannel } },
			"Paid To": { select: { name: input.paidTo } },
			...(input.paymentVerifiedAt ? { "Payment Verified At": { date: { start: input.paymentVerifiedAt } } } : {}),
			...(input.paymentVerifiedById ? { "Payment Verified By": { people: [{ id: input.paymentVerifiedById }] } } : {}),
			"Payment Verification Note": {
				rich_text: [
					{ type: "text", text: { content: `[${input.operationKey}] ${input.paymentVerificationNote}` } },
				],
			},
			"Payment Processing Status": { select: { name: "Processed" } },
		} as never,
	})

	// 5. Assign Tribe Number to student on People (if newly allocated)
	// The Worker writes Tribe Number + Joined Tacit Tribe at payment time,
	// using the operator-provided join date.
	let tribeNumberAssigned: number | null = null
	if (tribeNumber !== null && tribeState.tribeNumber === null && isTribeActive(joinedTacitTribe)) {
		await assignTribeNumberToStudent(notion, input.studentPageId, tribeNumber, joinedTacitTribe!)
		tribeNumberAssigned = tribeNumber
	}

	// 6. Create Balance Sheet ledger row
	const academySaleUniqueId = property(sale as unknown as NotionPage, "ID")?.unique_id as { prefix?: string; number?: number } | undefined
	const academySaleSku = academySaleUniqueId?.prefix && academySaleUniqueId.number != null ? `${academySaleUniqueId.prefix}-${String(academySaleUniqueId.number).padStart(6, "0")}` : ""
	const ledger = await notion.pages.create({
		parent: { data_source_id: balanceSheetDataSourceId },
		icon: { type: "icon", icon: { name: "upward", color: "green" } } as never,
		properties: {
			Item: {
				title: [{ text: { content: `${academySaleSku ? `${academySaleSku} · ` : ""}${saleTitle} · ${input.operationKey}` } }],
			},
			Sales: { relation: [{ id: sale.id }] },
			"Record Type": { select: { name: "Transaction" } },
			"In/Out": { select: { name: "Incoming" } },
			"Payment Status": { status: { name: "Paid" } },
			"Transaction Date": {
				date: { start: input.paymentVerifiedAt ?? new Date().toISOString() },
			},
			Organisations: { relation: relations([input.clubPageId]) },
			People: { relation: relations([input.studentPageId]) },
			Note: {
				rich_text: [
					{ type: "text", text: { content: `Player Academy Mode 2 apply for ${saleTitle}` } },
				],
			},
		} as never,
	})
	await notion.pages.update({
		page_id: sale.id,
		properties: { "Balance Sheet": { relation: [{ id: ledger.id }] } } as never,
	})

	return jsonOutput({
		mode: "applied",
		operationKey: input.operationKey,
		salePageId: sale.id,
		ledgerId: ledger.id,
		academyFeesIdr,
		courtRentalIdr: input.courtRentalIdr,
		subtotalIdr: academyFeesIdr + input.courtRentalIdr,
		discountPercent,
		discountAmountIdr: round(academyFeesIdr * discountPercent),
		netAmountDueIdr: finalChargedPrice,
		created: ["Revenue Sale (no Event)", "Balance Sheet ledger"],
		blockers: [],
		note: "Player Academy Mode 2 Sale created without Event. Financial Release Ready is False until an Event is linked and confirmed. Ivy can generate the customer invoice immediately.",
		neverCreated: ["Event", "Hourly Rate", "Cost Sale"],
		tribeNumberAssigned,
	})
}

worker.tool("applyPlayerAcademyPurchase", {
	title: "Apply Player Academy purchase (Mode 2)",
	description:
		"Creates a Player Academy Revenue Sale without an Event plus a Balance Sheet ledger row. Fails closed on validation. Writes Tribe Number + Joined Tacit Tribe to People at payment time.",
	schema: j.object({
		operationKey: j.string().describe("Unique operation key for idempotency."),
		studentPageId: j.string().describe("TP: People page ID of the student."),
		coachLevel: j.enum("Head Coach", "Senior Coach", "Coach", "Instructor").describe("Coach level for title only."),
		clubPageId: j.string().describe("TP: Organisations page ID of the club."),
		courtRentalIdr: j.number().describe("Court rental amount in full IDR (operator-provided)."),
		processingType: j.enum("Payment", "Promo").describe("Processing type."),
		paymentChannel: j.enum("Bank transfer", "Courtside", "Club", "Ayo", "Reclub").describe("Payment channel."),
		paidTo: j.enum("Tacit", "Club").describe("Who collected the payment."),
		paymentVerifiedAt: j.string().nullable().describe("ISO timestamp when payment was verified."),
		paymentVerifiedById: j.string().nullable().describe("Notion user ID of verifier (Bank transfer to Tacit only)."),
		paymentVerificationNote: j.string().describe("Short verification note."),
		sharedDiscountPercent: j.number().describe("Shared discount percent (0-1). Worker overrides with tribe tier if applicable."),
		discountReasons: j.array(j.string()).describe("Discount reasons. Worker overrides to [Tacit Tribe] if applicable."),
		discountExplanation: j.string().describe("Concise discount explanation. Worker overrides with tribe details if applicable."),
		joinedTacitTribe: j.string().nullable().describe("Date the student joined Tacit Tribe (ISO format), or null if not a member. The Worker writes this to People at apply."),
		tribeNumber: j.number().nullable().describe("Operator-confirmed Tribe Number (1-80). If omitted, the Worker assigns the next available number."),
	}),
	execute: async (input, { notion }) => applyPlayerAcademyPurchase(input as PlayerAcademyPurchaseInput, notion),
})

worker.tool("previewPlayerAcademyPurchase", {
	title: "Preview Player Academy purchase (Mode 2)",
	description:
		"Read-only preview of a Player Academy purchase: resolves Academy Fees from the Active Pricing period, computes tribe discount on the subtotal, shows Net Amount Due. Creates or changes nothing.",
	hints: { readOnlyHint: true },
	schema: j.object({
		studentPageId: j.string().describe("TP: People page ID of the student."),
		courtRentalIdr: j.number().describe("Court rental amount in full IDR (operator-provided)."),
		joinedTacitTribe: j.string().nullable().describe("Date the student joined Tacit Tribe (ISO format), or null if not a member."),
	}),
	execute: async (input, { notion }) => {
		const blockers: string[] = []
		const tribeState = await readStudentTribeState(notion, input.studentPageId)
		const joinedTacitTribe = tribeState.joinedTacitTribe ?? input.joinedTacitTribe ?? null
		const activePriceListId = await findActivePriceListId(notion)
		let academyFeesIdr = 0
		if (activePriceListId) {
			academyFeesIdr = await resolveAcademyFees(notion, activePriceListId)
		} else {
			blockers.push("No Active pricing period found.")
		}
		let tribeNumber = tribeState.tribeNumber
		let discountPercent = 0
		let discountExplanation = ""
		if (isTribeActive(joinedTacitTribe)) {
			if (tribeNumber !== null) {
				discountPercent = tribeDiscountForNumber(tribeNumber)
				if (discountPercent > 0) {
					const expiry = new Date(joinedTacitTribe!)
					expiry.setMonth(expiry.getMonth() + 6)
					discountExplanation = `Tribe #${tribeNumber}, ${Math.round(discountPercent * 100)}% Shared Discount, expires ${expiry.toISOString().slice(0, 10)}`
				}
			}
		} else if (isTribeActive(joinedTacitTribe) && tribeNumber === null) {
			const nextNumber = await findNextAvailableTribeNumber(notion)
			if (nextNumber !== null) {
				tribeNumber = nextNumber
				discountPercent = tribeDiscountForNumber(tribeNumber)
				if (discountPercent > 0) {
					discountExplanation = `Tribe #${tribeNumber} (to be assigned), ${Math.round(discountPercent * 100)}% Shared Discount`
				}
			} else {
				blockers.push("All 80 Tribe slots are full; no discount applies.")
			}
		}
		const subtotalIdr = academyFeesIdr + input.courtRentalIdr
		const discountAmountIdr = round(academyFeesIdr * discountPercent)
		const netAmountDueIdr = subtotalIdr - discountAmountIdr
		return jsonOutput({
			mode: "read-only",
			studentPageId: input.studentPageId,
			courtRentalIdr: input.courtRentalIdr,
			academyFeesIdr,
			subtotalIdr,
			discountPercent,
			discountAmountIdr,
			netAmountDueIdr,
			tribeNumber,
			joinedTacitTribe,
			discountExplanation,
			activePriceListId,
			blockers,
			proposedActions: [
				"Preview only — no records created or changed.",
				"Worker assigns Tribe Number and creates Sale only when full purchase is applied.",
			],
		})
	},
})

worker.tool("playerAcademyBuildInfo", {
	title: "Player Academy Mode 2 build information",
	description: "Read-only runtime revision proof for Player Academy Mode 2 deployment verification.",
	hints: { readOnlyHint: true },
	schema: j.object({}),
	execute: async () => jsonOutput({
		revision: "player-academy-mode-2-r1",
		mode: "payment-first-without-event",
		tribeDiscountTiers: { "1-20": "50%", "21-40": "40%", "41-60": "30%", "61-80": "20%", "81+": "0%" },
		tribeWindowMonths: 6,
		invoiceDueDate: "T+7",
		courtRental: "operator-provided, not in Pricing DB, internal only on invoice",
		pricingDbUnit: "thousands of IDR (multiply by 1000)",
		discountType: "Shared Discount (Tacit and club share the cost)",
		financialReleaseReady: "False until Event linked and confirmed",
	}),
})

// ============================================================================
// Player Academy Mode 2 — Sale-ready webhook trigger
// ============================================================================
// Fires when the operator creates a draft Player Academy Sale (Sale Type =
// Player Academy, no Event) and flips Payment Processing Status to
// "Ready to process". The Worker resolves Academy Fees from the Active
// Pricing period, computes the tribe discount from the student's People
// record, writes the computed values back onto the draft Sale, creates the
// Balance Sheet ledger, assigns the Tribe Number on People at payment time,
// and marks the Sale Processed.
// ============================================================================

const paFindPageId = (value: unknown): string | null => {
	if (typeof value === "string") {
		if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return value
		if (/^[0-9a-f]{32}$/i.test(value)) {
			return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`
		}
		try { return paFindPageId(JSON.parse(value)) } catch { return null }
	}
	if (Array.isArray(value)) {
		for (const item of value) {
			const pageId = paFindPageId(item)
			if (pageId) return pageId
		}
		return null
	}
	if (value && typeof value === "object") {
		const record = value as Record<string, unknown>
		for (const key of ["id", "pageId", "page_id", "value", "string", "plain_text"]) {
			const pageId = paFindPageId(record[key])
			if (pageId) return pageId
		}
		for (const nestedValue of Object.values(record)) {
			const pageId = paFindPageId(nestedValue)
			if (pageId) return pageId
		}
	}
	return null
}

worker.webhook("onPlayerAcademySaleReady", {
	title: "Player Academy Mode 2 Sale-ready trigger",
	description:
		"Secure ingress for the TP: Sales Ready to process automation. Processes draft Player Academy Sales with no Event: resolves Academy Fees, applies the tribe discount, assigns the Tribe Number on People at payment time, creates the Balance Sheet ledger, and marks the Sale Processed.",
	verify: (request) =>
		hasValidPaymentV1WebhookSecret(request.headers)
			? { status: 202, body: "accepted" }
			: { status: 401, body: "unauthorised" },
	execute: async (events, { notion }) => {
		for (const event of events) {
			const salePageId =
				paFindPageId(event.body.salePageId) ??
				paFindPageId(event.body.pageId) ??
				paFindPageId(event.body["Payment Processing Page ID"]) ??
				paFindPageId(event.body.data)
			if (!salePageId) {
				console.warn("Player Academy webhook ignored: no salePageId in webhook body.")
				continue
			}
			try {
				const rawSale = await notion.pages.retrieve({ page_id: salePageId })
				if (!("properties" in rawSale)) throw new Error("Sale page could not be read.")
				const sale = rawSale as unknown as NotionPage
				if (textValue(property(sale, "Payment Processing Status")) !== "Ready to process") continue
				if (textValue(property(sale, "Financial Route")) !== "Payment V1") {
					throw new Error("Sale is not routed to Payment V1.")
				}
				if (textValue(property(sale, "Sale Role")) !== "Revenue") {
					throw new Error("Only a Revenue Sale can start Player Academy processing.")
				}
				if (textValue(property(sale, "Sale Type")) !== "Player Academy") {
					continue // Not a Mode 2 Sale — Mode 1 webhook handles it
				}
				const eventIds = relationIds(property(sale, "Events"))
				if (eventIds.length !== 0) {
					continue // Has an Event — not a Mode 2 draft
				}
				const studentIds = relationIds(property(sale, "Students"))
				const orgIds = relationIds(property(sale, "Organisations"))
				if (studentIds.length !== 1 || orgIds.length !== 1) {
					throw new Error("Player Academy draft requires exactly one Student and one Organisation.")
				}
				const courtRentalIdr = numberValue(property(sale, "Court Hourly Rate (IDR)"))
				if (courtRentalIdr === null || courtRentalIdr < 0) {
					throw new Error("Player Academy draft requires a Court Hourly Rate (IDR).")
				}
				const paymentChannel = textValue(property(sale, "Payment Channel"))
				const paidTo = textValue(property(sale, "Paid To"))
				if (paymentChannel === "Bank transfer" && paidTo === "Tacit") {
					if (!dateValue(property(sale, "Payment Verified At")) ||
						peopleIds(property(sale, "Payment Verified By")).length !== 1) {
						throw new Error("Bank transfer to Tacit requires verification time and verifier.")
					}
				}

				// Move to Processing before any writes
				await notion.pages.update({
					page_id: salePageId,
					properties: { "Payment Processing Status": { select: { name: "Processing" } } },
				})

				// Tribe state from People (operator-maintained)
				const tribeState = await readStudentTribeState(notion, studentIds[0])
				let tribeNumber = tribeState.tribeNumber
				const joinedTacitTribe = tribeState.joinedTacitTribe
				let discountPercent = numberValue(property(sale, "Shared Discount %")) ?? 0
				let discountReasons = (property(sale, "Discount Reason")?.multi_select ?? []) as Array<{ name?: string }>
				let discountReasonNames = discountReasons.map((d) => d.name ?? "").filter(Boolean)
				let discountExplanation = textValue(property(sale, "Discount Explanation"))
				let assignNumber: number | null = null

				if (isTribeActive(joinedTacitTribe)) {
					if (tribeNumber === null) {
						tribeNumber = await findNextAvailableTribeNumber(notion)
						if (tribeNumber !== null) assignNumber = tribeNumber
					}
					if (tribeNumber !== null) {
						const computedDiscount = tribeDiscountForNumber(tribeNumber)
						if (computedDiscount > 0) {
							discountPercent = computedDiscount
							discountReasonNames = ["Tacit Tribe"]
							const expiry = new Date(joinedTacitTribe!)
							expiry.setMonth(expiry.getMonth() + 6)
							discountExplanation = `Tribe #${tribeNumber}, ${Math.round(computedDiscount * 100)}% Shared Discount, expires ${expiry.toISOString().slice(0, 10)}`
						}
					}
				}

				// Academy Fees from Active Pricing period
				const activePriceListId = await findActivePriceListId(notion)
				if (!activePriceListId) throw new Error("No Active pricing period found.")
				const academyFeesIdr = await resolveAcademyFees(notion, activePriceListId)
				const discountAmountIdr = round(academyFeesIdr * discountPercent)
				const finalChargedPrice = academyFeesIdr - discountAmountIdr + courtRentalIdr

				// Write computed values back onto the draft Sale
				await notion.pages.update({
					page_id: salePageId,
					properties: {
						"Sale Status": { select: { name: "Confirmed" } },
						"Price List": { relation: [{ id: activePriceListId }] },
						"Resolved Coaching Rate (IDR)": { number: academyFeesIdr },
						"Final Charged Price (IDR)": { number: finalChargedPrice },
						"Revenue Scope": { select: { name: "Academy Fees" } },
						"Shared Discount %": { number: discountPercent },
						"Discount Reason": { multi_select: discountReasonNames.map((name) => ({ name })) },
						"Discount Explanation": {
							rich_text: discountExplanation
								? [{ type: "text", text: { content: discountExplanation } }]
								: [],
						},
						"Payment Processing Status": { select: { name: "Processed" } },
					} as never,
				})

				// Assign Tribe Number on People at payment time (only if operator
				// set the join date but left the number empty)
				if (assignNumber !== null) {
					await notion.pages.update({
						page_id: studentIds[0],
						properties: { "Tribe Number": { number: assignNumber } } as never,
					})
				}

				// Balance Sheet ledger
				const applySaleUniqueId = property(sale as unknown as NotionPage, "ID")?.unique_id as { prefix?: string; number?: number } | undefined
				const applySaleSku = applySaleUniqueId?.prefix && applySaleUniqueId.number != null ? `${applySaleUniqueId.prefix}-${String(applySaleUniqueId.number).padStart(6, "0")}` : ""
				const ledger = await notion.pages.create({
					parent: { data_source_id: balanceSheetDataSourceId },
					icon: { type: "icon", icon: { name: "upward", color: "green" } } as never,
					properties: {
						Item: { title: [{ text: { content: `${applySaleSku ? `${applySaleSku} · ` : ""}${textValue(property(sale, "Sale")) || `Player Academy · ${salePageId.slice(0, 8)}`} · ${String(event.body?.operationKey ?? salePageId.slice(0, 8))}` } }] },
						Sales: { relation: [{ id: salePageId }] },
						"Record Type": { select: { name: "Transaction" } },
						"In/Out": { select: { name: "Incoming" } },
						"Payment Status": { status: { name: "Paid" } },
						"Transaction Date": {
							date: { start: dateValue(property(sale, "Payment Verified At"))?.start ?? new Date().toISOString() },
						},
						Organisations: { relation: orgIds.map((id) => ({ id })) },
						People: { relation: studentIds.map((id) => ({ id })) },
						Note: {
							rich_text: [{ text: { content: `Player Academy Mode 2 webhook processing for Sale ${salePageId}` } }],
						},
					} as never,
				})
				await notion.pages.update({
					page_id: salePageId,
					properties: { "Balance Sheet": { relation: [{ id: ledger.id }] } } as never,
				})
			} catch (error) {
				console.error(`Player Academy webhook failed for ${salePageId}:`, error)
				await notion.pages.update({
					page_id: salePageId,
					properties: { "Payment Processing Status": { select: { name: "Failed" } } },
				}).catch(() => undefined)
				throw error
			}
		}
	},
})

// ============================================================================
// Player Academy Mode 2 — Deterministic invoice creation
// ============================================================================

const invoicesDataSourceId = "5bffe449-e1fc-4b94-8f37-703b35e5213c"

const fmtIdr = (n: number): string => "Rp" + n.toLocaleString("en-US")
const fmtNegIdr = (n: number): string => "\u2212Rp" + n.toLocaleString("en-US")

worker.tool("createPlayerAcademyInvoice", {
	title: "Create Player Academy invoice (Mode 2)",
	description:
		"Deterministic invoice creation for a Player Academy draft Sale. Reads the Sale's confirmed amounts, computes the itemised breakdown, creates a TP: Invoices page with exact content blocks (heading, amounts table, bank details, footer). Does not render PDF — Ivy attaches the PDF afterwards from the exact content written here.",
	schema: j.object({
		salePageId: j.string().describe("TP: Sales page ID of the draft Player Academy Sale."),
		clubPageId: j.string().nullable().describe("TP: Organisations page ID — fallback if Organisations relation is empty on the Sale."),
		clubName: j.string().nullable().describe("Club display name — fallback if org page ID is not available."),
	}),
	execute: async (input, { notion }) => {
		const blockers: string[] = []

		// 1. Read the Sale
		const rawSale = await notion.pages.retrieve({ page_id: input.salePageId })
		if (!("properties" in rawSale)) throw new Error("Sale could not be read.")
		const sale = rawSale as unknown as NotionPage

		if (textValue(property(sale, "Sale Type")) !== "Player Academy") {
			blockers.push("Sale is not a Player Academy Sale.")
		}
		if (relationIds(property(sale, "Events")).length > 0) {
			blockers.push("Sale has a linked Event — use Mode 1, not Mode 2.")
		}

		const studentIds = relationIds(property(sale, "Students"))
		if (studentIds.length !== 1) {
			blockers.push("Player Academy draft requires exactly one Student.")
		}

		const academyFeesIdr = numberValue(property(sale, "Resolved Coaching Rate (IDR)"))
		const courtRentalIdr = numberValue(property(sale, "Court Hourly Rate (IDR)"))
		const discountPercent = numberValue(property(sale, "Shared Discount %")) ?? 0

		if (academyFeesIdr === null) blockers.push("Sale missing Resolved Coaching Rate (IDR).")
		if (courtRentalIdr === null) blockers.push("Sale missing Court Hourly Rate (IDR).")

		if (blockers.length) {
			return jsonOutput({ mode: "blocked-no-write", blockers, invoicePageId: null })
		}

		// 2. Get student name
		const rawStudent = await notion.pages.retrieve({ page_id: studentIds[0] })
		const studentName = textValue(property(rawStudent as unknown as NotionPage, "Name")) || "Student"

		// 3. Get club name — try Sale relation, then input fallbacks
		let clubName = input.clubName ?? ""
		const orgIds = relationIds(property(sale, "Organisations"))
		if (!clubName && orgIds.length > 0) {
			const rawOrg = await notion.pages.retrieve({ page_id: orgIds[0] })
			clubName = textValue(property(rawOrg as unknown as NotionPage, "Name")) || ""
		}
		if (!clubName && input.clubPageId) {
			const rawOrg = await notion.pages.retrieve({ page_id: input.clubPageId })
			clubName = textValue(property(rawOrg as unknown as NotionPage, "Name")) || ""
		}
		if (!clubName) {
			blockers.push("Club name could not be resolved from Sale or input.")
			return jsonOutput({ mode: "blocked-no-write", blockers, invoicePageId: null })
		}

		// 4. Check for duplicate invoice
		const existing = await notion.dataSources.query({
			data_source_id: invoicesDataSourceId,
			filter: { property: "Sales", relation: { contains: input.salePageId } },
			page_size: 5,
		})
		if (existing.results.length > 0) {
			return jsonOutput({
				mode: "blocked-duplicate",
				blockers: ["An invoice already exists for this Sale. Delete or archive it first, or use regenerate mode."],
				existingInvoicePageId: existing.results[0].id,
				invoicePageId: null,
			})
		}

		// 5. Compute amounts (discount on Academy Fees only)
		const academyPrice = academyFeesIdr!
		const discountAmount = round(academyPrice * discountPercent)
		const subtotal = academyPrice - discountAmount
		const courtFee = courtRentalIdr!
		const netAmountDue = subtotal + courtFee
		const discountPct = Math.round(discountPercent * 100)

		// 6. Create invoice page with temporary title
		const today = new Date().toISOString().slice(0, 10)
		const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

		const invoice = await notion.pages.create({
			parent: { data_source_id: invoicesDataSourceId },
			properties: {
				Invoice: { title: [{ text: { content: `INV-TP-_${studentName}` } }] },
				Sales: { relation: [{ id: input.salePageId }] },
				"Invoice Date": { date: { start: today } },
				"Due Date": { date: { start: dueDate } },
				Status: { status: { name: "Draft" } },
			} as never,
		})

		// 7. Read back INV # and update title
		const created = await notion.pages.retrieve({ page_id: invoice.id })
		const invProp = property(created as unknown as NotionPage, "INV #")
		const invNumber = (invProp?.unique_id as { number?: number } | undefined)?.number ?? 0
		const invTitle = `INV-TP-${invNumber}_${studentName}`

		await notion.pages.update({
			page_id: invoice.id,
			properties: {
				Invoice: { title: [{ text: { content: invTitle } }] },
			} as never,
		})

		// 8. Write content blocks — deterministic, exact format
		const cellText = (s: string) => [{ type: "text" as const, text: { content: s } }]
		const headingBlock = (text: string) => ({
			object: "block" as const,
			type: "heading_2" as const,
			heading_2: { rich_text: [{ type: "text" as const, text: { content: text } }] },
		})
		const paraBlock = (text: string) => ({
			object: "block" as const,
			type: "paragraph" as const,
			paragraph: { rich_text: [{ type: "text" as const, text: { content: text } }] },
		})
		const bulletBlock = (text: string) => ({
			object: "block" as const,
			type: "bulleted_list_item" as const,
			bulleted_list_item: { rich_text: [{ type: "text" as const, text: { content: text } }] },
		})

		await notion.blocks.children.append({
			block_id: invoice.id,
			children: [
				headingBlock("Invoice details"),
				paraBlock(`Invoice number: INV-TP-${invNumber}`),
				paraBlock(`Bill to: ${studentName}`),
				paraBlock(`Product: ${studentName} \u2014 Player Academy \u2014 ${clubName}`),
				paraBlock(`Invoice date: ${today}`),
				paraBlock(`Due date: ${dueDate} \u2014 7-day terms`),
				{
					object: "block",
					type: "table",
					table: {
						table_width: 2,
						has_column_header: true,
						has_row_header: false,
						children: [
							{ table_row: { cells: [cellText("Description"), cellText("Amount (Rp.)")] } },
							{ table_row: { cells: [cellText("Academy Price"), cellText(fmtIdr(academyPrice))] } },
							{ table_row: { cells: [cellText(`Tacit Original (${discountPct}%)`), cellText(fmtNegIdr(discountAmount))] } },
							{ table_row: { cells: [cellText("Subtotal"), cellText(fmtIdr(subtotal))] } },
							{ table_row: { cells: [cellText("Court Fee"), cellText(fmtIdr(courtFee))] } },
							{ table_row: { cells: [cellText("Net Amount Due"), cellText(fmtIdr(netAmountDue))] } },
						],
					},
				},
				headingBlock("Payment instructions"),
				paraBlock(`Please use INV-TP-${invNumber} as your payment reference.`),
				paraBlock("Please don\u2019t hesitate to reach out with any questions."),
				paraBlock("Thank you for choosing Tacit Padel."),
				bulletBlock("Bank: OCBC"),
				bulletBlock("Account number: 020800031179"),
				bulletBlock("Account holder: PT. TACIT PADEL INDONESIA"),
				bulletBlock("SWIFT/BIC: NISPIDJA"),
				headingBlock("Issued by"),
				paraBlock("Tacit Padel"),
				paraBlock("Plaza Sovereign, 8th Floor. Jl. TB Simatupang Kav. 36, RT.1 / RW.2 Cilandak, Jakarta Selatan, 12430 Indonesia."),
				paraBlock("hola@tacitpadel.com \u00b7 +62 (0)8528612 4149"),
				{ object: "block", type: "divider", divider: {} },
				paraBlock("www.tacitpadel.com"),
			],
		})

		// 9. Return summary for Ivy to render PDF
		return jsonOutput({
			mode: "created",
			invoicePageId: invoice.id,
			invoiceTitle: invTitle,
			invoiceNumber: invNumber,
			studentName,
			clubName,
			invoiceDate: today,
			dueDate,
			amounts: {
				academyPrice,
				discountPercent,
				discountAmount,
				subtotal,
				courtFee,
				netAmountDue,
			},
			contentBlocksWritten: true,
			pdfRequired: true,
			note: "Invoice page created with deterministic content. Ivy should now render the PDF from this exact content and attach it to the invoice page.",
		})
	},
})

worker.tool("regeneratePlayerAcademyInvoice", {
	title: "Regenerate Player Academy invoice (Mode 2)",
	description:
		"Replaces all content blocks on an existing Player Academy invoice page with fresh deterministic content from the linked Sale. Archives old blocks first, then rebuilds. Use when the Sale amounts changed or the format was updated.",
	schema: j.object({
		invoicePageId: j.string().describe("TP: Invoices page ID to regenerate."),
	}),
	execute: async (input, { notion }) => {
		// 1. Read the invoice page
		const rawInvoice = await notion.pages.retrieve({ page_id: input.invoicePageId })
		if (!("properties" in rawInvoice)) throw new Error("Invoice could not be read.")
		const invoicePage = rawInvoice as unknown as NotionPage

		// 2. Get the linked Sale
		const saleIds = relationIds(property(invoicePage, "Sales"))
		if (saleIds.length === 0) {
			return jsonOutput({ mode: "blocked-no-write", blockers: ["Invoice has no linked Sale."], invoicePageId: input.invoicePageId })
		}
		const salePageId = saleIds[0]

		// 3. Read the Sale
		const rawSale = await notion.pages.retrieve({ page_id: salePageId })
		const sale = rawSale as unknown as NotionPage

		if (textValue(property(sale, "Sale Type")) !== "Player Academy") {
			return jsonOutput({ mode: "blocked-no-write", blockers: ["Linked Sale is not a Player Academy Sale."], invoicePageId: input.invoicePageId })
		}

		const studentIds = relationIds(property(sale, "Students"))
		if (studentIds.length !== 1) {
			return jsonOutput({ mode: "blocked-no-write", blockers: ["Sale requires exactly one Student."], invoicePageId: input.invoicePageId })
		}

		const academyFeesIdr = numberValue(property(sale, "Resolved Coaching Rate (IDR)"))
		const courtRentalIdr = numberValue(property(sale, "Court Hourly Rate (IDR)"))
		const discountPercent = numberValue(property(sale, "Shared Discount %")) ?? 0

		if (academyFeesIdr === null || courtRentalIdr === null) {
			return jsonOutput({ mode: "blocked-no-write", blockers: ["Sale missing required amount fields."], invoicePageId: input.invoicePageId })
		}

		// 4. Get student + club names
		const rawStudent = await notion.pages.retrieve({ page_id: studentIds[0] })
		const studentName = textValue(property(rawStudent as unknown as NotionPage, "Name")) || "Student"

		let clubName = ""
		const orgIds = relationIds(property(sale, "Organisations"))
		if (orgIds.length > 0) {
			const rawOrg = await notion.pages.retrieve({ page_id: orgIds[0] })
			clubName = textValue(property(rawOrg as unknown as NotionPage, "Name")) || ""
		}
		if (!clubName) {
			// Try to extract from Sale title
			const saleTitle = textValue(property(sale, "Sale"))
			const parts = saleTitle.split("\u2014").map((s) => s.trim())
			if (parts.length >= 3) clubName = parts[parts.length - 1]
		}

		// 5. Archive all existing content blocks
		const existingBlocks = await notion.blocks.children.list({ block_id: input.invoicePageId, page_size: 100 })
		for (const b of existingBlocks.results) {
			await notion.blocks.delete({ block_id: b.id }).catch(() => undefined)
		}

		// 6. Compute amounts
		const academyPrice = academyFeesIdr!
		const discountAmount = round(academyPrice * discountPercent)
		const subtotal = academyPrice - discountAmount
		const courtFee = courtRentalIdr!
		const netAmountDue = subtotal + courtFee
		const discountPct = Math.round(discountPercent * 100)

		// 7. Read INV #
		const invProp = property(invoicePage, "INV #")
		const invNumber = (invProp?.unique_id as { number?: number } | undefined)?.number ?? 0
		const invTitle = `INV-TP-${invNumber}_${studentName}`

		// Update title
		await notion.pages.update({
			page_id: input.invoicePageId,
			properties: { Invoice: { title: [{ text: { content: invTitle } }] } } as never,
		})

		// 8. Write fresh content blocks
		const cellText = (s: string) => [{ type: "text" as const, text: { content: s } }]
		const headingBlock = (text: string) => ({
			object: "block" as const, type: "heading_2" as const,
			heading_2: { rich_text: [{ type: "text" as const, text: { content: text } }] },
		})
		const paraBlock = (text: string) => ({
			object: "block" as const, type: "paragraph" as const,
			paragraph: { rich_text: [{ type: "text" as const, text: { content: text } }] },
		})
		const bulletBlock = (text: string) => ({
			object: "block" as const, type: "bulleted_list_item" as const,
			bulleted_list_item: { rich_text: [{ type: "text" as const, text: { content: text } }] },
		})

		const today = textValue(property(invoicePage, "Invoice Date")) || new Date().toISOString().slice(0, 10)
		const dueDate = textValue(property(invoicePage, "Due Date")) || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

		await notion.blocks.children.append({
			block_id: input.invoicePageId,
			children: [
				headingBlock("Invoice details"),
				paraBlock(`Invoice number: INV-TP-${invNumber}`),
				paraBlock(`Bill to: ${studentName}`),
				paraBlock(`Product: ${studentName} \u2014 Player Academy \u2014 ${clubName}`),
				paraBlock(`Invoice date: ${today}`),
				paraBlock(`Due date: ${dueDate} \u2014 7-day terms`),
				{
					object: "block",
					type: "table",
					table: {
						table_width: 2,
						has_column_header: true,
						has_row_header: false,
						children: [
							{ table_row: { cells: [cellText("Description"), cellText("Amount (Rp.)")] } },
							{ table_row: { cells: [cellText("Academy Price"), cellText(fmtIdr(academyPrice))] } },
							{ table_row: { cells: [cellText(`Tacit Original (${discountPct}%)`), cellText(fmtNegIdr(discountAmount))] } },
							{ table_row: { cells: [cellText("Subtotal"), cellText(fmtIdr(subtotal))] } },
							{ table_row: { cells: [cellText("Court Fee"), cellText(fmtIdr(courtFee))] } },
							{ table_row: { cells: [cellText("Net Amount Due"), cellText(fmtIdr(netAmountDue))] } },
						],
					},
				},
				headingBlock("Payment instructions"),
				paraBlock(`Please use INV-TP-${invNumber} as your payment reference.`),
				paraBlock("Please don\u2019t hesitate to reach out with any questions."),
				paraBlock("Thank you for choosing Tacit Padel."),
				bulletBlock("Bank: OCBC"),
				bulletBlock("Account number: 020800031179"),
				bulletBlock("Account holder: PT. TACIT PADEL INDONESIA"),
				bulletBlock("SWIFT/BIC: NISPIDJA"),
				headingBlock("Issued by"),
				paraBlock("Tacit Padel"),
				paraBlock("Plaza Sovereign, 8th Floor. Jl. TB Simatupang Kav. 36, RT.1 / RW.2 Cilandak, Jakarta Selatan, 12430 Indonesia."),
				paraBlock("hola@tacitpadel.com \u00b7 +62 (0)8528612 4149"),
				{ object: "block", type: "divider", divider: {} },
				paraBlock("www.tacitpadel.com"),
			],
		})

		return jsonOutput({
			mode: "regenerated",
			invoicePageId: input.invoicePageId,
			invoiceTitle: invTitle,
			invoiceNumber: invNumber,
			studentName,
			clubName,
			amounts: { academyPrice, discountPercent, discountAmount, subtotal, courtFee, netAmountDue },
			contentBlocksWritten: true,
			pdfRequired: true,
			note: "Invoice content replaced with deterministic content. Ivy should now re-render the PDF from this exact content.",
		})
	},
})

// ─── Sybil generic record correction (discount / product / venue / org) ───

const SYBIL_FIELD_SPEC: Record<string, Record<string, string>> = {
	sale: {
		"Shared Discount %": "number",
		"Tacit Discount %": "number",
		"Final Charged Price (IDR)": "number",
		"Resolved Coaching Rate (IDR)": "number",
		"Court Hourly Rate (IDR)": "number",
		"Discount Reason": "multi_select",
		"Discount Explanation": "text",
		"Organisation": "relation",
		"Sale Type": "select",
		"Product": "select"
	},
	event: {
		"Organisation": "relation",
		"Club": "relation",
		"Location": "relation",
		"Scheduled": "date"
	},
	balanceSheet: {
		"Balance Sheet": "title"
	}
}

const sybilPropRead = (value: unknown, kind: string): unknown => {
	const p = value as Record<string, unknown> | undefined
	if (!p) return null
	if (kind === "number") return p.number ?? null
	if (kind === "select") return (p.select as { name?: string } | null)?.name ?? null
	if (kind === "multi_select") return ((p.multi_select as { name?: string }[]) ?? []).map(o => o.name).sort()
	if (kind === "relation") return ((p.relation as { id?: string }[]) ?? []).map(o => o.id).sort()
	if (kind === "text") return ((p.rich_text as { plain_text?: string }[]) ?? []).map(t => t.plain_text).join("")
	if (kind === "title") return ((p.title as { plain_text?: string }[]) ?? []).map(t => t.plain_text).join("")
	if (kind === "date") return (p.date as { start?: string } | null)?.start ?? null
	return null
}

const sybilPropWrite = (value: unknown, kind: string): unknown => {
	if (kind === "number") return { number: value }
	if (kind === "select") return { select: { name: value } }
	if (kind === "multi_select") return { multi_select: (value as string[]).map(name => ({ name })) }
	if (kind === "relation") return { relation: (value as string[]).map(id => ({ id })) }
	if (kind === "text") return { rich_text: value ? [{ text: { content: value as string } }] : [] }
	if (kind === "title") return { title: [{ text: { content: value as string } }] }
	if (kind === "date") return { date: { start: value } }
	return null
}

const sybilNormalize = (value: unknown, kind: string): unknown => {
	if (kind === "multi_select" || kind === "relation") return [...(value as string[])].sort()
	return value
}

const sybilRecordSnapshot = async (notion: Client, eventPageId: string, salePageId: string, balanceSheetPageId: string, changes: Record<string, Record<string, unknown>>) => {
	const ids: Record<string, string> = { event: eventPageId, sale: salePageId, balanceSheet: balanceSheetPageId }
	const out: Record<string, Record<string, unknown>> = {}
	for (const rec of Object.keys(ids) as ("event" | "sale" | "balanceSheet")[]) {
		const page = await notion.pages.retrieve({ page_id: ids[rec] }).catch(() => null)
		if (!page) return { snapshot: null as never, missing: rec }
		const props = (page as { properties?: Record<string, unknown> }).properties ?? {}
		out[rec] = {}
		for (const name of Object.keys(changes[rec] ?? {})) {
			const kind = SYBIL_FIELD_SPEC[rec]?.[name]
			if (kind) out[rec][name] = sybilPropRead(props[name], kind)
		}
	}
	const fingerprint = crypto.createHash("sha256").update(JSON.stringify(out)).digest("hex")
	return { snapshot: { values: out, fingerprint }, missing: null as never }
}

worker.tool("previewSybilRecordCorrection", {
	title: "Preview Sybil record correction",
	description: "Read-only preview of a discount/product/venue/org correction on the existing Event/Sale/Balance Sheet chain.",
	schema: j.object({
		eventPageId: j.string(),
		salePageId: j.string(),
		balanceSheetPageId: j.string(),
		changesJson: j.string(),
		reason: j.string()
	}),
	execute: async (input, { notion }) => {
		const parsed = JSON.parse(input.changesJson) as Record<string, Record<string, unknown>>
		const changes = { event: parsed.event ?? {}, sale: parsed.sale ?? {}, balanceSheet: parsed.balanceSheet ?? {} }
		const blockers: string[] = []
		for (const rec of Object.keys(changes) as ("event" | "sale" | "balanceSheet")[]) {
			for (const name of Object.keys(changes[rec])) {
				if (!SYBIL_FIELD_SPEC[rec][name]) blockers.push(`Field not allowed on ${rec}: ${name}`)
			}
		}
		if (!Object.values(changes).some(c => Object.keys(c).length)) blockers.push("No changes proposed.")
		const c = await sybilRecordSnapshot(notion, input.eventPageId, input.salePageId, input.balanceSheetPageId, changes)
		if (!c.snapshot) blockers.push(`Could not read ${c.missing}.`)
		const diff: Record<string, Record<string, { before: unknown; after: unknown }>> = {}
		if (c.snapshot) {
			for (const rec of Object.keys(changes) as ("event" | "sale" | "balanceSheet")[]) {
				for (const [name, value] of Object.entries(changes[rec])) {
					const kind = SYBIL_FIELD_SPEC[rec][name]
					if (!kind) continue
					const before = c.snapshot.values[rec][name]
					const after = sybilNormalize(value, kind)
					if (JSON.stringify(before) === JSON.stringify(after)) blockers.push(`${rec}.${name} already matches proposal.`)
					else (diff[rec] ??= {})[name] = { before, after }
				}
			}
		}
		return jsonOutput({
			mode: blockers.length ? "blocked-no-write" : "preview-ready",
			blockers,
			diff,
			fingerprint: c.snapshot?.fingerprint ?? null,
			reason: input.reason,
			writes: []
		})
	}
})

worker.tool("applySybilRecordCorrection", {
	title: "Apply Sybil record correction",
	description: "Authorised in-place correction of whitelisted fields on the existing Event/Sale/Balance Sheet — fingerprint, idempotency, rollback, audit.",
	schema: j.object({
		operationKey: j.string(),
		authorisedBy: j.string(),
		reason: j.string(),
		expectedFingerprint: j.string(),
		eventPageId: j.string(),
		salePageId: j.string(),
		balanceSheetPageId: j.string(),
		changesJson: j.string()
	}),
	execute: async (input, { notion }) => {
		const parsed = JSON.parse(input.changesJson) as Record<string, Record<string, unknown>>
		const changes = { event: parsed.event ?? {}, sale: parsed.sale ?? {}, balanceSheet: parsed.balanceSheet ?? {} }
		const ids: Record<string, string> = { event: input.eventPageId, sale: input.salePageId, balanceSheet: input.balanceSheetPageId }
		const audit = await sybilEventAuditText(notion, input.eventPageId)
		const req = crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex")
		const done = sybilAppliedOperation(audit, input.operationKey)
		if (done) {
			if (done.requestFingerprint !== req) return jsonOutput({ mode: "blocked-no-write", blockers: ["Operation key already applied with a different request."], changed: [] })
			return jsonOutput({ mode: "idempotent-existing-operation", operationKey: input.operationKey, changed: [] })
		}
		const c = await sybilRecordSnapshot(notion, input.eventPageId, input.salePageId, input.balanceSheetPageId, changes)
		const blockers: string[] = []
		if (!c.snapshot) blockers.push(`Could not read ${c.missing}.`)
		if (c.snapshot && c.snapshot.fingerprint !== input.expectedFingerprint) blockers.push("Record changed since preview.")
		if (!input.operationKey || !input.authorisedBy || !input.reason) blockers.push("operationKey, authorisedBy and reason required.")
		for (const rec of Object.keys(changes) as ("event" | "sale" | "balanceSheet")[])
			for (const name of Object.keys(changes[rec]))
				if (!SYBIL_FIELD_SPEC[rec][name]) blockers.push(`Field not allowed on ${rec}: ${name}`)
		if (blockers.length) return jsonOutput({ mode: "blocked-no-write", blockers, changed: [] })
		if (sybilOpenLocks(audit).length) return jsonOutput({ mode: "blocked-no-write", blockers: ["Another Sybil correction is locked."], changed: [] })
		const before = c.snapshot!.values
		await appendSybilAudit(notion, input.eventPageId, `[Sybil:${input.operationKey}] locked; authorised by ${input.authorisedBy}; reason: ${input.reason}; before fingerprint: ${c.snapshot!.fingerprint}.`)
		try {
			for (const rec of Object.keys(changes) as ("event" | "sale" | "balanceSheet")[]) {
				const props: Record<string, unknown> = {}
				for (const [name, value] of Object.entries(changes[rec])) props[name] = sybilPropWrite(value, SYBIL_FIELD_SPEC[rec][name])
				if (Object.keys(props).length) await notion.pages.update({ page_id: ids[rec], properties: props as never })
			}
			const after = await sybilRecordSnapshot(notion, input.eventPageId, input.salePageId, input.balanceSheetPageId, changes)
			for (const rec of Object.keys(changes) as ("event" | "sale" | "balanceSheet")[])
				for (const [name, value] of Object.entries(changes[rec]))
					if (JSON.stringify(after.snapshot?.values[rec]?.[name]) !== JSON.stringify(sybilNormalize(value, SYBIL_FIELD_SPEC[rec][name])))
						throw Error(`Readback failed on ${rec}.${name}.`)
			await appendSybilAudit(notion, input.eventPageId, `[Sybil:${input.operationKey}] applied; request fingerprint: ${req}; after fingerprint: ${after.snapshot!.fingerprint}; authoriser: ${input.authorisedBy}.`)
			return jsonOutput({ mode: "applied-existing-record-only", changed: Object.entries(changes).flatMap(([r, c2]) => Object.keys(c2).map(n => `${r}.${n}`)), neverCreated: ["Event", "Sale", "Balance Sheet"] })
		} catch (e) {
			for (const rec of Object.keys(changes) as ("event" | "sale" | "balanceSheet")[]) {
				const props: Record<string, unknown> = {}
				for (const name of Object.keys(changes[rec])) props[name] = sybilPropWrite(before[rec]?.[name], SYBIL_FIELD_SPEC[rec][name])
				if (Object.keys(props).length) await notion.pages.update({ page_id: ids[rec], properties: props as never }).catch(() => undefined)
			}
			await appendSybilAudit(notion, input.eventPageId, `[Sybil:${input.operationKey}] rolled back; write/readback failed.`).catch(() => undefined)
			throw e
		}
	}
})
