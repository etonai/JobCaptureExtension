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
- prior company warning after capture when the company already appears in `old-tracking.txt` or `job-tracking.csv`; when a company appears in both, `job-tracking.csv` (entry count and most recent capture date) is shown, since it is more actionable than the dateless `old-tracking.txt` entry
- popup recent-postings summary for visible LinkedIn listings posted within a user-configurable age (`2 hours or less` by default, or `1 hour or less` / `less than 1 hour` from Options); rows sourced from a results-list card are prefixed with the card's position in the left-hand list (e.g. `5 Armada`)
- popup "Open Job Search" action that navigates the active tab to the first page of a user-configured LinkedIn search (keywords + geoId), built from stable URL parameters only
- every "Open Job Search" / "Open Premium Job Search" press appends a search-tracking.csv row with postsSeen = 25, recentPostings = 0, the configured freshness label, and exactMatches = UNKNOWN; older two-, three-, and five-column files migrate in place, with historical exact-match values backfilled to UNKNOWN
- popup "Next Page" action that advances the active LinkedIn results tab by 25 results in place, working identically on generic and premium search surfaces, with the button label showing the destination results number (e.g. `Next Page (results 25+)`); it also updates the most recent `search-tracking.csv` row's `postsSeen` to that same destination results number, best-effort and non-blocking
- Recent Postings scans update a durable per-search running total in search-tracking.csv; rescanning replaces the current page count, while "Next Page" commits that count before starting the next page at zero
- persistent `host_permissions` grant for `https://www.linkedin.com/*`, so script injection works immediately after the extension's own "Open Job Search" / "Open Premium Job Search" / "Next Page" navigations without requiring the popup to be closed and reopened
- DevCycle030's "Capture Page" button, for job listings on arbitrary (non-LinkedIn) career pages — see "Capture Page (Non-LinkedIn Listings)" below

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
  search-tracking.csv
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

The popup's "Recent Postings" heading shows the active choice next to the title using compact notation — `<= 2hr`, `<= 1hr`, or `< 1hr` — so the current filter is visible without opening Options. It is set from the same `getRecentPostingsAgeConfig()` lookup used to run the scan, so it always matches the postings actually shown.

Each popup scan also highlights the matching cards in LinkedIn's left-hand results list with a green edge, outline, and light green tint. The scan removes its previous markers before applying the current filter, so changing the age choice or rescanning updated results does not leave stale highlights. Highlights are temporary page styling only: they do not change captured data, and LinkedIn may remove them if it re-renders a card until the next popup scan.

## Job Search Shortcut

Options has a Job Search panel with `Keywords` and `geoId` fields, stored in `chrome.storage.local` and restored when Options reopens. `geoId` is a LinkedIn location identifier copied from a search results URL and stored verbatim; it is never transformed. Defaults are seeded to `Software Engineer` / `90000091` so the feature works immediately without configuration.

The popup has two buttons side by side that share this configuration:

- **Open Job Search** builds a search-results URL from only the parameters that determine the results (`keywords`, `geoId`, `f_TPR=r86400` for a 24-hour window) and navigates the active tab to it in place. It intentionally omits LinkedIn's tracking and context parameters (`origin`, `originToLandingJobPostings`, `referralSearchId`, `lipi`, `currentJobId`, `showHowYouFit`, `start`), which are unnecessary for reproducing the search and, in the case of `originToLandingJobPostings`, rotate on every page view.
- **Open Premium Job Search** builds the same URL plus `origin=QUALIFICATION_LANDING` and the cosmetic `showHowYouFit=HOW_YOU_FIT`, aiming to reproduce LinkedIn's "Show All" premium/top-applicant surface. It still omits the rotating `originToLandingJobPostings` job-ID set and the per-session `referralSearchId`/`lipi` tokens, since the extension cannot legitimately fabricate those; whether `origin=QUALIFICATION_LANDING` alone is sufficient to reach the premium surface is a live-verification result, not a guarantee.

