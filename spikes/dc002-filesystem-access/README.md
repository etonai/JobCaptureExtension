# DevCycle002 File System Access Spike

This folder contains a minimal Manifest V3 extension used to test whether Microsoft Edge supports the project folder workflow required by the LinkedIn Job Capture Extension.

## What This Tests

- `showDirectoryPicker({ mode: "readwrite" })` availability from an extension options page
- user-selected project folder handles
- storing and restoring a `FileSystemDirectoryHandle` in IndexedDB
- `queryPermission()` and `requestPermission()` behavior
- creating `saved-listings/`
- creating `job-tracking.csv`
- writing sample JSON into `saved-listings/`
- appending CSV rows with UTF-8 BOM, CRLF line endings, and RFC 4180-style quoting
- detecting mismatched CSV headers before append

## Loading In Microsoft Edge

1. Open `edge://extensions/`.
2. Turn on Developer mode.
3. Choose **Load unpacked**.
4. Select this folder:

   ```text
   C:\dev\JobCaptureExtension\spikes\dc002-filesystem-access\extension
   ```

5. Open the extension details.
6. Open **Extension options**.
7. Use the buttons on the page to run each test.
[job-tracking.csv](..%2F..%2F..%2F..%2Fdoc%2FQuixote%2FJobLogCaptured%2Fjob-tracking.csv)
## Recommended Test Sequence

1. Confirm **API available** shows `Yes`.
2. Click **Select Project Folder** and choose a temporary test project folder.
3. Click **Check Permission**.
4. Click **Run All Write Tests**.
5. Confirm the selected folder contains:

   ```text
   job-tracking.csv
   saved-listings/
     sample-listing-*.json
   ```

6. Reload the options page and click **Check Permission**.
7. Reload the extension from `edge://extensions/`, reopen options, and click **Check Permission**.
8. Restart Edge, reopen options, and click **Check Permission**.
9. If permission is not `granted`, click **Request Permission** and record whether Edge allows re-grant from this page.
10. Edit `job-tracking.csv` so the header is intentionally wrong, then click **Append CSV Row** and confirm append is blocked.

## Notes

This spike is intentionally not the production extension. It does not capture LinkedIn pages and does not implement the real review UI.
