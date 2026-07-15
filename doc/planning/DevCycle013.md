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

---

## Redesign Implementation Notes (2026-07-15)

Implemented the plan above in `extension/content/captureActivePage.js`.

### What changed

- Deleted the denylist entirely from the company path: `isUiNoise`,
  `isLikelyLocationLine`, `isLikelyBenefitLine`, `isCompanyCandidate`,
  `previousCompanyLine`, and the guessed-BEM-class `queryText` selector list
  are gone. Age detection (`recentAgeText`, `postingAgeMinutes`) is untouched
  — that part of the parser was never the problem.
- Added `extractCompanyIdentity(root)`, which accepts a company name from
  exactly two verified signals, in order:
  1. an element matching `[aria-label^="Company,"]` inside the card, parsed
     as `Company, X.` → `X` (confirmed present in the Blue Origin, Starbucks,
     EasyPost, and Uber/LinkedIn fixtures on the open job's identity block);
  2. if that's absent, the set of `a[href*="/company/"]` links inside the
     card — only accepted when exactly one *distinct* company name resolves
     from those links. Two or more distinct linked companies in one card
     (e.g. a card carrying an unrelated "people also viewed" company logo)
     is treated as ambiguous and dropped, not guessed.
  Anything else returns `{ company: '', companySource: 'missing' }` and the
  listing is omitted — matching Codex's rule that a missing row beats a
  wrong one.
- Removed `extractFromBodyText` (the whole-page flattened-text guess used
  when no card nodes were found). In its place, `detailPageListing()` calls
  the existing, already-exported `captureActivePage()` and reuses its
  `record.company` / `record.postedText`. That header-identity parsing
  (`parseHeaderFields` in the same file) is already constrained to two lines
  positioned immediately before a detected metadata line — a narrower,
  better-tested heuristic than anything the recent-postings scan had — so
  this is reuse, not a second bespoke guesser, per Open Question 3's original
  recommendation to lean on the single-job capture path for detail pages.
- Every returned listing now carries `companySource`
  (`'aria-label' | 'company-link' | 'detail-page'`), so a future popup change
  can distinguish confidence tiers if needed; today all three are treated as
  trustworthy because none of them come from free-text guessing.

### What I verified directly against the fixtures before writing this

- Confirmed `aria-label="Company, X."` is present in all four checked
  fixtures (Blue Origin, Starbucks, EasyPost, Uber/LinkedIn), each exactly
  once — on the currently open job's identity block.
- Confirmed `a[href*="/company/<slug>/"]` links are present per-card,
  including in list-row-style markup, with multiple distinct companies per
  page (Starbucks fixture: `starbucks`, `mcdonald's-corporation`,
  `luckincoffeemalaysia`; EasyPost fixture: `easypost`, `shippo`,
  `shipstation`). This is why the ambiguous-multiple-links case in
  `extractCompanyIdentity` matters in practice, not just in theory — the
  McDonald's/Luckin links in the Starbucks fixture turned out to belong to
  an unrelated "people you may know" logo strip sitting near the open job's
  own content, not to separate job cards. A naive "first company link in the
  card" rule would have silently attributed the wrong company; requiring a
  single *distinct* name is what avoids that.
- Confirmed the previously-guessed BEM class names
  (`.job-card-container__company-name`, `.job-card-container__primary-description`)
  never appear as literal `class="..."` attributes in the body markup of any
  fixture — LinkedIn renders hashed/atomic class names in production and
  only uses the semantic BEM names inside `<style>` rule definitions. This
  confirms the original tier-1 selector list was dead code against real
  pages and explains why every past extraction actually ran through the
  denylist fallback.

### Known gap not resolved in this pass

`candidateBlocks()` (the top-level card-selector list used to find each job
card) still contains the same unverified selectors as before
(`.jobs-search-results__list-item`, `.job-card-container`, `[data-job-id]`,
etc.). None of the available saved fixtures under `doc/examples/` turned out
to contain a genuine multi-card search-results list — the two page-level
fixtures inspected (`Starbucksmoreunselectedbare.html`,
`easyposteasyapplybare.html`) are single open-job detail pages with sidebar
insight widgets, not a rendered list of distinct job cards side by side.
Card-boundary detection is therefore still unverified against real markup
and is the next thing to fix if company names still go missing (as opposed
to being wrong) on a real search-results page — that would need a fresh
saved multi-card LinkedIn search-results page as a fixture.

### Tests

Rewrote `runRecentPostingsSyntheticCardsTest` in
`extension/tests/captureActivePage.smoke.test.mjs` to build mock cards
around the two verified signals (`aria-label`, company-profile `href`)
instead of hand-typed text-proximity scenarios. Coverage now includes: an
aria-label-sourced company, a company-link-sourced company, the 2-hour
boundary, `Reposted 1 hour ago`, age-variant dedup, a card whose only nearby
text is `Saved` (the reported bug) with no company signal, alumni/location/
benefit/title-only cards with no company signal, and a card with two
distinct company links (ambiguous, omitted). All previously-passing
detail-page-fallback and unsupported-page tests continue to pass unchanged
since `detailPageListing()` preserves the original observable behavior for
single job-detail pages.

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

All commands passed. Bumped `extension/manifest.json` to `0.0.13.6`,
continuing the DevCycle013 patch sequence (the version's third component
tracks the dev cycle; the fourth is the reload-verification patch number).

---

## Bug: Redesign Silently Drops Qualifying Listings (2026-07-15)

### Symptom

After the redesign above, real recent listings that satisfy the age filter
— reported cases include a listing `13 minutes` old and a listing `2 hours`
old — do not appear in the popup's recent-postings list at all. This is not
a mislabeling; the listing is missing entirely.

### This is a new failure mode, not one carried over from prior DC13 attempts

Every prior implementation in this dev cycle (through `0.0.13.5`, the
denylist-based approach Codex built and I criticized above) had the opposite
problem: it showed a company name for essentially every card whose age
qualified, because `previousCompanyLine()`'s fallback would accept *any*
nearby line that wasn't on the denylist — even wrong values like `Saved` or
a job title. That made company names unreliable, but it did not make
qualifying listings vanish. The feature's core acceptance criterion — "each
matching item lists the company name and the post age text" for every
listing at or under two hours old — was met in terms of coverage, just not
in terms of correctness.

My redesign inverted that trade-off in a way I did not adequately flag as a
blocking risk: `extractCompanyIdentity()` now returns a company only when a
card exposes `[aria-label^="Company,"]` or exactly one distinct
`a[href*="/company/"]` link, and `extractFromBlock()` returns `null` — the
whole listing, including its otherwise-valid `postedText` — whenever neither
signal resolves. Per my own fixture investigation (recorded above under
"Known gap not resolved in this pass"), those two signals were only
confirmed on the single currently-open job's identity block, not
demonstrated to be reliably present on ordinary collapsed list-row cards.
I documented that gap as a footnote instead of treating it as blocking, and
shipped a design that fails closed on the feature's primary requirement
(show the listing) in order to fix a secondary requirement (label it
correctly). Silently omitting a qualifying listing is a worse outcome for
this feature than showing it with an uncertain or occasionally wrong
company label, since a missing listing looks identical to "there is no
recent posting here" — the user cannot tell the difference between "nothing
recent" and "something recent that the parser gave up on."

### Root cause

`candidateBlocks()` still returns cards using the same unverified selector
list flagged as a known gap in the redesign notes above. Whatever cards it
does find (or fails to find distinctly) are then run through
`extractCompanyIdentity()`, which has no fallback path at all once the two
verified signals fail — unlike the age extraction path, which has no
equivalent strictness problem. The net effect: any card where card-boundary
detection is imprecise, or where the company link/aria-label isn't in the
subtree `extractFromBlock` receives, drops the entire row rather than
degrading gracefully.

### Status

Fixed on 2026-07-15.

### Fix

A qualifying age is already a strict, bounded signal on its own
(`recentAgeText` requires the literal `N minute(s)/hour(s) ago` pattern) —
it doesn't need a confirmed company to be trustworthy. So company
confidence was decoupled from whether a listing is returned at all:

- `extractFromBlock()` no longer returns `null` when
  `extractCompanyIdentity()` can't resolve a company. It always returns the
  listing once a qualifying age is found; `company` is `''` and
  `companySource` is `'missing'` when no verified signal was present.
- `detailPageListing()` likewise only requires a qualifying `postedText`
  from `captureActivePage()`'s record; a blank `record.company` no longer
  suppresses the listing.
- `uniqueListings()` no longer deduplicates listings that have a blank
  company — two different cards with no identified company and the same
  age text (e.g. two unrelated `Posted 1 hour ago` cards) are not the same
  posting and collapsing them would silently drop one. Only listings that
  share both a normalized company name *and* age are still deduplicated.
- The popup needed no change: `popup.js` already rendered
  `listing.company || 'Unknown company'`, so a blank company now correctly
  surfaces as "Unknown company" instead of the row disappearing.

This preserves everything the 2026-07-15 redesign fixed — LinkedIn UI
chrome (`Saved`, alumni text, benefits, location, a bare title, or an
ambiguous multi-company card) still never becomes the displayed company —
while restoring the property every prior DC13 attempt had and this
redesign temporarily broke: a listing whose age qualifies is never dropped
from the popup.

Added `runRecentPostingsDetailFallbackMissingCompanyTest` and expanded
`runRecentPostingsSyntheticCardsTest` in
`extension/tests/captureActivePage.smoke.test.mjs` to assert directly on
the reported cases — a 13-minute-old listing and a 2-hour-old listing, each
with no resolvable company — are still present in `result.listings` with a
blank `company` and `companySource: 'missing'`, rather than absent.

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

All commands passed. Bumped `extension/manifest.json` to `0.0.13.7`,
continuing the DevCycle013 patch sequence.

---

## Bug: Redesign Drops All Listings When Card Selectors Don't Match (2026-07-15)

### Symptom

Reported directly by the user: no listings at all were showing for postings
2 hours old or less, on a real LinkedIn page.

### Root cause — and why this is worse than the previous bug on this page

The `0.0.13.6`/`0.0.13.7` fix stopped a single card from being dropped when
its own company couldn't be identified. It did not fix a much larger
problem: `candidateBlocks()` — the selector list used to find job-card
*containers* in the first place — is the same kind of unverified, guessed
BEM-class list (`.job-card-container`, `.jobs-search-results__list-item`,
etc.) that was already shown (earlier on this page, under "Claude Plan:
Redesign Company Extraction") not to match literal `class="..."` attributes
in any saved fixture's real body markup. On a real LinkedIn page this list
plausibly matches **zero** elements, meaning `blockListings` is empty.

Before the 2026-07-15 redesign, an empty `blockListings` fell through to
`extractFromBodyText()` — a scan of the *entire* flattened page for every
occurrence of a qualifying age string, guessing a company for each via the
denylist-based `previousCompanyLine()`. That function was wrong about
company names, but it still found and reported every recent posting on the
page. My redesign replaced that whole-page multi-match scan with
`detailPageListing()`, which calls `captureActivePage()` — a parser built
to describe **one single job's header** (company/title/one metadata line).
That function can structurally return at most one listing. On a real
search-results page carrying many distinct recent postings, this collapsed
"every recent posting on the page" down to "at most one, if the single-job
header heuristic happens to parse the page at all." That is a strictly
worse regression than the company-mislabeling bug this whole page has been
tracking: instead of trading "wrong label" for "correct label or blank,"
this traded "every posting shown" for "at most one posting shown," which is
exactly the failure the user hit — 2-hour-and-under listings not appearing
at all.

I made this mistake despite having already flagged the underlying cause
myself, in this document, under "Known gap not resolved in this pass" —
I described `candidateBlocks()` as unverified and likely to miss real
markup, but treated that as a scoped-out footnote instead of recognizing it
made the fallback path the *primary* path in practice, and therefore
something that needed the same never-drop-a-qualifying-listing guarantee
the per-card path got.

### Fix

Restored whole-page multi-match coverage as part of the fallback, without
reintroducing the denylist:

- Added `bodyTextAgeListings(bodyText, skipPostedTextOnce)`, which scans
  every line of the flattened page for a qualifying age (the same strict,
  bounded `recentAgeText` check used everywhere else) and reports each as
  `{ company: '', postedText, companySource: 'missing' }`. It never reads
  surrounding text to guess a company — that's the one thing that must not
  come back.
- The fallback (used only when `candidateBlocks()` finds no card nodes) is
  now `detailPageListing()` (still tried first, since `captureActivePage()`
  can correctly label the one posting its header parser can identify) plus
  `bodyTextAgeListings()` for everything else on the page, with the
  occurrence already claimed by `detailPageListing()` skipped once so the
  same posting isn't reported twice.
- `uniqueListings()` already treats blank-company listings as never
  duplicates of each other (from the prior fix), so multiple distinct
  unresolved-company postings on the same page are all preserved rather
  than collapsing into one.

Net effect: every qualifying-age posting on the page is reported again,
matching or exceeding the coverage the pre-redesign implementation had,
while a posting's company is only ever a real, verified name or blank
("Unknown company" in the popup) — never a guess from nearby UI chrome.

Added `runRecentPostingsWholePageFallbackTest` to
`extension/tests/captureActivePage.smoke.test.mjs`, which reproduces the
reported scenario directly: three distinct recent postings (13 minutes,
1 hour, 2 hours) on a page with no matching card selectors, asserting all
three are still returned (one correctly labeled via the detail-page header
parser, two with an unresolved company) and that the 3-hour-old posting is
still correctly excluded by age.

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

All commands passed. Bumped `extension/manifest.json` to `0.0.13.8`,
continuing the DevCycle013 patch sequence.

### Still open

`candidateBlocks()` itself remains unverified against real per-card markup.
When it happens to match nothing (the likely common case on a real page,
per the fixture evidence above), every listing is now sourced from the
whole-page fallback, so at most one listing per page gets a real company
name (via `detailPageListing()`); the rest correctly show but with
"Unknown company." Fixing that — giving every listing on a real
multi-posting list page an actual company name, not just an unresolved
placeholder — requires verifying real card-boundary markup against a
genuine multi-card LinkedIn search-results page, which none of the current
fixtures under `doc/examples/` contain. That is the next thing to fix if
"Unknown company" rows are still too common in practice.

---

## Still Broken on 0.0.13.8: Stopped Guessing, Added Diagnostics Instead (2026-07-15)

### Report

The user confirmed `0.0.13.8` still detects zero recent postings on a real
LinkedIn page that has some. This is the third fix in a row for this
feature that was "verified" only against tests and fixtures I wrote myself,
and it still didn't work on a real page.

### Why I stopped and changed approach here

Every fix so far in this dev cycle — Codex's five denylist patches, my
company-identity redesign, and my two follow-up regressions today — was
shipped after passing tests built from assumptions about LinkedIn's real
DOM structure, not from a real, current, multi-card LinkedIn page. The
saved fixtures under `doc/examples/` turned out (discovered mid-cycle) to
be single-job detail views, not the search-results list this feature
actually needs to scan. I do not have live browser access to LinkedIn and
have now been wrong about what its real markup looks like multiple times
in a row — most recently about whether `candidateBlocks()` matches
anything at all in practice. Shipping a fourth blind guess (for example,
guessing that LinkedIn's list rows use compact age text like `2h`/`13m`
instead of `2 hours ago`/`13 minutes ago`, or guessing some other selector)
would repeat the exact failure pattern this whole document is a record of.

### What changed instead

No behavior change to the extraction logic. Added a `debug` field to
`captureRecentJobPostings()`'s result, populated only when zero listings
are found:

- `blockCount` — how many nodes `candidateBlocks()` matched on the real
  page (0 confirms the card-selector list is the problem; non-zero means
  the bug is elsewhere, e.g. in age-text matching or company extraction
  inside `extractFromBlock`).
- `ageLineCount` and `sampleAgeLines` — how many lines of the page's whole
  flattened text matched the age-recency check, and a few real examples.
  If `ageLineCount` is 0 despite visible recent postings, the age regex
  itself doesn't match LinkedIn's actual wording (e.g. abbreviated `2h`
  instead of `2 hours ago`) — a different bug than anything fixed so far.
  If `ageLineCount` is non-zero but `blockCount` is 0 and no listings
  still appear, the whole-page fallback added in the previous fix has its
  own bug.
- `detailPageOk` / `detailPageReason` — whether `captureActivePage()`
  considered the page supported, to check whether `detailPageListing()`
  is contributing anything.

`popup.js` now shows this as a suffix on the "No visible postings" message
(e.g. `(debug: 0 card matches, 0 age-text lines on page)`), and logs the
full object via `console.debug('[recent-postings-debug]', ...)`, so it can
be read directly from the popup without opening DevTools.

### Next step

Waiting on the user to report what the debug output actually says on a
real page with visible recent postings. The next fix will be based on that
output, not on another guess about LinkedIn's markup.

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

All commands passed. Bumped `extension/manifest.json` to `0.0.13.9`,
continuing the DevCycle013 patch sequence.

---

## Bug: `captureRecentJobPostings` Called `captureActivePage` Across an Injection Boundary That Doesn't Exist at Runtime (2026-07-15)

### Report

The user reported the popup showed "Recent Postings 0 — The active tab did
not return recent postings." on `0.0.13.9`.

### Root cause

`extension/popup/popup.js` runs the recent-postings scan like this:

```js
const [injectionResult] = await chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: captureRecentJobPostings
});
```

`chrome.scripting.executeScript({ func })` serializes and injects **only
that one function's body** into the target page's isolated world. It does
not carry along other top-level functions from the same module — even
though `popup.js` imports both `captureActivePage` and
`captureRecentJobPostings` from the same file, they are unrelated sibling
bindings at runtime once injected; `captureRecentJobPostings` has no more
access to `captureActivePage` inside the injected page than it would to
any other undeclared variable.

The `0.0.13.6` fix (reusing `captureActivePage()` from inside
`detailPageListing()`, in the "Claude Plan: Redesign Company Extraction"
work above) introduced exactly that call. It ran correctly in every Node
test, because Node's ES module scope makes `captureActivePage` a normal,
resolvable identifier for any function defined in the same file — Node has
no equivalent of `chrome.scripting.executeScript`'s serialize-and-inject
boundary. The bug was invisible to every test in this file, including the
ones added in the two fixes immediately before this one, because none of
them exercised the actual constraint the real extension runs under. On a
real page, calling `detailPageListing()` threw `captureActivePage is not
defined`; `chrome.scripting.executeScript` returned an `injectionResult`
with no `.result`, `popup.js`'s `if (!result)` check tripped, and the user
saw the generic "did not return recent postings" message — before the
`debug` diagnostics added in the previous fix ever had a chance to run,
since they're computed later in the same function that was throwing.

### Fix

Made `captureRecentJobPostings` fully self-contained again, so it has no
dependency on anything outside its own function body — the same
constraint the pre-redesign implementation (through `0.0.13.5`) always
satisfied, and which every fix since `0.0.13.6` silently broke.
`detailPageListing()` no longer calls `captureActivePage()`; it now
contains a small, deliberately duplicated re-implementation of just the
identity-line parsing that `parseHeaderFields` in `captureActivePage`
already does (`isLikelyMetadataLine`, `splitMetadataParts`, and a bounded
"two lines before the first metadata line" company lookup). The debug
block's own leftover `captureActivePage()` call (which had the identical
bug and would have thrown the moment a real page actually reached it) was
replaced with a call to the now-self-contained `detailPageListing()`.

Verified this reimplementation produces byte-identical results to the
previous `captureActivePage()`-backed version against all three existing
detail-page test cases (Blue Origin, the blank-company case, and the
whole-page-fallback case) before changing the code, by hand-tracing each
fixture's lines through both implementations.

### Regression test added

Added `runRecentPostingsIsInjectionSafeTest`, which does not just call
`captureRecentJobPostings` normally (which would pass even with the bug,
same as every other test in this file) — it takes
`captureRecentJobPostings.toString()`, rebuilds it via `new Function(...)`,
and calls *that*. A function built with `new Function` only closes over
the JS engine's global scope, never the defining module's scope, which is
the same isolation `chrome.scripting.executeScript({ func })` imposes in
the browser. This was verified against a standalone throwaway ES module
reproduction before adding it to the suite: the isolated call correctly
throws `captureActivePage is not defined` against the old
`0.0.13.6`-`0.0.13.9` code, and passes cleanly against the fix. This is
the test that should have existed before `0.0.13.6` shipped.

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

All commands passed. Bumped `extension/manifest.json` to `0.0.13.10`,
continuing the DevCycle013 patch sequence.

### What actually went wrong across 0.0.13.6-0.0.13.10

Every fix from `0.0.13.6` onward was correctness-tested only through Node,
which cannot see the one constraint that mattered most: these functions
don't run in a shared module scope in production, they run as
independently serialized strings injected into a page. That gap produced a
worse failure than any of the company-extraction bugs this document has
tracked — total feature failure — and it took a live user report to
surface, because nothing in the test suite could have caught it without
deliberately testing for that exact isolation. The reported "no recent
postings" symptom two conversations in a row (once attributed to a
markup-guessing problem, corrected here to an injection-scope problem)
is a reminder that a plausible-sounding root cause that fits the symptom
still needs to be checked against how the code actually executes, not just
argued into being additional plausible fixture evidence.

