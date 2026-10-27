# TP: Sales — Database Reference

*The core of the money chain. 195 properties, 60 formulas, 5 rollups — the blast radius for any column-permission change.*

**195 properties** · generated Oct 26, 2026 from live schema · source: `dumps/tp__sales.json`

💰 = money-sensitive field (pay/pricing/cost-related) — the columns Nick wants to hide; watch how formulas and rollups reference them.

## Identity

| Property | Type | Detail |
|---|---|---|
| Sale | title |  |

## People & dates

| Property | Type | Detail |
|---|---|---|
| Can Comment | people |  |
| Can View | people |  |
| Payment Verified By 💰 | people |  |
| Can Edit | people |  |

## People & dates

| Property | Type | Detail |
|---|---|---|
| Revenue Date 💰 | date |  |
| Confirmed | date |  |
| Payment Verified At 💰 | date |  |

## Selections

| Property | Type | Detail |
|---|---|---|
| Paid To | select | `Club`, `Tacit`, `N/A (Cost Sale)` |
| Shadow Validation State | select | `Ready`, `Blocked`, `Mismatch` |
| Database Group | select | `Storage`, `Activities`, `Knowledge`, `Tagging`, `Build`, `AI`, `SV` |
| Sale Type | select | `Private Lesson`, `Match with Coach`, `Player Academy`, `Coaches Academy`, `Clinic`, `Play with Coach` |
| Revenue Scope 💰 | select | `Academy Fees`, `Combined` |
| Shadow Applied Coach Level 2 💰 | select | `Head Coach`, `Senior Coach`, `Coach`, `Instructor`, `Trainee`, `None` |
| Clinic Level | select | `U8`, `U14`, `U18`, `Introduction`, `Beginner`, `Intermediate`, `Advanced` |
| Financial Route | select | `Legacy`, `Payment V1` |
| Shadow Coach Fee Basis 💰 | select | `Director`, `Below threshold`, `Percentage`, `Base-rate floor`, `Match multiplier`, `Academy percentage`, `Invalid` |
| Target Financial Purpose | select | `Revenue Charge`, `Coach Compensation`, `Court Settlement`, `Wallet Funding` |
| Sale Role | select | `Wallet`, `Cost`, `Revenue` |
| Shadow Coach Fee Basis 2 💰 | select | `Director`, `Below threshold`, `Percentage`, `Base-rate floor`, `Match multiplier`, `Academy percentage`, `Invalid` |
| Sale Status | select | `Confirmed`, `Cancelled`, `Late Cancellation`, `No-Show` |
| Cancelled By | select | `Student`, `Tacit`, `Club` |
| Payment Channel 💰 | select | `Club`, `Wallet`, `Courtside`, `Bank transfer`, `Ayo`, `Reclub`, `Cost` |
| Shadow Applied Coach Level 💰 | select | `Head Coach`, `Senior Coach`, `Coach`, `Instructor`, `Trainee`, `None` |
| Payment Processing Status 💰 | select | `Draft`, `Ready to process`, `Processing`, `Processed`, `Exception` |
| Wallet Type 💰 | select | `EPA Late 26`, `Proklamasi 26`, `1945 26`, `Garuda 26`, `Merdeka 26`, `Abadi 26` |
| Player Academy Tier | select | `Starter`, `Basic`, `Standard`, `Premium`, `Pro` |
| Created Via | select | `Automation`, `Basil`, `Manual` |

## Selections

| Property | Type | Detail |
|---|---|---|
| Discount Reason | multi_select | `Promo`, `Club Staff`, `Tacit Staff`, `Tacit Error`, `Club Error`, `Coach Cover`, `Wallet: Paid`, `Wallet: Free`, `Unreasonable` |

## Numbers & money

