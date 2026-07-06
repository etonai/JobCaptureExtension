# Production Extension Shell

This folder contains the production Microsoft Edge / Chromium Manifest V3 extension for the LinkedIn Job Capture Extension.

## Current DevCycle Scope

DevCycle005 adds local persistence on top of the DevCycle004 parser.

Implemented in the current shell:

- Manifest V3 extension shell
- popup capture action
- options page project folder configuration
- active-tab programmatic capture using `chrome.scripting.executeScript`
- conservative LinkedIn job page detection
- structured LinkedIn job capture object
- summary display for parsed fields
- saved listing JSON writes into `saved-listings/`
- sibling description-only `.txt` writes into `saved-listings/`
- `job-tracking.csv` creation/header validation/append
- unsupported-page, save-success, save-error, and partial-success states

It does not implement the final editable review UI. The Save action writes the current captured parser result; DevCycle006 will add richer field editing before save.

## Source Layout

```text
extension/
  manifest.json
  popup/
    popup.html
    popup.css
    popup.js
  options/
    options.html
    options.css
    options.js
  content/
    captureActivePage.js
  shared/
    csv.js
    filename.js
    projectFolderStore.js
    saveListing.js
  tests/
    captureActivePage.smoke.test.mjs
    persistence.test.mjs
  PARSER_NOTES.md
```

`popup/popup.js` owns popup state, active-tab injection, and minimal Save orchestration. Shared modules own CSV serialization, filename generation, project folder handle storage, and JSON/TXT/CSV writes.

## Tooling Decision

The extension currently uses plain JavaScript with no build step. This keeps unpacked Edge loading simple while the architecture is still settling.

## Loading In Microsoft Edge

1. Open `edge://extensions/`.
2. Turn on Developer mode.
3. Choose **Load unpacked**.
4. Select this folder:

   ```text
   C:\dev\JobCaptureExtension\extension
   ```

5. Pin or open the extension action.
6. Open Options and choose a project folder.
7. Open a LinkedIn job page, capture, then save.

## Project Folder Layout

```text
Job Search Project/
  job-tracking.csv
  saved-listings/
    starbucks_2026-07-05_software-engineer-sr_123456789.json
    starbucks_2026-07-05_software-engineer-sr_123456789.txt
```

The CSV uses the locked first-version schema from `doc/planning/ExtensionDesign.md`. Existing CSV files with mismatched headers block CSV append, but the JSON listing and description text file remain saved when possible.

## Local Checks

Run from the repository root:

```powershell
node --check extension/content/captureActivePage.js
node --check extension/popup/popup.js
node --check extension/options/options.js
node --check extension/shared/csv.js
node --check extension/shared/filename.js
node --check extension/shared/projectFolderStore.js
node --check extension/shared/saveListing.js
node extension/tests/captureActivePage.smoke.test.mjs
node extension/tests/persistence.test.mjs
```

## Notes

The user should manually expand collapsed LinkedIn job descriptions before capture. The extension does not click LinkedIn expansion controls in the MVP.