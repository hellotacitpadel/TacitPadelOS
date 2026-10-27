# Faye — Forecast Generation — Skill Reference (legacy)

*Generated Oct 27, 2026 from the live skill page · 159 blocks · LEGACY generation — not in the V2.0 L3 registry*

---

L3 Reference — Forecast Generation Reference. Loaded by the Forecast Generation skill at Phase 2 (Calculate). Contains everything HAL needs to run the v11.2 waterfall and produce the output page.
---
## 1. Revenue Waterfall Procedure (v11.2)

All forecasts follow this exact sequence. No steps skipped, no reordering. 18 steps (①→⑱), matching the live UI formulas on TP: Sales. Court Subsidy is step ⑦ (new in v11) — clinic court-underfill deducted right after Academy Fees, before VAT.
| Step | Name | Formula | Notes |
|---|---|
| ① | Total Income | Academy Fees + Court Rental | Customer's total bill |
| ② | Court Rental | Hours × Court Rate | Variable per location. Outside internal waterfall when Revenue Scope = "Academy fees only" |
| ③ | Tacit List Price | Product-specific (see §2) | Coaching only. Coach compensation calculated HERE. |
| ④ | Shared Discount | % × TLP | Shared by Tacit and club. Default 0% for forecasts unless specified. |
| ⑤ | Tacit Discount | % × (TLP − Shared Discount) | Tacit absorbs 100%. Default 0% for forecasts unless specified. |
| ⑥ | Academy Fees | (TLP − ④) × (1 − ⑤%) | Base for VAT, splits, coach pay.  |
| ⑦ | Court Subsidy  | max(Court reference − Court collected, 0) | Clinic court-underfill. Court reference = planned court ÷ planned capacity (4). 0 at full attendance; never negative. Deducted pre-split so the 80/20 shares it. Non-clinic products = 0. |
| ⑧ | VAT | VAT% × Academy Fees | Default 0% (below IDR 4.8B threshold) |
| ⑨ | Shared Net Sales | Academy Fees − Court Subsidy − VAT − Fees | Split between Tacit, club, third party. Fees = platform commission + transaction fees (0 unless a platform applies) |
| ⑩ | Split | Tacit % / Club % / Third Party % | Informational display — not a calculation step. Shows the split percentages applied to ⑨ Shared Net Sales. |
| ⑪ | Club Net Sales | Club% × Shared Net Sales | From Organisation record (default 20%) |
| ⑫ | Third Party Net Sales | Third Party% × Shared Net Sales | From Organisation record (default 0%) |
| ⑬ | Tacit Net Sales | Shared Net Sales − ⑪ − ⑫ | Tacit's portion before coach pay |
| ⑭ | Coach Compensation | Product-specific (see §3) | Always calculated on TLP, never Academy Fees |
| ⑮ | Tacit Gross Profit | Tacit Net Sales − Coach Compensation | Key margin metric |
| ⑯ | OPEX | ⑮ − ⑰ − ⑱ (residual) | Operating expenses allocation (≈30% of TGP). Taken as the balancing figure so ⑯+⑰+⑱ = ⑮ exactly — no rounding drift. |
| ⑰ | Community Funding | round(10% × ⑮) | Ringfenced for community reinvestment (10% of TGP) |
| ⑱ | Dividends | round(60% × ⑮) | Distributed to shareholders (60% of TGP) |
Revenue Scope rule (v11.2): When Revenue Scope = "Academy Fees" (default, now including Clinics), Court Rental is billed to the club / sits outside the internal waterfall; for Clinics any court underfill is absorbed via the Court Subsidy (⑦). When Revenue Scope = "Combined" (Play with Coach — court included in the per-person price), ② = 0 internally and the bundled pool is split 50/50. When Revenue Scope = "Everything" (Overseas Clubs), Court Rental is absorbed into the flat per-student price (② = 0), VAT 0%.
Per-product split model (v11.2, 15 Jul 2026): Partner clubs now hold an independently negotiable split for each product — Private Lessons, Clinics, Player Academy, Coaches Academy, Play with Coach, and Match with Coach each have their own Tacit / Club / Third Party % on the Organisation record, plus a per-product Combined flag that sets that product's Revenue Scope (Combined vs Academy Fees). The owning club is the linked Organisation flagged Tacit Club. When forecasting, read the split for the specific product(s) in scope. Example: Elite Padel uses 80/20/0 for its Academy Fees products (Private Lessons, Clinics, Academies) and 50/50/0 Combined for Play with Coach. If not specified, default to the Organisation's stored per-product split values. (Supersedes the 5 May 2026 two-split Academy-vs-Combined model.)
---
## 2. Product-Specific TLP Formulas (③)

