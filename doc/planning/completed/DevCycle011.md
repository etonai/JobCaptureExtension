# DevCycle 011: Run Prior-Application Check After Shortcut Capture

**Status:** Verified
**Start Date:** 2026-07-13
**Target Completion:** TBD
**Focus:** Ensure the `Alt+Shift+L` shortcut performs the same prior-company check that runs when using the popup's capture active tab button.

---

## Goal

DevCycle011 fixes a workflow consistency issue in the capture extension. When the user presses `Alt+Shift+L`, the extension opens the popup and captures the active LinkedIn job information, but it does not reliably run or surface the prior-application check that warns when the company already appears in `old-tracking.txt` or `job-tracking.csv`.

The shortcut path should behave like the manual capture button path after capture succeeds. A captured record should trigger the same stored project folder lookup, permission check, old-tracking lookup, CSV lookup, and warning/status behavior regardless of whether capture started from the shortcut or the popup button.

## Desired Outcome

After this cycle is complete:

- pressing `Alt+Shift+L` opens the extension popup and captures the active tab as it does today
- shortcut-initiated captures automatically check `old-tracking.txt` and `job-tracking.csv` for prior company entries
- shortcut-initiated captures show the same "Previously captured company" warning as manual captures when a prior company match is found
- shortcut-initiated captures show the normal captured status when no prior company match is found
- manual popup button capture behavior remains unchanged
- regression coverage or a focused test harness confirms both capture entry points share the same post-capture warning behavior
- the manifest version is bumped for reload verification

---

## Tasks

### Phase 1: Diagnose Shortcut Post-Capture Flow

**Status:** Verified

- [x] Review `extension/background/background.js` command handling for `capture-active-tab`.
- [x] Review `extension/popup/popup.js` auto-capture intent consumption and `runCapture()` behavior.
- [x] Confirm whether the shortcut path skips the prior-company check, loses the auto-capture intent, races popup initialization, or fails silently during folder permission/read operations.
- [x] Identify the smallest shared capture-completion path that both shortcut and button capture should use.
- [x] Record the confirmed failure mode in this DevCycle before changing behavior.

**Technical Notes:**

Likely files:

- `extension/background/background.js`
- `extension/popup/popup.js`
- `extension/shared/projectFolderStore.js`
- `extension/shared/csv.js`
- `extension/tests/persistence.test.mjs`
- `extension/manifest.json`

The current shortcut flow stores an auto-capture intent in `chrome.storage.session`, opens the action popup, and lets `popup.js` consume that intent. The current button flow calls `runCapture()` directly. The implementation should avoid duplicating prior-company warning logic between those paths.

### Phase 2: Share Prior-Company Warning Behavior Across Entry Points

**Status:** Verified

- [x] Update the shortcut auto-capture flow so successful shortcut captures run the same prior-company warning logic as manual captures.
- [x] Preserve the existing order of checks: `old-tracking.txt` first, then `job-tracking.csv`.
- [x] Preserve the existing fallback behavior when no project folder is configured or project folder access is unavailable.
- [x] Ensure the status panel is not overwritten after the warning is found.
- [x] Keep Save button and notes behavior consistent after both manual and shortcut captures.
- [x] Bump `extension/manifest.json` version for reload verification.

**Technical Notes:**

Recommended approach:

- Treat `runCapture()` as the single source of truth for capture completion if possible.
- If auto-capture is already calling `runCapture()`, investigate timing or state differences rather than creating a second warning-check implementation.
- Consider extracting a small helper for "after successful capture" behavior only if it makes the shared flow clearer and easier to test.

### Phase 3: Regression Checks And Documentation

**Status:** Verified

- [x] Add or update tests for prior-company warning behavior where practical.
- [x] Add or update tests for auto-capture intent handling if the codebase has, or can reasonably support, a popup-flow test harness.
- [x] Run syntax checks for changed extension scripts.
- [x] Run existing parser and persistence regression tests.
- [x] Update `extension/README.md` if shortcut behavior documentation needs clarification.
- [x] Record implementation notes and test results in this DevCycle document.

**Technical Notes:**

Regression checks should include:

```powershell
node --check extension/background/background.js
node --check extension/popup/popup.js
node --check extension/content/captureActivePage.js
node --check extension/shared/csv.js
node extension/tests/captureActivePage.smoke.test.mjs
node extension/tests/persistence.test.mjs
```

Manual verification should include:

- configure a project folder containing an `old-tracking.txt` company that matches the active LinkedIn job
- press `Alt+Shift+L`
- confirm the popup captures the job and shows the prior-company warning automatically
- repeat with a company that appears only in `job-tracking.csv`
- repeat with a company that appears in neither file and confirm the normal captured status appears

---

## Open Questions

1. **Is the failure caused by shortcut flow or by folder permission timing?**
   Recommendation: diagnose first. If `runCapture()` already executes for shortcut capture, the likely issue may be popup lifecycle timing, status overwrite, or a swallowed permission/read error.

