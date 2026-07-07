# DevCycle 008: Prior Company Application Warning

**Status:** Planning
**Start Date:** 2026-07-07
**Target Completion:** TBD
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

**Status:** Planning

- [ ] Define how the extension will read `job-tracking.csv` after a successful capture.
- [ ] Define company normalization for matching captured company names to CSV company values.
- [ ] Define how dates should be extracted from matching CSV rows.
- [ ] Decide the exact warning text shown when prior company rows exist.
- [ ] Decide the fallback behavior when the project folder is not configured or the CSV cannot be read.

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

**Status:** Planning

- [ ] Add a helper to read and parse `job-tracking.csv` from the configured project folder.
- [ ] Add a helper to find prior rows for the captured company.
- [ ] After successful capture, check for prior company entries.
- [ ] Show a yellow warning in the existing status panel when prior entries are found.
- [ ] Preserve the normal captured status message when no prior entries are found.
- [ ] Keep save behavior unchanged.
- [ ] Ensure missing project folder, missing CSV, empty CSV, or unreadable CSV does not break capture.
- [ ] Bump the manifest version for reload verification.

**Technical Notes:**

Likely files:

- `extension/popup/popup.js`
- `extension/shared/csv.js` if parsing helpers belong beside existing CSV serialization/header helpers
- `extension/shared/projectFolderStore.js` only if existing project-folder access helpers are insufficient
- `extension/tests/persistence.test.mjs` or a new focused test if CSV lookup helpers are extracted
- `extension/README.md` if the user-facing behavior should be documented

The implementation should not append to CSV during capture. It should only read CSV. CSV append remains part of Save Capture.

### Phase 3: Regression And Manual Verification

**Status:** Planning

- [ ] Verify capture still succeeds when no project folder is configured.
- [ ] Verify capture still succeeds when `job-tracking.csv` does not exist.
- [ ] Verify no warning is shown when the captured company is not in the CSV.
- [ ] Verify a yellow warning is shown when the captured company is already in the CSV.
- [ ] Verify the warning includes previous capture date information when available.
- [ ] Verify Save Capture still writes JSON, TXT, MD, CSV, and notes as before.

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

---

## Notes and Risks

- The CSV may be open in another application; reading may fail or see stale state. This should be non-blocking for capture.
- Existing CSV files with header mismatches currently block CSV append during save. The warning lookup should avoid introducing a stricter failure mode during capture.
- Company names may vary between postings, for example `Starbucks`, `Starbucks Coffee Company`, and `Starbucks, Inc.`. This cycle should document matching limits rather than over-solving them.
- The warning should reuse the existing yellow status-panel state so the UI remains visually consistent.
- Per the project process, implementation should not begin until this DevCycle document is reviewed and explicitly approved.

---

## Completion Summary

*Fill in when the cycle closes. Move this document to `doc/planning/completed/` afterward.*

**Completion Date:** TBD
**Phases Completed:** TBD
**Work Deferred:** TBD

**Accomplishments:**
- TBD

**Metrics:**
- Files modified: TBD
- Tests passing: TBD

**Lessons / Notes:**
TBD
