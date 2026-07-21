# DevCycle 017: Jump Straight to My LinkedIn Job Search

**Status:** Planning
**Start Date:** 2026-07-21
**Target Completion:** 2026-07-21
**Focus:** Let the user open the first page of their configured LinkedIn job search in one click from the extension, instead of navigating to LinkedIn and pressing the "Show All" button manually.

---

## Goal

Today the user's workflow starts by going to LinkedIn's home page and clicking the "Show All" premium-jobs button to reach the first page of their Software Engineer search. As analyzed in `doc/ideas/DC17ideas.md` (the "Opus comment" section), the standard search results page is fully reconstructable from three stable query parameters — `keywords`, `geoId`, and `f_TPR` — with all of LinkedIn's tracking/context parameters (`lipi`, `referralSearchId`, `originToLandingJobPostings`, `currentJobId`, `origin`, `showHowYouFit`) safely dropped. This cycle adds a one-click action in the extension that builds that canonical search URL and opens it, removing the manual navigation step. This is Idea 3 from the ideas document, chosen because it is the lowest-risk and highest-value of the four ideas and depends on nothing time-sensitive in LinkedIn's URLs.

## Desired Outcome

- The extension popup has a clearly labeled action (e.g. "Open My Job Search") that takes the user directly to the first page of their search.
- The search is defined by a small, user-editable configuration — search keywords and LinkedIn `geoId` — persisted with the extension's existing `chrome.storage.local` pattern.
- The opened URL is the clean, canonical search form (`.../jobs/search-results/?keywords=...&geoId=...&f_TPR=r86400`) built from configuration only, with no copied tracking tokens and no `start` parameter (page 1).
- The action works regardless of what page the user is currently on, and does not destroy unrelated tab content.
- If the search is not configured yet (blank keywords or `geoId`), the action guides the user to Options instead of opening a broken search.
- The `geoId` value is preserved verbatim; the extension never transforms or "cleans" it.
- The URL-building logic is a pure, unit-tested module consistent with the project's existing `.test.mjs` discipline.
- Existing capture, save, Record Listing, recent-postings scan, position, filtering, and highlighting behavior remain unchanged.

---

## Tasks

### Phase 1: Define the Search Configuration

**Status:** Planning

- [ ] Add a shared settings module (e.g. `extension/shared/jobSearchSettings.js`) that loads, validates, and saves the search configuration, mirroring the structure of `extension/shared/recentPostingsSettings.js`.
- [ ] Store, at minimum, `keywords` (string) and `geoId` (string); include the time window as `timeframeSeconds` with a default of `86400` (24 hours).
- [ ] Provide sensible defaults seeded from the user's own URLs so the feature works immediately: `keywords = "Software Engineer"`, `geoId = "90000091"`, `timeframeSeconds = 86400`.
- [ ] Validate on load/save: treat blank/whitespace `keywords` or `geoId` as "not configured" and fall back safely; keep `geoId` as an opaque string (do not coerce to a number or strip characters).
- [ ] Expose async `loadJobSearchSettings()` / `saveJobSearchSettings(...)` and a `isJobSearchConfigured(settings)` helper.

**Technical Notes:**

Likely file:

- `extension/shared/jobSearchSettings.js` (new)

Follow the exact pattern already proven in `recentPostingsSettings.js`: a frozen defaults object, a single `STORAGE_KEY`, `chrome.storage.local` with a graceful fallback when `chrome.storage.local` is unavailable, and validation that never throws. Keep this module free of DOM and `chrome.tabs` calls so it stays unit-testable.

### Phase 2: Build the Canonical Search URL

**Status:** Planning

- [ ] Add a pure URL-builder (e.g. `extension/shared/searchUrlBuilder.js`) that takes the search configuration and returns the canonical LinkedIn search URL.
- [ ] Emit only the reproducing parameters: `keywords`, `geoId`, and `f_TPR=r<timeframeSeconds>`. Do not emit `start` (page 1), `currentJobId`, `lipi`, `referralSearchId`, `originToLandingJobPostings`, `origin`, or `showHowYouFit`.
- [ ] Encode `keywords` for a query string (spaces acceptable as `+` or `%20`; match a form LinkedIn accepts) and pass `geoId` through verbatim.
- [ ] Return a clear signal (or throw a typed error) when the configuration is not usable, so the caller can route the user to Options rather than open a malformed URL.
- [ ] Add focused unit tests: parameter presence, tracking-parameter absence, `geoId` verbatim preservation, keyword encoding, and `f_TPR` derived from `timeframeSeconds`.

