# The Current Invoicing Workflow — Simple and Detailed

*Written October 27, 2026 · v1.0 · Based on the live TP: Invoices database (37 invoices, INV-TP-3 through INV-TP-44), TP: Pricing (3 price periods), the Ivy skill page, and the TP: Sales ↔ Invoice relation.*

---

## The three-stage money chain

```
TP: Pricing  →  TP: Sales  →  TP: Invoices
(rate card)     (sessions)     (monthly bill)
```

1. **Pricing sets the rate** — the rate card says Head Coach 1:1 = IDR 900K, Coach 1:1 = IDR 450K, etc.
2. **Sales captures the charge** — when a booking is paid, the Worker creates a Sale that "locks in" the price from the rate card that was active at that moment. The Sale's financial waterfall (Tacit Net Sales, Club Net Sales, court contribution, discounts) is computed from that rate.
3. **Invoices summarizes the charges** — at month end, all the Sales for a club are grouped into an invoice showing what was actually charged and who owes whom.

The invoice reads **what was actually charged** (from Sales), not **what the rate card says** (from Pricing). If a new price period goes active tomorrow, old Sales keep their original prices — the invoice still reflects what was billed.

---

## The big idea in one paragraph

When a customer (a padel club) hosts Tacit coaching sessions at their venue, Tacit earns a share of the coaching revenue. Once a month, Tacit sends the club an invoice showing what Tacit is owed. The invoice pulls real numbers from the Sales records (each coaching session that was booked and paid for), groups them by product and who collected the money, calculates the Tacit-vs-Club split, and produces a PDF. The club pays, and the invoice is marked Paid.

---

## Who does what

| Role | Who | What they do |
|---|---|---|
| Create the invoice | Ivy (AI skill, legacy) | Reads Sales records, calculates the split, builds the invoice page, generates the PDF |
| Provide the data | TP: Sales (database) | Each Sale is one coaching session with its financial waterfall already computed |
| Hold the invoice | TP: Invoices (database) | One row per invoice, linked to its Sales, with status Draft → Sent → Paid |
| Approve and send | Human (Nick or operator) | Reviews the invoice, sends the PDF to the club |
| Record payment | Human | Sets Payment Date and Status = Paid when the club pays |

---

## The databases involved

### TP: Invoices (18 properties, 37 records)

This is the invoice registry. Each row is one invoice sent to one club for one billing period.

**Key fields:**
- **Invoice** (title) — human-readable name, e.g. "INV-TP-44_The MVP Padel"
- **INV #** (unique ID) — auto-incremented number, e.g. INV-TP-44
- **Status** — `Draft` → `Sent` → `Paid`
- **Period** (text) — the billing month, e.g. "September 2026"
- **Invoice Date** (date) — when the invoice was issued
- **Due Date** (date) — when payment is due (default: 7 days after invoice date)
- **Payment Date** (date) — when the club actually paid (blank until paid)
- **Sales** (relation to TP: Sales) — the individual coaching sessions included in this invoice
- **Notes** (text) — reconciliation notes, exceptions, audit context

**Calculated fields (formulas):**
- **TNS Gross (IDR)** — total Tacit Net Sales across all linked Sales
- **TNS Paid to Club (IDR)** — Tacit's share when the Club collected the money
- **TNS Paid to Tacit (IDR)** — Tacit's share when Tacit collected the money
- **Club Credit (IDR)** — what Tacit owes the Club (Club collected more than their share)
- **Net Payable (IDR)** — the final settlement: what one party owes the other

### TP: Sales (the money chain)

Each Sale is one coaching session. The Sale already has the full financial waterfall computed (coaching fee, court cost, Tacit share, Club share, discounts, VAT). The invoice doesn't recalculate — it reads the finished numbers from the Sales.

The **Invoice** relation on TP: Sales links each Sale back to the invoice it belongs to. This is a two-way relation: the Invoice shows its Sales, and each Sale shows its Invoice.

---

## The step-by-step workflow

### Step 1 — Gather the Sales for the billing period

At the end of a billing period (usually a month), the operator identifies which Sales belong to which club. Each Sale already has:
- The product type (Private Lesson, Clinic, etc.)
- The coach and coach level
- Who collected the money (Paid To = Tacit or Club)
- The financial waterfall (Tacit Net Sales, Club Net Sales, court contribution, discounts)

Ivy reads these values directly from the Sales formula properties using Notion's formula-read capability — it doesn't recalculate them.

### Step 2 — Create the invoice record

Ivy creates a new row in TP: Invoices:
- **Invoice** title: `INV-TP-XX_Club Name`
- **INV #**: auto-assigned by Notion (e.g. INV-TP-44)
- **Period**: the billing month (e.g. "September 2026")
- **Invoice Date**: today's date
- **Due Date**: invoice date + 7 days (unless Nick specifies different terms for that club)
- **Status**: Draft
- **Sales**: linked to the relevant Sales records

### Step 3 — Build the invoice content

Ivy writes the invoice page body with:
- **Bill From** — Tacit Padel's name, address, email, phone
- **Bill To** — the club's name, address, email, phone
- **Product Breakdown table** — one row per product × Paid To × discount state, showing:
  - Product name (e.g. Private Lesson, Clinic)
  - Count (number of sessions)
  - Paid To (Club or Tacit)
  - Coach level
  - Price per student
  - Discounts applied
  - Tacit Net Sales
  - Club Net Sales
