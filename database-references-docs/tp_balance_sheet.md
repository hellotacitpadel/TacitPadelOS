# TP: Balance Sheet — Database Reference

*Where money lands. Sales roll up here via the Sales↔Balance Sheet relation.*

**65 properties** · generated Oct 26, 2026 from live schema · source: `dumps/tp__balance_sheet.json`

💰 = money-sensitive field (pay/pricing/cost-related) — the columns Nick wants to hide; watch how formulas and rollups reference them.

## Identity

| Property | Type | Detail |
|---|---|---|
| Item | title |  |

## People & dates

| Property | Type | Detail |
|---|---|---|
| Can Comment | people |  |
| Can View | people |  |
| Can Edit | people |  |
| Person | people |  |

## People & dates

| Property | Type | Detail |
|---|---|---|
| Billing Period | date |  |
| Reimbursement Date | date |  |
| Transaction Date | date |  |
| FX timestamp | date |  |

## Selections

| Property | Type | Detail |
|---|---|---|
| Record Type | select | `Transaction`, `Forecast`, `Container` |
| Database Group | select | `Storage`, `Activities`, `Knowledge`, `Tagging`, `Build`, `AI`, `SV` |
| Recurring Payment Status 💰 | select | `Active`, `Paused`, `Cancelled`, `Not applicable` |
| Audit Batch | select | `Sales-linked Revenue`, `Sales-linked Cost`, `Partner Settlement`, `Subscription — vendor`, `Transport / Receipts`, `Payroll`, `Loan / Repayment`, `Other Transaction`, `Parent / Container` |
| Recurring | select | `Annually`, `Monthly`, `N/A` |
| FX currency used | select | `GBP`, `USD`, `EUR`, `IDR`, `INR`, `SGD`, `AUD`, `JPY`, `CNY`, `MYR`, `THB`, `HKD` +4 more |
| In/Out | select | `Outgoing`, `Incoming` |
| FX Source Currency | select | `GBP`, `USD`, `EUR`, `INR`, `IDR`, `SGD`, `AUD`, `JPY`, `CNY`, `MYR`, `THB`, `HKD` +4 more |

## Selections

| Property | Type | Detail |
|---|---|---|
| Budget Category | multi_select | `Accommodation`, `Coaching Equipment`, `Education`, `Expenses`, `F & B`, `Fees`, `Insurance`, `Loan`, `Revenue`, `Salaries`, `Software`, `Subscriptions` +11 more |

## Numbers & money

| Property | Type | Detail |
|---|---|---|
| Price (PHP) 💰 | number | format: philippine_peso |
| Price (AUD) 💰 | number | format: australian_dollar |
| Price (MYR) 💰 | number | format: ringgit |
| Price (EUR) 💰 | number | format: euro |
| Price (THB) 💰 | number | format: baht |
| Price (INR) 💰 | number | format: rupee |
| FX Source Amount 💰 | number | format: number |
| Price (IDR) 💰 | number | format: rupiah |
| Price (USD) 💰 | number | format: dollar |
| FX rate used 💰 | number | format: rupiah |
| Price (JPY) 💰 | number | format: yen |
| Price (SGD) 💰 | number | format: singapore_dollar |
| Price (AED) 💰 | number | format: dirham |
| Price (CNY) 💰 | number | format: yuan |
| Price (HKD) 💰 | number | format: hong_kong_dollar |
| Price (GBP) 💰 | number | format: pound |
| Price (KRW) 💰 | number | format: won |
| Price (VND) 💰 | number | format: vietnamese_dong |

## Numbers & money

| Property | Type | Detail |
|---|---|---|
| Review | checkbox |  |

## Text & links

| Property | Type | Detail |
|---|---|---|
| Bank Reference | rich_text |  |
| Note | rich_text |  |
| Audit Note | rich_text |  |
| Invoice Number | rich_text |  |

## Relations

| Property | Type | Detail |
|---|---|---|
| Sub-item | relation | → TP: Balance Sheet |
| Sales | relation | → TP: Sales |
| Parent item | relation | → TP: Balance Sheet |
| TP: Balance Sheet [Self] 💰 | relation | → TP: Balance Sheet |

## Rollups

| Property | Type | Detail |
|---|---|---|
| ID | rollup | fn `show_original` on `ID` via `Sales` |
| Sub-item Total (IDR) 💰 | rollup | fn `sum` on `Price (IDR)` via `Sub-item` |

## Formulas

| Property | Type | Detail |
|---|---|---|
| Min. Access | formula | `lets(   /* Combine all people from edit, comment, and view permissions */   allPeople, concat(     prop("Can Edit"),     prop("Can Comment"),     prop…` |
| In/Out [Formula] | formula | `/* In/Out classification — uses local In/Out select only */ if(prop("In/Out") == "Incoming",   style("Incoming", "b", "green"),   if(prop("In/Out") ==…` |
| + / - (IDR) 💰 | formula | `prop("Revenue (IDR)") - prop("Cost (IDR)")` |
| Tacit Net Sales (IDR) 💰 | formula | `if(prop("Sales").length() == 0,   0,   /* Sum all Tacit Net Sales from related Products */   prop("Sales")     .map(current.prop("Tacit Net Sales (IDR…` |
| Cost (IDR) 💰 | formula | `/* Loans are financing, not cost — any row tagged "Loan" (incl. repayments) is excluded from the P&L entirely (tracked separately in the Loans & Defer…` |
| Sale Status Context | formula | `if(empty(prop("Sales")), "",   lets(     /* Sale Status and Cancelled By from linked Sale */     status, prop("Sales").first().prop("Sale Status"),   …` |
| Event Status | formula | `if(empty({{notion:block_property:NU~%5E:00000000-0000-0000-0000-000000000000:728afdfb-c3c7-816d-b8e3-0003a3b6442c}}), "", {{notion:block_property:NU~%…` |
| Revenue (IDR) 💰 | formula | `/* Loans are financing, not revenue — any row tagged "Loan" is excluded from the P&L entirely (tracked separately in the Loans & Deferred app) */ if(n…` |

## Selections

| Property | Type | Detail |
|---|---|---|
| Audit Status | status |  |
| Payment Status 💰 | status |  |
| Reimbursement Status | status |  |

## Automation

| Property | Type | Detail |
|---|---|---|
| Balance Sheet 💰 | button |  |
| Run Validation | button |  |

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

## Text & links

| Property | Type | Detail |
|---|---|---|
| Files & media | files |  |