| Property | Type | Detail |
|---|---|---|
| Third Party % | number | format: percent |
| Standard (Off Court Hours) | number | format: number |
| Coach Standard (IDR PP) 💰 | number | format: rupiah |
| Wallet 2 Draw (IDR) 💰 | number | format: rupiah |
| Instructor Starter (IDR PP) 💰 | number | format: rupiah |
| Instructor Pro (IDR PP) 💰 | number | format: rupiah |
| Match with Coach HC (IDR PP) 💰 | number | format: rupiah |
| Coaches Academy (Off Court Hours) 💰 | number | format: number |
| Trainee 1:4 (IDR PP) 💰 | number | format: rupiah |
| Play with Coach (IDR PP) 💰 | number | format: rupiah |
| Wallet Value (IDR) 💰 | number | format: rupiah |
| Pro (On Court Hours) | number | format: number |
| Instructor 1:2 (IDR PP) 💰 | number | format: rupiah |
| Coaches Course (IDR PP) 💰 | number | format: rupiah |
| Tacit Discount % | number | format: percent |
| Pro (Off Court Hours) | number | format: number |
| Final Charged Price (IDR) 💰 | number | format: rupiah |
| Head Coach Starter (IDR PP) 💰 | number | format: rupiah |
| Basic (On Court Hours) | number | format: number |
| Instructor Standard (IDR PP) 💰 | number | format: rupiah |
| Head Coach Premium (IDR PP) 💰 | number | format: rupiah |
| Shadow Expected Court Settlement (IDR) 💰 | number | format: rupiah |
| Trainee 1:3 (IDR PP) 💰 | number | format: rupiah |
| Coach 1:3 (IDR PP) 💰 | number | format: rupiah |
| Senior Coach Standard (IDR PP) 💰 | number | format: rupiah |
| Senior Coach 1:2 (IDR PP) 💰 | number | format: rupiah |
| Wallet Bonus Credit (IDR) 💰 | number | format: rupiah |
| Instructor Basic (IDR PP) 💰 | number | format: rupiah |
| Trainee 1:2 (IDR PP) 💰 | number | format: rupiah |
| Starter (Off Court Hours) | number | format: number |
| Coaches Academy (On Court Hours) 💰 | number | format: number |
| Head Coach 1:4 (IDR PP) 💰 | number | format: rupiah |
| Coach Pro (IDR PP) 💰 | number | format: rupiah |
| Tacit % | number | format: percent |
| Match with Coach SC (IDR PP) 💰 | number | format: rupiah |
| Basic (Off Court Hours) | number | format: number |
| Senior Coach 1:1 (IDR PP) 💰 | number | format: rupiah |
| Shadow Expected Coach Fee (IDR) 💰 | number | format: rupiah |
| Instructor 1:3 (IDR PP) 💰 | number | format: rupiah |
| Senior Coach Basic (IDR PP) 💰 | number | format: rupiah |
| Instructor Premium (IDR PP) 💰 | number | format: rupiah |
| Coach Basic (IDR PP) 💰 | number | format: rupiah |
| Match with Coach Coach (IDR PP) 💰 | number | format: rupiah |
| Match with Coach Instructor (IDR PP) 💰 | number | format: rupiah |
| Head Coach Basic (IDR PP) 💰 | number | format: rupiah |
| Wallet 1 Draw (IDR) 💰 | number | format: rupiah |
| Platform Commission % 💰 | number | format: percent |
| Senior Coach 1:3 (IDR PP) 💰 | number | format: rupiah |
| Premium (Off Court Hours) | number | format: number |
| Starter (On Court Hours) | number | format: number |
| Coach Starter (IDR PP) 💰 | number | format: rupiah |
| Coach Premium (IDR PP) 💰 | number | format: rupiah |
| Head Coach Pro (IDR PP) 💰 | number | format: rupiah |
| Senior Coach Premium (IDR PP) 💰 | number | format: rupiah |
| VAT % | number | format: percent |
| Premium (On Court Hours) | number | format: number |
| Trainee 1:1 (IDR PP) 💰 | number | format: rupiah |
| March 2026 Lessons (IDR) 💰 | number | format: rupiah |
| Senior Coach Starter (IDR PP) 💰 | number | format: rupiah |
| Clinic (IDR PP) 💰 | number | format: rupiah |
| Head Coach 1:1 (IDR PP) 💰 | number | format: rupiah |
| Coach 1:1 (IDR PP) 💰 | number | format: rupiah |
| Club % | number | format: percent |
| Instructor 1:4 (IDR PP) 💰 | number | format: rupiah |
| Standard (On Court Hours) | number | format: number |
| Transaction Fee % 💰 | number | format: percent |
| Instructor 1:1 (IDR PP) 💰 | number | format: rupiah |
| Senior Coach 1:4 (IDR PP) 💰 | number | format: rupiah |
| Coach 1:4 (IDR PP) 💰 | number | format: rupiah |
| Resolved Coaching Rate (IDR) 💰 | number | format: rupiah |
| Head Coach 1:3 (IDR PP) 💰 | number | format: rupiah |
| Court Hourly Rate (IDR) 💰 | number | format: rupiah |
| Senior Coach Pro (IDR PP) 💰 | number | format: rupiah |
| Shared Discount % | number | format: percent |
| Coach 1:2 (IDR PP) 💰 | number | format: rupiah |
| Shadow Expected Coach Fee 2 (IDR) 💰 | number | format: rupiah |
| Head Coach Standard (IDR PP) 💰 | number | format: rupiah |
| Head Coach 1:2 (IDR PP) 💰 | number | format: rupiah |

