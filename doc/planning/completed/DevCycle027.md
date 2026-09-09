# DevCycle 027: Track Posts Seen in search-tracking.csv

**Status:** VERIFIED
**Start Date:** 2026-08-04
**Target Completion:** 2026-08-04
**Focus:** Add a "Posts Seen" column to `search-tracking.csv` and keep it updated as the user pages through LinkedIn job search results.

---

## Goal

[[DevCycle025]] added `search-tracking.csv`, logging a timestamp and which button (`Open Job Search` / `Open Premium Job Search`) was pressed, but it has no record of how many results the user actually paged through in that session. LinkedIn job search results load 25 postings per page (`RESULTS_PER_PAGE` in `extension/shared/pagingUrl.js`), and the "Next Page" button (`goToNextPage()` in `extension/popup/popup.js`) already advances the tab's `start` query param by 25 via `nextPageUrl()`/`getNextStart()`, but this activity isn't tracked anywhere.

This cycle adds a `Posts Seen` column to `search-tracking.csv` and wires it up so each row reflects how many postings the current search session has scrolled through: `25` as soon as a search is opened, and increasing by 25 each time "Next Page" is pressed.

## Desired Outcome

- `search-tracking.csv` has a third column, `postsSeen`, after `timestamp,searchType`.
- Existing rows in a user's existing `search-tracking.csv` are backfilled with `0` for `postsSeen` (a one-time migration on first write after upgrading).
- Every new row created by "Open Job Search" or "Open Premium Job Search" starts with `postsSeen = 25`.
- Pressing "Next Page" updates the **most recent row** in `search-tracking.csv` (not a new row) by setting `postsSeen` to `<current URL's start param> + 25` (i.e. the same value `getNextStart(tab.url)` already computes before the tab navigates).
- "Next Page" tracking is best-effort, matching the existing pattern: a failure to update `search-tracking.csv` does not block the page navigation itself.

---

## Tasks

### Phase 1: Add `postsSeen` Column and Backfill Existing Rows

**Status:** Work Complete

- [x] In `extension/shared/csv.js`, added `postsSeen` to `SEARCH_CSV_COLUMNS` (after `searchType`), added `LEGACY_SEARCH_CSV_COLUMNS`/`LEGACY_SEARCH_CSV_HEADER_LINE` (the old 2-column header), and updated `serializeSearchTrackingRow()` to accept/serialize a `postsSeen` value.
- [x] Added `ensureSearchTrackingCsvReady()` and `migrateLegacySearchTrackingCsv()` in `extension/shared/saveListing.js`: on header mismatch against the new 3-column header, it now checks for the old 2-column header specifically, and if found, rewrites the whole file with the new header and every existing row backfilled with `postsSeen = 0`, instead of throwing `CsvHeaderMismatchError`.
- [x] The migration runs transparently inside `ensureSearchTrackingCsvReady()`, called from both `appendSearchTrackingRow()` and the new `updateLastSearchTrackingRowPostsSeen()` (Phase 2), so any touch of `search-tracking.csv` after this update migrates it on the spot.

**Technical Notes:**
The generic `ensureCsvReady()` (used by `job-tracking.csv`/`other-listings.csv`) was left untouched; `search-tracking.csv` now has its own `ensureSearchTrackingCsvReady()` since it's the only file needing legacy-header migration. Migration reads the whole file via `parseCsvRows()`, drops the old header row, and rewrites via `writeTextFile()` (full truncate-and-rewrite, not append).

### Phase 2: Wire Up Posts Seen on Search Open and Next Page

**Status:** Work Complete

- [x] `appendSearchTrackingRow()` in `extension/shared/saveListing.js` now writes new rows with `postsSeen = 25` (`SEARCH_TRACKING_INITIAL_POSTS_SEEN`); no popup.js call-site changes were needed since the button label passed to `appendSearchTrackingRow()` was unchanged.
- [x] Added `updateLastSearchTrackingRowPostsSeen(postsSeen)` in `extension/shared/saveListing.js`: reads `search-tracking.csv` (via `ensureSearchTrackingCsvReady()`, migrating if needed), sets the `postsSeen` field on the last data row, and rewrites the file.
- [x] Wired `goToNextPage()` in `extension/popup/popup.js` to compute `nextStart = getNextStart(tab.url)` from the pre-navigation tab URL (same value already used for the next URL and the button label), then call `updateLastSearchTrackingRowPostsSeen(nextStart)` after the tab navigates, wrapped in its own try/catch that logs to `console.warn` and never blocks or fails the page navigation.

