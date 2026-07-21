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
- sibling description-only `.txt` and readable `.md` writes into `saved-listings/`
- `job-tracking.csv` creation/header validation/append
- unsupported-page, save-success, save-error, and partial-success states
- user-entered notes saved to JSON and the CSV `notes` column
- prior company warning after capture when the company already appears in `old-tracking.txt` or `job-tracking.csv`
- popup recent-postings summary for visible LinkedIn listings posted within a user-configurable age (`2 hours or less` by default, or `1 hour or less` / `less than 1 hour` from Options); rows sourced from a results-list card are prefixed with the card's position in the left-hand list (e.g. `5 Armada`)
- popup "Open Job Search" action that opens the first page of a user-configured LinkedIn search (keywords + geoId) in a new tab, built from stable URL parameters only
- popup "Next Page" action that advances the active LinkedIn results tab by 25 results in place, working identically on generic and premium search surfaces
- Recent Postings header refresh button that re-runs the postings scan on demand, so the list can be updated after "Next Page" without closing and reopening the popup

It does not implement the final editable review UI. The Save action writes the current captured parser result; DevCycle006 will add richer field editing before save.

## Source Layout

```text
extension/
  manifest.json
  background/
    background.js
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
    priorCompanyCache.js
    recentPostingsSettings.js
    jobSearchSettings.js
    searchUrlBuilder.js
    pagingUrl.js
    saveListing.js
  tests/
    captureActivePage.smoke.test.mjs
    persistence.test.mjs
    searchUrlBuilder.test.mjs
    pagingUrl.test.mjs
  PARSER_NOTES.md
```

`background/background.js` owns shortcut command handling and shortcut-initiated capture/check completion before notifying the popup. `popup/popup.js` owns popup state, manual active-tab injection, shortcut result consumption, and minimal Save orchestration. Shared modules own CSV serialization, filename generation, project folder handle storage, and JSON/TXT/MD/CSV writes.

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
7. Open a LinkedIn job page, capture, review any prior-company warning, optionally enter notes, then save.
## Keyboard Shortcut

Default shortcut:

- `Alt+Shift+L`: open the LinkedIn Job Capture popup and immediately capture the active tab.

The shortcut can be reviewed or changed in Edge at:

```text
edge://extensions/shortcuts
```

## Project Folder Layout

```text
Job Search Project/
  job-tracking.csv
  old-tracking.txt
  saved-listings/
    starbucks_2026-07-05_software-engineer-sr_123456789.json
    starbucks_2026-07-05_software-engineer-sr_123456789.txt
    starbucks_2026-07-05_software-engineer-sr_123456789.md
```

The CSV uses the locked first-version schema from `doc/planning/ExtensionDesign.md`. User-entered popup notes are saved into the existing `notes` column. Optional `old-tracking.txt` can contain one company per non-empty line for companies applied to before this extension. After capture, the extension checks `old-tracking.txt` first, then existing CSV rows, and warns when the captured company has appeared before. Options validation refreshes a local prior-company cache so shortcut captures can show this warning even when the browser will not allow a filesystem permission prompt from the shortcut-opened popup. Existing CSV files with mismatched headers block CSV append, but the JSON listing, description text file, and description Markdown file remain saved when possible.

## Recent Postings Age Filter

Options has a Recent Postings panel with three mutually exclusive age choices, stored in `chrome.storage.local` and restored when Options reopens:

- `2 hours or less` (default) — includes minute-based postings, `1 hour ago`, and `2 hours ago`
- `1 hour or less` — includes minute-based postings and `1 hour ago`, excludes anything older
- `Less than 1 hour` — includes minute-based postings through `59 minutes ago`, excludes `1 hour ago` and older

The popup reads the saved choice before each scan and passes it into the injected `captureRecentJobPostings` function as an argument (`{ maxAgeMinutes, inclusive }`), since the injected function cannot read module-scope settings. A missing or unrecognized stored value, or a storage read failure, falls back to `2 hours or less`. This only changes which postings appear in the popup's Recent Postings list — it does not change the `postedText` captured or saved for an individual job.

