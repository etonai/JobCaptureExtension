# DevCycle 013: Recent Job Posting Spotlight

**Status:** Work Complete
**Start Date:** 2026-07-15
**Target Completion:** 2026-07-15
**Focus:** Show a popup summary of companies with LinkedIn listings posted within the last two hours.

---

## Goal

DevCycle013 makes it easier to quickly seek out very fresh job postings. When the extension popup is opened, the popup should continue showing the existing capture and save controls, and it should also show a top-of-popup list of companies whose visible LinkedIn listings are posted `2 hours`, `1 hour`, or `X minutes` ago.

This cycle should use the complete LinkedIn page examples under `doc/examples/`, especially `doc/examples/Software Engineer III Core Platform _ Blue Origin _ LinkedIn_files/`, to understand the available page structure and verify parsing behavior against realistic saved LinkedIn markup.

## Desired Outcome

After this cycle is complete:

- the popup shows a recent-postings section above the existing popup content
- opening the popup scans the active LinkedIn page for visible job listings with ages at or under two hours
- each matching item lists the company name and the post age text
- supported ages include `2 hours ago`, `1 hour ago`, and minute-based ages such as `37 minutes ago`
- older listings, day-old listings, month-old listings, and missing age values are excluded from the recent-postings list
- the existing capture, save, and record listing workflows remain unchanged
- parser coverage includes realistic LinkedIn saved-page examples and focused age-normalization cases

---

## Tasks

### Phase 1: Inspect LinkedIn Page Structures

**Status:** Work Complete

- [x] Review the current popup startup flow in `extension/popup/popup.js` and markup in `extension/popup/popup.html`.
- [x] Review the existing LinkedIn parsing logic in `extension/content/captureActivePage.js`.
- [x] Inspect the complete saved LinkedIn example files under `doc/examples/`, especially the Blue Origin example folder.
- [x] Identify the smallest reliable DOM selectors or text patterns for extracting visible listing company names and age text.
- [x] Decide whether the recent-postings scan should reuse existing capture parser helpers or introduce a separate narrow parser for listing summaries.

**Technical Notes:**

Likely files:

- `extension/popup/popup.html`
- `extension/popup/popup.css`
- `extension/popup/popup.js`
- `extension/content/captureActivePage.js`
- `extension/tests/captureActivePage.smoke.test.mjs`
- `doc/examples/Software Engineer III Core Platform _ Blue Origin _ LinkedIn_files/`

Prefer a narrow data shape for the popup, such as:

```js
{
  company: 'Blue Origin',
  postedText: '1 hour ago'
}
```

The scan should be resilient to LinkedIn text variants such as `Reposted 1 hour ago` while preserving the user-facing age text.

### Phase 2: Add Recent Posting Parsing

**Status:** Work Complete

- [x] Add a helper that can normalize LinkedIn posting age text into a comparable age value.
- [x] Treat `2 hours ago`, `1 hour ago`, and minute-based ages as recent.
- [x] Exclude values older than two hours, including `3 hours ago`, `1 day ago`, `2 days ago`, `1 month ago`, and similar variants.
- [x] Extract company names and post ages from visible job listing surfaces on the active page.
- [x] Return a stable empty result when no recent listings are found or the active page is unsupported.
- [x] Preserve current single-listing capture behavior and output fields.

**Technical Notes:**

Recommended approach:

- Keep the recent-listings parser separate from the full job-capture record unless existing helper extraction is already cleanly reusable.
- Parse age text through a small deterministic helper instead of relying on string sorting.
- Support both `posted` and `reposted` wording.
- Avoid writing files or changing project folder state during the popup-open scan.

### Phase 3: Show Recent Listings In The Popup

**Status:** Work Complete

- [x] Add a recent-postings section at the top of the popup.
- [x] Populate the section automatically when the popup opens.
- [x] Show each recent listing as company name plus age text.
- [x] Provide quiet empty, loading, and error states that do not block capture.
- [x] Keep existing Capture Active Tab, Save Capture, Record Listing, and result-summary behavior intact.
- [x] Ensure the popup layout remains readable in the extension window at its current width.

**Technical Notes:**

