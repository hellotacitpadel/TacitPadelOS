# Incident Report — Payment V1 Bank Transfer Failures

**Date:** October 27, 2026
**Severity:** High — all new Bank transfer → Tacit payments fail silently
**Status:** Immediate fix applied to one event; systemic fix pending
**Reported by:** Operator (Kusna) via Basil/Polly booking flow
**Investigated by:** Dhiren (TacitOS) + Notion AI Worker logs

---

## Summary

On October 27, 2026, a booking for Antonio with Jose de la Riva (Private Lesson, IDR 900,000, bank transfer to Tacit) was created through Basil and processed through Polly. The Worker rejected the payment silently. The event reverted to Pending with no Sale created and no error message visible to the operator or the skills.

Root cause: the `tacit-payment-v1` Worker was updated to require a verification timestamp (`paymentVerifiedAt`) for Bank transfer → Tacit payments, but the Polly skill template was not updated to collect or write it. Every new Bank transfer → Tacit payment will fail the same way until Polly is updated.

---

## Symptoms

### What the operator experienced

1. Basil created the event successfully and reported "Created and verified ✅"
2. Polly collected all payment details (Paid, Bank transfer, Tacit, Nick verified) and showed a confirmation summary
3. Operator confirmed
4. Polly wrote the instruction to the Event Log and set Status = Payment Processing
5. The event reverted to Pending within seconds
6. No Sale was created
7. No error message appeared on the Event page or in chat
8. Basil could not explain why: "I can't verify the cause from the Event"

### What was visible on the Event page

- Status: Pending (bounced back from Payment Processing)
- Sales: empty (no financial record created)
- Event Log: contained the instruction JSON, but no result or rejection reason
- No callout, no error field, no explanation anywhere

### What the Worker log showed

```
Payment V1 Event processing blocked for f9f864f9-c705-41c5-9771-cbe474246f75:
Bank transfer paid to Tacit requires a verification time and verifier.
```

The Worker blocked the payment because the instruction JSON contained the verifier (`paymentVerifiedById`) but not the verification time (`paymentVerifiedAt`).

---

## Affected

### Scope

- **All new Bank transfer → Tacit payments** since the Worker was updated (estimated between Oct 18 and Oct 27, 2026)
- **Only Bank transfer → Tacit** is affected. Other channels (Club, Ayo, Reclub, Courtside → Club, Wallet) do not require a verifier or timestamp and are unaffected
- **Older events are unaffected** — they were processed before the Worker update and already have Sales linked

### Specific event affected

| Field | Value |
|---|---|
| Event | PL · 071026 · Jose de la Riva · 1:1 |
| Event ID | f9f864f9-c705-41c5-9771-cbe474246f75 |
| Student | Antonio |
| Coach | Jose de la Riva |
| Venue | HiPi Padel Kendari |
| Date | October 7, 2026, 07:00–08:00 Jakarta |
| Amount | IDR 900,000 |
| Channel | Bank transfer |
| Paid to | Tacit |
| Verified by | Nick Brown (nick@tacitpadel.com) |
| Operation key | polly-payment-f9f864f9c70541c59771cbe474246f75-20261027-a81f02 |

### Business impact

- The payment (IDR 900,000) was received by Tacit but not recorded in the books
- The Sale and Balance Sheet entries were not created
- The event remained Pending instead of Confirmed
- The operator could not diagnose the issue without Worker dashboard access
- Any future Bank transfer → Tacit booking will fail the same way until the systemic fix is applied

---

## Root Cause

### The contract drift

The `tacit-payment-v1` Worker was updated to add a new validation check: for Bank transfer paid to Tacit, the instruction must include both:
1. `paymentVerifiedById` — who verified the payment (a Notion user ID)
2. `paymentVerifiedAt` — when the payment was verified (an ISO timestamp)

Before the update, only `paymentVerifiedById` was required. After the update, both are required.

Polly's skill instruction template — which tells Polly what to collect and what to write into the instruction JSON — was **not updated** to match. Polly's template includes `paymentVerifiedById` but has no `paymentVerifiedAt` field. Polly asks "Who verified it?" but never asks "When was it verified?"

### Why nobody caught it

1. **Polly didn't catch it** — Polly validates the instruction against her template, and the template matches. The template itself is incomplete.
2. **The Worker failed silently** — it reverted the event to Pending but wrote no rejection reason on the Event page. No callout, no error field, no explanation.
3. **No contract sync** — there is no process that checks "when the Worker contract changes, update the skills that write to it." The Worker and Polly are maintained independently, and the drift went unnoticed.

### Why older events worked

