# Ivy — Invoice Generator — Skill Reference (legacy)

*Generated Oct 27, 2026 from the live skill page · 96 blocks · LEGACY generation — not in the V2.0 L3 registry*

---

## Bank Details

| Field | Value |
|---|---|
| Bank Name | OCBC |
| Account Number | 020800031179 |
| Account Holder | PT. TACIT PADEL INDONESIA |
| SWIFT/BIC | NISPIDJA |
---
## Company Details

| Field | Value |
|---|---|
| Company Name | Tacit Padel |
| Address | Plaza Sovereign, 8th Floor. Jl. TB Simatupang Kav. 36, RT.1 / RW.2 Cilandak, Jakarta Selatan, 12430 Indonesia. |
| Email | hola@tacitpadel.com |
| Phone | +62 (0)8528612 4149 |
| Tax ID | [TBC] |
---
## Payment Terms

| Setting | Value |
|---|---|
| Default | 7 days |
| Per-org overrides | None. Use exceptions only when Nick confirms them per invoice; schema changes require Walter. |
---
## Org-Type Column Configs

> ⚠️ DIRECT FORMULA-READ FLOW. Invoice figures are read per Sale from computed TP: Sales formula properties with notion_get_formula_value. Screenshots are not required for those values. The separate v10-era independent waterfall computation below remains historical and suspended.
Determines columns in the Sessions line items table on the invoice (one row per product × Paid To × discount state).
### Club / Tacit (current output format)

| Column | Source | Notes |
|---|---|
| Product | Sale Type group (Private Lesson, Clinic, Match with Coach, Player Academy, Coaches Academy, Play with Coach) | One row per product × Paid To × discount state |
| Count | Per-Sale source: On Court Hours for Private Lessons; linked-event court-hours for Clinics; Students relation count for flat-per-student products. | Private Lessons: hours; Clinics: court-hours; flat-per-student products: student count. |
| Discount | Discount classification from SQL: Standard, Tacit-only, Shared, or Wallet-paid (Wallet: Paid + Paid To Tacit) | Wallet-paid displays "0% Wallet" (payment channel, not discount); other discount types display the exact percentage and type. |
| Paid To | Paid To (Club / Tacit; Revenue rows only) | Cost Sales use N/A (Cost Sale) but are excluded from product line items. Renamed from "Collected By" (v5) |
| Coaching Services (IDR) | Display service value: Tacit List Price for Wallet/Shared; Academy Fees for Standard/Tacit-only | Read Tacit List Price (IDR) for Wallet-paid and Shared-discount groups (full service value); read Academy Fees (IDR) for Standard and Tacit-only groups (amount charged). Wallet displays "0% Wallet" as a payment channel. Actual zero displays as 0; dash only for not applicable/unavailable. |
| Club Net Sales (IDR) | Club Net Sales ⑪ | Read per Sale from the corresponding formula property on TP: Sales. |
| Tacit Net Sales (IDR) | Tacit Net Sales ⑬ | Read per Sale from the corresponding formula property on TP: Sales. |
### Supplier

| Column | Waterfall # |
|---|---|
| Sale Type | — |
| Count | — |
| Total Income (IDR) | ① |
| Third Party Net Sales (IDR) | ⑫ |
### Internal (Tacit eyes only)

All 18 waterfall columns.
---
## Direct Formula Read Contract

For invoice runtime, call notion_get_formula_value on each eligible TP: Sales row using the exact property names from the live schema:
- Academy Fees (IDR)
- Club Net Sales (IDR)
- Tacit Net Sales (IDR)
- Tacit List Price (IDR) for Wallet-paid or Shared-discount display values
- On Court Hours when Private Lesson Count requires it
- Court Contribution (IDR) for linked Cost-Sale settlement offsets
Read the returned numeric values as stored (IDR thousands; no conversion). Use raw SQL only to select Sales, classify Sale Role/Paid To/Product/discounts, and collect page URLs. If a required value is missing, non-numeric, opaque or inconsistent with its row/group sum, stop and identify the exact Sale and field. Do not guess, screenshot the value, or independently recompute the waterfall.
---
## Org → View Mapping

