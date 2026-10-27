# TacitOS — Database Use Cases & Skills

**Generated Oct 26, 2026** · Source: live schema + AI: (L3) Skills registry

This document lists every database in the workspace, what it's for, and which skills operate on it.

## How the layers work

| Layer | Role | Writes to Notion? |
|---|---|---|
| **Skill** | Judgement + instruction-following. Reads context, asks the operator questions, applies rules, produces a decision or a prepared instruction | Yes — some do |
| **Native automation** | The dispatcher — fires when a trigger field is set | Sets fields |
| **Worker** | The only deterministic executor — creates Sales, Balance Sheet outcomes, splits money | Yes — financial outcomes |

- **Skill** = procedure the AI follows (judgement + preparation + confirmation)
- **Automation** = the hand-off mechanism
- **Worker** = the executor (deterministic, code)
- **Human** = the approval gate

## The V1 booking flow — who does what

| 🧑 Human (operator) | 🤖 Skill | ⚙️ System action | 📄 Database |
|---|---|---|---|
| Give booking details | Basil verifies details with you, creates the Pending Event, then re-reads and verifies it | Reads and writes the Event | TP: Events |
| Confirm the booking | Polly asks Paid / Promo / Wallet and collects payment details | Re-reads the Event | TP: Events |
| Confirm the payment summary | Polly writes the JSON instruction and sets Status = Payment Processing | Writes to Event Log and sets the Status field | TP: Events |
| — | — | Automation fires | — |
| — | — | Worker creates Sales and Balance Sheet splits; reads the price list (required) and the coach rate (inferred) | TP: Sales; TP: Balance Sheet; TP: Pricing; TP: Hourly Rate |
| — | — | For Wallet payments: selects up to two active wallet sources and draws down the balance | TP: Sales (Wallet 2 / Item relations) |
| Receive the result | Polly re-reads and reports the result back to you | Re-reads the Event | TP: Events |

### The boundary, precisely

- **The human approves** — nothing financial happens without explicit confirmation at the checkpoints
- **The skill prepares** — gathers details, verifies them with you, writes the instruction, sets the trigger
- **The Worker executes** — the only thing that creates Sales rows and Balance Sheet outcomes

So the skill *writes* (the Event, the Event Log instruction, the trigger field), but the *financial execution* — the actual money records — is Worker-only. That's why the contract says "a hold or a stale state is never a reason for a manual financial record": humans and skills aren't supposed to touch the money chain directly.

**One caveat:** this describes the V1 flow only (the ~35% of rows). The legacy path (~65%) doesn't run through this — no Polly, no instruction, no Worker dispatch. That's the incomplete migration we found in the data.

## Known problem — the flow is too slow

⏱️ **Reality check:** the checkpoint-heavy flow takes 5+ minutes per booking via chat. The skills ask too many questions — each field is a separate round-trip. For routine bookings this is too heavy, and an unused safe flow is worse than a lighter one done well.

### Where the time goes

| Slow part | Why it's slow | What it protects |
|---|---|---|
| Basil's verify-details loop | Multiple back-and-forth to confirm type / time / coach / price list | Wrong events |
| Polly's per-field questions | Channel, amount, paid-to, wallet holder, discount % — each asked separately | Wrong money records |
| Final payment summary | Full review + explicit confirm | The financial gate |

### Solution options — fastest first

1. **Notion Forms intake — biggest win.** A native form on TP: Events (or an intake DB): operator picks product, date, coach, channel, paid-to from dropdowns in ~30 seconds, zero chat. The skill validates the filled row and shows ONE confirmation. Guardrail preserved.
2. **Express mode in the skills.** Update Basil/Polly so an operator can paste all details upfront in a structured format (e.g. "Private lesson, Nick, Thu 6pm, paid BCA → Tacit") and go straight to the single summary confirmation. Requires a skill edit — goes through change control (Soren/Clara).
3. **Templates/defaults.** For the standard case (e.g. default private lesson, bank transfer to Tacit) pre-fill usual values; the operator only confirms the diff.
4. **Tiered verification.** Released products get the express path; unreleased products (Player Academy, refunds, cancellations) keep full verification.

### The guardrail that shouldn't move

