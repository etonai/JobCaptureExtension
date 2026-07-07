# DevCycle 008: Prior Company Application Warning

**Status:** Verified
**Start Date:** 2026-07-07
**Target Completion:** 2026-07-07
**Focus:** Warn the user during capture when the captured company already appears in `job-tracking.csv`.

---

## Goal

DevCycle008 adds a lightweight prior-application warning to the extension. When the user captures the active LinkedIn job tab, the extension should check the configured project folder's `job-tracking.csv` for previous rows with the same company. If the captured company has appeared before, the popup should show a yellow warning in the same status area currently used for messages like "Captured" and "Structured job fields captured."

This cycle is intentionally focused on warning only. It should not block capture, block save, deduplicate records, rewrite existing CSV rows, or create a broader application-history UI.

## Desired Outcome

After a successful capture, the user should immediately know whether the company already appears in the tracking CSV.

Success looks like:

- capture still works normally on LinkedIn job pages
- the extension reads `job-tracking.csv` from the configured project folder after capture
- company matching uses the captured company name and existing CSV company values
- if prior rows are found, the status panel shows a yellow warning
- the warning includes useful context, especially prior application date information when available
- save behavior remains unchanged
- if the CSV cannot be read, capture still succeeds and the user receives a non-blocking warning or normal capture message as appropriate

---

## Tasks

### Phase 1: Prior Company CSV Lookup Design

**Status:** Verified

- [x] Define how the extension will read `job-tracking.csv` after a successful capture.
- [x] Define company normalization for matching captured company names to CSV company values.
- [x] Define how dates should be extracted from matching CSV rows.
- [x] Decide the exact warning text shown when prior company rows exist.
- [x] Decide the fallback behavior when the project folder is not configured or the CSV cannot be read.

**Technical Notes:**

The CSV already contains `company`, `captureDate`, and `captureTime` columns. The lookup should use the existing configured project folder handle and existing CSV file. It should not change the CSV schema.

Recommended company matching:

- trim whitespace
- lowercase
- collapse repeated spaces
- remove simple punctuation differences only if needed

Recommended warning message shape:

```text
Previously captured company
You have 2 prior CSV entries for Example Co. Most recent: 2026-07-05.
```

The status panel should use the existing yellow/warning visual state already supported by `popup.css`.

### Phase 2: Implement Capture-Time Company Warning

**Status:** Verified

- [x] Add a helper to read and parse `job-tracking.csv` from the configured project folder.
- [x] Add a helper to find prior rows for the captured company.
- [x] After successful capture, check for prior company entries.
- [x] Show a yellow warning in the existing status panel when prior entries are found.
- [x] Preserve the normal captured status message when no prior entries are found.
- [x] Keep save behavior unchanged.
- [x] Ensure missing project folder, missing CSV, empty CSV, or unreadable CSV does not break capture.
- [x] Bump the manifest version for reload verification.

**Technical Notes:**

Likely files:

- `extension/popup/popup.js`
- `extension/shared/csv.js` if parsing helpers belong beside existing CSV serialization/header helpers
- `extension/shared/projectFolderStore.js` only if existing project-folder access helpers are insufficient
- `extension/tests/persistence.test.mjs` or a new focused test if CSV lookup helpers are extracted
- `extension/README.md` if the user-facing behavior should be documented

The implementation should not append to CSV during capture. It should only read CSV. CSV append remains part of Save Capture.

### Phase 3: Regression And Manual Verification

**Status:** Verified

- [x] Verify capture still succeeds when no project folder is configured.
- [x] Verify capture still succeeds when `job-tracking.csv` does not exist.
- [x] Verify no warning is shown when the captured company is not in the CSV.
- [x] Verify a yellow warning is shown when the captured company is already in the CSV.
- [x] Verify the warning includes previous capture date information when available.
- [x] Verify Save Capture still writes JSON, TXT, MD, CSV, and notes as before.

**Technical Notes:**

Regression checks should include:

```powershell
node --check extension/popup/popup.js
node --check extension/shared/csv.js
node --check extension/shared/saveListing.js
node extension/tests/captureActivePage.smoke.test.mjs
node extension/tests/persistence.test.mjs
```

Manual tests should use a project folder with a `job-tracking.csv` containing at least one known company, then capture a new LinkedIn listing from that same company.

