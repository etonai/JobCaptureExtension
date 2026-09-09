# DevCycle 034: Add a Manual `Notes` Column to `search-tracking.csv`

**Status:** Verified
**Start Date:** 2026-09-09
**Target Completion:** 2026-09-11
**Focus:** Add a `notes` column to `search-tracking.csv` that the extension never writes to, so the user can enter free-text notes by hand without the extension ever erasing them.

---

## Goal

The user wants a place to record manual, free-text notes against each search row in `search-tracking.csv` (for example: why a search was run, observations about results quality, follow-up reminders). This column must be purely a human-editing surface: the extension should create it with a blank default and otherwise leave its contents completely alone, no matter which code path rewrites the row (append, refresh, Next Page, or schema migration).

## Desired Outcome

- `search-tracking.csv` gains a new `notes` column, added after the existing `exactMatches` column.
- New rows (from Open Job Search / Open Premium Job Search) are written with `notes` blank.
- Every code path that rewrites existing rows (`updateLastSearchTrackingRow()` and all schema migrations) preserves whatever text is already present in a row's `notes` field, verbatim, including values containing commas, quotes, or embedded newlines.
- The extension never sets, clears, or otherwise computes a value for `notes` on an existing row under any circumstance.
- Existing 2-, 3-, 5-, and 6-column `search-tracking.csv` files migrate safely to the new 7-column schema, with `notes` set to blank for all migrated rows (they have no prior notes to preserve).
- The user can open `search-tracking.csv` in a spreadsheet or text editor and type into the `Notes` column, and that text survives the next time the extension appends a row, updates the last row, or migrates the file.

---

## Tasks

### Phase 1: Extend the Search-Tracking CSV Schema

**Status:** Work Complete

- [x] Add `notes` to `SEARCH_CSV_COLUMNS` in `extension/shared/csv.js`, after `exactMatches`.
- [x] Add a `SIX_COLUMN_SEARCH_CSV_COLUMNS` / header-line constant (mirroring the existing `FIVE_COLUMN_SEARCH_CSV_COLUMNS` pattern) so the current 6-column schema is recognized as a migration source.
- [x] Extend `serializeSearchTrackingRow()` to accept and serialize a `notes` field, defaulting to `''` only when constructing a brand-new row (never when rewriting an existing one).
- [x] Confirm `escapeCsvField()` / `parseCsvRows()` already round-trip commas, quotes, and embedded newlines correctly for free-text notes (they appear to; add coverage rather than new logic).

**Technical Notes:**
Relevant file: `extension/shared/csv.js`. `SEARCH_CSV_COLUMNS` currently ends at `exactMatches`; the proposed order is `timestamp,searchType,postsSeen,recentPostings,freshness,exactMatches,notes`, appended last to minimize migration risk, consistent with how `exactMatches` itself was added in DevCycle033. `escapeCsvField()`/`parseCsvRows()` already quote/unquote on `[",\r\n]`, so no parsing changes should be required for arbitrary manual text — this phase should mainly add test coverage confirming that.

### Phase 2: Preserve `notes` Across All Row-Rewriting Paths

**Status:** Work Complete

- [x] Update `appendSearchTrackingRow()` to write `notes: ''` for new rows.
- [x] Update `updateLastSearchTrackingRow()` so its full-file rewrite carries `row[6]` (existing `notes`) through unchanged for every row, not only the last one, and never assigns into that index.
- [x] Update `migrateLegacySearchTrackingCsv()` (2- and 3-column sources) to emit `notes: ''` for all migrated rows.
- [x] Add the 6-column → 7-column migration path in `ensureSearchTrackingCsvReady()`, preserving `timestamp`, `searchType`, `postsSeen`, `recentPostings`, `freshness`, and `exactMatches` from the existing 6-column rows and setting `notes` to `''` (there is no prior notes value to preserve).
- [x] Audit the existing 5-column → 7-column migration path so it also sets `notes: ''` alongside the existing `exactMatches: UNKNOWN` default.
- [x] Verify no other code path (e.g. future features) constructs a `search-tracking.csv` row without explicitly passing through the existing `notes` value or `''` for a genuinely new row.

**Technical Notes:**
Relevant file: `extension/shared/saveListing.js`. `updateLastSearchTrackingRow()` currently rebuilds every data row via `dataRows.reduce(...)` using `row[0]`...`row[5]`; this must extend to `row[6]` for `notes` so a rewrite triggered by Refresh or Next Page does not silently drop manually entered text. This is the highest-risk part of the cycle: any row-rewrite path that forgets to pass through `row[6]` will truncate user data, so treat "preserve `notes` on every rewrite" as the primary correctness property to test, not an afterthought.

