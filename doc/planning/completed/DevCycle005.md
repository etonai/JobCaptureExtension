# DevCycle 005: Project Folder, Saved Listings, and CSV Tracking

**Status:** Verified
**Start Date:** 2026-07-05
**Target Completion:** 2026-07-05
**Focus:** Add local project folder configuration and persist captured LinkedIn records as JSON, description text, and CSV tracking rows.

---

## Goal

This DevCycle turns the parser output from DevCycle004 into durable local files.

DevCycle002 proved that Microsoft Edge can support the planned File System Access API workflow. DevCycle003 and DevCycle004 built the extension shell, capture flow, and deterministic LinkedIn parser. DevCycle005 connects those pieces to the configured project folder so a captured record can be saved locally as a full JSON listing, a sibling description-only text file, and one compact row in `job-tracking.csv`.

This cycle does not build the final editable review UI. It adds the minimum Save controls needed to verify persistence, while DevCycle006 remains responsible for rich field editing and review polish.

## Desired Outcome

By the end of this DevCycle, the user should be able to configure a local project folder from the extension options page, capture a LinkedIn job, and save the current captured record into the project folder.

Successful Save should:

- create or validate `saved-listings/`
- create `job-tracking.csv` with the locked header when missing
- write the full capture record as JSON in `saved-listings/`
- append one CSV row using the locked first-version CSV schema
- store `savedListingPath` as a project-relative JSON path
- show clear success, error, and partial-success states

---

## Tasks

### Phase 1: Versioning and Scope Guardrails

**Status:** Verified

- [x] Update the extension manifest version to `0.0.5` for the DC5 implementation build.
- [x] Confirm DC5 does not add automated application behavior.
- [x] Confirm DC5 does not add AI/LLM parsing or remote persistence.
- [x] Keep the final editable review UI out of scope except for minimal Save verification needs.
- [x] Keep capture allowed before project folder setup, but block Save until setup is complete.

**Technical Notes:**

The manifest version is `0.0.5.1`. DC5 remains local-only and deterministic. The popup may capture before folder setup, but Save requires a configured project folder handle and read/write permission.

### Phase 2: Project Folder Configuration UI

**Status:** Verified

- [x] Replace the options page placeholder with project folder setup controls.
- [x] Add a `Choose Project Folder` action using the File System Access API.
- [x] Show configured folder status clearly.
- [x] Add a reconnect flow when permission is missing or revoked.
- [x] Add a change-folder flow for future saves.
- [x] Avoid requesting folder permission on every popup open.

**Technical Notes:**

The project folder handle is stored in IndexedDB through `extension/shared/projectFolderStore.js`. The options page displays API availability, configured-folder state, permission state, and activity messages. Choosing a new folder affects future saves only.

### Phase 3: Project Folder Validation and Initialization

**Status:** Verified

- [x] Validate that a configured folder handle exists before Save.
- [x] Check read/write permission before Save.
- [x] Request permission only when needed.
- [x] Create `saved-listings/` when missing.
- [x] Create `job-tracking.csv` when missing.
- [x] Write the CSV header using the locked schema when creating a new CSV.
- [x] Show a clear error if project folder setup or permission fails.

**Technical Notes:**

Project structure validation is implemented in `extension/shared/saveListing.js`. It creates `saved-listings/` and prepares `job-tracking.csv` with the locked CSV header when needed.

### Phase 4: Filename and Saved Listing JSON

**Status:** Verified

- [x] Add filename generation for saved listing JSON files.
- [x] Use the pattern `YYYY-MM-DD_company-slug_title-slug_linkedinJobId.json`.
- [x] Generate safe lowercase Windows-compatible slugs.
- [x] Use a collision-resistant fallback when `linkedinJobId` is missing.
- [x] Avoid overwriting existing saved listing files.
- [x] Write the full captured record to JSON.
- [x] Update `savedListingPath` before writing JSON and appending CSV.

**Technical Notes:**