**Technical Notes:**
`getNextStart(tab.url)` already returns `currentStart + 25` (`extension/shared/pagingUrl.js`), so no new arithmetic was needed. Fixed a latent bug in the test suite's `fakeWritableFile()` mock (`extension/tests/persistence.test.mjs`): `createWritable()` ignored `keepExistingData` and never truncated its in-memory buffer, which would have left stale trailing bytes when a full-file rewrite (like the new migration/update paths) produces content shorter than what was there before. The mock now truncates when `keepExistingData` is `false` (the default), matching real File System Access API semantics.

---

## Open Questions

1. **How should "the most recent row" be identified when updating on Next Page — always the last row in the file, or should it be tied to the specific search session (e.g., only update if no other search-tracking activity happened since)?**
   Recommendation: Always update the last row in the file. The popup is single-tab/single-session in practice, and matching [[DevCycle025]]'s existing simplicity, we don't currently track a session ID to disambiguate. This can be revisited if concurrent/multi-tab usage becomes a real scenario.

2. **Should the backfill migration run automatically the first time `search-tracking.csv` is touched after this update, or should it be a one-time manual/explicit step?**
   Recommendation: Automatic, on first access via `ensureCsvReady()` — consistent with how `job-tracking.csv`/`other-listings.csv` are created lazily today, and avoids requiring the user to run a separate migration step.

---

## Notes and Risks

- **Risk:** Updating the "most recent row" requires reading and rewriting the whole `search-tracking.csv` file (unlike the current pure-append pattern), which is a new write shape for this codebase's CSV helpers — worth double-checking File System Access API semantics for truncate-and-rewrite vs. append.
- **Scope:** This cycle only covers "Open Job Search", "Open Premium Job Search", and "Next Page" in the popup. It does not add Posts Seen tracking to any other flow.
- **Dependency:** Builds directly on [[DevCycle025]] (`search-tracking.csv` creation) and [[DevCycle026]] (button layout, no functional dependency).

---

## Completion Summary

*Implementation complete; awaiting live-browser verification before this cycle is marked `Verified` and moved to `completed/`.*

**Completion Date:** 2026-08-04
**Phases Completed:** Both phases' code changes complete; live-browser verification (pressing the buttons in an actual Edge/Chrome session and confirming `search-tracking.csv` rows) is still pending.
**Work Deferred:** None from this cycle's scope.

**Accomplishments:**
- Added the `postsSeen` column to `search-tracking.csv`'s schema (`SEARCH_CSV_COLUMNS`/`serializeSearchTrackingRow()` in `extension/shared/csv.js`), plus `LEGACY_SEARCH_CSV_HEADER_LINE` for recognizing the old 2-column header.
- Added `ensureSearchTrackingCsvReady()`/`migrateLegacySearchTrackingCsv()` in `extension/shared/saveListing.js`, transparently migrating an existing 2-column `search-tracking.csv` to the new 3-column header with `postsSeen = 0` backfilled on existing rows.
- `appendSearchTrackingRow()` now writes `postsSeen = 25` on every new row from "Open Job Search"/"Open Premium Job Search".
- Added `updateLastSearchTrackingRowPostsSeen()`, wired into `goToNextPage()` in `extension/popup/popup.js`, updating the most recent row's `postsSeen` to `getNextStart(tab.url)` (current `start` + 25), best-effort and non-blocking.
- Added `runUpdateLastSearchTrackingRowPostsSeenTest()` and `runSearchTrackingLegacyMigrationTest()` to `extension/tests/persistence.test.mjs`, and updated `runAppendSearchTrackingRowTest()` for the new column; fixed `fakeWritableFile()`'s `createWritable()` mock to truncate on `keepExistingData: false`, matching real File System Access API behavior.
- Updated `extension/README.md` and bumped `extension/manifest.json` to `0.0.27.0`.

**Metrics:**
- Files modified: 5 (`csv.js`, `saveListing.js`, `popup.js`, `persistence.test.mjs`, `README.md`) plus `manifest.json` and this DevCycle document

**Lessons / Notes:**
- The full test suite (`persistence.test.mjs`, `captureActivePage.smoke.test.mjs`, `searchUrlBuilder.test.mjs`, `pagingUrl.test.mjs`) passes when run from the repo root; `captureActivePage.smoke.test.mjs` resolves a fixture path relative to cwd and errors if run from inside `extension/`, unrelated to this cycle's changes.
- Live verification is still required: pressing "Open Job Search"/"Open Premium Job Search" and "Next Page" in an actual Edge/Chrome session and confirming `search-tracking.csv`'s `postsSeen` values update as expected, including migration of a pre-existing 2-column file.