The **single explicit confirmation before Status = Payment Processing** stays — that's the money gate, and it's what makes the Worker safe. Everything before it is friction that can be compressed.

✅ **Recommendation:** Notion Form + one summary confirmation — moves data entry from chat to a form, keeps the financial gate intact, needs no skill rewrite to start.

---

## All databases at a glance

| # | Database | Props | Category | Use case |
|---|---|---|---|---|
| 1 | TP: Events | 49 | Activities | Sellable things — a course, clinic, or session a customer books |
| 2 | TP: Sales | 199 | Knowledge | Transactions — one row per sale, with all the pay math inside |
| 3 | TP: Balance Sheet | 66 | Knowledge | Ledger — where money totals land |
| 4 | TP: Pricing | 47 | Knowledge | Price lists — what each product costs |
| 5 | TP: Hourly Rate | 29 | Knowledge | Coach rate cards — what coaches earn per hour |
| 6 | TP: Invoices | 18 | Knowledge | Invoices linked to sales (Draft / Sent / Paid) |
| 7 | TP: Schedules | 24 | Activities | Staff scheduling — work, leave, days off, movements |
| 8 | TP: Social Posts | 32 | Storage | Content pipeline — Instagram reels, carousels, posts, stories |
| 9 | TP: Projects | 25 | Activities | Project management — with sub-projects and linked tasks |
| 10 | TP: Tasks | 29 | Activities | Task management — tasks, sub-tasks, change requests, ops shifts |
| 11 | TP: Resources | 45 | Knowledge | Knowledge management — using the C.O.D.E. method (Capture / Organise / Distill / Express) |
| 12 | TP: Announcements | 15 | Knowledge | Team and business updates — TacitOS, Team, Business types |
| 13 | TP: FX Rates | 10 | Worker Driven | Currency conversion rates (GBP, USD, EUR, IDR, INR, SGD, AUD, JPY) |
| 14 | TP: DB Template | 14 | Notion Build | Template for creating new databases |
| 15 | AI: (L2) Routing | 15 | AI | AI routing layer — directs requests to the right skill |
| 16 | AI: (L3) Skills | 23 | AI | Skills registry — all 14 skills live here |
| 17 | AI: (L4) References | 21 | AI | Skill references — source of truth, operating standards, guides |
| 18 | Tacit 2.0 migration | 5 | Future Builds | Migration tracker — layers 0–6, nearly empty |

---

## Database details

### 1. TP: Events — the sellable things

**What it is:** A course, clinic, or session that a customer can book. Every sale targets an event.

**Key fields:**
- Status: Inbox → Rearrange → Pending → Payment Processing → Confirmed / Cancelled
- Sale Type: Private Lesson, Match with Coach, Player Academy, Coaches Academy, Clinic, Play with Coach
- Financial Route: Legacy / Payment V1
- Clinic Level: U8, U14, U18, Introduction, Beginner, Intermediate, Advanced
- Player Academy Tier: Basic, Standard, Premium
- Facility: On Court, Classroom, Gym, TBC

**Relations:**
- Published Price List → TP: Pricing (what it costs)
- Hourly Rate → TP: Hourly Rate (coach rate)
- Sales → TP: Sales (the transactions against this event)
- Projects → TP: Projects
- Tasks → TP: Tasks
- Resources → TP: Resources
- Sub Event / Parent Event → self-hierarchy

**Skills that operate on it:**
- **Basil: Booking Manager** (live) — creates and verifies events
- **Polly: Payment Manager** (live) — re-reads the event for payment confirmation

---

### 2. TP: Sales — the transactions

**What it is:** One row per sale. Contains all the pay math — 60 formulas split the money between coach, court, club, Tacit, VAT, and wallet.

**Key fields:**
- Sale Type: Private Lesson, Match with Coach, Player Academy, Coaches Academy, Clinic, Play with Coach
- Sale Status: Confirmed, Cancelled, Late Cancellation, No-Show
- Financial Route: Legacy / Payment V1
- Payment Channel: Club, Wallet, Courtside, Bank transfer, Ayo, Reclub, Cost
- Payment Processing Status: Draft → Ready to process → Processing → Processed / Exception
- Paid To: Club, Tacit, N/A (Cost Sale)
- Target Financial Purpose: Revenue Charge, Coach Compensation, Court Settlement, Wallet Funding
- Sale Role: Wallet, Cost, Revenue
- Shadow Validation State: Ready, Blocked, Mismatch
- Wallet Type: EPA Late 26, Proklamasi 26, 1945 26, Garuda 26, Merdeka 26, Abadi 26
- Created Via: Automation, Basil, Manual

