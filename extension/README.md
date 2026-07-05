# Production Extension Shell

This folder contains the production Microsoft Edge / Chromium Manifest V3 extension shell for the LinkedIn Job Capture Extension.

## Current DevCycle Scope

DevCycle003 implements:

- Manifest V3 extension shell
- popup capture action
- options page entry point
- active-tab programmatic capture using `chrome.scripting.executeScript`
- conservative LinkedIn job page detection
- minimal capture result display
- unsupported-page and error states

It does not implement the final parser, review UI, project folder configuration, JSON saves, or CSV appends.

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
  shared/
```

`popup/popup.js` owns popup state and active-tab injection. `content/captureActivePage.js` exports the standalone function injected into the active tab. Later DevCycles can expand this boundary into a fuller parser module without embedding parser logic directly in the UI.

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
- On a LinkedIn job detail page, capture should return URL, timestamp, page title, candidate heading, and detection signals.
- The Options button should open the extension options page.

## Notes

The user should manually expand collapsed LinkedIn job descriptions before capture. The extension does not click LinkedIn expansion controls in the MVP.
