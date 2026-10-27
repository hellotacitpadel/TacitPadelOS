# TP: Events — Database Reference

*The financial unit — every sale targets an event. 14 formulas = second-riskiest for permission changes.*

**42 properties** · generated Oct 26, 2026 from live schema · source: `dumps/tp__events.json`

💰 = money-sensitive field (pay/pricing/cost-related) — the columns Nick wants to hide; watch how formulas and rollups reference them.

## Identity

| Property | Type | Detail |
|---|---|---|
| Event | title |  |

## People & dates

| Property | Type | Detail |
|---|---|---|
| Responsible | people |  |
| Can Edit | people |  |
| Informed | people |  |
| Can View | people |  |
| Can Comment | people |  |

## People & dates

| Property | Type | Detail |
|---|---|---|
| Scheduled | date |  |

## Selections

| Property | Type | Detail |
|---|---|---|
| Player Academy Tier | select | `Basic`, `Standard`, `Premium` |
| Financial Route | select | `Legacy`, `Payment V1` |
| Facility | select | `TBC`, `On Court`, `Classroom`, `Gym` |
| Database Group | select | `Storage`, `Activities`, `Knowledge`, `Tagging`, `Build`, `AI`, `SV` |
| Clinic Level | select | `U8`, `U14`, `U18`, `Introduction`, `Beginner`, `Intermediate`, `Advanced` |
| Cancelled By... | select | `Student`, `Tacit`, `Club` |
| Clinic Format | select | `` |

## Numbers & money

| Property | Type | Detail |
|---|---|---|
| Capacity | number | format: number |
| Published Price per Student (IDR) 💰 | number | format: rupiah |

## Numbers & money

| Property | Type | Detail |
|---|---|---|
| Payment Processing Exception 💰 | checkbox |  |

## Text & links

| Property | Type | Detail |
|---|---|---|
| Cancellation Notes [move to resources] | rich_text |  |

## Relations

| Property | Type | Detail |
|---|---|---|
| Sub Event | relation | → TP: Events |
| Published Price List 💰 | relation | → TP: Pricing |
| Parent Event | relation | → TP: Events |
| TP: Event [Self] | relation | → TP: Events |

## Formulas

| Property | Type | Detail |
|---|---|---|
| Own Sale ID | formula | `if({{notion:block_property:Z_gP:00000000-0000-0000-0000-000000000000:728afdfb-c3c7-816d-b8e3-0003a3b6442c}}.length() > 0,   {{notion:block_property:Z_…` |
| ID | formula | `if(prop("Parent Event").length() == 0,   prop("Own Sale ID"),   prop("Parent Sale ID") )` |
| Seats Available | formula | `prop("Capacity") - prop("Sales").length()` |
| Availability | formula | `lets(   /* Get coaches directly from Coaches relation */   eventCoaches, {{notion:block_property:V%3B_L:00000000-0000-0000-0000-000000000000:728afdfb-…` |
| Split: Tacit % | formula | `lets(   orgs, {{notion:block_property:RH%5Dy:00000000-0000-0000-0000-000000000000:728afdfb-c3c7-816d-b8e3-0003a3b6442c}},   owners, orgs.filter(curren…` |
| Min. Access | formula | `lets(   /* Combine all people from the three permission properties */   allPeople, concat(     prop("Can Edit"),     prop("Can Comment"),     prop("Ca…` |
| Coach Level 💰 | formula | `{{notion:block_property:V%3B_L:00000000-0000-0000-0000-000000000000:728afdfb-c3c7-816d-b8e3-0003a3b6442c}}.first().{{notion:block_property:Lx%40J:261a…` |
| Split: Club % | formula | `lets(   orgs, {{notion:block_property:RH%5Dy:00000000-0000-0000-0000-000000000000:728afdfb-c3c7-816d-b8e3-0003a3b6442c}},   owners, orgs.filter(curren…` |
| Parent Sale ID | formula | `prop("Parent Event").first().prop("Own Sale ID")` |
| Split: Revenue Scope 💰 | formula | `lets(   orgs, {{notion:block_property:RH%5Dy:00000000-0000-0000-0000-000000000000:728afdfb-c3c7-816d-b8e3-0003a3b6442c}},   owners, orgs.filter(curren…` |
| Split: Third Party % | formula | `lets(   orgs, {{notion:block_property:RH%5Dy:00000000-0000-0000-0000-000000000000:728afdfb-c3c7-816d-b8e3-0003a3b6442c}},   owners, orgs.filter(curren…` |
| Price (IDR) 💰 | formula | `{{notion:block_property:Z_gP:00000000-0000-0000-0000-000000000000:728afdfb-c3c7-816d-b8e3-0003a3b6442c}}.map(current.{{notion:block_property:NEcQ:261a…` |
| Creation Check | formula | `lets(   hasSale, prop("Sales").length() > 0,   hasHR, prop("Hourly Rate").length() > 0,   isPatternA, prop("Event Type") == "Private Lesson" or prop("…` |
| Event Type | formula | `lets(   /* Get area names from the Areas relation */   areaNames, {{notion:block_property:elAV:00000000-0000-0000-0000-000000000000:728afdfb-c3c7-816d…` |

## Selections

| Property | Type | Detail |
|---|---|---|
| Status | status |  |

## Automation

| Property | Type | Detail |
|---|---|---|
| Booking System | button |  |

## System

| Property | Type | Detail |
|---|---|---|
| Created by | created_by |  |

## System

| Property | Type | Detail |
|---|---|---|
| Created time | created_time |  |

## System

| Property | Type | Detail |
|---|---|---|
| Last edited by | last_edited_by |  |

## System

| Property | Type | Detail |
|---|---|---|
| Last edited time | last_edited_time |  |
