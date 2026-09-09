# DevCycle 014: Recent Postings List Position

**Status:** VERIFIED
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

**Status:** Work Complete

- [x] In `listCardListings()` (`extension/content/captureActivePage.js`),
      record each detected title paragraph's 1-based ordinal among **all**
      detected title paragraphs (the full card list), and attach it to each
      qualifying listing as `listPosition`.
- [x] Leave `listPosition` absent (or `null`) on listings from
      `detailPageListing()` and `bodyTextAgeListings()`.
- [x] When the detail-pane listing and a positioned card listing are the same
      posting (same normalized company + age), keep the position — the
      deduplicated survivor must carry `listPosition` (see Open Question 1).
- [x] Keep `captureRecentJobPostings` fully self-contained — no references to
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

**Status:** Work Complete

- [x] In `setRecentPostingsState()` (`extension/popup/popup.js`), render
      `listing.listPosition` before the company name when present, per the
      display format decided in Open Question 2.
- [x] Rows without `listPosition` render exactly as today
      (`CompanyName` / `Unknown company`).
- [x] Confirm the row still fits the popup width with a two-digit position
      (25-card pages are the norm in the fixtures); adjust
      `extension/popup/popup.css` only if needed.

**Technical Notes:**

The popup builds each row as `<strong>company</strong><span>age</span>`.
Keep the position inside the existing row structure (e.g. part of the
`<strong>` text or a small preceding span) so the layout and CSS churn stay
minimal.

### Phase 3: Fixture-Backed Verification

**Status:** Work Complete

- [x] Extend `runRecentPostingsDocusignFixtureTest` and
      `runRecentPostingsStarbucksFixtureTest`
      (`extension/tests/captureActivePage.smoke.test.mjs`) to assert the
      expected `listPosition` for every recent listing. Derive the expected
      numbers by counting cards in the fixtures during implementation — do
      not hand-wave them.
- [x] Assert detail-page and fallback listings carry no `listPosition`.
- [x] Confirm `runRecentPostingsIsInjectionSafeTest` still passes (the
      `new Function` isolation check).
- [x] Run the standard verification commands (below).
- [x] Bump `extension/manifest.json` to `0.0.14.x` and update
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
   **Resolved:** implemented as a merge — the detail-pane listing survives
   (keeping `companySource: 'detail-page'`) and inherits its card's
   `listPosition`. Covered by
   `runRecentPostingsDetailPaneKeepsCardPositionTest`.

2. **Exact display format for the position?**
   The request reads literally as `# CompanyName` with `#` being the number,
   e.g. `5 Armada`.
   Recommendation: render `5 Armada` per the literal request, but style the
   number visually distinct (e.g. a muted or fixed-width prefix) so a bare
   number is not misread as part of the company name. `#5 Armada` is an
   easy variant if the bare number proves ambiguous in practice.
   **Resolved:** rendered as `5 Armada` — the number is a nested
   `.recent-postings-position` span inside the company `<strong>`, styled
   muted gray so it reads as a locator, not part of the name.