## Numbers & money

| Property | Type | Detail |
|---|---|---|
| Payment V1 Ledger Eligible 💰 | checkbox |  |

## Text & links

| Property | Type | Detail |
|---|---|---|
| Target Source System | rich_text |  |
| Shadow Calculation Revision | rich_text |  |
| Discount Explanation | rich_text |  |
| Payment Verification Note 💰 | rich_text |  |
| Target Source Revision | rich_text |  |
| Target Source Key | rich_text |  |
| Target Source Key 2 | rich_text |  |

## Relations

| Property | Type | Detail |
|---|---|---|
| Balance Sheet 💰 | relation | → TP: Balance Sheet |
| Target Financial Unit | relation | → TP: Events |
| Group | relation | → TP: Sales |
| Events | relation | → TP: Events |
| Wallet 2 💰 | relation | → TP: Sales |
| Wallet 2 Item 💰 | relation | → TP: Sales |
| Price List 💰 | relation | → TP: Pricing |
| Item | relation | → TP: Sales |
| TP: Sales [Self] | relation | → TP: Sales |

## Rollups

| Property | Type | Detail |
|---|---|---|
| Event Capacity | rollup | fn `show_original` on `Capacity` via `Events` |
| Coaches Fee (IDR) 💰 | rollup | fn `sum` on `Coaches Fee (IDR)` via `Events` |
| Wallet 1 Used (IDR) 💰 | rollup | fn `sum` on `Wallet 1 Draw (IDR)` via `Item` |
| Paid Students | rollup | fn `show_original` on `Students` via `Item` |
| Wallet 2 Used (IDR) 💰 | rollup | fn `sum` on `Wallet 2 Draw (IDR)` via `Wallet 2 Item` |

## Formulas

