#!/usr/bin/env python3
"""Generate the ultra-detailed 'What the work starts with' breakdown PDF."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
)

OUTPUT = "/Users/dhirenkirpalani/Downloads/tacit-padel-notion/First_Stage_Breakdown.pdf"

styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    "TitleX", parent=styles["Title"],
    fontSize=20, leading=24, spaceAfter=6, textColor=colors.HexColor("#0F172A"),
)
subtitle_style = ParagraphStyle(
    "SubX", parent=styles["Normal"],
    fontSize=10, leading=13, spaceAfter=16, textColor=colors.HexColor("#475569"),
    alignment=TA_CENTER,
)
item_style = ParagraphStyle(
    "ItemX", parent=styles["Heading1"],
    fontSize=14, leading=18, spaceBefore=16, spaceAfter=6,
    textColor=colors.HexColor("#1E3A8A"),
)
sub_style = ParagraphStyle(
    "Sub2X", parent=styles["Heading3"],
    fontSize=10.5, leading=13, spaceBefore=10, spaceAfter=4,
    textColor=colors.HexColor("#334155"),
)
body_style = ParagraphStyle(
    "BodyX", parent=styles["Normal"],
    fontSize=9.5, leading=13.5, spaceAfter=6,
)
small_style = ParagraphStyle(
    "SmallX", parent=body_style,
    fontSize=8.5, leading=11, textColor=colors.HexColor("#475569"),
)
deliv_style = ParagraphStyle(
    "DelivX", parent=body_style,
    fontSize=9.5, leading=13, textColor=colors.HexColor("#065F46"),
    backColor=colors.HexColor("#D1FAE5"),
    borderPadding=6, spaceBefore=4, spaceAfter=10,
)
note_style = ParagraphStyle(
    "NoteX", parent=body_style,
    fontSize=9, leading=12.5, textColor=colors.HexColor("#7C2D12"),
    backColor=colors.HexColor("#FEF3C7"),
    borderPadding=6, spaceBefore=6, spaceAfter=10,
)
cell_style = ParagraphStyle(
    "CellX", parent=body_style, fontSize=9, leading=12.5, spaceAfter=0,
)
head_style = ParagraphStyle(
    "HeadX", parent=body_style, fontSize=9.5, leading=12.5, spaceAfter=0,
    textColor=colors.white,
)

def P(text, style=body_style):
    return Paragraph(text, style)

def B(text):
    return Paragraph(f"• {text}", ParagraphStyle(
        "BulX", parent=body_style, leftIndent=14, spaceAfter=3
    ))

def Q(text, why=None):
    s = f"• <b>{text}</b>"
    if why:
        s += f"<br/><i>{why}</i>"
    return Paragraph(s, ParagraphStyle(
        "QX", parent=body_style, leftIndent=14, spaceAfter=5
    ))

def C(text):
    """Checkbox item"""
    return Paragraph(f"☐ {text}", ParagraphStyle(
        "CheckX", parent=body_style, leftIndent=14, spaceAfter=3
    ))

def Goal(text):
    return Paragraph(f"<b>End of week:</b> {text}", deliv_style)

def Deliv(text):
    return Paragraph(f"<b>Deliverable:</b> {text}", deliv_style)

def make_table(header, rows, widths):
    data = [[P(h, head_style) for h in header]]
    for row in rows:
        data.append([P(str(c), cell_style) for c in row])
    t = Table(data, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    return t

story = []

story.append(P("First Stage — Detailed Breakdown + First Month Checklist", title_style))
story.append(P(
    "Tacit Padel × Notion — the proposal's first stage, expanded<br/>"
    "Five work items, what each actually means, and the week-by-week plan to execute them",
    subtitle_style
))

story.append(P(
    "This expands the proposal section 'What the work starts with'. The first stage is to "
    "understand and improve Tacit's Notion environment — not customer-facing applications. "
    "The first milestone is an internal Notion system that is organised, understandable and "
    "useful to the team. Specific database and versioning priorities get agreed together after "
    "the current setup has been reviewed.",
    body_style
))

# ============================================================
# ITEM 1
# ============================================================
story.append(P("Item 1 — Learn how Notion databases work", item_style))
story.append(P("Source databases vs linked views; how the UI connects to the underlying data", small_style))

story.append(P("What it actually means", sub_style))
story.append(P("Notion separates data from presentation:"))
story.append(B("<b>Source database</b> — the actual table holding the data. Lives at a specific page. Owns the properties, the rows, the formulas."))
story.append(B("<b>Linked view</b> — a window into that database from elsewhere. A filtered/sorted display embedded in another page. The same source DB can appear in ten places as ten different views."))
story.append(B("<b>The UI is a lens, not the data</b> — filtering a view doesn't change the data; deleting a view doesn't delete the data. But deleting the source database deletes everything every linked view was showing."))

story.append(P("The mechanics to know cold", sub_style))
story.append(B("<b>Relations</b> — two-way links between databases (e.g. TP: Sales ↔ TP: Events: a Sale row points at an Event, and the Event shows its linked Sales). This is how Tacit's chain works: Event → Sale → Hourly Rate → Balance Sheet."))
story.append(B("<b>Rollups</b> — aggregate properties pulled through a relation (e.g. 'sum of all Sale amounts linked to this Event'). Computed live — the things that break on null values. The .first()/.last() fragility behind the dead Sales Update Button lives here."))
story.append(B("<b>Formulas</b> — computed properties on a DB. Can't be read reliably by the API (returns opaque references — why Ivy does screenshots). Formulas live on the source DB and propagate to every view."))
story.append(B("<b>Property types</b> — text, number, select, relation, rollup, formula, person, date, status. Each behaves differently in the API. person and created by properties matter for permissions 3.0."))
story.append(B("<b>Templates</b> — pre-built page structures inside a DB (e.g. the Tasmin task template with its 'Creation Skill' notice)."))

story.append(P("What to map specifically at Tacit", sub_style))
story.append(B("Which of TP: Events, Sales, People, Organisations, Hourly Rate, Balance Sheet, Tasks are source databases vs views pointing at them."))
story.append(B("The relation graph: what links to what, and in which direction."))
story.append(B("Where the formula chains live — the Sales → Hourly Rate → Balance Sheet waterfall is the critical one."))
story.append(B("Which dashboards/views the team actually opens daily — those are the UI surfaces you can't break."))

story.append(P("Pitfalls to watch for", sub_style))
story.append(B("<b>Deleting a 'table' that's actually the source</b> — looks identical to a linked view until you check. Always verify before removing anything."))
story.append(B("<b>Editing a formula property</b> that feeds three downstream DBs — changes cascade silently."))
story.append(B("<b>Relation vs rollup confusion</b> — a relation links rows; a rollup aggregates through a relation. Fixing 'the number is wrong' requires knowing which layer the bug is in."))
story.append(B("<b>Views don't protect data</b> — a filtered view showing 'only confirmed sessions' still exposes the whole DB to anyone with access. This connects to Item 3."))

story.append(Deliv("A written system map: source DBs, their relations, their formulas, the formula chains, and which views surface them. The foundation document for everything else — and the first page of the handover record (Item 5)."))
story.append(P("<b>Videos to lean on:</b> #1 (Your Notion Setup For 2026) and #2 (the 10-hour tutorial — jump to the databases/relations chapters).", small_style))

# ============================================================
# ITEM 2
# ============================================================
story.append(PageBreak())
story.append(P("Item 2 — Review how Tacit uses Notion AI", item_style))
story.append(P("Prompting, current capabilities and limitations, and how Notion's AI features are changing", small_style))

story.append(P("(a) Audit the skill inventory", sub_style))
story.append(P("Tacit runs ~40 skills through one agent (HAL). For each, assess:"))
story.append(B("<b>Status</b> — live, broken, or mid-migration? (Skills 2.0 migration is half-done on the live system — Nick's own admission.)"))
story.append(B("<b>Type</b> — execution-only (deterministic → Worker candidate) or judgement-based (stays as AI)? The audit already classified them: SemVer Logger, duplicate checks, FX logic → Workers; Basil's person-matching, Eric's classification, Faye's framing → stay AI."))
story.append(B("<b>Prompt quality</b> — well-engineered (explicit assumptions, progressive disclosure, one clear job) or a bloated mega-prompt? The 'curse of instructions' — too many parallel rules = worse output — is the failure mode to look for."))
story.append(B("<b>Layer</b> — L1 utilities (Log Router), L2b main skills (Basil, Freya, Ivy, Eric, Faye), L3 reference pages. Naming convention: 'Name: Function', first letter alliterates with the domain."))

story.append(P("(b) Test actual capabilities and limits", sub_style))
story.append(B("<b>AI can't read formula results</b> — the API returns opaque references. This is why Ivy runs in screenshot mode."))
story.append(B("<b>Formula engine null-safety</b> — .first()/.last() on relations statically blocked in automations; killed the Sales Update Button in April 2026; currently exposed on Confirm: Pattern B."))
story.append(B("<b>Cost model</b> — skills run manually through HAL = cheap. Standing/scheduled custom agents = credits. Workers = separate credits pool, cheap."))
story.append(B("<b>Linked views / layouts</b> — the agent API can't manipulate everything (per the Dev Day material, no linked-view or layout operations)."))

story.append(P("(c) Track how the features are changing", sub_style))
story.append(B("<b>Skills 2.0</b> — Library → Skills tab, skills databases with descriptions, slash-command invocation, agent auto-selection by description, Discover tab, usage counts, npx skills add export."))
story.append(B("<b>Workers</b> — Tool/Sync/Webhook triggers, ntn CLI, sandboxed TypeScript."))
story.append(B("<b>Agent API/SDK</b> — external apps can open sessions with Custom Agents; external agents (Claude, Cursor) can sit inside the workspace."))
story.append(B("<b>Memory</b> — the four-doc pattern (Project Brief / Where We Are / Decisions / Domain Language) for project continuity."))

story.append(P("(d) The Skills 2.0 migration specifically", sub_style))
story.append(P(
    "Nick: 'I started to do the work. I was updating the live system. Didn't have a sandbox. "
    "It's got really messy.' Part of this review is a damage assessment: which skills are on "
    "the new model, which are half-converted, which broke in the transition — then decide "
    "whether to complete the migration or stabilise first. Do not continue migrating on the "
    "live system."
))

story.append(Deliv("A skills register — one row per skill: name, domain, status, judgement-vs-execution classification, migration state (1.0 / 2.0 / broken), fix priority. Doubles as the candidate list for future Worker work."))

story.append(P("Questions for Nick", sub_style))
story.append(Q("What did you hit in the Skills 2.0 migration that made it stall?"))
story.append(Q("Which skills do the team actually run weekly?", "Usage counts in the Library will show this."))
story.append(Q("Is the goal to finish migrating everything to 2.0, or only the ones that earn it?"))
story.append(P("<b>Videos to lean on:</b> #3 (Skills 1.0 — what you inherited), #4 (Skills 2.0 — the target), #9 (memory system), #5 (Dev Day — Workers/agents), #8 (pricing — the cost frame).", small_style))

# ============================================================
# ITEM 3
# ============================================================
story.append(PageBreak())
story.append(P("Item 3 — Review access controls and permissions", item_style))
story.append(P("What can safely be restricted, and where the practical limits are", small_style))

story.append(P("What it actually means", sub_style))
story.append(P("Notion's access model has three eras, and Tacit is pre-3.0:"))
story.append(B("<b>Permissions 1.0</b> — all-or-nothing per database. Someone either sees the whole DB or nothing."))
story.append(B("<b>Permissions 2.0</b> — page-level access (share individual rows manually). Clunky, didn't scale."))
story.append(B("<b>Permissions 3.0</b> — granular database permissions: row-level rules driven by a person or created by property. Business/Enterprise only."))

story.append(P("The 3.0 mechanics — what to test", sub_style))
story.append(B("<b>Set the base restrictive first.</b> Rules can only increase permissions, never reduce them. The DB default starts at No access or Can view, then rules lift specific users per row."))
story.append(B("<b>Rules are person-property-driven.</b> E.g. 'rows where Assignee = you → Can edit.' A coach could edit their own sessions but only view others'. Created by → Can edit is the standard intake pattern."))
story.append(B("<b>Must be configured on the source DB</b> opened as a full page — linked views don't show the controls. Rules then apply across all views automatically."))
story.append(B("<b>Highest permission wins.</b> If a group grants Full access, a page-level rule can't reduce it."))
story.append(B("<b>'Can Create Pages' toggle</b> (March 2026): users with No Access/View/Comment can still create rows — pairs with Created by → Can edit so they can edit what they made. Replaces forms-only intake."))
story.append(B("<b>Gotchas:</b> users with No access can't create linked views via /linked view — embed pre-built views in dashboards for them. Can edit content doesn't appear in page-level rules. Group mentions don't work with the 'Me' filter."))
story.append(B("<b>AI access is members-only</b> — guests can't use Notion AI at all."))

story.append(P("What to assess at Tacit specifically", sub_style))
story.append(B("<b>The roles</b> — who needs to see what: coaches (their sessions, their pay?), ops staff (everything operational), Oscar (finance), Nick (everything), external freelancers."))
story.append(B("<b>The sensitive data</b> — TP: Balance Sheet, TP: Hourly Rate, TP: Sales contain coach pay and financials — the prime candidates for restriction."))
story.append(B("<b>The practical limits</b> — Nick's note says some restrictions 'undermine' the feature. The job: find exactly where 3.0 falls short for Tacit's intended use (property-level hiding limits, linked-view creation limits, guest constraints)."))

story.append(Deliv("A permissions matrix (role × database × level) + implemented rules in the sandbox first, then live — plus a written list of where the feature hit its limits."))

story.append(P("Questions for Nick", sub_style))
story.append(Q("Should coaches see their own pay rates? Other coaches'?"))
story.append(Q("Who besides you and Oscar should see the balance sheet — anyone?"))
story.append(Q("Any external parties needing row-level access (partner clubs, freelancers)?"))
story.append(P("<b>Videos to lean on:</b> #7 (Permissions 3.0), #6 (2.0 — the workaround era it replaced).", small_style))

# ============================================================
# ITEM 4
# ============================================================
story.append(PageBreak())
story.append(P("Item 4 — Tidy databases, fix AI workflows, add versioning", item_style))
story.append(P("Clean up, get the intended workflows working, put a usable versioning approach in place", small_style))

story.append(P("(a) Tidying the databases", sub_style))
story.append(B("Remove dead/unused properties (the 'legacy properties' the job spec mentioned)."))
story.append(B("Remove dead relations and redundant views."))
story.append(B("Fix naming inconsistencies."))
story.append(B("Clean up the half-finished Skills 2.0 migration artifacts."))
story.append(B("<b>Guardrail:</b> tidy in the sandbox or after a documented snapshot — the system is already mid-migration; without a before-state you can't prove what you didn't break."))

story.append(P("(b) Getting the intended AI workflows working", sub_style))
story.append(B("Fix the skills that are broken (the null-safety cascade, the Ivy screenshot workaround)."))
story.append(B("Stabilise whatever Skills 2.0 migration state Nick left mid-flight."))
story.append(B("Apply the 'execution → Worker, judgement → stays AI' split when deciding whether to fix a skill in place or flag it for code."))
story.append(B("<b>Don't fix what isn't broken</b> — the scheduled subscription auto-creates and habit chains work fine on native automation. Leave them."))

story.append(P("(c) Versioning approach", sub_style))
story.append(B("<b>A usable convention:</b> every structural change (new property, changed formula, deleted relation, skill rewrite) gets logged — what changed, why, when, by whom, what version."))
story.append(B("<b>Tools exist in concept:</b> a SemVer Logger/Auditor skill and the Log Router utility (Wendy). Getting those working — or replacing them with something simpler people actually use — is the deliverable."))
story.append(B("<b>Versioning matters doubly:</b> Item 5 (handover) depends on it — the next person needs to reconstruct why the system looks like this, not just what it looks like."))

story.append(Deliv("Tidied DBs + a live change log + a one-page versioning convention (when to bump, what to record, where the log lives)."))

# ============================================================
# ITEM 5
# ============================================================
story.append(P("Item 5 — Keep a clear record: structure, decisions, changes", item_style))
story.append(P("The handover layer — documented well enough for another person to take it over", small_style))

story.append(P("What it actually means", sub_style))
story.append(P(
    "The proposal is explicit: 'Tacit must be able to understand, maintain and hand over the "
    "work if the people involved change.' This is the anti-bus-factor requirement."
))

story.append(P("What the record consists of", sub_style))
story.append(B("<b>System map</b> (from Item 1) — source DBs, relations, formula chains, key views."))
story.append(B("<b>Skills register</b> (from Item 2) — what's live, what it does, its state."))
story.append(B("<b>Decisions log</b> — dated record of consequential choices and why, with superseded decisions preserved and marked. (The memory video's 'Decisions' doc pattern — applied to the workspace itself.)"))
story.append(B("<b>Change log</b> — the versioning output from Item 4."))
story.append(B("<b>Runbooks</b> — 'how to do routine maintenance': add a coach, add a property safely, roll back a change."))
story.append(B("<b>Credentials/accounts inventory</b> — Tacit-owned GitHub, subscriptions, admin logins (all under Tacit-controlled emails, per the proposal)."))
story.append(B("<b>Repo README</b> — for any code/Workers, linked from the Notion docs."))

story.append(P("Where it lives — two places, two audiences", sub_style))
story.append(B("<b>In Notion</b> — a 'How TacitOS works' hub page the team can read (they'll never open a terminal)."))
story.append(B("<b>In the Tacit GitHub repo</b> — code, worker versions, schema snapshots."))

story.append(P(
    "<b>The standard to hit:</b> a new person should be able to take over with only the docs — "
    "no access to you. If the docs can't explain it, the docs aren't done."
))

# ============================================================
# MILESTONE
# ============================================================
story.append(PageBreak())
story.append(P("The milestone — 'organised, understandable and useful to the team'", item_style))
story.append(P("What 'done' concretely means — propose this as the acceptance test:", sub_style))
story.append(B("<b>Organised</b> — a staff member can find what they need without asking Nick; naming is consistent; no dead properties/relations."))
story.append(B("<b>Understandable</b> — the system map + docs explain the structure to a non-technical reader and a technical successor alike."))
story.append(B("<b>Useful</b> — the intended AI workflows actually run; skills aren't broken; versioning is live and being used."))
story.append(B("<b>Handover-ready</b> — documented to the point where Tacit can maintain it if you leave."))
story.append(P(
    "The proposal's framing matters here: 'We will agree the specific database and versioning "
    "priorities together after Dhiren has reviewed the current setup.' — your week-1 mapping "
    "(Item 1) produces the priority list. Sequence: map first, agree priorities, then execute."
))

# ============================================================
# DEVIN VS UI SPLIT
# ============================================================
story.append(P("Who does what — Devin (API) vs Notion UI", item_style))
story.append(make_table(
    ["Item", "Devin can do", "Needs you / UI"],
    [
        ["1. Databases & views", "~80% — schema dump, relation map, formula chains, written system map", "Dashboard walkthrough; which views the team uses"],
        ["2. AI / skills review", "~60% — read all skill pages, classify, write the skills register", "Running skills; Library state; usage meters"],
        ["3. Permissions", "~30% — draft the matrix, document limits", "All rule config; role testing"],
        ["4. Tidy & versioning", "~60% — bulk data cleanup, property ops, Git schema snapshots = change log", "Skills verification; view/dashboard structure"],
        ["5. Handover docs", "~90% — system map, register, runbooks, READMEs, Git history", "Reviewing docs; placing them in Notion"],
    ],
    [3.4*cm, 7.0*cm, 6.1*cm],
))
story.append(Spacer(1, 8))
story.append(P(
    "Overall: Devin carries roughly 60–65% of the first-stage workload. The workflow: "
    "Devin analyses and produces → you verify and apply in the UI → Devin logs the change in Git.",
    small_style
))

# ============================================================
# EXECUTION ORDER
# ============================================================
story.append(P("Execution order", item_style))
story.append(B("<b>Item 1 (map)</b> — produces the system map + the priority list Nick agrees to."))
story.append(B("<b>Sandbox</b> — before any changes. Nick's Skills-2.0-on-live mess is the cautionary tale."))
story.append(B("<b>Item 2 (AI audit)</b> — skills register; decide stabilise-vs-complete-migration."))
story.append(B("<b>Item 3 (permissions)</b> — matrix first, implement in sandbox, then live."))
story.append(B("<b>Item 4 (tidy + fix + versioning)</b> — only after 1–3 are mapped."))
story.append(B("<b>Item 5 (record)</b> — written continuously from day 1, not bolted on at the end."))

# ============================================================
# WEEK-BY-WEEK CHECKLIST
# ============================================================
story.append(PageBreak())
story.append(P("The week-by-week plan — November 2026", item_style))
story.append(P(
    "The five items above, sequenced into four weeks. Maps to the proposal's first stage: "
    "understand and improve the Notion environment before any customer-facing work. The "
    "sandbox comes first because Nick is mid-Skills-2.0 migration on the live system.",
    body_style
))

story.append(P("Week 1 — Orientation + Safety", sub_style))
story.append(P("Theme: read everything, change nothing", small_style))

story.append(P("<b>Monday–Tuesday — Get set up</b>", body_style))
story.append(C("Collect Tacit email + work login (provided from 26 Oct)"))
story.append(C("Get added to the Tacit Notion workspace"))
story.append(C("Walk through the workspace with Nick — he points out the core databases and known problem areas"))
story.append(C("Ask for the staging/test workspace — or agree that creating one is your first task"))

story.append(P("<b>Wednesday–Friday — Map the system</b> (Item 1)", body_style))
story.append(C("Inventory the core databases: TP: Events, TP: Sales, TP: People, TP: Organisations, TP: Hourly Rate, TP: Balance Sheet, TP: Tasks"))
story.append(C("Note which pages are source databases vs linked views"))
story.append(C("List the live skills (Basil, Freya, Ivy, Eric, Log Router, Faye) and note their state — live, broken, mid-migration"))
story.append(C("List native automations — which are live, which are dead (Sales Update Button dead since April)"))
story.append(C("Note the Skills 2.0 migration state — what's migrated, what's half-done, what's still on 1.0"))
story.append(C("Identify which pages/views the team actually uses day-to-day"))

story.append(P("<b>Document as you go</b> (Item 5 starts day 1)", body_style))
story.append(C("Screenshot key views and database schemas"))
story.append(C("Note existing formulas and which properties they write to"))
story.append(C("Record what's already broken or half-built — so changes later aren't blamed on you"))

story.append(Goal("A written map of the current workspace: what databases exist, what skills/automations are live, what's broken, what's mid-migration."))

story.append(P("Week 2 — Sandbox + Permissions + AI Review", sub_style))
story.append(P("Theme: set up a safe place to work, then review access and AI", small_style))

story.append(P("<b>Monday–Tuesday — Sandbox / staging</b>", body_style))
story.append(C("Create a test workspace or staging copy of the Notion environment"))
story.append(C("Confirm what's safe to experiment on without touching live data"))
story.append(C("Agree with Nick what 'done' looks like for the sandbox"))

story.append(P("<b>Wednesday — Access controls + permissions review</b> (Item 3)", body_style))
story.append(C("Map who needs to see what (coaches vs ops vs finance)"))
story.append(C("Test Notion's Permissions 3.0 — can you hide properties within databases?"))
story.append(C("Note where the practical limits are — what can't be restricted"))
story.append(C("Identify which databases need tighter access (financial data, coach rates)"))

story.append(P("<b>Thursday–Friday — AI skills review</b> (Item 2)", body_style))
story.append(C("For each live skill: does it work? Does it have the null-safety problem? Is it on formulas or code?"))
story.append(C("Note which skills are execution-only (good Worker candidates) vs judgement-based (stay as AI)"))
story.append(C("Review the prompt quality — where are skills fragile or prompt-heavy?"))
story.append(C("Flag the highest-priority skills to fix or stabilise"))

story.append(Goal("A working sandbox, a permissions map, and a skills audit — which skills are broken, which are candidates for Workers, which stay as AI."))

story.append(P("Week 3 — Tidy + Versioning", sub_style))
story.append(P("Theme: clean up what's broken, put versioning in place", small_style))

story.append(P("<b>Monday–Tuesday — Tidy the databases</b> (Item 4a)", body_style))
story.append(C("Clean up legacy/unused properties"))
story.append(C("Remove dead relations and redundant views"))
story.append(C("Standardise naming where it's inconsistent"))

story.append(P("<b>Wednesday–Thursday — Fix the broken workflows</b> (Item 4b)", body_style))
story.append(C("Prioritise: which broken skills/automations are blocking the team most?"))
story.append(C("Fix or flag the ones that can't be fixed without code (Workers)"))
story.append(C("Test the fixes in the sandbox first, then deploy to live"))

story.append(P("<b>Friday — Versioning approach</b> (Item 4c)", body_style))
story.append(C("Get a change-logging approach in place (SemVer-style)"))
story.append(C("Get the SemVer Logger/Auditor skill working, or build a simple logging pattern"))
story.append(C("Start recording schema changes as they happen"))

story.append(Goal("Databases tidied, broken workflows fixed or flagged, and a versioning approach live."))

story.append(P("Week 4 — Consolidate + Handover Doc", sub_style))
story.append(P("Theme: write it all down, prove the value", small_style))

story.append(P("<b>Monday–Wednesday — Handover documentation</b> (Item 5)", body_style))
story.append(C("Write the system map — databases, relationships, which pages hold real data"))
story.append(C("Write the skills/automations register — what's live, what each does, where it's broken"))
story.append(C("Write the change log format — how decisions and changes get recorded going forward"))
story.append(C("Write the 'how to maintain this' guide — so another person could take it over"))

story.append(P("<b>Thursday — Review with Nick + Oscar</b>", body_style))
story.append(C("Walk through what was found, what was fixed, what still needs work"))
story.append(C("Confirm what's next — is Tier 1 (Workers) on the roadmap, or apps first?"))
story.append(C("Discuss what 'success' looks like for November — the trial-month criteria"))

story.append(P("<b>Friday — End of trial month</b>", body_style))
story.append(C("Confirm with Nick whether the arrangement continues past November"))
story.append(C("If it ends: hand over the documentation, confirm no fee is charged"))
story.append(C("If it continues: agree December priorities"))

story.append(Goal("A complete handover document + a clear yes/no on whether the engagement continues."))

# ============================================================
# STANDING RULES
# ============================================================
story.append(P("Standing rules — apply all month", item_style))
story.append(B("<b>Sandbox first, live second</b> — never test on the production workspace. If there's no staging, create one before touching anything."))
story.append(B("<b>Document as you go</b> — every decision, every change, every broken thing you find. This is the handover record."))
story.append(B("<b>Don't fix what's not broken</b> — the scheduled subscription auto-creates and habit chains work fine on native automation. Leave them."))
story.append(B("<b>Judgement stays AI, execution becomes Worker</b> — deterministic maths or data movement = flag as a Worker candidate; judgement calls stay as skills."))
story.append(B("<b>Report to Nick on priorities, Oscar on customer experience</b> — keep Nick sighted on direction even when working with Oscar."))
story.append(B("<b>No live changes without sign-off</b> — especially anything touching TP: Balance Sheet or the booking chain."))

story.append(Spacer(1, 14))
story.append(P(
    "<b>The one rule that matters most:</b> sandbox before changes. If you fix things on live "
    "while the system is mid-migration and something breaks, it's your mess too.",
    note_style
))

story.append(Spacer(1, 8))
story.append(P(
    "<i>First-stage breakdown + first-month checklist — working document, not a formal proposal. November 2026.</i>",
    small_style
))

# ---------- Build ----------
doc = SimpleDocTemplate(
    OUTPUT, pagesize=A4,
    leftMargin=1.7*cm, rightMargin=1.7*cm,
    topMargin=1.5*cm, bottomMargin=1.5*cm,
    title="First Stage Breakdown + First Month Checklist — Tacit Padel",
    author="Dhiren Kirpalani",
)
doc.build(story)
print(f"PDF written: {OUTPUT}")
