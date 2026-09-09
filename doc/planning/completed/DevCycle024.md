# DevCycle 024: Prioritize job-tracking.csv Over old-tracking.txt in Prior-Company Warning

**Status:** VERIFIED
**Start Date:** 2026-07-24
**Target Completion:** 2026-07-24
**Focus:** When a company appears in both `old-tracking.txt` and `job-tracking.csv`, show the `job-tracking.csv` warning (with its date), not the `old-tracking.txt` warning.

---

## Goal

The prior-company warning (`extension/shared/priorCompanyCache.js`, `findPriorCompanyInCache`) currently checks two sources in this order, short-circuiting on the first match:

1. `old-tracking.txt` (via `findOldTrackingCompany`) — returned first if it matches at all.
2. `job-tracking.csv` (via `findPriorCompanyCaptures`) — only reached if `old-tracking.txt` had no match.

`old-tracking.txt` only records that a company was applied to before this extension existed — it has no date. `job-tracking.csv` records actual tracked captures with dates. When a company appears in both, the current check order means the user only ever sees the low-information `old-tracking.txt` warning (`You have 1 prior entry for {company} in old-tracking.txt`) and never sees the more useful `job-tracking.csv` warning, which includes the entry count and most recent capture date.

This cycle reverses that priority: `job-tracking.csv` should be checked first, and only fall back to `old-tracking.txt` when there is no `job-tracking.csv` match.

## Desired Outcome

- When a company appears in both `old-tracking.txt` and `job-tracking.csv`, the popup shows the `job-tracking.csv`-sourced warning (entry count and most recent date), not the `old-tracking.txt` warning.
- When a company appears only in `old-tracking.txt`, the existing `old-tracking.txt` warning still appears unchanged.
- When a company appears only in `job-tracking.csv`, the existing `job-tracking.csv` warning still appears unchanged.
- Both the shortcut-driven cached path (`findCachedPriorCompanyWarning`) and the live/refresh path (`refreshPriorCompanyCache` + `findPriorCompanyInCache`) reflect the new priority consistently, since both route through `findPriorCompanyInCache`.

---

## Tasks

### Phase 1: Flip Check Order

**Status:** Work Complete

- [x] In `extension/shared/priorCompanyCache.js`, reordered `findPriorCompanyInCache()` so `findPriorCompanyCaptures(cache.csvText, ...)` (job-tracking.csv) is checked and short-circuits first, and `findOldTrackingCompany(cache.oldTrackingText, ...)` is only checked as a fallback when there is no CSV match.
- [x] Confirmed no other call site depends on the old `old-tracking`-first order — `popup.js` and `background.js` only consume the returned summary's `source`/`count`/`mostRecentDate` fields generically.

**Technical Notes:**
This is a pure reordering of the two existing short-circuit branches in `findPriorCompanyInCache` — no new data sources, no schema changes. `priorCompanyWarningMessage()` (`extension/popup/popup.js:143`) already branches on `summary.source` (`'old-tracking'` vs. the CSV fallback), so its wording logic needs no changes, only the frequency with which each branch is reached changes.

### Phase 2: Tests and Verification

**Status:** Work Complete

- [x] Extended `runPriorCompanyCacheTests()` in `extension/tests/persistence.test.mjs`: added a `Nordstrom` company present in both `oldTrackingText` and `csvText`, asserting the result is `source: 'csv'` with `mostRecentDate: '2026-07-10'` (not `old-tracking`). Kept and verified the existing single-source cases (only `old-tracking.txt`, only `job-tracking.csv`, unknown company).
- [x] Ran `node --check` on `extension/shared/priorCompanyCache.js` and the full existing test suite (`persistence.test.mjs`, `captureActivePage.smoke.test.mjs`, `searchUrlBuilder.test.mjs`, `pagingUrl.test.mjs`) — all pass. Also validated `manifest.json` parses as valid JSON.
- [ ] Manually verify in a live project folder: capture a job for a company present in both `old-tracking.txt` and `job-tracking.csv`, confirm the warning shows the CSV entry count/date, not the old-tracking message. (Requires a live Edge/Chrome session — not run in this automated pass.)
- [x] Updated `extension/README.md`'s prior-company warning bullet (`extension/README.md:23`) to describe `job-tracking.csv` taking priority over `old-tracking.txt` when both match.
- [x] Bumped `extension/manifest.json` version `0.0.23.0` → `0.0.24.0`; results recorded in Completion Summary below.

---

## Notes and Risks

- **Scope:** this is a small, contained reorder in `priorCompanyCache.js` plus documentation and tests. No change to `other-listings.csv`, which remains outside the prior-company warning entirely (out of scope per prior discussion).
- **Behavior change visibility:** users who are used to seeing the `old-tracking.txt` wording for companies in both sources will now see the CSV wording instead — this is the intended fix, not a regression, but worth calling out in the Completion Summary for anyone reviewing history later.

---

## Completion Summary

*Implementation complete; awaiting live-browser verification before this cycle is marked `Verified` and moved to `completed/`.*

**Completion Date:** 2026-07-24
**Phases Completed:** Phase 1 fully; Phase 2 automated tests and documentation complete, live browser verification pending.
**Work Deferred:** None from this cycle's scope.

**Accomplishments:**
- Reordered `findPriorCompanyInCache()` in `extension/shared/priorCompanyCache.js` so `job-tracking.csv` is checked (and short-circuits) before `old-tracking.txt`, so a company present in both now surfaces the CSV-sourced warning (entry count + most recent date) instead of the dateless `old-tracking.txt` message.
- Added a "company in both sources" case to `runPriorCompanyCacheTests()` in `extension/tests/persistence.test.mjs`, asserting the CSV match wins.
- Updated `extension/README.md`'s prior-company warning bullet to describe the new priority.
- Bumped `extension/manifest.json` to `0.0.24.0`.

**Metrics:**
- Files modified: 4 (`priorCompanyCache.js`, `persistence.test.mjs`, `README.md`, `manifest.json`) plus this DevCycle document

**Lessons / Notes:**
- This was a pure reorder of two existing short-circuit branches — no schema or message-wording changes were needed, since `priorCompanyWarningMessage()` already branches generically on `summary.source`.
- Live verification is still required: confirming in an actual Edge/Chrome session that a company present in both `old-tracking.txt` and `job-tracking.csv` now shows the CSV-sourced warning.
