# DevCycle 003: Extension Shell and Basic Capture Flow

**Status:** Verified
**Start Date:** 2026-07-05
**Target Completion:** TBD
**Focus:** Create the main Manifest V3 extension foundation with popup, options page entry point, active-tab capture messaging, and basic LinkedIn job page detection.

---

## Goal

This DevCycle creates the working extension foundation after DevCycle002 verified that Microsoft Edge supports the planned File System Access API project folder workflow.

The goal is not to build the full LinkedIn parser or final save workflow yet. The goal is to establish the source layout, extension manifest, popup flow, options entry point, content script messaging, and a minimal active-tab capture result that future DevCycles can build on.

## Desired Outcome

By the end of this DevCycle, the project should contain a loadable Microsoft Edge / Chromium Manifest V3 extension.

Clicking the extension on a supported LinkedIn job page should run a basic capture flow and display a minimal result in the popup. Unsupported pages should produce a clear user-facing message. The extension should also provide an options page entry point for future project folder configuration work.

---

## Tasks

### Phase 1: Source Layout and Tooling Decision

**Status:** Work Complete

- [x] Choose the initial source layout for the production extension.
- [x] Decide whether DC3 uses plain JavaScript or introduces TypeScript/build tooling.
- [x] Create the production extension folder structure.
- [x] Document how the extension source is organized.

**Technical Notes:**

The source layout should support the architecture described in `doc/planning/ExtensionDesign.md`:

- popup UI
- options page
- content script
- parser module
- storage module
- CSV module
- filename module
- tests/fixtures in later cycles

DC3 may keep implementation lightweight, but it should avoid mixing capture logic directly into UI code if a small module boundary is practical.

### Phase 2: Manifest V3 Shell

**Status:** Work Complete

- [x] Create `manifest.json` for the production extension.
- [x] Configure the extension action popup.
- [x] Configure an options page.
- [x] Add the minimum permissions needed for active-tab capture and extension storage.
- [x] Decide whether to use `activeTab` plus programmatic injection or persistent host/content script registration for the first shell.
- [x] Keep host permissions narrowly scoped to LinkedIn if host permissions are needed.

**Technical Notes:**

Expected permission candidates from `ExtensionDesign.md`:

- `storage`
- `activeTab` and/or `scripting`
- `https://www.linkedin.com/*` host access if persistent content scripts are used

File System Access API behavior is proven by DC2, but production project folder configuration and persistence are not the main deliverable of this cycle.

### Phase 3: Popup Capture Flow

**Status:** Work Complete

- [x] Build a simple popup UI with a clear Capture action.
- [x] Show capture status states: ready, capturing, captured, unsupported page, and error.
- [x] Add a reminder that collapsed LinkedIn descriptions should be manually expanded before capture.
- [x] Send a message from the popup to the active tab or injected content script.
- [x] Display a minimal capture result returned from the active page.
- [x] Include an entry point or link to extension options.

**Technical Notes:**

The popup should remain simple. It does not need the final editable review UI, full parser output, or save button in DC3 unless a minimal placeholder helps the flow.

The popup should make unsupported pages obvious and should not silently fail.

### Phase 4: Content Script and Minimal Page Detection

**Status:** Work Complete

- [x] Add a content script or injected function that reads the active page.
- [x] Implement a narrow first LinkedIn job page detector.
- [x] Return a minimal capture object from supported pages.
- [x] Return a structured unsupported-page result from unsupported pages.
- [x] Include the current URL and capture timestamp in the minimal result.
- [x] Include lightweight visible-page hints when available, such as document title or a candidate job heading.

**Technical Notes:**

DC3 should not attempt the full parser from DevCycle004. The detector can start narrow and conservative.

Potential first detector conditions:

- current URL hostname is `www.linkedin.com`
- URL path or visible page structure suggests a job detail view
- page contains likely job detail content such as an `About the job` section or primary job heading

The output should be shaped so DevCycle004 can replace or extend it with the full deterministic parser.

### Phase 5: Options Page Entry Point

**Status:** Work Complete

- [x] Create a basic options page.
- [x] Show that project folder configuration will live there.
- [x] Optionally include a placeholder status for project folder configuration.
- [x] Link to or reference the DC2 findings for future storage implementation.

**Technical Notes:**

Full project folder setup, File System Access API integration, JSON saving, and CSV append are planned for DevCycle005. DC3 only needs the options page entry point unless adding a small harmless placeholder is useful.

### Phase 6: Manual Load and Smoke Test

**Status:** Work Complete

- [x] Document how to load the production extension unpacked in Microsoft Edge.
- [x] Manually load the extension in Edge.
- [x] Test the popup on a non-LinkedIn page.
- [x] Test the popup on a LinkedIn non-job page if available.
- [x] Test the popup on a LinkedIn job page or saved representative page if available.
- [x] Record any limitations or follow-up items for DevCycle004.

**Technical Notes:**

This cycle should prove the extension shell is usable, not that the parser is complete.

If a live LinkedIn job page is not available during implementation, document what was tested and what remains for manual verification.

---

## Open Questions

1. **Plain JavaScript or TypeScript for the production extension?**
   Recommendation: start with plain JavaScript unless the extension structure begins to justify a build step. This keeps MV3 loading simple for early unpacked testing.

2. **Programmatic injection or persistent content script?**
   Recommendation: start with `activeTab` plus `scripting` for the capture action if it works cleanly, because it limits host access. Move to persistent content scripts only if needed.

3. **What exact first detector should define a supported LinkedIn job page?**
   Recommendation: implement a conservative detector in DC3 and refine it in DevCycle004 when parser fixtures are formalized.

4. **Should DC3 include real project folder configuration?**
   Recommendation: no. DC2 proved the storage API and DevCycle005 owns production project folder persistence. DC3 should include only the options page entry point.

---

## Notes and Risks

- DevCycle003 should not implement the full LinkedIn parser.
- DevCycle003 should not implement final JSON save or CSV append behavior.
- The extension must not automate application actions.
- Capture and parsing logic should stay separate from popup UI where practical.
- The user manually expands LinkedIn descriptions before capture; the extension should not click LinkedIn expansion controls in this MVP.
- If the source layout/tooling decision grows larger than expected, keep the cycle focused on a loadable shell and defer polish.

---

## Completion Summary

*Fill in when the cycle closes. Move this document to `doc/planning/completed/` afterward.*

**Completion Date:** 2026-07-05
**Phases Completed:** All
**Work Deferred:** None.

**Accomplishments:**
- Created the production Manifest V3 extension shell in `extension/`.
- Added popup capture UI, options page entry point, active-tab programmatic injection, and minimal LinkedIn job page detection.
- Added source layout and unpacked Edge loading documentation in `extension/README.md`.
- Added a no-dependency smoke test for the minimal page detector.

**Metrics:**
- Files added: 9
- Static checks passed: manifest JSON parse, popup JavaScript syntax, content capture JavaScript syntax
- Smoke test passed: `node extension/tests/captureActivePage.smoke.test.mjs`

**Lessons / Notes:**
The shell uses plain JavaScript with no build step and `activeTab` plus `scripting` for the first capture flow. User-reported manual Edge smoke testing passed.




