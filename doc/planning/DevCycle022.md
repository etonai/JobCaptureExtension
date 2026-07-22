# DevCycle 022: Show Start # on the Next Page Button

**Status:** VERIFIED
**Start Date:** 2026-07-22
**Target Completion:** 2026-07-22
**Focus:** Display the results-# the "Next Page" button will jump *to* — the current `start` (defaulting to `0`) plus 25 — in the button's own label.

---

## Goal

DC19 introduced the "Next Page" button, which reads the `start` query parameter from the active LinkedIn job-search tab's URL and navigates to `start + 25`. Today the button's label is a static "Next Page" — the user has no way to tell, at a glance, which results page they are about to jump to. LinkedIn's first page of results does not include a `start` param in the URL at all, which is a common point of confusion: the absence of the param means `start=0`, not "unknown."

This cycle updates the popup UI so the "Next Page" button label shows the destination results number: current `start` (or `0` if absent) plus 25.

## Desired Outcome

- When the active tab is a LinkedIn job-search results page, the "Next Page" button reads `Next Page (results 25+)` on the first page (current start `0` + 25), `Next Page (results 50+)` after one click (current start `25` + 25), and so on.
- A URL with no `start` param (LinkedIn's first-page convention) is treated as `start=0`, so the label reads `results 25+`, not blank or `NaN`.
- The displayed value updates whenever the popup is opened/reopened on a job-search tab (matching current behavior where the popup re-reads tab state on open), after `goToNextPage()` navigates the tab, and whenever the Recent Postings panel is (re)scanned via `scanRecentPostings()` — since a recent-postings refresh is the user's existing signal that the page state may have changed (DC20).
- When the active tab is not a recognized LinkedIn job-search URL, the button falls back to a sensible default label (e.g. plain "Next Page", no results number) rather than showing a stale or misleading number.
- No change to the actual paging behavior — `nextPageUrl()`'s navigation logic is untouched; the label is purely additive display logic that mirrors the same `+25` computation.

---

## Tasks

### Phase 1: Extract/Reuse Next-Start-Number Parsing

**Status:** Work Complete

- [x] In `extension/shared/pagingUrl.js`, review `nextPageUrl()`'s existing start-parsing logic (`Number(parsed.searchParams.get('start'))`, defaulting to `0` when absent/invalid, then `+ RESULTS_PER_PAGE`) and factor the "next start" computation out into a small exported helper, e.g. `getNextStart(url)`, returning `current start (defaulted to 0) + 25`. `nextPageUrl()` itself should call this helper rather than duplicate the arithmetic.
- [x] Add/extend unit coverage in `extension/tests/pagingUrl.test.mjs` for the new helper: no `start` param → `25`; `start=25` → `50`; malformed/negative `start` → `25` (matching `nextPageUrl`'s existing fallback rule).

**Technical Notes:**
Current logic lives in `nextPageUrl()` (`extension/shared/pagingUrl.js:13-16`):
```js
const currentStart = Number(parsed.searchParams.get('start'));
const nextStart = (Number.isFinite(currentStart) && currentStart > 0 ? currentStart : 0) + RESULTS_PER_PAGE;
```
Extracting this as its own function (`getNextStart`) lets both `nextPageUrl()` and the new popup display logic share one source of truth for "what results # does Next Page jump to."

### Phase 2: Display Destination Results # on the Popup Button

**Status:** Work Complete

- [x] In `extension/popup/popup.js`, add a function (`updateNextPageButtonLabel(tab)`) that checks `isLinkedInJobSearchUrl(tab.url)` and, if true, sets the button's label to `Next Page (results {getNextStart(tab.url)}+)`; otherwise resets it to the plain "Next Page" label.
- [x] Call it from `scanRecentPostings()`, using the `tab` it already fetches via `getActiveTab()` (`extension/popup/popup.js:103`), so the Next Page label stays in sync any time recent-postings data is refreshed — whether from the automatic scan on popup open (`extension/popup/popup.js:484`) or a manual click of the refresh button. This runs before the scan's own success/failure branches, so it applies regardless of scan outcome. Per the Technical Notes below, this single hook also covers the "popup open" case, since `scanRecentPostings()` already runs automatically on load — a separate explicit "on open" call was determined to be redundant and was not added.
- [x] Call it again after `goToNextPage()` successfully calls `chrome.tabs.update`, reusing the already-computed `{ url }` rather than a fresh tab read, so the label reflects the new destination immediately.
- [x] No `popup.html` structural change was needed — the label is set entirely via `textContent` in `popup.js`.

**Technical Notes:**
`goToNextPage()` (`extension/popup/popup.js`) already computes `url` via `nextPageUrl(tab.url)` before calling `chrome.tabs.update`. Passing `{ url }` into `updateNextPageButtonLabel` gives the label to show *after* this click (i.e., what the button should say the *next* click will jump to), without waiting for a fresh tab read.

`scanRecentPostings()` calls `const tab = await getActiveTab();` before injecting the postings-capture script; `updateNextPageButtonLabel(tab)` was added immediately after that line. Since `scanRecentPostings()` runs automatically on popup load and on manual refresh, this single hook site covers both the "popup opened" and "user refreshed recent postings" triggers, so no separate on-open call was added.

### Phase 3: Verification and Documentation

**Status:** Work Complete

- [x] Run `node --check extension/popup/popup.js` and `node --check extension/shared/pagingUrl.js`.
- [x] Run `node extension/tests/pagingUrl.test.mjs` and confirm new/updated cases pass (also re-ran `searchUrlBuilder.test.mjs`, `persistence.test.mjs`, `captureActivePage.smoke.test.mjs` — all pass unchanged).
- [ ] Manually verify on a live LinkedIn session: opening the popup on the first page of results (no `start` in URL) shows `Next Page (results 25+)`; clicking Next Page and reopening the popup shows `Next Page (results 50+)`, then `Next Page (results 75+)`, etc.
- [ ] Manually verify the fallback label on a non-job-search tab (e.g. a blank tab or LinkedIn homepage).
- [ ] Manually verify that clicking the Recent Postings refresh button updates the Next Page label if the tab's `start` has changed since the popup opened (e.g. the user navigated LinkedIn's own pagination controls directly, bypassing the extension's Next Page button).
- [x] Update `extension/README.md` to describe the new button label behavior.
- [x] Bump `extension/manifest.json` version (`0.0.21.0` → `0.0.22.0`) for reload verification.
- [x] Record results in the Completion Summary.

---

## Open Questions

1. **Should the label update immediately after clicking "Next Page" (optimistic, using the just-computed target URL), or only when the popup is reopened and re-reads the tab?**
   Recommendation: **update immediately using the computed target URL.** The popup already knows the exact URL it just navigated to (it built it before calling `chrome.tabs.update`), so deriving the next destination number from that URL and updating the label right away is free and avoids a stale label if the user doesn't close/reopen the popup. This matches the existing status message ("Advancing Page...") which already gives immediate feedback.

2. **Exact label format — inline in the button text, or a separate adjacent element?**
   Recommendation: **inline in the button text** (e.g. `Next Page (results 25+)`), consistent with this being a single existing button with no other UI chrome around it (`extension/popup/popup.html:36`). A separate element would need new layout/CSS for no real benefit at this scale.

---

## Notes and Risks

- **Shared parsing logic:** factoring the start-parsing rule out of `nextPageUrl()` keeps the "absent start = 0" convention defined in exactly one place, avoiding drift between the paging logic and the display logic.
- **Scope:** popup + shared paging module only. No background, content-script, or options changes expected.
- **Recent Postings hook:** tying the label refresh to `scanRecentPostings()` means the label also updates whenever the user manually navigates LinkedIn's own "Next" controls (outside the extension) and then hits the Recent Postings refresh button — which is useful, since that refresh is already the documented way (DC20) to resync the extension after a page change.
- **Small risk:** if the popup does not currently re-run any tab-dependent setup on open (e.g. state is static HTML until a button is clicked), Phase 2's "update on popup open" task may require adding a small initialization hook that doesn't exist today. Confirm current popup init flow before implementing.

---

## Completion Summary

*Implementation complete; awaiting live-browser verification before this cycle is marked `Verified` and moved to `completed/`.*

**Completion Date:** 2026-07-22
**Phases Completed:** Phase 1 and Phase 2 fully; Phase 3 implementation, automated checks, and documentation complete, live browser verification pending.
**Work Deferred:** None from this cycle's scope.

**Accomplishments:**
- Added `getNextStart(url)` to `extension/shared/pagingUrl.js`, factoring the "current start defaulted to 0, plus 25" computation out of `nextPageUrl()`, which now calls the new helper instead of duplicating the arithmetic.
- Added unit tests for `getNextStart` in `extension/tests/pagingUrl.test.mjs` (no `start` param, `start=25`, non-numeric, negative).
- Added `updateNextPageButtonLabel(tab)` to `extension/popup/popup.js`, which sets the "Next Page" button's `textContent` to `Next Page (results {getNextStart(tab.url)}+)` when the active tab is a recognized LinkedIn job-search URL, or the plain `Next Page` label otherwise.
- Wired `updateNextPageButtonLabel` into `scanRecentPostings()` (using the tab it already fetches) so the label refreshes on popup open and on every Recent Postings scan/refresh, and into `goToNextPage()` (using the already-computed target URL) so the label updates immediately after a click.
- Updated `extension/README.md`'s feature bullet and "Next Page Button" / "Recent Postings Refresh" sections to describe the new label behavior.
- Bumped `extension/manifest.json` to `0.0.22.0`.

**Metrics:**
- Files modified: 5 (`popup.js`, `pagingUrl.js`, `pagingUrl.test.mjs`, `README.md`, `manifest.json`) plus this DevCycle document

**Lessons / Notes:**
- Both `scanRecentPostings()` and `goToNextPage()` already fetched or computed the tab/URL they needed, so wiring in the label update required no new `getActiveTab()` calls.
- Hooking the label update into `scanRecentPostings()` (which already runs automatically on popup open) made a separate explicit "on popup open" call unnecessary, simplifying Phase 2 relative to the original plan.
- Live verification is still required: confirming the label shows the correct destination number across page transitions, the fallback label off a job-search page, and that the Recent Postings refresh path picks up an out-of-band `start` change (e.g. from LinkedIn's own pagination controls).
