# Eric — Expenses Manager — Skill Reference (legacy)

*Generated Oct 27, 2026 from the live skill page · 205 blocks · LEGACY generation — not in the V2.0 L3 registry*

---

> ⚠️ L3 Reference — Eric: Expenses Manager. Budget Category decision tree, Item naming convention, reimbursement lifecycle rules, and query templates. Load on demand at specific process steps — do not preload.
> ⚠️ Category 2 — AI-generated reference. No direct human source material. Unverified until human-reviewed.
---
## Data Sources

| Database | URL | Access |
|---|---|
| TP: Balance Sheet |  | Read + write (Budget Category when explicitly selected by Nick during TP: Balance Sheet ingestion or approved classification/edit workflows, Item, Person, FX Source Currency, FX Source Amount, Billing Period, Invoice Number, Bank Reference when verified from the source, Payment Status on Mode 5 creation only, Reimbursement Status, Reimbursement Date, People, Organisations, Note, Files & media). Price properties and FX currency/rate/timestamp are Worker-owned outputs, not Eric inputs. |
| TP: Expenses Inbox (legacy reference — unverified) |  | Do not use for Mode 3 until Nick confirms the user-facing database exists and its live schema/permissions support the intake fields. The connected-source metadata loaded in this audit did not match the documented schema. If unconfirmed, stop Mode 3; do not route elsewhere by assumption. |
| TP: Personal Expenses |  | Read + create (Item, one source Price column, Transaction Date, Billing Period, Invoice Number, In/Out, Person, Note, Files & media) |
| Notion Mail | nick@tacitpadel.com | Read-only (invoice/receipt source; extract PDF via readAttachment) |
| TP: Sales |  | Read-only (Sale Type context for classification) |
| TP: People |  | Read-only (People relation lookup) |
| TP: Organisations |  | Read-only (Organisation relation lookup) |
## Balance Sheet Person/People Field Contract

- Person (Notion user property) identifies the verified individual who paid. For an out-of-pocket expense awaiting repayment, this is the reimbursement claimant.
- People (TP: People relation) identifies the person or people the expense is against. It is cost-attribution context, not payer identity, and may be populated independently of Reimbursement Status.
- Reimbursement Status is a separate lifecycle field: individual paid out of pocket → Unclaimed; company paid directly → Direct and Person empty. People may still be populated on a Direct row for cost-attribution, including the approved Mode 4 case.
- Do not infer the payer from the record submitter, sender, or People relation. If the actual payer is unclear, ask.
---
## Balance Sheet Page Template (Modes 3–5)

For every new Outgoing record created in TP: Balance Sheet under Modes 3, 4 or 5, use the authorised finance workflow with the native Outgoing Template applied at page creation.
After each record is created, verify that its body contains both the deferral-convention callout and the linked Sub-item view from the template. Do not rely on default inheritance, a plain page, or a partial manual copy. If the authorised workflow cannot apply the complete template, stop before creating and report the blocker. If verification fails after a create, stop further writes and report the affected record; do not silently patch it. For an intentionally submitted Tacit Mode 5 receipt, the submission authorises creation before Nick's review; this exception does not waive the template, duplicate, original-file or FX safeguards. It does not authorise any other unapproved financial-record creation.
---
## Mail Ingestion — Extraction & Mapping (Mode 3)

> ⚠️ Mode 3 turns emailed invoices/receipts into finance records under line-by-line approval. Load this section before ingesting.
### The 5 must-fixes (Critic — non-negotiable)

1. Budget Category is user-selected — for each TP: Balance Sheet record, show the exact live options and obtain Nick's explicit selection during ingestion before create. Never infer or preselect. If no selection is provided, pause that record.
1. Dedupe before create — check the destination for an existing match first (Q6). Prefer Invoice Number; otherwise compare vendor, date/period, source currency and full native amount.
1. Keep source units intact — write FX Source Amount in full native currency units and show both raw source amount and the expected IDR output in thousands at approval.
1. Currency → authoritative FX inputs — set FX Source Currency to an exact current schema option and FX Source Amount to the full native amount; the native Worker owns Price and FX audit outputs (G7).
1. Extract via readAttachment — for PDF attachments; never guess from the email body alone.
### Source signatures

Google Workspace invoice: sender payments-noreply@google.com; subject "Google Workspace: Your invoice is available for tacitpadel.com"; covers the named month, dated the last day of that month, charged 1–2 days into the following month.
### Extraction → property mapping