Bank transfer → Tacit events processed before the Worker update (TP-979 on Oct 16, TP-986 on Oct 26, TP-978 on Oct 16) succeeded because the timestamp check did not exist yet. The Worker accepted the instruction with just the verifier ID.

### Why the verification time is not visible

The verification time lives inside a JSON code block in the Event Log (the page body), not as a database property on TP: Events. The 49 properties on TP: Events do not include any verification time field. This means:
- The user cannot see the verification time on the Event page
- The user cannot see it's missing when the payment fails
- The user cannot filter or sort by it
- The user cannot fix it without editing JSON code (which a non-technical user cannot do)

---

## Temporary Solution (applied October 27, 2026)

### What was done

1. Retrieved the Worker run logs via `ntn workers runs list` and `ntn workers runs logs`
2. Identified the rejection reason: missing `paymentVerifiedAt`
3. Updated the instruction JSON in the Event Log to add `"paymentVerifiedAt": "2026-10-27T11:57:00+07:00"` (the time Nick verified the transfer, from the chat log)
4. Re-set the Event Status to Payment Processing
5. The Worker processed the payment successfully — 1 Sale created within 10 seconds

### What this fixes

- Antonio's specific booking is now recorded correctly
- The IDR 900,000 payment is in the books

### What this does NOT fix

- Every future Bank transfer → Tacit payment will still fail until Polly is updated
- The Worker still fails silently — no visible rejection reason on the Event page
- The verification time is still hidden in JSON, not visible to the user

---

## Long-Term Solution

Three changes are needed, in priority order:

### 1. Update Polly's skill template (fix the break)

**Owner:** Soren (Skill Builder) via Clara (Change Manager)

Add `paymentVerifiedAt` to Polly's instruction template. Polly should derive the timestamp automatically at confirmation time (the moment the operator confirms the payment summary) rather than asking the operator for it — the operator already confirmed, so the time is "now."

**Template change:**
```json
{
  "type": "payment-v1-instruction",
  "operatorConfirmed": true,
  "operationKey": "new unique key",
  "eventPageId": "exact Event ID",
  "studentPageIds": ["exact attendee ID(s)"],
  "processingType": "Payment | Promo",
  "paymentVerifiedById": "Notion verifier user ID only for Bank transfer paid to Tacit; otherwise omit",
  "paymentVerifiedAt": "ISO timestamp at operator confirmation; only for Bank transfer paid to Tacit; otherwise omit",
  "paymentVerificationNote": "concise non-sensitive note, or null for fully wallet-funded",
  "paymentChannel": "Bank transfer | Courtside | Club | Ayo | Reclub | Wallet",
  "paidTo": "Tacit | Club",
  "walletHolderPageId": "required for Wallet; otherwise null",
  "remainderPaymentChannel": "Bank transfer | Courtside | Club | Ayo | Reclub | null",
  "remainderPaidTo": "Tacit | Club | null",
  "revenueScope": "Academy Fees | Combined",
  "courtHourlyRateIdr": 0,
  "sharedDiscountPercent": 0,
  "tacitDiscountPercent": 0,
  "discountReasons": [],
  "discountExplanation": ""
}
```

**Skill instruction change:** after "Who verified it?" for Bank transfer → Tacit, Polly should record the current timestamp as `paymentVerifiedAt` — no need to ask the operator for it.

### 2. Add visible payment fields to TP: Events (make it user-visible)

**Owner:** Walter (Workspace Wiring) via Clara (Change Manager)

Add the following properties to TP: Events so the user can see the payment facts directly on the Event page:

| New property | Type | Purpose |
|---|---|---|
| Payment Verified At | date | When the bank transfer was verified |
| Payment Verified By | people | Who verified the bank transfer |
| Payment Channel | select (Bank transfer, Courtside, Club, Ayo, Reclub, Wallet) | How the payment was made |
| Paid To | select (Tacit, Club) | Where the money was sent |

Polly writes to these properties in addition to the JSON instruction. The Worker reads from them as a primary source (or backup to the JSON). The user sees them at the top of the Event page, in views, and in filters.

When a field is empty, the user can immediately see what's missing — no JSON, no mystery.

### 3. Make the Worker write visible rejection reasons (stop silent failures)

**Owner:** Warren (Worker Engineer) via Clara (Change Manager)

When the Worker rejects an event, it must append a plain-language callout block to the Event page explaining why. For example:

> ⚠️ Payment blocked: missing verification time. Ask Polly to re-process this payment with the verification timestamp.

This ensures the operator and the skills can see the rejection reason without needing Worker dashboard access. The callout should be written before the Worker reverts the status to Pending.

### 4. Add a contract sync check (prevent future drift)

