# FX missing-rate repair — prepared 1 October 2026, NOT DEPLOYED

Existing Worker: tacitos-fx-rates / 01a0f211-4e5c-72e8-addd-87537a306319.
Rate store: 94e5abc1-d98e-4181-8a8e-42f973902924.
Balance Sheet: 267afdfb-c3c7-81d9-bc0f-000bb3cd7f70.

Recovered from the attached pre-repair archive, then replayed the exact recorded source changes from session 3ebafdfb-c3c7-80ad-b3dd-00a99dd693ea events 1296 and 1372. Restored original tests from event 1305 and recorded test corrections at 1313/1320. No guessed repair code was used for that baseline. A deployed-source hash was not available for byte-for-byte comparison.

Prepared forward fix: getBaseToIdrRate uses sequential 400 ms request spacing for missing-rate provider lookups; scheduled syncs retain the SDK pacer. SDK 0.9.2 initialises pacers for sync callbacks, not tool/webhook handlers. Existing source protection, rounding, rates, database IDs, webhook parsing and preview/apply contract are retained.

Validation passed: npm run check; node tests/fx-regression.cjs; node tests/fx-missing-rate.cjs. Tests cover all original safeguards plus empty-rate-store preview, provider failures, no writes, preserved source amount and retained sync pacer.

Deployment attempt was blocked before execution by the chat safety reviewer. This snapshot is NOT the deployed repair. No Balance Sheet values changed.

Deployment approval must specifically cover updating this existing Worker. After deployment, run explicit mode=preview with pageIdsOrUrls, limit and startCursor on the four previously failing rows, then resume full-database pagination. Do not apply a blanket re-rating: the first 25-row preview found existing-value differences as well as lookup errors.

No credentials, environment files, node_modules or webhook URL are included. Existing hosted credentials must be reused without retrieving values.
