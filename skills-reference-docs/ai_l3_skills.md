# AI: (L3) Skills — Database Reference

*The skills registry — every AI skill in TacitOS lives as a page here.*

**23 properties** · generated Oct 27, 2026 from live schema · source: `dumps/ai__l3_skills.json`

This is the Layer-3 registry: each row is one skill (Basil, Polly, Felix…). The lifecycle status tells you what's live; the permission fields control who can edit it; `Write boundary` states what the skill is allowed to modify.

---

## Identity

| Property | Type | Detail |
|---|---|---|
| Name | title |  |

## Ownership & permissions

| Property | Type | Detail |
|---|---|---|
| Can Edit | people |  |
| Owner | people |  |
| Can View | people |  |
| Can Comment | people |  |

## Governance & lifecycle

| Property | Type | Detail |
|---|---|---|
| Description | rich_text |  |
| Last edited time | last_edited_time |  |
| Class | select | `Lite`, `Standard`, `Controlled`, `High-risk` |
| Created time | created_time |  |
| Lifecycle | status | `Draft`, `In review`, `Testing`, `Active`, `Held`, `Superseded`, `Retired` |
| Write boundary | rich_text |  |
| Database Group | select | `Storage`, `Activities`, `Knowledge`, `Tagging`, `Build`, `AI`, `SV` |
| Review due | date |  |
| Function | multi_select | `Operating`, `Build`, `Control` |

## Relations

| Property | Type | Detail |
|---|---|---|
| References | relation | → 3f4afdfb-c3c |
| Template [Self] | relation | → 3f4afdfb-c3c |
| Parent item | relation | → 3f4afdfb-c3c |
| Sub-item | relation | → 3f4afdfb-c3c |

## Computed

| Property | Type | Detail |
|---|---|---|
| Min. Access | formula | see below |

## Other

| Property | Type | Detail |
|---|---|---|
| Created by | created_by |  |
| Last edited by | last_edited_by |  |
| Files | files |  |
| Home | button |  |

## Formulas

### Min. Access
Combines the people-permission fields into a single access view.

```notion
lets(
  /* Combine all permission names */
  allAccessGroups, concat(
    prop("Can Edit"),
    prop("Can Comment"),
    prop("Can View")
  ).map(current.name()),
  /* Return the broadest group present */
  ifs(
    allAccessGroups.includes("Team"), "Team",
    allAccessGroups.includes("Leadership"), "Leadership",
    allAccessGroups.includes("Owners"), "Owners",
    "Admin"
  )
)
```

---
*Regenerate: re-run the dump script when the schema changes.*