Each popup scan also highlights the matching cards in LinkedIn's left-hand results list with a green edge, outline, and light green tint. The scan removes its previous markers before applying the current filter, so changing the age choice or rescanning updated results does not leave stale highlights. Highlights are temporary page styling only: they do not change captured data, and LinkedIn may remove them if it re-renders a card until the next popup scan.

## Job Search Shortcut

Options has a Job Search panel with `Keywords` and `geoId` fields, stored in `chrome.storage.local` and restored when Options reopens. `geoId` is a LinkedIn location identifier copied from a search results URL and stored verbatim; it is never transformed. Defaults are seeded to `Software Engineer` / `90000091` so the feature works immediately without configuration.

The popup has two buttons side by side that share this configuration:

- **Open Job Search** builds a search-results URL from only the parameters that determine the results (`keywords`, `geoId`, `f_TPR=r86400` for a 24-hour window) and opens it in a new tab. It intentionally omits LinkedIn's tracking and context parameters (`origin`, `originToLandingJobPostings`, `referralSearchId`, `lipi`, `currentJobId`, `showHowYouFit`, `start`), which are unnecessary for reproducing the search and, in the case of `originToLandingJobPostings`, rotate on every page view.
- **Open Premium Job Search** builds the same URL plus `origin=QUALIFICATION_LANDING` and the cosmetic `showHowYouFit=HOW_YOU_FIT`, aiming to reproduce LinkedIn's "Show All" premium/top-applicant surface. It still omits the rotating `originToLandingJobPostings` job-ID set and the per-session `referralSearchId`/`lipi` tokens, since the extension cannot legitimately fabricate those; whether `origin=QUALIFICATION_LANDING` alone is sufficient to reach the premium surface is a live-verification result, not a guarantee.

If keywords or `geoId` are blank, either button shows a status message and opens Options instead of navigating to a broken search.

## Next Page Button

The popup's "Next Page" button advances the active LinkedIn results tab by one page (25 results) in place, by reading the tab's current URL and incrementing its `start` query parameter — the only parameter LinkedIn uses for pagination. Because it only rewrites `start` and preserves every other parameter, it works identically whether the tab came from "Open Job Search" (generic), "Open Premium Job Search" (premium), or any other LinkedIn `jobs/search-results` page: page 1 (no `start`) advances to `start=25`, `start=25` advances to `start=50`, and so on. `currentJobId` is dropped on advance so LinkedIn selects the first card of the new page rather than reopening a stale detail pane.

If the active tab is not a LinkedIn search-results page, the button shows a status message and does not navigate. After advancing, wait for the new page to finish loading, then click the Recent Postings refresh button (see below) to rescan — "Next Page" does not auto-rescan, since the tab navigation is asynchronous and the new page has not loaded when the button returns. LinkedIn's result list is capped at roughly 1000 results (~40 pages); past that point the list is simply empty.

## Recent Postings Refresh

The Recent Postings header has a small "↻" refresh button next to the count badge. Clicking it re-runs the same scan that runs automatically when the popup opens (`scanRecentPostings`), updating the list, count, and on-page highlights against whatever the active tab currently shows. This exists specifically to recover from the staleness "Next Page" introduces: after advancing to a new results page, the Recent Postings panel still reflects the old page until either the popup is closed and reopened or refresh is clicked. The button disables itself while a scan is in flight so repeated clicks cannot start overlapping scans.

## Local Checks

Run from the repository root:

```powershell
node --check extension/content/captureActivePage.js
node --check extension/background/background.js
node --check extension/popup/popup.js
node --check extension/options/options.js
node --check extension/shared/csv.js
node --check extension/shared/filename.js
node --check extension/shared/projectFolderStore.js
node --check extension/shared/priorCompanyCache.js
node --check extension/shared/recentPostingsSettings.js
node --check extension/shared/jobSearchSettings.js
node --check extension/shared/searchUrlBuilder.js
node --check extension/shared/pagingUrl.js
node --check extension/shared/saveListing.js
node extension/tests/captureActivePage.smoke.test.mjs
node extension/tests/persistence.test.mjs
node extension/tests/searchUrlBuilder.test.mjs
node extension/tests/pagingUrl.test.mjs
```

## Notes

The user should manually expand collapsed LinkedIn job descriptions before capture. The extension does not click LinkedIn expansion controls in the MVP.