Filename generation lives in `extension/shared/filename.js`. Existing JSON or sibling TXT filenames are not overwritten; collisions receive numeric suffixes such as `-2`. `savedListingPath` is project-relative with forward slashes and points to the JSON file.

### Phase 5: CSV Serialization and Header Validation

**Status:** Verified

- [x] Add a CSV module for the locked `job-tracking.csv` schema.
- [x] Serialize CSV as UTF-8 with BOM.
- [x] Use CRLF line endings.
- [x] Use RFC 4180-style quoting and escaping.
- [x] Map capture records to the locked CSV column order.
- [x] Validate the existing CSV header before append.
- [x] Block CSV append if the header does not exactly match the expected schema.

**Technical Notes:**

CSV behavior is implemented in `extension/shared/csv.js`. The CSV excludes full descriptions, poster requirements, benefits, promotion text, and hiring status text.

### Phase 6: Save Flow Integration

**Status:** Verified

- [x] Add a minimal Save action after a successful capture.
- [x] Disable or block Save when no capture record is available.
- [x] Block Save when URL, capture timestamp, or project folder access is missing.
- [x] Warn but allow Save when company or title is missing.
- [x] Save JSON before attempting CSV append.
- [x] Append CSV only after JSON save succeeds and `savedListingPath` is known.
- [x] Show success when both JSON and CSV save succeed.
- [x] Show partial success if JSON saves but CSV append fails.
- [x] Do not write CSV if JSON save fails.

**Technical Notes:**

The popup now shows `Save Capture` after successful capture. Save writes the current parser result; DevCycle006 will reuse the shared save path with reviewed/edited values.

### Phase 7: Error Handling and User Messages

**Status:** Verified

- [x] Add clear not-configured messaging when Save is attempted without a project folder.
- [x] Add clear permission-denied and reconnect messaging.
- [x] Add clear CSV header mismatch messaging.
- [x] Add clear JSON write failure messaging.
- [x] Add clear partial-success messaging when JSON succeeds and CSV append fails.
- [x] Keep unsupported-page and parser-error states from DC4 intact.

**Technical Notes:**

If JSON fails, description text and CSV are not written. If JSON succeeds but description text fails, the popup reports partial success and does not append CSV. If JSON and description text succeed but CSV append fails, the popup reports partial success and keeps the saved files.

### Phase 8: Tests and Manual Verification

**Status:** Verified

- [x] Add CSV serialization tests for commas, quotes, newlines, BOM, and CRLF.
- [x] Add CSV header validation tests.
- [x] Add filename slug and sanitization tests.
- [x] Add repeated-capture filename collision tests for JSON/TXT sibling pairs.
- [x] Add storage/save flow tests where practical without a browser permission prompt.
- [x] Run existing parser smoke tests.
- [x] Run JavaScript syntax checks.
- [x] Manually test project folder setup in Edge.
- [x] Manually test JSON save and CSV append in Edge.
- [x] Manually test permission loss or reconnect behavior if practical.

**Technical Notes:**

Automated tests cover pure CSV, filename, collision, and parser behavior. Manual Edge verification was completed by the user.

---

## Manual Test Checklist

Run these checks from Microsoft Edge after reloading the unpacked extension from `C:\dev\JobCaptureExtension\extension`.

### Reload / Version Check

- [x] Open `edge://extensions/`.
- [x] Reload the unpacked `LinkedIn Job Capture` extension.
- [x] Confirm the displayed extension version is `0.0.5.1`.

### Project Folder Checks

- [x] Open the extension options page.
- [x] Confirm API status is `Available`.
- [x] Click `Choose Project Folder` and select a test project folder.
- [x] Confirm folder status changes to `Configured`.
- [x] Confirm permission status is `Granted` or can be reconnected.
- [x] Confirm `saved-listings/` exists in the selected folder.
- [x] Confirm `job-tracking.csv` exists in the selected folder.
- [x] Confirm a new CSV starts with the locked header row.

