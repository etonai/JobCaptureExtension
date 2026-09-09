# DevCycle 029: Fix Recent Postings CSV Update DOMException

**Status:** Work Complete
**Start Date:** 2026-08-10
**Target Completion:** 2026-08-10
**Focus:** Investigate and fix a `DOMException` thrown from `search-tracking.csv` updates during the automatic Recent Postings scan.

---

## Goal

The extension's error page reports:

```
Failed to update search-tracking.csv Recent Postings: [object DOMException]
Context: extensions://cameoihdbafjmlnnfmikkjkoabncjlfk/popup/popup.html
Stack Trace: extensions://cameoihdbafjmlnnfmikkjkoabncjlfk/popup/popup.js (scanRecentPostings):164:15
```

This is logged from the `try/catch` around `trackRecentPostingsScan(...)` inside `scanRecentPostings()` in `extension/popup/popup.js`. The goal of this cycle is to confirm the root cause of the `DOMException` and fix it so Recent Postings tracking no longer fails under normal use.

## Desired Outcome

- The root cause of the `DOMException` is confirmed (not just hypothesized).
- `search-tracking.csv` updates succeed during normal popup usage, including the automatic scan that runs when the popup opens.
- If the failure is inherent to browser permission-prompt rules (see Working Hypothesis below), the extension degrades gracefully instead of throwing/logging a raw `DOMException` — e.g., it skips the CSV update silently or with a clear, non-exception message when permission cannot be (re)requested without a user gesture, and picks the update back up on the next user-initiated action.
- Regression coverage exists so a future change can't silently reintroduce this failure mode.

---

## Working Hypothesis

`popup.js` calls `scanRecentPostings()` unconditionally at module load time (`scanRecentPostings();` near the bottom of the file), so it runs automatically every time the popup opens, with no user click involved.

`scanRecentPostings()` calls `trackRecentPostingsScan()`, which calls `updateLastSearchTrackingRow()` in `extension/shared/saveListing.js`. That function calls `ensureProjectPermission(projectHandle)` (`extension/shared/projectFolderStore.js`), which — if the stored project folder handle's permission is not already `'granted'` — calls:

```js
await handle.requestPermission({ mode: 'readwrite' });
```

The File System Access API requires **transient user activation** to call `requestPermission()`. When it's called outside a user gesture (e.g., during an automatic popup-open scan, or some time after the last click), the browser throws a `DOMException` (typically `NotAllowedError` or `SecurityError`) instead of showing a permission prompt. `console.warn('Failed to update search-tracking.csv Recent Postings:', error)` then logs that `DOMException` object, which the extension error page renders as `[object DOMException]`.

This would explain why the error is tied specifically to `scanRecentPostings` (the one Recent-Postings-related code path that runs without a preceding click) rather than to `appendSearchTrackingRow`, which is only called from `openJobSearch`/`openPremiumJobSearch` button handlers.

---

## Tasks

### Phase 1: Confirm Root Cause

**Status:** Work Complete

- [ ] Reproduce the error locally (load the unpacked extension, open the popup on a LinkedIn jobs page) and capture the actual `DOMException.name`/`message` (not just its stringified form) to confirm it is a permission/user-activation failure and not something else (e.g., a closed/stale file handle, a revoked permission, a different `NotFoundError`/`InvalidStateError`). **Not performed** — requires a live browser session; deferred to user verification (see Completion Summary).
- [x] Confirm whether the project folder's stored permission is `'granted'` at the time the automatic scan runs, or whether it has reverted to `'prompt'` (browsers can drop File System Access permissions between sessions/tab reloads). Confirmed by code inspection: `ensureProjectPermission` only skips `requestPermission()` when `queryProjectPermission()` already returns `'granted'`; any other state (including `'prompt'` after a browser restart) falls through to `requestPermission()`.
- [x] Check whether `ensureProjectPermission`'s `requestPermission({ mode: 'readwrite' })` call is reached during the automatic popup-open scan versus only during later user-initiated actions. Confirmed: `scanRecentPostings()` runs unconditionally at module load (`scanRecentPostings();` at the bottom of `popup.js`, with no preceding click), and its call chain (`trackRecentPostingsScan` → `updateLastSearchTrackingRow` → `ensureProjectPermission`) reaches `requestPermission()` whenever permission isn't already granted — exactly the `scanRecentPostings` stack frame in the reported error.
- [x] Determine whether `updateLastSearchTrackingRow` needs `readwrite` permission at all for this path, or whether a read-only check plus a deferred write would be sufficient — compare against what `ensureProjectReadPermission` already does for the prior-company-cache path. Decision: it still needs `readwrite` to perform the write, but it does not need to *request* permission from this path — checking whether `readwrite` is already `'granted'` (via `queryProjectPermission`, which queries `mode: 'readwrite'`) and skipping otherwise is sufficient, mirroring how `ensureProjectReadPermission` is read-only but does still call `requestPermission({ mode: 'read' })` from a path that always follows a capture button click (a user gesture).

