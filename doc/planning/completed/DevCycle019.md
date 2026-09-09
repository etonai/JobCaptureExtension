# DevCycle 019: "Next Page" Button for the LinkedIn Results List

**Status:** VERIFIED
**Start Date:** 2026-07-21
**Target Completion:** 2026-07-21
**Focus:** Add a popup "Next Page" button that advances the LinkedIn search-results tab by one page (25 results) by incrementing the `start` URL parameter in place — working identically whether the user arrived via DC17's generic "Open Job Search" or DC18's premium "Open Premium Job Search".

---

## Goal

This cycle implements Idea 1 from `doc/ideas/DC17ideas.md`. When there are no fresh postings on the current page, or the user has already seen them, the current workflow is to scroll LinkedIn's left-hand list and click LinkedIn's own "Next" / page-number control. A single popup button should do that instead.

LinkedIn paginates results purely through the `start` query parameter in increments of 25 (page 1 omits `start`; page 2 = `start=25`; page 3 = `start=50`; …). The user's captured URLs confirm this: their premium page-2 URL is identical to page 1 except `start=25` was added. Because paging is *only* the `start` parameter, the correct and robust design is to read the **currently loaded results URL** and add 25 to `start`, preserving every other parameter. This is what makes the feature work for both DC17 (generic) and DC18 (premium) surfaces without any per-surface logic: the button never cares which surface it is on, only that a `start` value needs advancing.

**The single most important correctness requirement this cycle:** incrementing `start` by 25 must be proven to work on both the DC17 generic URL shape and the DC18 premium URL shape, via unit tests that exercise both real captured URLs.

## Desired Outcome

- The popup has a "Next Page" action that advances the active LinkedIn results tab by 25 (one page) in place, without opening a new tab.
- The advance works on any LinkedIn `jobs/search-results` URL — generic (DC17) or premium (DC18) — because it only manipulates `start` and preserves all other parameters (`keywords`, `geoId`, `f_TPR`, and, when present, `origin`, `showHowYouFit`, `referralSearchId`, etc.).
- A URL with no `start` becomes `start=25`; `start=25` becomes `start=50`; and so on.
- The paging logic lives in a pure, unit-tested module, with tests that assert correct behavior against both the DC17 and DC18 captured URLs.
- If the active tab is not a LinkedIn search-results page, the button does not navigate; it shows a clear status message instead.
- No new manifest permissions are required.
- DC17's and DC18's buttons and all existing behavior remain unchanged.

---

## Tasks

### Phase 1: Pure "Next Page" URL Helper

**Status:** Work Complete

- [x] Add a pure module (e.g. `extension/shared/pagingUrl.js`) exporting a function such as `nextPageUrl(currentUrl)` that returns the current URL with `start` increased by 25, preserving all other query parameters and the path/host.
- [x] Treat a missing, blank, or non-numeric `start` as `0`, so page 1 → `start=25`.
- [x] Add a guard helper (e.g. `isLinkedInJobSearchUrl(url)`) that returns true only for `www.linkedin.com` paths under `/jobs/search-results/`, so the caller can refuse to act on unrelated pages.
- [x] Decide and implement whether to drop `currentJobId` on advance (see Open Questions); default recommendation is to drop it so LinkedIn selects the first card of the new page.
- [x] Add focused unit tests that prove `start` increments correctly and **all other parameters are preserved**, exercising:
  - the DC17 generic captured URL (`…?currentJobId=…&keywords=Software%20Engineer&geoId=90000091&f_TPR=r86400`, no `start`) → gains `start=25`;
  - the DC18 premium captured URL (`…&origin=QUALIFICATION_LANDING&showHowYouFit=HOW_YOU_FIT&referralSearchId=…&geoId=90000091&f_TPR=r86400`, no `start`) → gains `start=25` with `origin`/`showHowYouFit`/`referralSearchId`/`geoId`/`f_TPR` all intact;
  - a URL already at `start=25` → becomes `start=50`;
  - a non-numeric `start` → becomes `start=25`;
  - the guard rejecting a non-search LinkedIn URL (e.g. `/jobs/view/…`) and a non-LinkedIn URL.

**Technical Notes:**

Likely files:

- `extension/shared/pagingUrl.js` (new)
- `extension/tests/pagingUrl.test.mjs` (new)

Use `URL` / `URLSearchParams` to parse and rewrite, then `searchParams.set('start', …)` so an existing `start` is replaced rather than duplicated. Keep this module free of DOM, `chrome.*`, and settings dependencies so it stays trivially unit-testable — it operates purely on a URL string, which is exactly why it is surface-agnostic. The two captured URLs from `DC17ideas.md` should be pasted verbatim into the tests as the canonical DC17/DC18 fixtures.

### Phase 2: Popup "Next Page" Button and In-Place Navigation

**Status:** Work Complete

