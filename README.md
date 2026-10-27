# TacitPadelOS

The operating system for Tacit Padel — a Notion-powered workspace where AI skills prepare actions, humans approve, and deterministic workers execute the financial records.

## How it works

- **Human** approves at checkpoints — nothing financial happens without explicit confirmation
- **Skills** (AI) gather details, verify them with the operator, write the instruction, set the trigger
- **Automations** dispatch to workers when trigger fields are set
- **Workers** execute deterministically — the only component that creates Sales and Balance Sheet outcomes

## Repository layout

| Directory | Contents |
|---|---|
| `notion-release-watch-feature/` | Notion worker watching Notion release notes — sync, tools, webhooks, and agent skills |
| `database-references-docs/` | System map, database use cases & skills registry, permission test matrix, schema dumps |
| `skills-reference-docs/` | Skill reference docs — one file per skill (Polly, Basil, Wendy, Warren, etc.) |
| root | Working docs — first-stage breakdown, jargon/acronym decoder, Notion knowledge base, staying-current notes, work tracker CSVs |

Feature work happens on branches merged back to `main`.
