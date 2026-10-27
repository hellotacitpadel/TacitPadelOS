#!/usr/bin/env python3
"""Generate the Staying Current with Notion PDF — how to track platform updates."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
)

OUTPUT = "/Users/dhirenkirpalani/Downloads/tacit-padel-notion/Staying_Current_with_Notion.pdf"

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
analogy_style = ParagraphStyle(
    "AnalogyX", parent=body_style,
    fontSize=9, leading=12.5, textColor=colors.HexColor("#1E3A8A"),
    backColor=colors.HexColor("#E0E7FF"),
    borderPadding=6, spaceBefore=6, spaceAfter=10,
)
note_style = ParagraphStyle(
    "NoteX", parent=body_style,
    fontSize=9, leading=12.5, textColor=colors.HexColor("#7C2D12"),
    backColor=colors.HexColor("#FEF3C7"),
    borderPadding=6, spaceBefore=6, spaceAfter=10,
)
deliv_style = ParagraphStyle(
    "DelivX", parent=body_style,
    fontSize=9.5, leading=13, textColor=colors.HexColor("#065F46"),
    backColor=colors.HexColor("#D1FAE5"),
    borderPadding=6, spaceBefore=4, spaceAfter=10,
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

def Analogy(text):
    return Paragraph(f"<b>Analogy:</b> {text}", analogy_style)

def Deliv(text):
    return Paragraph(f"<b>Why it matters for Tacit:</b> {text}", deliv_style)

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

story.append(P("How to Stay Current with Notion", title_style))
story.append(P(
    "Notion ships major updates every 2–4 weeks — here's how to track them",
    subtitle_style
))

story.append(Analogy(
    "Tracking Notion updates is like following a fast-moving sports league. The official site "
    "(notion.com/releases) is the league's own scoreboard — authoritative but dry. Matthias "
    "Frank's tracker is the dedicated fan blog — every play logged and explained, with an RSS "
    "feed so updates come to you. The developer changelog is the rulebook — only matters when "
    "you're playing (building). Set up a 'Notion Updates' page in the workspace as your own "
    "scrapbook — clip what matters, note whether it affects TacitOS, and it becomes part of the "
    "handover record."
))

# ============================================================
# PRIMARY SOURCES
# ============================================================
story.append(P("1. Primary sources — check weekly", item_style))
story.append(B("<b>Notion Releases page</b> — notion.com/releases — the official changelog. Every versioned release (3.7, 3.8, etc.) gets a dedicated page with full feature lists. The source of truth."))
story.append(B("<b>Notion Developer Changelog</b> — developers.notion.com/page/changelog — API-level changes (new properties, MCP tools, SDK versions). Important for anything built with Workers or the API."))
story.append(B("<b>Notion Help Center</b> — notion.com/help — feature documentation updated as features ship. Search for the feature name when something new appears."))

# ============================================================
# BEST SECONDARY SOURCE
# ============================================================
story.append(P("2. Best secondary source", item_style))
story.append(B("<b>Matthias Frank's Notion Updates</b> — matthiasfrank.de/en/notion-updates/ — 160+ entries, every update logged and explained, with an RSS feed. Also publishes a Weekly Notion Roundup on Medium (medium.com/@mfreihaendig). The single best independent tracker — Nick already pointed you at his channel."))

# ============================================================
# DEEPER CONTEXT
# ============================================================
story.append(P("3. For deeper context", item_style))
story.append(B("<b>Notion blog</b> — notion.com/blog — launch posts with the reasoning behind features."))
story.append(B("<b>Notion Coach</b> — notioncoach.com/feed — tracks releases with status, plan requirements and practical notes."))
story.append(B("<b>Notion YouTube</b> — official channel for feature demos and trailers."))
story.append(B("<b>Notion Community</b> — notion.com/community — user discussions; surfaces edge cases and bugs before official docs."))

# ============================================================
# PRACTICAL SETUP
# ============================================================
story.append(P("4. Practical setup for the engagement", item_style))
story.append(B("<b>Subscribe to Matthias Frank's RSS</b> — paste the feed URL into any reader; updates arrive as published."))
story.append(B("<b>Bookmark notion.com/releases</b> — check weekly; Notion ships major updates roughly every 2–4 weeks."))
story.append(B("<b>Watch the developer changelog</b> if you start building Workers — API changes affect what you can do."))
story.append(B("<b>Set up a 'Notion Updates' page in the Tacit workspace</b> — log relevant changes as they ship, with a note on whether they affect TacitOS. This becomes part of the handover documentation (Item 5) and proves you're tracking the platform the system depends on."))

# ============================================================
# TIMELINE
# ============================================================
story.append(P("5. Recent release timeline", item_style))
story.append(make_table(
    ["Date", "Release", "What it brought"],
    [
        ["Sep 9, 2026", "Model controls", "Admins control which AI models agents can use"],
        ["Sep 15, 2026", "Notion 3.7 — Agent skills", "Skills 2.0 library, Skills API, SKILL.md export, sub-agents, meeting-triggered agents, embedded agents, Agent SDK public beta"],
        ["Oct 13, 2026", "Notion 3.8 — Context for your agents", "MCP overhaul (150+ connections), column permissions shipped, synced databases rebuilt (GitHub/Jira/Salesforce), version history upgraded, ChatGPT plan integration, Connections settings redesigned"],
        ["Oct 19, 2026", "Agents rebuilt", "Agents get own computer/browser, 24-hour tasks, 'Review for me' mode, Auto model router (~90% cheaper), BYOK (ChatGPT plan live; API keys in Enterprise alpha), new Standard/Select credit system, AI Command Center announced"],
        ["Nov 2, 2026", "Credit system effective", "New Standard/Select/Notion credit model takes effect for existing workspaces"],
    ],
    [2.6*cm, 4.2*cm, 9.7*cm],
))

story.append(Spacer(1, 10))
story.append(P(
    "<b>The cadence to expect:</b> a versioned release (3.x) roughly every 4–6 weeks, feature "
    "drops between them, and developer/API changes continuously. A 15-minute weekly check of "
    "the releases page plus the RSS feed covers it.",
    note_style
))

# ============================================================
# AUTOMATING IT — RELEASE WATCH
# ============================================================
story.append(P("6. Automating it — the 'Release Watch' system", item_style))
story.append(P("A Worker + a skill + a human gate — the update tracker that runs itself", small_style))
story.append(Analogy(
    "Like a newspaper clipping service. A machine scans the feeds and snips out every new story "
    "(the Worker — cheap, tireless, no judgement). A researcher reads each clipping and writes "
    "'why this matters to us' in the margin (the skill — interpretation). An editor signs off "
    "before anything goes in the archive (the human gate)."
))

story.append(P("The live artifact — a Notion Updates database", sub_style))
story.append(P(
    "A Worker can't edit a PDF on a laptop — so the living tracker is a <b>'Notion Updates' "
    "database inside the Tacit workspace</b>, and the PDFs get regenerated occasionally as "
    "snapshots. The database is the source of truth; the docs are exports."
))

story.append(P("Layer 1 — the Worker (deterministic)", sub_style))
story.append(B("<b>Sync trigger</b>, e.g. every 6 hours: poll <b>Matthias Frank's RSS feed</b> (XML — trivially parseable, no scraping) and optionally the developer changelog."))
story.append(B("<b>Dedupe</b> — compare each entry's URL/date against existing rows in the Updates database."))
story.append(B("<b>Insert new rows</b> — Date | Title | Link | Source | Status: Unreviewed."))
story.append(B("<b>Pure code</b> — fetch, parse, dedupe, insert. Cheap, versioned in the Tacit repo — exactly what Workers are for."))

story.append(P("Layer 2 — the skill (judgement)", sub_style))
story.append(B("<b>'Release Triage' skill</b> — run over the Unreviewed rows: summarise each release in two lines, then judge <b>Tacit impact</b> — does it touch TacitOS? Which part: skills, permissions, the money chain, Workers?"))
story.append(B("<b>Output</b> — a Relevance field (High / Medium / Awareness) plus a written impact note; High items create a Task or flag Nick."))
story.append(B("<b>Why AI and not code</b> — 'does this affect Tacit?' is an interpretation call, not a deterministic one."))

story.append(P("Layer 3 — the human gate", sub_style))
story.append(B("You or Nick reviews the triaged entries — the same review-gate principle as the Nimbus pattern. The machine proposes; a person disposes."))

story.append(P("What it needs", sub_style))
story.append(make_table(
    ["Requirement", "Status"],
    [
        ["Business plan (Workers)", "Tacit needs it anyway for column permissions — same plan"],
        ["A 'Notion Updates' database", "Quick to create — becomes part of the handover hub"],
        ["ntn CLI + repo", "Same setup as the other Tier 1 Workers"],
        ["RSS feed URL", "Free — matthiasfrank.de/en/notion-updates/"],
    ],
    [6.0*cm, 10.5*cm],
))

story.append(P("Two honest caveats", sub_style))
story.append(B("<b>No official releases API</b> — notion.com/releases is a marketing page, so parsing it is scraping (fragile). The RSS feed and developer changelog are stable formats — better targets. The releases page itself could be a monthly agent task: an agent with a browser can read a web page and tolerate layout changes."))
story.append(B("<b>Scheduling</b> — the Sync Worker handles polling; triage could be a scheduled Custom Agent (Select credits) or a weekly manual skill run — one run, batch-review the week's rows, cheaper."))

# ============================================================
# BUILD SPEC
# ============================================================
story.append(P("7. Build spec — ready to implement", item_style))
story.append(P("Database schema, Worker pseudocode, and the skill outline — designed, not yet built", small_style))

story.append(P("The 'Notion Updates' database schema", sub_style))
story.append(make_table(
    ["Property", "Type", "Notes"],
    [
        ["Title", "Title", "Release headline"],
        ["Release date", "Date", "From the feed entry"],
        ["Link", "URL", "Source URL — also used as the dedupe key"],
        ["Source", "Select", "MF Updates RSS / Dev Changelog / Releases page / Manual"],
        ["Status", "Status", "Unreviewed → Triaged → Actioned / Dismissed"],
        ["Relevance", "Select", "High / Medium / Awareness — set by the triage skill"],
        ["Tacit impact", "Text", "The skill's written note: which part of TacitOS it touches"],
        ["Affects", "Multi-select", "Skills / Permissions / Money chain / Workers / Automations / Sharing / Memory / Other"],
        ["Follow-up task", "Relation", "Link to Tasks DB — created for High relevance"],
        ["Reviewed by", "Person", "Who signed off (the human gate)"],
    ],
    [3.4*cm, 3.2*cm, 9.9*cm],
))

story.append(P("The Worker — pseudocode", sub_style))
story.append(P(
    "A Sync-trigger Worker written in TypeScript, deployed via ntn. The shape:",
    body_style
))
story.append(make_table(
    ["Step", "What the code does"],
    [
        ["1. Fetch", "GET the RSS feed(s) — MF Updates first, dev changelog optionally"],
        ["2. Parse", "XML → list of {title, url, pubDate} entries"],
        ["3. Dedupe", "Query the Updates DB for rows where Link = url; skip any already present"],
        ["4. Insert", "For each new entry: create row with Title, Release date, Link, Source, Status = Unreviewed"],
        ["5. Log", "Write a run record (entries found, added, errors) — the audit trail"],
        ["6. Alert", "If N new rows arrived: post a Notion notification or trigger the triage path"],
    ],
    [2.2*cm, 14.3*cm],
))
story.append(B("<b>Error handling</b> — if the feed is unreachable, log the failure and exit cleanly; a missed run is picked up next cycle, not retried into a wall."))
story.append(B("<b>Idempotent by design</b> — dedupe on URL means running it twice adds nothing; safe to schedule aggressively."))
story.append(B("<b>Notion-Version header</b> — pin the API version in code so a platform API change can't silently alter behaviour."))

story.append(P("The 'Release Triage' skill — outline", sub_style))
story.append(B("<b>Trigger</b> — weekly manual run (cheapest), or a scheduled Custom Agent (Select credits) once trust is established."))
story.append(B("<b>Instructions (lean, per skill-engineering rules)</b> — the goal ('turn raw release entries into assessed Tacit-impact notes'), the output format (Relevance + impact note + Affects tags + optional task), the relevance bar (High = touches skills/permissions/money chain/Workers; Awareness = ecosystem noise)."))
story.append(B("<b>Process</b> — read each Unreviewed row → fetch the linked release → write the two-line summary + impact → set Relevance/Affects → High items get a Tasks-DB row → mark Triaged."))
story.append(B("<b>Human gate</b> — Reviewed-by is a person field; the skill proposes, it doesn't action."))

story.append(P("Build order when workspace access lands", sub_style))
story.append(B("<b>Day 1</b> — create the Updates database + share it with the Tacit integration; scaffold the Worker in the repo."))
story.append(B("<b>Day 2</b> — implement + test the Worker locally against the live feed with a sandboxed Updates DB."))
story.append(B("<b>Day 3</b> — deploy, schedule, write the triage skill, run the first manual triage."))
story.append(B("<b>Handover</b> — README in the repo + a wiki page in the hub describing the loop."))

story.append(Deliv(
    "An ideal first real Worker: read-only against external feeds, writes only to a new Updates "
    "database — nothing touches the money chain. A low-risk M1 warm-up before the financial "
    "waterfall, and it produces the handover-ready tracking system as a by-product."
))

story.append(Spacer(1, 8))
story.append(P(
    "<i>How to Stay Current with Notion — companion to the Notion General Knowledge Base. "
    "Working document, November 2026.</i>",
    small_style
))

# ---------- Build ----------
doc = SimpleDocTemplate(
    OUTPUT, pagesize=A4,
    leftMargin=1.7*cm, rightMargin=1.7*cm,
    topMargin=1.5*cm, bottomMargin=1.5*cm,
    title="How to Stay Current with Notion — Tacit Padel",
    author="Dhiren Kirpalani",
)
doc.build(story)
print(f"PDF written: {OUTPUT}")
