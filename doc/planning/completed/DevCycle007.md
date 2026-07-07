# DevCycle 007: Testing, Minor Improvements, and Bug Fix Intake

**Status:** Verified
**Start Date:** 2026-07-06
**Target Completion:** 2026-07-07
**Focus:** Test the current extension in real use, then add reviewed phases for minor improvements and bug fixes as they are discovered.

---

## Goal

DevCycle007 resets the work after the mishandled DevCycle006. The purpose of this cycle is to test the current extension deliberately, record observations, and create small, reviewable phases for any minor improvements or bug fixes that should be made.

This cycle is intentionally not a broad feature cycle. New work should be added only after testing reveals a concrete issue or small improvement, and every implementation phase must follow the planning-first process.

## Desired Outcome

By the end of this cycle, the extension should have been tested against normal LinkedIn job-capture usage, and any fixes or small improvements accepted into the cycle should be documented, implemented, and verified one phase at a time.

Success looks like:

- the current extension version is reloaded and tested in Edge
- shortcut behavior is verified or clearly documented as needing adjustment
- capture, save, JSON, TXT, and CSV outputs are checked with real listings
- bugs and minor improvements are recorded before implementation
- each accepted fix/improvement has its own reviewed phase
- the cycle can close cleanly with a list of what was tested, fixed, deferred, or abandoned

---

## DC6 Retrospective: Why This Cycle Must Stay Additive And Explicit

DevCycle006 was a problem because the DevCycle document stopped being a reliable planning record.

The core failure was not only that the shortcut implementation had bugs. The deeper issue was that implementation work happened before the user had reviewed and approved a plan. A field-trial observation was treated as permission to implement, user-facing keyboard shortcuts were chosen without user input, and manifest/configuration behavior changed before the planning checkpoint.

After that, the document was patched in scattered places. That made it difficult to tell what had been planned, what had been implemented, what was retrospective explanation, and what still needed review. Testing, implementation, bug fixing, process correction, and retrospective notes became mixed together until DC6 was no longer easy to audit.

DC7 exists partly to prevent that from happening again.

For DC7:

- changes to this document should be additive and clearly identifiable as edits
- new bugs or minor improvements should usually become new phases
- tasks should not be quietly inserted into existing phases unless the user explicitly asks for that structure
- implementation details should not be spread across the document as shotgun edits
- each proposed phase should make clear what is observed, what is desired, what files might change, what risks exist, and what tests will be run
- after adding a proposed phase, the agent must stop for user review
- code or behavior changes must wait for explicit user approval

The point is to keep the document trustworthy. The user should be able to read DC7 and immediately understand what is testing, what is proposed, what is approved, what is implemented, and what remains undecided.

---

## Working Rules For This Cycle

- Testing observations do not automatically become implementation work.
- When a bug or minor improvement is found, add a new phase to this document with:
  - observed behavior
  - desired behavior
  - proposed files to change
  - risks or unknowns
  - regression checks
  - manual tests
- Stop after adding the phase and ask the user to review it.
- Implement only after the user explicitly approves that phase and asks for implementation.
- Do not bundle unrelated fixes into one phase.
- Do not run git commands unless the user explicitly permits them.

---

## Tasks

### Phase 1: Baseline Reload And Shortcut Verification

**Status:** Verified

- [x] Reload the unpacked extension from `C:\dev\JobCaptureExtension\extension`.
- [x] Confirm the displayed extension version is `0.0.7` or later.
- [x] Open `edge://extensions/shortcuts`.
- [x] Confirm or assign `Alt+Shift+L` for opening the popup.
- [x] Confirm or assign `Alt+Shift+0` for opening the popup and running Capture Active Tab.
- [x] On a LinkedIn job page, verify `Alt+Shift+L` opens the popup without capturing.
- [x] On a LinkedIn job page, verify `Alt+Shift+0` opens the popup and captures the active tab.
- [x] Confirm the auto-capture shortcut does not save files or append CSV rows until Save is pressed.

**Technical Notes:**

This phase is manual testing only. If shortcut behavior fails, document the observed behavior and add a new proposed fix phase before changing code.

