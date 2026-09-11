# DevCycle 036: Reposition Hide Blacklisted Button

**Status:** Verified
**Start Date:** 2026-09-11
**Target Completion:** 2026-09-11
**Focus:** Move the "Hide Blacklisted" button to the very bottom of the popup window, below every other element.

---

## Goal

DevCycle035 added a "Hide Blacklisted" button positioned below the Notes field, ahead of the Save/Record buttons and the Capture Summary result panel (`extension/popup/popup.html:60`). In practice this places it in the middle of the popup's primary action flow, where it competes for attention with capture-related controls. This cycle relocates it to the bottom of the popup, after everything else — including the result panel — so it sits apart from the main capture workflow as a distinct, secondary action.

## Desired Outcome

- The "Hide Blacklisted" button (`#hideBlacklistedButton`) is the last element rendered in the popup, after `#resultPanel` (and after any other section currently below it).
- No change to the button's behavior, labeling, wiring (`popup.js`), or feedback states — this is a layout-only change.
- Visual spacing/styling around the button (and the elements that now precede it) still looks intentional, not like an afterthought — verified manually in the popup.

---

## Tasks

### Phase 1: Move the Button

**Status:** Work Complete

- [x] In `extension/popup/popup.html`, move the `#hideBlacklistedButton` markup from its current position (before `#saveButton` / `#recordListingButton`) to after `#resultPanel`, as the last child of `.popup-shell`.
- [x] Review `extension/popup/popup.css` for any styling that assumed the button's old position (e.g., margin/spacing rules tied to adjacent siblings) and adjust if needed.
- [x] Confirm `popup.js` wiring (`runHideBlacklisted()` and its element lookup) is purely ID-based and requires no changes after the move.

**Technical Notes:**
The button markup moved as-is; no ID or handler changes were needed since `popup.js` looks it up via `document.querySelector('#hideBlacklistedButton')`. `popup.css` styles it purely via the shared `.secondary-button` class (`margin-top: 12px`, full width), which required no adjustment — the standard top margin provides consistent spacing after `#resultPanel` just as it did after the Notes field.

### Phase 2: Verification

**Status:** Verified

- [x] Run the existing popup test suite (`extension/tests/popup.module.smoke.test.mjs`) to confirm no regressions from the DOM reordering.
- [x] Manually load the extension popup and confirm the button appears at the bottom, below the Capture Summary panel, with reasonable spacing.
- [x] Bump the extension version.

**Technical Notes:**
All five test suites pass (`captureActivePage.smoke`, `pagingUrl`, `persistence`, `popup.module.smoke`, `searchUrlBuilder`) — the popup tests are ID-based, not DOM-order-based, so they were unaffected by the move. Extension version bumped `0.0.35.0` → `0.0.36.0`. Manual verification in the loaded popup confirmed by the user.

---

## Notes and Risks

- **Risk:** `popup.js` or its tests could reference sibling/DOM-order relationships (e.g., `nextElementSibling`) rather than IDs; confirm this isn't the case before moving.
- **Scope boundary:** Layout/positioning only. No changes to blacklist matching logic, feedback copy, or the button's styling class.

---

## Completion Summary

*Fill in when the cycle closes. Move this document to `doc/planning/completed/` afterward.*

**Completion Date:** 2026-09-11
**Phases Completed:** All
**Work Deferred:** None

**Accomplishments:**
- Moved `#hideBlacklistedButton` in `extension/popup/popup.html` to the end of `.popup-shell`, after `#resultPanel`, so it is the last element in the popup.
- Confirmed no CSS or JS changes were needed: styling is class-based (`.secondary-button`) and element lookup is ID-based.
- Ran all five extension test suites: all pass.
- Bumped the extension version (`0.0.35.0` → `0.0.36.0`).

**Metrics:**
- Files modified: 3 (`popup.html`, `manifest.json`, this DevCycle document)

**Lessons / Notes:**
Because the button's styling and wiring never depended on its position in the DOM (class-based CSS, ID-based JS lookup), the relocation was a pure markup move with no ripple effects — a good sign that DevCycle035 didn't introduce positional coupling.
