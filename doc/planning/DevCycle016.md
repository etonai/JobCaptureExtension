# DevCycle 016: Highlight Recent Listings on LinkedIn

**Status:** VERIFIED
**Start Date:** 2026-07-20
**Target Completion:** 2026-07-20
**Focus:** Make job cards that meet the configured Recent Postings age filter immediately recognizable in LinkedIn's left-hand results list.

---

## Goal

The popup currently identifies recent postings and reports their positions, but the user must still locate those positions in LinkedIn's left-hand results list. This cycle will visually mark each qualifying job card directly on the LinkedIn page using the same saved age criterion as the popup.

The recommended treatment is a strong green accent border with a light green background tint, rather than a red border or a full neon-green fill. Red commonly communicates an error or rejection, while a solid neon fill can reduce readability and overpower LinkedIn's selected-card and hover states. The combined accent and restrained tint should remain conspicuous without obscuring card content.

## Desired Outcome

- every rendered left-hand job card that meets the user's configured Recent Postings age filter is highlighted directly on the LinkedIn results page
- highlighting uses a clearly visible green accent plus a subtle green tint, with sufficient contrast for the card's existing text and controls
- the popup's recent-posting rows and highlighted cards are produced by the same scan and therefore agree on which postings qualify
- non-qualifying cards, detail-pane content, and unrelated LinkedIn elements are not highlighted
- a rescan removes obsolete extension-owned highlights before applying the current results, so changed filters or page contents do not leave stale markers
- highlighting does not interfere with clicking, scrolling, keyboard navigation, selected-card styling, hover behavior, or LinkedIn's own controls
- duplicate postings and cards with missing company names are handled by card identity rather than display text alone
- existing capture, save, Record Listing, position, filtering, and options behavior remains unchanged
- fixture-backed and focused DOM tests verify selection, styling hooks, cleanup, and injection isolation

---

## Tasks

### Phase 1: Define the Card-Marking Contract

**Status:** Work Complete

- [x] Identify the narrowest reliable DOM element representing a complete left-hand result card across the saved LinkedIn markup variants.
- [x] Extend the recent-postings scan so each qualifying list-card result retains an internal reference to its source card while the injected function is running.
- [x] Keep DOM references out of the serialized result returned to the popup; return only the existing plain listing data and debug information.
- [x] Define extension-owned marker names (class and/or data attribute) that are unlikely to collide with LinkedIn styles.
- [x] Ensure detail-pane and whole-page fallback results never cause an unrelated left-hand card to be highlighted.

**Technical Notes:**

Likely file:

- `extension/content/captureActivePage.js`

The current scanner finds card title paragraphs in document order, then returns plain listing objects. During that same injected execution it can associate each qualifying title paragraph with its enclosing card container and mark that element before returning. The implementation must not try to recover a card later from company name, age text, or ordinal alone because duplicates and virtualized/re-rendered lists can make those identifiers ambiguous.

Card-root discovery must be demonstrated against the Docusign, Starbucks, Nordstrom HTML, and Nordstrom MHTML fixtures already used by the scanner tests. If those fixtures do not preserve a trustworthy shared wrapper, use the smallest stable enclosing region proven by the fixtures and record the limitation rather than relying on speculative LinkedIn class names.

### Phase 2: Apply Accessible Page Highlighting

**Status:** Work Complete

- [x] Add an extension-owned highlight to each qualifying left-hand card during the Recent Postings scan.
- [x] Use a high-visibility green side accent or outline together with a restrained translucent/pale-green background tint.
- [x] Avoid red as the default because it conventionally signals errors, warnings, or rejection.
- [x] Preserve the legibility of all existing text, icons, badges, and buttons inside the card.
- [x] Avoid layout shift by using an inset shadow or outline where a normal border would change card dimensions.
- [x] Keep pointer behavior unchanged and do not add overlays that intercept mouse or keyboard input.
- [x] Ensure LinkedIn's selected-card indication remains distinguishable when the selected card is also recent.
- [x] Add a non-color-only cue, such as a compact `Recent` label or a sufficiently distinct edge treatment, if needed for accessibility and quick recognition.

**Technical Notes:**

Likely files:

- `extension/content/captureActivePage.js`
- `extension/popup/popup.js` (only if orchestration or status copy needs adjustment)

Because the extension currently injects a function through `chrome.scripting.executeScript` rather than registering a persistent content stylesheet, the simplest implementation may inject an idempotent `<style>` element and apply an extension-owned data attribute to matching card roots. The style element should be reused or replaced, not duplicated on every popup open.

Recommended initial visual treatment:

- a 3–4 px inset green accent on the card's left edge
- a light translucent green background tint that preserves text contrast
- optional small `Recent` indicator only if the accent and tint are not sufficiently discoverable without relying on color

Exact colors and whether a label is necessary should be decided during implementation after rendering against a representative LinkedIn page in both selected and unselected states.

### Phase 3: Make Rescans and Dynamic Pages Safe

**Status:** Work Complete

- [x] Remove all prior extension-owned recent-card markers at the start of every scan.
- [x] Apply new markers only after the active age setting has been loaded and the current page has been evaluated.
- [x] Confirm that narrowing or widening the configured age filter updates the highlighted set on the next popup scan.
- [x] Confirm that navigating to another LinkedIn results page and rescanning does not retain stale markings.
- [x] Handle cards that LinkedIn re-renders during or after the scan without throwing or corrupting the popup result.
- [x] Keep failures fail-safe: an uncertain card root may remain unhighlighted, but the extension must not highlight a neighboring or unrelated card.

**Technical Notes:**