### Phase 2: Baseline Capture And Save Testing

**Status:** Verified

- [x] Confirm the project folder is configured.
- [x] Capture at least one LinkedIn Easy Apply job if naturally available.
- [x] Capture at least one external Apply job if naturally available.
- [x] Save captured listings.
- [x] Inspect generated `.json` files.
- [x] Inspect generated sibling `.txt` description files.
- [x] Inspect `job-tracking.csv` in a spreadsheet editor.
- [x] Confirm repeated saves do not overwrite earlier captures.
- [x] Record any parser mistakes, missing fields, save errors, or CSV issues.

**Technical Notes:**

This phase is manual testing only. Any parser, save, filename, TXT, or CSV issue should be added as a separate proposed phase before implementation.

### Phase 3: Minor Improvement And Bug Fix Intake

**Status:** Verified

- [x] Add a new phase for each accepted minor improvement or bug fix.
- [x] Keep each phase narrowly scoped.
- [x] Include expected behavior, files likely to change, risks/unknowns, regression checks, and manual tests.
- [x] Stop for user review before implementation.

**Technical Notes:**

This is a placeholder intake phase. Do not implement from this phase directly; create a specific phase for each item.

---

### Phase 4: Company-First Saved Listing Filenames

**Status:** Verified

**Observed Behavior:**
Saved listing filenames currently begin with the capture date, followed by company, title, and job id. This makes chronological sorting easy, but it is less useful when browsing `saved-listings/` to find a file by company name.

Current pattern:

```text
YYYY-MM-DD_company_title_jobid.json
```

Example:

```text
2026-07-05_starbucks-inc_software-engineer-sr_123456789.json
```

**Desired Behavior:**
Saved listing filenames should begin with the company name, followed by the capture date and the remaining identifying fields.

Proposed pattern:

```text
company_YYYY-MM-DD_title_jobid.json
```

Example:

```text
starbucks-inc_2026-07-05_software-engineer-sr_123456789.json
```

The sibling description `.txt` file should keep matching the JSON basename.

**Proposed Files To Change:**
- `extension/shared/filename.js`
- `extension/tests/persistence.test.mjs`
- `extension/README.md` if examples or documentation mention the saved listing filename format
- `README.md` because it documents the project folder layout
- `extension/options/options.html` because it shows the expected saved-listings layout
- `doc/planning/DevCycle007.md` to record implementation and verification results after approval

**Risks / Unknowns:**
- Existing saved files will keep the old date-first names; this phase should not rename existing files unless separately planned and approved.
- Collision handling should continue to work with the new basename order.
- Filename slug fallback behavior should stay unchanged for missing or unsafe company names.
- CSV `savedListingPath` values should reflect the new filename only for newly saved listings.

**Tasks:**
- [x] Update filename generation so the company slug comes first.
- [x] Keep the date, title, and job id in the filename after the company.
- [x] Confirm description `.txt` filenames still match the generated JSON basename.
- [x] Update filename-related tests.
- [x] Update README examples if they show the old filename order.

**Regression Checks:**
- [x] `node --check extension/shared/filename.js`
- [x] `node --check extension/shared/saveListing.js`
- [x] `node extension/tests/persistence.test.mjs`

**Manual Tests:**
- [x] Capture and save a listing.
- [x] Confirm the new JSON filename starts with the company name.
- [x] Confirm the sibling `.txt` filename uses the same basename.
- [x] Confirm `job-tracking.csv` records the new saved listing path.
- [x] Confirm a second save of the same listing still receives a collision suffix instead of overwriting.

**Implementation Notes:**
- `extension/shared/filename.js` now generates new saved listing filenames as `company_YYYY-MM-DD_title_jobid.json`.
- `extension/tests/persistence.test.mjs` now expects company-first filenames, including fallback job-id filenames.
- `extension/README.md` project folder examples now show company-first `.json` and `.txt` filenames.
- `README.md` project folder examples now show company-first filenames.
- `extension/options/options.html` expected-layout example now shows a company-first filename.
- Existing saved files are not renamed by this change.
- `extension/manifest.json` version was updated to `0.0.7` for reload verification.
**Approval Checkpoint:**
Implementation was explicitly approved and completed. Manual verification completed by user; phase closed.