Both buttons navigate the active tab in place (via `chrome.tabs.update`) rather than opening a new tab, so repeated clicks reuse the same tab instead of accumulating new ones. If keywords or `geoId` are blank, either button shows a status message and opens Options instead of navigating to a broken search.

## Next Page Button

The popup's "Next Page" button advances the active LinkedIn results tab by one page (25 results) in place, by reading the tab's current URL and incrementing its `start` query parameter — the only parameter LinkedIn uses for pagination. Because it only rewrites `start` and preserves every other parameter, it works identically whether the tab came from "Open Job Search" (generic), "Open Premium Job Search" (premium), or any other LinkedIn `jobs/search-results` page: page 1 (no `start`) advances to `start=25`, `start=25` advances to `start=50`, and so on. `currentJobId` is dropped on advance so LinkedIn selects the first card of the new page rather than reopening a stale detail pane.

The button's own label shows the results number it will jump to, e.g. `Next Page (results 25+)` on the first page (no `start` in the URL, treated as `0`) or `Next Page (results 50+)` once the tab is at `start=25`. This label is refreshed whenever the active tab's `start` is known: when the popup opens, whenever the Recent Postings panel is scanned (automatically on open or via its refresh button), and immediately after a "Next Page" click. On a tab that is not a recognized LinkedIn search-results page, the button falls back to the plain "Next Page" label with no results number.

If the active tab is not a LinkedIn search-results page, the button shows a status message and does not navigate. After advancing, wait for the new page to finish loading, then click the Recent Postings refresh button (see below) to rescan — "Next Page" does not auto-rescan, since the tab navigation is asynchronous and the new page has not loaded when the button returns. LinkedIn's result list is capped at roughly 1000 results (~40 pages); past that point the list is simply empty.

## Recent Postings Refresh

The Recent Postings header has a small refresh button next to the count badge. Clicking it re-runs the same scan that runs automatically when the popup opens, updating the list, count, on-page highlights, and the most recent search-tracking.csv row.

The CSV's recentPostings value is a running total across result pages. Rescanning the same page replaces that page's count instead of adding it again. "Next Page" commits the current page count into the prior-pages subtotal, resets the current page to zero, and then navigation continues. The accounting state is retained in chrome.storage.session, including the LinkedIn start value, so closing and reopening the popup does not double-count the current page. Each row update also refreshes freshness from the current Options setting.

Listings with an unresolved company (`companySource: 'missing'`, shown in the popup list as "Unknown company") are excluded from the recentPostings count — every Unknown-company listing observed so far has turned out to be a capture bug rather than a real posting, so it should not inflate the running total. These listings still appear in the popup's Recent Postings list and count toward the displayed "N recent postings found" number; only the CSV running total excludes them.

### LinkedIn Exact-Match Boundary

During the same scan, the extension looks for LinkedIn's message that it has begun showing related results that may not be exact matches. Detection is scoped to a results container that also owns recognized job cards; matching text elsewhere on the page is ignored. When detected, a persistent non-modal warning appears in the popup for the active search. Starting a new generic or premium search clears the warning.

`search-tracking.csv` includes an `exactMatches` column. It starts as `UNKNOWN` and becomes the number of all result cards before LinkedIn's boundary, independent of the Recent Postings age filter and company resolution. A numeric count is written only when all preceding pages were scanned continuously. If the boundary is spotted after a page was skipped, the popup still warns the user but the CSV remains `UNKNOWN`. The first confident boundary count wins for the search; later rescans cannot change it.

The user-triggered Refresh, Open Job Search, Open Premium Job Search, and Next Page actions prepare project-folder write permission before their asynchronous work and persist the applicable six-column tracking state. Automatic popup-open scans remain non-prompting. If a user-triggered write is skipped or fails, the popup reports the failure; lock-like failures also tell the user to close `search-tracking.csv` in Excel or another program before retrying.

