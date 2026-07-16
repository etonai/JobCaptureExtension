# Idea: Auto-Select the First Recent Posting in the LinkedIn Results List

**Author:** Claude (Fable), 2026-07-15
**Status:** Feasibility analysis — no implementation

## The Idea

The extension popup already scans the active LinkedIn search-results page and
lists postings from the last two hours (DevCycle013, `captureRecentJobPostings`).
On the LinkedIn page itself, the left panel shows the first page of job cards
and the right panel shows the detail of whichever card is selected.

Proposal: the extension finds the first recent posting from its own list and
selects the corresponding card in the left panel, so the right panel shows
its detail exactly as if the user had clicked that card.

## Verdict

**Feasible, with one moderate risk that can only be verified on a live page.**

Locating the correct card in the DOM is essentially solved — it reuses the
title-detection machinery that DevCycle013 already verified against both real
saved fixtures. The uncertain step is whether a programmatically dispatched
click actually activates LinkedIn's card-selection handler. That is likely
(see analysis below) but cannot be proven against saved HTML, because saved
pages carry no live event handlers. There is a guaranteed-feasible fallback
(scroll the card into view and highlight it) if synthetic clicks turn out not
to work.

Estimated effort: one small dev cycle. Most of the work is plumbing and
verification discipline, not new parsing.

## How Selection Would Work

### Step 1 — Find the card's DOM node (LOW RISK, already solved)

`listCardListings()` in `extension/content/captureActivePage.js` already
identifies each results-list card by its title `<p>`, using two signals
verified against both real fixtures (`Starbucksmoreunselectedbare.html` and
`Senior Software Engineer _ Docusign _ LinkedIn.html`):

- the echo-span title pattern (Starbucks markup variant), and
- title text matching a `button[aria-label="Dismiss <TITLE> job"]` label
  (present once per card, 25/25, in **both** variants).

The scan walks paragraphs in document order, so the first listing whose
`companySource` is `'list-card'` corresponds to the topmost recent card in
the left panel. To act on it later, the scan result needs to carry an
identifier the selection step can re-find — the title text (plus its
occurrence index, since duplicate titles across cards are real, e.g. the two
Remitly cards in the Docusign fixture) is sufficient and already available.

Note the ordering subtlety: the listings array may start with the
`detailPageListing()` entry (the already-open job) and may contain
`companySource: 'missing'` rows from the whole-page text fallback. Only
`'list-card'` rows have a locatable DOM node. "First recent posting" should
mean the first `'list-card'` row; if the scan fell back to whole-page text
(no structural cards found), this feature simply has nothing to click and
should say so rather than guess.

### Step 2 — Activate the card (MODERATE RISK, the crux)

What "clicking a card" means differs between LinkedIn's two live markup
variants, and this is where the feasibility question actually lives:

- **Docusign variant (SDUI/React):** the card is **not an anchor**. Zero
  literal `href="...currentJobId..."` attributes exist in the fixture body;
  the per-card job URLs (`/jobs/search-results/?currentJobId=<id>`) appear
  only inside embedded JSON action payloads (`proto.sdui.actions.*`).
  Selection is handled by a JS event handler on the card, via framework
  event delegation. Programmatic activation therefore means dispatching a
  synthetic click on (or inside) the card subtree:

  ```js
  titleParagraph.scrollIntoView({ block: 'center' });
  titleParagraph.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  ```

  React-style delegated handlers do fire on synthetic events (React does not
  check `isTrusted`), so this very likely works — but "very likely" is a
  probability judgment about unseen handler code, not a verified fact. Some
  handlers key off `pointerdown`/`mouseup` rather than `click`; a robust
  implementation should dispatch the full sequence
  (`pointerdown` → `mousedown` → `pointerup` → `mouseup` → `click`).