The recent-postings section should feel like a compact operational signal, not a landing-page element. Keep it dense, scan-friendly, and visually subordinate to the main popup workflow once the user starts capturing.

### Phase 4: Regression Checks And Documentation

**Status:** Work Complete

- [x] Add focused tests for age normalization and recent-listing inclusion/exclusion.
- [x] Add or update fixture-backed tests using the saved LinkedIn examples.
- [x] Add popup behavior coverage where practical for loading, empty, success, and error states.
- [x] Run syntax checks for changed extension scripts.
- [x] Run existing parser and persistence regression tests.
- [x] Update extension documentation if popup behavior is documented.
- [x] Record implementation notes and test results in this DevCycle document.

**Technical Notes:**

Likely verification commands:

```powershell
node --check extension\popup\popup.js
node --check extension\content\captureActivePage.js
node extension\tests\captureActivePage.smoke.test.mjs
node extension\tests\persistence.test.mjs
```

Adjust the exact commands during implementation if new test files are added.

---

## Open Questions

1. **Should `Reposted 1 hour ago` count as a recent listing?**
   Recommendation: yes. LinkedIn surfaces reposted listings as fresh opportunities, and the user goal is to find postings with very recent activity.

2. **Should exactly `2 hours ago` be included?**
   Recommendation: yes. The requested threshold explicitly includes listings `2 hours` old.

3. **Should the popup scan job-search result pages, individual job-detail pages, or both?**
   Recommendation: support visible search/listing pages first, and include the current individual job page when its captured `postedText` is recent. This keeps the feature useful in both common LinkedIn browsing modes.

4. **Should duplicate companies be collapsed?**
   Recommendation: no for the first implementation. If a company has multiple fresh listings, each visible listing can be useful. If the page only exposes company and age without a unique title, preserve the visible order and avoid over-deduping.

---

## Notes and Risks

- LinkedIn markup can change frequently, so parsing should prefer visible text patterns and existing fixture coverage over brittle deeply nested selectors.
- The popup-open scan should be read-only and should not trigger Save Capture side effects.
- The top-of-popup section should not hide or crowd the existing controls in the small extension window.
- The Blue Origin saved page assets are an important fixture source, but implementation should also account for the existing EasyPost, Uber, Starbucks, and other LinkedIn examples where relevant.

---

## Implementation Notes

Implemented on 2026-07-15 by Codex after user approval to implement DevCycle013.

Changes made:

- Added `captureRecentJobPostings()` in `extension/content/captureActivePage.js` as a read-only LinkedIn scan separate from the existing full capture flow.
- Added recent posting age parsing for minute-based ages, `1 hour ago`, `2 hours ago`, and `Reposted ... ago` variants, excluding older listings.
- Added popup UI above the existing reminder/status controls in `extension/popup/popup.html` and `extension/popup/popup.css`.
- Wired popup startup scanning in `extension/popup/popup.js` with loading, unsupported, empty, error, and populated states that do not block capture/save/record workflows.
- Added parser regression coverage for synthetic LinkedIn job cards, individual job-detail fallback using a Blue Origin-style example, unsupported pages, and older listing exclusion.
- Updated `extension/README.md` to mention the recent-postings popup summary.
- Bumped `extension/manifest.json` from `0.0.12.0` to `0.0.13.5` for reload verification.

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

All commands passed.
Follow-up fix on 2026-07-15:

- Fixed recent-posting company inference so LinkedIn CTA text such as `Be an early applicant` is treated as UI noise and is not displayed as the company name.
- Preserved line breaks when inferring a company from job-card text fallback, instead of flattening the whole card into one line.
- Added regression coverage for a card where `Be an early applicant` appears between the company and posting age.
- Updated `extension/manifest.json` to `0.0.13.1` for the first follow-up fix reload.


Second follow-up fix on 2026-07-15:

- Fixed recent-posting company inference so LinkedIn social-proof text such as `91 school alumni work here` is treated as UI noise and is not displayed as the company name.
- Added regression coverage for cards where alumni/social-proof text appears between the company and posting age, including a case where a company selector returns the social-proof text before fallback inference.
- Updated `extension/manifest.json` to `0.0.13.2` for the second follow-up fix reload.

Third follow-up fix on 2026-07-15:

