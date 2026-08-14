# DevCycle 032: Exclude Unknown-Company Listings from Recent Postings Running Total

**Status:** VERIFIED
**Start Date:** 2026-08-14
**Target Completion:** 2026-08-14
**Focus:** Stop counting Recent Postings listings with an unresolved company ("Unknown company") toward the `recentPostings` running total in `search-tracking.csv`, without hiding them from the popup's Recent Postings list.

---

## Goal

[[DevCycle028]] introduced a running total (`recentPostings`) tracked in `search-tracking.csv`, computed from `listings.length` after each Recent Postings scan (`extension/popup/popup.js:170`, `trackRecentPostingsScan`). Some scanned listings have no resolvable `company` — `captureRecentJobPostings()` in `extension/content/captureActivePage.js` marks these with `companySource: 'missing'` (set at lines 841, 885, and 928), and the popup renders them as "Unknown company" (`extension/popup/popup.js:101`). Every "Unknown company" listing observed so far has turned out to be a capture bug rather than a real posting, so counting it toward the running total inflates that total with bad data.

## Desired Outcome

- Listings with `companySource === 'missing'` (rendered as "Unknown company") are excluded from the count used to update `recentPostings` in `search-tracking.csv`.
- These listings remain fully visible in the popup's Recent Postings list — this cycle changes only what feeds the running-total count, not what is displayed.
- The on-screen "N recent postings found" count and per-listing display are unaffected by this change; only the CSV running total's inputs change, unless investigation in Phase 1 finds a reason the displayed count should also change.
- The `previousPagesTotal` / `currentPageTotal` accounting model from [[DevCycle028]] is preserved — only the value fed in as `currentPageTotal` changes (from `listings.length` to a company-known count).

---

## Tasks

### Phase 1: Exclude Unknown-Company Listings from the Running Total

**Status:** Work Complete

- [x] Confirmed `companySource: 'missing'` is a reliable, exhaustive signal for "Unknown company" listings as rendered in the popup (all three assignment sites in `extension/content/captureActivePage.js` — lines 841, 885, 928 — set `companySource: 'missing'` exactly when `company` is blank, matching the popup's `listing.company || 'Unknown company'` fallback at `popup.js:101`).
- [x] `extension/popup/popup.js` now computes `knownCompanyCount = listings.filter((listing) => listing.companySource !== 'missing').length` and passes that (not `listings.length`) into `trackRecentPostingsScan()`.
- [x] Confirmed `recordRecentPostingsScan()` / `recentPostingsRunningTotal()` (`extension/shared/recentPostingsTracking.js`) needed no changes — they just accumulate whatever count they're given.
- [x] Left `setRecentPostingsState('ready', ...)` and the popup's rendered list and displayed count (`listings.length`-based) unchanged, so Unknown listings stay visible and still count toward "N recent postings found."
- [x] Extended `extension/tests/popup.module.smoke.test.mjs` to drive a mixed-listing scan (2 known-company, 1 Unknown) through the real popup module and assert the session-tracking state's `currentPageTotal` is `2` (not `3`), while the displayed `#recentPostingsCount` stays `3`.
- [x] Updated `extension/README.md` (Recent Postings Refresh section) and bumped the extension version to `0.0.32.0`.

**Technical Notes:**
Relevant files: `extension/popup/popup.js` (`scanRecentPostings`, `trackRecentPostingsScan`), `extension/content/captureActivePage.js` (`captureRecentJobPostings` and its listing-building helpers), `extension/tests/persistence.test.mjs` and/or `extension/tests/popup.module.smoke.test.mjs` for coverage. Do not change how `companySource: 'missing'` listings are captured or displayed — only which listings are counted toward `recentPostings`.

---

## Notes and Risks

- **Scope boundary:** This cycle does not attempt to fix the underlying capture bug that produces Unknown-company listings — it only prevents those listings from polluting the running total. Root-causing the missing-company capture bug is a candidate for a future DevCycle.
- **Risk:** If `companySource` is ever missing or `undefined` on a listing object (e.g. an older code path or malformed result), filtering must treat that safely — confirm the filter condition doesn't accidentally exclude legitimate listings that simply lack a `companySource` field for unrelated reasons.

---

## Completion Summary

**Completion Date:** 2026-08-14
**Phases Completed:** All
**Work Deferred:** Live-browser verification — this cycle stops at Work Complete per [[DevelopmentProcess]]; a human should confirm in a real popup that an Unknown-company listing appears in the list but does not increment `recentPostings` before this is marked Verified.

**Accomplishments:**
- `extension/popup/popup.js` now feeds `trackRecentPostingsScan()` a company-known listing count instead of the raw scanned-listing count, so "Unknown company" listings no longer inflate the `recentPostings` running total in `search-tracking.csv`.
- Unknown-company listings remain fully visible in the popup's Recent Postings list and in the displayed "N recent postings found" count — only the CSV running total's input changed.
- Extended the popup module smoke test to exercise a real mixed-listing scan through the full popup module and verify the running-total input excludes Unknown listings while the displayed count does not.
- Documented the behavior in `extension/README.md` and bumped the extension to `0.0.32.0`.

**Metrics:**
- Files modified: `extension/popup/popup.js`, `extension/tests/popup.module.smoke.test.mjs`, `extension/README.md`, `extension/manifest.json`, plus this DevCycle document.
- Tests passing: all five suites (`captureActivePage.smoke`, `pagingUrl`, `persistence`, `popup.module.smoke`, `searchUrlBuilder`).

**Lessons / Notes:**
`companySource` (already produced by every listing-building path in `captureActivePage.js` since earlier cycles) turned out to be exactly the signal needed here — no new field or capture-side change was required, only a filter on the existing one at the point where the running-total count is computed.