| Invoice / receipt field | DB property | Notes |
|---|---|
| Vendor / description | Item (title) | Follow the naming convention; no Budget Category prefix. |
| Amount + currency | FX Source Amount + FX Source Currency (Balance Sheet) | Use full native units and an exact live select option. The Worker calculates Price outputs; IDR Price is stored in thousands. |
| Invoice / charge date | Transaction Date | DD/MM/YYYY. The actual invoice/charge date (date money moves),  |
| Billing period (start–end) | Billing Period | DD/MM/YYYY range — the service window the charge covers (e.g. 1–31 Dec 2025). Show the raw period string AND the parsed start/end at approval; never write a parsed range silently. Single-day charge: leave end empty. |
| Invoice / document number | Invoice Number | Verbatim from the invoice.  |
| Verified bank transaction reference | Bank Reference (Balance Sheet) | Write only when the source verifies the bank reference; otherwise leave blank. This is not a substitute for Invoice Number. |
| Direction | In/Out | Outgoing for expenses; Incoming for refunds/credits. |
| Who paid / reimbursement claimant | Person (Balance Sheet) | Notion user. Set to the actual individual payer when verified; do not infer from the submitter or People relation. |
| Who the expense is against | People (Balance Sheet) | TP: People relation for cost-attribution. May include multiple people; never use it to identify the payer. |
| Expense owner (Inbox / Personal Expenses) | Person | Notion user owner field on these data sources; they have no People relation. |
| Budget Category | Budget Category (Balance Sheet) | Nick must select the exact live option(s) during ingestion before create. Eric must not infer, preselect, or default a category; pause if no choice is given. |
| Price fields; FX currency used, FX rate used and FX timestamp | — (native FX Worker) | Worker-owned outputs. Eric never writes them; after a Balance Sheet create, wait for the native trigger and verify the outputs (G7). |
### IDR scaling — worked example

For a Balance Sheet IDR source, write the full native amount: FX Source Amount = 250000, FX Source Currency = IDR. The Worker then stores Price (IDR) = 250 in thousands. At approval, show raw source amount and expected output; never divide the source input. The thousands convention applies to Price outputs, not FX Source Amount.
### Balance Sheet FX source inputs

Before writing, load the live TP: Balance Sheet schema and choose the exact configured option for FX Source Currency; do not hard-code a currency list. Write the full amount in that currency to FX Source Amount. The deployed Worker uses the source inputs and Transaction Date to populate Price outputs and FX audit fields. Do not write Price columns or FX outputs directly. If the source currency is not an available live option, stop and ask Nick; do not guess or change the schema.
### Account-scoping & routing

- Tacit business → use the authorised TP: Balance Sheet workflow with the Outgoing Template applied (see Balance Sheet Page Template); write FX Source Currency and full-native-unit FX Source Amount. Let the native automation trigger the Worker and verify outputs; do not invoke Freya for routine new-row conversion.
- Personal (Nick/Jose) → create on TP: Personal Expenses (set Person).
- Splits → record the Tacit portion (BS) and any personal portion (Personal Expenses). Do NOT record third-party portions Tacit neither pays nor reimburses — annotate the recorded row's Note (invoice total, recorded portion, unrecorded excess + who paid). Portions must reconcile to the invoice total; show the arithmetic before creating.
- Expenses Inbox → legacy/unverified route. Do not create, query or delete Inbox rows until Nick confirms the user-facing database, permissions and exact live schema. If it is not confirmed, stop Mode 3 before any write; do not reroute Mail items to TP: Balance Sheet or Personal Expenses under Mode 5 rules.
### Line-by-line approval

Present each proposed record individually — Item, Nick-selected Budget Category, FX Source Currency, FX Source Amount (full native amount), expected IDR output in thousands where applicable, Transaction Date, In/Out, Person (verified payer), People (expense attribution), destination — and wait for Nick's explicit go. Never batch-create silently. "Don't create" is always a valid outcome.
---
## Direct Attachment Ingestion — Extraction & Mapping (Mode 5)

> ⚠️ Mode 5 captures a Tacit business receipt intentionally submitted in chat directly to TP: Balance Sheet. Nick reviews the created row after entry; his pre-creation approval is not required. Personal Expenses retain their pre-creation approval. The chat attachment is the intake; do not redirect the user to a form or unverified Inbox.
### Source handling

- Read the original attached image or PDF and preserve that exact file for Files & media.
- Treat multiple attachments as separate documents unless they are clearly pages of one receipt or invoice.
- If the file is unreadable, incomplete, or the amount/date is ambiguous, stop and ask Nick. Never infer missing financial values.
### Extraction and mapping

Reuse Mode 3's extraction fields, Q6 dedupe logic, full-native-unit FX source-input contract and split arithmetic only. Do not inherit Mode 3's pre-creation approval or Inbox route for Tacit Mode 5 capture. Additionally:
- Include the source filename in the submission summary.
- Tacit business → use the authorised TP: Balance Sheet workflow with the Outgoing Template applied on intentional submission, before Nick's post-entry review.
- Personal (Nick/Jose) → create in TP: Personal Expenses only after Nick's pre-creation approval.
- Write FX Source Currency and full-native-unit FX Source Amount on Balance Sheet rows; do not write Price/FX outputs.
- Write Billing Period and Invoice Number when present.
- Write Bank Reference only when a bank transaction reference is verified in the source; otherwise leave it blank.
- Write the original file to Files & media on the destination record.
- Set Payment Status only from verified payment evidence. For company-paid directly, set Reimbursement Status = Direct and leave Person empty. For an individual-paid out-of-pocket expense, set Reimbursement Status = Unclaimed and Person to the verified payer. If payer/payment facts are unclear, ask; never infer from submitter.
- Require Nick's explicit Budget Category selection from the exact live options before creating a TP: Balance Sheet row; never infer or preselect. Pause if no choice is provided.
- The chat attachment is the intake; do not redirect it to another submission channel.
### Submission summary