| Property | Type | Detail |
|---|---|---|
| UI: ② Court Contribution (IDR) 💰 | formula | `if(empty(prop("Scheduled")), empty(), style("② Court Contribution (IDR): " + if(empty(prop("Court Contribution (IDR)")), "0", format(round(prop("Court…` |
| Financial Pricing Hours | formula | `lets(   paidPendingClinic,     prop("Financial Route") == "Payment V1" and     prop("Sale Type") == "Clinic" and     prop("Financial Release Ready"), …` |
| Wallet Funding Check 💰 | formula | `lets(   wallet1Count, prop("Group").length(),   wallet2Count, prop("Wallet 2").length(),   wallet1Draw, if(empty(prop("Wallet 1 Draw (IDR)")), 0, prop…` |
| UI: ⑬ Tacit Net Sales (IDR) 💰 | formula | `if(empty(prop("Scheduled")) or empty(prop("Tacit Net Sales (IDR)")), empty(), style("⑬ Tacit Net Sales (IDR): " + format(round(prop("Tacit Net Sales (…` |
| Event Status | formula | `if(prop("Events").length() > 0,   prop("Events").first().prop("Status"),   "" )` |
| Wallet Credit Remaining (IDR) 💰 | formula | `lets(   activeFiniteWallet, prop("Wallet Type") == "EPA Late 26" or prop("Wallet Type") == "Proklamasi 26" or prop("Wallet Type") == "1945 26" or prop…` |
| UI: ⑰ Community Funding (IDR) 💰 | formula | `if(empty(prop("Scheduled")), empty(), if(empty(prop("Community Funding (IDR)")), "⑰ Community Funding (IDR): 0", "⑰ Community Funding (IDR): " + forma…` |
| UI: ⑪ Club Net Sales (IDR) 💰 | formula | `if(empty(prop("Scheduled")), empty(), style("⑪ Club Net Sales (IDR): " + format(round(prop("Club Net Sales (IDR)"), 0)), "b", "red"))` |
| OPEX (IDR) 💰 | formula | `lets(bs, prop("Balance Sheet"), hasAccess, bs.length() > 0, if(!hasAccess, 0, round(max(prop("Tacit Gross Profit (IDR)"), 0) * 0.3)))` |
| Tacit Net Sales (IDR) 💰 | formula | `lets(   bs, prop("Balance Sheet"),   hasAccess, bs.length() > 0,   if(not hasAccess, 0,     if(empty(prop("Shared Net Sales (IDR)")), 0,       prop("S…` |
| Classroom Hours | formula | `lets(mainClassroomHours, prop("Events").filter(current.prop("Facility") == "Classroom" and not empty(current.prop("Scheduled")) and current.prop("Stat…` |
| UI: ⑱ Dividends (IDR) 💰 | formula | `if(empty(prop("Scheduled")), empty(), if(empty(prop("Dividends (IDR)")), "⑱ Dividends (IDR): 0", "⑱ Dividends (IDR): " + format(round(prop("Dividends …` |
| Total Hours | formula | `prop("On Court Hours")+prop("Classroom Hours")+prop("Gym Hours")` |
| Week | formula | `if(empty(prop("Scheduled")), "",   lets(     /* Get week number and year from scheduled date */     weekNum, week(prop("Scheduled")),     yearNum, yea…` |
| Total Income (IDR) 💰 | formula | `ifs(   not prop("Financial Release Ready"), 0,   prop("Sale Role") == "Cost", 0,   round(     (empty(prop("Academy Fees (IDR)")) ? 0 : prop("Academy F…` |
| Tacit Gross Profit (IDR) 💰 | formula | `lets(bs, prop("Balance Sheet"), hasAccess, bs.length() > 0, if(!hasAccess, 0, if(empty(prop("Tacit Net Sales (IDR)")), 0, prop("Tacit Net Sales (IDR)"…` |
| Month | formula | `if(empty(prop("Scheduled")),   empty(),   /* Format date as full month name and year */   formatDate(prop("Scheduled"), "MMMM YYYY") )` |
| Quarter | formula | `if(empty(prop("Scheduled")),   "",   /* Calculate quarter from month and format with year */   "Q" + format(ceil(prop("Scheduled").month() / 3)) + ", …` |
| Gym Hours | formula | `lets(mainGymHours, prop("Events").filter(current.prop("Facility") == "Gym" and not empty(current.prop("Scheduled")) and current.prop("Status") == "Con…` |
| Court Rental (IDR) 💰 | formula | `lets(   revenueScope, prop("Revenue Scope"),   saleType, prop("Sale Type"),   ifs(     not prop("Financial Release Ready"), 0,     saleType == "Coache…` |
| UI: ⑥ Tacit Discount (IDR) 💰 | formula | `if(empty(prop("Scheduled")), empty(),   "⑥ Tacit Discount (IDR): " +    if(empty(prop("Tacit Discount (IDR)")),     "0",     format(round(prop("Tacit …` |
| VAT (IDR) 💰 | formula | `if(empty(prop("Academy Fees (IDR)")) or prop("Academy Fees (IDR)") <= 0, 0, round(prop("Academy Fees (IDR)") * if(empty(prop("VAT %")), 0, prop("VAT %…` |
| UI: ① Total Income (IDR) 💰 | formula | `if(empty(prop("Scheduled")),   empty(),   style("① Total Income (IDR): " + format(round(prop("Total Income (IDR)"), 0)), "b") )` |
| UI: ⑨ Shared Net Sales (IDR) 💰 | formula | `if(empty(prop("Scheduled")), empty(), style("⑨ Shared Net Sales (IDR): " + format(round(prop("Shared Net Sales (IDR)"), 0)), "b", "green"))` |
| Min. Access | formula | `lets(   /* Combine all people from access properties and get their display names */   allAccessNames, concat(prop("Can Edit"), prop("Can Comment"), pr…` |
| Payment Processing Page ID 💰 | formula | `id()` |
| SKU | formula | `lets(   digits, prop("ID").replaceAll("[^0-9]", ""),   "TP-" + repeat("0", max(0, 6 - digits.length())) + digits )` |
| UI: ⑮ Tacit Gross Profit (IDR) 💰 | formula | `if(empty(prop("Scheduled")) or empty(prop("Tacit Gross Profit (IDR)")), empty(), style("⑮ Tacit Gross Profit (IDR): " + format(round(prop("Tacit Gross…` |
| Tacit List Price (IDR) 💰 | formula | `lets(   walletValue, prop("Wallet Value (IDR)"),   isWalletParent, not empty(walletValue),   if(prop("Sale Status") == "Cancelled",     0,     if(isWa…` |
| Wallet Credit Draw (IDR) 💰 | formula | `lets(   parentWalletRows, prop("Group").filter(not empty(current.prop("Wallet Value (IDR)")) and current.prop("Sale Role") == "Wallet" and current.pro…` |
| Club Net Sales (IDR) 💰 | formula | `lets(   bs, prop("Balance Sheet"),   hasAccess, bs.length() > 0,   if(not hasAccess, 0,     lets(       clubPct, if(empty(prop("Club %")), 0, prop("Cl…` |
| Third Party Net Sales (IDR) 💰 | formula | `lets(   bs, prop("Balance Sheet"),   hasAccess, bs.length() > 0,   if(not hasAccess, 0,     lets(       thirdPartyPct, if(empty(prop("Third Party %"))…` |
| Community Funding (IDR) 💰 | formula | `lets(bs, prop("Balance Sheet"), hasAccess, bs.length() > 0, if(!hasAccess, 0, round(max(prop("Tacit Gross Profit (IDR)"), 0) * 0.1)))` |
| Price Per Student (IDR) 💰 | formula | `lets(   saleType, {{notion:block_property:F%3Fuv:00000000-0000-0000-0000-000000000000:728afdfb-c3c7-816d-b8e3-0003a3b6442c}},   /* Get coach level fro…` |
| Court Contribution (IDR) 💰 | formula | `ifs(   prop("Sale Role") == "Cost",   lets(     courtRental, if(empty(prop("Court Rental (IDR)")), 0, prop("Court Rental (IDR)")),     collected, prop…` |
| Effective Coaching Rate (IDR) 💰 | formula | `if(   prop("Financial Route") == "Payment V1",   if(empty(prop("Resolved Coaching Rate (IDR)")), empty(), prop("Resolved Coaching Rate (IDR)")),   pro…` |
| Sale Split | formula | `lets(   t, if(empty(prop("Tacit %")), 0, round(prop("Tacit %") * 100)),   c, if(empty(prop("Club %")), 0, round(prop("Club %") * 100)),   tp, if(empty…` |
| Shared Net Sales (IDR) 💰 | formula | `if(empty(prop("Academy Fees (IDR)")), 0,   prop("Academy Fees (IDR)") -   if(empty(prop("VAT (IDR)")), 0, prop("VAT (IDR)")) -   prop("Academy Fees (I…` |
| Financial Release Ready | formula | `lets(   paymentVerified,     not empty(prop("Payment Verified At")) and     not empty(prop("Payment Verified By")),   financiallyChargeable,     prop(…` |
| Academy Fees (IDR) 💰 | formula | `lets(   /* Get base values with defaults */   listPrice, if(empty(prop("Tacit List Price (IDR)")), 0, prop("Tacit List Price (IDR)")),   offPeakDiscou…` |
| Coaches Fee Waterfall (IDR) 💰 | formula | `if(   prop("Financial Route") == "Payment V1",   if(     prop("Shadow Validation State") == "Ready",     round(       (empty(prop("Shadow Expected Coa…` |
| UI: ⑧ VAT (IDR) 💰 | formula | `if(empty(prop("Scheduled")),   "",   "⑧ VAT (IDR): " + format(round(prop("VAT (IDR)"), 0)) )` |
| Wallet Credit Used (IDR) 💰 | formula | `lets(   activeFiniteWallet, prop("Wallet Type") == "EPA Late 26" or prop("Wallet Type") == "Proklamasi 26" or prop("Wallet Type") == "1945 26" or prop…` |
| UI: ⑭ Coaches Fee (IDR) 💰 | formula | `lets(bs, prop("Balance Sheet"), hasAccess, bs.length() > 0, if(empty(prop("Scheduled")), empty(), style("⑭ Coaches Fee (IDR): " + format(round(if(!has…` |
| Tacit Discount (IDR) 💰 | formula | `lets(   /* Get base values with safe defaults */   listPrice, if(empty(prop("Tacit List Price (IDR)")), 0, prop("Tacit List Price (IDR)")),   offPeakD…` |
| Year | formula | `if(empty(prop("Scheduled")),   "",   format(year(prop("Scheduled"))) )` |
| UI: ⑫ Third Party Net Sales (IDR) 💰 | formula | `if(empty(prop("Scheduled")) or empty(prop("Third Party Net Sales (IDR)")), empty(), style("⑫ Third Party Net Sales (IDR): " + format(round(prop("Third…` |
| UI: ⑤ Shared Discount (IDR) 💰 | formula | `if(empty(prop("Scheduled")),   empty(),   "⑤ Shared Discount (IDR): " + format(round(prop("Shared Discount (IDR)"), 0)) )` |
| Day | formula | `if(empty(prop("Scheduled")),   "",   formatDate(prop("Scheduled"), "ddd, YYYY-MM-DD") )` |
| Scheduled | formula | `if(empty(prop("Events")),   empty(),   /* Get the Scheduled date from the first related Event */   prop("Events").first().prop("Scheduled") )` |
| UI: ④ Tacit List Price (IDR) 💰 | formula | `if(empty(prop("Scheduled")), "",   "④ Tacit List Price (IDR): " + format(round(prop("Tacit List Price (IDR)"), 0)) )` |
| On Court Hours | formula | `lets(calculateHours, prop("Events").filter(current.prop("Facility") == "On Court" and not empty(current.prop("Scheduled")) and current.prop("Status") …` |
| Shared Discount (IDR) 💰 | formula | `round(   /* Use list price or 0 if empty */   if(empty(prop("Tacit List Price (IDR)")), 0, prop("Tacit List Price (IDR)")) *   /* Use discount percent…` |
| UI: ⑦ Academy Fees (IDR) 💰 | formula | `if(empty(prop("Scheduled")),   empty(),   style("⑦ Academy Fees (IDR): " + format(round(prop("Academy Fees (IDR)"), 0)), "b") )` |
| UI: ⑯ OPEX (IDR) 💰 | formula | `if(empty(prop("Scheduled")), empty(), if(empty(prop("OPEX (IDR)")), "⑯ OPEX (IDR): 0", "⑯ OPEX (IDR): " + format(round(prop("OPEX (IDR)"), 0))))` |
| Dividends (IDR) 💰 | formula | `lets(bs, prop("Balance Sheet"), hasAccess, bs.length() > 0, if(!hasAccess, 0, round(max(prop("Tacit Gross Profit (IDR)"), 0) * 0.6)))` |
| UI: ③ Court Rental (IDR) 💰 | formula | `if(empty(prop("Scheduled")),   empty(),   style(     "③ Court Rental (IDR): " + format(round(prop("Court Rental (IDR)"), 0)),     "b",     "red"   ) )` |
| Wallet Opening Credit (IDR) 💰 | formula | `if(prop("Sale Role") != "Wallet" or empty(prop("Wallet Value (IDR)")), empty(),   prop("Wallet Value (IDR)") + if(empty(prop("Wallet Bonus Credit (IDR…` |
| UI: ⑩ Split | formula | `if(empty(prop("Scheduled")), empty(),   lets(     t, if(empty(prop("Tacit %")), 0, round(prop("Tacit %") * 100)),     c, if(empty(prop("Club %")), 0, …` |
| Split Validation | formula | `lets(   tacitPct, if(empty(prop("Tacit %")), 0, prop("Tacit %")),   clubPct, if(empty(prop("Club %")), 0, prop("Club %")),   thirdPartyPct, if(empty(p…` |

## Automation

| Property | Type | Detail |
|---|---|---|
| Home | button |  |

## System

| Property | Type | Detail |
|---|---|---|
| ID | unique_id |  |

## System

| Property | Type | Detail |
|---|---|---|
| Created by | created_by |  |

## System

| Property | Type | Detail |
|---|---|---|
| Created time | created_time |  |

## System

| Property | Type | Detail |
|---|---|---|
| Last edited by | last_edited_by |  |

## System

| Property | Type | Detail |
|---|---|---|
| Last edited time | last_edited_time |  |