### Phase 3: Documentation and Verification

**Status:** Verified

- [x] Document the `notes` column in `extension/README.md`: it is manually maintained by the user, the extension only ever writes a blank default for new/migrated rows, and it is never read or interpreted by the extension.
- [x] Bump the extension version.
- [x] Add/extend automated tests in `extension/tests/persistence.test.mjs` covering: new-row append with blank notes, `updateLastSearchTrackingRow()` preserving an existing non-empty notes value (including one containing a comma and an embedded newline) across postsSeen/recentPostings/exactMatches updates, and migration from each of the 2-, 3-, 5-, and 6-column schemas to 7 columns.
- [x] Run all extension test suites.
- [x] Manually verify: hand-edit `Notes` for a row in a real `search-tracking.csv`, trigger a Recent Postings refresh and a Next Page action against that search, and confirm the hand-entered text is unchanged afterward. Confirmed by the user.

**Technical Notes:**
Manual verification matters here specifically because the automated tests exercise the in-memory/mock project-folder implementation used elsewhere in `persistence.test.mjs`; confirming the behavior against a real file on disk (and ideally opened in a spreadsheet app, since some editors rewrite line endings or quoting) reduces the risk of a subtle format mismatch.

---

## Open Questions

1. **Should the CSV header label be `notes` or `Notes`?**
   Recommendation: use `notes`, matching the existing all-lowercase-camelCase header convention (`timestamp`, `searchType`, `exactMatches`). The column is still labeled clearly in a spreadsheet's header row; the user's own phrasing ("Notes") described the feature, not a literal header requirement. Flag if a capitalized header is actually required.

2. **Where should `notes` live in the column order — after `exactMatches`, or elsewhere (e.g. first, as a leading annotation column)?**
   Recommendation: append it last (after `exactMatches`), consistent with how every prior schema change in this file has been additive-at-the-end, which keeps migrations mechanical and low-risk.

---

## Notes and Risks

- **Primary risk:** `updateLastSearchTrackingRow()` rewrites the entire file from parsed rows on every call. Any path in this rewrite that fails to carry the `notes` field through unchanged will silently destroy user-entered data with no way to detect it after the fact. This must be covered by an explicit automated test, not inferred from code review alone.
- **Scope boundary:** The extension does not read, validate, parse, or act on `notes` content in any way this cycle (or any future one, per the stated intent) — it is a pure pass-through / human-editing column.
- **Out of scope:** Adding a `notes` column to the per-listing `captured-listings.csv` file is not needed — that file already has a `notes` column (see `CSV_COLUMNS` in `extension/shared/csv.js`). This cycle only concerns `search-tracking.csv`.

---

## Completion Summary

**Completion Date:** 2026-09-09
**Phases Completed:** All
**Work Deferred:** None

**Accomplishments:**
- Added `notes` as a seventh, trailing column in the search-tracking CSV schema (`SEARCH_CSV_COLUMNS` in `extension/shared/csv.js`), always blank for new/migrated rows.
- Added a 6-column → 7-column migration path in `ensureSearchTrackingCsvReady()`, and extended the 5-, 3-, and 2-column migration paths to also backfill a blank `notes`.
- `updateLastSearchTrackingRow()` now carries each row's existing `notes` value (`row[6]`) through its full-file rewrite untouched, so Refresh, Next Page, and other user-triggered updates never overwrite hand-entered text — verified with a comma-and-embedded-newline note surviving two successive updates.
- Documented the `notes` column's manual, extension-never-writes-to-it semantics in `extension/README.md`; bumped the extension to `0.0.34.0`.

**Metrics:**
- Files modified: 5 (`extension/shared/csv.js`, `extension/shared/saveListing.js`, `extension/tests/persistence.test.mjs`, `extension/tests/popup.module.smoke.test.mjs`, `extension/README.md`, `extension/manifest.json`, this DevCycle document)
- Tests passing: all five suites (`captureActivePage.smoke`, `pagingUrl`, `persistence`, `popup.module.smoke`, `searchUrlBuilder`)

**Lessons / Notes:**
The riskiest part of a "never touch this column" feature is that every existing full-row-rewrite path (migration, `updateLastSearchTrackingRow`) reconstructs each row from scratch via `serializeSearchTrackingRow(...)`, so a passthrough field must be explicitly threaded into every one of those call sites — there is no single choke point that would have caught a missed one automatically. The added test asserts a hand-written, comma-and-newline-containing note survives two consecutive tracking updates, which is the property that actually matters to the user.
