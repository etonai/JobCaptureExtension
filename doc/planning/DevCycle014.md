# DevCycle 014: Recent Postings List Position

**Status:** Planning
**Start Date:** 2026-07-15
**Target Completion:** 2026-07-15
**Focus:** Show each recent posting's position in the LinkedIn left-hand results list, as `# CompanyName`, so the user can find the card on the page.

---

## Goal

The popup's recent-postings section (DevCycle013) tells the user *that* fresh
postings exist, but not *where* they are in LinkedIn's left-hand results list.
The user still has to scan the list manually to find them. This cycle adds the
card's ordinal position to each row — `5 Armada` instead of `Armada` — so the
user can count down the left panel directly to the posting.

## Desired Outcome

- Each recent posting sourced from a results-list card displays as
  `# CompanyName`, where `#` is that card's 1-based position among the cards
  detected in the left-hand list (counting all detected cards, not just
  recent ones — the number must match what the user sees when counting down
  the page).
- Listings that have no list position — the open job from the detail pane
  (`companySource: 'detail-page'`) and unresolved rows from the whole-page
  text fallback (`companySource: 'missing'`) — render without a number,
  unchanged from today.
- The age text, ordering, dedup behavior, and all existing capture/save/record
  workflows remain unchanged except where noted in Open Questions.
- Position correctness is asserted against both real saved fixtures
  (Starbucks and Docusign variants), not synthetic mocks.

---

## Tasks

### Phase 1: Attach List Position in the Scanner

**Status:** Planning

- [ ] In `listCardListings()` (`extension/content/captureActivePage.js`),
      record each detected title paragraph's 1-based ordinal among **all**
      detected title paragraphs (the full card list), and attach it to each
      qualifying listing as `listPosition`.
- [ ] Leave `listPosition` absent (or `null`) on listings from
      `detailPageListing()` and `bodyTextAgeListings()`.
- [ ] When the detail-pane listing and a positioned card listing are the same
      posting (same normalized company + age), keep the position — the
      deduplicated survivor must carry `listPosition` (see Open Question 1).
- [ ] Keep `captureRecentJobPostings` fully self-contained — no references to
      anything outside its own function body (the 0.0.13.6–0.0.13.10
      injection-boundary bug class).

**Technical Notes:**

The position must be the index among all detected cards, not among recent
ones: `listCardListings()` already collects `titleIndexes` for every card
title paragraph in document order before filtering by age, so the ordinal
(`t + 1` in the existing loop) is already available at the point each
listing is built. This is a small data-plumbing change, not new parsing.

Known accuracy limits to document in code comments, not to solve here:

- If a card's title paragraph evades both detectors (echo-span and
  dismiss-button text), every position after it is off by one. The DC13
  fixture tests give confidence for the two known markup variants.
- LinkedIn may lazy-render the list; positions are relative to the cards
  present in the DOM at scan time.

### Phase 2: Render the Position in the Popup

**Status:** Planning

- [ ] In `setRecentPostingsState()` (`extension/popup/popup.js`), render
      `listing.listPosition` before the company name when present, per the
      display format decided in Open Question 2.
- [ ] Rows without `listPosition` render exactly as today
      (`CompanyName` / `Unknown company`).
- [ ] Confirm the row still fits the popup width with a two-digit position
      (25-card pages are the norm in the fixtures); adjust
      `extension/popup/popup.css` only if needed.

**Technical Notes:**

The popup builds each row as `<strong>company</strong><span>age</span>`.
Keep the position inside the existing row structure (e.g. part of the
`<strong>` text or a small preceding span) so the layout and CSS churn stay
minimal.

### Phase 3: Fixture-Backed Verification

**Status:** Planning

- [ ] Extend `runRecentPostingsDocusignFixtureTest` and
      `runRecentPostingsStarbucksFixtureTest`
      (`extension/tests/captureActivePage.smoke.test.mjs`) to assert the
      expected `listPosition` for every recent listing. Derive the expected
      numbers by counting cards in the fixtures during implementation — do
      not hand-wave them.
- [ ] Assert detail-page and fallback listings carry no `listPosition`.
- [ ] Confirm `runRecentPostingsIsInjectionSafeTest` still passes (the
      `new Function` isolation check).
- [ ] Run the standard verification commands (below).
- [ ] Bump `extension/manifest.json` to `0.0.14.x` and update
      `extension/README.md` if it describes the recent-postings rows.

**Technical Notes:**

Verification commands (per DC13 precedent):

```powershell
node --check extension\content\captureActivePage.js
node --check extension\popup\popup.js
node extension\tests\captureActivePage.smoke.test.mjs
node extension\tests\persistence.test.mjs
```

Per the verification standard adopted at the end of DC13: fixture tests are
necessary but not sufficient. The cycle is not `Verified` until the user
confirms on a live LinkedIn results page that the displayed numbers match
the actual card positions when counting down the left panel.

---

## Open Questions

1. **When the open job's detail-pane listing dedups against its own list
   card, which row survives?**
   Today `uniqueListings()` keeps the first occurrence, and the detail
   listing is placed first — so the position would be lost.
   Recommendation: prefer the positioned card listing when both resolve to
   the same company + age (or merge the position onto the detail listing).
   Either way the surviving row must show a number.

2. **Exact display format for the position?**
   The request reads literally as `# CompanyName` with `#` being the number,
   e.g. `5 Armada`.
   Recommendation: render `5 Armada` per the literal request, but style the
   number visually distinct (e.g. a muted or fixed-width prefix) so a bare
   number is not misread as part of the company name. `#5 Armada` is an
   easy variant if the bare number proves ambiguous in practice.

3. **Should two same-company, same-age cards still collapse to one row?**
   DC13 dedups them (the two Remitly cards in the Docusign fixture collapse).
   With positions they become distinguishable, and the user may want both
   locations.
   Recommendation: keep the current dedup for this cycle (smallest change;
   the surviving row's number still points at a real card). Revisit if the
   user finds the collapsed second card confusing.

---

## Notes and Risks

- **Position drift on undetected cards:** if a third, unseen markup variant
  hides some cards from title detection, later numbers shift. The feature
  degrades to a slightly wrong count rather than a wrong company — same
  fail-soft posture as DC13. Debug output (`titleParagraphCount`,
  `dismissTitleCount`) already exists to diagnose this.
- **Virtualized list:** positions count DOM-present cards at scan time. If
  LinkedIn virtualizes off-screen cards, numbers for far-down postings may
  not match a full visual count. Accept and note; no known fixture shows
  virtualization dropping cards.
- **Do not regress injection safety:** all scanner changes stay inside
  `captureRecentJobPostings`'s body. The isolation test guards this.
- Related idea: `doc/ideas/Fable_first-select.md` proposes clicking the card
  from the popup. Position numbers are a natural stepping stone (both need
  the card ordinal), but selection is explicitly out of scope for this cycle.

---

## Completion Summary

*Fill in when the cycle closes. Move this document to `doc/planning/completed/` afterward.*

**Completion Date:** [YYYY-MM-DD]
**Phases Completed:** [List or "All"]
**Work Deferred:** [What was not done and why, or "None"]

**Accomplishments:**
- [What was built or changed]

**Metrics:**
- Files modified: [N]
- [Other relevant measure]

**Lessons / Notes:**
[Anything worth remembering for future cycles.]
