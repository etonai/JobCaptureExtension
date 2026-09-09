# DevCycle 021: Open Job Searches in the Current Tab

**Status:** VERIFIED
**Start Date:** 2026-07-21
**Target Completion:** 2026-07-21
**Focus:** Change the popup's "Open Job Search" (DC17) and "Open Premium Job Search" (DC18) buttons so they navigate the current tab in place instead of spawning a new tab each time.

---

## Goal

DC17 and DC18 deliberately opened their search-results URLs in a **new** tab via `chrome.tabs.create({ url })`, on the reasoning that a new tab is non-destructive regardless of what the user is currently viewing. After live testing, this has proven unwieldy: repeatedly clicking these buttons accumulates a pile of new tabs. In practice the user wants the search to simply take over the tab they are on, matching how DC19's "Next Page" already navigates in place.

This cycle switches both buttons from open-new-tab to navigate-current-tab. It is a small, deliberate reversal of the DC17/DC18 new-tab decision, and it aligns all three search-related navigations (Open Job Search, Open Premium Job Search, Next Page) on the same `chrome.tabs.update` mechanism.

## Desired Outcome

- Clicking "Open Job Search" navigates the **active tab** to the generic search-results URL instead of opening a new tab.
- Clicking "Open Premium Job Search" navigates the **active tab** to the premium search-results URL instead of opening a new tab.
- Repeated clicks reuse the same tab; no new tabs accumulate.
- The existing "not configured" guard (blank keywords/`geoId` shows a status message and opens Options) is unchanged.
- No new manifest permissions are required — DC19 already proved `chrome.tabs.update` works under the current `activeTab` grant.

---

## Tasks

### Phase 1: Switch Both Buttons to In-Place Navigation

**Status:** Work Complete

- [x] In `extension/popup/popup.js`, change the shared `openJobSearchUrl(buildUrl, failureTitle)` helper so that, after building the URL, it navigates the active tab via `chrome.tabs.update(tab.id, { url })` instead of `chrome.tabs.create({ url })`.
- [x] Obtain the active tab using the existing `getActiveTab()` helper (already used by `goToNextPage`), keeping the URL-build call inside the `try` so build failures still surface through `failureTitle`.
- [x] Confirm both `openJobSearch()` and `openPremiumJobSearch()` inherit the new behavior with no further change, since both are thin wrappers over `openJobSearchUrl`.
- [x] Leave the unconfigured-settings guard (`isJobSearchConfigured`) exactly as-is, ahead of any tab work.
- [x] Confirm no `manifest.json` permission change is required (DC19 established `chrome.tabs.update` works under the existing `activeTab` grant).

**Technical Notes:**

The only functional change is in one helper. Current code (`extension/popup/popup.js`, ~line 352):

```js
async function openJobSearchUrl(buildUrl, failureTitle) {
  const settings = await loadJobSearchSettings();
  if (!isJobSearchConfigured(settings)) {
    setStatus('error', 'Job Search Not Configured', 'Set keywords and geoId in Options, then try again.');
    openOptions();
    return;
  }

  try {
    const url = buildUrl(settings);
    await chrome.tabs.create({ url });        // <-- opens a NEW tab
  } catch (error) {
    setStatus('error', failureTitle, error.message || String(error));
  }
}
```

Target: fetch the active tab and update it in place, mirroring `goToNextPage`:

```js
  try {
    const tab = await getActiveTab();
    const url = buildUrl(settings);
    await chrome.tabs.update(tab.id, { url });
  } catch (error) {
    setStatus('error', failureTitle, error.message || String(error));
  }
```

`getActiveTab()` already exists (line ~223) and throws a clear error if no active tab is available; that error is caught and shown via `failureTitle`. The URL builders (`buildJobSearchUrl`, `buildPremiumJobSearchUrl`) and the settings/guard logic are untouched, so their existing unit tests remain valid. This is the same `chrome.tabs.update(tab.id, { url })` call DC19 introduced for "Next Page", so no new permission is involved.

### Phase 2: Verification and Documentation

**Status:** Work Complete

- [x] Run `node --check extension/popup/popup.js` and the existing test suites; confirm no regressions. No new pure module is added this cycle, so no new `.test.mjs` is expected — the builders are unchanged and the tab navigation is `chrome`-bound.
- [ ] Manually verify: on any tab, click "Open Job Search" and confirm the current tab navigates to the generic search results (no new tab).
- [ ] Manually verify: click "Open Premium Job Search" and confirm the current tab navigates to the premium search results (no new tab).
- [ ] Manually verify repeated clicks reuse the same tab rather than accumulating tabs.
- [ ] Manually verify the unconfigured case still shows the "Job Search Not Configured" status and opens Options without navigating.
- [x] Update `extension/README.md` so the "Open Job Search" and "Open Premium Job Search" descriptions say they navigate the current tab (removing the "in a new tab" wording from DC17/DC18).
- [x] Bump `extension/manifest.json` version (from `0.0.20.0` to `0.0.21.0`) for reload verification.
- [x] Record final behavior and any live-verification notes in the Completion Summary.

