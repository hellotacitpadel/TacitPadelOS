# Permission Test Matrix — the money-chain dependency analysis

**Oct 26, 2026** · Generated from `dumps/` formula expressions — every `prop("…")` reference extracted, money-named fields flagged.

The question this answers: **can Nick hide pay columns without breaking the system or leaking values?**

## The answer, upfront

Not by hiding input columns alone. Sales' money logic is a **chain** — 41 of its 60 formulas consume money-named fields, including each other's outputs, and a display layer re-renders them as text. Hiding an input breaks the formulas that consume it; hiding inputs but not the display layer leaks the values anyway.

## The waterfall (TP: Sales)

```
Tacit List Price (IDR)   ← Effective Coaching Rate, Financial Pricing Hours, Wallet Value
  → Academy Fees (IDR)
    → VAT (IDR), Shared Discount (IDR), Shared Net Sales (IDR)
      → Club Net Sales · Third Party Net Sales · Tacit Net Sales
        → Tacit Gross Profit (IDR)
          → OPEX · Community Funding · Dividends (all IDR)
            → Balance Sheet (relation + rollups)
```

**Wallet chain (parallel):** Wallet Value → Bonus Credit → Opening Credit → Draw (1/2) → Used (1/2) → Remaining → Funding Check.

**Gate fields:** `Financial Release Ready` (needs Payment Verified By/At) gates `Financial Pricing Hours`, `Court Rental`, `Total Income`.

## Leak paths — what hiding must cover

| Layer | Risk | Count |
|---|---|---|
| **UI: ①–⑱ display formulas** | Text-styled re-rendering of computed values (e.g. `UI: ⑮ Tacit Gross Profit`) — hide inputs but leave these → values still visible | 18 formulas |
| **Intermediate computed fields** | Net Sales / Gross Profit / Waterfall columns — derived but still readable | ~15 |
| **Wallet chain** | Value → Remaining — wallet balances visible | ~8 |
| **Rollups → Balance Sheet** | `Revenue`, `+/-`, `Tacit Net Sales` pull from Sales relations | 5 rollups + 4 formulas |

## Break paths — what hiding breaks

- Hiding `Coaches Fee (IDR)` → breaks `Coaches Fee Waterfall`, `Tacit Gross Profit`, `UI: ⑭`
- Hiding `Tacit List Price` → breaks Academy Fees → VAT → Net Sales → everything downstream
- Hiding `Court Hourly Rate` → breaks `Court Rental` → `Court Contribution` → `Total Income`
- The whole waterfall collapses if any middle column goes unreadable — formulas evaluate against the *viewer's* permissions

## Viable directions for the sandbox (Item 3)

1. **Row-level restriction** — limit who sees Sales rows at all vs hiding columns inside them
2. **Hide the complete layer** — inputs + computed + UI formulas together (but then who *can* see totals? admins only)
3. **Derived-only views** — separate DB/view showing aggregates (BS already does this: Revenue/Cost/+/-)
4. **Property Access (3.8 feature)** — test whether column permissions apply per-viewer without breaking formula evaluation for permitted roles

*Test in sandbox against a cloned Sales DB — never the live one. The dependency chain above is the test checklist: every 🔴 row must be verified after a permission change.*

## Full formula reference

Complete per-property tables with expressions: `tp_sales.md`, `tp_events.md`, `tp_balance_sheet.md`.