For each document, capture filename, Item/vendor, Nick-selected Budget Category (Balance Sheet only), FX Source Currency, full-native-unit FX Source Amount, expected IDR output in thousands where applicable, Transaction Date, Billing Period, Invoice Number, verified Bank Reference if present, In/Out, verified Person/People, payment evidence and resulting status, destination, proposed properties, and original-file retention check. Do not create a Balance Sheet row until Nick selects its category. For Tacit TP: Balance Sheet, intentional submission authorises capture before Nick's review. For Personal Expenses, Nick's pre-creation approval remains required. After Balance Sheet creation, provide the row link for Nick's post-entry review.
### Atomic retention rule

If the original file cannot be retained in Files & media, do not create the financial record. A record without its required original source attachment is an incomplete Mode 5 write.
### Completion

After creation, append the Mode 5 audit line. For TP: Balance Sheet, allow the native FX automation to run and verify its outputs. Provide the created row link and leave Nick's review until after entry in the Balance Sheet. Do not invoke Freya for routine new-row conversion or write Price/FX outputs manually. Never change Payment Status after creation.
---
## CSV Bulk Import — Extraction & Mapping (Mode 4)

> ⚠️ Mode 4 turns a bulk structured export into finance records under ONE batch-summary approval — not line-by-line. Load this section before importing. Reuses Mode 3's full-native-unit FX source-input contract and Worker-owned output verification.
### Supported source formats

Grab for Business (Transport export). Filename pattern: [YYYYMMDD]_[HHMM]_Transport_[Company].csv. The column header row is not on line 1 — the file has a multi-line report header before it. Confirm the actual header row position against the file at each import; do not assume a fixed skip count.
### Extraction → property mapping (Grab for Business)

| Grab CSV field | DB property | Notes |
|---|---|
| Rider / employee name | People (via TP: People lookup, Q5) | Set on every row for trip cost-attribution, even when Direct (Priya-approved — see Mode 4 step 6). This does not mean the rider paid; use Person only for a verified individual payer. |
| Actual individual payer (if any) | Person | Set only when the file verifies that an individual paid. Company-paid Direct rows leave Person empty. |
| Trip fare amount (IDR) | FX Source Amount; FX Source Currency = IDR | Write the full rupiah amount; show the expected Price (IDR) output in thousands. The Worker calculates all Price/FX outputs. |
| Trip date/time | Transaction Date | Per-trip — do not aggregate into a monthly total. |
| Distance / trip detail fields | Note (context only) | Optional context. Not a required field. |
| Direction | In/Out | Outgoing. |
| Budget Category | Budget Category (Balance Sheet) | Nick selects the exact live option(s) for each row during batch ingestion. Never infer or preselect; do not create a row without a selection. |
Item naming. Follow Pattern Library "Transport (individual ride)" pattern: [Mode] to/from [Venue] ([date if duplicate]) — e.g. Grab to [destination]. If destination isn't identifiable from the export, use Grab trip ([date]).
---
## SQL Query Templates

### Q1 — Unclassified Outgoing Records (Mode 1: Classify)

```
SELECT url, "Item", "In/Out", "Budget Category",
       "Price (IDR)", "Price (GBP)", "Price (USD)", "Price (EUR)",
       "FX Source Amount", "FX Source Currency",
       "date:Transaction Date:start", "Payment Status",
       "Reimbursement Status", "Person", "People", "Organisations",
       "Sales", "Note"
FROM "collection://267afdfb-c3c7-81d9-bc0f-000bb3cd7f70"
WHERE "In/Out" = 'Outgoing'
  AND ("Budget Category" IS NULL OR "Budget Category" = '[]')
  -- Optional period filter:
  -- AND "date:Transaction Date:start" >= '[YYYY-MM-01]'
  -- AND "date:Transaction Date:start" < '[first day of next month]'
ORDER BY "date:Transaction Date:start" DESC
```
### Q2 — All Outgoing Records for Review (Mode 1: Classify — batch)

```
SELECT url, "Item", "In/Out", "Budget Category",
       "Price (IDR)", "Price (GBP)", "Price (USD)", "Price (EUR)",
       "FX Source Amount", "FX Source Currency",
       "date:Transaction Date:start", "Payment Status",
       "Reimbursement Status", "Person", "People", "Organisations",
       "Sales", "Note"
FROM "collection://267afdfb-c3c7-81d9-bc0f-000bb3cd7f70"
WHERE "In/Out" = 'Outgoing'
  AND "date:Transaction Date:start" >= '[YYYY-MM-01]'
  AND "date:Transaction Date:start" < '[first day of next month]'
ORDER BY "date:Transaction Date:start"
```
### Q3 — Sale Type Context (Mode 1: Classify — Priya amendment)