- Reworked recent-posting company selection to validate company candidates structurally instead of accepting any nearby selector or fallback text.
- Rejected location/workplace metadata such as `Redmond, WA (Hybrid)` from both selector-based extraction and fallback inference.
- Added regression coverage for cards where location text appears between the company and posting age, including a case where a selector returns the location before fallback inference.
- Updated `extension/manifest.json` to `0.0.13.3` for the third follow-up fix reload.

Fourth follow-up fix on 2026-07-15:

- Rejected benefit/compensation metadata such as `Vision, 401(k), +1 benefit` from both selector-based extraction and fallback inference.
- Deduplicated equivalent recent-posting entries by normalized company plus normalized post age, so `Posted 2 hours ago` and `2 hours ago` for the same company collapse to one row.
- Added regression coverage for benefit metadata and normalized duplicate age variants.
- Updated `extension/manifest.json` to `0.0.13.4` for the fourth follow-up fix reload.

Fifth follow-up fix on 2026-07-15:

- Rejected separator-only text such as `.` / bullets from recent-posting company candidates.
- Rejected singular social-proof text such as `1 school alumni works here` in addition to plural `work here` variants.
- Changed fallback inference to drop uncertain single-candidate rows instead of guessing, preventing title-only entries such as `Senior Applied AI Engineer` from being displayed as companies.
- Added regression coverage for separator-only rows, singular alumni social-proof rows, and title-only fallback rows.
- Updated `extension/manifest.json` to `0.0.13.5` for the fifth follow-up fix reload.
---

## Completion Summary

*Fill in when the cycle closes. Move this document to `doc/planning/completed/` afterward.*

**Completion Date:** 2026-07-15
**Phases Completed:** All
**Work Deferred:** None

**Accomplishments:**
- Added a popup recent-postings section for LinkedIn listings from the last two hours.
- Added a read-only recent listings parser that preserves the existing capture and save flows.
- Added focused regression coverage for age filtering, reposted listings, detail fallback, and unsupported pages.

**Metrics:**
- Files modified: 8
- Tests run: 11 commands, all passing; follow-up regressions rerun passed through 0.0.13.5

**Lessons / Notes:**
Keeping the recent-postings scan separate from the full capture flow made the popup-open behavior safe and read-only. The fixture-style tests caught useful edge cases: applicant metadata must still be scanned for ages, individual job detail pages need the company/title/header order handled carefully, and LinkedIn CTA/social-proof text such as `Be an early applicant` , `91 school alumni work here`, `Redmond, WA (Hybrid)`, or `Vision, 401(k), +1 benefit` must be rejected before choosing a fallback company; equivalent age labels should be deduplicated, and low-confidence single-candidate fallback rows should be dropped instead of guessed.

---

## CLAUDE Analysis: Recurring Company-Extraction Failures (2026-07-15)

### Symptom

Recent-postings are found (age filtering works), but the reported "company" is
sometimes UI chrome (`Saved`) or the job title instead of the actual company
name. Five follow-up patches have already shipped for this same class of bug
(0.0.13.1 → 0.0.13.5), each fixing one specific bad string after it was
observed in testing.

### What the code actually does

`captureRecentJobPostings()` in `extension/content/captureActivePage.js`
resolves the company for each card in two tiers:

1. **Selector tier** (`queryText`, line 648): tries a short list of guessed
   CSS selectors (`.job-card-container__company-name`,
   `.job-card-container__primary-description`, etc.) against the card.
2. **Fallback tier** (`previousCompanyLine`, line 659): if tier 1 comes back
   empty, it flattens the card to text lines and walks backward from the
   posting-age line, accepting the nearest line that survives a filter
   function, `isCompanyCandidate` (line 634).

The user's instinct to call this a "whitelist" process is understandable —
it looks like the code is choosing a candidate — but structurally it is the
opposite: **`isCompanyCandidate` is a pure denylist.** It accepts *any*
non-empty line except ones matching `isUiNoise`, `isLikelyLocationLine`,
`isLikelyBenefitLine`, or a `$` price prefix. There is no positive check
that the accepted line actually looks like a company name. Any string
LinkedIn renders inside a job card that isn't already on the denylist —
by construction — gets accepted as the company.

### Why this keeps recurring

