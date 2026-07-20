# DevCycle 015: Configurable Recent Posting Age

**Status:** VERIFIED
**Start Date:** 2026-07-20
**Target Completion:** TBD
**Focus:** Let users choose the maximum posting age shown in the popup's Recent Postings list.

---

## Goal

DevCycle015 adds a setting that controls how fresh a LinkedIn posting must be to appear in the popup's Recent Postings list. The options page will offer three age filters: `2 hours or less`, `1 hour or less`, and `Less than 1 hour`.

The current two-hour behavior will remain the default so existing users see no change unless they choose a narrower filter. The saved setting should persist across browser sessions and affect subsequent Recent Postings scans without changing the full job-capture record.

## Desired Outcome

After this cycle is complete:

- the options page presents exactly three mutually exclusive Recent Postings age choices
- the choices are `2 hours or less`, `1 hour or less`, and `Less than 1 hour`
- the selected choice is saved in extension-local storage and restored when the options page is reopened
- users without a saved choice default to `2 hours or less`, matching current behavior
- the popup reads the saved choice before scanning the active LinkedIn page
- the Recent Postings parser applies the selected boundary consistently to posted and reposted listings
- `2 hours or less` includes minute-based postings, `1 hour ago`, and `2 hours ago`
- `1 hour or less` includes minute-based postings and `1 hour ago`, but excludes postings older than one hour
- `Less than 1 hour` includes minute-based postings through `59 minutes ago`, but excludes `1 hour ago` and older postings
- popup empty-state text reflects the selected filter rather than always referring to two hours
- existing capture, save, Record Listing, and recent-posting position behavior remains unchanged
- automated coverage verifies setting persistence, defaults, and all three age boundaries

---

## Tasks

### Phase 1: Define The Setting And Storage Contract

**Status:** Work Complete

- [x] Define stable stored values for the three Recent Postings age choices.
- [x] Add a narrow shared settings helper for loading, validating, defaulting, and saving the selected value.
- [x] Use `chrome.storage.local` so the preference persists across browser sessions.
- [x] Treat missing or unrecognized stored values as `2 hours or less` for backward compatibility.
- [x] Keep the setting independent from project-folder handles and other persistence data.

**Technical Notes:**

Likely files:

- `extension/shared/recentPostingsSettings.js` (new)
- `extension/options/options.js`
- `extension/popup/popup.js`
- `extension/tests/persistence.test.mjs`

Prefer semantic stored values rather than display labels. A small configuration map can provide the parser limit and user-facing copy from one validated value. The three effective boundaries are 120 minutes inclusive, 60 minutes inclusive, and 60 minutes exclusive.

### Phase 2: Add The Options Page Control

**Status:** Work Complete

- [x] Add a clearly labeled Recent Postings settings panel to the options page.
- [x] Present the three choices as one mutually exclusive control, such as a radio group.
- [x] Load and display the persisted choice when the page opens.
- [x] Save a changed choice and provide accessible confirmation or status feedback.
- [x] Style the new control consistently with the existing options panels and responsive layout.
- [x] Ensure project-folder actions continue to behave unchanged.

**Technical Notes:**

Likely files:

- `extension/options/options.html`
- `extension/options/options.css`
- `extension/options/options.js`

The setting does not require a project folder and should remain usable when the File System Access API is unavailable or no folder is configured.

### Phase 3: Apply The Selected Age Filter

**Status:** Work Complete

- [x] Load the selected setting before the popup starts its Recent Postings scan.
- [x] Pass the validated age-filter value into the injected `captureRecentJobPostings` function.
- [x] Replace the parser's fixed `120`-minute cutoff with the selected boundary.
- [x] Preserve the parser's self-contained injection behavior and deterministic age normalization.
- [x] Apply the same boundary to list-card, detail-page, and body-text fallback results.
- [x] Update loading, empty, and result messaging where needed so it accurately describes the active filter.
- [x] Fail safely to the two-hour default if reading the stored preference fails.

**Technical Notes:**

Likely files:

- `extension/popup/popup.js`
- `extension/content/captureActivePage.js`

`chrome.scripting.executeScript` supports passing serializable arguments to the injected function. Keep `captureRecentJobPostings` isolated from imported module state: accept the filter as an argument and validate/default it inside the injected function as well as in the shared settings layer.

### Phase 4: Regression Checks And Documentation

**Status:** Work Complete

