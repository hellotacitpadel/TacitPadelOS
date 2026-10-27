# Wendy — Log Router — Skill Reference (legacy)

*Generated Oct 27, 2026 from the live skill page · 66 blocks · LEGACY generation — not in the V2.0 L3 registry*

---

## Routing Logic

### Step 1 — Identify entity type

- Query entity page. Check Template Type property and Parent Task / Parent Project relations.
- IF Template Type = Sub Task OR entity has a Parent Task that itself has a Parent Task → REJECT. "Sub-tasks don't have logs. Log against parent task [parent name] instead." Return rejection to caller. STOP.
- IF entity has a Parent Project relation (i.e. it's a sub-project) → flag for dual-write. Continue.
- Classify: Project, Sub-project, Task (project-linked), Task (standalone).
### Step 2 — Resolve write target(s)

| Entity type | Write target |
|---|---|
| Project | Project's own log section |
| Sub-project | Sub-project's log section + parent project's log section (dual-write) |
| Task with Project relation | Task's own log section + parent project's log section (dual-write) |
| Standalone task | Task's own log section |
### Step 3 — Pre-verify target(s)

- View each target page. Check that the expected log section heading exists in the page content.
- IF target exists → continue to Step 4.
- IF target missing (single target) → surface gap: "[Page] has no log section. Entry not written. Fix needed." Return gap to caller. STOP.
- IF target missing (dual-write, one exists) → write to available target. Surface gap immediately: "Wrote to [available page], but [missing page] has no log section. Entry not written there. Fix needed." Continue with available target only.
---
## Entry Format

### Step 4 — Format entry

Build a toggle block for insertion:
```
<details>
<summary>[YYYY-MM-DD HH:mm] [actor] — [action_summary] [⚠️ if flags]</summary>
	[Detail with entity mentions. Flag descriptions if any.]
</details>
```
Rules:
- Timestamp: YYYY-MM-DD HH:mm in the user's timezone
- Actor: Alter Ego mention (linked) or "HAL"
- ⚠️ prefix on summary line if any flags present — enables flag memory scanning
- Toggle body: expanded detail with page mentions, relation context, flag descriptions
- Reverse chronological: insert immediately after the log section heading, before existing entries (newest at top)
### Step 5 — Write

- Single target → one write.
- Dual-write → write to primary target (sub-project) first, then secondary (parent project). Sequential, not atomic. If the second write fails, the first already succeeded — surface the gap per Step 3 rules.
### Step 6 — Update log summary toggle

- Scan the log section for the log summary toggle. Fixed identifier: 📋 Log Summary — last updated [date]
- IF found → update the summary content with the latest entry summary. Update the date to today.
- IF not found → surface gap: "Log summary toggle missing on [page]. Entry written but summary not updated." Do not create the summary toggle — that's template/infrastructure work.
---
## Flag Scan

### Step 7 — Scoped flag scan

After writing, scan for repeat flags in the same log section:
1. Read the last 10 toggle summary lines in the section where the entry was just written.
1. Look for ⚠️ markers that mention the same entity (match on entity page mention or title substring).
1. IF repeat flag found → include escalation in the return message: "⚠️ [entity] was flagged on [previous date] for [issue] — still unresolved."
1. IF no repeat → no escalation. Return normally.
Depth limit: 10 toggle summaries. Never scan entire log history — performance degrades on long-lived projects.
---
## Transition Entries

When a task's project relation changes, the calling skill invokes Log Router to write transition entries to all affected locations. Log Router writes the entries; the calling skill handles follow-up decisions.
### Standalone → project-linked

1. Task log: Task linked to [project]. Future entries now dual-write (task log + project log).
1. Project log: Standalone task [task] linked to this project.
### Project-linked → standalone

1. Project log: Task [task] unlinked from this project.
1. Task log: Task unlinked from [project]. Entries now write here only.
### Reassigned to different project

1. Old project log: Task [task] moved to [new project].
1. New project log: Task [task] moved here from [old project].
The calling skill decides any follow-up (e.g. "Does it need its own brief?"). Log Router writes entries only.
---
## Output Format

Return to caller after every invocation:
```
✅ Log Entry Written
- Entity: [name]
- Target(s): [page(s) written to]
- Entry: [summary line]
- Flags: [any flags included, or "none"]
- Escalations: [any repeat flags detected, or "none"]
- Gaps: [any missing targets/summaries, or "none"]
```
IF rejected (sub-task):
```
❌ Log Rejected
- Entity: [name]
- Reason: Sub-tasks don't have logs. Log against parent task [parent name] instead.
```
IF target missing (single target, no write):
```
⚠️ Log Not Written
- Entity: [name]
- Target: [page]
- Reason: No log section found on [page]. Fix needed.
```
---
## Drift Resistance

Key drift patterns (mitigated by lean page Rules 1–8): callers assembling their own entries bypassing Log Router, silent writes to alternative locations, unbounded flag scanning, sub-task log attempts slipping through, log summary toggles being created ad-hoc instead of as infrastructure, callers making decisions that belong to them inside Log Router scope.
---
Dormant: Per-entity flag scan depth override. Not active — 10 is sufficient globally. Activate if long-lived projects with dense logs need deeper scanning.