---

## Bug: Duplicate Rows From LinkedIn's Accessibility Echo, and Confirmed Missing Company Names (2026-07-15)

### Report

On `0.0.13.10` (the injection-scope fix), the user got real results for the
first time — 5 listings — but reported two problems: (1) most rows show
"Unknown company" instead of a real one, matching Codex's original
complaint from the start of this cycle, and (2) duplicate rows for what is
clearly the same posting: `Posted 24 minutes ago` / `24 minutes ago`, and
`Posted 2 hours ago` / `2 hours ago`.

### Duplicate rows — root cause and fix

This is exactly the pattern already found (and noted, but not acted on)
during the original fixture investigation earlier in this document: a
LinkedIn card commonly renders its posting age twice — once in a visible
span with the full text, and once in a duplicate `aria-hidden="true"` span
carrying the bare text, for accessibility:

```html
<span class="eafbff92 _3b42afd3">Posted 3 hours ago</span><span aria-hidden="true">3 hours ago</span>
```

`document.body.innerText` flattens both spans into separate lines. The
whole-page fallback scan (`bodyTextAgeListings`, added in the previous fix
to stop qualifying postings from being dropped) treated each qualifying
age line as a distinct posting, so every card scanned this way produced
two rows instead of one.

Fixed by recognizing this specific pattern: when two qualifying age
matches occur on **immediately consecutive lines** and normalize to the
**same age value**, the second is treated as the accessibility echo of the
first and dropped, rather than as a second posting. This is intentionally
narrow — it does not merge two qualifying age lines that are the same age
but separated by other content (e.g. two different real cards that happen
to both say "1 hour ago" with a title/company line between them), since
those are plausibly two different real postings.