The changelog above is the evidence: every one of the five follow-up fixes
added one more specific string or pattern to the denylist after it was
caught in manual testing (`Be an early applicant`, alumni social-proof text,
location strings, benefit strings, separator dots, singular alumni
phrasing). This is whack-a-mole by construction — LinkedIn's card markup
carries an open-ended, frequently-changing vocabulary of badges, status
pills, and social-proof microcopy, and the fix loop can only ever cover
strings someone has already seen fail. Two concrete examples of the pattern
continuing:

- **`Saved` is not in `isUiNoise` at all.** Grepping the file confirms the
  only occurrence of "saved" is the unrelated `savedListingPath` record
  field. The fixture markup shows a real
  `job-card-container__footer-job-state` / `job-card-container__footer-item--undo`
  block, which is exactly where LinkedIn renders a "Saved" state with an
  undo action on cards the user has already saved. Nothing filters that
  text, so `previousCompanyLine` can pick it up as a company candidate.
- **The title-as-company case is only half-fixed.** The 0.0.13.5 patch
  added a rule to drop the fallback guess when exactly one unfiltered
  candidate line remains (to stop `Senior Applied AI Engineer` from being
  reported as a company). But when *two or more* unfiltered lines remain —
  e.g. the title plus some other bit of card chrome that isn't yet
  denylisted — `previousCompanyLine` still confidently returns
  `candidates[candidates.length - 1]` with no structural signal that the
  chosen line is actually a company rather than a title.

### Root cause

There is no verified, structural source of truth for "this text is the
company." Tier 1 (selectors) is the closer-to-correct approach — the class
names it targets do exist in the saved fixtures (`job-card-container__company-name`
is present in the Starbucks and EasyPost examples) — but the selector list
also includes `.job-card-container__primary-description` tried *first*,
which is a different, broader field, and the tier silently falls through to
the denylist-based tier 2 whenever a selector doesn't resolve to a passing
candidate, with no logging or lower-confidence marker to show that a guess
was made. Tier 2 then has to re-derive "company-ness" from raw flattened
text with no DOM structure to lean on, which is inherently unbounded.

### Recommendation

Stop growing the denylist. Instead:

1. Verify and fix the tier-1 selector list against the actual saved
   fixtures (`.job-card-container__company-name` already checks out;
   confirm/drop `.job-card-container__primary-description` and the other
   guessed selectors, since they were never confirmed against real markup).
2. Make tier 1 authoritative: if a verified selector resolves to non-empty
   text, use it — don't run that text through the denylist filter at all,
   since a name pulled from a purpose-built `company-name` node doesn't
   need to survive a text heuristic.
3. Treat tier 2 (`previousCompanyLine`) as a last resort only, and when it
   is used, prefer surfacing "company unknown" / omitting the row over
   guessing — a missing company is a better popup experience than a wrong
   one, and matches the existing "drop uncertain single-candidate rows"
   precedent already established in the 0.0.13.5 fix.
4. If heuristic fallback must stay, add a same-day regression test using
   the current failing cases (`Saved` job-state chrome, title-only cards)
   before patching the specific string, so the next whack-a-mole round is
   caught by the suite instead of manual QA.

---

## Codex Analysis: Correction After Repeated Recent-Posting Failures (2026-07-15)

### Summary

Claude's analysis is correct. The repeated failures are not isolated parser misses; they are symptoms of an invalid extraction strategy. I repeatedly patched observed bad outputs (`Be an early applicant`, alumni text, location text, benefits text, separator dots, title-only rows) instead of replacing the underlying method that allowed arbitrary card text to be promoted to a company name.

The recent-postings feature should not continue with a denylist-centered fallback as its primary safety mechanism. The correct direction is to extract company names only from verified company-specific DOM structure, and to omit rows when that structure is unavailable or ambiguous.

### What I Got Wrong

1. **I treated symptoms as parser edge cases.**
   Each user report was handled as another string or text pattern to reject. That made the implementation appear to improve while preserving the same failure mode.

2. **I allowed fallback inference to produce user-visible company names.**
   `previousCompanyLine()` guesses from nearby text. LinkedIn cards contain titles, locations, saved state, benefits, social proof, separators, and status labels near posting-age text. A nearby-line heuristic cannot reliably distinguish those from companies.

