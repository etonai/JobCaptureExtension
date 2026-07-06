# DevCycle 007: Testing, Minor Improvements, and Bug Fix Intake

**Status:** Planning
**Start Date:** 2026-07-06
**Target Completion:** TBD
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

**Status:** Planning

- [ ] Reload the unpacked extension from `C:\dev\JobCaptureExtension\extension`.
- [ ] Confirm the displayed extension version is `0.0.7` or later.
- [ ] Open `edge://extensions/shortcuts`.
- [ ] Confirm or assign `Alt+Shift+L` for opening the popup.
- [ ] Confirm or assign `Alt+Shift+0` for opening the popup and running Capture Active Tab.
- [ ] On a LinkedIn job page, verify `Alt+Shift+L` opens the popup without capturing.
- [ ] On a LinkedIn job page, verify `Alt+Shift+0` opens the popup and captures the active tab.
- [ ] Confirm the auto-capture shortcut does not save files or append CSV rows until Save is pressed.

**Technical Notes:**

This phase is manual testing only. If shortcut behavior fails, document the observed behavior and add a new proposed fix phase before changing code.

### Phase 2: Baseline Capture And Save Testing

**Status:** Planning

- [ ] Confirm the project folder is configured.
- [ ] Capture at least one LinkedIn Easy Apply job if naturally available.
- [ ] Capture at least one external Apply job if naturally available.
- [ ] Save captured listings.
- [ ] Inspect generated `.json` files.
- [ ] Inspect generated sibling `.txt` description files.
- [ ] Inspect `job-tracking.csv` in a spreadsheet editor.
- [ ] Confirm repeated saves do not overwrite earlier captures.
- [ ] Record any parser mistakes, missing fields, save errors, or CSV issues.

**Technical Notes:**

This phase is manual testing only. Any parser, save, filename, TXT, or CSV issue should be added as a separate proposed phase before implementation.

### Phase 3: Minor Improvement And Bug Fix Intake

**Status:** Planning

- [ ] Add a new phase for each accepted minor improvement or bug fix.
- [ ] Keep each phase narrowly scoped.
- [ ] Include expected behavior, files likely to change, risks/unknowns, regression checks, and manual tests.
- [ ] Stop for user review before implementation.

**Technical Notes:**

This is a placeholder intake phase. Do not implement from this phase directly; create a specific phase for each item.

---

### Phase 4: Company-First Saved Listing Filenames

**Status:** Work Complete

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
- [ ] Capture and save a listing.
- [ ] Confirm the new JSON filename starts with the company name.
- [ ] Confirm the sibling `.txt` filename uses the same basename.
- [ ] Confirm `job-tracking.csv` records the new saved listing path.
- [ ] Confirm a second save of the same listing still receives a collision suffix instead of overwriting.

**Implementation Notes:**
- `extension/shared/filename.js` now generates new saved listing filenames as `company_YYYY-MM-DD_title_jobid.json`.
- `extension/tests/persistence.test.mjs` now expects company-first filenames, including fallback job-id filenames.
- `extension/README.md` project folder examples now show company-first `.json` and `.txt` filenames.
- `README.md` project folder examples now show company-first filenames.
- `extension/options/options.html` expected-layout example now shows a company-first filename.
- Existing saved files are not renamed by this change.
- `extension/manifest.json` version was updated to `0.0.7` for reload verification.
**Approval Checkpoint:**
Implementation was explicitly approved and completed. Manual verification remains pending.

---
### Phase 5: Single Auto-Capture Shortcut

**Status:** Work Complete

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
- [ ] Reload the unpacked extension and confirm the new version number.
- [ ] Open `edge://extensions/shortcuts` and confirm or assign `Alt+Shift+L` for the auto-capture command.
- [ ] On a LinkedIn job page, press `Alt+Shift+L` and confirm the popup opens.
- [ ] Confirm Capture Active Tab runs automatically.
- [ ] Confirm no files are saved and no CSV rows are appended until Save is pressed.

**Implementation Notes:**
- `extension/manifest.json` now declares a single `capture-active-tab` command with default shortcut `Alt+Shift+L`.
- `extension/manifest.json` version was bumped to `0.0.7.1` for reload verification.
- `extension/background/background.js` was restored to set an auto-capture popup intent and open the extension popup.
- `extension/popup/popup.js` now consumes the auto-capture intent once on popup load and runs the existing capture flow.
- `extension/README.md` now documents the single shortcut and background worker.
- No save behavior changed; the shortcut captures only and still requires the user to press Save.
**Approval Checkpoint:**
Implementation was explicitly approved and completed. Manual verification remains pending.

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

*Fill in when the cycle closes. Move this document to `doc/planning/completed/` afterward.*

**Completion Date:** TBD
**Phases Completed:** TBD
**Work Deferred:** TBD

**Accomplishments:**
- TBD

**Metrics:**
- Listings tested: TBD
- Bugs found: TBD
- Bug-fix phases added: TBD
- Minor-improvement phases added: TBD

**Lessons / Notes:**
TBD