**Technical Notes:**

Likely verification commands:

```powershell
node --check extension\popup\popup.js
node extension\tests\pagingUrl.test.mjs
node extension\tests\searchUrlBuilder.test.mjs
node extension\tests\persistence.test.mjs
node extension\tests\captureActivePage.smoke.test.mjs
```

As with prior UI cycles, automated checks only confirm nothing regressed; the in-place navigation itself is confirmed on a live LinkedIn session. This cycle stays at `Work Complete` until the user approves `Verified`.

---

## Open Questions

1. **Should "Open Job Search" reuse the current tab even when it is not a LinkedIn page?**
   Recommendation: **yes — always reuse the current tab.** The user's testing feedback is that new tabs are unwieldy; a conditional (new tab off-LinkedIn, reuse on-LinkedIn) would reintroduce some of that unpredictability. Unlike "Next Page" — which reads and increments the *current* URL and therefore must guard that the tab is already a search page — these two buttons build a complete URL from saved settings and do not depend on the current tab's contents, so no `isLinkedInJobSearchUrl` guard is needed. Navigate whatever tab is active.

2. **Should there be an undo / confirmation since navigating replaces the current page?**
   Recommendation: **no.** This is exactly the behavior the user asked for. The browser's own Back button restores the prior page, which is sufficient.

---

## Notes and Risks

- **Deliberate reversal of DC17/DC18:** those cycles chose new-tab specifically to be non-destructive. This cycle intentionally overrides that after real-world testing. The DC17/DC18 completion notes remain accurate as history; only the live behavior changes.
- **One shared helper:** because DC18 refactored both buttons onto `openJobSearchUrl`, this is a single-point change that updates both buttons at once — low risk of the two paths diverging.
- **Navigation is destructive to the current page:** clicking now replaces whatever the user is viewing. This is the intended trade-off; Back recovers the prior page.
- **No new permissions:** `chrome.tabs.update` already works under the extension's existing `activeTab` grant, as proven by DC19's "Next Page".
- **Scope:** popup-only. No shared module, options, or background changes. DC19's "Next Page" and DC20's Recent Postings refresh are untouched (both already navigate/scan the current tab).

---

## Completion Summary

*Implementation complete; awaiting live-browser verification (repeated clicks reusing the same tab, unconfigured-guard behavior) before this cycle is marked `Verified` and moved to `completed/`.*

**Completion Date:** 2026-07-21
**Phases Completed:** Phase 1 fully; Phase 2 implementation, automated checks, and documentation complete, live browser verification pending.
**Work Deferred:** None from this cycle's scope.

**Accomplishments:**
- Changed `openJobSearchUrl(buildUrl, failureTitle)` in `extension/popup/popup.js` to fetch the active tab via the existing `getActiveTab()` helper and navigate it in place with `chrome.tabs.update(tab.id, { url })`, replacing the prior `chrome.tabs.create({ url })` new-tab call.
- `openJobSearch()` and `openPremiumJobSearch()` required no changes — both inherited the new in-place behavior automatically since they are thin wrappers over the shared helper.
- The unconfigured-settings guard (`isJobSearchConfigured`) and both URL builders (`buildJobSearchUrl`, `buildPremiumJobSearchUrl`) were untouched.
- Updated `extension/README.md`: the feature bullet and the "Open Job Search" / "Open Premium Job Search" descriptions now say the buttons navigate the active tab in place, and a line was added noting repeated clicks reuse the same tab instead of accumulating new ones.
- Bumped `extension/manifest.json` to `0.0.21.0`.

**Metrics:**
- Files modified: 3 (`popup.js`, `README.md`, `manifest.json`) plus this DevCycle document
- Automated checks: `node --check extension/popup/popup.js` passes; `pagingUrl.test.mjs`, `searchUrlBuilder.test.mjs`, `persistence.test.mjs`, and `captureActivePage.smoke.test.mjs` all pass unchanged.

**Lessons / Notes:**
- DC18's earlier refactor onto a single shared `openJobSearchUrl` helper paid off here: reversing the new-tab decision for both buttons took a one-spot code change.
- Live verification is still required: confirming both buttons actually reuse the active tab (no new tab spawned) and that repeated clicks don't accumulate tabs on a real LinkedIn session.