### Save Flow Checks

- [x] Open a supported LinkedIn job page.
- [x] Capture the job.
- [x] Confirm `Save Capture` appears after successful capture.
- [x] Click `Save Capture`.
- [x] Confirm the popup reports save success.
- [x] Confirm one JSON file appears in `saved-listings/`.
- [x] Confirm the JSON contains the full capture record and `savedListingPath`.
- [x] Confirm one row was appended to `job-tracking.csv`.
- [x] Confirm the CSV row includes compact tracking fields and excludes the full description.

### Error / Edge Case Checks

- [x] Try Save before configuring a project folder and confirm the not-configured message is clear.
- [x] Rename or alter the CSV header, then Save again and confirm JSON and description text save but CSV append is blocked.
- [x] Capture/save the same job twice and confirm the second JSON file does not overwrite the first.
- [x] Use `Forget Folder`, then confirm Save asks for folder setup again.
- [x] If practical, revoke or lose folder permission and confirm reconnect messaging.

### Regression Checks

- [x] Run `node --check extension/content/captureActivePage.js`.
- [x] Run `node --check extension/popup/popup.js`.
- [x] Run `node --check extension/options/options.js`.
- [x] Run `node --check extension/shared/csv.js`.
- [x] Run `node --check extension/shared/filename.js`.
- [x] Run `node --check extension/shared/projectFolderStore.js`.
- [x] Run `node --check extension/shared/saveListing.js`.
- [x] Run `node extension/tests/captureActivePage.smoke.test.mjs`.
- [x] Run `node extension/tests/persistence.test.mjs`.

---

## Open Questions

1. **Where should the project folder handle be stored in production code?**
   Answer: the directory handle is stored in IndexedDB, with lightweight status displayed in the options page.

2. **Should DC5 save directly from the popup or open a separate extension page?**
   Answer: DC5 saves directly from the popup with a minimal `Save Capture` action. The larger editable review surface remains deferred to DevCycle006.

3. **What should happen when `job-tracking.csv` exists with the wrong header?**
   Answer: JSON saves if possible, CSV append is blocked, and the popup reports partial success.

4. **Should folder setup create missing files automatically or ask confirmation first?**
   Answer: missing `saved-listings/` and `job-tracking.csv` are created automatically after the user explicitly chooses a project folder.

5. **Should repeated captures of the same LinkedIn job overwrite older files?**
   Answer: no. Repeated saves create collision-suffixed JSON filenames and append new CSV rows.

---

## Notes and Risks

- DC5 depends on browser-specific File System Access API behavior and still needs manual testing in Microsoft Edge.
- Directory handles may lose permission after reloads, browser restarts, or policy changes.
- CSV append validates exact headers before writing.
- The extension remains local-only and does not send captured job data to external services.
- Final field editing belongs to DevCycle006, so DC5 intentionally avoids overbuilding review controls.
- The existing parser still uses visible text heuristics and may produce imperfect values; DC5 preserves saveability with warnings rather than requiring perfect extraction.

---

## Completion Summary

**Completion Date:** 2026-07-05
**Phases Completed:** 8 of 8 implementation phases; manual Edge verification and regression checks complete.
**Work Deferred:** Final editable review UI; richer field editing before save.

**Accomplishments:**
- Added project folder configuration in the options page.
- Stored the selected project folder handle in IndexedDB.
- Added project structure initialization for `saved-listings/` and `job-tracking.csv`.
- Added JSON listing saves, description text saves, and CSV row appends from the popup.
- Added CSV header validation and partial-success handling.
- Added filename slugging and collision-safe JSON/TXT sibling saved listing names.
- Added persistence helper tests.

**Metrics:**
- Files modified: 11
- Files added: 6
- Automated checks run: 12

**Lessons / Notes:**
The File System Access API integration can be kept small by separating pure CSV/filename helpers from browser-only project folder handle storage. DC6 can reuse the same save path after adding editable review fields.