**Relations:**
- Events / Target Financial Unit → TP: Events
- Price List → TP: Pricing
- Balance Sheet → TP: Balance Sheet
- Invoice → TP: Invoices
- Tasks → TP: Tasks
- Projects → TP: Projects
- Resources → TP: Resources
- Group / Item / Wallet 2 / Wallet 2 Item → self-hierarchy

**Skills that operate on it:**
- **Basil: Booking Manager** (live) — creates sale rows during booking
- **Polly: Payment Manager** (live) — prepares and verifies payment instructions
- **Felix: Financial Flow** (live, planning-only) — defines waterfall changes
- **Alan: Accountant** (draft) — reviews and reconciles sales-linked records

**Deployed Worker:** `tacit-payment-v1` — the only component that creates financial outcomes in Sales

---

### 3. TP: Balance Sheet — the ledger

**What it is:** Where money totals land. Tracks revenue, costs, and the running balance.

**Key fields:**
- Record Type: Transaction, Forecast, Container
- In/Out: Incoming, Outgoing
- Audit Status: Not started → Blocked → In progress → Checked
- Audit Batch: Sales-linked Revenue, Sales-linked Cost, Partner Settlement, Subscription, Transport, Payroll, Loan, Other
- Payment Status: Unpaid → Deferred → Paid → Reconciled
- Reimbursement Status: Unclaimed → Claimed → Direct → Reimbursed
- Recurring: Annually, Monthly, N/A
- FX currency: GBP, USD, EUR, IDR, INR, SGD, AUD, JPY
- Budget Category: Accommodation, Coaching Equipment, Education, Expenses, F & B, Fees, Insurance, Loan

**Relations:**
- Sales → TP: Sales
- Projects → TP: Projects
- Sub-item / Parent item → self-hierarchy

**Skills that operate on it:**
- **Alan: Accountant** (draft) — reviews and reconciles balance sheet actuals
- **Felix: Financial Flow** (live, planning-only) — defines waterfall changes that affect BS rollups

---

### 4. TP: Pricing — the price lists

**What it is:** Price lists for each product. Each event links to a price list to know what it costs.

**Key fields:**
- Status: Proposed → Active → Previous
- Database Group: Storage, Activities, Knowledge, Tagging, Build, AI, SV

**Relations:**
- Published Events → TP: Events (two-way)
- Applied Sales → TP: Sales
- Sub-item / Parent item → self-hierarchy

**Skills that operate on it:**
- **Felix: Financial Flow** (live, planning-only) — defines pricing change routes

---

### 5. TP: Hourly Rate — the coach rate cards

**What it is:** What coaches earn per hour. Links to events to determine coach compensation.

**Key fields:**
- Database Group: Storage, Activities, Knowledge, Tagging, Build, AI, SV

**Relations:**
- Events → TP: Events
- Sub-item / Parent item → self-hierarchy

**Skills that operate on it:**
- **Felix: Financial Flow** (live, planning-only) — defines rate-card change routes

---

### 6. TP: Invoices — the invoices

**What it is:** Invoices linked to sales. Tracks Draft → Sent → Paid.

**Key fields:**
- Status: Draft, Sent, Paid

**Relations:**
- Sales → TP: Sales

**Skills that operate on it:**
- **Alan: Accountant** (draft) — checks invoices against payment evidence

---

### 7. TP: Schedules — staff scheduling

**What it is:** Staff work schedules, leave, and movements.

**Key fields:**
- Record Type: Schedule, Movement
- Entry Type: Work, Annual Leave, Other Leave, Day Off, Unavailable

**Relations:**
- Sub-item / Parent item → self-hierarchy

**Skills that operate on it:**
- None directly assigned (operational, managed by users)

---

### 8. TP: Social Posts — content pipeline

**What it is:** Instagram content pipeline — reels, carousels, posts, stories.

