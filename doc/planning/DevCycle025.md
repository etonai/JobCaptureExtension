# DevCycle 025: Track Job Search Button Presses in search-tracking.csv

**Status:** Work Complete
**Start Date:** 2026-07-27
**Target Completion:** 2026-07-27
**Focus:** Record every "Open Job Search" and "Open Premium Job Search" button press as a row in a new `search-tracking.csv` file in the project folder.

---

## Goal

The extension currently tracks captured listings in `job-tracking.csv` and `other-listings.csv` (via `extension/shared/saveListing.js`), but has no record of when the user actually triggers a LinkedIn job search from the popup. The "Open Job Search" and "Open Premium Job Search" buttons (`extension/popup/popup.js`, `openJobSearch()` / `openPremiumJobSearch()`, both routed through `openJobSearchUrl()`) currently only update the active tab's URL — nothing is persisted.

This cycle adds a `search-tracking.csv` file, following the same append-on-write pattern already used for `job-tracking.csv`/`other-listings.csv`, so each session's search activity is logged with a timestamp and which button was used.

## Desired Outcome

- A new `search-tracking.csv` file exists in the user's project folder (created with a header row on first write, same pattern as `ensureCsvReady()` in `saveListing.js`).
- Every successful press of "Open Job Search" or "Open Premium Job Search" appends one row containing:
  - a datetime (local timestamp of the press)
  - which button was pressed (a clear label distinguishing "Open Job Search" from "Open Premium Job Search")
- The append happens only when the search URL is actually opened (i.e., not when the press is rejected for missing Job Search configuration).
- A failure to write the tracking row does not block the job search from opening — the navigation is the primary action; tracking is best-effort logging, consistent with how other non-critical writes in this extension are handled.

---

## Tasks

### Phase 1: search-tracking.csv Write Path

**Status:** Work Complete

- [x] Added `SEARCH_CSV_COLUMNS`/`SEARCH_CSV_HEADER_LINE`/`SEARCH_CSV_HEADER_TEXT` and `serializeSearchTrackingRow()` to `extension/shared/csv.js`; generalized `validateCsvHeader(text, expectedHeaderLine)` to accept a non-default header line.
- [x] Generalized `ensureCsvReady()` in `extension/shared/saveListing.js` to accept `headerText`/`headerLine` params, and added `appendSearchTrackingRow(searchType, now = new Date())`, exported alongside `SEARCH_TRACKING_CSV_FILENAME`, `SEARCH_TYPE_JOB_SEARCH`, and `SEARCH_TYPE_PREMIUM_JOB_SEARCH`.
- [x] Wired `openJobSearch()`/`openPremiumJobSearch()` (via `openJobSearchUrl()`) in `extension/popup/popup.js` to call `appendSearchTrackingRow()` after a successful `chrome.tabs.update`, passing `SEARCH_TYPE_JOB_SEARCH` / `SEARCH_TYPE_PREMIUM_JOB_SEARCH`.
- [x] `searchType` values are the literal button labels: `Open Job Search` and `Open Premium Job Search`. Timestamp column uses a local `YYYY-MM-DD HH:MM:SS` format (`formatLocalTimestamp()` in `saveListing.js`), matching the local-time convention already used for `captureDateLocal`/`captureTimeLocal` in the capture flow, but as one combined column since there's no need to sort/filter date and time separately for this file.

**Technical Notes:**
`appendSearchTrackingRow()` mirrors `appendCaptureRecordToCsv()`'s shape (gets the stored project folder, ensures permission, ensures the CSV exists with the right header, appends one row) but writes to `search-tracking.csv` with its own 2-column header instead of the job-tracking schema. `ensureCsvReady()` now takes the header text/line as parameters (defaulting to the job-tracking header) so both call sites share one implementation instead of duplicating the create-or-validate-header logic.

### Phase 2: Tests and Verification

**Status:** Work Complete

- [x] Added `runAppendSearchTrackingRowTest()` to `extension/tests/persistence.test.mjs`, covering: row serialization, header creation on first write (`csvCreated: true`), header reuse on second write (`csvCreated: false`), both search types recorded correctly, and that `job-tracking.csv` is untouched. Full suite (`persistence.test.mjs`, `captureActivePage.smoke.test.mjs`, `searchUrlBuilder.test.mjs`, `pagingUrl.test.mjs`) passes.
- [ ] Manually verify in a live project folder: press both buttons and confirm `search-tracking.csv` is created/appended correctly. (Requires a live Edge/Chrome session — not run in this automated pass.)
- [x] Updated `extension/README.md`: added a bullet documenting the new `search-tracking.csv` behavior, and added `search-tracking.csv` to the Project Folder Layout example.
- [x] Bumped `extension/manifest.json` version `0.0.24.0` → `0.0.25.0`.

**Technical Notes:**
Tests use the existing `fakeProjectHandle()`/`setStoredProjectHandle()` test fixtures already in `persistence.test.mjs`, matching the pattern used by `runAppendCaptureRecordToCsvTest()`.

---

## Open Questions

1. **Should a failed project-folder permission (same failure mode `job-tracking.csv` writes can hit) surface an error to the user, or fail silently since the search still opened successfully?**
   Recommendation: Fail silently (or log to console only) — the search navigation already succeeded, and surfacing a second error/status message for a background tracking write would be confusing. This matches the "best-effort" framing in Desired Outcome above.

2. **Exact CSV column set — just `timestamp,searchType`, or should it also record which LinkedIn URL/tab was used?**
   Recommendation: Start with just `timestamp,searchType` to match the stated goal precisely; the URL is derivable from settings and isn't part of the stated requirement. Can be extended in a future cycle if needed.

---

## Notes and Risks

- **Scope:** this cycle only covers the two popup buttons ("Open Job Search", "Open Premium Job Search"). It does not track "Next Page" or other navigation actions.
- **Consistency:** implementation should reuse the existing CSV header/append helpers where practical rather than duplicating File System Access API logic.

---

## Completion Summary

*Implementation complete; awaiting live-browser verification before this cycle is marked `Verified` and moved to `completed/`.*

**Completion Date:** 2026-07-27
**Phases Completed:** Phase 1 fully; Phase 2 automated tests and documentation complete, live browser verification pending.
**Work Deferred:** None from this cycle's scope.

**Accomplishments:**
- Added `search-tracking.csv` support: `SEARCH_CSV_HEADER_TEXT`/`serializeSearchTrackingRow()` in `extension/shared/csv.js`, and `appendSearchTrackingRow()` in `extension/shared/saveListing.js` (reusing a generalized `ensureCsvReady()`).
- Wired both "Open Job Search" and "Open Premium Job Search" popup buttons to append a `search-tracking.csv` row (local timestamp + button label) after a successful navigation, without blocking or surfacing errors for the navigation itself if the tracking write fails.
- Added `runAppendSearchTrackingRowTest()` covering header creation, header reuse, and both search types.
- Updated `extension/README.md` and bumped `extension/manifest.json` to `0.0.25.0`.

**Metrics:**
- Files modified: 5 (`csv.js`, `saveListing.js`, `popup.js`, `persistence.test.mjs`, `README.md`) plus `manifest.json` and this DevCycle document

**Lessons / Notes:**
- Generalizing `ensureCsvReady()`/`validateCsvHeader()` to accept a header text/line parameter avoided duplicating the create-or-validate logic for a second CSV schema.
- Live verification is still required: pressing both buttons in an actual Edge/Chrome session and confirming `search-tracking.csv` rows appear as expected.