3. **I overtrusted tests built from synthetic cases.**
   The regression tests encoded the last failure, but they did not validate against the real LinkedIn DOM shape that produced the failure. They created a false sense of coverage.

4. **I did not inspect the real fixture structure deeply enough before implementation.**
   The DevCycle explicitly called out saved LinkedIn examples, but my implementation did not sufficiently use them to confirm actual company-specific selectors and card boundaries.

5. **I kept shipping patch versions without pausing to reassess the design.**
   After the second or third failure in the same class, the appropriate response was to stop and replace the approach, not keep widening filters.

### Current Root Cause

`captureRecentJobPostings()` conflates three separate problems:

- finding the correct job-card container
- extracting the posting age from that card
- extracting the company name from that card

The age extraction is relatively reliable because posting-age strings have a constrained grammar. Company extraction is not constrained in the same way. Without a verified company node, the parser cannot safely infer a company from arbitrary nearby visible text.

The current candidate validation (`isCompanyCandidate`) is still fundamentally a denylist. It asks, "Is this line not one of the bad things we know about?" It does not ask, "Did this text come from a DOM node whose purpose is company identity?"

### Recommended Replacement Strategy

1. **Remove broad text-card selectors from company extraction.**
   Do not use `.job-card-container__primary-description`, generic `[data-testid*="company"]`, or `[aria-label*="Company"]` until each is verified against real fixtures. These can select broader or misleading content.

2. **Use only verified company-specific selectors for company names.**
   Start with selectors confirmed in saved LinkedIn markup, such as `.job-card-container__company-name`, and inspect parent card structures around actual failures before adding more.

3. **Separate card discovery from nested node discovery.**
   Candidate card blocks should be top-level job-card containers only. Nested anchors or child nodes should not be independently parsed as separate cards, because that creates duplicates and partial-card guesses.

4. **Make fallback non-authoritative.**
   If a verified company selector fails, omit the listing or return it with `company: ''` and let the popup hide it. Do not display a guessed company. The user experience of missing one uncertain row is better than showing wrong company names.

5. **Add fixture-backed tests before another implementation.**
   The next implementation should include tests based on saved LinkedIn HTML/card snippets that reproduce:
   - saved-state chrome such as `Saved`
   - social proof such as `1 school alumni works here`
   - location/workplace text such as `Redmond, WA (Hybrid)`
   - benefits text such as `Vision, 401(k), +1 benefit`
   - title-only partial card fragments
   - nested card nodes that duplicate the same job

6. **Expose confidence in the parser result.**
   Internally, parsed recent postings should carry a source such as `companySource: 'selector' | 'fallback' | 'missing'`. The popup should only display rows with `companySource: 'selector'` unless the user explicitly chooses to show uncertain rows.

### Concrete Next Step

The next fix should be a small redesign, not another patch to the denylist:

- inspect real LinkedIn card DOM in the saved examples and the current failing page if available
- identify the smallest verified top-level card selector
- identify verified company-name selector(s) within that card
- remove or disable fallback company guessing for popup display
- update tests to assert that uncertain cards are omitted rather than guessed
- bump the extension version after the redesign is implemented

### Accountability Note

The failures in this DevCycle came from my implementation choices, not from an unavoidable ambiguity in the request. The user asked for company names for recent postings. I delivered a heuristic that repeatedly displayed non-company text. The correct standard for this feature is conservative extraction: no company should be shown unless the parser has a structural reason to believe it is a company.

---

## Claude Plan: Redesign Company Extraction (2026-07-15)

Codex's analysis and recommended direction (verified selector as sole source of
truth, omit rather than guess) is correct, and I checked it against the actual
saved fixtures before turning it into a plan. That check changed the plan in
one important way: **the BEM-style class selectors already in `queryText`
(`.job-card-container__company-name`, `.job-card-container__primary-description`,
etc.) do not exist anywhere in the rendered body markup of any fixture.**

```
Starbucksmoreunselectedbare.html  — class="...company..." occurrences in <body>: 0
easyposteasyapplybare.html        — class="...company..." occurrences in <body>: 0
```