`updateLastSearchTrackingRow` never calls `requestPermission()`: it only checks whether readwrite permission is already granted and silently skips the CSV write otherwise, because these updates run from the automatic popup-open scan and other paths without a fresh user gesture, and the File System Access API throws a `DOMException` if `requestPermission()` is called without one. A skipped update is not lost — the in-memory/session running total is still correct, and the next update that runs while permission is granted persists the current total.

## Capture Page (Non-LinkedIn Listings)

The **Capture Page** button, directly below **Capture Active Tab**, captures a job listing from any page — not just LinkedIn. It injects `captureGenericPage()` (`extension/content/captureActivePage.js`), which never gates on being "supported": it always returns a result and does its best with generic signals (the `<title>` element, a "Label" line immediately followed by a "Value" line for sidebar-style metadata such as `Company` / `Office location` / `Employment type`, and a `$X - $Y` salary pattern found anywhere in the body text). It was built and hand-verified against `doc/examples/Stripe Careers _ Software Engineer, Product Security Data Platforms.mhtml`.

Every field it can't confidently resolve is set to the literal string `UNKNOWN` rather than left blank — expect that to be the common case for most fields beyond `company`/`title`/`description` on many pages, since generic parsing is inherently far less reliable than the LinkedIn-specific parser. `applyType` is always `DIRECT`.

`company` is a special case. If it can't be resolved, the content script leaves it as an empty string, and the popup fills in a numbered placeholder, `NNNU_UNKNOWN` (e.g. `001U_UNKNOWN`), by calling `getNextUnknownCompanyPlaceholder()` (`extension/shared/saveListing.js`), which reads `job-tracking.csv`'s `company` column and returns one past the highest existing `NNNU_` prefix — matching on that prefix alone, never on a trailing `UNKNOWN`, so a placeholder the user has since manually renamed to `NNNU_COMPANYNAME` still counts toward the next number. Since `company` is also the leading segment of the saved-listing filename, the placeholder becomes the start of the `.json`/`.txt`/`.md` filenames too, letting the user find and rename the right listing later.

Saving a "Capture Page" result uses the same "Save Capture" pipeline as a LinkedIn capture: JSON + `.txt` + `.md` files in `saved-listings/`, plus a row appended to `job-tracking.csv` — not the CSV-only `other-listings.csv` path used by "Record Listing".

## Permissions

The manifest requests `activeTab`, `scripting`, and `storage`, plus a persistent `host_permissions` grant for `https://www.linkedin.com/*`. The host permission exists because `activeTab`'s temporary access grant is tied to a user gesture on the extension's action (e.g. opening the popup) and does not survive the extension navigating the tab itself: clicking "Open Job Search", "Open Premium Job Search", or "Next Page" calls `chrome.tabs.update` to change the active tab's URL, which invalidates any `activeTab` grant from that popup session. Without a standing host permission, a same-session click of the Recent Postings refresh button after one of those navigations would fail with `Cannot access contents of the page. Extension manifest must request permission to access the respective host.`, since refreshing inside an already-open popup is not itself a fresh action-invocation gesture. `host_permissions` for `www.linkedin.com` removes that dependency for the one host the extension actually operates on.

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
node --check extension/shared/recentPostingsTracking.js
node --check extension/shared/jobSearchSettings.js
node --check extension/shared/searchUrlBuilder.js
node --check extension/shared/pagingUrl.js
node --check extension/shared/saveListing.js
node extension/tests/captureActivePage.smoke.test.mjs
node extension/tests/persistence.test.mjs
node extension/tests/popup.module.smoke.test.mjs
node extension/tests/searchUrlBuilder.test.mjs
node extension/tests/pagingUrl.test.mjs
```

## Notes

The user should manually expand collapsed LinkedIn job descriptions before capture. The extension does not click LinkedIn expansion controls in the MVP.