3. **Should two same-company, same-age cards still collapse to one row?**
   DC13 dedups them (the two Remitly cards in the Docusign fixture collapse).
   With positions they become distinguishable, and the user may want both
   locations.
   Recommendation: keep the current dedup for this cycle (smallest change;
   the surviving row's number still points at a real card). Revisit if the
   user finds the collapsed second card confusing.
   **Resolved:** kept the dedup; the survivor keeps the first card's
   position (the Docusign Remitly pair at positions 5 and 6 collapses to
   one row showing 5, asserted in the fixture test).

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

## Implementation Notes (2026-07-15, Fable)

### Code changes

- `extension/content/captureActivePage.js` — `listCardListings()` attaches
  `listPosition: t + 1` to every card listing (`t` indexes the full
  `titleIndexes` list, so excluded cards still count toward the ordinal).
  `uniqueListings()` was reworked from a filter to a keyed merge: the first
  occurrence survives, and when the survivor lacks a `listPosition` and a
  deduped duplicate has one (the detail-pane + own-card case), the position
  is merged onto the survivor. All changes are inside
  `captureRecentJobPostings`'s own body; the injection-isolation test still
  passes.
- `extension/popup/popup.js` — `setRecentPostingsState()` prepends a
  `.recent-postings-position` span (`` `${listPosition} ` ``) inside the
  company `<strong>` when `listPosition` is a positive integer; rows without
  a position render unchanged.
- `extension/popup/popup.css` — new two-class rule
  `.recent-postings-list .recent-postings-position` (muted `#52677a`),
  needed to override the generic `.recent-postings-list span` age styling.
- `extension/README.md` — recent-postings bullet updated.
- `extension/manifest.json` — bumped `0.0.13.13` → `0.0.14.0`.

### How the expected fixture positions were derived

A scratch script mechanically parsed both real fixtures' `<p>`/button
sequences (same parsing as the test harness), printed every card's ordinal,
title, company slot, and age line as a full table for independent counting,
and ran the production scanner (injection-isolated via `new Function`)
against the same nodes. The two agreed:

- Docusign fixture: `Remitly, Inc. - XML` at **5** (its duplicate at 6
  dedups into it), `Weights & Biases` at **14**, `Parametrix` at **16**,
  `Cisco` at **25**.
- Starbucks fixture: `Armada` at **4**, `Microsoft` at **11**, `SpaceX` at
  **12**, `CoreWeave` at **13**.

These are the values asserted in the fixture tests.

### Known edge discovered during implementation

In both fixtures the open job's **detail-pane title paragraph also counts as
a trailing "card"** (position 26 of 26 in Docusign, 23 of 23 in Starbucks) —
its title matches a dismiss-button label, so the title detector accepts it.
Because it sits after the entire list in document order in both observed
variants, it never shifts a real card's number; it only inflates the total.
If the open job's age were recent, that phantom card would surface as an
"Unknown company" row with a trailing position (pre-existing DC13 behavior —
the row itself is not new, it just now carries a number). Not fixed this
cycle: distinguishing the detail pane's title from a genuine card has no
verified structural signal yet, and a wrong exclusion risks hiding a real
card. Revisit if a real page shows a confusing trailing row.

### Tests

- `runRecentPostingsDocusignFixtureTest` / `runRecentPostingsStarbucksFixtureTest`
  now assert `listPosition` per listing against the real fixtures.
- `runRecentPostingsListCardStructureTest` asserts positions 1, 2, 3, and —
  critically — **6** for the company-omitted card, proving excluded cards
  (positions 4, 5) still count toward the ordinal.
- New `runRecentPostingsDetailPaneKeepsCardPositionTest` covers the Open
  Question 1 merge: the detail-pane survivor inherits its own card's
  position.
- Whole-page-fallback and detail-page tests assert `listPosition` is absent
  where there is no card to point at.

### Verification run

```powershell
node --check extension\content\captureActivePage.js
node --check extension\background\background.js
node --check extension\popup\popup.js
node --check extension\options\options.js
node --check extension\shared\csv.js
node --check extension\shared\filename.js
node --check extension\shared\projectFolderStore.js
node --check extension\shared\priorCompanyCache.js
node --check extension\shared\saveListing.js
node extension\tests\captureActivePage.smoke.test.mjs
node extension\tests\persistence.test.mjs
```

All commands passed. Per the DC13 verification standard, this cycle is not
`Verified` until the user confirms on a live LinkedIn results page that the
displayed numbers match the actual card positions in the left-hand list.

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

---

## Bug: Live Positions Offset When Cards Above the Viewport Are Not in the DOM (2026-07-15)

### Report

On `0.0.14.0`, the user's live popup showed:

```
Recent Postings  3
3 recent postings found.
2  Maestro AI        Posted 59 minutes ago
11 General Robotics  Posted 27 minutes ago
14 EvergreenHealth   Posted 55 minutes ago
```

The row labeled `2` (Maestro AI) was actually far down the list — not the
2nd card. The *relative* gaps were right: 11 is 9 after 2, and 14 is 3
after 11. The user then saved the same page as a new fixture:
`doc/examples/Engineer 2 _ Nordstrom _ LinkedIn.html`.

### Analysis against the new fixture

Running the production scanner (injection-isolated) against the saved
Nordstrom page — plus an independent walk of its dismiss-button card order —
gives:

| Company | True card position (fixture) | Live popup showed | Offset |
| --- | --- | --- | --- |
| Maestro AI | **9** | 2 | −7 |
| General Robotics | **18** | 11 | −7 |
| EvergreenHealth | **21** | 14 | −7 |

Two facts follow directly:

1. **The counting logic itself is correct on a fully-rendered DOM.** Against
   the saved page (all 25 cards present, 25 dismiss buttons, every card's
   title/company/age extracted cleanly, Maestro AI at dismiss-button ordinal
   9), the scanner returns 9 / 18 / 21 — exactly right. The slight age
   differences (59 min live vs `Posted 1 hour ago` saved, 27 vs 29, 55 vs
   57) confirm the fixture was saved a couple of minutes after the popup
   scan, on the same page state.
2. **At popup-scan time, exactly 7 of the 8 cards above Maestro AI were not
   in the DOM.** A uniform −7 offset with correct relative gaps means the
   scan saw a contiguous window of the list that started around card 8, and
   numbered it from 1. This is the "positions count DOM-present cards at
   scan time" risk from this cycle's Notes and Risks section — but worse
   than anticipated: it isn't only the lazily-rendered *tail* that can be
   missing, LinkedIn also **unmounts cards that have scrolled well above the
   viewport**, which shifts every number below them.

### What the saved fixture cannot show

The saved page is fully rendered, so it contains no trace of what a
virtualized-out card leaves in the DOM. Checks against the fixture found no
countable shell to anchor on: no per-card `<li>` wrappers, no
`occludable`/virtualization markers, no `role="list"`, and no
`aria-posinset` / `aria-setsize` / `aria-rowindex` / `data-index` anywhere.
As far as the available evidence goes, an unmounted card is simply *absent*,
and the rendered window carries no attribute stating its true starting
ordinal.

### Why this is not being patched blind

Any fix needs to know what the DOM actually looks like in the failing state
(scrolled, with the top of the list unmounted) — e.g. whether LinkedIn
leaves spacer elements whose height could be counted, or renders the list
inside a container that exposes a scroll offset. Guessing placeholder
markup that no fixture demonstrates is the exact guess-and-ship pattern
DevCycle013 documented at length. The needed evidence is a page saved (or
inspected) **in the state that produced the wrong numbers** — mid-scroll,
before LinkedIn re-mounts the top of the list — not after the fact.

### Candidate directions once evidence exists

- If virtualized-out cards leave measurable spacers/shells: count them into
  the ordinal.
- If a container exposes the window's true start index in any attribute:
  offset by it.
- If unmounted cards are truly gone without a trace: the honest options are
  to (a) label the number as relative (e.g. "~9th visible"), (b) drop the
  number when the scan detects it may be windowed (e.g. the list's first
  detected card is not preceded by the list header), or (c) have an explicit
  user-triggered action scroll the list to the top and rescan — a side
  effect, so it must not happen on popup-open.

### Also worth doing in the next pass

- Wire `Engineer 2 _ Nordstrom _ LinkedIn.html` into the fixture test suite
  as a third real-markup variant (25 cards; Maestro AI 9 / General Robotics
  18 / EvergreenHealth 21; phantom detail-pane title again counted last at
  position 26, consistent with the known edge above).
- Extend the popup debug output to include the first detected card's title
  and the detected-card total, so a live offset like this one is directly
  visible from the popup message instead of needing a saved page to infer.

### Status

Open. ~~Position values are correct only when the full list is mounted in
the DOM; on scrolled pages the numbers can be uniformly shifted down.~~
**The virtualization hypothesis above is disproven by the MHTML evidence —
see the corrected root cause in the next section.** Relative spacing between
numbered rows is *not* always correct either (see the mispairing below).

---

## Root Cause Found: "Verified job" Title Variant Defeats Both Title Detectors (2026-07-15)

### The decisive evidence

The user captured the failing state as
`doc/examples/Engineer 2 _ Nordstrom _ LinkedIn.mhtml` while the popup was
showing wrong output (second occurrence, different numbers than the first):

```
2 Maestro AI        Posted 59 minutes ago
3 General Robotics  Posted 27 minutes ago
4 GenScript         Posted 55 minutes ago
```

Running the production scanner against the decoded MHTML DOM reproduces
that output **byte-for-byte** — including the new, worse symptom: GenScript
is really card 19 with `Posted 12 hours ago`; the 55-minute age belongs to
EvergreenHealth at card 21. No extension code changed between the two
reports (`0.0.14.0` throughout); only the page's DOM state differed.

### It is not virtualization

In the MHTML, **all 25 dismiss buttons are present, in full-list order** —
every card is mounted. What differs is the title markup. Only 6 title
paragraphs are detected (5 list cards + the phantom detail-pane title),
versus 26 in the earlier `.html` save of the same page. The 20 undetected
cards all render their title `<p>` in a **third markup variant** neither
DC13 fixture contains in rendered form:

```html
<p ...>
  <span class="...">Software Engineer II (Verified job)</span>
  <span aria-hidden="true">Software Engineer II <span>...</span><svg id="verified-small" .../></span>
</p>
```

This defeats both title detectors at once:

- **Echo detection** requires the first two spans' texts to be identical:
  `"TITLE (Verified job)"` ≠ `"TITLE"`.
- **Dismiss-title text match** requires the `<p>`'s whole text to equal the
  dismiss label's title: innerText here is
  `"TITLE (Verified job) TITLE"` ≠ `"TITLE"`.

Exactly 20 `(Verified job)` badge renderings appear in the MHTML markup —
one per undetected card. The 5 detected list cards (Otter, Maestro AI,
General Robotics, GenScript, Parametrix) are the unverified ones, rendered
as the plain echo pattern.

Crucially, the earlier `.html` save of the *same page* contains 80
`(Verified job)` strings but **all inside embedded SDUI JSON payloads, none
in rendered `<p>` markup** — in that snapshot every title `<p>` was plain,
which is why the scanner got all 26 titles (and all positions) right
against it. LinkedIn renders/re-renders the badge markup dynamically, so
*which* cards are in the badge state varies from moment to moment. That
explains why the two live reports differed (offset −7 with correct gaps the
first time; nearly-all-undetected the second) without any code change.

### Two bugs from the one root cause

1. **Wrong positions (new in DC14, cosmetic-to-misleading):** undetected
   titles simply don't count, so ordinals compress toward 1.
2. **Wrong company/age pairing (pre-existing since 0.0.13.12, surfaced by
   the numbers):** an undetected title merges its card's paragraphs into
   the *previous* detected card's range. In the MHTML state, GenScript's
   range (card 19) swallowed the undetected Microsoft (20) and
   EvergreenHealth (21) cards, so EvergreenHealth's qualifying
   `Posted 55 minutes ago` was attributed to GenScript — a wrong company
   displayed for a recent posting, the exact DC13 failure class. This
   mislabeling has been possible in every version since the positional
   scanner shipped; it needed adjacent undetected cards plus a qualifying
   age to manifest.

### The fix (not yet implemented)

Title detection must recognize the verified-badge variant. Both detectors
can be fixed with one normalization: strip a trailing `(Verified job)`
suffix from span text before comparing —

- **Echo:** first span `"TITLE (Verified job)"` → strip → `"TITLE"`, which
  equals the aria-hidden span's normalized text. Works even on surfaces
  with no dismiss buttons.
- **Dismiss match:** test the first span's stripped text (and the
  aria-hidden span's text) against the dismiss-title set, instead of only
  the `<p>`'s concatenated text.

Verification standard: the fixed scanner must produce, against the MHTML
DOM state, `Maestro AI 9 / General Robotics 18 / EvergreenHealth 21` (with
EvergreenHealth correctly labeled, GenScript absent), while keeping the
existing Docusign/Starbucks/Nordstrom-html fixture results unchanged. The
MHTML should be wired into the test suite as the fourth real fixture — it
is the only one that demonstrates the verified-badge rendered state.

The suffix text `(Verified job)` is English-locale microcopy; if LinkedIn
localizes it, the detector degrades back to today's behavior for that
locale (undetected title), not to a wrong company — acceptable fail-soft,
worth a code comment.

### Status

Root cause confirmed with fixture-grade evidence; fix designed but not
implemented. Positions from `0.0.14.0` are only trustworthy when no
verified-badge cards are rendered above/between the recent postings, and a
recent posting immediately below undetected cards can be attributed to the
wrong company (pre-existing DC13-class bug, now understood).

**Update:** fixed in `0.0.14.1` — see the next section.

---

## Fix: Verified-Badge Title Detection (Fable, 2026-07-15)

Implemented the fix designed above, in `0.0.14.1`.

### Scanner changes (`extension/content/captureActivePage.js`)

- Added `stripVerifiedBadge(text)`: removes a trailing `(Verified job)`
  suffix after normalization. English-locale microcopy; if LinkedIn
  localizes it the title degrades to undetected (fail-soft), never a wrong
  company.
- `isEchoTitleParagraph()` now compares the first two span texts after
  suffix-stripping, so `"TITLE (Verified job)"` vs `"TITLE"` matches.
- `isCardTitleParagraph()` now tests the dismiss-title set against the
  paragraph text **and each of the first two span texts individually**
  (suffix-stripped). This catches both the badge variant (concatenated text
  `"TITLE (Verified job) TITLE"` never equals the bare dismiss title) and,
  it turned out, the selected job's own list card in the Starbucks fixture
  (first span `"Selected, TITLE (Verified job)"` — matched via its
  aria-hidden second span).
- Debug output gained `firstCardTitle` (the title counted as card #1), so a
  future live offset is diagnosable from the console log without a saved
  page. The popup's success message now appends
  `(N cards detected)` — if that number is far below the visible list
  length, positions are compressed and the debug log has the evidence.

### Verification against the real fixtures

- **Nordstrom MHTML** (the failing state): now returns
  `Maestro AI 9 / General Robotics 18 / EvergreenHealth 21`, EvergreenHealth
  correctly labeled with its 55-minute age, GenScript absent, all 26 titles
  detected — exactly the bar set in the root-cause section.
- **Nordstrom .html**: unchanged at 9 / 18 / 21.
- **Docusign**: unchanged (its 84 `(Verified job)` strings are all in
  embedded JSON, none rendered).
- **Starbucks**: positions *changed* — and that exposed an error in this
  cycle's original expectations. The fixture contains two rendered
  verified-badge titles plus the selected job's card, all previously
  undetected, so the "verified" positions asserted at implementation time
  (Armada 4 / Microsoft 11 / SpaceX 12 / CoreWeave 13) were themselves
  compressed. The true values, counted from the fixture's dismiss buttons
  in document order, are **Armada 6 / Microsoft 14 / SpaceX 15 /
  CoreWeave 16**. The original derivation was circular: the "independent"
  card walk used the same title-detection logic as the scanner, so it
  inherited the same blindness. The corrected test now counts ground truth
  from the dismiss-button sequence instead.

### Tests

- `runRecentPostingsNordstromHtmlFixtureTest` (third real fixture) and
  `runRecentPostingsNordstromMhtmlFixtureTest` (fourth; includes MHTML
  quoted-printable decoding in the harness and an `absent: ['GenScript']`
  assertion pinning the mispairing fix).
- Starbucks fixture expectations corrected to the true positions.
- Synthetic structure test gained a verified-badge card
  (`verifiedTitleParagraph`) asserted at position 7 with its own company
  and age.
- Full suite passes; injection-isolation test unchanged and green.

### Lesson recorded

Two of this cycle's "fixture-verified" position expectations were wrong
because the verifier shared the detector's blind spot. Ground truth for
card order must come from an independent signal (the dismiss-button
sequence), not from re-running the code under test.

Verification run:

```powershell
node --check extension\content\captureActivePage.js
node --check extension\background\background.js
node --check extension\popup\popup.js
node --check extension\options\options.js
node --check extension\shared\csv.js
node --check extension\shared\filename.js
node --check extension\shared\projectFolderStore.js
node --check extension\shared\priorCompanyCache.js
node --check extension\shared\saveListing.js
node extension\tests\captureActivePage.smoke.test.mjs
node extension\tests\persistence.test.mjs
```

All commands passed. Bumped `extension/manifest.json` to `0.0.14.1`. Per
the DC13 verification standard, not `Verified` until the user confirms
correct positions on a live page — ideally one showing verified-badge
cards, since that is the state that was failing.