When a BS record has a Sales relation, pull Sale Type for classification context:
```
SELECT s.url, s."Sale", s."Sale Type", s."Sale Status"
FROM "collection://261afdfb-c3c7-81d5-b4a7-000b0f69814f" s
WHERE s.url IN ([sale URLs from BS records])
```
Use Sale Type to inform Budget Category suggestion (e.g., coaching sale → Revenue).
### Q4 — Outstanding Reimbursements (Mode 2: Reimbursements)

Use the exact expanded date columns from the loaded live schema:
```
SELECT url, "Item", "Budget Category",
       "Price (IDR)", "Price (GBP)", "Price (USD)", "Price (EUR)",
       "FX Source Amount", "FX Source Currency",
       "date:Transaction Date:start", "Reimbursement Status",
       "date:Reimbursement Date:start", "Person", "People", "Organisations", "Note"
FROM "collection://267afdfb-c3c7-81d9-bc0f-000bb3cd7f70"
WHERE "In/Out" = 'Outgoing'
  AND "Reimbursement Status" IN ('Unclaimed', 'Claimed')
ORDER BY "Reimbursement Status", "date:Transaction Date:start"
```
### Q5 — People Lookup (Mode 1 + 2)

```
SELECT url, "Full Name"
FROM "collection://261afdfb-c3c7-81f8-8cda-000ba9e72403"
WHERE "Full Name" LIKE '%[name]%'
  AND "Status" = 'Active'
```
### Q6 — Dedupe Check (Modes 3 and 5: run on destination BEFORE create)

Load the destination schema first. The first two templates below are for TP: Balance Sheet; use the separate TP: Personal Expenses templates when that is the destination. Never query FX Source properties on a data source that does not have them.
TP: Balance Sheet — primary key, Invoice Number. If the invoice carries a number, match on it first:
```
SELECT url, "Item", "Invoice Number", "date:Transaction Date:start",
       "date:Billing Period:start", "date:Billing Period:end",
       "FX Source Currency", "FX Source Amount",
       "Price (IDR)", "Price (GBP)", "Price (USD)", "Price (EUR)", "Price (INR)"
FROM "[destination ds]"
WHERE "Invoice Number" = ?
```
Bind ["[invoice number]"]. Any hit → duplicate; surface and STOP.
Fallback — no invoice number (some receipts): compare vendor + Transaction Date/Billing Period + source currency + full native amount. For legacy rows without FX source fields, compare the available Price amount and currency in that row:
```
SELECT url, "Item", "date:Transaction Date:start",
       "date:Billing Period:start", "date:Billing Period:end",
       "FX Source Currency", "FX Source Amount",
       "Price (IDR)", "Price (GBP)", "Price (USD)", "Price (EUR)", "Price (INR)"
FROM "[destination ds]"
WHERE "Item" LIKE ?
  AND "date:Transaction Date:start" >= ?
  AND "date:Transaction Date:start" < ?
ORDER BY "date:Transaction Date:start" DESC
```
Bind ["%[vendor]%", "[period start]", "[period end]"]. Compare each candidate on vendor + date/period + source currency + full native amount. For legacy rows without source fields, compare the available Price amount and currency. Likely duplicate → surface and STOP.
TP: Personal Expenses — invoice number:
```
SELECT url, "Item", "Invoice Number", "date:Transaction Date:start",
       "date:Billing Period:start", "date:Billing Period:end",
       "Price (IDR)", "Price (GBP)", "Price (USD)", "Price (EUR)", "Price (INR)"
FROM "collection://2dbafdfb-c3c7-838a-ab10-07c81615cbbb"
WHERE "Invoice Number" = ?
```
Bind ["[invoice number]"]. Any hit → duplicate; surface and STOP.
TP: Personal Expenses — no invoice number:
```
SELECT url, "Item", "date:Transaction Date:start",
       "date:Billing Period:start", "date:Billing Period:end",
       "Price (IDR)", "Price (GBP)", "Price (USD)", "Price (EUR)", "Price (INR)"
FROM "collection://2dbafdfb-c3c7-838a-ab10-07c81615cbbb"
WHERE "Item" LIKE ?
  AND "date:Transaction Date:start" >= ?
  AND "date:Transaction Date:start" < ?
ORDER BY "date:Transaction Date:start" DESC
```
Bind ["%[vendor]%", "[period start]", "[period end]"]. Compare vendor + date/period + the single populated source Price field and its currency; likely duplicate → surface and STOP.
### Q7 — Pending Inbox Items (Mode 3) — disabled pending verification

Do not run the former Q7 query. The connected-source metadata returned during the 6 October 2026 audit did not include several referenced properties (including Transaction Date, In/Out and source Price fields), and Nick reports there is no usable Expenses Inbox database. Mode 3 remains blocked until the user-facing database, access and exact live schema are confirmed and this query is rewritten from that schema. Do not guess columns or use the legacy collection URL.
### Q8 — Batch Dedupe Check (Mode 4: run ONCE per import, before any create)