Removed 5 May 2026. queryView/loadPage may show opaque placeholders for formula properties. Invoice runtime now resolves required values per Sale with notion_get_formula_value. No organisation-specific view mapping is needed.
---
## Waterfall Computation Reference

> ⚠️ HISTORICAL — independent waterfall computation remains suspended. Ivy now reads the required computed formula values directly per Sale using notion_get_formula_value. The formulas, routing tables and SQL queries below are preserved for historical reference only; Ivy must not execute or reinstate this v10-era computation.
⚠️ v10-era — superseded by v11. The formulas below mirror the v10 TP: Sales chain and are retained for historical reference only. They are NOT v11-accurate: v11 inserts ⑦ Court Subsidy (shared pre-split — VAT→⑧ … Dividends→⑱), makes Court Rental flat (multiplier removed), and prices Clinics single-coach on full event TLP (× Total Hours). Before any reinstatement, rebuild Phase 3 from the verified TacitOS Formula Reference (v11 source of truth). Numbering in the block below remains v10.
### Data Sources

| Source | Data Source URL | Used For |
|---|---|
| TP: Sales | collection://261afdfb-c3c7-81d5-b4a7-000b0f69814f | All raw sale properties, pricing columns, percentages, relations |
| TP: Events | collection://261afdfb-c3c7-8178-98cd-000b29cdbb16 | On Court Hours (Facility, Status, Scheduled date spans) |
| TP: People | collection://261afdfb-c3c7-81f8-8cda-000ba9e72403 | Coach Level (select: Head Coach / Senior Coach / Coach / Instructor / Trainee) |
| TP: Hourly Rate | collection://296afdfb-c3c7-816c-b798-000b917a3347 | Coaches Fee — internal toggle only (deferred) |
### Price Per Student Routing

Route using: Sale Type + Coach Level + student_ratio (1:1/1:2/1:3/1:4 from student count) + Clinic Level + Player Academy Tier. Select the matching IDR PP column value from the sale record.
| Sale Type | Routing Key | Column Pattern |
|---|---|
| Private Lesson | Coach Level + student_ratio | [Coach Level] [ratio] (IDR PP) |
| Player Academy | Coach Level + Tier | [Coach Level] [Tier] (IDR PP) |
| Coaches Academy | Fixed | Coaches Course (IDR PP) |
| Open Clinic | Clinic Level | Open Clinic [Level] (IDR PP) |
| Weekly Clinic | Clinic Level | Weekly Clinic [Level] (IDR PP) |
| Clinic & Play | On Court Hours | ≤2hrs →  |
| Double Coaching | Fixed | Double Coaching (IDR PP) |
| Play with Coach | Coach Level | Play with Coach [abbrev] (IDR PP) |
### Waterfall Formulas (①–⑫)

All values per sale. Round to 0 decimal places unless noted.
```
③ TLP = student_count × price_per_student × total_hours
         (Private Lesson only multiplies by hours; other types omit hours)
④ Shared Discount (IDR) = TLP × shared_discount_pct
⑤ Tacit Discount (IDR) = TLP × (1 - shared_discount_pct) × tacit_discount_pct
⑥ Academy Fees (IDR) = round(TLP × (1 - shared_discount_pct) × (1 - tacit_discount_pct), 0)
⑦ VAT (IDR) = round(⑥ × vat_pct, 0)

② Court Rental (IDR):
   IF revenue_scope = 'Combined' → 0
   ELSE = round(on_court_hours × court_hourly_rate × court_multiplier, 0)
   court_multiplier:
     Clinic & Play ≤2hrs → 2
     Clinic & Play >2hrs → 3
     Double Coaching → 2
     Open Clinic U8 → 1
     student_count ≤ 5 → 1
     student_count > 5 → 2
   For Open/Weekly Clinic with capacity > 0:
     × sliding_multiplier (student_count / capacity)

① Total Income (IDR) = ⑥ + ②

⑧ Shared Net Sales (IDR) = ⑥ - ⑦ - (⑥ × platform_commission_pct) - (⑥ × transaction_fee_pct)

protected_net_sales = TLP × (1 - shared_discount_pct)
    × (1 - vat_pct - platform_commission_pct - transaction_fee_pct)
⑩ Club Net Sales (IDR) = round(protected_net_sales × club_pct, 0)
⑪ Third Party Net Sales (IDR) = round(protected_net_sales × third_party_pct, 0)
⑫ Tacit Net Sales (IDR) = ⑧ - ⑩ - ⑪
```
### Internal Toggle (⑬–⑰) — Deferred

