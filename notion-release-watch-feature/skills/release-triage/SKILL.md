---
name: release-triage
version: 0.2.0
description: Assess new entries in the Notion Updates database for their impact on TacitOS. Use when asked to triage Unreviewed rows, summarise a Notion release, or judge whether a platform change affects Tacit's Notion system.
---

# Release Triage

Turn raw release entries into assessed Tacit-impact notes. You **propose** the assessment — a human decides and signs off (`Reviewed by` stays empty until a person fills it).

## Input

Rows in the **Notion Updates** database where `Status` is **empty or `Unreviewed`** (the Worker files rows without a status). Each row has: Title, Release date, Link, Source.

## Process

For each Unreviewed row:

1. **Read the release** — open the `Link` (fetch the page) or use the title if the link is unreachable.
2. **Summarise in two lines** — what shipped, in plain language.
3. **Judge Tacit impact** — does this touch anything TacitOS depends on? Write the note into `Tacit impact`: *which part* of the system and *what changes for us*. Be specific — "column permissions shipped → the feature needed for hiding pay columns" beats "relevant to permissions".
4. **Set `Relevance`** using the bar below.
5. **Set `Affects`** — every domain the release touches.
6. **Set Status → `Triaged`.**

## Relevance bar

- **High** — touches skills, permissions, the money chain (People/Events/Sales/Balance Sheet), Workers, or AI pricing. Something we must act on or verify.
- **Medium** — adjacent: might matter soon, worth a follow-up look.
- **Awareness** — ecosystem noise; good to know, no action.

## High-relevance handling

If Relevance = High: **create a task** in the *TacitOS Work Tracker* database (title = the action needed, e.g. "Test column permissions against formula chains"), fill its properties sensibly from context, and link it in the update row's `Follow-up task` relation. If a row already has a linked follow-up task, do not create another. Do **not** mark the row `Actioned` — that decision belongs to the human reviewer.

## Rules

- Never set `Reviewed by` — the human gate.
- Never mark `Actioned` or `Dismissed` — `Triaged` is as far as you go.
- If a release's impact is genuinely unclear, say so in `Tacit impact` rather than guessing — flag it for the reviewer.
- German-language feed entries: summarise in English.

## What you are

The researcher in the clipping-service analogy — the Worker collects, you annotate, a human approves.

## Changelog

- **0.1.0** (Oct 2026) — Initial spec: Unreviewed → Triaged loop, relevance bar, High→task linking, human-gate guardrails.
- **0.1.1** (Oct 2026) — Added no-duplicate-task rule; kept task-property specifics out of the spec on purpose (the model reads the tracker schema at run time).