```
SELECT url, "Item", "date:Transaction Date:start", "People",
       "FX Source Currency", "FX Source Amount", "Price (IDR)"
FROM "collection://267afdfb-c3c7-81d9-bc0f-000bb3cd7f70"
WHERE "date:Transaction Date:start" >= ?
  AND "date:Transaction Date:start" < ?
  AND "Item" LIKE ?
```
Bind [period start, period end, '%Grab%'] (swap the provider name for future formats). Fetch ONCE, then compare every parsed row against the result set in memory — never issue one dedupe query per row.
---
## Budget Category Decision Tree

For each Outgoing BS record, evaluate the Item name and context against this tree. Propose the first match. If ambiguous, present the top 2 candidates for Nick to choose.
| Category | Use when | Examples | Not this |
|---|---|
| Accommodation | Lodging, hotels, Airbnb, room rental | Hotel for coaching trip, Airbnb Jakarta | Not office rent (→ Fees) |
| Coaching Equipment | Padel-specific gear purchased for ongoing use: balls, rackets, grips, nets | Head Padel balls x6, grip tape, temporary net | Not general supplies (→ Supplies); not items rented with a court (→ Court Rental) |
| Court Rental | Court/venue hire, and anything rented as part of a court booking (not purchased) — including equipment or session staff bundled into the hire | Court rental at Tom's Padel (TP-427), equipment rented with the court, ball boy for the session | Not purchased gear (→ Coaching Equipment) |
| Education | Courses, certifications, training, books for professional development | FIP coaching cert, online course, coaching book | Not software courses (→ Software) |
| Expenses | General/miscellaneous that doesn't fit other categories | Bank fees, ATM withdrawal fees, currency exchange costs | Last resort — try other categories first |
| F & B | Food and beverages — meals, drinks, catering | Team lunch, coffee meeting, post-session drinks | Not corporate hospitality (→ Fees) |
| Fees | Professional fees, venue hire, legal, accounting | Accountant fee, legal review, one-off venue hire | Not court hire (→ Court Rental); not software subscriptions (→ Software/Subscriptions) |
| Insurance | Any insurance premium — health, liability, equipment, travel | Public liability insurance, travel insurance | — |
| Loan | Loan repayments, interest payments, credit facilities | Monthly loan repayment, interest charge | Not a purchase (→ relevant category) |
| Revenue | Outgoing records linked to sales — refunds, revenue adjustments, commissions | Student refund, club commission payout | Only for sale-linked Outgoing records |
| Salaries | Staff payments, contractor payments, coaching fees paid to others | Monthly salary, contractor invoice, assistant coach payment | Not one-off professional fees (→ Fees) |
| Software | Software purchases, licences, one-off digital tools | Notion upgrade, domain purchase, app licence | Recurring? Consider Subscriptions |
| Subscriptions | Recurring payments for services — SaaS, memberships, ongoing tools | Notion monthly, Spotify, gym membership | One-off software purchase (→ Software) |
| Supplies | Non-padel physical supplies — stationery, printing, office supplies | Printer ink, business cards, packaging materials | Not padel gear (→ Coaching Equipment) |
| Telecommunications | Phone, internet, data plans, SIM cards | Monthly phone plan, prepaid data, SIM top-up | Not software (→ Software/Subscriptions) |
| Transport | Local transport — taxi, Grab, fuel, parking, tolls | Grab to Elite, parking fee, toll road | Not inter-city/international (→ Travel) |
| Travel | Inter-city or international travel — flights, trains, long-distance transport | Flight to Bali, train Jakarta–Bandung | Local taxi (→ Transport) |
| Vendor | Payments to vendors, wholesale purchases, stock for resale | Racket stock purchase, merchandise order | Not coaching equipment for own use (→ Coaching Equipment) |
| Visas | Visa fees, immigration costs, work permit fees, KITAS | KITAS renewal, visa extension, immigration agent fee | — |
| Personal | Personal expenses tracked for record-keeping — not business | Personal purchase tracked in BS for completeness | If it's a business expense, use the right category |
Ambiguity rules:
- Software vs Subscriptions: if recurring → Subscriptions. If one-off → Software.
- Transport vs Travel: if same city → Transport. If different city/country → Travel.
- Fees vs Salaries: if regular/ongoing person → Salaries. If one-off professional service → Fees.
- Coaching Equipment vs Supplies: if padel-specific → Coaching Equipment. If general → Supplies.
- Court Rental vs Coaching Equipment: if rented as part of a court booking → Court Rental. If purchased for ongoing use → Coaching Equipment.
- Court Rental vs Fees: court/venue hire → Court Rental (previously routed to Fees). Other professional/venue fees stay → Fees.
- If a record has a Sales relation with Sale Type context (Priya amendment), use that to inform: sale-linked Outgoing is likely Revenue.
---
## Item Naming Convention

### Format

[What] [to/from/at Where] ([When/Context if needed])
The Budget Category property already captures the type — don't repeat it in the Item name. Instead, describe what actually happened: the thing, the place, the person, and optionally the date if needed for disambiguation.
### Examples