**Technical Notes:**
Relevant files: `extension/popup/popup.js` (`scanRecentPostings`, `trackRecentPostingsScan`, the unconditional `scanRecentPostings();` call), `extension/shared/saveListing.js` (`updateLastSearchTrackingRow`, `appendSearchTrackingRow`), `extension/shared/projectFolderStore.js` (`ensureProjectPermission`, `queryProjectPermission`).

### Phase 2: Fix and Harden

**Status:** Work Complete

- [x] Change the failing code path so it does not call `requestPermission()` outside a user gesture. `updateLastSearchTrackingRow` (`extension/shared/saveListing.js`) now calls `queryProjectPermission(projectHandle)` instead of `ensureProjectPermission(projectHandle)`, and returns `{ ok: false, skipped: true, reason }` without writing when permission is not already `'granted'`. `appendSearchTrackingRow` (called only from button-click handlers) is unchanged and still uses `ensureProjectPermission`.
- [x] Ensure a skipped/deferred CSV update does not lose data — the running Recent Postings total should still be persisted on the next user-initiated action that does have activation (e.g., pressing the refresh button or Next Page), consistent with [[DevCycle028]]'s accounting invariant. The session-stored running total (`chrome.storage.session`, via `recentPostingsTracking.js`) is saved before the CSV update is attempted, so a skipped write only delays persistence to `search-tracking.csv`; the in-popup total and the next successful write (whenever permission is granted) remain correct.
- [x] Improve the warning logged on failure to include `error.name` and `error.message` rather than relying on default object stringification. Both `scanRecentPostings()`'s and `goToNextPage()`'s catch blocks in `popup.js` now log `` `${error?.name || 'Error'}: ${error?.message || String(error)}` `` instead of the raw error object; skipped (non-thrown) updates log via `console.debug` with `result.reason`.
- [x] Add regression coverage that simulates a project folder handle whose permission is not pre-granted and confirms the update no longer throws and the tracking state is preserved for a later successful write. Added `runUpdateLastSearchTrackingRowSkipsWithoutPromptTest` in `extension/tests/persistence.test.mjs`, which makes `requestPermission` throw if called, confirms the skip path never calls it and leaves the CSV row unchanged, then confirms a later call succeeds once permission is granted.

**Technical Notes:**
Keep CSV tracking best-effort per [[DevCycle027]]/[[DevCycle028]] — a permission failure must never block the popup UI, capture, save, or navigation. Bumped `extension/manifest.json` version from `0.0.28.1` to `0.0.29.0` and documented the new skip behavior in `extension/README.md`.

---

## Open Questions

1. **Should the automatic popup-open scan write to `search-tracking.csv` at all, or only user-initiated scans (refresh button, Next Page)?**
   Recommendation: Keep updating on both if permission is already granted (no behavior change for the common case), but never prompt for permission from the automatic scan. This preserves DevCycle028's intent while removing the unsolicited-prompt failure mode.

---

## Notes and Risks

- **Dependency:** Builds on the Recent Postings accounting and CSV schema introduced in [[DevCycle027]] and [[DevCycle028]].
- **Risk:** If permission is skipped during the automatic scan and the user never performs a later user-gesture action on that page load, the running total update for that scan may never be persisted. Desired Outcome accepts this as better than throwing, but Phase 2 should minimize how often it happens.

---

## Completion Summary

**Completion Date:** 2026-08-10
**Phases Completed:** All
**Work Deferred:** Live-browser reproduction/verification (see below).

**Accomplishments:**
- Confirmed by code inspection that `updateLastSearchTrackingRow` reached `requestPermission({ mode: 'readwrite' })` from the automatic, non-user-gesture popup-open scan, which the File System Access API rejects with a `DOMException` outside transient user activation.
- Changed `updateLastSearchTrackingRow` (`extension/shared/saveListing.js`) to only query — never request — permission, skipping the write and returning `{ skipped: true, reason }` when permission is not already granted, instead of throwing.
- Updated `popup.js`'s warning logs to include `error.name`/`error.message`, and to log skipped updates at `console.debug` instead of surfacing them as failures.
- Added a regression test (`runUpdateLastSearchTrackingRowSkipsWithoutPromptTest`) that fails if `requestPermission` is ever called from this path, and verifies the skip/recover behavior.
- Updated `extension/README.md` and bumped the extension version to `0.0.29.0`.

**Metrics:**
- Files modified: 5 (`extension/shared/saveListing.js`, `extension/popup/popup.js`, `extension/tests/persistence.test.mjs`, `extension/README.md`, `extension/manifest.json`) plus this DevCycle document.
- Tests passing: all five suites (`persistence`, `captureActivePage` smoke, `popup.module` smoke, `pagingUrl`, `searchUrlBuilder`).

**Lessons / Notes:**
This fix is based on static analysis of the File System Access API's transient-activation requirement for `requestPermission()`, not a live-browser reproduction of the reported `[object DOMException]` error — no browser environment was available in this session. Per [[DevelopmentProcess]], this cycle stops at Work Complete; a live-browser smoke test (open the popup on a LinkedIn jobs page with the project folder's permission not pre-granted, confirm no error-page entry appears and Recent Postings still works) is needed before this can be marked Verified.
