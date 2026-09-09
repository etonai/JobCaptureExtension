# DevCycle 031: Show Recent Postings Freshness Setting in Popup Header

**Status:** VERIFIED
**Start Date:** 2026-08-12
**Target Completion:** 2026-08-12
**Focus:** Display the configured Recent Postings freshness setting (`<= 2hr`, `<= 1hr`, `< 1hr`) next to the "Recent Postings" title in the popup.

---

## Goal

The popup's Recent Postings panel (`extension/popup/popup.html:26`) shows a plain "Recent Postings" heading with no indication of which age filter is currently active. The active filter — one of `2 hours or less`, `1 hour or less`, or `Less than 1 hour` (`extension/shared/recentPostingsSettings.js`) — is only visible by opening Options. Since the setting directly changes which postings appear in the list, it should be visible at a glance in the popup itself.

## Desired Outcome

- The popup's "Recent Postings" heading is annotated with the currently configured freshness setting, using compact notation: `<= 2hr`, `<= 1hr`, or `< 1hr`.
- The annotation reflects the setting already stored via `loadRecentPostingsAgeSetting()` / `getRecentPostingsAgeConfig()` (`extension/shared/recentPostingsSettings.js`) — no new storage or Options changes are required unless investigation in Phase 1 finds otherwise.
- The annotation stays in sync if the user changes the setting in Options and reopens the popup.

---

## Tasks

### Phase 1: Popup Header Update

**Status:** Work Complete

- [x] Added a `shortLabel` field (`<= 2hr` / `<= 1hr` / `< 1hr`) per entry in `RECENT_POSTINGS_AGE_CONFIGS` (`extension/shared/recentPostingsSettings.js`), alongside the existing `label`/`emptyStateText`.
- [x] Added `<span id="recentPostingsAgeLabel" class="recent-postings-age-label">` inside the `<h2>` in `extension/popup/popup.html`, plus a small muted-text rule for it in `extension/popup/popup.css`.
- [x] `scanRecentPostings()` in `extension/popup/popup.js` now sets `elements.recentPostingsAgeLabel.textContent = ageConfig.shortLabel` immediately after resolving `ageConfig`, reusing the existing `getRecentPostingsAgeConfig(await loadRecentPostingsAgeSetting())` lookup already used to run the scan.
- [x] Confirmed sync-on-reopen: `scanRecentPostings()` runs unconditionally on popup load (`popup.js:638`) and on manual refresh, so a setting changed in Options is picked up the next time the popup opens (module-level `chrome.storage.local` state, no popup-side caching to go stale).

**Technical Notes:**
Relevant files: `extension/popup/popup.html`, `extension/popup/popup.js`, `extension/popup/popup.css`, `extension/shared/recentPostingsSettings.js`.

### Phase 2: Tests

**Status:** Work Complete

- [x] Extended `runRecentPostingsSettingsTests()` in `extension/tests/persistence.test.mjs` with `shortLabel` assertions for all three age configs.
- [x] Extended `extension/tests/popup.module.smoke.test.mjs` to assert `#recentPostingsAgeLabel` is populated with the default short label (`<= 2hr`) after popup.js initializes.
- [x] Bumped `extension/manifest.json` to `0.0.31.0` and added a paragraph to the "Recent Postings Age Filter" section of `extension/README.md`.

**Technical Notes:**
All five test suites pass: `node extension/tests/{captureActivePage.smoke,pagingUrl,persistence,popup.module.smoke,searchUrlBuilder}.test.mjs`. No live-browser verification was performed (no browser environment available in this session).

---

## Open Questions

1. **Should the short label live in `recentPostingsSettings.js` as new data, or be computed from the existing `label` string in `popup.js`?**
   Recommendation: Store it as data in `recentPostingsSettings.js` next to `label`/`emptyStateText`. String-parsing `"2 hours or less"` into `<= 2hr` is fragile and duplicates knowledge that already lives in one place.

---

## Notes and Risks

- **Scope boundary:** This cycle only adds a visible annotation to the popup header. It does not change the age-filter options themselves, Options page UI, or scan behavior.

---

## Completion Summary

**Completion Date:** 2026-08-12
**Phases Completed:** All
**Work Deferred:** Live-browser verification — this cycle stops at Work Complete per [[DevelopmentProcess]]; a human should confirm the label renders correctly in the actual popup UI before this is marked Verified.

**Accomplishments:**
- Added `shortLabel` (`<= 2hr` / `<= 1hr` / `< 1hr`) to each Recent Postings age config (`extension/shared/recentPostingsSettings.js`).
- Popup header now shows the active freshness setting next to "Recent Postings" (`extension/popup/popup.html`, `extension/popup/popup.js`, `extension/popup/popup.css`), populated from the same config lookup already used to run the scan, kept in sync on every popup open/refresh.
- Added test coverage for the new `shortLabel` field and the popup header element; bumped manifest version and documented the change in the README.

**Metrics:**
- Files modified: `extension/shared/recentPostingsSettings.js`, `extension/popup/popup.html`, `extension/popup/popup.js`, `extension/popup/popup.css`, `extension/manifest.json`, `extension/README.md`, `extension/tests/persistence.test.mjs`, `extension/tests/popup.module.smoke.test.mjs`, plus this DevCycle document.
- Tests passing: all five suites (`captureActivePage.smoke`, `pagingUrl`, `persistence`, `popup.module.smoke`, `searchUrlBuilder`).

**Lessons / Notes:**
No open questions turned out to need reconsideration — the short label was added as data alongside the existing `label`/`emptyStateText`, as recommended, and required no changes outside the four files that owned the feature plus their tests.