Each product calculates Tacit List Price differently. Query the Pricing [Do not delete] record for all rates.
### Private Lessons

③ TLP = Σ (hours per ratio × session rate per ratio)
Session rates by coach level and ratio (query from Pricing record properties):
- Head Coach 1:1 (IDR PP), Head Coach 1:2 (IDR PP), etc.
- Apply the lesson ratio mix to distribute total hours across ratios
- Default mix: 1:1 = 40%, 1:2 = 30%, 1:3 = 15%, 1:4 = 15%
Example: Senior Coach, 100 hours, default mix (v11.2 rates):
- 1:1: 40h × 630 = 25,200
- 1:2: 30h × 750 = 22,500
- 1:3: 15h × 870 = 13,050
- 1:4: 15h × 990 = 14,850
- ③ TLP = 75,600 (thousands IDR)
### Player Academy

③ TLP = students × PA per-student rate × total hours (query the tier-based PA rates from the Pricing record at runtime).
PA per-student rates carry a 30% premium over the equivalent PL per-student rate (v11; was 20% in v10). v11.2 direction: PA pricing follows the booked lesson mix (each constituent PL ratio × its PA rate at ×1.30, rounded to nearest 5), not a single flat 1:4 rate — but the tier lesson mixes are still to be confirmed (framework), and the live Price Per Student formula still uses the per-tier Pricing-record fields, so query those at runtime.
Per-student rates by tier (query from Pricing record):
- Head Coach Starter (IDR PP), Head Coach Basic (IDR PP), etc.
Tier hours:
| Tier | On Court | Off Court | Total |
|---|---|
| Starter | 10 | 1 | 11 |
| Basic | 20 | 3 | 23 |
| Standard | 30 | 4 | 34 |
| Premium | 60 | 4 | 64 |
| Pro | 84 | 4 | 88 |
Default students per programme: 4.
### Coaches Academy