⑬ Coaches Fee requires joining TP: Events → TP: Hourly Rate and summing fee values. Not needed for the club-facing invoice. When implemented:
```
⑬ Coaches Fee (IDR) = SUM of fee values from TP: Hourly Rate linked via Events
⑭ Tacit Gross Profit (IDR) = ⑫ - ⑬
⑮ OPEX (IDR) = round(⑭ × 0.3)
⑯ Community Funding (IDR) = round(⑭ × 0.1)
⑰ Dividends (IDR) = round(⑭ × 0.6)
```
---
## Locale Config

Default: Indonesia. Override only when user explicitly specifies a different country.
| Setting | Indonesia (default) |
|---|---|
| Currency code | IDR |
| Currency prefix | Rp |
| Display multiplier | Values stored and displayed in thousands throughout — no conversion applied. 36,944 stored = Rp 36,944,000 real-world. Footnote on all invoices:  |
| Date format | DD/MM/YYYY |
| Thousand separator | , (comma) |
| Regulatory note | Indonesian faktur requires full IDR amounts — no abbreviation |
Additional locales can be added as columns when needed.
---
## Itemised Billing Columns

Wallet-paid rows are classified by Discount Reason "Wallet: Paid" and Paid To = Tacit. Display "0% Wallet" (payment channel, not discount), full Tacit List Price as the coaching-service value, Club Net Sales as the Club allocation, and Tacit Net Sales as 0. Shared discounts display full Tacit List Price with formula-derived post-discount Club/Tacit net shares (100% Shared therefore shows 0 / 0). Tacit-only discounts display Academy Fees, the amount charged, while preserving the Club share. Use 0 for actual zeros and a dash only for not applicable/unavailable values. Combined Tacit + Shared discounts require Nick's display-basis decision before invoicing.
> ⚠️ DIRECT FORMULA-READ FLOW. Invoice content shows aggregated line items per product × Paid To × discount state from verified per-Sale formula values. Individual Sales remain linked for traceability. The v10-era independent waterfall computation remains suspended.
See Phase 6 in Ivy skill for full layout spec. Invoice output structure (as of June 2026 v2):
### Product Breakdown Table

| Column | Source |
|---|---|
| Product | Sale type group ("Private Lessons" / "Clinics") |
| Count | Product Count rules in Ivy Phase 3 (formula On Court Hours for Private Lessons, linked-event court-hours for Clinics, Students relation count for flat-per-student products). |
| Discount | Display "0% Wallet" for Wallet: Paid rows (Paid To Tacit); otherwise display the exact Tacit-only or Shared percentage and type. If both apply, halt for Nick's display-basis decision. |
| Paid To | Paid To field (Club / Tacit on Revenue rows). Cost Sales use N/A (Cost Sale) and are relation-linked only — they do not appear in this table. |
| Coaching Services (IDR) | Coaching Services display value: Wallet/Shared groups use per-Sale Tacit List Price (IDR); Standard/Tacit-only groups use Academy Fees (IDR). Actual zeros show 0; dash only for not applicable/unavailable. |
| Club Net Sales (IDR) | CNS ⑪ — per product × Paid To × discount state. Read per Sale from formula property "Club Net Sales (IDR)". |
| Tacit Net Sales (IDR) | TNS ⑬ — per product × Paid To × discount state. Read per Sale from formula property "Tacit Net Sales (IDR)". |
### Adjustments Table

