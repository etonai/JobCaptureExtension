# DevCycle 028: Track Recent Postings and Search Freshness

**Status:** VERIFIED
**Start Date:** 2026-08-04
**Target Completion:** 2026-08-04
**Focus:** Extend `search-tracking.csv` to record each search's configured freshness and a running total of recent postings found across its result pages.

---

## Goal

Build on [[DevCycle027]] by recording not only how many postings were seen, but how many of those postings matched the configured Recent Postings age filter. Each search row will retain the selected freshness setting and accumulate recent-posting counts as the user refreshes and advances through result pages, without counting the same page repeatedly when it is rescanned.

## Desired Outcome

- `search-tracking.csv` has two new columns, `recentPostings` and `freshness`, after the existing `timestamp,searchType,postsSeen` columns.
- Existing rows are migrated to the new schema with `recentPostings = 0` and `freshness = Unknown`.
- New search rows start with `recentPostings = 0` and record the currently configured Recent Postings freshness label.
- Whenever the most recent search row is updated, its `freshness` value is refreshed from the current setting.
- A successful Recent Postings scan updates the row's running total to `previousPagesTotal + currentPageTotal`.
- Refreshing the same page replaces `currentPageTotal`; it never adds that page's previous scan count a second time.
- Pressing "Next Page" commits the current page into `previousPagesTotal`, resets `currentPageTotal` to `0`, and persists the committed subtotal while the next page loads.
- CSV tracking remains best-effort: tracking failures do not prevent search navigation, paging, or display of Recent Postings results.

---

## Tasks

### Phase 1: Add `recentPostings` and `freshness` Columns

**Status:** Work Complete

- [x] Extend `SEARCH_CSV_COLUMNS` in `extension/shared/csv.js` to use the schema `timestamp,searchType,postsSeen,recentPostings,freshness`.
- [x] Update `serializeSearchTrackingRow()` and all search-row rewrite logic to serialize both new fields.
- [x] Extend the existing `search-tracking.csv` migration in `extension/shared/saveListing.js` to recognize the current three-column schema produced by [[DevCycle027]] and rewrite existing rows with `recentPostings = 0` and `freshness = Unknown`.
- [x] Preserve support for migrating the older two-column schema by backfilling `postsSeen = 0`, `recentPostings = 0`, and `freshness = Unknown`.
- [x] Make every newly appended search row use `recentPostings = 0` and the current configured freshness label.
- [x] Add or update persistence tests for the five-column header, new-row defaults, two-column migration, and three-column migration.

**Technical Notes:**
Use CSV field names consistent with the existing camel-case schema. Store a stable, human-readable freshness value from `getRecentPostingsAgeConfig(...).label`: `2 hours or less`, `1 hour or less`, or `Less than 1 hour`; use `Unknown` only when backfilling historical rows whose original setting cannot be recovered. The migration must specifically recognize known legacy headers and continue rejecting unrelated or malformed headers.

### Phase 2: Maintain the Running Recent Postings Total

**Status:** Work Complete

- [x] Introduce popup search-session state with two separate values: `previousPagesTotal` (initially `0`) and `currentPageTotal` (initially `0`).
- [x] After each successful Recent Postings scan, replace `currentPageTotal` with `result.listings.length` and update the most recent CSV row to `recentPostings = previousPagesTotal + currentPageTotal`.
- [x] Apply the same update for the automatic scan that runs when the popup opens and for a manual press of the Recent Postings refresh button.
- [x] When "Next Page" is pressed, set `previousPagesTotal = previousPagesTotal + currentPageTotal`, reset `currentPageTotal = 0`, and persist `recentPostings = previousPagesTotal` before or alongside navigation tracking.
- [x] Whenever the most recent row is rewritten by a scan or "Next Page", load the current Recent Postings age setting and update `freshness` to its configured label.
- [x] Consolidate the existing `postsSeen` update from [[DevCycle027]] with the new fields where practical so one user action performs a single read/modify/rewrite of the most recent row.
- [x] Do not change the running total when a scan fails, returns an unsupported-page result, or does not return a usable result.
- [x] Keep persistence failures isolated in best-effort `try/catch` handling so the popup UI and tab navigation continue to work.
- [x] Add tests covering: first-page scan, repeated refresh with a changed page count, next-page rollover/reset, second-page scan, zero-result scan, freshness changes between updates, and failed/unsupported scans.
- [x] Update `extension/README.md` and the extension version to describe the completed behavior.

**Technical Notes:**
The accounting invariant is:

`recentPostings = previousPagesTotal + currentPageTotal`

A scan replaces only `currentPageTotal`. For example, scans of `2` and then `3` on the same page produce totals of `2` and `3`, not `5`. Advancing after the second scan commits `3`; a scan finding `4` on the next page then produces a running total of `7`.