① Total Income = (cohort month's all-in price) × students (flat all-in, not per-hour). Staggered monthly for the 2026 launch: Aug 10,000 / Sep 15,000 / Oct 20,000 / Nov 25,000 / Dec 30,000 (000s IDR, +5,000/month, reviewed 2027). Use the price for the cohort's month.
② Court Rental = court hours × court rate (absorbed by Tacit)
③ Tacit List Price = Total Income (the all-in cohort price × students — CA's ③ is the whole bill, and it is the compensation base, so the absorbed court never touches coach pay)
⑥ Academy Fees = Total Income − Court Rental
Court allocation: 1–5 students = 1 court. 6–10 students = 2 courts.
Course structure: 34h on-court + 16h classroom = 50h total.
Default students: 10. Max cohort: 10.
CA does NOT use the standard TLP formula — Total Income is the starting point, and ③ = Total Income. Because the court is absorbed, ⑥ = ③ − ② Court Rental; consistency check #2 (⑥ = ③ × (1 − discounts)) does not apply to CA — verify ③ − ⑥ = ② instead.
### Clinics (v11.2 — PL-anchored, per student)

③ TLP per student = PL per-student rate (delivering coach level, realised ratio) × booked hours; summed across participants for the session TLP.
- PL-anchored: each participant pays the Private Lesson per-student rate for the delivering coach's level at the realised ratio (1:3 if 3 attend, 1:4 if 4). Use the PL Per-Student Values (§2 PL rate card).
- Per student (Pattern B): each participant has their own Sale. Max 4 pax; minimum 3 to run (2 does not run).
- Revenue Scope: Academy Fees — 80/20 (Tacit/Club) on coaching fees; court billed to the club. (Moved off Combined in v11.)
- Court included per student: court ÷ planned capacity (4). Any underfill (fewer than 4) is absorbed by Tacit via the Court Subsidy (⑦) — not passed to students.
- Variable duration — use the actual booked coaching hours (no fixed 1.5hr).
- Coach-specific — each clinic runs under a named coach; the price follows that coach's level.
- Inputs needed: delivering coach level, realised ratio (or expected attendance), booked hours, sessions/month, Organisation (for split).
Example: Instructor, 4 pax, 2hr, Elite (court 250):
- Coaching per student = Instructor 1:4 per-student 123.75 × 2hr = 247.5
- Session coaching TLP (③) = 4 × 247.5 = 990
- Court per student = 250 ÷ 4 = 62.5 (billed to club; Court Subsidy = 0 at full attendance)
- At 3 pax: realised ratio 1:3 (Instructor per-student 145 × 2hr = 290); court still referenced at ÷4, and the ~62.5 shortfall is the Court Subsidy (⑦), absorbed by Tacit pre-split.
> ⚠️ v8 Legacy Clinic Formats (historical reference only)
  These categories applied before v9 (26 May 2026). Retained for backward-looking forecast comparisons against actuals from pre-v9 periods. Do NOT use for new forecasts.
  - Open Clinics (Adult): sessions × avg pax × weighted pp rate (Intro/Beg at 350, Int/Adv at 500)
  - Open Clinics (Children): sessions × avg pax × 250
  - Clinic & Play: sessions × attendance × pp rate (3hr=350pp, 2hr=250pp)
  - Double Coaching: sessions × attendance × 575
  - Weekly Clinics: programmes × 4 students × bundle price (Beg=1,400, Int=2,000)
### Match with Coach

③ TLP = sessions × 3 players × pp rate
Pp rates by coach level (query from Pricing record):
- Match with Coach HC (IDR PP) = 525
- Match with Coach SC (IDR PP) = 375
- Match with Coach Coach (IDR PP) = 275
- Match with Coach Instructor (IDR PP) = 175
Always exactly 3 players per session.
### Play with Coach

③ TLP = sessions × players per session × pp rate
- Club-set per-person price, set game-by-game (query Play with Coach (IDR PP) from Pricing record; no set price — the rate is supplied per booking by the club with Tacit approval). For forecasts with no booking rate, ask the user for the per-game figure.
- Players per session: 8–12 (no fixed count — use the user-supplied attendance).
- Revenue Scope: Combined (court included in the per-person price → ② Court Rental = 0 internally).
- Run like a clinic across two courts.
---
## 3. Compensation Lookup Table

### Base Rates (hourly, IDR '000)

Benchmark = 500. Relativities unchanged (carried forward to v11).
| Level | Relativity | Base Rate |
|---|---|
| Head Coach | 100% | 500 |
| Senior Coach | 70% | 350 |
| Coach | 40% | 200 |
| Instructor | 20% | 100 |
| Trainee | 20% | 100 (capped — base rate only, no bands) |
### PL% Bands (compensation percentage × TLP when weekly hours > 20)

For forecasts, use B1 (entry band) as the default unless the user specifies otherwise.
| Level | B1 | B2 | B3 |
|---|---|
| Head Coach | 45% | 50% | 55% |
| Senior Coach | 40% | 45% | 50% |
| Coach | 35% | 40% | 45% |
| Instructor | 30% | 35% | 40% |
Source: PL Extra % verified against TP: Sales (formerly TP: Products, renamed P13 29 Apr 2026) 17 Jan 2026.
### PA% (Player Academy compensation percentage) — v11 re-derived (WS2)

v11 re-derives PA% from PL% ÷ 1.30, rounded up to the nearest 5%, giving parity with PL at equivalent bands. Now band-based (B1/B2/B3), not a flat per-level rate. For forecasts, use B1 as default unless specified.
| Level | B1 | B2 | B3 |
|---|---|
| Head Coach | 35% | 40% | 45% |
| Senior Coach | 35% | 35% | 40% |
| Coach | 30% | 35% | 35% |
| Instructor | 25% | 30% | 35% |
### Compensation models by product

| Product | Compensation model | Base |
|---|---|
| Private Lessons | PL% × TLP (or base rate × hours if below 20 hrs/wk) | TLP (③) |
| Player Academy | PA% × TLP (or base rate × hours if below 20 hrs/wk) | TLP (③) |
| Coaches Academy | 8.75% × Tacit List Price | TLP (③) |
| Clinics (v11.2) | Same gate as PL: ≤20 wkly hrs → 0 (below-threshold base salary is OPEX, not per-session). >20 wkly hrs → higher of (base rate × booked hours) or (PL% × the clinic TLP at the realised ratio). Single coach only (max 4 pax) — no dual-coach split in v11.2. | TLP (③) or base rate |
| Clinics (v8 legacy) | Base rate × coaches × hours (historical — do not use for new forecasts) | Base rate per level |
| Match with Coach | Base rate × 1.75 | Fixed multiplier |
| Play with Coach | Same gate as Clinics: ≤20 wkly hrs → base rate × session hours. &gt;20 wkly hrs → higher of (base rate × hours) or (PL% × coach share of TLP, where share = TLP ÷ coaches present). Base-rate floor is per coach. | TLP (③) or base rate |
### Band override logic

```
weekly_hours = total_hours ÷ (timeframe_months × 4)

IF weekly_hours > 20:
    band_rate = PL% (or PA%/CA%) × TLP
    base_rate = base_hourly_rate × total_hours
    compensation = MAX(band_rate, base_rate)
ELSE:
    compensation = base_hourly_rate × total_hours

IF Director (Jose or Nick):
    compensation = 0
```
---
## 4. Raw Data Shape Definition

When a user provides a Raw Data page, validate that it contains all required sections. IF any section is missing, name the gap and offer Fresh Inputs.
### Required tables

Staff Parameters (one row per staff member or level):
| Column | Type | Required |
|---|---|
| Staff | Text (name or level) | Yes |
| Weekly Hours | Number or quarterly breakdown | Yes |
| Products | Text (comma-separated product codes: PL, PA, CA) | Yes |
Staff Scaling (one row per month):
| Column | Type | Required |
|---|---|
| Month | Text | Yes |
| Instructors | Number | Yes |
| Trainees | Number | Yes |
PA Programme Allocation (one row per month, if PA included):
| Column | Type | Required |
|---|---|
| Month | Text | Yes |
| Total Programmes | Number | Yes |
| Coach allocation | Text (who delivers which) | Yes |
| Tiers | Text (tier per coach) | Yes |
PL Lesson Mix (optional — defaults to 40/30/15/15 if absent):
| Ratio | Default % |
|---|---|
| 1:1 | 40% |
| 1:2 | 30% |
| 1:3 | 15% |
| 1:4 | 15% |
### Illustrative example

The following values are from a previous FY 2026-27 forecast run. They are examples, not authoritative. Do not use as defaults.
- Jose: Q2 45h/wk, Q3-Q4 40h/wk, Q1 35h/wk. Products: CA, PA, PL.
- Nick: 30h/wk consistent. Products: CA, PA, PL.
- Instructors: 30h/wk each, PL only. Scaling: 1 (Apr) → 7 (Jan).
- Trainees: 10h/wk each (capped), PL only. Scaling: 0 (Apr) → 30 (Jul onward).
- Academy capacity: CA = 10 students, PA = 4 students.
---
## 5. Output Format

### Page structure

1. Projection disclaimer (mandatory, top of page):
```
Projection based on v11.2 defaults and estimated inputs.
Not reconciled against actuals.
FX rates: [source] as of [date]. Pricing record: [timestamp].
Organisation: [name]. Revenue Scope: [mode]. Split: [X/Y/Z].
```
Render as a callout with ⚠️ icon and yellow background.
1. Context callout (blue background):
  - Period, products included, coach levels, total hours, lesson mix, Organisation, Revenue Scope
1. Summary waterfall table:
| # | Item | IDR '000 | USD | GBP | EUR |
|---|---|
| ① | Total Income | [value] | [value] | [value] | [value] |
| ② | Court Rental | [value] | [value] | [value] | [value] |
| ... | ...(all 18 rows) |  |  |  |  |
Column order: IDR '000 first (primary, source of truth). USD, GBP, EUR derived.
Colour logic:
- Bold — ① Total Income, ⑥ Academy Fees
- Bold red — ② Court Rental, ⑦ Court Subsidy, ⑪ Club Net Sales, ⑫ Third Party Net Sales, ⑭ Coach Compensation
- Bold green — ⑨ Shared Net Sales, ⑬ Tacit Net Sales, ⑮ Tacit Gross Profit
- Plain — ③ TLP, ④ Shared Discount, ⑤ Tacit Discount, ⑧ VAT, ⑯ OPEX, ⑰ Community Funding, ⑱ Dividends
1. Drill-down sections (same table format, same colour logic):
  - Time breakdown: IF ≥ 3 months → quarterly tables. IF ≥ 7 months → quarterly + annual summary.
  - Product breakdown: IF multiple products → one waterfall table per product.
  - Staff breakdown: IF multiple coach levels → one waterfall table per level.
1. Activity breakdown (standard): a table of the underlying activity behind the forecast — per product, the volume drivers (sessions / programmes / events, students, coach level, hours, ratio mix). Modes 1 & 2: list the actual Confirmed + Pending Events (name, date, coach, students, product) that feed the numbers. Mode 3: list the assumed activity per product. This lets the reader trace any headline figure back to what was booked or assumed.
1. Component summary (standard): a compact one-row-per-component table (per product, or per coach level) showing each component's contribution to the headline lines — ③ TLP, ⑥ Academy Fees, ⑮ Tacit Gross Profit, ⑯/⑰/⑱ — so the reader sees what drives the total without reading every full waterfall.
1. Calculation details (standard, in a toggle): the inputs, formulas, and intermediate values used, so any figure can be reproduced.
1. Assumptions to confirm (standard): a checklist callout of the inputs the forecast rests on for the user to verify — FX source & date, Pricing record timestamp, per-product splits, lesson ratio mix, court hourly rates, student / attendance counts, and coach hours. Anything estimated or defaulted rather than confirmed is listed here as an open item.
### Title format

[Period] Forecast
Examples: "Q2 2026 Forecast", "FY 2026-27 Forecast", "Apr–Jun 2026 Forecast"
### Properties

- 
- Area = Untitled
---
## 6. Quality Checks

Run ALL checks after calculation, before creating the output page. IF any fails → stop and flag.
| Check | Formula | What it catches |
|---|---|
| 1 | ① = ⑥ + ② | Total Income decomposition |
| 2 | ⑥ = (TLP − ④) × (1 − ⑤%).  | Discount application; catches CA court wedge |
| 3 | ⑨ = ⑥ − ⑦ − ⑧ | Court Subsidy + VAT deduction |
| 4 | ⑬ = ⑨ − ⑪ − ⑫ | Revenue split |
| 5 | ⑮ = ⑬ − ⑭ | Profit after coach pay |
| 6 | ⑯ + ⑰ + ⑱ = ⑮ | TGP distribution (30% + 10% + 60% = 100%) |
| 7 | All currency columns = IDR × FX rate | Conversion consistency |
| 8 | No value is negative (except TGP in edge cases) | Sign errors |
---
## 7. Source Unavailability Fallbacks

| Source | Fallback |
|---|---|
| Pricing record | Ask user for rates manually per coach level and ratio |
| TP: Organisations | Ask for Revenue Scope, Club %, Third Party % manually |
| FX rates ( | Ask for manual USD, GBP, EUR rates |
| Raw Data page (shape mismatch) | Name missing sections, offer Fresh Inputs path |
| TP: Events (Mode 1/2) — Pending Event missing coach or student count | Ask the user directly, naming the Event: who's the coach, how many students expected. Never guess or exclude silently. |
| TP: Organisations — missing Court Hourly Rate | Ask the user for the Court Hourly Rate for that Organisation before computing Court Rental/Court Subsidy. Never assume a rate. |
| Play with Coach — no per-game rate available (Pricing record has none; not yet agreed with club) | Ask the user directly, naming the Event, for the agreed per-person rate for that specific booking. Never guess or default. |
---
## 8. Mode 1/2 — Pipeline-Sourced Inputs

Modes 1 and 2 (see skill page Phase 0) reuse this reference's waterfall (§1) and product formulas (§2) exactly — only the input source changes.
Confirmed Events: even though a linked Sale record exists, its computed waterfall values are not reliably retrievable at runtime (excluded from SQL access entirely; page/view access returns unresolved placeholder tokens instead of resolved numbers). Recompute Confirmed Events from raw inputs, using the same method as Pending Events below — do not rely on pulling computed Sale fields directly.
Confirmed and Pending Events — read these inputs from the Event/Sale records:
| Manual input (Mode 3) | Pipeline source (Mode 1/2) |
|---|---|
| Coach level | Event → Coach → Coach Level |
| Ratio / student count | Event → Student count (defines realised ratio). For Clinics, count only linked Sales with Sale Role = "Revenue" — exclude "Cost" or any other non-revenue role from both headcount and TLP. |
| Hours / duration | Event → Scheduled start/end (duration = end − start) |
| Product | Event → Area / product type |
| Organisation / split | Event → Organisation |
| Discount % (Confirmed only) | Sale → Shared Discount %, Tacit Discount %, Discount Reason |
Run these through §2's product-specific TLP formula and the full §1 waterfall exactly as a Fresh Inputs run would. If coach, student count, or hours is missing on an Event, do not guess or default — ask the user, naming the Event.
Coach weekly-hours check: before applying §3's 20-hour compensation gate for any coach, sum that coach's total scheduled hours across ALL their Confirmed + Pending events in the same calendar week being forecast — not just the hours on the single event being priced. Use this weekly total to decide base rate vs. band rate for every event that coach delivers that week.
Mode 2 addition: split Mode 1's events by the Event's Scheduled date into (a) on or before today ("actuals to date") and (b) after today ("already-booked remaining pipeline"). Scale only (a) proportionally by days_in_month ÷ days_elapsed, then add (b) unscaled, to produce the projected table. days_elapsed and days_in_month are plain calendar-day counts for the target month. Do not scale the full combined total — the remaining pipeline is already known, not paced, and scaling it double-counts forward bookings.
Output: same §5 format and 18-row structure — Confirmed and Pending shown as separate tables plus a combined total (and, in Mode 2, a projected table). Same §6 quality checks apply to both.
---
## Changelog

- 2026-07-21 — v11.2 correctness & layout pass (Curtis Gate). §2 Coaches Academy now states ③ Tacit List Price = Total Income (all-in cohort price × students; the comp base), making the court wedge explicit — ③ all-in, ⑥ = Total Income − Court, ③ − ⑥ = ② Court Rental; §1 ⑥ row and §6 check #2 annotated with the CA exception so the check no longer false-HALTs. §1 ⑯/⑰/⑱ allocation switched to a deterministic residual (⑯ = ⑮ − ⑰ − ⑱; ⑰ = round(10% × ⑮); ⑱ = round(60% × ⑮)) so §6 check #6 (⑯+⑰+⑱ = ⑮) holds exactly. §5 output format: activity breakdown, component summary and assumptions-to-confirm promoted to standard elements (calculation-details toggle already standard). Current-version labels aligned to v11.2 (§1 header, Revenue Scope rule, Clinics model, §5 disclaimer); provenance markers and changelog left intact. Integrated in place. Curtis: Critic Mode 1 passed; logic items reviewed in Critic Mode. SemVer-logged.
- 2026-07-15 — v11.2 per-product split alignment. §1 "Dual split model" replaced with the per-product split model (each product carries its own Tacit / Club / Third Party % and Combined flag; owning club identified by the Tacit Club flag), superseding the 5 May 2026 Academy-vs-Combined two-split model. Content-only doc alignment reflecting the live TP: Events / TP: Organisations rework. Curtis-reviewed (content-only), SemVer-logged.
- 2026-07-06 — Modes 1/2 corrected after first live test (Curtis Gate). §8 rewritten: Confirmed Events are now recomputed from raw inputs (Sale computed fields aren't reliably retrievable at runtime); Hours/duration added as an explicit pipeline-sourced input (Event Scheduled start/end); Clinic headcount now filtered to Sale Role = "Revenue" only, excluding "Cost"/non-revenue sale rows from TLP and student count; added an explicit weekly-hours-per-coach aggregation step before the §3 20-hour gate. §7 gained two fallback rows: Organisation missing Court Rate, and Play with Coach missing a per-game rate. Mode 2 corrected: the run-rate multiplier now applies only to actuals-to-date (Scheduled date ≤ today), with the already-booked remaining pipeline added unscaled — previously it scaled the full combined total, double-counting forward bookings.
- 2026-07-06 — Modes 1 & 2 added (Curtis Gate + one-time Felix review). New §8 documents how Mode 1 (Current Pipeline Snapshot) and Mode 2 (Run-Rate Extrapolation) source inputs from TP: Events instead of manual entry, reusing §1 and §2 unchanged. §7 fallback table gained a row for Pending Events missing coach/student data (ask the user, never guess). Felix reviewed the Pending-Event estimation logic against the Director-comp rule and People filter. Curtis: Critic Mode 1 passed (additive; no change to existing waterfall or product formulas).
- 2026-07-01 — v10→v11 alignment (Curtis Gate). Waterfall rebuilt to 18 steps (①→⑱) with Court Subsidy at ⑦ (renumbering VAT→⑧ … Dividends→⑱); §1 Revenue Scope + dual-split updated (Clinics now Academy Fees 80/20, Combined = Play with Coach only). Clinics §2 rewritten to the PL-anchored per-student v11 model (max 4, realised ratio, court to club, Court Subsidy underfill) — v9 flat-300k Combined retired (v8 legacy callout kept). Coaches Academy §2 updated to the staggered 2026 monthly price; §3 CA comp = 8.75%×TLP. PA premium 20%→30% (per-lesson-mix direction; tier mixes still TBC per framework); PA% comp bands re-derived (PL%÷1.30, round up — WS2 signed). Base-rate relativities re-tagged v11. Quality checks + output format renumbered to 18 rows. PL worked example refreshed to v11 rates. Curtis: Critic Mode 1 passed (content-only). SemVer-logged.
- 2026-06-22 — v10.1 product update. "Play with Coach" (match play, 175% of PL 1:1 ÷ 3, pp rates 525/375/275/175) renamed to Match with Coach; Pricing-record field names updated to Match with Coach … (IDR PP). New Play with Coach product added: club-set per-person TLP (Play with Coach (IDR PP), no set price — agreed game-by-game), Combined scope (court included), threshold-gated higher-of compensation (Clinics model). Curtis Gate passed.
- 2026-06-15 — v9→v10 update. Base rates: HC 625→500, SC 438→350, Coach 250→200, Instructor/Trainee 125→100. PwC rates: HC 700→525, SC 500→375, Coach 350→275, Instructor 250→175. PL example recalculated. Output disclaimer updated.
- 2026-05-26 — Waterfall corrected to 17 steps (WS3 audit). Inserted ⑨ Split (display), renumbered ⑩→⑰. Quality checks 4–6 updated. Output format 16→17 rows. Colour logic step references corrected.
- 2026-05-26 — v8→v9 rewrite (WS3). Clinics section replaced: v8 5-category model (OC Adult, OC Children, C&P, DC, WC) demoted to historical reference callout; v9 unified model (flat 300k IDR pp, Combined scope, 1.5hr, single/dual-coach threshold) is now primary. Compensation table updated: v9 Clinics use the 20-hour gate + higher-of rule (same as PL/PwC), not flat base rate × hours. Waterfall heading and output disclaimer updated v8→v9. v8 legacy clinic entries retained for backward-looking comparisons only.
- 2026-05-03 — CA compensation model confirmed: flat rate (base rate × hours), aligned with v8 as of 1 May 2026. Uncertainty flag removed.
- 2026-05-03 — Initial build via Curtis: Conceive → Creator pipeline. Compensation lookup table populated from v8 source material.