---
### Phase 5: Single Auto-Capture Shortcut

**Status:** Verified

**Observed Behavior:**
After repository recovery, the extension manifest no longer appears to contain the shortcut/background command wiring that previously supported keyboard shortcuts. The user wants one shortcut only: `Alt+Shift+L` should bring up the LinkedIn Job Capture screen and automatically run Capture Active Tab.

**Desired Behavior:**
Pressing `Alt+Shift+L` while a LinkedIn job page is active should:

- open the LinkedIn Job Capture popup/screen
- automatically run Capture Active Tab
- show the captured summary in the popup
- not save the listing or append `job-tracking.csv` until the user explicitly presses Save

There should not be a second shortcut for opening the popup without capture in this phase.

**Proposed Files To Change:**
- `extension/manifest.json`
- `extension/background/background.js` if background command handling needs to be restored
- `extension/popup/popup.js` if popup auto-capture intent handling needs to be restored
- `extension/README.md` for shortcut documentation
- `doc/planning/DevCycle007.md` to record implementation and verification results after approval

**Risks / Unknowns:**
- Edge may keep local shortcut assignments in `edge://extensions/shortcuts` after manifest changes; the user may need to manually clear or reassign the shortcut.
- `chrome.action.openPopup()` support in Edge should be verified manually.
- The extension currently shows version `0.0.7`; implementing this phase should include a version bump for reload verification.
- Restoring shortcut behavior may require reintroducing a background service worker that was lost during repository recovery.

**Tasks:**
- [x] Add or restore a single `Alt+Shift+L` command for auto-capture.
- [x] Ensure the shortcut opens the popup/screen and runs Capture Active Tab automatically.
- [x] Ensure the shortcut does not save files or append CSV rows.
- [x] Remove or avoid any separate popup-only shortcut.
- [x] Bump the manifest version for reload verification.
- [x] Update shortcut documentation in `extension/README.md`.

**Regression Checks:**
- [x] Parse `extension/manifest.json` as JSON.
- [x] `node --check extension/background/background.js` if that file is added or restored.
- [x] `node --check extension/popup/popup.js` if changed.
- [x] `node extension/tests/captureActivePage.smoke.test.mjs`.
- [x] `node extension/tests/persistence.test.mjs`.

**Manual Tests:**
- [x] Reload the unpacked extension and confirm the new version number.
- [x] Open `edge://extensions/shortcuts` and confirm or assign `Alt+Shift+L` for the auto-capture command.
- [x] On a LinkedIn job page, press `Alt+Shift+L` and confirm the popup opens.
- [x] Confirm Capture Active Tab runs automatically.
- [x] Confirm no files are saved and no CSV rows are appended until Save is pressed.

**Implementation Notes:**
- `extension/manifest.json` now declares a single `capture-active-tab` command with default shortcut `Alt+Shift+L`.
- `extension/manifest.json` version was bumped to `0.0.7.1` for reload verification.
- `extension/background/background.js` was restored to set an auto-capture popup intent and open the extension popup.
- `extension/popup/popup.js` now consumes the auto-capture intent once on popup load and runs the existing capture flow.
- `extension/README.md` now documents the single shortcut and background worker.
- No save behavior changed; the shortcut captures only and still requires the user to press Save.
**Approval Checkpoint:**
Implementation was explicitly approved and completed. Manual verification completed by user; phase closed.

---
### Phase 6: Markdown Description File

**Status:** Verified

**Observed Behavior:**
Saved listings currently create a `.json` file and a sibling `.txt` file that contains the captured description text. The `.txt` file is useful, but it flattens the description into plain text and loses useful structure such as section headings, emphasis, spacing, and real list items.

The HTML examples in `doc/examples/easyposteasyapplybare.html` and `doc/examples/Starbucksmoreunselectedbare.html` show that LinkedIn's rendered job description area often contains enough HTML structure to produce a more readable Markdown version:

- EasyPost includes `About the job`, paragraph tags, and strong text around description headings.
- Starbucks includes `About the job`, line breaks, strong text, and real unordered lists/list items.

The current content capture flow primarily uses `document.body.innerText`, so the extension does not currently preserve that DOM structure for saved description output.

**Desired Behavior:**
When a listing is saved, the extension should also save a sibling Markdown file containing the job description in readable Markdown format.

Proposed output set for each saved listing:

```text
company_YYYY-MM-DD_title_jobid.json
company_YYYY-MM-DD_title_jobid.txt
company_YYYY-MM-DD_title_jobid.md
```

The Markdown file should prioritize readability for later review. It should preserve simple structure when available:

- headings or bold section labels should become Markdown headings or bold text
- real unordered list items should become Markdown bullets
- paragraph breaks and intentional line breaks should remain readable
- links may be preserved if they are present in the description DOM and are useful

If DOM-based Markdown extraction fails or the expected description container cannot be found, the extension should fall back to writing a simple Markdown file from the existing plain-text `record.description` value.

**Proposed Files To Change:**
- `extension/content/captureActivePage.js` to capture or generate Markdown description content from the LinkedIn job description DOM when available
- `extension/shared/saveListing.js` to write the sibling `.md` file during save
- `extension/tests/captureActivePage.smoke.test.mjs` if capture output expectations change
- `extension/tests/persistence.test.mjs` to verify `.md` sibling file creation
- `extension/README.md` to document the `.md` saved description file
- `README.md` if the project folder layout examples mention saved listing output files
- `doc/planning/DevCycle007.md` to record implementation and verification results after approval

**Risks / Unknowns:**
- LinkedIn's DOM structure is unstable and class names are not reliable; extraction should prefer semantic markers, component keys, `data-testid`, visible headings, or bounded traversal from `About the job`.
- Some LinkedIn descriptions use real lists, while others use plain paragraph text with manual bullet markers such as `o`; the Markdown conversion should avoid over-aggressive rewriting.
- Description Markdown should not include unrelated page UI, nearby profile/contact sections, or "Requirements added by the poster" unless intentionally included.
- The `.txt` file should remain for compatibility unless a separate phase explicitly removes or replaces it.
- Tests may need to use the HTML examples in `doc/examples/` to cover DOM-based Markdown conversion without relying on live LinkedIn pages.

**Tasks:**
- [x] Add DOM-based description-to-Markdown extraction for the job description area.
- [x] Preserve the existing plain-text `record.description` behavior.
- [x] Add a Markdown description field or save-time Markdown generation path.
- [x] Save a sibling `.md` file with the same basename as the `.json` and `.txt` files.
- [x] Keep `.txt` file generation unchanged.
- [x] Add or update tests for Markdown file creation.
- [x] Add fixture/reference coverage using the EasyPost and Starbucks HTML examples where practical.
- [x] Update documentation for the new `.md` file.
- [x] Bump the manifest version for reload verification if extension code changes.

**Regression Checks:**
- [x] Parse `extension/manifest.json` as JSON if changed.
- [x] `node --check extension/content/captureActivePage.js`
- [x] `node --check extension/shared/saveListing.js`
- [x] `node extension/tests/captureActivePage.smoke.test.mjs`
- [x] `node extension/tests/persistence.test.mjs`

**Manual Tests:**
- [x] Reload the unpacked extension and confirm the new version number if changed.
- [x] Capture and save a LinkedIn listing with paragraph-heavy description content.
- [x] Capture and save a LinkedIn listing with list-style description content if naturally available.
- [x] Confirm `.json`, `.txt`, and `.md` sibling files are created.
- [x] Open the `.md` file and confirm headings, paragraphs, and bullets are readable.
- [x] Confirm the `.txt` file still contains the plain description text.
- [x] Confirm `job-tracking.csv` behavior is unchanged.