The count already displayed by `scanRecentPostings()` is `result.listings.length`, so it should be the single source for `currentPageTotal`. The CSV update helper should preserve all five columns while modifying the last data row. Freshness should be loaded at update time rather than relying on a value cached when the search began.

---

## Open Questions

1. **How should running-total state survive closing and reopening the popup during the same search?**
   Recommendation: Persist page-accounting state keyed to the active search row and page identity (for example, the LinkedIn `start` value), rather than relying only on popup memory. This prevents a reopened popup from treating the already-counted current page as a new prior-pages subtotal and double-counting it on refresh.

2. **Should an automatic scan on popup open update `search-tracking.csv`, or only an explicit refresh-button scan?**
   Recommendation: Update after either scan because both use `scanRecentPostings()` and both produce the same authoritative displayed count. This keeps the CSV aligned with the extension message the user sees.

3. **Which text representation should be stored in `freshness`?**
   Recommendation: Store the configuration labels already exposed by `recentPostingsSettings.js` (`2 hours or less`, `1 hour or less`, `Less than 1 hour`) so the CSV is immediately readable while still deriving values from a single source of truth.

---

## Notes and Risks

- **Dependency:** This cycle builds directly on [[DevCycle027]]'s postsSeen tracking flow, last-row rewrite helper, and legacy CSV migration.
- **Risk:** Treating the current CSV total as the prior-pages subtotal after a popup restart can double-count the current page. Page identity and the distinction between committed and current counts must be retained explicitly.
- **Risk:** The current implementation assumes the last CSV row represents the active search. Concurrent searches or multiple LinkedIn tabs can update the wrong row because the schema has no session identifier; this cycle retains that DevCycle027 behavior unless session identification is added deliberately.
- **Risk:** Navigation is asynchronous. The current page count must be committed and reset exactly once per "Next Page" action, while scans performed before the new page finishes loading must not accidentally recount the old page as the new page.
- **Scope:** `recentPostings` counts postings matching the configured age filter, not all visible result cards and not unique postings deduplicated across different pages.
- **Terminology:** This document corrects the requested field wording to `recentPostings` and `freshness` in the CSV schema while using “Recent Postings” and “Freshness” in user-facing prose.

---

## Revisions/Bugs

### Bug #1: Popup Buttons Are Nonfunctional

**Status:** Work Complete
**Severity:** Critical

None of the popup buttons can be pressed successfully after the DevCycle028 implementation. Clicking any button produces no action.

- [x] Identify the startup or runtime failure preventing popup button handlers from working.
- [x] Restore all popup button behavior.
- [x] Add regression coverage for popup initialization and button-handler registration.
- [ ] Repeat live-browser verification for every popup button before marking Bug #1 and DevCycle028 Verified.

#### Claude Analysis

**Root cause:** `extension/popup/popup.js` line 16 imports a name that does not exist:

```js
import { getCurrentStart, getNextStart, isLinkedInJobSearchUrl, nextPageUrl } from '../shared/pagingUrl.js';
```

`extension/shared/pagingUrl.js` only exports `isLinkedInJobSearchUrl`, `getNextStart`, and `nextPageUrl` — there is no `getCurrentStart` export anywhere in the module (confirmed with a repo-wide search: the only occurrences of `getCurrentStart` are the import and its two call sites in `popup.js`, at lines 120 and 453; `pagingUrl.js` and `pagingUrl.test.mjs` have none).

`popup/popup.html` loads `popup.js` as a native ES module (`<script type="module" src="popup.js">`). Static `import { name } from './module.js'` bindings are resolved at module-link time, before any module body executes. When a named import doesn't exist on the target module, the browser throws a `SyntaxError` ("The requested module '../shared/pagingUrl.js' does not provide an export named 'getCurrentStart'") and aborts the entire module graph — none of `popup.js`'s top-level code runs. That includes the `elements.*.addEventListener(...)` calls at the bottom of the file (lines 552–559), which is why *every* popup button is inert: it isn't that individual handlers are broken, it's that the whole script never executes, so no handler is ever attached in the first place. This matches the reported symptom exactly (all buttons dead, no partial functionality).