---

## Open Questions

1. **Should matching be exact or fuzzy?**
   Recommendation: start with conservative normalized exact matching. Avoid fuzzy matching in this cycle because false warnings could become noisy quickly.

2. **Should the current unsaved capture count as an application?**
   Recommendation: no. Only prior saved CSV rows should trigger the warning. Capture should not update tracking history until Save Capture is pressed.

3. **Should the warning block saving?**
   Recommendation: no. This is informational only. The user may legitimately apply to multiple roles at the same company.


**Implementation Notes:**
- `extension/shared/csv.js` now includes CSV parsing helpers, company normalization, and `findPriorCompanyCaptures()` for prior-company lookup.
- `extension/popup/popup.js` now reads `job-tracking.csv` after a successful capture when the project folder is configured and already has granted permission.
- When prior CSV entries match the captured company, the popup shows the existing yellow warning state with the count and most recent capture date.
- Missing project folder, missing CSV, missing permission, or CSV read errors are non-blocking and fall back to the normal captured message.
- Capture remains read-only; CSV append still happens only during Save Capture.
- `extension/tests/persistence.test.mjs` now covers CSV parsing, normalized company matching, and prior-company date summary.
- `extension/README.md` documents the prior-company warning behavior.
- `extension/manifest.json` version was bumped to `0.0.8.0` for reload verification.
- Verification fix: `extension/popup/popup.js` now requests project-folder permission during the capture-triggered CSV check instead of silently skipping when permission is `prompt`.
- Verification fix: `extension/shared/csv.js` now matches simple company variants such as `Uber` and `Uber Technologies, Inc.`.
- `extension/tests/persistence.test.mjs` now covers the Uber/Uber Technologies matching case.
- `extension/manifest.json` version was bumped to `0.0.8.1` for reload verification after the warning fix.

**Regression Checks:**
- [x] Parse `extension/manifest.json` as JSON.
- [x] `node --check extension/popup/popup.js`
- [x] `node --check extension/shared/csv.js`
- [x] `node --check extension/shared/saveListing.js`
- [x] `node --check extension/content/captureActivePage.js`
- [x] `node extension/tests/captureActivePage.smoke.test.mjs`
- [x] `node extension/tests/persistence.test.mjs`

**Manual Tests:**
- [x] Reload the unpacked extension and confirm version `0.0.8.1`.
- [x] Capture with no configured project folder and confirm capture still succeeds.
- [x] Capture with no `job-tracking.csv` and confirm capture still succeeds.
- [x] Capture a company absent from the CSV and confirm the normal captured message appears.
- [x] Capture a company already present in the CSV, including a simple company-name variant such as Uber/Uber Technologies, and confirm the yellow prior-company warning appears.
- [x] Confirm Save Capture still writes JSON, TXT, MD, CSV, and notes as before.
---

## Notes and Risks

- The CSV may be open in another application; reading may fail or see stale state. This should be non-blocking for capture.
- Existing CSV files with header mismatches currently block CSV append during save. The warning lookup should avoid introducing a stricter failure mode during capture.
- Company names may vary between postings, for example `Starbucks`, `Starbucks Coffee Company`, and `Starbucks, Inc.`. This cycle should document matching limits rather than over-solving them.
- The warning should reuse the existing yellow status-panel state so the UI remains visually consistent.
- Implementation was explicitly approved before work began.

---

## Completion Summary

**Completion Date:** 2026-07-07
**Phases Completed:** All
**Work Deferred:** None

**Accomplishments:**
- Added a prior-company warning after capture when the captured company already appears in `job-tracking.csv`.
- Added CSV parsing and company matching helpers for capture-time lookup.
- Preserved save behavior; CSV append still happens only on Save Capture.
- Fixed verification issues around project-folder permission and simple company-name variants such as Uber/Uber Technologies.

**Metrics:**
- Files modified: 5
- Tests passing: Manifest JSON parse, syntax checks, capture smoke tests, persistence tests
- Final verified extension version: `0.0.8.1`

**Lessons / Notes:**
- Capture-time CSV reads should request project-folder permission when needed rather than silently skipping lookup.
- Company matching needs to tolerate simple business-name variants, while avoiding broad fuzzy matching.