**Technical Notes:**

Likely files:

- `extension/shared/searchUrlBuilder.js` (new)
- `extension/tests/searchUrlBuilder.test.mjs` (new)

Base URL is `https://www.linkedin.com/jobs/search-results/`. Prefer building the query with `URLSearchParams` for correct encoding, then confirm in tests that the three intended parameters (and only those) are present. The target is the plain time-filtered search (the URL 3 / URL 4 form in the ideas doc), **not** the `origin=QUALIFICATION_LANDING` "top applicant" landing surface, which carries the rotating recommendation set the analysis showed we neither need nor want to depend on.

### Phase 3: Add the Popup Navigation Action

**Status:** Planning

- [ ] Add a button to `extension/popup/popup.html` (e.g. "Open My Job Search"), placed where it reads as a primary navigation action without crowding the capture flow.
- [ ] Wire it in `extension/popup/popup.js`: load the search settings, build the URL, and open it.
- [ ] Decide and implement the open behavior (see Open Questions): default to opening the search in a new tab so no unrelated page is destroyed.
- [ ] Guard the unconfigured case: if keywords or `geoId` are blank, do not navigate — show a status message and offer to open Options (`chrome.runtime.openOptionsPage()`), consistent with existing status messaging.
- [ ] Confirm no `manifest.json` permission change is required: opening a URL in a new tab via `chrome.tabs.create({ url })` needs no extra permission, and the popup already runs on a user gesture. If reuse-the-active-tab is chosen instead, verify `chrome.tabs.update` behavior under the current `activeTab` grant before relying on it.

**Technical Notes:**

Likely files:

- `extension/popup/popup.html`
- `extension/popup/popup.js`

Unlike the recent-postings scan and the proposed card-selection feature (`Fable_first-select.md`), this action does **not** use the `chrome.scripting.executeScript({ func })` injection pattern — it is plain tab navigation to a URL the extension constructs, so the "self-contained injected function" discipline from DC13 does not apply here. Reuse the existing `setStatus(...)` helper for the unconfigured and success paths. Current manifest permissions are `activeTab`, `scripting`, `storage` (`extension/manifest.json`); `chrome.tabs.create` is expected to work without additions.

### Phase 4: Options UI for the Search Configuration

**Status:** Planning

- [ ] Add a "Job Search" section to `extension/options/options.html` and `extension/options/options.js` for editing keywords and `geoId` (and, if exposed, the time window), following the pattern used for the Recent Postings age radio group.
- [ ] Load current values on open, save on change/blur, and surface a small saved/failed status like `recentPostingsAgeStatus`.
- [ ] Include brief helper text explaining where `geoId` comes from (copied from a LinkedIn search URL) and that it must be pasted verbatim.
- [ ] Ensure blank input is handled predictably (persisted as "not configured" so the popup guard triggers rather than building a broken URL).

**Technical Notes:**

Likely files:

- `extension/options/options.html`
- `extension/options/options.js`

The options page already demonstrates the load-render-save-log loop for a stored preference (`initRecentPostingsAgeGroup` / `selectRecentPostingsAge`). Text inputs replace the radio group here, but the lifecycle is the same. Keep validation in the shared settings module (Phase 1), not duplicated in the options UI.

### Phase 5: Verification and Documentation

**Status:** Planning

- [ ] Run syntax checks on all changed JavaScript (`node --check`).
- [ ] Run the new URL-builder and settings tests, plus the existing scanner and persistence regression suites, and confirm no regressions.
- [ ] Manually verify on a live browser that the button opens the correct LinkedIn first page for the configured search, and that the unconfigured guard routes to Options.
- [ ] Manually verify the action does not disturb the currently active tab's content (given the chosen new-tab behavior).
- [ ] Update `extension/README.md` to document the "Open My Job Search" action and the Job Search options.
- [ ] Bump `extension/manifest.json` version to `0.0.17.0` for reload verification.
- [ ] Record chosen behaviors, test results, and any live-verification notes in this document's Completion Summary.