**Implementation Notes:**
- `extension/content/captureActivePage.js` now records `descriptionMarkdown` on the captured record.
- Markdown capture is DOM-first and looks for the rendered `About the job` description area when available.
- Markdown capture preserves basic paragraphs, bold labels, unordered/ordered lists, line breaks, and links.
- If DOM-based Markdown extraction is unavailable, the extension falls back to the existing plain-text `record.description`.
- `extension/shared/saveListing.js` now writes a sibling `.md` file in addition to the existing `.json` and `.txt` files.
- Filename reservation now treats `.json`, `.txt`, and `.md` siblings as a collision set.
- `extension/manifest.json` version was bumped to `0.0.7.2` for reload verification.
- `extension/README.md`, `README.md`, and `extension/options/options.html` now document the Markdown description file.
- Regression fix: `extension/shared/filename.js` now correctly converts `.json` filenames to `.txt` and `.md` sibling filenames.
- Regression fix: `extension/tests/persistence.test.mjs` now verifies exact `.txt`/`.md` filename derivation and a full save path that writes JSON, TXT, MD, and appends CSV.
- `extension/manifest.json` version was bumped again to `0.0.7.3` for the regression fix reload verification.

**Approval Checkpoint:**
Implementation was explicitly approved and completed. Manual verification completed by user; phase closed.

---
### Phase 7: User Notes Field Saved To CSV

**Status:** Verified

**Observed Behavior:**
The saved record shape already includes a `notes` field, and the CSV schema in `extension/shared/csv.js` already includes a final `notes` column. However, the popup currently has no visible field for the user to enter notes before saving a capture.

As a result, the CSV `notes` column exists but remains empty during normal use because `popup/popup.html` does not expose a notes input and `popup/popup.js` does not copy user-entered notes onto the captured record before calling `saveCaptureRecord()`.

**Desired Behavior:**
The popup should include a user-editable notes box positioned below the `Capture Active Tab` button and above the `Save Capture` button.

The notes box should allow the user to type free-form text after capture and before save. When the user presses `Save Capture`, the current notes text should be saved into `record.notes`, included in the JSON saved listing, and appended to the existing CSV `notes` column along with the rest of the capture data.

The notes field should not affect capture parsing. It is user-entered metadata for tracking what happened, follow-up status, impressions, application notes, or other job-search context.

**Proposed Files To Change:**
- `extension/popup/popup.html` to add the notes textarea between `Capture Active Tab` and `Save Capture`
- `extension/popup/popup.css` to style the notes field consistently with the popup
- `extension/popup/popup.js` to read the notes field before save and set `lastCaptureRecord.notes`
- `extension/tests/persistence.test.mjs` if additional CSV notes coverage is needed
- `extension/README.md` if the save flow documentation should mention notes
- `doc/planning/DevCycle007.md` to record implementation and verification results after approval

**Risks / Unknowns:**
- The CSV schema already includes `notes`, so this should not require a CSV header change. Changing the header would create avoidable compatibility risk with existing `job-tracking.csv` files.
- Notes may contain commas, quotes, or newlines; existing CSV escaping should handle this, but regression coverage should confirm it.
- The notes field should be easy to find without making the popup feel cramped.
- If a user captures a new listing after typing notes for a previous listing, the implementation should define whether the notes box clears on new capture. Recommendation: clear notes when a new capture starts to avoid accidentally saving stale notes.
- Auto-capture shortcut behavior should still only capture; it should not save notes or files until the user presses Save.

**Tasks:**
- [x] Add a notes textarea below `Capture Active Tab` and above `Save Capture`.
- [x] Keep the notes textarea available before save after a successful capture.
- [x] Clear the notes textarea when starting a new capture.
- [x] Before saving, copy the textarea value into `lastCaptureRecord.notes`.
- [x] Confirm saved JSON includes the entered notes.
- [x] Confirm `job-tracking.csv` appends the entered notes in the existing `notes` column.
- [x] Preserve existing CSV header/schema compatibility.
- [x] Bump the manifest version for reload verification if extension code changes.
- [x] Update documentation if needed.

**Regression Checks:**
- [x] Parse `extension/manifest.json` as JSON if changed.
- [x] `node --check extension/popup/popup.js`
- [x] `node --check extension/shared/csv.js`
- [x] `node extension/tests/persistence.test.mjs`
- [x] `node extension/tests/captureActivePage.smoke.test.mjs`