This cycle does not need a continuous page observer unless testing proves that LinkedIn immediately replaces marked card nodes during normal use. The baseline behavior is scan-driven: opening the popup runs the existing scan, clears old markers, and highlights the cards currently present. A `MutationObserver` would add lifecycle and performance complexity and should be introduced only with evidence that scan-driven markers do not persist long enough to be useful.

### Phase 4: Verification and Documentation

**Status:** Work Complete

- [x] Add focused tests proving only qualifying list-card elements receive the marker.
- [x] Test that non-recent cards, detail-pane results, and body-text fallback results remain unmarked.
- [x] Test cleanup of stale markers across consecutive scans with different age boundaries.
- [x] Test duplicate-company and missing-company cards without relying on their rendered labels for identity.
- [x] Preserve fixture-backed company extraction, age filtering, deduplication, and list-position assertions.
- [x] Preserve the `new Function` injection-isolation test.
- [x] Verify the injected style is idempotent and does not accumulate duplicate elements.
- [ ] Manually verify the appearance on a live LinkedIn results page, including a selected recent card and an unselected recent card.
- [x] Run syntax checks and the existing parser and persistence regression suites.
- [x] Update `extension/README.md` to describe on-page recent-posting highlights.
- [x] Bump `extension/manifest.json` according to the project version convention for reload verification.
- [x] Record the chosen visual values, implementation details, and test results in this DevCycle document.

**Technical Notes:**

Likely verification commands:

```powershell
node --check extension\content\captureActivePage.js
node --check extension\popup\popup.js
node extension\tests\captureActivePage.smoke.test.mjs
node extension\tests\persistence.test.mjs
```

The cycle must remain at `Work Complete` until the user explicitly approves `Verified`, and live visual confirmation is particularly important because fixture DOM tests cannot prove that the treatment is readable alongside LinkedIn's production CSS.

---

## Open Questions

1. **Should recent cards receive a text label as well as the green accent and tint?**
   Recommendation: begin with the accent and tint, then add a small `Recent` label only if live testing shows that the state is not obvious enough or if a non-color cue is needed. This keeps the first treatment uncluttered while explicitly testing accessibility.
   **Resolved for implementation:** used the accent, inset outline, and tint without a text label. The persistent edge and outline provide a shape cue in addition to color; live verification will determine whether a label is still desirable.

2. **Should highlights update continuously while LinkedIn changes the list?**
   Recommendation: keep highlighting tied to the existing popup scan for this cycle. Consider a content script or mutation observer later only if live testing shows that LinkedIn re-rendering removes highlights during ordinary use.
   **Resolved:** implemented scan-driven highlighting with no observer.

3. **Should the visual treatment be user-configurable?**
   Recommendation: use one well-tested default in this cycle. Color/style preferences can be a later enhancement if the default is not effective for the user's workflow.
   **Resolved:** shipped one default treatment for live evaluation.

---

## Notes and Risks

- LinkedIn markup is dynamic and has already required support for several title variants. Card-root selection must be fixture-backed and conservative.
- The scanner is injected as a self-contained function. Any new helper used during card discovery, cleanup, or marking must remain inside `captureRecentJobPostings` unless the injection architecture is deliberately changed.
- An ordinary border can alter card geometry; prefer an inset shadow or outline to avoid changing the list layout.
- A full neon-green background is highly visible but can impair readability, overwhelm status colors, and clash with selected-card styling. A pale tint plus a strong accent provides two levels of visual signal.
- Red is reserved visually by many interfaces for destructive or error states and is not the preferred semantic color for a desirable fresh posting.
- Inline styles may win too aggressively over LinkedIn states; an extension-owned class/data attribute plus a narrowly scoped injected stylesheet is easier to update and clean up.
- LinkedIn may replace DOM nodes after the scan, which can remove markers. This is acceptable for the first implementation if opening the popup reliably reapplies them; continuous observation is out of scope unless evidence makes it necessary.
- Highlights are transient page presentation. They are not saved with capture records and do not change the user's configured recent-posting threshold.

---

## Completion Summary

*Implementation complete; awaiting user verification on a live LinkedIn results page before this cycle is marked `Verified` and moved to `completed/`.*

**Completion Date:** 2026-07-20
**Phases Completed:** All implementation phases; live visual verification pending
**Work Deferred:** Continuous mutation observation and configurable highlight styling remain intentionally out of scope.

**Accomplishments:**

- Added idempotent, scan-driven recent-card highlighting inside the self-contained `captureRecentJobPostings` injection.
- Card roots are resolved conservatively as the smallest title ancestor containing the exact matching `Dismiss TITLE job` button; uncertain roots remain unmarked.
- Added stale-marker cleanup and a single reusable injected stylesheet using a green 4 px inset edge, green inset border, 2 px outline, and 16% green tint without overlays or layout-shifting borders.
- Kept DOM references internal to the injected scan and preserved the serialized listing contract.
- Added focused DOM coverage for qualifying/non-qualifying cards, widening and narrowing filters, stale cleanup, exact card identity, and stylesheet idempotence.
- Documented the transient on-page behavior and bumped the extension version to `0.0.16.0`.

**Metrics:**

- Files modified: 5 (`captureActivePage.js`, scanner tests, `README.md`, `manifest.json`, and this DevCycle document)
- Automated checks: all JavaScript syntax checks, fixture-backed scanner tests, and persistence tests pass
- Highlight lifecycle coverage: narrow filter, wide filter, stale cleanup, and idempotent style reuse

**Lessons / Notes:**

- Matching a title to the dismiss control within its nearest ancestor gives an evidence-based card identity without depending on LinkedIn's generated class names or ambiguous company/age text.
- The visible treatment still requires user judgment on a live selected and unselected card; the cycle remains `Work Complete`, not `Verified`, until that confirmation.