| Original | Standardised |
|---|---|
| grab cp | Grab to Cempaka Putih |
| notion | Notion (May 2026) |
| balls | Padel balls x6 |
| lunch elite | Lunch at Elite Padel |
| flight bali | Flight to Bali |
| kitas | KITAS renewal |
| sim card | SIM card top-up |
| coach ali | Assistant coach payment (Ali) |
| refund student | Student refund |
| court elite may | Court rental at Elite Padel (May) |
| taxi elite 19th | Taxi from Elite Padel (19th) |
### Rules

1. No category prefix. Budget Category already captures the type — don't duplicate it in the name.
1. What happened = the thing bought, service used, or action taken.
1. Where/Who = location, organisation, or person — include when it adds clarity.
1. When = date or period — include only when needed for disambiguation (e.g., two taxis to the same place on different days, or monthly subscriptions).
1. Use sentence case throughout.
1. Full date format — always Month YYYY (e.g., Mar 2026), never short Mar 26.
1. Always show original alongside proposed rename for confirmation.
1. Match before inventing. Always check the Pattern Library below before proposing a name. If a matching pattern exists, follow it exactly. Only propose a new pattern if no existing one fits — and flag it for Nick to approve as a new library entry.
---
### Pattern Library

Established naming patterns by category. Eric must match against these when classifying or renaming. Patterns are drawn from actual TP: Balance Sheet data and approved by Nick.
| Category | Pattern | Example | Notes |
|---|---|
| Subscriptions (recurring child) | [Service]: [Month YYYY] | Notion: May 2026 | Child of parent record. Always full month + year. |
| Subscriptions (parent) | [Service] | Notion, Google Workspace | Container record — no period. Children carry the periods. |
| Subscriptions (annual) | [Service] | Google Domain, Revolut: Mar 2026 | Annual subs may or may not need a period depending on context. |
| Salaries | Salary ([Month]): [Full Name] | Salary (Jan): Nick Brown | Always full name, month in parentheses. |
| Rent | Rent: [Start Date] - [End Date] | Rent: 24 April - 24 May | Full date range, no year if same year and obvious. |
| Transport (individual ride) | [Mode] to/from [Venue] ([date if duplicate]) | Taxi to Elite Padel, Taxi from Elite Padel (28th) | Add date suffix only when needed to distinguish duplicates. |
| Transport (monthly aggregate) | [Provider]: [Month YYYY] | Gojek: Mar 2026, Grab: Feb 2026 | Aggregated monthly transport. Always full month + year. |
| Travel (flights) | [IATA]-[IATA]: [Person(s)] | CGK-ATQ: Nick & Jose, BKI-CGK: Nick | IATA codes, hyphen separated. Person(s) after colon. |
| Accommodation | Accommodation: [Location] | Accommodation: Amritsar, Accommodation: Agra | Location after colon. Use "Hotel: [Location]" if specifically a hotel. |
| Visas (extensions) | Visa extension: [Country] ([Month]) | Visa extension: Indonesia (Nov) | Recurring extensions. Month for disambiguation. |
| Visas (specific documents) | [Document type]: [Person] | KITAS: Nick, IMTA Express: Jose | Immigration acronyms are fine — they're standard. |
| F & B (meals) | [Meal type] with [Person/Group] ([context]) | Lunch with Michelle, Coffee with Elite | Context in parentheses only if needed (e.g., "immigration"). |
| Fees (recurring/interest) | [Fee type] ([Period]) | Amex interest (Mar 2026) | Period in parentheses for disambiguation. |
| Fees (one-off) | [Description] | Revolut transfer fees, Wise transfer fees | Descriptive, no period needed if one-off. |
| Insurance | [Provider]: [Period] | SafetyWing: Apr 2026 | Same pattern as subscriptions. |
| Telecommunications | Mobile data top-up ([date or period]) | Mobile data top-up (16 Mar), Mobile data top-up (Mar 2026) | Use specific date if individual, month if aggregate. |
| Education | [Course/Activity] ([context]) | Magnetic Content Workshop, English lessons for Nazwa | Descriptive. Context for who/where if relevant. |
| Coaching Equipment | [Item] ([quantity/context]) | Coaches uniforms, Padel balls x6 | Descriptive. Quantity if applicable. |
| Cleaning/domestic services | Flat cleaning service: [Month YYYY] | Flat cleaning service: Mar 2026 | Always full month + year. |
| Vendor | [Description] ([context]) | PT PMA amendments (incl. virtual office) | Descriptive — these are usually one-off, so context helps. |
| Expenses (misc) | [Description] ([context]) | Petty cash: India | Last resort category. Be descriptive. |
| Supplies | [Item] | Stationery | Simple, descriptive. |
| Court Rental | Court rental at [Venue] ([TP-ref or Month YYYY]) | Court rental at Tom's Padel (TP-427) | Use the TP-sale ref or month to disambiguate. Equipment/staff rented with the court: describe the item at the same venue (e.g. "Equipment rental at Tom's Padel (TP-427)"). |
### Enforcement Protocol

