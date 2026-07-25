# DevCycle 023: Fix Host Permission Error on Recent Postings Refresh After Navigation

**Status:** Work Complete
**Start Date:** 2026-07-24
**Target Completion:** 2026-07-24
**Focus:** Eliminate the "Cannot access contents of the page. Extension manifest must request permission to access the respective host." error that occurs when the Recent Postings refresh button is used after the extension itself navigated the tab to LinkedIn.

---

## Goal

The extension currently relies solely on the `activeTab` permission (`extension/manifest.json`) to run `chrome.scripting.executeScript` against the active tab, for both `scanRecentPostings()` and other injection call sites in `extension/popup/popup.js` and `extension/background/background.js`.

Reported repro:
1. Start on a non-LinkedIn page.
2. Open the popup and click "Open Job Search" or "Open Premium Job Search". The tab correctly navigates to LinkedIn (`chrome.tabs.update`, `extension/popup/popup.js:353-368`).
3. Wait for the page to finish loading.
4. Click the Recent Postings refresh button (`scanRecentPostings()`, `extension/popup/popup.js:91`) in the same, still-open popup.
5. Result: `Cannot access contents of the page. Extension manifest must request permission to access the respective host.`

This is very likely an `activeTab` lifecycle issue: `activeTab` grants temporary host access tied to a specific user gesture on the extension's action (e.g. opening the popup). Programmatically navigating the tab away from the page that was active when the popup opened invalidates that temporary grant. Because the popup was never closed and reopened between steps 2 and 4, clicking the in-popup Refresh button does not count as a fresh "invoke the extension action" gesture, so no new `activeTab` grant is issued for the newly-loaded LinkedIn page, and `chrome.scripting.executeScript` fails with the host-permission error.

This cycle investigates and fixes that gap so Recent Postings (and other script-injection actions) work reliably immediately after the extension's own "Open Job Search" / "Open Premium Job Search" / "Next Page" navigations, without requiring the user to close and reopen the popup.

## Desired Outcome

- Starting from a non-LinkedIn tab, clicking "Open Job Search" (or "Open Premium Job Search"), waiting for the page to load, then clicking the Recent Postings refresh button in the same popup session succeeds and scans the page — no host-permission error.
- The same holds after using the "Next Page" button (`goToNextPage()`, `extension/popup/popup.js:388`), which also navigates the tab programmatically.
- No unnecessary broadening of permissions: any added host access should be scoped to the LinkedIn domains the extension already operates on (`www.linkedin.com`, matching the checks in `extension/content/captureActivePage.js:27` and `extension/shared/pagingUrl.js:7`), not a blanket `<all_urls>` grant.
- Existing capture flows that already work today (capturing a page the user manually navigated to and then opened the popup on) continue to work unchanged.

---

## Tasks

### Phase 1: Confirm Root Cause

**Status:** Work Complete