**Owner:** Clara (Change Manager)

When the Worker contract is updated, a check must confirm that all skills that write instructions to that Worker are also updated in the same change. This prevents the same drift from happening again with a different field.

---

## Timeline

| Time (Jakarta) | Event |
|---|---|
| Oct 16–18 | Worker processes Bank transfer → Tacit events successfully (TP-979, TP-986, TP-978) — timestamp check not yet enforced |
| Between Oct 18–27 | Worker updated to require `paymentVerifiedAt` for Bank transfer → Tacit |
| Oct 27, 11:46 AM | Operator confirms booking with Basil; event created |
| Oct 27, 12:01 PM | Operator confirms payment with Polly; instruction written; Status set to Payment Processing |
| Oct 27, 12:05 PM | Worker rejects payment (missing `paymentVerifiedAt`); event reverts to Pending; no error visible |
| Oct 27, 12:23 PM | Operator asks "why was the payment not recorded?"; Basil cannot explain |
| Oct 27, 1:54 PM | Worker run logs retrieved via `ntn workers runs list` / `ntn workers runs logs` |
| Oct 27, 1:56 PM | Root cause identified: missing `paymentVerifiedAt` |
| Oct 27, ~2:10 PM | Instruction JSON updated with timestamp; Status re-set to Payment Processing; Worker succeeds; Sale created |

---

## Evidence

### Worker rejection log (run ID: 01a17bbe-9640-760b-b2d0-fce853c0b591)

```
Payment V1 Event processing blocked for f9f864f9-c705-41c5-9771-cbe474246f75:
Bank transfer paid to Tacit requires a verification time and verifier.
```

### Antonio's instruction (before fix)

```json
{
  "type": "payment-v1-instruction",
  "operatorConfirmed": true,
  "operationKey": "polly-payment-f9f864f9c70541c59771cbe474246f75-20261027-a81f02",
  "eventPageId": "f9f864f9-c705-41c5-9771-cbe474246f75",
  "studentPageIds": ["0872ddeb-485f-4db7-b384-119985a4622e"],
  "processingType": "Payment",
  "paymentVerifiedById": "261d872b-594c-81b6-92f9-0002f670cc43",
  "paymentVerificationNote": "Nick Brown verified the bank transfer was received by Tacit.",
  "paymentChannel": "Bank transfer",
  "paidTo": "Tacit",
  "walletHolderPageId": null,
  "remainderPaymentChannel": null,
  "remainderPaidTo": null,
  "revenueScope": "Academy Fees",
  "courtHourlyRateIdr": 0,
  "sharedDiscountPercent": 0,
  "tacitDiscountPercent": 0,
  "discountReasons": [],
  "discountExplanation": ""
}
```

Note: no `paymentVerifiedAt` field.

### Antonio's instruction (after fix)

Same as above, with the added field:

```json
"paymentVerifiedAt": "2026-10-27T11:57:00+07:00"
```

### Successful Bank transfer event for comparison (TP-979, Oct 16)

```json
{
  "type": "payment-v1-instruction",
  "operatorConfirmed": true,
  "operationKey": "payment-v1-8b141d6a-bcac-4833-9853-2f2d548d676a-astar-charles-romain-20261018-01",
  "eventPageId": "8b141d6a-bcac-4833-9853-2f2d548d676a",
  "studentPageIds": ["58a84923...", "ca779f25...", "ac538c83..."],
  "processingType": "Payment",
  "paymentVerifiedById": "3ced872b-594c-8152-b892-000290d21996",
  "paymentVerificationNote": "Nazwa confirms bank transfer to Tacit...",
  "paymentChannel": "Bank transfer",
  "paidTo": "Tacit",
  ...
}
```

Note: also has no `paymentVerifiedAt` — but succeeded because the Worker check was not yet enforced at that time.

### TP: Events properties (49 total)

No `Payment Verified At` or `Payment Verified By` property exists. The verification time is only present in the instruction JSON code block in the Event Log (page body), not as a database property.

---

## Action Items

| # | Action | Owner | Status |
|---|---|---|---|
| 1 | Fix Antonio's instruction + re-trigger Worker | Dhiren | ✅ Done (Oct 27) |
| 2 | Update Polly's template to include `paymentVerifiedAt` | Soren / Clara | Pending |
| 3 | Add visible payment fields to TP: Events | Walter / Clara | Pending |
| 4 | Make Worker write visible rejection reasons | Warren / Clara | Pending |
| 5 | Add contract sync check for Worker ↔ skill updates | Clara | Pending |

---

*Generated October 27, 2026. This is a static incident report; it does not modify any live system.*