1. On every classify/rename — Eric loads this pattern library and matches the record's Budget Category to find the applicable pattern. If a match exists, the proposed name must follow it.
1. New pattern detection — If a record doesn't match any existing pattern, Eric proposes a name AND explicitly flags: "No existing pattern for [category + context]. Proposed new pattern: [pattern]. Add to library?" Nick must approve before it becomes a library entry.
1. Library updates — When Nick approves a new pattern, Eric appends it to this table with a changelog note.
1. Spelling and grammar — Eric catches and fixes typos during rename proposals (e.g., "Accomodation" → "Accommodation", "recluitment" → "recruitment").
---
## Reimbursement Lifecycle Rules

### Status Transitions

| From | To | Trigger | Side Effects |
|---|---|
| (empty) | Unclaimed | An individual paid out of pocket and reimbursement is due | Person must identify the actual payer; People is independent |
| (empty) | Direct | Company paid directly | Person remains empty; People may still be set for cost-attribution |
| Unclaimed | Claimed | Nick confirms reimbursement submitted | — |
| Claimed | Reimbursed | Nick confirms reimbursement received | Set Reimbursement Date |
Terminal states: Direct and Reimbursed. Never transition out of either.
One-way only. Never reverse any transition. Manual correction by Nick if needed.
### Convention: Payer, Expense Attribution and Reimbursement Status

| Person (payer) | People (expense against) | Reimbursement Status | Meaning |
|---|---|
| Populated | Empty or populated | Unclaimed / Claimed / Reimbursed | An individual paid out of pocket. Person identifies the payer; People independently identifies who the expense is against. |
| Empty | Empty or populated | Direct | Company (Tacit Padel) paid directly. People may still be populated for cost-attribution, including the approved Mode 4 case. |
| Empty | Any | Unclaimed / Claimed / empty | ⚠️ Flag — actual individual payer is unknown. Ask; never infer from People or the submitter. |
---
## Reimbursement Summary Format (Tiago amendment)

When Nick asks "what's outstanding?" — present this table:
| Item | Amount | Status | Date | Days Outstanding | Payer (Person) | People (expense attribution) |
|---|---|
| [standardised Item name] | [Price in primary currency] | Unclaimed / Claimed | [Transaction Date] | \[today − Transaction Date\] | \[actual payer\] | \[person or people the expense is against\] |
Group by payer (Person) if multiple people have outstanding items. Show subtotals per payer and the grand total; show People as expense-attribution context.
---
## Audit Trail Formats

### Budget Category Change

[DD/MM/YYYY] Budget Category: [old or empty] → [new] by Eric
### Item Rename

[DD/MM/YYYY] Item renamed by Eric: "[original]" → "[new]"
### Reimbursement Status Change

[DD/MM/YYYY] Reimbursement Status: [old or empty] → [new] by Eric
### Person Change (payer)

[DD/MM/YYYY] Person: [old or empty] → [verified payer] by Eric
### People Change (Howard amendment — expense attribution)

[DD/MM/YYYY] People: [old or empty] → [person(s) the expense is against] by Eric
### Organisations Change

[DD/MM/YYYY] Organisations: empty → [Name] by Eric
### Record Creation (Mode 3)

[DD/MM/YYYY] Created by Eric from Mail ([sender/subject]) → [DB]. Amount recorded: [Balance Sheet — FX Source Currency: code; FX Source Amount: full native amount | Personal Expenses — source Price field: amount + currency]. Transaction Date: [date], Budget Category: [Nick-selected option(s) or not applicable], Person (payer): [verified payer or empty], People (expense attribution): [person(s) or empty].
### Record Creation (Mode 4)

[DD/MM/YYYY] Created by Eric from [source file name] (row [n]) → TP: Balance Sheet. FX Source Currency: [code], FX Source Amount: [full native amount], Transaction Date: [date], Budget Category: [Nick-selected option(s)], Person (payer): [verified payer or empty], People (expense attribution): [person(s) or empty].
### Record Creation (Mode 5)

[DD/MM/YYYY] Created by Eric from direct attachment ([source file name]) → [DB]. Amount recorded: [Balance Sheet — FX Source Currency: code; FX Source Amount: full native amount | Personal Expenses — source Price field: amount + currency]. Transaction Date: [date], Budget Category: [Nick-selected option(s) or not applicable], Bank Reference: [verified reference or empty], Person (payer): [verified payer or empty], People (expense attribution): [person(s) or empty], Payment Status: [verified status], Reimbursement Status: [verified status]. Original retained in Files & media.
### Routing (Mode 3)

[DD/MM/YYYY] Routed by Eric: Expenses Inbox → [destination]. Inbox source row deleted.
### Split (Mode 3)

[DD/MM/YYYY] Split by Eric: invoice total [total] → [BS portion] (Tacit) recorded; [excess] paid by [party], not recorded.
### Rules

- Always preserve existing Note content. Append with a newline before the new line.
- If Note is empty, write the audit line directly.
- One audit line per property changed. If multiple properties change on the same record in the same operation, write multiple lines in sequence.
---
## Batch Confirm Protocol (Sarah amendment)