- [x] Add a "Next Page" button to `extension/popup/popup.html`, positioned near the existing "Open Job Search" / "Open Premium Job Search" buttons.
- [x] Wire it in `extension/popup/popup.js`: read the active tab's URL, verify it with `isLinkedInJobSearchUrl`, compute the next URL with `nextPageUrl`, and navigate the tab **in place**.
- [x] If the active tab is not a LinkedIn search-results page, show a status message (e.g. "Open a LinkedIn job search first") and do not navigate.
- [x] After navigating, set a status message indicating the new page and that the popup should be reopened to rescan recent postings.
- [x] Confirm the in-place navigation mechanism works under current permissions (see Open Questions); no new manifest permissions should be needed.

**Technical Notes:**

Likely files:

- `extension/popup/popup.html`
- `extension/popup/popup.js`
- `extension/popup/popup.css` (only if layout needs adjustment)

The popup can read the active tab's URL via `chrome.tabs.query({ active: true, currentWindow: true })` — `activeTab` grants access to the active tab's `url` once the user has invoked the action. For in-place navigation, prefer `chrome.tabs.update(tab.id, { url })`. If that proves to need a permission the extension lacks, fall back to injecting a **trivial** self-contained setter via the existing `chrome.scripting.executeScript({ func, args })` pattern — `func: (u) => { window.location.href = u; }` with the precomputed URL as its argument. Note that in the fallback the *paging logic still lives in the pure Phase 1 module*; only the one-line `window.location` assignment is injected, so the DC13 self-contained-injection concern is minimal (nothing but the setter crosses the boundary). This differs from DC17/DC18, which open a new tab with `chrome.tabs.create`; here we intentionally navigate the current tab so the user keeps paging through the same search.

### Phase 3: Verification and Documentation

**Status:** Work Complete

- [x] Run `node --check` on all changed JavaScript and the new/existing test suites; confirm no regressions.
- [x] Confirm the Phase 1 tests explicitly cover both the DC17 and DC18 captured URLs (the core requirement of this cycle).
- [ ] Manually verify on a live browser: from a DC17 generic results page, "Next Page" advances to page 2; from a DC18 premium results page, "Next Page" advances to page 2 with the premium parameters preserved; repeated clicks continue advancing (25 → 50 → 75).
- [ ] Manually verify the button refuses to act (status message, no navigation) when the active tab is not a LinkedIn search-results page.
- [x] Update `extension/README.md` to document the "Next Page" action and that it works on both generic and premium searches.
- [x] Bump `extension/manifest.json` version (from `0.0.18.0` to `0.0.19.0`) for reload verification.
- [x] Record chosen behaviors and any live-verification notes in the Completion Summary.

**Technical Notes:**

Likely verification commands:

```powershell
node --check extension\shared\pagingUrl.js
node --check extension\popup\popup.js
node extension\tests\pagingUrl.test.mjs
node extension\tests\searchUrlBuilder.test.mjs
node extension\tests\persistence.test.mjs
```

Automated tests can prove the URL math is correct against both surfaces; only a live page can confirm LinkedIn actually renders the next page and preserves the premium surface across the navigation. This cycle stays at `Work Complete` until the user approves `Verified`.

---

## Open Questions

1. **Should `currentJobId` be dropped when advancing?**
   Recommendation: **drop it.** LinkedIn's own page-2 URL changed `currentJobId` to a job on the new page, so carrying the previous page's `currentJobId` could leave a stale detail pane open. Removing it lets LinkedIn auto-select the first card of the new page. This is a small, safe refinement and does not affect the `start` math.

2. **What should happen at LinkedIn's result cap (~1000 results / ~40 pages)?**
   Recommendation: for v1, keep incrementing and let LinkedIn show its own empty-results state past the end; note the limitation in the README. Optionally clamp at `start=975` (the last page of 25) later if the empty state is confusing. Do not over-engineer this in v1.

3. **Should the popup auto-rescan recent postings after advancing?**
   Recommendation: **no** for v1. The tab navigation is asynchronous and the new page has not loaded when the button returns, so an immediate rescan would race the page load. Navigate, show a status message prompting the user to reopen the popup, and treat auto-rescan-after-load as a possible later enhancement.

4. **Add a "Previous Page" button too?**
   Recommendation: ship **Next only** for v1, matching Idea 1. A symmetric "Previous" (subtract 25, floor at 0, drop `start` at page 1) is a trivial follow-up if the Next button proves useful.

5. **In-place navigation via `chrome.tabs.update` or an injected `window.location` setter?**
   Recommendation: try `chrome.tabs.update(tab.id, { url })` first (simplest, no injection). If it needs a permission we lack, fall back to the trivial injected setter, which is definitely covered by the existing `scripting` + `activeTab` permissions. Either way the paging logic stays in the pure Phase 1 module.

---

## Notes and Risks

