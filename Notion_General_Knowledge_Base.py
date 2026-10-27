#!/usr/bin/env python3
"""Generate the Notion General Knowledge Base PDF — platform reference by topic."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
)

OUTPUT = "/Users/dhirenkirpalani/Downloads/tacit-padel-notion/Notion_General_Knowledge_Base.pdf"

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
analogy_style = ParagraphStyle(
    "AnalogyX", parent=body_style,
    fontSize=9, leading=12.5, textColor=colors.HexColor("#1E3A8A"),
    backColor=colors.HexColor("#E0E7FF"),
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

def Deliv(text):
    return Paragraph(f"<b>Why it matters for Tacit:</b> {text}", deliv_style)

def Analogy(text):
    return Paragraph(f"<b>Analogy:</b> {text}", analogy_style)

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

story.append(P("Notion General Knowledge Base", title_style))
story.append(P(
    "Tacit Padel × Notion — how the platform actually works, by topic<br/>"
    "Databases, formulas, automations, sharing, permissions, skills, plugins, agents, Workers, memory, API, MCP, AI pricing, wikis, backups",
    subtitle_style
))

story.append(P(
    "A topic-by-topic reference for the parts of Notion that matter to the Tacit work — drawn "
    "from the videos and guides Nick shared, organised by subject rather than by source. Each "
    "section ends with why it matters for TacitOS specifically.",
    body_style
))

# ============================================================
# 1 — THE CONTEXT LAYER
# ============================================================
story.append(P("1. The Context Layer — the architecture underneath everything", item_style))
story.append(P("The mental model the rest of the platform assumes", small_style))
story.append(Analogy(
    "Think of a library building. The books, the catalogue cards, the meeting-room notes — all of it "
    "lives in the building permanently. Librarians (AI tools) come and go; some use the catalogue "
    "better than others, but the building is what matters. Swap a librarian and the knowledge stays."
))

story.append(P(
    "The core idea: stop treating Notion as the place where AI happens to run, and start treating "
    "it as the Context Layer — the single source of truth that any AI plugs into."
))
story.append(B("<b>Wrong model — 'AI harness':</b> the AI tool is the system. Context lives inside chats. Switch tools and the knowledge evaporates."))
story.append(B("<b>Right model — 'context layer':</b> Notion holds the data, projects and decisions permanently. AI tools (Notion AI, Claude, ChatGPT) are interchangeable readers/writers on top. Swap the model; the system survives."))
story.append(P(
    "This is the architecture Tacit's proposal already commits to — 'Notion should remain the "
    "centre of the data model wherever that is practical' — and it's what makes handover "
    "achievable: if the workspace is the system, a new person inherits the whole picture."
))

story.append(P("The Minimum Viable System — five databases", sub_style))
story.append(B("<b>Projects</b> — high-level containers (status, duration, responsible person)."))
story.append(B("<b>Tasks</b> — action units; checkbox for one-click completion; each related back to its project."))
story.append(B("<b>Docs</b> — one central repository where AI output lands rather than evaporating in chats."))
story.append(B("<b>Meetings</b> — the searchable log of attendees, notes and decisions — the record of why things were decided."))
story.append(B("<b>Skills</b> — the database of repeatable AI workflows."))

story.append(P("Two design principles that make AI actually work", sub_style))
story.append(B("<b>Relations are the wiring.</b> They let the AI traverse 'this project's tasks, docs and meetings' instead of blindly searching the whole workspace — faster, cheaper, more accurate."))
story.append(B("<b>Dashboards filter noise.</b> Clean filtered views aren't cosmetic — they limit what the AI pulls into context. Tidying views directly improves AI answer quality."))

story.append(Deliv("The operational databases exist (Events/Sales/People/Orgs). Likely gaps to check: a Meetings/decisions database and a Docs repository where AI output is stored rather than scattered."))

# ============================================================
# 2 — DATABASES
# ============================================================
story.append(PageBreak())
story.append(P("2. Databases — the data model", item_style))
story.append(P("Source databases, linked views, property types, relations and rollups", small_style))
story.append(Analogy(
    "A source database is the actual filing cabinet in the back room — the records live there. A "
    "linked view is a window cut through the wall so people in other rooms can see specific folders "
    "through it. You can tint the window, sort what's visible, or close the curtain — but you're "
    "looking at the same cabinet. Remove the window and the cabinet is untouched; remove the "
    "cabinet and every window shows nothing."
))

story.append(P("Source database vs linked view — the distinction that matters most", sub_style))
story.append(B("<b>Source database</b> — the actual table holding the data. Lives at a specific page. Owns the properties, rows and formulas."))
story.append(B("<b>Linked view</b> — a window into that database from elsewhere: a filtered/sorted display embedded in another page. One source DB can appear in ten places as ten different views."))
story.append(B("<b>The UI is a lens, not the data</b> — filtering a view doesn't change data; deleting a view doesn't delete data. Deleting the source database deletes everything every linked view was showing."))
story.append(B("<b>Views don't protect data</b> — a view filtered to 'only confirmed sessions' still exposes the whole DB to anyone with access. Access control lives at the database/row/column level, not the view level."))

story.append(P("Property types — the columns", sub_style))
story.append(make_table(
    ["Type", "What it does", "Notes"],
    [
        ["Text / title", "Plain text", "Title = the row's name; text = freeform field"],
        ["Number", "Numeric values", "Formatted as currency, percent, etc."],
        ["Select / multi-select", "Pick from a list", "Single or multiple options"],
        ["Status", "Workflow state", "Grouped into To-do / In progress / Complete"],
        ["Date", "Dates and ranges", "Can include end date, reminder"],
        ["Person", "Link to a workspace member", "Drives row-level permission rules"],
        ["Created by / time", "Auto-filled on creation", "Also drives permission rules"],
        ["Relation", "Link rows between two databases", "Two-way — both sides see the link"],
        ["Rollup", "Aggregate through a relation", "Sum, count, first, last... — see below"],
        ["Formula", "Computed value from other properties", "See section 3 — API returns opaque refs"],
        ["Checkbox / URL / email / phone / files", "Simple field types", "Self-explanatory"],
    ],
    [3.2*cm, 5.6*cm, 7.7*cm],
))

story.append(P("Relations — the wiring", sub_style))
story.append(B("A relation links rows in one database to rows in another — two-way, both sides see the link. Tacit's chain: Event → Sale → Hourly Rate → Balance Sheet is a relation chain."))
story.append(B("For humans relations are navigation; for the AI they're retrieval paths — 'all tasks on project X' resolves through the relation instead of a full-workspace search."))

story.append(P("Rollups — aggregation through relations", sub_style))
story.append(B("A rollup pulls values from linked rows and aggregates them: sum, count, average, min, max, first, last, 'show original'."))
story.append(B("Computed live — and the classic fragility: rollups over empty relations return empty, and .first()/.last() on relations is where the null-safety failures live (the dead Sales Update Button's root cause)."))
story.append(B("Relation links rows; rollup aggregates through the relation. 'The number is wrong' debugging starts by identifying which layer the error is in."))

story.append(P("Views, filters, templates", sub_style))
story.append(B("<b>View types</b> — table, board, calendar, list, gallery, timeline — different lenses on the same rows."))
story.append(B("<b>Filters and sorts</b> — stored per view, don't alter the data. Each view can expose a different slice to a different audience."))
story.append(B("<b>Templates</b> — pre-built page structures inside a DB (e.g. a task template that already contains a 'Creation Skill' notice)."))
story.append(B("<b>Synced blocks</b> — one block that appears in multiple places and updates everywhere — useful for shared instructions/headers."))
story.append(B("<b>Chart views</b> — native bar/line/donut charts over a database: dashboards without exporting to a spreadsheet. Count rows by status, sum sales by month."))
story.append(B("<b>Notion Calendar</b> — a separate satellite app that two-way-syncs with date properties; any DB with dates can appear as a real calendar. Distinct from the calendar <i>view</i> inside a database."))

story.append(Deliv("This is Item 1's core knowledge. Week-1 mapping = for each TP: database: is it a source or a view? What relations does it hold? Where do the rollups/formulas live? Which views does the team actually use?"))

# ============================================================
# 3 — FORMULAS
# ============================================================
story.append(PageBreak())
story.append(P("3. Formulas — and the fragility that matters", item_style))
story.append(P("How computed properties work, and where they break", small_style))
story.append(Analogy(
    "Formulas are like a row of dominoes stood on edge. Each one leans on the one before it — "
    "Event feeds Sale feeds Hourly Rate feeds Balance Sheet. Tip one domino (edit a formula, hide "
    "a column, hit an empty relation) and every domino downstream falls or wobbles with no warning. "
    "There's no diagram showing which domino leans on which — you have to trace the chain by hand."
))

story.append(P("The basics", sub_style))
story.append(B("A formula property computes a value per row from other properties — arithmetic, text manipulation, conditionals (ifs), date maths, and pulling values through relations."))
story.append(B("Formulas live on the source database and propagate to every view — one edit affects every surface that shows the DB."))
story.append(B("Chains compound: a formula in DB A feeding a rollup in DB B feeding a formula in DB C. The Sales → Hourly Rate → Balance Sheet waterfall is exactly this — multi-tier, each level assuming the previous one produced a value."))

story.append(P("The limits that bite in practice", sub_style))
story.append(B("<b>The API can't read formula results reliably</b> — it returns opaque references, not values. This is why Ivy (the invoice skill) runs in screenshot mode: the AI literally cannot see computed numbers through the API."))
story.append(B("<b>Null-safety in automations</b> — formulas calling .first() or .last() on relations are statically blocked inside automations. The rule: a relation can be empty, so first/last might not exist — the engine refuses to run the formula in automation context."))
story.append(B("<b>The consequence</b> — this is what killed the Sales Update Button in April 2026, and it's still exposed on Confirm: Pattern B. The same math works on the page but is refused inside an automation."))
story.append(B("<b>Permissions interact</b> — formulas respect permissions. Hide a property (Permissions 3.0) and formulas referencing it may return empty or break — test every chain after locking columns."))
story.append(B("<b>Silent cascade</b> — edit a formula property that feeds downstream DBs and the change ripples with no warning. There's no dependency graph shown in the UI; you have to map it manually."))

story.append(P("Formula 2.0 — the repair toolkit", sub_style))
story.append(B("<b>let() / lets()</b> — name intermediate values inside a formula: compute 'gross' once, reuse it — reads like code instead of nested spaghetti."))
story.append(B("<b>map() / filter()</b> — operate on every row in a relation explicitly, instead of the fragile .first()/.last() grab."))
story.append(B("<b>Proper null handling</b> — empty() checks and ifs() fallbacks so an empty relation degrades to a safe value instead of breaking."))
story.append(B("<b>Multi-line editing</b> — the editor supports real expression structure; formulas are closer to small programs than spreadsheet cells now."))
story.append(B("<b>Why it matters here</b> — if the money chain gets patched in place before Workers arrive, this is the toolkit: named intermediates, explicit iteration, guarded nulls."))

story.append(Deliv("The formula fragility is the structural reason the money maths should eventually move to a Worker: code computes, validates and writes static values instead of relying on live formula chains that break on empty relations, opaque API references and permission changes."))

# ============================================================
# 4 — AUTOMATIONS & BUTTONS
# ============================================================
story.append(P("4. Native automations and buttons", item_style))
story.append(P("What Notion can do without any code — and where it stops", small_style))
story.append(Analogy(
    "Native automations are like a vending machine: put in a specific input (a coin, a button press, "
    "a row matching a filter) and you get a specific output (a snack, a property update, a "
    "notification). Reliable, simple, no thinking. But ask the vending machine to decide what snack "
    "you'd like based on your mood, or to call the supplier when it's empty — it can't. That's the "
    "gap Workers fill: the kitchen behind the vending machine."
))

story.append(B("<b>Database automations</b> — 'when X happens, do Y': when a page is added/edited matching a filter → set a property, add a page to another DB, send a notification. The scheduled subscription auto-creates at Tacit run on this."))
story.append(B("<b>Buttons</b> — one-click actions on a row or page: create linked pages, update properties, run a sequence. The Sales Update Button was a button triggering a formula-driven update — which is why the null-safety block killed it."))
story.append(B("<b>Recurring/scheduling</b> — automations can fire on a schedule (e.g. nightly task creation)."))
story.append(B("<b>Notifications</b> — Slack/email/Notion notifications as automation outputs."))
story.append(B("<b>Webhook actions</b> — automations can also send a webhook to a third-party service when triggered — the simple no-code version of outbound notification (limited triggers; the API's connection webhooks below are the fuller version)."))
story.append(B("<b>Where it stops</b> — no loops over rows, no conditional branching beyond filters, no external API calls, limited formula access (the .first()/.last() block). That's the gap Workers fill."))

story.append(P("Forms — intake without sharing", sub_style))
story.append(B("<b>Native Notion forms</b> — publish a form backed by a database; each submission creates a row. The respondent never needs a Notion account or workspace access."))
story.append(B("<b>vs 'Can Create'</b> — forms are a cleaner external front door (branded, structured fields, no account needed); Can Create is for users who already have some Notion access. Same idea — intake without exposure."))
story.append(B("<b>Tacit candidates</b> — coach applications, venue enquiries, feedback — anything currently landing in email and being re-keyed."))

story.append(Deliv("The 'don't fix what isn't broken' rule depends on knowing which mechanism each workflow uses: healthy native automations should be left alone; dead button/formula automations are Worker candidates. Week 1 maps which is which."))

# ============================================================
# 5 — SHARING MODEL
# ============================================================
story.append(PageBreak())
story.append(P("5. The sharing model — who can see what", item_style))
story.append(P("Members, guests, groups, and how access inherits — the base layer permissions build on", small_style))
story.append(Analogy(
    "Think of a members' club. Members pay dues and can walk the whole building. Guests are "
    "invited to a specific room for a specific evening — they can't wander. Groups are departments "
    "(the tennis committee, the bar staff) — give the committee key access and every committee "
    "member gets in. A door left open on the ground floor means everyone upstairs is also open, "
    "unless you explicitly lock their door."
))

story.append(P("The people types", sub_style))
story.append(B("<b>Members</b> — paid seats; full workspace members; the only ones who can use Notion AI."))
story.append(B("<b>Guests</b> — free, invited to specific pages only; see exactly what's shared to them and nothing else; no AI access."))
story.append(B("<b>Groups</b> — named sets of members (e.g. 'Coaches', 'Ops'); access granted to a group applies to all its members — and a group grant can't be reduced by page-level rules (highest permission wins)."))

story.append(P("How access flows", sub_style))
story.append(B("<b>Sharing levels</b> — Full access / Can edit / Can edit content / Can comment / Can view / No access."))
story.append(B("<b>Inheritance</b> — a page inherits the access of its parent unless you restrict it. Sharing a parent page shares everything beneath it by default."))
story.append(B("<b>Workspace/teamspace level vs page level</b> — workspace-wide access applies everywhere; page-level sharing narrows to that page and its children."))
story.append(B("<b>Integration access</b> — API integrations are also guests of a sort: they only see pages/databases explicitly shared to the integration."))

story.append(P("Teamspaces — the top-level containers", sub_style))
story.append(B("<b>What they are</b> — named compartments of the workspace (e.g. 'Coaching', 'Finance', 'Ops'), each with its own default membership — everyone, a group, or invite-only. Every page lives inside one teamspace."))
story.append(B("<b>Membership layers</b> — teamspace members see everything in it; open teamspaces can be browsed/joined by anyone; closed/private ones stay invisible to non-members."))
story.append(B("<b>The tidy-up tool</b> — if Tacit's workspace is flat page sprawl, teamspaces are the structural fix: one per function, with permissions handled at the container level instead of per page."))

story.append(P("The collaboration layer — comments, mentions, notifications", sub_style))
story.append(B("<b>Inline comments</b> — anchored to a block or a whole page; threads resolve when done. The record of discussions attached to the thing discussed."))
story.append(B("<b>@mentions</b> — people, pages, dates; mentioning a person notifies them and links them to the spot."))
story.append(B("<b>Notifications</b> — the inbox for mentions, comments, access requests, automation outputs; configurable per page ('follow'/'unfollow'). Now also forwards to Microsoft Teams."))
story.append(B("<b>Why it matters</b> — adoption mechanics: a tidy system people aren't notified about doesn't get used; comments keep discussion inside the record instead of in WhatsApp."))

story.append(P("Notion Sites — sharing outside the workspace", sub_style))
story.append(B("<b>Publish pages to the web</b> — any page can become a public URL; a 'Site' is a multi-page published collection with its own domain, navigation and theming."))
story.append(B("<b>Column permissions still apply</b> — hidden properties stay hidden from public viewers — the mechanism for sharing a filtered slice of data externally."))
story.append(B("<b>Paid extras</b> — custom domains and SEO controls sit on higher plans; basic publishing is broadly available."))
story.append(B("<b>Tacit candidates</b> — public class timetables, venue info, a help centre — anything currently duplicated onto a website by hand."))

story.append(Deliv("Item 3's foundation: you can't assess what to restrict until you know who currently has what — members vs guests, which groups exist, and which top-level pages are shared broadly (since everything beneath them inherits)."))

# ============================================================
# 6 — PERMISSIONS
# ============================================================
story.append(P("6. Permissions — the full story", item_style))
story.append(P("From all-or-nothing to row-level rules to hiding individual columns", small_style))
story.append(Analogy(
    "Imagine a hospital records room. 1.0: either you have a key to the whole room or you don't. "
    "2.0: you get a key to a specific patient's file. Row-level rules: anyone assigned as a "
    "patient's doctor automatically gets that file. 'Can Create': a referring GP can drop a new "
    "file through the slot without seeing any existing files. 3.0 (column-level): everyone with "
    "access to a file can read the diagnosis, but only HR can see the salary field — a redacted "
    "copy per reader, controlled per column."
))

story.append(P("The three eras", sub_style))
story.append(B("<b>1.0</b> — all-or-nothing per database: you see the whole DB or nothing."))
story.append(B("<b>2.0</b> — page-level access: share individual rows; possible but manual and clunky."))
story.append(B("<b>Granular row-level rules</b> — rules driven by a person property or 'created by': 'rows where Assignee = you → Can edit'. Set on the source DB; apply across all views automatically. Rules only ever increase access — never reduce it — so the base must start restrictive. Highest permission always wins."))
story.append(B("<b>The 'Can Create' update</b> — create entries in a DB you have No Access to (below)."))
story.append(B("<b>3.0 — column-level</b> — hide specific properties inside a database (below). Business/Enterprise only."))

story.append(P("'Can Create' — intake without access", sub_style))
story.append(B("<b>Create with No Access</b> — add rows to a DB you can't otherwise see. Notion auto-suggests a matching rule (Created by → Can edit) so creators can edit their own submissions."))
story.append(B("<b>External collaboration</b> — a guest adds entries through a shared linked view, never seeing the source DB or other rows. Brief sync delay after creating; a refresh resolves it."))
story.append(B("<b>Internal pattern</b> — lock the DB down (revoke default access), give a group 'Can Create', then a database automation grants team access to each new entry."))
story.append(B("<b>Database buttons</b> — e.g. a 'Lock for HR' button that flips a row's permissions in one click."))
story.append(B("<b>Limitation</b> — users without source-DB access can't create linked views via the slash command; they duplicate a view you provide."))

story.append(P("Column-level permissions (3.0)", sub_style))
story.append(B("<b>Setup</b> — click a property → 'Property access'. Per column or multiple at once."))
story.append(B("<b>Default levels</b> — baseline per column: No access / Can view / Can edit content."))
story.append(B("<b>Exceptions</b> — lift access for specific people, groups, or a Person property (e.g. the row's Owner sees the sensitive field)."))
story.append(B("<b>Preview mode</b> — the eye icon simulates any user's view before committing. Always preview."))
story.append(B("<b>Hierarchy</b> — column rules don't override row access. Row first, columns second."))
story.append(B("<b>Waterfall principle</b> — restrictive default + opt-in exceptions; never rely on rules to reduce broad access."))
story.append(B("<b>Formula gotcha</b> — formulas respect permissions: hide a property and formulas referencing it may return empty or break. Verify every chain after locking columns — the money chain is exactly what this could silently break."))
story.append(B("<b>Linked view bug</b> — a known quirk: some permission edits only configure properly through a linked view."))
story.append(B("<b>Agents and integrations</b> — column rules also constrain what integrations and AI agents can edit."))

story.append(B("<b>AI warning</b> — Notion AI sees everything the user sees. Permissions discipline governs what the AI can pull into answers, not just what people browse."))

story.append(P("Status: column permissions shipped October 13, 2026 (Notion 3.8)", sub_style))
story.append(P(
    "The feature is now live. Notion's own framing: recruiting teams can collaborate on candidates "
    "without exposing compensation; support agents can use account context without seeing restricted "
    "customer data. Column rules also constrain what AI agents and integrations can edit — protection "
    "against an agent modifying sensitive metadata."
))

story.append(P("The eras at a glance", sub_style))
story.append(make_table(
    ["Aspect", "1.0 — DB-level", "2.0 — page/row", "Row-level rules", "3.0 — column-level"],
    [
        ["What it controls", "Whole database", "Individual rows/pages", "Rows matching a rule", "Specific properties in a DB"],
        ["How it's granted", "Share the DB or don't", "Share each row manually", "Person / created-by property drives the rule", "Property access per column + exceptions"],
        ["Scales?", "Yes — but too coarse", "No — manual per row", "Yes — automatic as rows arrive", "Yes — applies to all rows"],
        ["Typical use", "Everyone sees a DB, or no one does", "Share one client record with one person", "Coaches edit only their own rows", "Hide coach pay / FX columns by role"],
        ["Reduce access?", "Base level itself", "Base level itself", "No — rules only raise access", "Yes — sets the baseline per column"],
        ["Main limit", "All-or-nothing", "Clunky at scale", "Can't reduce broad grants; linked-view creation quirk", "Business/Enterprise only; formula-permission interaction; row access required first"],
        ["Tacit fit", "Current default", "Too manual for 100s of rows", "Coach self-service views; intake patterns", "The feature Nick wants — hiding pay/finance columns"],
    ],
    [2.6*cm, 2.9*cm, 3.0*cm, 4.0*cm, 4.0*cm],
))
story.append(Spacer(1, 4))
story.append(P(
    "'Can Create' is an update layered on top of row-level rules: create rows in a DB you can't "
    "see, paired with a Created-by rule so you can edit your own submissions.",
    small_style
))

story.append(P("Admin & security controls — the governance layer", sub_style))
story.append(B("<b>SAML SSO + SCIM</b> (Enterprise) — single sign-on and automatic user provisioning/deprovisioning; people joining/leaving is managed from the identity provider, not manually."))
story.append(B("<b>Audit log</b> (Enterprise) — a record of admin and security-relevant actions (key changes, sharing changes, exports, BYOK key rotation). Feeds the versioning story at workspace level."))
story.append(B("<b>Domain management</b> — claim company email domains; control which workspaces company accounts can join."))
story.append(B("<b>Workspace analytics & content search</b> — admin-level views of usage and the ability to find content across the workspace."))
story.append(B("<b>Connection controls</b> — admins decide which integrations/MCP tools people may connect (Notion-verified only, or an allow-list)."))

story.append(Deliv("Two complementary tools: 'Can Create' for intake (add rows you can't browse) and column-level rules for hiding sensitive fields (coach pay, FX rates, balance-sheet figures). Top testing priority: the formula-permission interaction — it touches the money chain directly."))

# ============================================================
# 7 — SKILLS
# ============================================================
story.append(PageBreak())
story.append(P("7. Skills — reusable AI instructions", item_style))
story.append(P("What a skill is, the 1.0 model Tacit inherited, and the 2.0 platform", small_style))
story.append(Analogy(
    "A skill is a recipe card in a kitchen. 1.0: recipes handwritten on index cards, stuffed in "
    "drawers — you have to know which drawer. 2.0: a proper recipe binder with tabs, an index, "
    "usage notes ('made this 12 times'), and the head chef can pin a 'house standard' recipe that "
    "every cook sees. The Skills API lets you photocopy a card and hand it to the chef next door "
    "(Claude, Cursor) so they cook the same way."
))

story.append(P("What a skill is", sub_style))
story.append(P(
    "A Notion page containing reusable instructions for the AI. When the agent needs a repeatable "
    "job done — classify an expense, update a sales record, generate an invoice — it loads that "
    "page's instructions and follows them."
))
story.append(B("<b>Write once, reuse forever</b> — a good instruction beats re-explaining the job every session."))
story.append(B("<b>It forces assumptions into the open</b> — every 'obviously I mean X' must be written down; the AI can't guess. Skills double as process documentation."))
story.append(B("<b>The 'curse of instructions'</b> — one giant 'do everything' prompt degrades output; small focused skills loaded when needed beat one master prompt."))
story.append(B("<b>Progressive disclosure</b> — load only the instructions the job needs; the principle the whole skills architecture is built on."))
story.append(B("<b>Skills are just pages</b> — they inherit everything Notion pages can do: link to docs, attach files, live in databases with properties."))

story.append(P("Skills 1.0 — the original model", sub_style))
story.append(B("A skill was a page with instructions — no special marking, no library."))
story.append(B("Invocation was manual: the @-add method, or pointing the agent at the page."))
story.append(B("Skills could be scattered anywhere — no canonical home, no inventory, no usage tracking."))
story.append(B("Quality depended entirely on writing craft — 'skill engineering' was a discipline, not a product feature."))
story.append(B("Tacit's ~40 skills (Basil, Freya, Ivy, Eric, Faye, the Log Router...) were built on this model — 'Name: Function' naming, L1 utilities / L2b main skills / L3 reference layers."))

story.append(P("Skills 2.0 — the platform", sub_style))
story.append(B("<b>Skills Library</b> — a dedicated Skills tab in the Library: see enabled skills, discover shared ones."))
story.append(B("<b>'Use with AI skill' marking</b> — any page can be designated a skill, then enabled."))
story.append(B("<b>Slash commands</b> — enabled skills appear in the / menu where you're working."))
story.append(B("<b>Auto-selection</b> — the agent can pick a skill when its description matches the request — so descriptions must be clear and distinct."))
story.append(B("<b>Auto-execution</b> — skills can trigger automatically for recurring jobs. Caution: adds context load; deterministic recurring jobs are usually Worker candidates anyway."))
story.append(B("<b>Discover + usage counts</b> — the Library shows how often each skill is invoked — audit evidence for which earn their place."))
story.append(B("<b>Centralised Skills Database</b> — one structured DB, a row per skill (description, files, tags) — auditable as a table."))
story.append(B("<b>Default Workspace Skills</b> — admin-set skills applied to the whole team's AI; the feature that turns skills into org-wide infrastructure."))
story.append(B("<b>Local agents</b> — skills downloadable for external agents (npx skills add); point-in-time copies, sync still WIP."))

story.append(P("Skills API and cross-agent portability (shipped Sep–Oct 2026)", sub_style))
story.append(B("<b>Skills API</b> — write a skill once in Notion, sync it to GitHub as a SKILL.md file. Notion shows an 'out of date' badge when the Notion copy changes."))
story.append(B("<b>Export targets</b> — Claude Code, Codex, Cursor, Gemini, Grok. Notion generates the SKILL.md plus approved supporting files."))
story.append(B("<b>Agent-neutral by design</b> — skills are becoming a critical store of organisational knowledge; the API makes them available in every agent, not locked into one."))
story.append(B("<b>Sub-agents</b> (Sep 2026) — a Custom Agent can call other Custom Agents, each with its own instructions, context, access and model."))
story.append(B("<b>Meeting-triggered agents</b> (Sep 2026) — choose which meetings trigger a Custom Agent; it receives the transcript and summary (Business/Enterprise)."))
story.append(B("<b>Embedded agents</b> (Sep 2026) — place a Custom Agent in any doc for anyone on the page to use."))

story.append(P("1.0 vs 2.0 at a glance", sub_style))
story.append(make_table(
    ["Aspect", "Skills 1.0", "Skills 2.0"],
    [
        ["Where skills live", "Scattered pages anywhere", "Library → Skills tab; one structured Skills Database"],
        ["Becoming a skill", "By convention only", "Marked 'Use with AI skill', then enabled"],
        ["Invocation", "@-add / manual pointing", "Slash commands; auto-selection; optional auto-execution"],
        ["Discovery", "You had to know they existed", "Discover tab + usage counts"],
        ["Team consistency", "Per-user configuration", "Default Workspace Skills — admin-set for all"],
        ["Outside Notion", "None", "Download for local agents (sync WIP)"],
    ],
    [3.0*cm, 6.4*cm, 7.1*cm],
))

story.append(P("Skill engineering — how to write a good skill", sub_style))
story.append(P("The craft layer — applies regardless of 1.0 or 2.0", small_style))

story.append(P("The three-tier context model", body_style))
story.append(B("<b>Always loaded</b> — personal instructions / the agent's instruction page. Should be <b>lightweight</b>: identity, standards, how to work the system. Whatever sits here taxes every single conversation — keep it small and push detail out to skills and references."))
story.append(B("<b>Skills</b> — loaded on demand when the job matches the description."))
story.append(B("<b>Reference docs</b> — loaded on demand by skills that point to them (L3 pages at Tacit)."))
story.append(B("The hierarchy is progressive disclosure made physical: light always-loaded core → on-demand skills → on-demand references."))

story.append(P("The five levels of skill writing", body_style))
story.append(B("<b>L1 — No skills:</b> every interaction starts from scratch."))
story.append(B("<b>L2 — Blind delegation:</b> ask the AI to write the skill with zero context."))
story.append(B("<b>L3 — Manual writing:</b> write it yourself from conscious knowledge — still misses hidden assumptions."))
story.append(B("<b>L4 — Co-creating with AI (AC/DC):</b> surface what you don't know you know."))
story.append(B("<b>L5 — Co-creating with structure:</b> AC/DC + a Skill Document Framework + meta-prompting."))
story.append(B("Levels 1–3 share the same failure mode — <b>the hidden assumptions gap</b>: the expert's tacit knowledge never makes it onto the page, so the AI fills it with guesses."))

story.append(P("The AC/DC loop — how a skill actually gets built", body_style))
story.append(B("<b>Assess</b> — map the real workflow as it actually happens, not as it's supposed to."))
story.append(B("<b>Collaborate</b> — messy first pass with the AI; watch where it fails — the failures reveal the missing assumptions."))
story.append(B("<b>Draft</b> — structure the skill from what the first pass exposed."))
story.append(B("<b>Certify</b> — test in production, fix, re-test."))
story.append(B("Framing: <b>Discover → Codify → Ship</b>. And the level-5 lifecycle wraps it: AC/DC → Skill Creator → Skill Reviewer → Skill Compounder — skills that create, review and improve skills."))

story.append(P("Writing rules that actually change output", body_style))
story.append(B("<b>Skip the persona.</b> 'You are an expert marketer' adds confidence to the voice, not value to the answer. Instead state <b>what good looks like</b> and <b>the process to follow</b> — make the AI reason through your actual workflow rather than giving it a generic situation to act out."))
story.append(B("<b>Keep the skill page lean and high-level</b> — goal, output, and why. Detail lives in linked reference docs loaded on demand, not packed into the skill itself."))
story.append(B("<b>Attention is positional</b> — the first and last parts of a prompt get the most attention; the middle tends to get muddy. Put critical constraints at the top, the output definition at the bottom, and don't bury key rules mid-page."))

story.append(Deliv("The migration target: one Skills Database in the Library, clear descriptions, workspace defaults for shared rules — not forty scattered pages. And when auditing Tacit's skills, the quality bar is the engineering rules above: lean page, explicit assumptions, real process, critical rules at the edges. Migration damage assessment is a week-2 task; don't continue migrating on the live system."))

# ============================================================
# 8 — PLUGIN SYSTEM
# ============================================================
story.append(P("8. The Plugin System — organising AI capabilities", item_style))
story.append(P("A set of interconnected databases that turns a pile of skills into a navigable system", small_style))
story.append(Analogy(
    "Think of a department store. The ground-floor directory board (the CLP) doesn't list every "
    "product — it lists departments: 'Toys, 3rd floor; Kitchenware, 2nd floor.' Each department's "
    "sign (the plugin description) tells you whether to go up. Once on the floor, aisle markers "
    "(skill descriptions) lead you to the shelf; the product packaging (reference docs) has the "
    "detail. You never carry the whole store in your arms — you walk the signs."
))

story.append(P("What it is", sub_style))
story.append(P(
    "Once you have more than a handful of skills, folders aren't enough — you need a structure "
    "the AI itself can navigate. The Plugin System groups related capabilities under named "
    "domains, so the Context Layer Prompt (CLP — the always-loaded instruction page) can point "
    "to a Plugins database and let the AI discover what's available on demand."
))

story.append(P("The three core databases", sub_style))
story.append(B("<b>Plugins</b> — one entry per capability domain (e.g. 'Skill Engineering', 'Client Onboarding'). Each plugin's description acts as the trigger mechanism for the AI — the description is how the agent decides whether a domain is relevant."))
story.append(B("<b>Skills</b> — individual skill pages with focused instructions for one workflow; each relates to one or more plugins."))
story.append(B("<b>Agents</b> — AI agents that use skills and belong to plugins — the bridge between skills and automated execution."))

story.append(P("The discovery chain", sub_style))
story.append(B("<b>CLP → Plugin description → Skill description → Reference pages.</b>"))
story.append(B("Each level's description is a discovery mechanism: the CLP says 'check the Plugins database for relevant capability areas'; the matching plugin's description points to its skills; each skill's description points to its references."))
story.append(B("Result: a lightweight auto-loading architecture built entirely from Notion-native building blocks — the agent walks the chain on demand instead of loading everything up front. Progressive disclosure as a data model."))

story.append(P("Extending it — same pattern, new object types", sub_style))
story.append(B("<b>MCPs</b> — Model Context Protocol connections to external tools."))
story.append(B("<b>Workers</b> — background automation agents registered alongside the skills they serve."))
story.append(B("<b>Tool Configurations</b> — external tool setups and API keys."))
story.append(B("<b>Reference Libraries</b> — style guides, examples, edge-case collections."))
story.append(B("One database per object type, interlinked. The relational structure absorbs new capability types without redesigning anything."))

story.append(Deliv("This is essentially the mature form of what Tacit's L1/L2b/L3 layers approximate — capability domains as plugins (Bookings, Finance, Comms, People Ops), skills related to them, agents registered to them, and description-driven discovery matching Skills 2.0 auto-selection. Also the natural registry for Workers and API keys when Tier 1 arrives."))

story.append(P("9. Agents — the AI actors", item_style))
story.append(P("The main agent, custom agents, and the routing pattern", small_style))
story.append(Analogy(
    "HAL is the hotel concierge — knows the building, can handle almost any request, and pulls out "
    "the right guidebook (skill) when needed. A custom agent is the specialist you call in: the "
    "spa manager, the events coordinator — narrower expertise, deeper in one area. Auto (the "
    "model router) is the concierge deciding whether your question needs the junior clerk or the "
    "senior manager — matching the task to the right level without you choosing."
))

story.append(P("The actors", sub_style))
story.append(B("<b>The agent (HAL at Tacit)</b> — the main AI actor: reads skills, interprets requests, makes judgement calls. Where ambiguity lives by design."))
story.append(B("<b>Custom agent</b> — a narrow, task-specific agent configured for one job — a specialist vs HAL's generalist."))
story.append(B("<b>Standing vs on-demand</b> — a standing/scheduled agent burns credits continuously; a skill run manually through a person's session is cheap. This cost difference is why Tacit runs 40 skills through HAL on demand rather than deploying standing agents."))

story.append(P("Custom Agents — the configured specialist", sub_style))
story.append(B("<b>What it is</b> — a saved agent configuration: a name, a set of instructions, access to specific pages/databases, a chosen set of tools and skills, and a model. Anyone on the team can invoke it without knowing how it was built."))
story.append(B("<b>Configuration surface</b> — instructions (its job and how to do it), knowledge access (which pages/DBs it can see — its own permission scope), tools/skills it may use, the model it runs on, and its trigger."))
story.append(B("<b>What 'tools' an agent can hold</b> — native Notion actions (search, read, create/update pages and DB rows), skills from the Library, MCP connections to external tools (HubSpot, Stripe, GitHub…), and <b>tool-type Workers</b> — code the agent calls like a function for deterministic jobs. The agent decides <i>when</i>; the tool does <i>what</i>."))
story.append(B("<b>Triggers</b> — manual (a person chats with it), scheduled (runs on a timer), event-driven (e.g. a meeting ending — Business/Enterprise), or embedded (sits in a doc for anyone on that page), or called by another agent (sub-agent)."))
story.append(B("<b>Who pays</b> — by default the <i>owner's</i> Select credits, even when teammates use it; admins can fund an agent from the shared workspace Notion credits instead, with per-agent budgets."))
story.append(B("<b>Vs a skill</b> — a skill is just instructions; a custom agent is instructions + access + tools + model + trigger, packaged as a named actor. A skill runs inside <i>your</i> session on <i>your</i> credits; a custom agent is a standing configuration others invoke."))

story.append(P("Agents rebuilt (October 19, 2026)", sub_style))
story.append(B("<b>Own computer and browser</b> — agents can now interact with external tools and pages directly, not just Notion content."))
story.append(B("<b>24-hour tasks</b> — agents can work on long-running tasks for up to 24 hours."))
story.append(B("<b>'Review for me' mode</b> — a safety-check mode that reviews agent output before it's committed."))
story.append(B("<b>Smarter context management</b> — the new harness keeps complex tasks focused and credit-efficient with fewer wasted steps."))
story.append(B("<b>50% faster chat loading</b> on mobile."))

story.append(P("Auto — the model router (October 19, 2026)", sub_style))
story.append(B("<b>Auto matches each task to the model</b> that best balances quality, speed and cost — you don't pick the model yourself."))
story.append(B("<b>Cost claim:</b> similar results to Opus 5.5 / Astra at ~90% lower average cost. Credits go ~10× further across 20+ common tasks."))
story.append(B("<b>Relevance:</b> if Tacit runs many agent interactions, Auto could replace manual model picking and significantly reduce credit consumption."))

story.append(P("The routing pattern — 'Nimbus' as the reference design", sub_style))
story.append(B("<b>One agent, many skills</b> — a central agent acts as router, loading only the instructions a request needs — progressive disclosure at agent level. No mega-prompt. HAL already works this way."))
story.append(B("<b>Two entry points</b> — autonomous team co-worker, or a tool inside an individual's own workflow. The personal-workflow mode saves credits."))
story.append(B("<b>Four DBs around it: Docs, Questions, Skills, Tasks</b> — the agent logs its own performance, flags missing info, assigns human follow-ups."))
story.append(B("<b>The self-improvement loop</b> — every unanswered question logged in the Questions DB; the agent drafts fixes or flags humans. Usage reveals gaps; gaps become work."))
story.append(B("<b>Human review gates</b> — the agent can't write changes straight in; a human approves first. Prevents 'AI generates noise faster than people review'."))
story.append(B("<b>LLM-wiki interlinking</b> — docs cross-linked like Wikipedia so future agents crawl context by following links."))
story.append(B("<b>Three data buckets</b> — native (in Notion), mirrored (synced in from other tools), external (stays elsewhere, queried via AI tools, e.g. GitHub)."))

story.append(Deliv("Nimbus is HAL's direction, not a different system. Tacit's likely missing pieces: the Questions log (turn every gap into follow-up work) and human review gates — the compounding-improvement machinery."))

# ============================================================
# 9 — WORKERS & THE DEV PLATFORM
# ============================================================
story.append(PageBreak())
story.append(P("10. Workers and the developer platform", item_style))
story.append(P("Code on Notion's servers — the deterministic half of the system, announced at Dev Day", small_style))
story.append(Analogy(
    "Workers are the kitchen equipment — the ovens, the dishwashers, the timers. They don't taste "
    "the food or decide the menu (that's the chef/agent). They do exactly what they're built to do, "
    "every time, without judgement. A webhook Worker is the service bell — rings when an order "
    "arrives. A sync Worker is the delivery truck that shows up on schedule. A tool Worker is the "
    "thermometer the chef calls for when they need a precise reading. Cheap to run, never improvises."
))

story.append(P("What a Worker is", sub_style))
story.append(P(
    "A Worker is a small piece of code (TypeScript, running on Node) that you write locally and "
    "deploy to Notion's hosted infrastructure — like AWS Lambda but living inside your workspace. "
    "It fills the gap between native automations (limited: no loops, no external calls, formula "
    "blocks) and external glue tools like Make/Zapier (duct-tape outside the platform)."
))
story.append(B("<b>It is code, not AI.</b> No reasoning, no judgement — it does exactly what it's written to do, every time. That determinism is the point: code doesn't hallucinate, and it's auditable because it's versioned."))
story.append(B("<b>It's cheap.</b> A Worker run costs a fraction of an agent execution — the agent reasons token-by-token; the Worker just runs. Notion's own guidance: use code for the deterministic parts and agents for the judgement calls — claimed to cut agent token costs 80%+."))
story.append(B("<b>It's sandboxed.</b> Runs on Notion's servers with access to the workspace via the API surface — not arbitrary code on your machine."))

story.append(P("The three trigger types — how a Worker fires", sub_style))
story.append(B("<b>Tool</b> — an agent calls the Worker like a function, passing inputs and getting structured output back. The 'AI decides, code executes' split made concrete: HAL (or a custom agent) judges <i>that</i> a compensation figure needs computing; the Worker computes it."))
story.append(B("<b>Webhook</b> — the Worker answers an inbound HTTP call from an external system. E.g. Courtside posts 'booking cancelled' → the Worker receives it, verifies the signature, updates the row."))
story.append(B("<b>Sync</b> — runs on a schedule (e.g. every 15 minutes) pulling external data in. The polling counterpart to webhooks: instead of being told about changes, it asks for them."))
story.append(B("<b>Both directions exist</b> — a webhook Worker receives events <i>into</i> Notion; the API's connection webhooks (section 12) push events <i>out</i> of Notion when pages/databases change."))

story.append(P("Real examples from the launch material", sub_style))
story.append(B("Company enrichment — fetch logos / scrape company sites and fill properties automatically."))
story.append(B("Automatic task generation — create the right task set when a project of a given type is created."))
story.append(B("Duplicate checker — scan People/Organisation databases for near-duplicates and flag/merge them."))
story.append(B("Overdue escalator — scheduled check that escalates stale tasks."))
story.append(B("External data sync — Stripe invoices, meeting notes, Jira/Salesforce pulls into Notion."))

story.append(P("Sync workers — the specialised type for external data", sub_style))
story.append(B("<b>One-way sync into a locked, protected database</b> — the external source stays the source of truth; synced fields can't be edited in Notion. Edit attempts are prevented, not just discouraged."))
story.append(B("<b>Add your own Notion-native properties on top</b> — owner, tags, relations, notes — editable alongside the locked synced fields."))
story.append(B("<b>Courtside implication:</b> synced bookings would land in a Worker-managed DB with locked fields — not straight into TP: Events. Getting bookings into the existing sales chain means mapping/relating records from the synced DB to Tacit's own databases — a design decision, not a copy-paste."))

story.append(P("Synced databases — rebuilt October 13, 2026", sub_style))
story.append(B("<b>Live one-way sync from GitHub, Jira and Salesforce</b> into Notion databases. Synced fields are read-only; you add your own properties, views, relations and automations on top."))
story.append(B("<b>Health status per sync</b> — the Your Syncs tab shows last sync time and health for each connection."))
story.append(B("<b>Works like any other Notion database</b> — add properties, create views, trigger automations, hand to agents."))
story.append(B("<b>For unsupported sources (like Courtside):</b> Notion's own guidance is to use Workers to build a custom sync. The managed syncs are GitHub/Jira/Salesforce only; everything else is a Worker job."))
story.append(B("<b>Legacy Salesforce connector</b> stops updating October 30, 2026 — migrate to the new sync by then."))

story.append(P("How you build and deploy — the ntn CLI", sub_style))
story.append(B("<b>ntn</b> is Notion's command-line tool: scaffold a Worker, develop locally, deploy to the workspace, manage secrets and inspect runs/logs."))
story.append(B("<b>Development flow</b> — write the code in a normal repo (Git → Tacit's GitHub org), test locally where possible, deploy via CLI. Worker code is just a project — the handover story for code is a repo + README, not Notion pages."))
story.append(B("<b>Environment questions that still need answering</b> — can Workers run locally with mock data? Does ntn support dev→staging→prod promotion, or one workspace per deploy? Are secrets namespaced per environment? These gate how safe financial writes (M3) can be tested."))
story.append(B("<b>Plan requirement</b> — Business plan required; Workers live under Settings → Features → Workers."))

story.append(P("What Workers can't do", sub_style))
story.append(B("No AI judgement inside a Worker — it's deterministic code; anything requiring interpretation stays in the agent layer."))
story.append(B("Can't manipulate views/layouts — same API limits apply."))
story.append(B("Still in public beta — the feature set, pricing and environment support are moving; verify capabilities before designing against them."))

story.append(P("The Tacit candidate list — what maps to Workers", sub_style))
story.append(make_table(
    ["Candidate", "Why it's a Worker job", "Current state"],
    [
        ["Compensation waterfall", "Deterministic maths (40/30/15/15 splits, deductions)", "Fragile formula chains; M1 compute-only, M3 writes"],
        ["Courtside sync", "Scheduled external pull + webhook events", "Manual re-keying today; needs API access confirmed"],
        ["Duplicate checker", "Rule-based matching on People/Organisations", "Manual checking today"],
        ["FX rates (Freya)", "Deterministic conversion + static writes", "Skill today — formula-dependent"],
        ["SemVer logging/audit", "Mechanical record-keeping", "Skill concept exists"],
        ["Sales reconciliation", "Sum-of-parts = gross checks, halt on mismatch", "Doesn't exist yet — M3 requirement"],
    ],
    [3.6*cm, 6.4*cm, 6.5*cm],
))

story.append(P("Agent SDK and Agent API", sub_style))
story.append(B("<b>Agent API</b> — external apps can open a session with a Custom Agent, send messages and read replies programmatically. Your app drives Notion agents without a person in the chat. Public beta."))
story.append(B("<b>Agent SDK</b> — build with Notion agents from your own code/environment (alpha at Dev Day, public beta since Notion 3.7 in September). Query Notion context and drive agent workflows without leaving your tool."))
story.append(B("<b>Sub-agents</b> (Sep 2026) — a Custom Agent can call other Custom Agents, each with its own instructions, context, access and model."))
story.append(B("<b>Meeting-triggered agents</b> (Sep 2026) — pick which meetings trigger a Custom Agent; it receives the transcript and summary automatically (Business/Enterprise)."))
story.append(B("<b>Embedded agents</b> (Sep 2026) — place a Custom Agent inside any doc for anyone on the page to use."))
story.append(B("<b>How it relates to MCP:</b> the Agent API/SDK are for driving <i>Notion</i> agents from outside; MCP is the two-way context-sharing channel between Notion and external tools/agents. Overlapping territory — check which pattern fits before building."))

story.append(P("Platform implications", sub_style))
story.append(B("<b>Notion is positioning as the orchestration layer</b> — a company's system of record and context hub."))
story.append(B("<b>It requires the CLI</b> — Workers are deployed/managed via command line (ntn)."))
story.append(B("<b>Less duct-tape</b> — automation that needed Make/Zapier runs natively and versioned inside the platform."))

story.append(Deliv("The technical foundation for Tier 1: Workers = deterministic execution (cheaper than agents), Sync = how external data (Courtside) arrives, CLI = the tooling. Confirms the architecture rule: judgement in agents, repeatable work in code."))

# ============================================================
# 10 — MEMORY
# ============================================================
story.append(P("11. Memory — fixing 'wakes up with amnesia'", item_style))
story.append(P("The four-document system for project continuity", small_style))
story.append(Analogy(
    "Imagine a night-shift handover in a hospital. The Lake is the medical textbook — it doesn't "
    "change between shifts. The River is the patient's chart at the bedside — updated hourly, "
    "read first thing. The four documents are: the admission brief (what we're treating), the "
    "current chart (where the patient is right now), the decisions log (why we changed meds and "
    "when), and the glossary (so 'BP' means blood pressure, not base pay). Without the handover, "
    "each new shift starts from scratch."
))

story.append(P("The problem", sub_style))
story.append(P(
    "Every new AI chat starts blank. The agent can search the workspace, but reconstructing "
    "project state from scattered pages burns tokens and produces inconsistent context — you end "
    "up re-explaining the project every session."
))

story.append(P("The three components of a useful AI setup", sub_style))
story.append(B("<b>General instructions</b> — identity and goals, loaded into every conversation."))
story.append(B("<b>Skills</b> — action processes; the 'how'."))
story.append(B("<b>Memory</b> — situational 'where we are' context. The layer most setups are missing."))

story.append(P("Lake vs river — the key distinction", sub_style))
story.append(B("<b>The Lake</b> — permanent knowledge: org goals, wikis, reference material. Changes slowly."))
story.append(B("<b>The River</b> — fast-moving project context: what's true right now, open loops, next actions. Changes daily — needs snapshots, not a wiki."))
story.append(B("The mistake: keeping river-state in lake-storage. Scattered pages force the agent to re-derive current state every session."))

story.append(P("The four documents — per project", sub_style))
story.append(B("<b>Project Brief</b> — scope, objectives, success criteria. Rarely updated."))
story.append(B("<b>Where We Are</b> — current status, open loops, next actions. The 'cold handoff' briefing; read at session start."))
story.append(B("<b>Decisions</b> — chronological log of what was decided and why; superseded decisions kept and marked."))
story.append(B("<b>Domain Language</b> — project vocabulary so agent and stakeholders use terms consistently."))

story.append(P("The workflow — seed, ground, update", sub_style))
story.append(B("<b>Seed</b> — at project start, a skill generates the four documents with initial context."))
story.append(B("<b>Ground</b> — before each session, a 'grounding' skill pulls current state so the AI starts up to speed."))
story.append(B("<b>Update</b> — at session end, 'Where We Are' and 'Decisions' get refreshed so the river stays current."))
story.append(B("<b>Meeting notes</b> — transcripts distilled into the four docs rather than left raw."))
story.append(B("<b>Cross-tool</b> — the same pages work for Claude/ChatGPT — point external tools at them for identical context."))

story.append(P("MCP memory sync (October 19, 2026)", sub_style))
story.append(B("<b>Memory sync is now live via MCP</b> — external agents (Claude, ChatGPT, etc.) can read and update Notion memory documents directly, so the 'river' stays current regardless of which AI tool was used."))
story.append(B("<b>Skills via MCP coming soon</b> — the same channel for skills, not just memory."))

story.append(Deliv("Directly usable for the handover requirement: the four-doc pattern IS a handover record — brief, current state, decisions, vocabulary. Also gives HAL continuity. Nick hit a blocker implementing it — ask what before building it in."))

# ============================================================
# 11 — THE API
# ============================================================
story.append(PageBreak())
story.append(P("12. The Notion API — what code can and can't reach", item_style))
story.append(P("The boundary that decides what can be automated vs what needs the UI", small_style))
story.append(Analogy(
    "The API is a librarian who can fetch any book, add new books, and reshelve them — but can't "
    "read certain pages (formula results are sealed), can't rearrange the reading room (views/"
    "layouts), can't hire staff (configure skills/permissions), and can't hold a conversation "
    "with a reader (run AI). For anything requiring those, you walk into the library yourself "
    "and do it at the desk."
))

story.append(P("How access works", sub_style))
story.append(B("<b>Integration tokens</b> — an internal integration gets a secret token; it only sees pages/databases explicitly shared to it."))
story.append(B("<b>Reads</b> — database schemas, properties, rows, page content (blocks), users."))
story.append(B("<b>Writes</b> — create/update rows, create pages, update property values, archive content. Real writes — same caution as manual edits."))

story.append(P("The limits that matter", sub_style))
story.append(B("<b>Can't read formula results</b> — returns opaque references, not values (why Ivy screenshots)."))
story.append(B("<b>Can't create linked views or manipulate layouts</b> — view/dashboard work is UI-only."))
story.append(B("<b>Can't run AI</b> — the API moves data; it doesn't invoke skills or agents."))
story.append(B("<b>Can't configure Skills 2.0</b> — marking/enabling skills, the Library, Discover — UI features."))
story.append(B("<b>Granular permission rules are configured in the UI</b> — you can read sharing state, but row/column rule setup is manual."))
story.append(B("<b>Rate limits and structure</b> — paginated reads; bulk operations need batching."))

story.append(P("Connection webhooks — the outbound direction", sub_style))
story.append(B("<b>Notion → external</b> — an integration can subscribe to workspace events: page.created, page.content_updated, database schema changes and more. Notion POSTs a signal to your public HTTPS endpoint."))
story.append(B("<b>Signal, not payload</b> — the event says <i>what changed</i> (entity ID + type), not the content; you call the API to fetch the new state."))
story.append(B("<b>Setup</b> — created in the integration's Connections settings, verified with a token handshake; needs a secure public URL (no localhost)."))
story.append(B("<b>vs Worker webhook triggers</b> — Worker webhooks are inbound (external system → Notion). Connection webhooks are outbound (Notion → your endpoint). An event-driven Worker can also be the receiving end of an automation webhook action."))
story.append(B("<b>Not covered</b> — user/membership and workspace-settings changes don't emit webhooks; the audit log covers those."))

story.append(P("Recent API changes (October 2026)", sub_style))
story.append(B("<b>Status default_option</b> (Oct 22) — status properties now expose the default option name in the API (SDK v5.28.0). Look it up in options rather than assuming the first is default."))
story.append(B("<b>show_data_source_title</b> (Oct 20) — database create/update and create-view now accept this flag to show/hide the title above database views."))
story.append(B("<b>Separate search tools in MCP</b> (Oct 20) — notion-search now searches only Notion pages/databases; notion-connector-search searches connected sources (Slack, Google Drive, GitHub, mail, calendar). notion-ai-search is deprecated from tools/list but still callable."))
story.append(B("<b>Partial update_content edits</b> (Oct 16) — finer-grained content updates via the API."))

story.append(Deliv("This boundary defines the Devin-vs-UI split: analysis, bulk data ops, schema dumps, and Worker code are API-side; views, permissions config, skills setup, and running the AI are UI-side."))

# ============================================================
# 12 — PAGE HISTORY & VERSIONING
# ============================================================
story.append(P("13. Page history and built-in versioning", item_style))
story.append(P("What Notion gives you for free before you build versioning on top", small_style))
story.append(Analogy(
    "Page history is a time machine for individual pages — you can rewind to yesterday's version "
    "and restore it. But it's not a project changelog: it doesn't say 'we restructured the finance "
    "database on Tuesday because of the audit.' That's like having security-camera footage of "
    "every room but no shift log explaining why the furniture was moved. You need both — the "
    "footage (page history) for recovery, the shift log (SemVer change log) for understanding."
))

story.append(B("<b>Page history</b> — every page keeps a version history; you can view and restore previous versions (retention varies by plan)."))
story.append(B("<b>Trash recovery</b> — deleted pages go to trash and can be restored — an accidental delete isn't automatically fatal."))
story.append(B("<b>Upgraded version history</b> (Oct 13, 2026) — clearer records across pages and databases, with highlighted edits, detailed database changes, and attribution (who changed it). Restore prior versions in one click. Now tracks both people and agents making changes — important when agents are editing autonomously."))
story.append(B("<b>What it doesn't do</b> — no schema-level changelog, no semantic versioning, no 'what changed in this database structure last month' report. Page history tracks content, not structure or decisions."))
story.append(B("<b>The gap the SemVer approach fills</b> — a deliberate change log: what structural change was made, why, when, by whom. That's the versioning Item 4 asks for — it doesn't exist natively."))

story.append(P("Page analytics — usage evidence", sub_style))
story.append(B("<b>Per-page stats</b> — view counts, unique viewers, last viewed — visible on any page."))
story.append(B("<b>Tidy-up value</b> — distinguishes dead pages from quietly critical ones during cleanup; 'nobody has opened this in 6 months' is archiving evidence."))
story.append(B("<b>Workspace analytics</b> (admin) — aggregate adoption view: active users, most-viewed content."))

story.append(Deliv("Page history is a safety net, not a versioning system. The change-logging convention still needs to be built — but knowing history/trash exist changes how scary rollback is."))

# ============================================================
# 13 — AI: CAPABILITIES & PRICING
# ============================================================
story.append(P("14. Notion AI — capabilities, limits and pricing", item_style))
story.append(P("What the AI can actually see and do, and what it costs", small_style))
story.append(Analogy(
    "Notion AI pricing is like a utility bill with three meters. The Standard meter (1,500 units) "
    "runs when Notion picks the appliance — cheap, automatic. The Select meter (500 units) runs "
    "when you pick a specific appliance or run a custom one. The Notion meter is the top-up tank "
    "the building manager buys when the first two run dry. BYOK is installing your own solar "
    "panels — the electricity runs on your account, not the utility's. The AI Command Center is "
    "the smart-meter dashboard showing who used what, and letting you cap the spend."
))

story.append(P("Capabilities", sub_style))
story.append(B("<b>Reads</b> — unstructured page content (text blocks), database rows via Q&A, and (through connectors) external sources like Slack/Google Drive."))
story.append(B("<b>Doesn't read formula results</b> — the same opaque-reference limit as the API."))
story.append(B("<b>Meeting notes</b> — transcription/summarisation exists natively."))
story.append(B("<b>Acts</b> — writes content, fills properties, works where you invoke it; can't manipulate linked views/layouts (per the Dev Day material)."))
story.append(B("<b>Sees what you see</b> — the AI's access mirrors the user's permissions; loose permissions = loose AI."))

story.append(P("AI connectors & Enterprise Search", sub_style))
story.append(B("<b>Connectors pull external sources into Notion AI's reach</b> — Slack, Google Drive, GitHub, Gmail, calendar, Jira, Salesforce and more; the AI answers across all of them with citations."))
story.append(B("<b>Enterprise Search</b> — the cross-source search surface; in MCP this is now split: notion-search (workspace only) vs notion-connector-search (connected sources)."))
story.append(B("<b>Permission-mirrored</b> — the AI only sees what the asking user can see in each connected source; a sloppy Google Drive is a sloppy AI answer."))

story.append(P("Pricing and access", sub_style))
story.append(B("<b>Bundled in Business/Enterprise only</b> (~€19.50/seat/month) — no standalone add-on; not on lower tiers."))
story.append(B("<b>Guests don't get AI</b> — members only. Cost pattern: keep most people as guests."))
story.append(B("<b>Trial credits don't refill</b> — once used, gone."))
story.append(B("<b>Separate credit pools</b> — personal AI, Custom Agents, and Workers draw from different pools. Usage meters: Settings → Notion AI → Usage."))
story.append(B("<b>Cost hierarchy</b> — skills run manually (cheapest AI use) → standing agents (continuous credits) → Workers (deterministic, cheapest overall for repeatable work)."))

story.append(P("New credit system (October 19, 2026; takes effect Nov 2 for existing workspaces)", sub_style))
story.append(B("<b>Standard credits</b> — 1,500/month per member. Used when Notion picks the model (via Auto). No rollover."))
story.append(B("<b>Select credits</b> — 500/month per member. Used when you pick the model yourself or run Custom Agents. No rollover."))
story.append(B("<b>Notion credits</b> — workspace-managed balance admins can purchase for usage beyond Standard/Select, high-consumption models, and workspace-funded Custom Agents."))
story.append(B("<b>Separate pools</b> — Standard and Select don't mix or transfer. Each resets monthly. Admins can let members continue on Notion credits once personal credits run out."))
story.append(B("<b>Custom Agents</b> — use the owner's Select credits first, then the owner's Notion credit allowance, then the workspace's shared Notion credits (if admin allows). Admins can switch an agent to draw directly from workspace Notion credits."))
story.append(B("<b>Relevance:</b> the 'run skills manually through HAL' pattern exists to save credits — the new Standard/Select split may change that calculus. Check the workspace's allowance in week 1."))

story.append(P("Bring Your Own AI (BYOK) — October 19, 2026", sub_style))
story.append(B("<b>Connect your ChatGPT plan</b> — Plus, Pro or Go accounts work inside your personal Notion Agent. No markup. Business and Enterprise only."))
story.append(B("<b>Bring Your Own Key</b> (Enterprise, private alpha) — paste an OpenAI, Anthropic or xAI API key. Primary model calls run on your key; Notion credits aren't consumed. Supporting infrastructure (safety guardrails, routing) stays on Notion-managed keys."))
story.append(B("<b>Keys are encrypted</b> (AES-256-GCM with AWS KMS), decrypted only at call time, never logged or cached. Adding/rotating/removing keys is recorded in the org audit log."))
story.append(B("<b>Relevance:</b> if Tacit is on Enterprise and has API keys, primary agent calls could run on Tacit's own keys — worth asking Nick."))

story.append(P("AI Command Center — coming soon", sub_style))
story.append(B("<b>Admin dashboards</b> — usage by person, feature and agent. See what's running, who owns what, what everything costs."))
story.append(B("<b>Spending limits and alerts</b> — set caps and get notified."))
story.append(B("<b>Agent governance</b> — decide which models and agents the team can use."))

story.append(Deliv("Confirms the Business/Enterprise requirement (needed anyway for permissions 3.0 and Workers) and explains why 'skills run manually' and 'execution → Workers' are cost decisions, not just architectural taste."))

# ============================================================
# 15 — MCP
# ============================================================
story.append(P("15. MCP — the context-sharing protocol", item_style))
story.append(P("Model Context Protocol — how Notion becomes a shared brain for any AI tool", small_style))
story.append(Analogy(
    "MCP is a universal translator in a shared office. Claude, ChatGPT, Grok — each speaks a "
    "different dialect, but they all plug into the same filing cabinet (Notion). One direction: "
    "external agents read and update Notion documents. The other: Notion's own agents reach out "
    "to 150+ external tools (Stripe, HubSpot, GitHub) to pull context in. Either way, the cabinet "
    "stays the single source — the translators change, the records don't."
))

story.append(P("What MCP is", sub_style))
story.append(P(
    "MCP (Model Context Protocol) is the standard that lets external AI tools read from and write "
    "to Notion — making Notion a shared context layer that any agent can plug into. Notion calls "
    "it 'our fastest-growing product ever' and overhauled it in October 2026."
))

story.append(P("Two directions", sub_style))
story.append(B("<b>External agents → Notion</b> — connect Claude, ChatGPT, Grok, etc. to read your Notion context and update docs/tasks. They use Notion as a shared brain: find context, remember what matters, make things you can share."))
story.append(B("<b>Notion Agents → external tools</b> — 150+ MCP connections (HubSpot, Stripe, Cloudflare, Slack, Google Drive, GitHub, etc.) so Notion Agents and Custom Agents can pull context and take action across tools. E.g. create an account brief in Notion using HubSpot pipeline data; add Stripe billing details to a customer health review."))

story.append(P("Admin controls", sub_style))
story.append(B("<b>See who connected each AI tool</b>, check when it was last used, and revoke a person's access without affecting other connections."))
story.append(B("<b>Redesigned Connections settings</b> (Oct 13) — search/browse by category, see how each tool connects, preview example workflows. Admins can allow only Notion-verified tools or specific ones they choose."))
story.append(B("<b>Memory sync is live</b> — external agents can read and update Notion memory documents. Skills via MCP coming soon."))

story.append(Deliv("MCP is the context-layer architecture made official — the mechanism that lets Tacit use Claude or ChatGPT alongside Notion AI without fragmenting the data. If Tacit adopts external agents, MCP is how they stay connected to the same source of truth."))

# ============================================================
# 16 — FOUR LAYERS
# ============================================================
story.append(P("16. The four layers — how TacitOS is organised", item_style))
story.append(P("Agent / Custom agent / Skill / Worker — the model that ties everything together", small_style))
story.append(Analogy(
    "A restaurant. HAL is the head chef — takes orders, decides what to cook, makes judgement "
    "calls. Custom agents are the specialist chefs (pastry, grill) — narrower, deeper. Skills "
    "are the recipe books — the chef opens the right one for the dish. Workers are the kitchen "
    "equipment — the ovens, timers, thermometers that execute without tasting. Databases are "
    "the pantry — everything is stored there. Judgement lives with the chefs; execution lives "
    "with the equipment. You don't ask the oven to decide the menu."
))

story.append(B("<b>Agent (HAL)</b> — the main AI actor: interprets requests, chooses skills, makes judgement calls."))
story.append(B("<b>Custom agent</b> — a narrow, task-specific agent for one job — a specialist vs HAL's generalist."))
story.append(B("<b>Skill</b> — the reusable instruction page the agent loads for a repeatable task."))
story.append(B("<b>Worker</b> — deterministic code on Notion's servers; not AI — called as a tool, run on a schedule, or answering a webhook."))
story.append(B("<b>The split that matters:</b> judgement stays in agents; deterministic execution moves to Workers. Cheaper (fewer credits), more reliable (code doesn't hallucinate), auditable (code is versioned)."))

# ============================================================
# 17 — WIKIS
# ============================================================
story.append(PageBreak())
story.append(P("17. Wikis — the verified knowledge layer", item_style))
story.append(P("Pages with an owner and an expiry date — the structure handover docs need", small_style))
story.append(Analogy(
    "A wiki is the difference between a noticeboard and a duty roster. A noticeboard accumulates "
    "flyers until nobody knows what's current. A duty roster has a name on each slot and a date "
    "it was last checked — you can see at a glance who's responsible and what's overdue for "
    "review. Wikis put the name and the date on the knowledge."
))

story.append(P("What makes a wiki page different", sub_style))
story.append(B("<b>Owner</b> — every wiki page has a named person responsible for it. Not 'someone once wrote this' — a specific accountable human."))
story.append(B("<b>Verification + expiry</b> — a page can be marked verified with a review date; when the date lapses, the page is visibly stale until re-verified. Outdated docs flag themselves."))
story.append(B("<b>Locked-by-default posture</b> — wiki pages are meant as authoritative reference, edited deliberately rather than casually."))
story.append(B("<b>AI-aware</b> — the agent can weigh verified wiki content as canonical when answering."))

story.append(P("The Tacit fit", sub_style))
story.append(B("<b>Item 5's format</b> — the 'How TacitOS works' hub is a natural wiki: system map, skills register, permissions notes — each with an owner and a review date, so the handover can't quietly rot."))
story.append(B("<b>The owner's job after you</b> — verification expiry forces the successor to actually re-check pages periodically, instead of inheriting a frozen snapshot."))

story.append(Deliv("The missing middle between 'pages anyone edits' and 'docs nobody updates': named ownership plus built-in staleness detection. Recommended home for the handover hub and the Domain Language doc."))

# ============================================================
# 18 — IMPORT, EXPORT & BACKUPS
# ============================================================
story.append(P("18. Import, export & backups — the data-exit story", item_style))
story.append(P("Getting data in, getting it out, and surviving the platform itself", small_style))
story.append(Analogy(
    "Renting a fully furnished flat: everything works, but none of it is yours unless you pack it. "
    "Export and backups are the packing routine — you hope never to need the boxes, but a handover "
    "without packed boxes means the next tenant starts from empty rooms."
))

story.append(P("Getting data in", sub_style))
story.append(B("<b>Importers</b> — native import from Markdown, CSV, text, HTML, plus guided migrations from Trello, Asana, Evernote, Confluence and others. CSV maps columns to properties — the practical route for legacy spreadsheets."))
story.append(B("<b>Forms</b> (section 4) — ongoing structured intake rather than one-off bulk import."))
story.append(B("<b>API/Workers</b> — programmatic bulk loads and ongoing syncs for systems like Courtside."))

story.append(P("Getting data out", sub_style))
story.append(B("<b>Page export</b> — any page exports as Markdown, HTML, CSV (databases) or PDF — preserving subpages when chosen."))
story.append(B("<b>Workspace export</b> — admins can export the entire workspace (content as Markdown/HTML + file attachments); Enterprise gets larger/automated options."))
story.append(B("<b>The API as exporter</b> — schema dumps and full content pulls via integration; the basis for automated backup scripts and the system-map generator."))

story.append(P("Backups — the uncomfortable truth", sub_style))
story.append(B("<b>Notion has no built-in versioned backup you can restore wholesale</b> — page history and trash cover accidental edits/deletes, not disasters or migrations."))
story.append(B("<b>The practical pattern</b> — periodic whole-workspace exports stored outside Notion (a dated archive in company cloud storage, or Git for text content), automated via the API where possible."))
story.append(B("<b>For a handover engagement this is non-negotiable</b> — the system should survive both a departing admin and a platform outage."))

story.append(Deliv("Week-1 job to propose: a quarterly (at minimum) workspace export to Tacit-owned storage, plus an API-based schema snapshot in the repo. Cheap insurance — and the schema snapshot doubles as before/after evidence for the tidy-up."))

# ============================================================
# 19 — PERIPHERAL PRODUCTS
# ============================================================
story.append(P("19. Peripheral products — awareness only", item_style))
story.append(P("Things that exist in the Notion ecosystem but aren't core to the workspace work", small_style))
story.append(Analogy(
    "These are the other shops on the high street. You should know they exist — if a teammate "
    "says 'Notion Mail' or 'Sprints' you'll know what they mean — but the engagement is about "
    "the one building you're renovating: the workspace itself."
))

story.append(P("Notion Mail", sub_style))
story.append(B("<b>An email client</b> built on Gmail — AI-sorted inbox, snippets, scheduling. Unrelated to the workspace system: it's a front door to email, not part of TacitOS. Worth knowing it exists; no action needed."))

story.append(P("Projects & Sprints", sub_style))
story.append(B("<b>Notion's task-management product layer</b> — pre-built Projects/Tasks databases with sprint planning, dependencies and progress rollups. Only relevant if Tacit adopts Notion for project management — currently TacitOS runs on its own custom databases, so this is a 'could adopt later' note, not a gap."))

story.append(P("Template marketplace", sub_style))
story.append(B("<b>Notion's gallery of community and paid templates</b> — where off-the-shelf systems (like the 40-skill setup Tacit likely inherited) originate. Useful to know as provenance — explains why the workspace looks the way it does — but not forward value: the goal is a system built for Tacit, not another template."))

story.append(P("Mobile & offline", sub_style))
story.append(B("<b>Mobile apps</b> — iOS/Android apps work fine for reading and light edits; heavy database work is better on desktop."))
story.append(B("<b>Offline mode</b> — Notion caches recently viewed pages for reading without a connection; it's not a full offline mode — edits queue and sync when back online. Minor for the engagement; relevant to coaches on court only if they'd update from a phone."))

story.append(Deliv("Nothing here changes the work. Notion Mail is a separate product; Projects/Sprints is an optional alternative to Tacit's custom databases; the marketplace explains the system's origins; mobile is a footnote for on-court use."))

# ============================================================
# CLOSING
# ============================================================
story.append(Spacer(1, 8))
story.append(P(
    "<i>Notion General Knowledge Base — platform reference by topic. Working document, "
    "November 2026.</i>",
    small_style
))

# ---------- Build ----------
doc = SimpleDocTemplate(
    OUTPUT, pagesize=A4,
    leftMargin=1.7*cm, rightMargin=1.7*cm,
    topMargin=1.5*cm, bottomMargin=1.5*cm,
    title="Notion General Knowledge Base — Tacit Padel",
    author="Dhiren Kirpalani",
)
doc.build(story)
print(f"PDF written: {OUTPUT}")