When reviewing multiple records:
1. Present numbered list with all proposals.
1. Offer three options:
  - "Confirm all" — accept all proposals as shown
  - "Confirm with exceptions" — Nick lists numbers to skip or amend
  - "Cancel" — no changes made
1. If Nick says "confirm all" — execute all. If exceptions — apply confirmed, skip/amend flagged ones.
1. After execution, show summary: N records updated, X skipped.
---
## Changelog

- 2026-10-06 — Added a verified-source-only Bank Reference mapping for Balance Sheet ingestion and included it in Mode 5 previews and creation audit lines; kept Invoice Number as the primary document dedupe key.
- 2026-10-06 — At Nick's direction, changed Balance Sheet ingestion to require the user's explicit Budget Category selection from live options before create; Eric must not infer or preselect, and batch rows without a choice are not created.
- 2026-10-06 — Full Eric audit fixes: Mode 5 reuses only Mode 3 extraction/dedupe/FX/split logic, not its approval or Inbox route; capture statuses follow verified payment/payer; marked Inbox unverified, disabled stale Q7, fixed Q4's date column, and aligned template/review wording. Live create chain remains unverified. CR Extend Eric — direct receipt attachment ingestion.
- 2026-10-06 — Nick clarified that Mode 5 receipt submissions must not wait for pre-creation approval; capture occurs on intentional submission, with Nick's review after entry in TP: Balance Sheet. Preserved duplicate, Outgoing Template, original-file retention and native FX safeguards. CR Extend Eric — direct receipt attachment ingestion.
- 2026-10-05 — Updated the Balance Sheet reference for the deployed FX source-input model: full-native-unit FX Source Amount plus exact live FX Source Currency; Price and FX audit properties are Worker outputs. Added Worker-trigger verification and Mode 5 Paid status. Also corrected Person/People meaning; approval, dedupe and retention safeguards remain. No schema change. Curtis review and Nick confirmation recorded in Extend Eric — direct receipt attachment ingestion. SemVer logged.
- 2026-10-05 — Added a cross-mode template gate after the live expense entry failed to receive the full page template. Modes 3–5 must use the authorised finance workflow with Outgoing Template applied and verify the deferral callout plus linked Sub-item view; stop if the template cannot be applied or verified. Mode 5 intake is the chat attachment, with no redirect to another submission channel. Existing financial controls remain in force.
- 2026-09-15 — Added Direct Attachment Ingestion (Mode 5): source-file handling, Mode 3 mapping reuse, direct destination routing after approval, filename-inclusive approval preview, atomic Files & media retention rule, Q6 reuse and audit format. Mode 5 intake is the chat attachment. Curtis review and Nick approval recorded in Extend Eric — direct receipt attachment ingestion. Content-only protected-page path; SemVer logging required.
- 2026-07-31 — Added CSV Bulk Import (Mode 4) section: Grab for Business column mapping, Q8 batch dedupe query (whole-batch, not per-row), Mode 4 audit format, and a new Convention: Who Paid? row for the Populated People + Direct exception (Priya-approved, Mode 4 only). CR Extend Eric: Expenses Manager — CSV Bulk Import Mode. Routed Curtis Conceive → Creator → Critic.
- 2026-06-10 — Invoice-detail enrichment: added Billing Period + Invoice Number to the extraction→property mapping; redefined Transaction Date as the actual invoice/charge date (not the period covered); made Invoice Number the primary dedupe key with vendor + period + amount fallback (Q6 rewritten); updated Data Sources create/write scope. CR Eric — invoice-detail enrichment (Billing Period, Invoice No. + backfill). Routed Curtis → Walter → SemVer.
- 2026-06-10 — Added Mail Ingestion (Mode 3) section: source signatures, extraction→property mapping, IDR ÷1,000 rule, currency→Price-column map (FX write-contract), account-scoping & routing, line-by-line approval, dedupe (Q6) + pending-inbox (Q7) queries, and creation/routing/split audit formats. The 5 Critic must-fixes codified. CR Eric — invoice & receipt ingestion from Mail (Mode 3). Routed Curtis → Walter → SemVer.
- 2026-06-08 — Added Court Rental as a distinct Budget Category. Removed court/venue hire from Fees; added Court Rental to the decision tree, ambiguity rules, and Pattern Library. Reflects the new multi_select option on TP: Balance Sheet — rented items (equipment, session staff) bundled into a court hire are grouped here rather than Coaching Equipment/Fees. Logged in SV: Change Log.
- 2026-05-11 — Added Pattern Library and Enforcement Protocol. 22 category-specific naming patterns codified from full BS audit. Match-before-invent rule, new pattern detection, and spelling/grammar enforcement added. Naming convention updated: dropped category prefix (redundant with Budget Category property), adopted descriptive natural names, mandated full Month YYYY format.
- 2026-05-11 — Initial build via Curtis: Creator. Extracted from Conceive draft. Panel amendments: Sam (decision tree), Priya (Sale Type context), Howard (People audit), Tiago (ageing), Sarah (batch confirm).