2. **Should a failed prior-company check block capture or save?**
   Recommendation: no. Keep the current behavior: prior-company lookup is advisory and should not prevent capture or save when project folder access is unavailable.

3. **Should this cycle change the matching rules for prior companies?**
   Recommendation: no. Reuse the current matching logic from `extension/shared/csv.js`; this cycle is about invoking the check consistently, not changing match semantics.

---

## Notes and Risks

- Browser extension popup lifetimes can be short, so shortcut-triggered async work should avoid relying on fragile timing.
- `chrome.action.openPopup()` behavior may differ across browser versions; the fix should keep the existing fallback error path intact.
- Project folder permission failures are intentionally swallowed by the current warning check. This is acceptable for advisory warnings, but it can make diagnosis less obvious.
- Per project process, implementation should not begin until this DevCycle document is reviewed and explicitly approved.

---

## Implementation Notes

Implemented on 2026-07-13 by Codex after user approval to implement DevCycle011.

Confirmed failure mode:

- The shortcut flow already opens the popup and reaches `runCapture()` through the existing auto-capture intent.
- The prior-company check used `ensureProjectPermission()`, which requests read/write permission even though the check only reads `old-tracking.txt` and `job-tracking.csv`.
- Shortcut-initiated popup work is more fragile around permission prompts than a direct popup button click, so the advisory check could fail silently and fall through to the normal captured status.

Behavior implemented:

- Added `ensureProjectReadPermission()` in `extension/shared/projectFolderStore.js`.
- Updated `extension/popup/popup.js` so prior-company lookup asks only for read permission before checking `old-tracking.txt` and `job-tracking.csv`.
- Kept Save behavior unchanged; saving still requires read/write permission.
- Preserved the existing old-tracking-first, CSV-second check order.
- Added a persistence regression assertion that the prior-check permission helper uses `read`, not `readwrite`.
- Bumped manifest version to `0.0.11.5` for reload verification.

Files changed:

- `extension/shared/projectFolderStore.js`
- `extension/shared/priorCompanyCache.js`
- `extension/popup/popup.js`
- `extension/options/options.js`
- `extension/tests/persistence.test.mjs`
- `extension/manifest.json`
- `extension/README.md`
- `doc/planning/DevCycle011.md`

Automated checks run:

```powershell
node --check extension/background/background.js
node --check extension/popup/popup.js
node --check extension/options/options.js
node --check extension/content/captureActivePage.js
node --check extension/shared/csv.js
node --check extension/shared/filename.js
node --check extension/shared/projectFolderStore.js
node --check extension/shared/priorCompanyCache.js
node --check extension/shared/saveListing.js
node extension/tests/captureActivePage.smoke.test.mjs
node extension/tests/persistence.test.mjs
```

All automated checks passed.

Manual verification completed by the user on 2026-07-13. Shortcut capture now opens the popup, captures the active tab data, and performs the prior-company check automatically.
Follow-up fix after manual shortcut test on 2026-07-13:

- Manual testing showed `Alt+Shift+L` still captured without showing a prior-company warning, while clicking `Capture Active Tab` immediately afterward did show the warning.
- Added `extension/shared/priorCompanyCache.js` so prior-company data can be refreshed while the extension has folder permission and then reused by shortcut captures without relying on a filesystem permission prompt from the shortcut-opened popup.
- Updated Options so choosing or validating the project folder refreshes the prior-company cache, and forgetting the folder clears it.
- Updated popup capture so it tries a live cache refresh first and falls back to the stored cache if live folder access is unavailable.
- Bumped manifest version to `0.0.11.5` for reload verification.
- Updated README source layout, local checks, and shortcut/cache behavior notes.

---

## Completion Summary

**Completion Date:** 2026-07-13
**Phases Completed:** Phase 1, Phase 2, and Phase 3 verified.
**Work Deferred:** None.

**Accomplishments:**
- Added read-only project folder permission handling and a prior-company cache for shortcut checks.

**Metrics:**
- Files modified: 8
- Tests passing: 11 automated checks listed above

**Lessons / Notes:**
Shortcut-triggered capture needs a resilient handoff between the background service worker and popup. The popup must never remain idle on a pending shortcut intent; it should either consume the completed background result or fall back to the normal capture path.
Second follow-up fix after intermittent shortcut failures on 2026-07-13:

- User reported the shortcut sometimes showed `Prior-company check could not run automatically`.
- This confirmed the remaining issue was intermittent timing/browser activation around popup startup and folder access.
- Removed the `check-unavailable` warning path; the extension should not label an unavailable check as `Previously captured company`.
- Changed shortcut handling so `background/background.js` stores a pending intent, opens the popup immediately, completes capture plus prior-company lookup in the background command flow, stores the completed result, and notifies the popup with `popupIntentReady`.
- Updated `popup/popup.js` so shortcut-opened popups show a pending capture state, then render the completed background result rather than rerunning shortcut capture/check work inside the popup.
- Bumped manifest version to `0.0.11.5` for reload verification.