**Manual Tests:**
- [x] Reload the unpacked extension and confirm the new version number if changed.
- [x] Capture a LinkedIn job listing.
- [x] Type notes into the notes field before saving.
- [x] Save the capture.
- [x] Confirm the saved JSON file contains the entered `notes` value.
- [x] Confirm `job-tracking.csv` contains the entered notes in the `notes` column.
- [x] Test notes containing a comma, quote, or newline and confirm the CSV remains valid.
- [x] Start a second capture and confirm stale notes are not accidentally carried over unless the user re-enters them.

**Implementation Notes:**
- `extension/popup/popup.html` now shows a Notes textarea between `Capture Active Tab` and `Save Capture`.
- `extension/popup/popup.css` now styles the notes field consistently with the popup controls.
- `extension/popup/popup.js` clears notes when a new capture starts and copies the current notes value into `lastCaptureRecord.notes` immediately before save.
- `extension/shared/csv.js` was not changed because the existing CSV schema already includes the final `notes` column.
- `extension/tests/persistence.test.mjs` now verifies notes with commas, quotes, and newlines are escaped into CSV.
- `extension/README.md` now documents that notes can be entered before saving and are written to the CSV notes column.
- `extension/manifest.json` version was bumped to `0.0.7.4` for reload verification.

**Approval Checkpoint:**
Implementation was explicitly approved and completed. Manual verification completed by user; phase closed.

---
## Candidate Phase Template

Use this template when adding a bug-fix or minor-improvement phase during DC7.

### Phase N: [Bug Fix Or Minor Improvement Name]

**Status:** Planning

**Observed Behavior:**
TBD

**Desired Behavior:**
TBD

**Proposed Files To Change:**
- TBD

**Risks / Unknowns:**
- TBD

**Tasks:**
- [ ] TBD

**Regression Checks:**
- [ ] TBD

**Manual Tests:**
- [ ] TBD

**Approval Checkpoint:**
Do not implement this phase until the user explicitly approves it and asks for implementation.

---

## Open Questions

1. **How long should DC7 remain open?**
   Recommendation: keep it open while the extension is being actively tested, then close it once the first focused testing pass is complete and any accepted fixes are verified or intentionally deferred.

2. **Should DC7 include new feature work?**
   Recommendation: no. Keep DC7 to testing, minor improvements, and bug fixes. Larger feature ideas should go into a later DevCycle.

---

## Notes and Risks

- DC7 exists partly to restore process discipline after DC6.
- Edge shortcut behavior may depend on local user assignments in `edge://extensions/shortcuts`.
- Manual LinkedIn testing may reveal parser issues that are hard to reproduce without saved examples.
- The extension may already be useful enough after small fixes; avoid growing scope unnecessarily.

---

## Completion Summary

**Completion Date:** 2026-07-07
**Phases Completed:** Phases 1-7
**Work Deferred:** Future improvements and bug fixes will be planned in future DevCycles.

**Accomplishments:**
- Completed the DC7 field-testing and minor-fix cycle.
- Added company-first saved listing filenames.
- Restored the single auto-capture shortcut.
- Added Markdown description file output.
- Fixed the Markdown sibling filename regression that blocked CSV append.
- Added a user notes field and saved notes into the existing CSV `notes` column.
- Preserved the planning-first rule for new work after the DC6 retrospective.

**Metrics:**
- Listings tested: Manual testing performed by user during DC7.
- Bugs found: Markdown sibling filename/CSV append regression; CSV-open file state issue identified as external file lock/state conflict.
- Bug-fix phases added: 0 standalone bug-fix phases; regression fix recorded under Phase 6.
- Minor-improvement phases added: 4 implementation phases, Phases 4-7.

**Lessons / Notes:**
- Future work should happen in new DevCycles.
- Spreadsheet/CSV append can fail when `job-tracking.csv` is open in another application.
- The extension is useful enough for continued real-world use before expanding scope.