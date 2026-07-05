# Production Extension Shell

This folder contains the production Microsoft Edge / Chromium Manifest V3 extension for the LinkedIn Job Capture Extension.

## Current DevCycle Scope

DevCycle004 adds the first deterministic LinkedIn parser on top of the DevCycle003 extension shell.

Implemented in the current shell:

- Manifest V3 extension shell
- popup capture action
- options page entry point
- active-tab programmatic capture using `chrome.scripting.executeScript`
- conservative LinkedIn job page detection
- structured LinkedIn job capture object
- summary display for parsed fields
- unsupported-page and error states

It does not implement the final editable review UI, project folder file access, JSON saves, or CSV appends.

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
  content/
    captureActivePage.js
  tests/
    captureActivePage.smoke.test.mjs
  PARSER_NOTES.md
```

`popup/popup.js` owns popup state and active-tab injection. `content/captureActivePage.js` exports the standalone function injected into the active tab. The injected function currently contains the parser helpers directly because Chrome serializes the provided function when executing it in the active tab.

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
6. Open a page and click **Capture Active Tab**.

## Smoke Test Checklist

- On a non-LinkedIn page, capture should show an unsupported-page message.
- On a LinkedIn page without job detail content, capture should show an unsupported-page message.
- On a LinkedIn job detail page, capture should return a structured record with company, title, location, posting age, applicant count, apply type, and description fields when visible.
- The Options button should open the extension options page.

## Local Checks

Run from the repository root:

```powershell
node --check extension/content/captureActivePage.js
node --check extension/popup/popup.js
node extension/tests/captureActivePage.smoke.test.mjs
```

## Notes

The user should manually expand collapsed LinkedIn job descriptions before capture. The extension does not click LinkedIn expansion controls in the MVP.