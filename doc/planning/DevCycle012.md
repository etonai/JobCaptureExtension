# DevCycle 012: Record Listing CSV Button

**Status:** Verified
**Start Date:** 2026-07-14
**Target Completion:** TBD
**Focus:** Add a popup button that records the current captured listing to `other-listings.csv` without writing any other output files.

---

## Goal

DevCycle012 adds a new popup action for recording a captured listing separately from the normal Save Capture workflow. The new button should appear below the existing Save Capture button and be labeled `Record Listing`.

The Record Listing button should reuse the same captured listing record data that Save Capture writes to CSV, but it should write only to a new `other-listings.csv` file. It must not create or update any of the other files written by the Save Capture workflow.

## Desired Outcome

After this cycle is complete:

- the extension popup shows a `Record Listing` button below the existing Save Capture button
- clicking `Record Listing` saves the current captured listing record to `other-listings.csv`
- `other-listings.csv` uses the same record fields and CSV formatting as the listing records saved by Save Capture
- clicking `Record Listing` does not write notes, AI prompt files, markdown summaries, screenshots, or any other Save Capture output files
- the existing Save Capture button behavior remains unchanged
- the popup reports success and error states clearly for the Record Listing workflow
- focused regression coverage confirms the new button writes only `other-listings.csv`

---

## Tasks

### Phase 1: Inspect Current Save Capture Flow

**Status:** Verified

- [x] Review the popup markup and button layout for the existing Save Capture button.
- [x] Review the Save Capture handler to identify the shared captured listing record data.
- [x] Identify every file currently written by Save Capture.
- [x] Identify the smallest reusable CSV-writing path for writing a listing row without invoking other Save Capture side effects.

**Technical Notes:**

Likely files:

- `extension/popup/popup.html`
- `extension/popup/popup.js`
- `extension/shared/csv.js`
- `extension/tests/persistence.test.mjs`
- `extension/manifest.json`

The implementation should avoid duplicating CSV serialization rules. Prefer reusing the same field order, escaping, headers, and append behavior used for normal listing CSV writes.

### Phase 2: Add Record Listing UI And Behavior

**Status:** Verified

- [x] Add a `Record Listing` button below the Save Capture button in the popup.
- [x] Wire the button to a new handler that requires a current captured listing.
- [x] Save the captured listing record to `other-listings.csv`.
- [x] Ensure the new handler does not call the full Save Capture workflow.
- [x] Preserve the existing Save Capture workflow and button state behavior.
- [x] Display clear success and failure messages for the new action.
- [x] Bump `extension/manifest.json` version for reload verification if required by the project convention.

**Technical Notes:**

Recommended approach:

- Extract or reuse a narrow helper for appending a listing record to a named CSV file.
- Pass `other-listings.csv` as the destination for the Record Listing flow.
- Keep any Save Capture-only outputs behind the existing Save Capture handler.
- Match existing disabled/loading/status patterns so the new button feels native to the popup.

### Phase 3: Regression Checks And Documentation

**Status:** Verified

- [x] Add or update tests proving Record Listing writes `other-listings.csv`.
- [x] Add or update tests proving Record Listing does not write other Save Capture files.
- [x] Run syntax checks for changed extension scripts.
- [x] Run existing parser and persistence regression tests.
- [x] Update user-facing documentation if the popup actions are documented.
- [x] Record implementation notes and test results in this DevCycle document.

**Technical Notes:**

Regression checks should include the existing relevant test commands for popup/persistence behavior. If the current test harness cannot directly click popup controls, add focused unit coverage around the extracted CSV-writing helper and any new Record Listing handler logic that can be exercised outside the browser.

---

## Open Questions

1. **Should `other-listings.csv` include headers when first created?**
   Recommendation: yes. Match the existing listing CSV behavior so the file is immediately usable and consistent with the primary tracking CSV.

2. **Should Record Listing be enabled before a capture exists?**
   Recommendation: no. Follow the Save Capture button's current captured-record requirement and show the existing no-capture guidance or a similarly clear status message.

3. **Should duplicate records be prevented in `other-listings.csv`?**
   Recommendation: no for this cycle unless Save Capture already performs duplicate prevention for the same CSV path. The requested behavior is to act like Save Capture for the same records while changing only the destination file and suppressing other outputs.

---

## Notes and Risks

- The main risk is accidentally reusing the full Save Capture handler and writing extra files. The implementation should isolate the CSV-only path before wiring the new button.
- The new file name should be exactly `other-listings.csv`.
- Verified by user approval on 2026-07-14.

---

## Implementation Notes

Implemented on 2026-07-14 by Codex after user approval to implement DevCycle012.

Changes made:

- Added the `Record Listing` button below `Save Capture` in `extension/popup/popup.html`.
- Added popup wiring in `extension/popup/popup.js` so Record Listing is available only after a successful capture, syncs the notes field into the captured record, and writes only the CSV row.
- Added `appendCaptureRecordToCsv()` and `OTHER_LISTINGS_CSV_FILENAME` in `extension/shared/saveListing.js` so CSV append behavior can be reused without invoking JSON, TXT, or Markdown listing writes.
- Kept Save Capture behavior intact by using the same CSV append helper after the existing listing-file writes complete.
- Added persistence coverage proving `other-listings.csv` is written and `job-tracking.csv` / `saved-listings` artifacts are not created by the CSV-only flow.
- Bumped `extension/manifest.json` from `0.0.11.5` to `0.0.12.0` for reload verification.

Verification run:

```powershell
node --check extension\popup\popup.js
node --check extension\shared\saveListing.js
node --check extension\content\captureActivePage.js
node --check extension\background\background.js
node extension\tests\persistence.test.mjs
node extension\tests\captureActivePage.smoke.test.mjs
```

All commands passed.

---

## Completion Summary

*Fill in when the cycle closes. Move this document to `doc/planning/completed/` afterward.*

**Completion Date:** 2026-07-14
**Phases Completed:** All
**Work Deferred:** None

**Accomplishments:**
- Added a CSV-only `Record Listing` popup action for `other-listings.csv`.
- Reused standard CSV headers, formatting, validation, and append behavior without writing other Save Capture files.
- Added focused regression coverage for the new CSV-only save path.

**Metrics:**
- Files modified: 6
- Tests run: 6 commands, all passing

**Lessons / Notes:**
The safest implementation path was to extract the CSV append behavior from the full Save Capture workflow, then call that narrow helper from both Save Capture and Record Listing with different destinations.