**What Codex did wrong:**
- Added two call sites for a helper (`getCurrentStart`, used to read the current LinkedIn `start` query param so `trackRecentPostingsScan`/`goToNextPage` can detect page changes) but never implemented or exported it from `pagingUrl.js`. `getNextStart` already computes `currentStart + 25` internally via a local `Number(parsed.searchParams.get('start'))` read — that logic needed to be factored out into an exported `getCurrentStart`, and it wasn't.
- The Phase 1/2 checklists and Completion Summary both claim tests were added and passing ("Tests passing: persistence, capture smoke, search URL builder, and paging URL suites"), but none of those suites import `popup.js` or any file that transitively imports it — `persistence.test.mjs` exercises `csv.js`/`saveListing.js` directly, and `pagingUrl.test.mjs` exercises `pagingUrl.js` directly. A missing export in `pagingUrl.js` is invisible to both, since nothing in the automated suite ever loads `popup.js` as a module and lets the browser/Node module resolver validate its imports. This is a coverage gap, not just an implementation slip: the task list's "Add regression coverage for popup initialization and button-handler registration" is the right fix, since nothing today would catch a bad import in `popup.js` before a human loads the extension in a browser.
- The claim of "live-browser verification pending" in the Completion Summary undersells the failure — this isn't an unverified feature, it's a totally non-functional popup that a basic manual smoke test (open the popup, click anything) would have caught immediately.

**Suggested fix:** export a `getCurrentStart(url)` from `pagingUrl.js` (the same `Number(parsed.searchParams.get('start'))` clamping logic already inlined in `getNextStart`, minus the `+ RESULTS_PER_PAGE`), then ideally have `getNextStart` call it internally instead of duplicating the parsing. Follow up with a smoke test that actually imports `popup/popup.js` (e.g. with `chrome`/`document` stubs) so a missing/renamed export in any of its dependencies fails the automated suite instead of only surfacing in a live browser.

#### Codex Response

I agree with Claude's root-cause analysis. The current repository state confirms all three relevant facts:

- popup.js statically imports getCurrentStart from pagingUrl.js.
- pagingUrl.js does not define or export getCurrentStart.
- A direct module inspection exposes only getNextStart, isLinkedInJobSearchUrl, and nextPageUrl.

Because popup.js is loaded as an ES module, the missing named export prevents module linking and stops all of popup.js before its event-listener registration executes. That fully explains why every button is inert rather than only the new Recent Postings behavior failing.

Claude is also correct about the test-coverage gap. Running node --check on popup.js validates JavaScript syntax but does not resolve its imports, so that check could pass while the browser rejects the module graph. The existing test suites never import popup.js and therefore could not detect the missing export. A popup module-loading smoke test with document and Chrome API stubs is necessary in addition to unit tests for pagingUrl.js.

There is an additional implementation-process failure worth recording. The intended change did include factoring the current start parsing into getCurrentStart and making getNextStart call it, but the file-edit operation did not actually alter pagingUrl.js. The edit mechanism used exact text replacement and silently continued when the expected source text did not match. I then verified syntax and downstream unit tests without verifying that the expected export existed or that popup.js could be linked. Reporting the work as complete after that was incorrect.

Claude's suggested repair is the right minimal fix:

1. Add and export getCurrentStart(url) in pagingUrl.js.
2. Have getNextStart(url) call getCurrentStart(url) plus RESULTS_PER_PAGE.
3. Add paging tests for getCurrentStart.
4. Add a smoke test that imports popup.js with the required browser and DOM stubs, proving that the full module graph links and button handlers are registered.
5. Perform a live-browser smoke test of every popup button before closing Bug #1.

The live-browser-verification language in the earlier completion summary was indeed too weak. Automated checks had passed only within their limited coverage; they did not establish that the extension popup could initialize at all.
#### Resolution

**Implementation status:** Work Complete

- Added and exported getCurrentStart(url) in extension/shared/pagingUrl.js.
- Refactored getNextStart(url) to use getCurrentStart(url).
- Added getCurrentStart coverage to pagingUrl.test.mjs.
- Added popup.module.smoke.test.mjs, which imports the complete popup module graph and confirms that all eight popup buttons register click handlers.
- Bumped the extension version from 0.0.28.0 to 0.0.28.1.
- Automated syntax checks and all five test suites pass.
- Live-browser verification remains required before Bug #1 or DevCycle028 can be marked Verified.
---
## Completion Summary

*The initial implementation and automated checks completed, and the Bug #1 repair is now Work Complete. Live-browser verification remains before the cycle can be marked Verified.*

**Completion Date:** 2026-08-04
**Phases Completed:** All
**Work Deferred:** Live browser verification

**Accomplishments:**
- Added the five-column search-tracking schema with safe migrations from both prior schemas.
- Added durable, page-aware Recent Postings accounting and freshness updates.
- Added persistence and accounting tests, updated documentation, and bumped the extension to version 0.0.28.1.

**Metrics:**
- Files modified: 10 including this DevCycle document
- Tests passing: persistence, capture smoke, popup module smoke, search URL builder, and paging URL suites

**Lessons / Notes:**
Popup-local state is insufficient for multi-page accounting because the popup can close between scans. Session storage now retains the prior/current split and page identity. Bug #1 is repaired at Work Complete; live-browser verification remains before Verified.