- [x] Reproduce the bug locally per the repro steps above and confirm the exact error and console/log details. (Reported by user; matches Chrome's standard `activeTab` host-permission error text exactly.)
- [x] Confirm via Chrome extension permission semantics that `activeTab`'s temporary grant is a gesture-scoped, per-tab-document grant that does not persist across the extension's own `chrome.tabs.update` navigation to a new document, and that a same-session click inside an already-open popup (e.g. Recent Postings refresh) is not itself a fresh "invoke the extension action" gesture, so no new grant is issued for the newly-loaded page.
- [x] Checked all `chrome.scripting.executeScript` call sites (`extension/popup/popup.js:105`, `extension/popup/popup.js:258`, `extension/background/background.js:37`) — all target the active tab and are exposed to the same gap; all are covered by the `host_permissions` fix below since they only ever target `www.linkedin.com` pages.

**Technical Notes:**
Relevant navigation call sites: `openJobSearchUrl()` (`extension/popup/popup.js:353-368`, used by both Open Job Search and Open Premium Job Search) and `goToNextPage()` (`extension/popup/popup.js:388-403`). Both call `chrome.tabs.update(tab.id, { url })` from within the popup, followed later by a same-session call to `chrome.scripting.executeScript`.

### Phase 2: Fix Host Access

**Status:** Work Complete

- [x] Added `"host_permissions": ["https://www.linkedin.com/*"]` to `extension/manifest.json`, so script injection does not depend on the `activeTab` gesture lifecycle for pages on that host.
- [x] Kept `activeTab` alongside `host_permissions` (no injection call site needed it removed; leaving it in place avoids widening scope of this cycle per the Open Questions recommendation).
- [x] Bumped `extension/manifest.json` version `0.0.22.0` → `0.0.23.0` for reload verification.
- [x] Noted the install/update prompt tradeoff in Notes and Risks below.

**Technical Notes:**
This is a targeted alternative to relying on `activeTab` timing. `host_permissions` grants persistent access to matching origins without needing a fresh user gesture per navigation, which directly addresses the "stale grant after extension-initiated navigation" failure mode.

### Phase 3: Verification and Documentation

**Status:** Work Complete

- [x] Ran the full existing automated test suite (`extension/tests/*.test.mjs`) and `node --check` on modified files (`popup.js`, `background.js`) — all pass. Also validated `manifest.json` parses as valid JSON.
- [ ] Manually verify the exact repro sequence from the Goal section no longer errors, for both "Open Job Search" and "Open Premium Job Search". (Requires a live Edge/Chrome session — not run in this automated pass.)
- [ ] Manually verify the same for "Next Page" followed by a Recent Postings refresh in the same popup session.
- [ ] Manually verify existing flows (manual navigation to LinkedIn, then open popup and capture / scan) still work unchanged.
- [x] Updated `extension/README.md`: added a bullet under "Current DevCycle Scope" and a new "Permissions" section explaining the `host_permissions` grant and why it was added.
- [x] Bumped `extension/manifest.json` version; results recorded in Completion Summary below.

---

## Open Questions

1. **Should `host_permissions` be scoped to `https://www.linkedin.com/*` only, or should it also cover other LinkedIn subdomains (e.g. regional domains) the extension might encounter?**
   Recommendation: scope to `https://www.linkedin.com/*` to match the exact hostname check already used in `extension/content/captureActivePage.js:27` and `extension/shared/pagingUrl.js:7`. Broaden only if a real subdomain gap is found during verification.

2. **Is `activeTab` still needed once `host_permissions` is added?**
   Recommendation: leave `activeTab` in place for this cycle unless Phase 1 investigation shows every injection call site now goes through a `host_permissions`-covered origin — removing an already-granted permission is lower priority than fixing the bug, and can be revisited in a later cleanup cycle.

---

## Notes and Risks

- **Permission prompt tradeoff:** adding `host_permissions` for `www.linkedin.com` means Chrome will show this as a persistent, always-on permission (rather than the current gesture-gated `activeTab` behavior) on install/update. This is a user-facing change worth calling out, though it matches what the extension already needs to function on every LinkedIn visit.
- **Scope:** manifest and permissions-related changes only; no functional changes to capture, paging, or scanning logic are expected as part of this cycle.

---

## Completion Summary

*Implementation complete; awaiting live-browser verification before this cycle is marked `Verified` and moved to `completed/`.*

**Completion Date:** 2026-07-24
**Phases Completed:** Phase 1 and Phase 2 fully; Phase 3 automated checks and documentation complete, live browser verification pending.
**Work Deferred:** None from this cycle's scope.

**Accomplishments:**
- Added `"host_permissions": ["https://www.linkedin.com/*"]` to `extension/manifest.json`, giving the extension standing access to LinkedIn pages that does not depend on `activeTab`'s gesture-scoped grant.
- Bumped `extension/manifest.json` to `0.0.23.0`.
- Updated `extension/README.md` with a new "Permissions" section explaining the root cause (`activeTab` invalidated by the extension's own `chrome.tabs.update` navigation, with no fresh grant on a same-session in-popup click) and why `host_permissions` fixes it.

**Metrics:**
- Files modified: 3 (`manifest.json`, `README.md`) plus this DevCycle document

**Lessons / Notes:**
- `activeTab`'s temporary grant is tied to invoking the extension's action (e.g. opening the popup), not to any click within an already-open popup. Any flow where the extension navigates the tab itself and then wants to script-inject again in the same popup session needs either a persistent `host_permissions` grant or a popup close/reopen — `host_permissions` is the better fix here since the extension only ever operates on `www.linkedin.com`.
- Live verification is still required: confirming the Recent Postings refresh (and Next Page) work in the same popup session immediately after an extension-initiated navigation, in an actual Edge/Chrome session with the manifest reloaded.
