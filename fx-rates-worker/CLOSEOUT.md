# FX Worker closeout checkpoint — 1 October 2026

Worker: tacitos-fx-rates
Worker ID: 01a0f211-4e5c-72e8-addd-87537a306319
Local source: /data/tacitos-fx-rates-nick

This archive is a PRE-REPAIR source snapshot, not a production sign-off.

Verified read-only: Worker renamed; deployed sync binding is data source
94e5abc1-d98e-4181-8a8e-42f973902924; daily and backfill sync status healthy,
zero consecutive failures. npm run check passed. Recent history returned 14
runs, containing sync/tool runs but no webhook:balanceSheetFx runs.

Closeout blocker: src/index.ts still sets FX_RATES_DATA_SOURCE_ID to
c7261443-196b-4bd5-8d2b-2b5b6afb42f2, the old deleted rate store.
getFxRateFromStore queries this constant; the new sync binding does not
replace that constant. Query failures are not caught for provider fallback.

Required before Done: approve and deploy the lookup-binding correction;
confirm native automation destination is the new Worker; verify controlled
new-row, source-amount, source-currency and date-correction canaries;
verify repeat-run stability. No production Balance Sheet writes or Worker
redeployment performed during this checkpoint.

Operational discrepancy: reconcileBalanceSheetFx in this snapshot is a
write-capable bounded tool (up to 25 recently edited rows), not the paginated
preview/apply tool described in the earlier task history. Do not call it as
a no-write preview. Decide whether to restore the approved preview/apply
contract before production handover.

Archive includes source/config/dependency pins only. No .env, credentials,
webhook URL, node_modules or build output is included.