- [x] Add tests for defaulting and persistence of the new preference.
- [x] Add parser tests for the 120-minute inclusive boundary.
- [x] Add parser tests for the 60-minute inclusive boundary.
- [x] Add parser tests proving the less-than-one-hour choice accepts `59 minutes ago` and rejects `1 hour ago`.
- [x] Verify posted and reposted text follows the same selected boundary.
- [x] Preserve fixture-backed company extraction, deduplication, and list-position assertions.
- [x] Preserve the injection-isolation test with the new function argument.
- [x] Run syntax checks for changed extension scripts and the existing parser and persistence regression suites.
- [x] Update `extension/README.md` to document the configurable Recent Postings age filter.
- [x] Bump `extension/manifest.json` according to the project version convention for reload verification.
- [x] Record implementation details and test results in this DevCycle document.

**Technical Notes:**

Likely verification commands:

```powershell
node --check extension\content\captureActivePage.js
node --check extension\popup\popup.js
node --check extension\options\options.js
node --check extension\shared\recentPostingsSettings.js
node extension\tests\captureActivePage.smoke.test.mjs
node extension\tests\persistence.test.mjs
```

Adjust the exact commands during implementation if a focused options/settings test file is introduced.

---

## Notes and Risks

- Boundary wording is significant: `1 hour or less` includes exactly `1 hour ago`, while `Less than 1 hour` excludes it.
- LinkedIn age text is minute/hour-granular in the current parser. The strict less-than-one-hour option should therefore accept recognized minute values up to 59 and reject recognized hour values.
- Reading the preference adds an asynchronous step before the popup scan; the existing loading state should remain visible until the setting and scan complete.
- The parser runs through script injection and must not depend on module-scope constants or helpers unavailable in the active tab.
- Storage failures or invalid legacy values should degrade to the existing two-hour behavior instead of preventing the Recent Postings panel from loading.
- This cycle changes only filtering of the popup's Recent Postings list. It does not change the `postedText` captured or saved for an individual job.

---

## Completion Summary

*Implementation complete; awaiting user verification before this cycle is marked `Verified` and moved to `doc/planning/completed/`.*

**Completion Date:** 2026-07-20
**Phases Completed:** All (1-4)
**Work Deferred:** None

**Accomplishments:**

- Added `extension/shared/recentPostingsSettings.js`: stable stored values (`twoHoursOrLess`, `oneHourOrLess`, `lessThanOneHour`), a config map (label, `maxAgeMinutes`, `inclusive`, empty-state text) keyed by value, and `load`/`save` helpers backed by `chrome.storage.local` that default and validate, degrading safely to `2 hours or less` when `chrome.storage` is unavailable or the stored value is unrecognized.
- Added a Recent Postings settings panel to the options page (`options.html`/`.css`/`.js`) rendering the three choices as a radio group, loading the persisted choice on open, saving on change, and showing accessible status text; project-folder controls are untouched.
- Changed `captureRecentJobPostings` in `extension/content/captureActivePage.js` to accept an `{ maxAgeMinutes, inclusive }` argument (validated/defaulted internally to the historical 120-minutes-inclusive behavior when omitted or invalid), and replaced the parser's hardcoded 120-minute cutoff in `recentAgeText` with that boundary. The function remains self-contained for `chrome.scripting.executeScript` injection.
- Updated `popup.js` to load the saved setting before scanning, pass the resolved boundary as an injected-function argument, and use the filter's configured empty-state text instead of a hardcoded "last two hours" message.
- Documented the feature in `extension/README.md` and bumped `extension/manifest.json` to `0.0.15.1`.

**Metrics:**

- Files modified: 8 (`captureActivePage.js`, `popup.js`, `options.html`, `options.css`, `options.js`, `manifest.json`, `README.md`, plus 2 test files) + 1 new file (`recentPostingsSettings.js`)
- Test coverage added: persistence/defaulting/invalid-value tests in `persistence.test.mjs`; 120-min inclusive, 60-min inclusive, and 60-min exclusive (including the `59 minutes ago` / `1 hour ago` boundary) parser tests in `captureActivePage.smoke.test.mjs`
- `node extension/tests/captureActivePage.smoke.test.mjs` and `node extension/tests/persistence.test.mjs` both pass; `node --check` passes for all changed scripts

**Lessons / Notes:**

- Kept the boundary logic as a closure-captured `filter` variable inside `captureRecentJobPostings` rather than threading it through every helper function's parameters — it stays a single self-contained injected function while every internal age check (list-card, detail-page, and body-text fallback paths) automatically uses the same boundary.
- Calling `captureRecentJobPostings()` with no argument still reproduces the exact pre-DC15 120-minute-inclusive behavior, so no existing test needed to change, only new ones were added.