- **Starbucks variant:** card links exist as real `<a>` elements, but in the
  saved fixture all 21 carry the **same** `currentJobId` (the open job's),
  so the href alone cannot be trusted to identify which card it opens —
  hrefs may be rewritten dynamically at click time. Dispatching a click on
  the card (as above, or `anchor.click()`) remains the right mechanism;
  navigating by copying the saved href is not reliable.

A tempting alternative — extracting the target job ID and navigating to
`.../jobs/search-results/?currentJobId=<id>` directly — is **not** reliably
available: the ID is absent from the card DOM in both fixtures (no
`data-job-id`, dismiss buttons carry only a random `componentkey`), and
fishing it out of the embedded JSON blobs by title-matching would be exactly
the kind of unverified guesswork DevCycle013 spent thirteen patch versions
paying for.

### Step 3 — Wire it to the popup (LOW RISK, established pattern)

The popup already injects `captureRecentJobPostings` via
`chrome.scripting.executeScript({ func })` with the `activeTab` + `scripting`
permissions it has today; no manifest change is needed. Selection is a second
injected function, e.g.
`executeScript({ func: selectRecentPosting, args: [titleText, occurrenceIndex] })`,
which re-finds the title paragraph and dispatches the click. The page updates
its right panel; the popup stays open (script injection does not close it).

**Hard constraint learned the expensive way in DC13 (0.0.13.6–0.0.13.10):
the injected function must be fully self-contained.** `executeScript({ func })`
serializes only that one function's body — it cannot call `dismissButtonTitles`
or any other sibling from the module. The title-matching logic needed to
re-find the card must be duplicated inside `selectRecentPosting`, and the
existing `new Function(...)` injection-isolation test pattern
(`runRecentPostingsIsInjectionSafeTest`) must cover it from day one.

## Risks and Mitigations

| # | Risk | Likelihood | Mitigation |
|---|------|-----------|------------|
| 1 | Synthetic click doesn't trigger LinkedIn's selection handler | Low–moderate | Dispatch full pointer/mouse event sequence; verify on live page before claiming done. Fallback: `scrollIntoView` + temporary visual highlight of the card, leaving the actual click to the user — strictly better than today and guaranteed to work. |
| 2 | Card re-found incorrectly between scan and click (page re-rendered, list virtualized/scrolled) | Low | Re-run detection inside `selectRecentPosting` itself (don't cache DOM references across injections — impossible anyway); match by title text + occurrence index; report a clear failure if the title is no longer present. |
| 3 | Third, unseen markup variant | Known, accepted | Same posture as DC13: the feature degrades to "nothing to select" with a debug count, never a wrong click. Dismiss-button labels are the most stable cross-variant signal found so far. |
| 4 | Right panel loads asynchronously after the click | Certain, minor | Out of scope to wait on it. If a follow-up wants auto-capture-after-select, it must poll the detail pane for the expected title before capturing — do not bolt that on in v1. |
| 5 | Clicking navigates the whole page (anchor variant) instead of SPA-swapping the pane | Possible | Acceptable outcome — the detail still ends up displayed. Do not `preventDefault` anything. |

## Design Decision to Settle Before Implementing

**Auto-select on popup open vs. explicit user action.** DevCycle013
deliberately established that the popup-open scan is *read-only* and has no
side effects on the page. Auto-selecting on open would break that: opening
the popup would change what the LinkedIn page shows, every time, even when
the user only wanted to capture the already-open job — and the "first" recent
posting may be one they already looked at.

Recommendation: make selection an explicit action — either make each row in
the recent-postings list clickable (more useful: pick *any* recent posting,
not just the first) or add a small "Open first" button next to the count.
The row-click version is barely more work than first-only, since the
selection function takes a title argument either way, and it turns the
recent-postings panel from a passive signal into a navigator.

## Verification Standard

Per the standard adopted at the end of DC13: fixture-based tests can verify
card *location* (both real fixtures should be wired in, asserting the right
title paragraph is chosen for a given listing), but no fixture can verify the
*click* takes effect, because saved HTML has no event handlers. The feature
is not "working" until the user confirms, on a live LinkedIn results page,
that invoking selection changes the right panel to the expected posting.
Plan the cycle to end with that live check, and treat the highlight-only
fallback as the shippable floor if the click proves unreliable.

## Effort Estimate

- New injected `selectRecentPosting(title, index)` function: ~80–120 lines,
  mostly duplicated (deliberately) title-detection logic.
- Popup wiring (clickable rows or button, status messaging): small.
- Tests: fixture-backed locator tests for both variants + injection-isolation
  test: moderate, patterns already exist in
  `extension/tests/captureActivePage.smoke.test.mjs`.
- Live verification with the user: required, one round if the click works,
  two if we fall back to highlight-only.