| Row | Formula |
|---|---|
| Tacit sales collected by Club | SUM of Tacit Net Sales where Paid To = Club |
| Less: Club Net Sales collected by Tacit (omit if 0) | − SUM of Club Net Sales where Paid To = Tacit |
| Less: Court contribution (omit if 0) | − SUM of Court Contribution (IDR) for linked Cost Sales |
| Final settlement (one direction) | Net = first row less offsets. Positive: Club pays Tacit; negative: Tacit pays Club with positive magnitude; zero: no payment due. Display only one final direction. |
---
## Waterfall Property Map

TP: Sales formula and rollup properties, including the invoice fields read at runtime (data source ).
| # | Property Name | Type | Use |
|---|---|
| ① | Total Income (IDR) | formula→number | Customer's total bill |
| ② | Court Rental (IDR) | formula→number | Court cost |
| ③ | Tacit List Price (IDR) | formula→number | Coaching price before discounts |
| ④ | Shared Discount (IDR) | formula→number | Discount shared by Tacit + club |
| ⑤ | Tacit Discount (IDR) | formula→number | Discount absorbed by Tacit only |
| ⑥ | Academy Fees (IDR) | formula→number | After all discounts |
| ⑦ | Court Subsidy (IDR) | formula→number | Court underfill subsidy on the Cost row (Pattern B); shared pre-split (Tacit + Club) |
| ⑧ | VAT (IDR) | formula→number | Tax (currently 0%) |
| ⑨ | Shared Net Sales (IDR) | formula→number | After VAT + fees |
| ⑩ | Split (display) | formula→number | Revenue split indicator |
| ⑪ | Club Net Sales (IDR) | formula→number | Club's protected share |
| ⑫ | Third Party Net Sales (IDR) | formula→number | Third party share |
| ⑬ | Tacit Net Sales (IDR) | formula→number | INVOICE TOTAL |
| ⑭ | Coaches Fee (IDR) | rollup→sum | Coach compensation |
| ⑮ | Tacit Gross Profit (IDR) | formula→number | After coaches paid |
| ⑯ | OPEX (IDR) | formula→number | 30% operating expenses |
| ⑰ | Community Funding (IDR) | formula→number | 10% community reinvestment |
| ⑱ | Dividends (IDR) | formula→number | 60% shareholder distribution |
| — | Paid To | Select | Routing/classification only — not a calculation input. Revenue and legacy Revenue Sales use Club when the club collected payment or Tacit when Tacit collected directly. Cost Sales use N/A (Cost Sale) and remain relation-linked for Court Contribution adjustments without entering either payer stream. Wallet Sales use Tacit. Basil writes Club or Tacit for customer-payment workflows. |
---
## Header Template