**Key fields:**
- Format: Reel, Carousel, Static Post, Story
- Content Type: Coach Tip, Testimonial, Promotion, Event Coverage, Behind the Scenes, Community, Brand, Q&A
- Pillar: Coaching Tips, Developing Coaches, Building Our Home, Milestones, Our Journey, Philosophy, The People, Proof / Transformation, Vision / Club Network, Community / UGC
- Status: Develop → Plan → Shoot → Edit → Approval → Scheduled → Published / Cancelled

**Relations:**
- Resources → TP: Resources
- Tasks → TP: Tasks
- Self → self-hierarchy

**Skills that operate on it:**
- **Design Tacit Graphics** — creates marketing graphics and copy for social posts

---

### 9. TP: Projects — project management

**What it is:** Projects with sub-projects, linked to tasks, events, sales, and balance sheet entries.

**Key fields:**
- Status: Not started, In progress, Done

**Relations:**
- Balance Sheet → TP: Balance Sheet
- Events → TP: Events
- Sales → TP: Sales
- Tasks → TP: Tasks
- Resources → TP: Resources
- Sub Project / Parent Project → self-hierarchy

**Skills that operate on it:**
- **Peter: Project Manager** (live) — manages projects and sub-projects

---

### 10. TP: Tasks — task management

**What it is:** Tasks, sub-tasks, change requests, and ops shifts.

**Key fields:**
- Status: Inbox → Not started → Awaiting → Paused → In progress → Review → Done / Cancelled
- Priority: High, Medium, Low
- Task Type: Task, Sub Task, Change Request, Ops Shift

**Relations:**
- Sales → TP: Sales
- Events → TP: Events
- Projects → TP: Projects
- Resources → TP: Resources
- Social Posts → TP: Social Posts
- Sub Task / Parent Task → self-hierarchy

**Skills that operate on it:**
- **Tasmin: Task Manager** (live) — manages tasks and sub-tasks
- **Clara: Change Manager** (live) — manages change requests

---

### 11. TP: Resources — knowledge management

**What it is:** Knowledge base using the C.O.D.E. method (Capture, Organise, Distill, Express).

**Key fields:**
- Resource Type: Resources, Journal, Ideas, Curiosity, Session Review, Unreasonable, Reference, Asset
- C.O.D.E.: Capture, Organise, Distill, Express
- Randomiser Mode: Scheduled, Cadence, Random

**Relations:**
- Events → TP: Events
- Social Posts → TP: Social Posts
- Tasks → TP: Tasks
- Sales → TP: Sales
- Projects → TP: Projects
- Sub Resource / Parent Resource → self-hierarchy

**Skills that operate on it:**
- None directly assigned (knowledge management, used by users)

---

### 12. TP: Announcements — team updates

**What it is:** Team and business announcements.

**Key fields:**
- Announcement Type: TacitOS Update, Team, Business

**Relations:**
- Sub Announcement / Parent Announcement → self-hierarchy

**Skills that operate on it:**
- None directly assigned (communication, managed by users)

---

### 13. TP: FX Rates — currency conversion

**What it is:** Currency conversion rates. Standalone — no relations to other databases.

**Key fields:**
- 10 properties (currency rates)

**Relations:** None (isolated)

**Skills that operate on it:**
- None directly (Worker-driven; referenced by Balance Sheet FX formulas)

---

### 14. TP: DB Template — database template

**What it is:** Template for creating new databases. Not live data.

**Relations:**
- Sub-item / Parent item → self-hierarchy

**Skills that operate on it:**
- **Walter: Workspace Wiring** (live) — defines controlled database delivery routes

---

### 15. AI: (L2) Routing — AI routing layer

**What it is:** Routes requests to the right skill. Part of the AI triad (L2 → L3 → L4).

**Relations:**
- Sub-item / Parent item → self-hierarchy

**Skills that operate on it:**
- **Soren: Skill Builder** (live) — builds and maintains the AI layer

---

### 16. AI: (L3) Skills — skills registry

**What it is:** The registry of all 14 skills. Each skill is a page in this database.

**Key fields:**
- Class: Lite, Standard, Controlled, High-risk
- Lifecycle: Draft → In review → Testing → Active → Held → Superseded → Retired
- Function: Operating, Build, Control

