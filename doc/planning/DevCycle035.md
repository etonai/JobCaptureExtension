# DevCycle 035: Blacklist-Based Hiding of Recent Postings

**Status:** Work Complete
**Start Date:** 2026-09-09
**Target Completion:** 2026-09-09
**Focus:** Let the user hide all currently-listed postings from blacklisted companies by clicking LinkedIn's own dismiss ("X") button on each matching card.

---

## Goal

Some companies (Amazon is the recurring example) post large numbers of near-duplicate listings that flood LinkedIn's left-hand results column, burying postings the user actually cares about. LinkedIn already lets a user dismiss an individual card via its per-card "X" (`button[aria-label="Dismiss <TITLE> job"]`, per the dismiss-button detection already used in `captureActivePage.js` for card/company parsing and exact-match boundary detection), which removes that posting from the results list. This cycle adds a user-maintained blacklist of company names and a popup action that dismisses every currently-visible card belonging to a blacklisted company in one click, so the user does not have to manually click "X" dozens of times per session.

## Desired Outcome

- A `blacklist.txt` file (one company name per line, project-folder-relative like `search-tracking.csv`) can optionally exist. Its absence is not an error; the feature simply has nothing to hide.
- A new "Hide Blacklisted" button appears in the popup below the Notes field.
- Clicking the button scans the left-hand results column on the active LinkedIn search-results tab, matches each card's parsed company name against the blacklist, and clicks that card's own dismiss ("X") button for every match — reusing LinkedIn's existing per-card dismiss behavior rather than hiding cards ourselves.
- Matching is company-name based and case-insensitive at minimum; exact matching semantics (exact vs. substring, whitespace/punctuation normalization) are decided during planning refinement below.
- The user gets clear popup feedback: how many cards were hidden, and what happens when the blacklist file is missing, empty, unreadable, or contains no matches on the current page.
- The feature does not touch `search-tracking.csv`, the Recent Postings count/highlighting, or the exact-match boundary tracking from DevCycle033 — it only triggers LinkedIn's native dismissal on selected cards.
- Only postings currently rendered in the left-hand column are affected; the feature does not paginate or fetch additional pages on its own.

---

## Tasks

### Phase 1: Blacklist File Format and Loading

**Status:** Work Complete

- [x] Define `blacklist.txt` format (one company name per line; comment/blank-line handling) and project-folder location, consistent with how `search-tracking.csv` is read/written today.
- [x] Implement a loader that treats a missing file (or an unconfigured project folder) as an empty blacklist (no error to the user) and surfaces read failures (permission, lock) distinctly from "file absent."
- [x] Decide and implement name-normalization rules for comparison (case folding, whitespace trimming; exact match, per the resolved open question below).
- [x] Add unit tests for loading: missing file, empty/comment-only file, and normalization, via the popup smoke-test harness (see Phase 3).

**Technical Notes:**
Implemented as `extension/shared/blacklist.js` (`BLACKLIST_FILENAME`, `parseBlacklistText()`, `loadBlacklist()`), alongside the existing project-folder file access used for `search-tracking.csv`. Reuses `ensureProjectReadPermission()` / `getStoredProjectFolder()` from `projectFolderStore.js` rather than inventing a new permission path. `loadBlacklist()` returns `{ companies, fileFound, folderConfigured }` so the popup can distinguish "no project folder," "no file," and "file present but empty" without three separate exceptions.

### Phase 2: Card Matching and Dismissal in the Content Script

**Status:** Work Complete

- [x] Add a self-contained injected function, `dismissBlacklistedCompanyCards(companies)`, in `extension/content/captureActivePage.js` that lists every results-list card with its positionally parsed company name and a reference to that card's own dismiss button, following the same structural approach as `listCardListings()` / `dismissButtonTitles()` / `recentCardRoot()` (duplicated rather than shared, consistent with this file's existing pattern for independently injected functions — see the notes above `detailPageListing()`).
- [x] For each card whose company matches the blacklist, invoke `.click()` on that card's own dismiss button so LinkedIn performs its native hide behavior.
- [x] Cards with an unresolved/blank company never match (an empty normalized company is excluded from lookup).
- [x] Return a summary to the popup: `scanned`, `matched`, `dismissed`, `failed`, and the list of dismissed companies.
- [x] Add capture smoke-test fixtures covering: multiple matches (including a company appearing twice, once with no posting age, to prove age is irrelevant), a non-blacklisted company left alone, a company-omitted card never matching, an empty blacklist, and a non-LinkedIn page.

**Technical Notes:**
Primary file: `extension/content/captureActivePage.js`, function `dismissBlacklistedCompanyCards`. Card boundaries and company position are read the same way as `listCardListings()` (title `<p>` → next `<p>` is the company, positionally) but without the posting-age requirement, since every currently-listed card from a blacklisted company should be hidden regardless of age. Matching is exact (case-insensitive, whitespace-normalized), per Open Question 1's resolution below.

### Phase 3: Popup UI and Feedback

**Status:** Work Complete

- [x] Add a "Hide Blacklisted" button to `extension/popup/popup.html`, positioned below the Notes field as specified.
- [x] Wire the button in `extension/popup/popup.js` (`runHideBlacklisted()`) to load the blacklist, invoke `dismissBlacklistedCompanyCards` on the active tab, and render the result summary via the existing status panel.
- [x] Implement feedback states: project folder not configured, blacklist file absent, blacklist empty, no matching cards found, N postings hidden (with a failure-count suffix when applicable), and unsupported (non-LinkedIn) page.
- [x] Add popup tests covering each feedback state in `extension/tests/popup.module.smoke.test.mjs`.