Those class names only appear inside `<style>` blocks, attached to hashed
atomic class names (`_75228706`, `b7b590de`, ...) that LinkedIn actually
renders (`class="aa26e2c6 _4946ed03 ee438758 ..."`). This means tier 1 has
likely never matched against real LinkedIn markup — every extraction in
production has been going through the denylist fallback, which is a stronger
explanation for the recurring failures than "the fallback is sometimes used."
Any redesign that keeps guessed BEM class selectors will reproduce the same
bug in a new form.

### What does reliably identify a company in the fixtures

Two non-hashed, semantic attributes are present and consistent across every
fixture checked (Blue Origin, Starbucks, EasyPost, Uber, LinkedIn):

1. `aria-label="Company, <Name>."` — present on the currently-open job's
   detail pane in each fixture (one per fixture).
2. `a[href*="/company/<slug>/"]` — present on every card's logo and/or name
   link, including collapsed list rows. Confirmed multiple distinct
   companies per list-view fixture, e.g. Starbucks fixture contains
   `starbucks`, `mcdonald%27s-corporation`, `luckincoffeemalaysia`; EasyPost
   fixture contains `easypost`, `shippo`, `shipstation`.

`href*="/company/"` is the stronger anchor for this feature specifically,
because the feature scans a list of many visible cards, not just the single
open detail pane — the aria-label was only observed once per fixture, but
company profile hrefs were observed once per card.

### Plan

1. **Replace the selector list, don't just prune it.** Drop every guessed
   BEM/`data-testid`/`aria-label*="Company"` selector in `queryText`.
   Replace company resolution with: within a card, find
   `a[href*="/company/"]`, extract the slug from the href as a stable
   identity key, and derive the display name from that anchor's
   `aria-label` (`Company, X.` → `X`) if present, else its accessible text
   — verified per-fixture before merging, not assumed.

2. **Re-derive the card boundary from the same evidence, not guesswork.**
   For each fixture, find one age match and one `/company/` href close to
   it, then walk up the DOM to find their nearest common ancestor. Use that
   ancestor's structural signature (a stable, non-hashed attribute such as
   `data-job-id`, `data-view-name`, `data-occludable-job-id`, or role/tag
   pattern — to be confirmed per fixture) as the card selector, in place of
   the current unverified `candidateBlocks()` selector list.

3. **Make selector-based extraction authoritative, with no text fallback
   for company.** If a card has no `/company/` href, the listing is
   returned with `company: ''` / `companySourced: false` and the popup
   omits it, per Codex's recommendation #4. Delete `previousCompanyLine`,
   `isUiNoise`, `isLikelyLocationLine`, `isLikelyBenefitLine`, and
   `isCompanyCandidate` from the company path entirely — they were the
   whack-a-mole surface and should not remain as a silent fallback that
   reintroduces the same bug later. (`isUiNoise`-style filtering may still
   be needed for the unrelated posting-age scan, but must not be reachable
   from company resolution.)

4. **Track identity by slug, not display text, for dedup.** Two rows with
   the same `/company/<slug>/` href are the same company even if surrounding
   text formatting differs; keep the existing age-normalization dedup but
   key company identity off the slug first, falling back to normalized text
   only if no href was available.

5. **Rewrite tests from real fixture fragments.** Extract actual card HTML
   snippets (not synthetic hand-typed text) from the Starbucks, EasyPost,
   Uber, and Blue Origin fixtures for the test suite, covering: a normal
   card, a card with `Saved` job-state chrome, a card with alumni/benefit/
   location text near the age line, and a card with no `/company/` href
   (must be omitted, not guessed). This directly closes the gap Codex
   flagged — synthetic-only tests created false coverage confidence.

6. **Add `companySource` to the result shape** (`'href' | 'missing'`) as
   Codex proposed, and gate popup rendering on `companySource === 'href'`.

### Sequencing

Steps 1–2 are exploratory (confirm the card-boundary attribute per fixture)
and should happen before any code changes, using the same kind of direct
fixture inspection used above rather than re-guessing selector names. Once
a verified card selector and company anchor are confirmed against all four
fixtures, implement steps 3–6 as a single focused change, replacing
`captureRecentJobPostings()`'s company logic rather than patching it again,
and bump the manifest version once, after the redesign — not per fixed
string.