**Relations:**
- References → AI: (L4) References
- Sub-item / Parent item → self-hierarchy

**Skills that operate on it:**
- **Soren: Skill Builder** (live) — builds and governs draft skills

---

### 17. AI: (L4) References — skill references

**What it is:** Reference documents for skills — source of truth, operating standards, implementation guides, evidence, examples.

**Key fields:**
- Authority: Source of truth, Operating standard, Implementation guide, Evidence, Example
- Lifecycle: Draft → In review → Held → Current → Superseded → Historical

**Relations:**
- Skills served → AI: (L3) Skills
- Sub-item / Parent item → self-hierarchy

**Skills that operate on it:**
- **Soren: Skill Builder** (live) — builds supporting references

---

### 18. Tacit 2.0 migration — migration tracker

**What it is:** Tracks the V2.0 migration across 7 layers. Nearly empty — likely stalled.

**Key fields:**
- State: Draft, Agreed, Superseded
- Layer: 0 Control plane, 1 Data model, 2 Access model, 3 Derivation, 4 Execution, 5 Interface, 6 Documentation, Programme
- Type: Standard, Register, Target state, Working context, Unit of work, Decision, Reference

**Relations:** None (isolated)

**Skills that operate on it:**
- None directly (migration governance, managed by humans)

---

## All skills at a glance

| # | Skill | Status | Function | Primary databases |
|---|---|---|---|---|
| 1 | Basil: Booking Manager | Live | Operating | Events, Sales |
| 2 | Polly: Payment Manager | Live | Operating | Events, Sales |
| 3 | Felix: Financial Flow | Live, planning-only | Build | Sales, Balance Sheet, Pricing, Hourly Rate |
| 4 | Alan: Accountant | Draft | Operating | Balance Sheet, Invoices |
| 5 | Warren: Worker Engineer | Live | Build | Workers (not a DB — builds deployed Workers) |
| 6 | Sally: Systems Integration Reviewer | Live | Control | Cross-DB (read-only review) |
| 7 | Tess: Technical Trace | Live | Control | Cross-DB (technical tracing) |
| 8 | Walter: Workspace Wiring | Live | Build | DB Template, workspace config |
| 9 | Tasmin: Task Manager | Live | Operating | Tasks |
| 10 | Peter: Project Manager | Live | Operating | Projects |
| 11 | Clara: Change Manager | Live | Control | Tasks (Change Requests) |
| 12 | Curtis: Capability Assessor | Live | Control | Cross-DB (capability assessment) |
| 13 | Soren: Skill Builder | Live | Build | AI: (L3) Skills, AI: (L4) References |
| 14 | Design Tacit Graphics | Live | Operating | Social Posts, Resources |

---

## Skills by function

### Operating skills (do the work)
- **Basil** — booking (Events, Sales)
- **Polly** — payment (Events, Sales)
- **Alan** — accounting (Balance Sheet, Invoices) — *draft*
- **Tasmin** — tasks (Tasks)
- **Peter** — projects (Projects)
- **Design Tacit Graphics** — graphics (Social Posts, Resources)

### Build skills (create/change things)
- **Felix** — financial waterfall (Sales, Balance Sheet, Pricing, Hourly Rate) — *planning-only*
- **Warren** — Workers (builds deployed Workers, not a DB)
- **Walter** — workspace wiring (DB Template, workspace config)
- **Soren** — skill building (AI: L3 Skills, AI: L4 References)

### Control skills (review/govern)
- **Sally** — integration review (cross-DB, read-only)
- **Tess** — technical trace (cross-DB, read-only)
- **Clara** — change management (Tasks / Change Requests)
- **Curtis** — capability assessment (cross-DB, read-only)

---

## Which databases have no skill?

| Database | Status |
|---|---|
| TP: Schedules | No skill assigned — managed by users |
| TP: Resources | No skill assigned — knowledge management, user-driven |
| TP: Announcements | No skill assigned — communication, user-driven |
| TP: FX Rates | No skill assigned — Worker-driven, referenced by BS formulas |
| Tacit 2.0 migration | No skill assigned — migration governance, human-managed |

---

*Generated from live schema + AI: (L3) Skills registry · Oct 26, 2026*