**Technical Notes:**
Relevant files: `extension/popup/popup.html`, `extension/popup/popup.js`. Reused the existing `secondary-button` class and `setStatus()` panel — no new CSS was needed for visual consistency with the rest of the popup.

### Phase 4: Documentation and Verification

**Status:** Work Complete

- [x] Document `blacklist.txt`'s format, location, and optionality, plus the "Hide Blacklisted" button's behavior, in `extension/README.md` ("Hide Blacklisted (Company Blacklist)" section).
- [x] Bump the extension version (`0.0.34.0` → `0.0.35.0`).
- [x] Run all five extension test suites: all pass.
- [ ] Manually verify on a live LinkedIn search-results page: a blacklisted company's cards are dismissed and disappear from the list, non-blacklisted cards are untouched, and the summary feedback is accurate.
- [ ] Manually verify behavior with no `blacklist.txt` present and with an empty `blacklist.txt`.

---

## Open Questions

1. **Exact match or substring match against company names?**
   Decision: exact match (case-insensitive, whitespace-normalized) on the parsed company name, per the recommendation. Implemented as-is; revisit if the user finds cases where a blacklist entry should also catch near-variant company names.

2. **Where does `blacklist.txt` live, and can it be edited from the popup, or only externally?**
   Recommendation: same project folder as `search-tracking.csv`, edited externally as a plain text file (no in-popup editor) for this cycle. An in-popup blacklist editor can be a future DevCycle if wanted.

3. **Should "Hide Blacklisted" also run automatically (e.g., on Refresh), or only on explicit button press?**
   Recommendation: explicit button press only for this cycle, matching the user's request. Automatic hiding could surprise the user by silently making postings disappear; keep it opt-in per click until proven useful.

4. **Should dismissed cards be logged anywhere (e.g., a count in `search-tracking.csv`), or is this purely ephemeral/client-side?**
   Recommendation: purely ephemeral for this cycle — no CSV changes. This keeps the cycle's scope narrow and avoids touching the schema work from DevCycle033/034 unnecessarily.

---

## Notes and Risks

- **Risk:** LinkedIn's dismiss button markup may change; this feature depends on the same `button[aria-label="Dismiss <TITLE> job"]` structure already relied upon elsewhere in `captureActivePage.js`. Reusing that existing detection minimizes duplicate fragility rather than introducing a second brittle selector.
- **Risk:** Programmatically clicking many dismiss buttons in quick succession could trigger LinkedIn rate-limiting or unexpected DOM re-renders mid-scan (cards shifting position as earlier ones are removed). The implementation should re-query rather than relying on a stale node list/index across dismiss actions.
- **Risk:** A blacklist entry matching a common substring could hide postings the user wanted to see; the exact-vs-substring decision above should be resolved and clearly documented before broad use.
- **Scope boundary:** This cycle only dismisses currently-rendered cards on the active page. It does not paginate to find more matches, does not modify `search-tracking.csv`, and does not add an in-extension blacklist editor.

---

## Completion Summary

*Fill in when the cycle closes. Move this document to `doc/planning/completed/` afterward.*

**Completion Date:** 2026-09-09
**Phases Completed:** All implementation phases; live LinkedIn verification remains pending
**Work Deferred:** Manual verification of the button against a live LinkedIn search-results page (with and without `blacklist.txt` present). User approval is required before the cycle can be marked Verified.

**Accomplishments:**
- Added `extension/shared/blacklist.js` to load and parse an optional `blacklist.txt` from the project folder, distinguishing "no project folder," "no file," and "empty file."
- Added `dismissBlacklistedCompanyCards()` to `extension/content/captureActivePage.js`, a self-contained injected function that scans every results-list card (regardless of posting age) and clicks the native LinkedIn dismiss button on each card whose company exactly matches the blacklist.
- Added the "Hide Blacklisted" button below the Notes field in the popup, wired to load the blacklist and report scanned/matched/dismissed/failed counts and edge-case states.
- Added automated coverage: capture-side smoke tests (multiple matches, age-irrelevance, non-match, company-omitted card, empty blacklist, non-LinkedIn page) and popup-side smoke tests for every feedback state.
- Documented the feature in `extension/README.md` and bumped the extension to `0.0.35.0`.

**Metrics:**
- Files modified: 7 (`captureActivePage.js`, `popup.html`, `popup.js`, `blacklist.js` (new), `manifest.json`, `README.md`, plus this DevCycle document); 2 test files updated (`captureActivePage.smoke.test.mjs`, `popup.module.smoke.test.mjs`)
- Tests passing: all five suites (`captureActivePage.smoke`, `persistence`, `popup.module.smoke`, `searchUrlBuilder`, `pagingUrl`)

**Lessons / Notes:**
The existing structural card-parsing helpers (`listCardListings()`, `dismissButtonTitles()`, `recentCardRoot()`) generalized cleanly to an age-independent scan once the posting-age requirement was dropped from card-boundary detection; duplicating rather than sharing those helpers (per this file's established injected-function pattern) kept the new function self-contained for `chrome.scripting.executeScript`.