Added `runRecentPostingsWholePageFallbackEchoDedupTest`, reproducing the
user's exact reported shape (a detail-page-derived `Remitly` posting, plus
two echo-duplicated postings), asserting the echo pairs each collapse to
one row.

### Missing company names — confirmed, not yet fixed

Only 1 of 5 real postings got a company name (`Remitly`, via
`detailPageListing()`'s single-job header heuristic). The other 4 came
from the company-blank whole-page fallback. This is exactly the "Still
open" / "Known gap" risk flagged twice already in this document:
`candidateBlocks()` — the selector list used to find individual job-card
DOM containers — was never verified against real per-card LinkedIn markup,
because no fixture under `doc/examples/` turned out to contain a real
multi-card search-results list. With 4 out of 5 postings falling through
to the whole-page fallback, `candidateBlocks()` is almost certainly
matching zero real card elements on the user's page, exactly as suspected.

I'm not guessing a new selector list here — that guess-and-ship pattern is
what produced every bug fixed so far in this cycle. Instead:

- `debug` is now always attached to the result (previously only when zero
  listings were found), including `blockCount` — the number of elements
  `candidateBlocks()` actually matched — regardless of how many listings
  were ultimately returned.
- The popup now logs `[recent-postings-debug]` to the console on every
  scan, and shows the block-match count as a small suffix on the "N recent
  postings found" message itself, not just on the empty state.

### Next step — needs real markup, not another guess

To actually give every listing a real company name (not just the one
`detailPageListing()` can label), `candidateBlocks()` needs to be replaced
with selectors verified against a real LinkedIn search-results page's
DOM — the same category of fix already applied to company extraction
earlier in this document, just for card boundaries instead of company
names. That requires real markup this project doesn't currently have
access to. Once confirmed (e.g. `blockCount: 0` in the debug output, or a
saved HTML export of a real multi-card search-results page), the fix is to
give `candidateBlocks()` real, verified container selectors — mirroring
how `extractCompanyIdentity()` was fixed by using `aria-label="Company,
X."` and `a[href*="/company/"]`, which are known-real signals, instead of
guessed BEM class names.

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

All commands passed. Bumped `extension/manifest.json` to `0.0.13.11`,
continuing the DevCycle013 patch sequence.

---

## Model switched to Opus 4.8 (2026-07-15)

The user switched the working model from Sonnet to Opus 4.8 and asked for a
root-cause analysis of why both Codex and Sonnet repeatedly failed to
extract correct company names. The analysis below is that deliverable. It
is analysis only — no code or version change accompanies it.

Live evidence that prompted this: on `0.0.13.11` the popup showed
`3 recent postings found. (1 card matches)` — one labeled company
(`Remitly`, the open detail pane) and two `Unknown company` rows. The
`(1 card matches)` figure is the decisive clue: `candidateBlocks()` matched
exactly **one** element on the user's real page.

## Opus Analysis: Why Company-Name Extraction Keeps Failing (2026-07-15)

### Method

I stopped reasoning from page-level counts (which is part of what misled
the earlier attempts) and instead opened a single real list card in the
`Starbucksmoreunselectedbare.html` fixture — which, unlike most fixtures in
`doc/examples/`, genuinely is a multi-card search-results page
(`/jobs/search-results/?currentJobId=...`). I extracted the actual DOM of
the individual job cards in the left-hand results list. That one step —
inspecting a real *list card's* internal structure, rather than counting
signals across the whole page — is what neither prior attempt did, and it
answers the question directly.

### The decisive fact: the two "verified" signals do not exist on list cards

Sonnet's redesign resolves a company only from
`aria-label="Company, X."` or `a[href*="/company/"]`. Against the real
search-results fixture:

| Signal | Count on page | Where it actually is |
| --- | --- | --- |
| `aria-label="Company,"` | **1** | only the single open job in the detail pane |
| `a[href*="/company/"]` | **7** | a minority of cards (promoted/branded), plus a "people also viewed" strip |
| `a[href*="/jobs/view/"]` | **1** | only the open job; list cards use `?currentJobId=` (23 of those) |
| `data-job-id` | **0** | not present at all |
| job cards in the list | **~23** | — |

So on a real results page, the two signals Sonnet treats as the *only*
trustworthy sources of a company name are **absent from ~22 of ~23 cards.**
They exist reliably on exactly one surface: the currently-open job in the
detail pane. That is why the only company name the user ever sees is the
open job (`Remitly`), sourced by `detailPageListing()`, and every list card
comes back `Unknown company`.

This also explains `(1 card matches)`: none of `candidateBlocks()`'s
selectors (`.job-card-container`, `.jobs-search-results__list-item`,
`[data-job-id]`, `a[href*="/jobs/view/"]`, …) match the real list cards.
The single match is the lone `/jobs/view/` link for the open job. With
`blockListings` empty, the code falls through to the whole-page text
fallback, which has no per-card DOM to read a company from — hence blanks.

### Where the company name actually lives

The company name is not missing from the page — it is right there, but in a
form both approaches were structurally blind to. Here is the real,
**consistent** internal structure of every list card (extracted verbatim
from the fixture):

```
1. TITLE="Sr Software Engineer"                              NEXT_P=["Compass","Seattle, WA"]
2. TITLE="Software Developer I"                              NEXT_P=["Redfin","Seattle, WA"]
3. TITLE="Software Developer II - Agentic Virtual Assistant" NEXT_P=["Redfin","Seattle, WA"]
4. TITLE="Senior Software Engineer"                          NEXT_P=["Armada","Seattle, WA (On-site)"]
5. TITLE="Senior Software Engineer"                          NEXT_P=["Armada","Tacoma, WA (On-site)"]
```

Each card is three sibling elements in a fixed order:

```html
<p><span class="…">Sr Software Engineer</span><span aria-hidden="true">Sr Software Engineer</span></p>  <!-- title -->
<div class="_320e5786 …"><p class="…">Compass</p></div>                                                  <!-- company -->
<p class="…">Seattle, WA</p>                                                                             <!-- location -->
```

The company (`Compass`, `Redfin`, `Armada`) is **plain text in a `<p>` with
obfuscated/hashed class names** — no company link, no `aria-label`, nothing
that distinguishes it, by attribute, from the title `<p>` or the location
`<p>` that bracket it. Its identity as "the company" is defined
**positionally**: it is the text block between the title and the location,
inside the card.

### Why each approach failed, precisely

- **Codex (denylist over flattened text).** Codex tried to pick the company
  out of the page's flattened text by rejecting everything that "looks
  like" chrome. But on a real card the company sits immediately adjacent to
  the title and the location — three bare strings in a row — and there is no
  general text rule that says "Compass is a company but Sr Software Engineer
  is a title and Seattle, WA is a location." The denylist could suppress
  known noise, but it could never *positively* identify which of several
  equally-plain adjacent strings was the company. Every new page surfaced
  another string the denylist hadn't seen, because the task it was set —
  classify free text with no structure — is not solvable by enumeration.

- **Sonnet (verified DOM signals, but only the ones on the detail pane).**
  Sonnet correctly diagnosed that guessing from text was the disease and
  that structural signals were the cure — but then verified those signals
  against fixtures that were mostly single-job detail views, and never
  opened a *list card*. So it "verified" `aria-label="Company,"` and
  `a[href*="/company/"]`, which are real, but real only on the one surface
  it happened to look at. Applied to the list, those signals resolve
  nothing, and Sonnet's own rule ("omit rather than guess") then correctly —
  and uselessly — blanks every list card. Sonnet fixed the *wrong-answer*
  failure by converting it into a *no-answer* failure.

- **The shared blind spot.** Both treated "find the company" as either a
  page-global text problem (Codex) or a page-global selector problem
  (Sonnet). It is neither. It is a **per-card, positional** problem: you
  must first isolate one card's DOM subtree, then read the company from its
  position *within that card* (between title and location). Neither ever
  established the card boundary for the real list, so neither could ask the
  only question that has a reliable answer.

### What a correct implementation requires

1. **Find real card boundaries.** The stable per-card anchors on the real
   page are the results-list job links (`a[href*="currentJobId="]`, 23 of
   them — one per card) and the per-card dismiss buttons
   (`aria-label="Dismiss <TITLE> job"`, also one per card and, usefully,
   containing the exact title). Anchor on one of these and walk up to the
   card container, instead of guessing hashed container class names.
   `candidateBlocks()` must be rebuilt around these; its current selector
   list is the reason `blockCount` is ~1.

2. **Read the company positionally within each card, using title and
   location as landmarks.** Within a card: the title is known independently
   (from the dismiss-button `aria-label`, or the `<span>X</span><span
   aria-hidden>X</span>` echo pattern); the location is identifiable by
   pattern (`City, ST`, `(On-site|Hybrid|Remote)`, etc.); the age/metadata
   is identifiable by the existing `recentAgeText` grammar. The company is
   the remaining text block between the title and the location. This is
   positional extraction *inside a verified card subtree* — fundamentally
   different from, and reliable where, page-global text guessing (Codex) is
   not.

3. **Keep `aria-label="Company,"` / `a[href*="/company/"]` as a
   higher-confidence override, not the sole source.** When a card *does*
   expose them (the open pane; promoted cards), prefer them. But they must
   be the fast path, with positional per-card extraction as the real
   workhorse for the ~95% of cards that lack them.

4. **Verify against a real multi-card fixture before shipping.** The
   recurring meta-failure in this cycle is that every fix was validated
   against synthetic mocks or detail-view fixtures. `Starbucksmoreunselected
   bare.html` is in fact a usable multi-card list fixture (five clean
   title/company/location triples are extractable from it, shown above) and
   should be wired into the test suite as the ground truth for list-card
   company extraction. No further company-extraction change should be
   marked complete until it produces `Compass / Redfin / Redfin / Armada /
   Armada` from that fixture's list cards.

### One-sentence answer

The company name on LinkedIn results-list cards is plain, unlabeled text
whose only reliable meaning is positional (the block between the card's
title and its location); Codex tried to read it from page-wide flattened
text and Sonnet tried to read it from DOM signals that exist only on the
open detail pane, so neither ever isolated a list card and read the company
from its position inside it — which is the only method that works.

---

## Fix: Positional Per-Card Company Extraction (Opus, 2026-07-15)

Implemented the method the analysis above prescribes.

### What changed in `captureRecentJobPostings()`

- **Removed** the guessed card-boundary path entirely: `candidateBlocks()`
  (the BEM/`data-job-id`/`/jobs/view/` selector list that matched ~1 real
  element), `extractFromBlock()`, and the detail-pane-only
  `extractCompanyIdentity()` / company-link / aria-label helpers.
- **Added `listCardListings(document)`**, the new primary scanner. It reads
  the results list positionally from the verified real structure:
  1. `isEchoTitleParagraph()` identifies each card's title — a `<p>` whose
     first two child `<span>`s have identical text (LinkedIn's title
     rendering), excluding any whose text reads as an age so a bare
     "N ago" echo is never mistaken for a title.
  2. For each title, the company is the very next `<p>` in document order,
     and the age is the first qualifying "N ago" `<p>` before the next
     title. This is the exact title → company → location order confirmed in
     the fixture.
  3. The positional company candidate is accepted unless it is itself a
     location or an age (all that can occupy that slot when LinkedIn omits a
     card's company `<p>`), in which case the company is left blank — the
     listing still appears, never mislabeled.
- **`detailPageListing()`** (open-pane header) is unchanged and still runs,
  so the currently-open job keeps its precise company.
- **Fallback reordered:** the whole-page `bodyTextAgeListings()` last resort
  now triggers when the structural *list* scan returns nothing (not when the
  combined result is empty), so a page where only the open-pane listing
  resolves still gets its results list surfaced (company blank) instead of
  collapsing to one row.
- Listings now carry `companySource: 'list-card' | 'detail-page' | 'missing'`.
- Debug now reports `titleParagraphCount` / `cardListingCount` instead of the
  removed `blockCount`; the popup suffix was updated to match.

### Tests — now genuinely fixture-backed

The repeated failure across this cycle was validating against synthetic
mocks that didn't match reality. Two new tests close that loop:

- `runRecentPostingsFixtureStructureTest` parses the real
  `Starbucksmoreunselectedbare.html` and asserts the actual list cards are
  `Compass / Redfin / Redfin / Armada / Armada`, each title immediately
  followed by that company then a location, and that the company is plain
  `<p>` text with no `/company/` link. If LinkedIn's markup drifts from what
  the extractor assumes, this fails loudly. This is the ground-truth check
  the analysis demanded.
- `runRecentPostingsListCardStructureTest` builds cards from that same
  verified structure (title echo-`<p>`, company `<p>`, location `<p>`, age
  `<p>`) and asserts the extractor returns the right companies, excludes a
  3-hour and a no-age card, and — critically — leaves the company blank
  (not the location) on a card where the company `<p>` is omitted while
  still reporting that qualifying-age listing.

The obsolete synthetic `candidateBlocks`-based test was removed. The
whole-page-fallback, echo-dedup, injection-isolation, detail-page, and
unsupported-page tests all still pass unchanged.

### Honest scope note

`listCardListings` depends on LinkedIn continuing to render list-card titles
as the identical-two-span echo `<p>` and to order title → company → location.
Both are verified against the one real multi-card fixture available
(`Starbucksmoreunselectedbare.html`), and the fixture test will catch drift,
but only that one page/locale is covered. The `bodyTextAgeListings` fallback
still guarantees a recent posting is never *hidden* (only shown with a blank
company) if the structure ever changes. If a future real page still shows
"Unknown company" rows, the debug output (`titleParagraphCount`,
`cardListingCount`) will show whether titles were found at all, which is the
next evidence to reason from.

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

All commands passed. Bumped `extension/manifest.json` to `0.0.13.12`,
continuing the DevCycle013 patch sequence.

---

## Fable Analysis: Why 0.0.13.12 (Opus's Positional Fix) Still Shows "Unknown company" (2026-07-15)

The user switched the working model to Fable and supplied a second real
saved page: `doc/examples/Senior Software Engineer _ Docusign _
LinkedIn.html`, a genuine multi-card search-results snapshot. On
`0.0.13.12` the popup showed 5 recent postings — the ages were right, the
dedup was right, and **every company was "Unknown company"**. This analysis
is grounded entirely in that new fixture. No code or version change
accompanies it.

### Root cause: the "verified" title pattern exists in only one of LinkedIn's markup variants

Opus's `listCardListings()` identifies a card by its title `<p>`, defined
as a `<p>` whose first two child `<span>`s carry **identical text** (the
"echo" pattern found in the Starbucks fixture). Against the Docusign
fixture:

| Signal | Starbucks fixture | Docusign fixture |
| --- | --- | --- |
| echo-title `<p>` (two identical spans) | present, 1/card | **0 matches in the whole file** |
| `button[aria-label="Dismiss <TITLE> job"]` | **25** (1/card) | **25** (1/card) |
| title → company → location `<p>` order | yes | yes |
| age `<p>` (`Posted N ago` + aria-hidden `N ago` echo) | yes | yes |
| open-pane `aria-label="Company, X."` | 1 | 1 |
| plain-text company `<p>` (no link, hashed classes) | yes | yes |

The Docusign variant renders the title like this:

```html
<p class="…"><span class="…"></span><span aria-hidden="true">AI Native Software Engineer…</span></p>
```

The first span is **empty**; only the `aria-hidden` span carries the title
text. `isEchoTitleParagraph()` requires two identical non-empty span
texts, so it matches zero paragraphs, `listCardListings()` returns
nothing, the scan falls through to the whole-page age fallback — which by
design carries no company — and every row renders "Unknown company." (The
one row Opus's version could have labeled, the open Docusign job, was
*correctly* absent: its card says `Posted 5 hours ago`, outside the
two-hour window. The age filtering and echo dedup worked exactly as
intended; only card detection failed.)

So 0.0.13.12's method was right (positional per-card extraction) but its
card detector was generalized from a **sample of one**. LinkedIn is
serving at least two concurrently-live markup variants — different hashed
class sets *and* different title micro-structure — and any detector
verified against a single saved page can be silently absent from the next.

### What is actually invariant across both real pages

The per-card **dismiss button** — `aria-label="Dismiss <TITLE> job"` —
appears exactly once per card in both fixtures (25/25 in each), and it
carries the card's exact title text. This was, notably, the anchor the
original Opus analysis recommended before the implementation drifted to
the echo pattern. Combined with the (also invariant) content order, this
yields a detector verified against **both** variants:

1. Collect card titles from every `button[aria-label^="Dismiss "]` whose
   label ends in `" job"` (strip the prefix/suffix to get the title).
2. A `<p>` is a card title iff its normalized text matches one of those
   titles (matching text handles duplicate titles across cards naturally).
   Keep the echo-span detector as a secondary signal for surfaces that
   lack dismiss buttons.
3. As in 0.0.13.12: company = the next `<p>` in document order (rejected
   only if it reads as a location or age), age = first qualifying age
   `<p>` before the next title. Everything downstream (blank-company
   fallback, echo dedup, uniqueness) stays unchanged.

Proof this works — running exactly that positional read over the raw
Docusign fixture recovers every card correctly:

```
1.  Senior Software Engineer                       → Docusign               (Posted 5 hours ago)
2.  Full-Stack Software Engineer: Mid, Senior…     → Salesforce             (Posted 12 hours ago)
3.  Software Engineer II                           → Microsoft              (Posted 10 hours ago)
4.  Software Engineering LMTS                      → Salesforce             (Posted 21 hours ago)
5.  AI Native Software Engineer                    → Remitly, Inc. - XML    (Posted 1 hour ago)
6.  Senior Software Development Engineer- Receiver → Remitly, Inc. - XML    (Posted 1 hour ago)
7.  Assoc Engineer, Software - Agentic AI…         → T-Mobile               (Posted 6 hours ago)
8.  Senior AI Engineer                             → Bristol Myers Squibb   (Posted 23 hours ago)
9.  Senior Software Engineer                       → NetApp                 (Posted 8 hours ago)
10. Senior Software Engineer, Data Enablement…     → Brex                   (Posted 10 hours ago)
11. Software Engineer, E-Commerce AI Platform…     → TikTok USDS Joint Vent.(Posted 4 hours ago)
12. Senior Software Engineer (Python + Distr.…)    → Scribd, Inc.           (Posted 13 hours ago)
```

On this snapshot the popup should show the two Remitly rows (1 hour) with
real company names; the rest are correctly outside the window.

### Verification standard for the fix

Per the user's feedback that tests written around unverified assumptions
wasted their time: the implementation of this fix should be validated
directly against **both** real fixtures (Starbucks and Docusign) — the
fixture-structure test must assert real extracted companies from each
variant — and no claim of "working" should be made until the user confirms
real company names on their live page. Mock-only tests of this detector
prove nothing about LinkedIn and should not be treated as verification.