**Technical Notes:**

Likely verification commands:

```powershell
node --check extension\shared\jobSearchSettings.js
node --check extension\shared\searchUrlBuilder.js
node --check extension\popup\popup.js
node --check extension\options\options.js
node extension\tests\searchUrlBuilder.test.mjs
node extension\tests\captureActivePage.smoke.test.mjs
node extension\tests\persistence.test.mjs
```

Live verification is required because fixture tests can prove the URL is well-formed but cannot prove LinkedIn renders the intended results for it. Per the project process, this cycle stays at `Work Complete` until the user explicitly approves `Verified`.

---

## Open Questions

1. **Open the search in a new tab, or reuse the active tab?**
   Recommendation: open in a **new tab** (`chrome.tabs.create`) for v1. It is non-destructive regardless of what the user is currently viewing, needs no extra permission, and matches the "just take me there" intent. A later refinement could reuse the active tab when it is already a LinkedIn page and open a new tab otherwise.

2. **Should the time window (`f_TPR`) be user-configurable now, or fixed at 24 hours?**
   Recommendation: store it with a default of `r86400` and keep 24 hours as the shipped default. Expose it in Options only if trivial. Sub-24h windows (Idea 2, e.g. `r7200`) are unverified — LinkedIn may honor or snap them — and are out of scope here; the extension's existing client-side 2h/1h/<1h filter (DC13–DC16) remains the source of truth for recency.

3. **One saved search, or multiple presets?**
   Recommendation: a **single** search configuration for v1. Multiple named searches (e.g. different keyword sets or regions) is a natural future enhancement but adds UI and storage complexity not needed to meet this cycle's goal.

4. **How does the user obtain their `keywords` and `geoId` — free-text entry, or captured from a live search page?**
   Recommendation: **free-text** entry in Options for v1, seeded with the user's known values as defaults. A "capture current search settings from this LinkedIn tab" convenience could be added later, but parsing a live page is unnecessary risk for this cycle.
ED: For V1, use the keywords and geoid that are listed in the samples in DC17ideas.md

---

## Notes and Risks

- The `geoId` (`90000091`) is an opaque LinkedIn location identifier. It must be stored and emitted verbatim; any transformation risks silently changing the search region.
- This cycle targets the plain, time-filtered search results (URL 3 / URL 4 in the ideas doc), not the `origin=QUALIFICATION_LANDING` "Show All / top applicant" landing surface. The analysis in `DC17ideas.md` established that the plain search is reconstructable from stable parameters and does not depend on the rotating `originToLandingJobPostings` set or the per-view `lipi` token, so nothing time-sensitive is copied.
- No `manifest.json` permission change is anticipated: `chrome.tabs.create({ url })` requires no host or `tabs` permission. This assumption should be confirmed during Phase 3 before relying on it, and revisited if the reuse-active-tab option is chosen.
- Unlike the scan and card-selection features, this action is plain tab navigation, not content-script injection, so the DC13 "self-contained injected function" constraint does not apply and no `new Function(...)` injection-isolation test is needed for it.
- Blank or partial configuration must fail safe by routing the user to Options, never by opening a malformed LinkedIn URL.
- Ideas 1 (Next button), 2 (tighter timeframe), and 4 (click the home-page button) from `DC17ideas.md` are intentionally out of scope for this cycle. Idea 1 is a natural follow-on that reuses the same URL-manipulation approach (incrementing `start`).

---

## Completion Summary

*Fill in when the cycle closes. Move this document to `doc/planning/completed/` afterward.*

**Completion Date:** [YYYY-MM-DD]
**Phases Completed:** [List or "All"]
**Work Deferred:** [What was not done and why, or "None"]

**Accomplishments:**
- [What was built or changed]

**Metrics:**
- Files modified: [N]
- [Other relevant measure]

**Lessons / Notes:**
[Anything worth remembering for future cycles.]