- **Settlement table** — the final split:
  - Tacit Net Sales collected by Tacit
  - Tacit Net Sales collected by Club (Club owes Tacit)
  - Club Net Sales collected by Tacit (Tacit owes Club)
  - Net Payable (who owes whom, and how much)

All values are in thousands of IDR (the Notion convention — 900 means IDR 900,000).

### Step 4 — Generate the PDF

Ivy renders a customer-facing, single-page A4 PDF:
- Uses an approved base template with Tacit logo, colors, and page geometry
- Fills in the invoice number, club name, date, period, line items, and settlement totals
- QA check: one page, all totals match the verified data, no table collisions
- Attaches the PDF to the invoice page

### Step 5 — Review and send (human)

The operator (usually Nick):
- Opens the invoice page
- Reviews the Product Breakdown and Settlement tables
- Checks the PDF
- If correct: sets Status = Sent and sends the PDF to the club
- If incorrect: edits the Notes or adjusts the linked Sales, then sends

### Step 6 — Record payment (human)

When the club pays:
- The operator sets **Payment Date** to the date payment was received
- The operator sets **Status = Paid**

The invoice is now complete.

---

## The invoice lifecycle

```
Draft  →  Sent  →  Paid
  │         │       │
  │         │       └── Payment Date filled in
  │         └── PDF sent to the club
  └── Ivy created it, Sales linked, content built, PDF generated
```

### Current state of the 37 invoices

| Status | Count | Examples |
|---|---|---|
| Paid | 28 | INV-TP-3 through INV-TP-41 (March – September 2026 periods) |
| Sent | 5 | INV-TP-29, 38, 40, 42 (awaiting club payment) |
| Draft | 4 | INV-TP-43, 44 (September 2026, not yet sent) |

---

## How invoices connect to the money chain

```
TP: Events → TP: Sales → TP: Invoices
                         → TP: Balance Sheet
```

1. A booking happens → an Event is created (TP: Events)
2. The Worker processes the payment → a Sale is created (TP: Sales) with the full financial waterfall
3. At month end → Sales are grouped by club and linked to an Invoice (TP: Invoices)
4. The Balance Sheet (TP: Balance Sheet) holds the ledger outcomes from each Sale

The invoice is a **summary view** of Sales — it doesn't create new financial records. It reads the already-computed values from Sales and presents them in a customer-facing format.

---

## Who is Ivy and why she matters

Ivy is the **legacy invoice generation skill**. She is not in the V2.0 L3 Skills registry — she predates it. She is the skill that:
- Reads Sales formula values directly (using Notion's formula-read capability)
- Builds the invoice page content
- Renders the PDF
- Handles the product breakdown and settlement tables

Ivy is **live and actively used** — the most recent invoice (INV-TP-44) was created October 2, 2026. But she runs **outside the governed V2.0 skill registry**, meaning:
- No lifecycle status (Draft/Active/Retired) in the registry
- No write boundary documented in the registry
- No review due date
- No owner assigned in the registry

This is a governance gap — Ivy handles financial-adjacent work (reading Sales values, generating invoices) but isn't formally registered.

---

## The split: who owes whom

The core of the invoice is the settlement. Here's how it works in plain language:

When Tacit coaches at a club's venue:
- The student pays for the lesson
- The money goes to either Tacit or the Club (the "Paid To" field on the Sale)
- But the revenue is split between Tacit (for coaching) and the Club (for the court)

So at the end of the month:
- **If the Club collected more than their share** → the Club owes Tacit money (Club Credit)
- **If Tacit collected more than our share** → Tacit owes the Club money
- **Net Payable** = the final number, one direction

The invoice shows this calculation clearly so both sides agree on the settlement.

---

## Current issues

### 1. Ivy is unregistered
Ivy is live and actively generating invoices but is not in the V2.0 L3 Skills registry. She has no formal owner, lifecycle status, or write boundary. If something breaks in Ivy, there's no governed process to fix her.

### 2. Draft invoices are aging
INV-TP-43 and INV-TP-44 (September 2026 period) have been in Draft since October 2. They haven't been sent. This means September revenue hasn't been invoiced to those clubs yet.

### 3. Sent invoices awaiting payment
5 invoices are in Sent status (INV-TP-29, 38, 40, 42). Some have been waiting since early October. No automated follow-up exists — the operator has to manually chase the clubs.

### 4. No payment receipt automation
When a club pays, the operator manually sets Payment Date and Status = Paid. There's no automation that detects the bank transfer and updates the invoice. This is a manual step that could be missed.

### 5. Payment Date is blank on some Paid invoices
Several invoices marked Paid (INV-TP-31, INV-TP-41) have no Payment Date filled in. The status says Paid but the date wasn't recorded — making reconciliation harder.

---

## What works well

- **The formula-read flow is solid** — Ivy reads computed values directly from Sales, so the invoice numbers match the books exactly. No manual data entry for the financial figures.
- **The two-way relation works** — each Invoice shows its Sales, each Sale shows its Invoice. Traceability is intact.
- **The PDF generation is mature** — approved template, QA step, single-page A4 output. 28 invoices have been successfully generated and paid.
- **The settlement logic is clear** — the Net Payable formula correctly calculates who owes whom based on Paid To and the Tacit/Club split.

---

*This is a static documentation file describing the current state. It does not modify any live system.*