Invoice pages use Notion's native page icon and cover — no content blocks needed. A database template on TP: Invoices (Invoice Template) handles icon, cover, and footer automatically. Ivy uses READ-MERGE-WRITE (G8): loads the Invoice Template via loadPage, builds content in memory, then creates with explicit properties and icon. pageTemplate is NOT used.
| Setting | Value | Source |
|---|---|
| Icon | tP brand logo | Inherited from template |
| Cover colour (solid) | #531D26 | Inherited from template |
| Title format | INV-TP-{INV #}_{Organisation} | Set by Ivy at creation |
---
## Footer Template

Inherited from the database template. A full-width callout with two columns:
| Element | Content |
|---|---|
| Column 1 | www.tacitpadel.com |
| Column 2 | Plaza Sovereign, 8th Floor. Jl. TB Simatupang Kav. 36, RT.1 / RW.2 Cilandak, Jakarta Selatan, 12430 Indonesia. |
Ivy places invoice content above this callout — the footer remains at the bottom of every invoice page.
---
## PDF Generation Runtime

Ivy renders the customer-facing, single-page A4 invoice PDF only after the invoice page exists and its numeric INV # has been read back. The renderer now takes explicit settlement_rows prepared by Ivy: signed numeric amounts, concise labels, and a final directional total. Use "Less: Club Net Sales collected by Tacit" for that credit line; never print reciprocal "owes" totals. Format the invoice number as INV-TP-{number}; canonical invoice title: INV-TP-{number}_{Club Name}. Period remains in the Period property and PDF. Filename: INV-TP-{number}_{Club_Name}.pdf.
- Default payment term: 7 days; due date = invoice date + 7 days. Per-organisation terms are not in TP: Organisations. Use another term only on Nick's explicit confirmation for that invoice.
- Renderer inputs: verified recipient name/address, invoice date/period/description/number/terms and grouped, already-validated rows/totals. All IDR remain thousands (000s); renderer does not compute or change figures.
- Preserve approved static artwork, Tacit logo, colour and page geometry. Table uses dynamic row heights and a merged settlement-label band so text does not cross table grid lines. The renderer fails closed on missing data, overlong labels, overflow, or >10 detail rows.
- Font fidelity caveat: static artwork/issuer text are retained from the approved base PDF. The source sent invoice embeds subsetted Helvetica Neue fonts without full glyph coverage; runtime uses standard Helvetica for dynamic values to avoid missing characters. This is a close visual match, not a glyph-identical full Helvetica Neue. Full licensed font files would be needed for exact dynamic-font parity. See Tacit Padel Brand Guidelines & Assets.
- QA before attach: confirm one page, title/number/club/date/period/terms, each line and settlement total against verified data, and inspect the rendered table for collisions. Then replace the PDF Export placeholder with the generated attachment in a separate targeted content update. If attachment fails, leave Status Draft and report it. Never send the invoice automatically.
### Durable files

Runtime bundle ZIP: Ivy invoice PDF renderer, approved blank template, and required font assets.
Approved blank PDF base.
---
## Changelog

- 2026-10-02 — Implemented the invoice review display logic in Ivy's runtime: Wallet/Shared use full Tacit List Price; Wallet shows 0% Wallet and Club Net Sales; zeros render as 0. Settlement rows are explicit and show "Less: Club Net Sales collected by Tacit" followed by one directional payer/payee amount. QA-tested with Elite INV-TP-39.
- 2026-10-02 — Replaced screenshot-source notes with a direct per-Sale formula-read contract for invoice values, updated the product/count and line-item source maps, and clarified that v10-era independent waterfall computation remains historical and suspended. Test evidence at edit time: numeric reads on one confirmed Private Lesson Sale only; broader validation is still required.
- 2026-09-10 — Aligned Paid To documentation with role-aware invoice handling: Revenue/legacy Revenue = Club or Tacit; Cost = N/A (Cost Sale); Wallet = Tacit. Cost Sales remain linked for Court Contribution adjustments but do not enter payer streams or product line items.
- 2026-06-03 (v5) — Discount column added; "Collected By" renamed to "Paid To". Org-Type Column Configs and Product Breakdown Table updated to match Ivy v5 output structure. Consistent with Ivy v5.
- 2026-06-03 (v4) — Section headings updated to match invoice redesign. Line Items Table → Product Breakdown Table. Settlement Table → Adjustments Table. Consistent with Ivy v4.
- 2026-06-03 (v3) — Thousands convention enforced; Academy Fees column label corrected. Display multiplier clarified: no conversion applied, values stored and displayed in thousands throughout. Academy Fees label updated in Org-Type Column Configs and Itemised Billing Columns — Sales Calculator column is "Academy Fees"; Pages template label is "Coaching Services". Locale Config display multiplier reworded to remove misleading ×1,000 implication.
- 2026-06-03 (v2) — Org-Type Column Configs and Itemised Billing Columns updated for Screenshot-Driven Flow. Line items table now shows per product × Paid To rows (Product | Count | Collected By | Coaching Services | CNS | TNS). Settlement table documented. Locale Config display multiplier corrected: DB stores full IDR (calculator displays in thousands; multiply ×1,000 to write to DB). Callouts updated from Manual Input Mode to Screenshot-Driven Flow.
- 2026-06-03 — Waterfall Computation Reference, Org-Type Column Configs, and Itemised Billing Columns marked SUSPENDED. Ivy Phase 3 replaced with Manual Input Mode — per-sale waterfall computation not executed in current version. Invoice content simplified to stream totals. All suspended sections preserved for reinstatement when Notion Workers build is complete.