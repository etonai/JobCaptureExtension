# DevCycle 026: Move Job Search Buttons Above Recent Postings

**Status:** VERIFIED
**Start Date:** 2026-07-28
**Target Completion:** 2026-07-28
**Focus:** Reorder the popup layout so "Open Job Search" and "Open Premium Job Search" appear above the Recent Postings panel, while "Next Page" stays below it.

---

## Goal

In the current popup layout (`extension/popup/popup.html`), the Recent Postings panel (`#recentPostingsPanel`, lines 19-29) is followed by a `.button-row` containing the "Open Job Search" and "Open Premium Job Search" buttons (lines 31-34), and then the standalone "Next Page" button (line 36). The Job Search buttons are the entry points for starting a new search, so they read more naturally as a top-level action ahead of the Recent Postings results, rather than sandwiched immediately below them.

This cycle reorders the popup markup so the `.button-row` (Open Job Search / Open Premium Job Search) moves above `#recentPostingsPanel`. The "Next Page" button remains below Recent Postings, since it is a follow-on action tied to results already shown there.

## Desired Outcome

- In `extension/popup/popup.html`, the `.button-row` containing `#openJobSearchButton` and `#openPremiumJobSearchButton` appears before `#recentPostingsPanel` in document order.
- `#nextPageButton` remains after `#recentPostingsPanel`, in its current position relative to Recent Postings.
- No behavioral changes: button IDs, event wiring in `extension/popup/popup.js`, and CSS selectors in `extension/popup/popup.css` are unaffected by the reorder (pure markup move; existing class/ID-based styles and JS listeners keep working regardless of DOM order).
- Popup visually reads: header → Open Job Search / Open Premium Job Search → Recent Postings → Next Page → notice → status → capture, unchanged from there down.

---

## Tasks

### Phase 1: Reorder Popup Markup

**Status:** Work Complete

- [x] In `extension/popup/popup.html`, moved the `<div class="button-row">...</div>` block to appear immediately before `<section id="recentPostingsPanel" ...>`.
- [x] Confirmed `#nextPageButton` still directly follows the closing `</section>` of `#recentPostingsPanel`.
- [x] Checked `extension/popup/popup.css` — no `:nth-child`/sibling-combinator or other order-dependent rules reference `.button-row` or `.recent-postings-panel`; all matching rules are plain class selectors, so no CSS changes were needed.

**Technical Notes:**
Pure markup-order change. `popup.js` selects elements by ID, unaffected by DOM order.

### Phase 2: Verification

**Status:** Work Complete

- [ ] Load the extension unpacked in a Chromium browser and open the popup; visually confirm the new order (Open Job Search / Open Premium Job Search buttons above Recent Postings, Next Page below). *(Not run in this automated pass — requires a live browser session.)*
- [ ] Confirm existing behavior is unchanged: pressing Open Job Search / Open Premium Job Search still navigates and logs to `search-tracking.csv` ([[DevCycle025]] behavior); Next Page still works against an active job search results page. *(Not run in this automated pass.)*
- [x] Bumped `extension/manifest.json` version `0.0.25.0` → `0.0.26.0`.

**Technical Notes:**
No logic changes, so no test edits were needed. Re-ran the full existing suite (`persistence.test.mjs`, `captureActivePage.smoke.test.mjs`, `searchUrlBuilder.test.mjs`, `pagingUrl.test.mjs`) — all pass.

### Phase 3: Spacing Adjustments

**Status:** Work Complete

- [x] Added a little space between the `.button-row` (Open Job Search / Open Premium Job Search) and the Recent Postings section below it: `.button-row` in `extension/popup/popup.css` now has `margin-bottom: 12px` (matching the standard 12px button spacing used elsewhere).
- [x] Added a little space between the "Next Page" button and the info window (`.notice` reminder panel) below it: added an `#nextPageButton { margin-bottom: 12px; }` rule, scoped by ID rather than the shared `.secondary-button`/`.primary-button` classes so other buttons aren't affected.
- [x] Bumped `extension/manifest.json` version `0.0.26.0` → `0.0.26.1`.

**Technical Notes:**
Both gaps existed because `.button-row` and `#nextPageButton` previously had no `margin-bottom`, while the elements immediately following them (`.recent-postings-panel`, `.notice`) had no `margin-top` — so the reordered Phase 1 layout left those two seams touching. Fixed by adding `margin-bottom` at the trailing edge of each element rather than `margin-top` on the following one, to avoid affecting other buttons/panels that reuse the same shared classes elsewhere in the popup.

---

## Notes and Risks

- **Low risk:** this is a pure DOM-reorder in static HTML; no logic changes.
- **Scope:** only the position of the `.button-row` (Open Job Search / Open Premium Job Search) relative to Recent Postings changes. Next Page's position relative to Recent Postings is explicitly unchanged.

---

## Completion Summary

*Implementation complete; awaiting live-browser verification before this cycle is marked `Verified` and moved to `completed/`.*

**Completion Date:** 2026-07-28
**Phases Completed:** All three phases' code/markup/CSS changes complete; live-browser verification checklist items in Phase 2 still pending.
**Work Deferred:** None from this cycle's scope.

**Accomplishments:**
- Reordered `extension/popup/popup.html` so the "Open Job Search"/"Open Premium Job Search" button row appears above the Recent Postings panel; "Next Page" remains below it, unchanged.
- Verified no CSS or JS changes were required for the reorder itself (no order-dependent selectors, ID-based event wiring).
- Added spacing in `extension/popup/popup.css` below the button row (above Recent Postings) and below "Next Page" (above the notice panel).
- Bumped `extension/manifest.json` to `0.0.26.0`, then `0.0.26.1` for the spacing adjustments.
- Re-ran the full test suite; all tests pass.

**Metrics:**
- Files modified: 3 (`popup.html`, `popup.css`, `manifest.json`) plus this DevCycle document

**Lessons / Notes:**
- Live verification is still required: opening the popup in an actual browser to confirm the visual order and that button behavior is unaffected.