- **Surface-agnostic by construction:** because the feature only reads the current URL and rewrites `start`, it works for DC17 generic, DC18 premium, and any other LinkedIn `jobs/search-results` URL without per-surface branches. The Phase 1 unit tests against both captured URLs are what lock this guarantee in — this is the explicit priority of the cycle.
- **Guard against non-search pages:** the button must refuse to act (status message, no navigation) unless the active tab is a `www.linkedin.com/jobs/search-results/` URL, so it never mangles an unrelated page.
- **Stale scan after navigating:** the recent-postings scan runs on popup open against the page that was loaded then. After "Next Page" navigates, that scan is stale until the popup is reopened. v1 surfaces this via a status message rather than auto-rescanning (see Open Question 3).
- **Result cap:** LinkedIn stops returning results after roughly 1000 (~40 pages); past the end the list is empty. v1 does not special-case this beyond a README note (see Open Question 2).
- **No new permissions:** reading the active tab URL is covered by `activeTab`; in-place navigation uses `chrome.tabs.update` (or the already-available injected setter fallback). No manifest permission changes are expected.
- **Injection discipline mostly N/A:** unlike the scan/highlight features, the paging logic is a pure popup-side module. Only the optional one-line navigation fallback is injected, so the DC13 self-contained-injection constraint applies to at most a trivial setter.
- Idea 2 (tighter `f_TPR` timeframe) remains out of scope and optional, as noted across DC17/DC18.

---

## Completion Summary

*Implementation complete; awaiting user verification on a live LinkedIn session — advancing pages on both a generic and a premium results tab — before this cycle is marked `Verified` and moved to `completed/`.*

**Completion Date:** 2026-07-21
**Phases Completed:** Phases 1–2 fully; Phase 3 implementation and automated checks complete, live browser verification pending.
**Work Deferred:** None from this cycle's scope. Previous Page, result-cap clamping, and auto-rescan-after-navigate were considered and intentionally deferred per the plan's Open Questions.

**Accomplishments:**

- Added `extension/shared/pagingUrl.js`: a pure module with `nextPageUrl(currentUrl)` (increments `start` by 25, treating missing/blank/non-numeric `start` as 0, and drops `currentJobId` so LinkedIn selects the first card of the new page) and `isLinkedInJobSearchUrl(url)` (true only for `www.linkedin.com` paths under `/jobs/search-results/`, false — never throwing — for anything else, including malformed URL strings).
- Added `extension/tests/pagingUrl.test.mjs` using the **exact URLs the user captured** in `DC17ideas.md` as fixtures: the DC17 generic URL and the DC18 premium URL both correctly advance to `start=25` with every other parameter (`keywords`, `geoId`, `f_TPR`, and for the premium URL `origin`, `showHowYouFit`, `referralSearchId`, `originToLandingJobPostings`) preserved intact — directly proving the cycle's core requirement that paging works identically on both surfaces. Also covers `start=25` → `start=50`, non-numeric/blank `start` → `25`, and the search-results guard against job-detail and non-LinkedIn URLs.
- Added a "Next Page" button to the popup, placed below the existing "Open Job Search" / "Open Premium Job Search" row.
- Wired it in `popup.js` via `goToNextPage()`: reads the active tab's URL, guards with `isLinkedInJobSearchUrl` (showing a status message and refusing to navigate if the tab isn't a LinkedIn search-results page), computes the next URL with `nextPageUrl`, and navigates the tab **in place** via `chrome.tabs.update(tab.id, { url })` — no new tab, no new permission needed.
- After navigating, the popup shows a status message prompting the user to reopen the popup to rescan recent postings, per the plan's decision not to auto-rescan (the navigation is asynchronous and would race the page load).
- Updated `extension/README.md` with a "Next Page Button" section explaining the surface-agnostic `start`-increment mechanism, the `currentJobId` drop, the non-search-page guard, and the ~1000-result/~40-page LinkedIn cap.
- Bumped `extension/manifest.json` to `0.0.19.0`.
- DC17's and DC18's buttons, builders, and behavior were not modified.

**Metrics:**

- Files added: 3 (`pagingUrl.js`, `pagingUrl.test.mjs`, this DevCycle document)
- Files modified: 4 (`popup.html`, `popup.js`, `README.md`, `manifest.json`)
- Automated checks: all `node --check` syntax checks pass; `captureActivePage.smoke.test.mjs`, `persistence.test.mjs`, `searchUrlBuilder.test.mjs`, and `pagingUrl.test.mjs` all pass

**Lessons / Notes:**

- The surface-agnostic design worked exactly as planned: because `nextPageUrl` only ever reads and rewrites `start` and never inspects `origin`/`showHowYouFit`/other surface-specific parameters, no DC17-vs-DC18 branching was ever needed anywhere in the implementation — the guarantee came entirely from the unit tests pinning both real captured URLs as fixtures.
- `chrome.tabs.update` worked without needing the injected-setter fallback discussed in planning; the `activeTab` permission the extension already declares was sufficient for both reading `tab.url` and updating it in place.
- Live verification is still required: confirming that LinkedIn actually renders page 2 correctly for both the generic and premium surfaces, and that repeated clicks keep advancing (25 → 50 → 75), per the project's verification standard.
