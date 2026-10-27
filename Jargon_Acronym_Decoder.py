#!/usr/bin/env python3
"""Generate the Jargon & Acronym Decoder PDF — plain-language reference for the TacitOS docs."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
)

OUTPUT = "/Users/dhirenkirpalani/Downloads/tacit-padel-notion/Jargon_Acronym_Decoder.pdf"

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

story.append(P("Jargon & Acronym Decoder", title_style))
story.append(P(
    "Tacit Padel × Notion — every abbreviation and technical term used across the TacitOS docs",
    subtitle_style
))

story.append(P(
    "A plain-language reference for anyone reading the Tier 1 Breakdown, First Stage Breakdown, or "
    "Notion General Knowledge Base without a technical background. Acronyms first, then jargon, "
    "then the names Tacit gave its own systems.",
    body_style
))

# ============================================================
# ACRONYMS
# ============================================================
story.append(P("1. Acronyms & abbreviations", item_style))
story.append(P("A–Z, expanded", small_style))

story.append(make_table(
    ["Term", "Full form / meaning"],
    [
        ["AC/DC", "The skill-building loop: Assess → Collaborate → Draft → Certify (also framed as Discover → Codify → Ship)"],
        ["AES-256-GCM", "The encryption standard used to protect BYOK API keys stored in Notion"],
        ["AI", "Artificial intelligence — in Notion, the agent that reads and writes workspace content"],
        ["API", "Application Programming Interface — the channel code uses to read/write Notion data"],
        ["AWS", "Amazon Web Services — the cloud provider behind Notion's key management (KMS)"],
        ["BYOK", "Bring Your Own Key — run agent calls on your own OpenAI/Anthropic/xAI API key instead of Notion credits"],
        ["CLI", "Command Line Interface — a text-based developer tool (Notion's Worker tool is 'ntn')"],
        ["CLP", "Context Layer Prompt — the always-loaded instruction page that points the AI at everything else"],
        ["DB", "Database — 'TP: Sales DB' means the Sales database"],
        ["FX", "Foreign exchange — currency conversion rates (Freya's domain)"],
        ["GPT", "The model family behind ChatGPT — 'pick a GPT model' = choose a ChatGPT engine"],
        ["HAL", "Tacit's central agent — a name (from 2001's HAL 9000), not an acronym"],
        ["HR", "Human Resources — e.g. the 'Lock for HR' permissions button"],
        ["HTTP(S)", "The web protocol — the channel webhook Workers answer"],
        ["KMS", "AWS Key Management Service — encrypts BYOK keys at rest"],
        ["L1 / L2b / L3", "Tacit's three skill layers: utilities / main skills / reference docs"],
        ["LLM", "Large Language Model — the engine behind AI agents (GPT, Claude, Gemini, Grok)"],
        ["M1–M4", "The Tier 1 milestones in the engagement plan"],
        ["MCP", "Model Context Protocol — the standard connecting external AI tools to Notion"],
        ["PRD", "Product Requirements Document — a standard spec format skills can generate"],
        ["Q&A", "Questions & Answers — Notion's 'ask the workspace' feature"],
        ["RSS", "Really Simple Syndication — a feed format for subscribing to update sources"],
        ["SDK", "Software Development Kit — a code library for building on a platform (Notion Agent SDK)"],
        ["SemVer", "Semantic Versioning (e.g. 1.2.3) — the change-logging convention proposed for the workspace"],
        ["SKILL.md", "The portable file format for exporting Notion skills to Claude Code, Codex, Cursor, etc."],
        ["TP", "Tacit Padel — prefix on database names (TP: Events, TP: Sales, TP: Balance Sheet)"],
        ["UI", "User Interface — the app's screens; what you click vs what code does via the API"],
        ["WIP", "Work In Progress"],
    ],
    [3.4*cm, 13.1*cm],
))

# ============================================================
# TECHNICAL JARGON
# ============================================================
story.append(P("2. Technical jargon", item_style))
story.append(P("Terms that aren't acronyms but still need translating", small_style))

story.append(make_table(
    ["Term", "Meaning in plain language"],
    [
        ["Agent harness", "The infrastructure an AI agent runs on — its memory, tool access and step-by-step loop"],
        ["Cold handoff", "A briefing that lets a newcomer (or a fresh AI session) pick up work with zero prior context"],
        ["Deterministic", "Same input → same output, every time. No judgement, no variation — what code gives you"],
        ["Duct-tape", "Informal for fragile glue between systems (Make/Zapier workarounds that break)"],
        ["Grounding", "Loading current project context at session start so the AI begins up to speed"],
        ["Hallucinate", "When AI confidently produces wrong or invented information"],
        ["Opaque reference", "An API value you can see exists but can't read — what the API returns for formulas"],
        ["Parallel-run", "Running old and new systems side by side, comparing outputs before switching over"],
        ["Polling", "Checking for new data on a schedule (vs a webhook, which gets told)"],
        ["Provenance", "Where information came from — the source trail"],
        ["Reconciliation", "Checking two sets of numbers match — and halting when they don't"],
        ["Router", "An agent that picks which skill or tool should handle a request"],
        ["Sandbox", "A safe isolated environment for testing changes without touching production"],
        ["Schema", "A database's structure — its properties, types and relations (not the rows themselves)"],
        ["Source of truth", "The system that owns the authoritative copy of a piece of data"],
        ["Staging", "A pre-production copy of the environment used to test changes safely"],
        ["Token", "(API) a secret string identifying an integration · (AI) a chunk of text the model bills per unit"],
        ["Webhook", "A URL an external system calls to notify yours that something happened"],
        ["Waterfall", "A calculation chain where each step feeds the next — e.g. the 40/30/15/15 comp split"],
    ],
    [3.4*cm, 13.1*cm],
))

# ============================================================
# TACIT-SPECIFIC NAMES
# ============================================================
story.append(P("3. Tacit's own names", item_style))
story.append(P("The people, agents and systems inside TacitOS that aren't generic Notion terms", small_style))

story.append(make_table(
    ["Name", "What it is"],
    [
        ["HAL", "Tacit's central AI agent — reads skills, interprets requests, makes judgement calls"],
        ["Basil", "Skill — classifies expenses and financial records"],
        ["Freya", "Skill — handles FX (currency conversion) for international transactions"],
        ["Ivy", "Skill — generates invoices; runs in screenshot mode because the API can't read formula results"],
        ["Eric", "Skill — one of the ~40 inherited Skills 1.0 pages"],
        ["Faye", "Skill — one of the ~40 inherited Skills 1.0 pages"],
        ["Log Router", "Skill — routes log entries to the right audit/change-log destination"],
        ["TacitOS", "The name for Tacit's whole Notion-based operating system"],
        ["TP:", "Prefix on Tacit's core databases — TP: Events, TP: Sales, TP: Hourly Rate, TP: Balance Sheet, TP: People, TP: Organisations"],
        ["Sales Update Button", "A dead automation — killed by the .first()/.last() null-safety block in April 2026"],
        ["Confirm: Pattern B", "A still-exposed formula-driven automation with the same null-safety risk"],
        ["The money chain", "The formula chain Events → Sales → Hourly Rate → Balance Sheet — the financial calculation backbone"],
        ["Nimbus", "The reference design for a self-improving knowledge agent (router + four DBs) — a pattern, not a Tacit system"],
        ["Skills 1.0 / 2.0", "Notion's two eras of skills — Tacit inherited ~40 skills built on 1.0; 2.0 is the managed platform"],
        ["Permissions 1.0 / 2.0 / 3.0", "The three eras of Notion access control — 1.0 all-or-nothing, 2.0 row-level, 3.0 column-level"],
    ],
    [3.4*cm, 13.1*cm],
))

story.append(Spacer(1, 10))
story.append(P(
    "<i>Jargon & Acronym Decoder — companion to the Tier 1 Breakdown, First Stage Breakdown, and "
    "Notion General Knowledge Base. Working document, November 2026.</i>",
    small_style
))

# ---------- Build ----------
doc = SimpleDocTemplate(
    OUTPUT, pagesize=A4,
    leftMargin=1.7*cm, rightMargin=1.7*cm,
    topMargin=1.5*cm, bottomMargin=1.5*cm,
    title="Jargon & Acronym Decoder — Tacit Padel",
    author="Dhiren Kirpalani",
)
doc.build(story)
print(f"PDF written: {OUTPUT}")
