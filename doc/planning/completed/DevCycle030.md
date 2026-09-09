# DevCycle 030: Capture Non-LinkedIn Job Listings

**Status:** Work Complete
**Start Date:** 2026-08-11
**Target Completion:** 2026-08-11
**Focus:** Add a "Capture Page" button that captures job listings from arbitrary (non-LinkedIn) career pages into the same `job-tracking.csv` / `saved-listings` pipeline used for LinkedIn captures.

---

## Goal

Today, `captureActivePage()` (`extension/content/captureActivePage.js`) only recognizes LinkedIn job pages; any other page is reported as unsupported (`ok: false, reason: 'not_linkedin'`). Job listings posted directly on a company's own careers site (e.g. Stripe) can't be captured at all right now. This cycle adds a second, best-effort capture path for arbitrary pages so those listings can still be tracked and saved, without trying to match LinkedIn's parsing fidelity.

## Desired Outcome

- A new **"Capture Page"** button appears below **"Capture Active Tab"** in the popup.
- Clicking it runs a generic (non-LinkedIn-specific) parser against the active tab and produces a capture record the same shape as a LinkedIn capture.
- `captureDateLocal`, `captureTimeLocal`, `captureTimeUtc`, and `url` are always populated (same as today).
- `applyType` is always set to `DIRECT` for pages captured this way.
- `notes` is populated from the popup's notes textarea, same as the existing Save flow.
- Every other CSV field (`title`, `location`, `workplaceType`, `employmentType`, `postedText`, `applicantCountText`, `salaryText`, `linkedinJobId`, etc.) is filled from the page when it can be easily parsed, and otherwise literally recorded as `UNKNOWN` rather than left blank.
- `company` is a special case: when it can't be parsed, it is recorded as `###U_UNKNOWN` (e.g. `001U_UNKNOWN`, `002U_UNKNOWN`), not the plain `UNKNOWN` used for other fields. `###` is a zero-padded 3-digit number — the next available one, determined by scanning for existing `###U_`-prefixed company values and incrementing past the highest one found (see Phase 1). The scan matches on the `###U_` prefix alone, never on the trailing `UNKNOWN` text, because the user's workflow is to manually edit each placeholder afterward into `###U_COMPANYNAME` — the number must stay findable (and the counter must keep incrementing correctly) even after `UNKNOWN` has been replaced with a real name. Since `company` is also the leading segment of the saved-listing filename (`baseListingFilename()`), this placeholder becomes the start of the `.json`/`.txt`/`.md` filenames too, which is intentional — it lets the user find and rename the right file.
- Saving a "Capture Page" result reuses the existing save pipeline: a JSON listing plus `.txt`/`.md` description files under `saved-listings/`, and a row appended to `job-tracking.csv` — the same outputs a LinkedIn capture produces today, not the CSV-only `other-listings.csv` path used by "Record Listing".
- `doc/examples/Stripe Careers _ Software Engineer, Product Security Data Platforms.mhtml` is the reference fixture for building and hand-verifying the generic parser.

---

## Tasks

### Phase 1: Generic Page Parser

**Status:** Work Complete

- [x] Inspect the Stripe example (`doc/examples/Stripe Careers _ Software Engineer, Product Security Data Platforms.mhtml`) to identify what's realistically parseable from a generic careers page (page title, `og:` / JSON-LD `JobPosting` meta tags if present, heading text, etc.) versus what should just fall back to `UNKNOWN`. Findings: no JSON-LD `JobPosting` (resolves Open Question 2 — not implemented, since it's absent from the only available fixture); `og:title`/`og:description` exist but add nothing `<title>` doesn't already have; `<title>` follows a `"{Company} Careers | {Job Title}"` convention; the rendered body text contains an unlabeled-but-structured sidebar of `Label` line immediately followed by `Value` line (`Company` / `Team` / `Office location` / `Employment type`); salary appears embedded mid-sentence ("...is $156,800 - $235,200. For sales roles...").
- [x] Added `captureGenericPage()` in `extension/content/captureActivePage.js` (after `captureRecentJobPostings()`), self-contained per the same injection constraint documented above `detailPageListing()` (helpers duplicated, not imported). It:
  - Never gates on hostname or "supported" status — always returns `ok: true`.
  - Extracts `company`/`location`/`employmentType`/`workplaceType`/`postedText`/`applicantCountText` via an exact-match label-line → next-line scan (`LABEL_FIELD_MAP`/`applyLabelPairs`); `company`/`title` also via the `<title>`'s `"X Careers"` convention (`titleAndCompanyFromDocumentTitle`) when the label scan didn't resolve them; `salaryText` via a `$X - $Y` regex scanned across all lines (not full-line match, since it's often embedded in a sentence); `description`/`descriptionMarkdown` as the body text between the resolved title line and the first `/^apply\b/i` line.
  - Sets every field other than `company` to `'UNKNOWN'` when unresolved.
  - Leaves `company` as `''` when unresolved — the content script has no project-folder access, so the popup (Phase 2) resolves the placeholder number.
  - Sets `applyType` to `'DIRECT'` unconditionally, `linkedinJobId` to `'UNKNOWN'` (Open Question 1, decided as documented below).
  - Returns the same `{ ok, record, warnings, ... }` envelope `captureActivePage()` returns.
  - Two bugs were caught and fixed during hand-verification against the decoded Stripe fixture: the salary regex's `[\d,.]*` character class swallowed the sentence's trailing period as if it were a decimal point (fixed to `[\d,]*(?:\.\d+)?`), and label-pair-extracted `employmentType`/`workplaceType` values (e.g. "Full time") weren't run through the existing normalizer the way the standalone-line fallback was (fixed by normalizing at the point `applyLabelPairs` assigns them).
- [x] Added `nextUnknownCompanyNumber(csvText)` and `formatUnknownCompanyPlaceholder(n)` to `extension/shared/csv.js`: the former matches `company` values against `/^(\d{3})U_/` (prefix only, never requiring trailing `UNKNOWN`) and returns one past the highest match; the latter zero-pads to 3 digits (`String(n).padStart(3, '0')`).
- [x] Added `getNextUnknownCompanyPlaceholder()` to `extension/shared/saveListing.js`: reads `job-tracking.csv` directly (read-only permission via `ensureProjectReadPermission`, tolerating a missing file) and returns `formatUnknownCompanyPlaceholder(nextUnknownCompanyNumber(csvText))`. Runs at capture-apply time in the popup (Phase 2), not at content-script injection time.
- [x] Confirmed `baseListingFilename()` needs no changes: `001U_UNKNOWN` slugifies to `001u-unknown` and leads the `.json`/`.txt`/`.md` filenames as intended.

**Technical Notes:**
Relevant files: `extension/content/captureActivePage.js`, `extension/shared/csv.js`, `extension/shared/saveListing.js`, `extension/shared/filename.js` (verified, unchanged).

### Phase 2: Popup UI Wiring

**Status:** Work Complete

- [x] Added `#capturePageButton` ("Capture Page") to `extension/popup/popup.html`, directly below `#captureButton`.
- [x] Added `runCapturePage()`/`captureGenericPageWithChecks()` to `extension/popup/popup.js`, mirroring `runCapture()`/`captureActiveTabWithChecks()` but injecting `captureGenericPage`.
- [x] After a successful capture with no resolved `company`, `captureGenericPageWithChecks()` calls `resolveUnknownCompanyPlaceholder()` (wrapping `getNextUnknownCompanyPlaceholder()`, falling back to `formatUnknownCompanyPlaceholder(1)` if the project folder read fails, so a permission problem doesn't block the capture itself — Save surfaces the same problem anyway) and sets `record.company` before the result is displayed / Save is enabled.
- [x] Confirmed the existing result panel, prior-company warning, Save/Record Listing buttons, and notes textarea all work unmodified — `applyCaptureResult`/`setResult`/`findPriorCompanyWarning` are all generic over `lastCaptureRecord`, so `runCapturePage()` only needed its own injected function and the placeholder-resolution step. `captureButton`/`capturePageButton` are now disabled/re-enabled together across all four capture/save/record code paths.

**Technical Notes:**
Relevant files: `extension/popup/popup.html`, `extension/popup/popup.js` (`elements`, `runCapture`, `runCapturePage`, `captureActiveTabWithChecks`, `captureGenericPageWithChecks`, `resolveUnknownCompanyPlaceholder`, `applyCaptureResult`).

### Phase 3: Save Pipeline Verification

**Status:** Work Complete

- [x] Confirmed `saveCaptureRecord()` needed no changes: verified end-to-end with a fake project handle (see `runGetNextUnknownCompanyPlaceholderTest` in `extension/tests/persistence.test.mjs`) that a `DIRECT`/`UNKNOWN`-filled record with a `NNNU_UNKNOWN` company saves cleanly (JSON/TXT/MD written, CSV row appended, filename starts with the placeholder).
- [x] Verified `recordToCsvValues()`/`CSV_COLUMNS` round-trip `'UNKNOWN'` and `###U_UNKNOWN` correctly — no special-casing needed.
- [x] Confirmed no race: the placeholder number is computed once per capture (in `captureGenericPageWithChecks()`), by reading `job-tracking.csv` fresh each time — a second, not-yet-saved "Capture Page" click in the same session re-reads the file rather than reusing a cached number. Two such captures without an intervening save can still propose the same number (accepted per Open Question 5).

**Technical Notes:**
No new CSV column was needed. `getNextUnknownCompanyPlaceholder()` needed to be added to `saveListing.js` (see Phase 1) but that was scoped as new implementation there, not here.

### Phase 4: Tests

**Status:** Work Complete

- [x] Added `runGenericPageRichMetadataTest()` and `runGenericPageBarePageFallbackTest()` to `extension/tests/captureActivePage.smoke.test.mjs`, using the existing `setMockPage()` helper with body text mirroring the Stripe fixture's sidebar/salary-sentence shape. Covers: rich-metadata resolution (company/title/location/employmentType/salary), `UNKNOWN` fallback for absent fields, `applyType` always `DIRECT`, `linkedinJobId` always `UNKNOWN`, and the bare-page case where `company` stays `''` (not a placeholder — that's the popup's job) with warnings for company/description.
- [x] Added `nextUnknownCompanyNumber`/`formatUnknownCompanyPlaceholder` assertions to `runCsvTests()` in `extension/tests/persistence.test.mjs`: empty CSV → `1`; header-only CSV → `1`; mixed rows (`001U_UNKNOWN`, `003U_UNKNOWN`, a renamed `002U_Acme`, a non-matching `"500U Logistics"`, and out-of-width near-misses `12U_UNKNOWN`/`1234U_UNKNOWN`) → `4`; zero-padding for both `9` and `142`.
- [x] Added `runGetNextUnknownCompanyPlaceholderTest()` to `extension/tests/persistence.test.mjs`, using the existing `fakeProjectHandle()`/`fakeWritableFile()` pattern: no CSV yet → `001U_UNKNOWN`; a seeded CSV with a renamed `004U_Acme` row → `005U_UNKNOWN`; then a full `saveCaptureRecord()` round trip with that placeholder confirming the filename and CSV row both carry it.
- [x] `notes` passthrough was not given a separate generic-parser test: it's the same `lastCaptureRecord.notes = elements.notesInput.value` assignment `runSave()`/`runRecordListing()` already use, unchanged by this cycle, and is exercised by the existing popup smoke test's click-handler-registration check plus manual verification.
- [x] Updated `extension/README.md` with a new "Capture Page (Non-LinkedIn Listings)" section, and bumped `extension/manifest.json` to `0.0.30.0`.
- [x] Added `#capturePageButton` to the button-selector list in `extension/tests/popup.module.smoke.test.mjs`.

**Technical Notes:**
All five test suites pass: `node extension/tests/{captureActivePage.smoke,pagingUrl,persistence,popup.module.smoke,searchUrlBuilder}.test.mjs`. No live-browser verification was performed (no browser environment available in this session) — see Completion Summary.

---

## Open Questions

1. **What should `linkedinJobId` hold for a non-LinkedIn capture — `'UNKNOWN'`, or an empty string since the field is inherently LinkedIn-specific and not "unparsed"?**
   Decision: `'UNKNOWN'`, for consistency with every other non-`company` field per the stated goal, rather than carving out a silent exception a future reader would have to notice.

2. **Should the generic parser attempt JSON-LD `JobPosting` structured-data extraction, or start with simpler signals (document title, meta tags) and treat JSON-LD as a stretch goal?**
   Decision: Not implemented. The Stripe fixture (the only reference page available) has no JSON-LD `JobPosting` data — only `og:title`/`og:description`/`og:url`, which add nothing beyond what `<title>` already provides. The label-line/next-line sidebar scan and the `<title>` `"X Careers"` convention cover what's actually present. Revisit if a future fixture demonstrates JSON-LD is common enough to be worth the added parsing surface.

3. **Does "Capture Page" need its own popup button state machine, or can it share `runCapture()`/`lastCaptureRecord` wholesale (just swapping which content-script function is injected)?**
   Decision: Shared wholesale, as recommended. `runCapturePage()`/`captureGenericPageWithChecks()` differ from `runCapture()`/`captureActiveTabWithChecks()` only in which function is injected and the added company-placeholder resolution step; `applyCaptureResult`, `setResult`, `findPriorCompanyWarning`, and the Save/Record Listing buttons required no changes.

4. **Is the `###U_` counter scoped to `job-tracking.csv` only, or should it also consider `other-listings.csv` and/or existing `saved-listings/` filenames?**
   Recommendation: Scope it to `job-tracking.csv`'s `company` column only. That's the file "Capture Page" writes to, it's a single small read the popup already has infrastructure for, and it keeps the rule simple and exactly matching the user's stated instruction ("always look for `###U_` to know what to increment"). If a gap between the CSV and `saved-listings/` ever appears (e.g. a row manually deleted from the CSV but its files kept), it can be revisited then.

5. **What happens if two "Capture Page" captures happen in the same popup session before either is saved (i.e. before the CSV row exists)?**
   Recommendation: Compute the next number at capture time (when Phase 1's helper runs), not at save time. Accept that two captures in a row without saving in between could both propose the same number (e.g. both `001U_UNKNOWN`) — a rare sequencing edge case the user can resolve by hand (the numbers only need to be unique enough to be a helpful search key, not a strict database sequence), rather than adding cross-capture in-popup state to prevent it.

6. **What happens once the counter reaches `999`?**
   Recommendation: Out of scope for this cycle — at one capture per placeholder this would take a very long time to hit, and the user is expected to periodically rename placeholders (which, per Open Question 4's scoping, removes them from future max-scans once they no longer match `###U_`... note this is *not* true under the prefix-only rule, since a renamed `002U_Acme` still matches `###U_` and continues to count toward the max — so the ceiling is truly on total placeholders ever created, not outstanding ones). Flag for a future cycle if it ever becomes a real constraint.

---

## Notes and Risks

- **Reference fixture:** `doc/examples/Stripe Careers _ Software Engineer, Product Security Data Platforms.mhtml` is the only non-LinkedIn example currently available. It's an `.mhtml` file, unlike the `.html` fixtures used elsewhere in `doc/examples/`; existing tests don't parse fixture files directly (they build synthetic DOM nodes informed by manual inspection — see `captureActivePage.smoke.test.mjs`), so this is not expected to require new fixture-loading infrastructure, but it does mean the Stripe page's structure must be inspected by hand (or converted to `.html`) rather than programmatically.
- **Risk:** Generic parsing across arbitrary career sites is inherently much less reliable than the LinkedIn-specific parser, which was tuned against several verified LinkedIn markup variants. Expect `UNKNOWN` to be the common case for most fields beyond `company`/`title`/`description`, and design the feature around that being an acceptable, expected outcome rather than a parsing failure to chase.
- **Scope boundary:** This cycle does not change the existing "Capture Active Tab" / LinkedIn parsing path, nor the "Record Listing" (`other-listings.csv`) path — it adds a third, parallel capture entry point.

---

## Completion Summary

**Completion Date:** 2026-08-11
**Phases Completed:** All
**Work Deferred:** Live-browser verification (see Lessons / Notes below) — this cycle stops at Work Complete per [[DevelopmentProcess]]; a human should exercise "Capture Page" against a real, non-LinkedIn career page (ideally the live Stripe listing, or another ATS-hosted page) before this is marked Verified.

**Accomplishments:**
- Added `captureGenericPage()` (`extension/content/captureActivePage.js`): a self-contained, best-effort parser for arbitrary career pages that always returns `ok: true`, resolves `company`/`location`/`employmentType`/`workplaceType`/`postedText`/`applicantCountText` via an exact-match sidebar label-line scan, `company`/`title` also via a `<title>` `"X Careers"` convention, `salaryText` via a `$X - $Y` pattern scanned across all lines, and `description` as the body text bounded between the resolved title and the first "Apply" line — falling back to the literal string `UNKNOWN` (or `''` for `company`, pending the placeholder step) for anything unresolved.
- Added `nextUnknownCompanyNumber()`/`formatUnknownCompanyPlaceholder()` (`extension/shared/csv.js`) and `getNextUnknownCompanyPlaceholder()` (`extension/shared/saveListing.js`) implementing the `NNNU_UNKNOWN` numbered-placeholder scheme: prefix-only matching (`/^(\d{3})U_/`) so a placeholder the user has already manually renamed to `NNNU_COMPANYNAME` still counts toward the next number.
- Added the "Capture Page" button (`extension/popup/popup.html`) and its `runCapturePage()`/`captureGenericPageWithChecks()`/`resolveUnknownCompanyPlaceholder()` handlers (`extension/popup/popup.js`), sharing the existing result panel, prior-company warning, Save/Record Listing buttons, and notes textarea unmodified.
- Caught and fixed two bugs during hand-verification against the Stripe fixture: a salary-regex character class that swallowed a trailing sentence period as a decimal point, and label-pair-extracted employment/workplace type values bypassing the existing normalizer.
- Added regression coverage: two new `captureGenericPage()` tests (rich metadata, bare-page fallback) in `captureActivePage.smoke.test.mjs`; `nextUnknownCompanyNumber`/`formatUnknownCompanyPlaceholder` unit assertions and a `getNextUnknownCompanyPlaceholder()`-plus-full-save integration test in `persistence.test.mjs`; `#capturePageButton` added to the button-selector list in `popup.module.smoke.test.mjs`.
- Documented the feature in `extension/README.md` ("Capture Page (Non-LinkedIn Listings)") and bumped `extension/manifest.json` to `0.0.30.0`.

**Metrics:**
- Files modified: `extension/content/captureActivePage.js`, `extension/shared/csv.js`, `extension/shared/saveListing.js`, `extension/popup/popup.html`, `extension/popup/popup.js`, `extension/manifest.json`, `extension/README.md`, `extension/tests/captureActivePage.smoke.test.mjs`, `extension/tests/persistence.test.mjs`, `extension/tests/popup.module.smoke.test.mjs`, plus this DevCycle document.
- Tests passing: all five suites (`captureActivePage.smoke`, `pagingUrl`, `persistence`, `popup.module.smoke`, `searchUrlBuilder`).

**Lessons / Notes:**
`captureGenericPage()` was hand-verified against `doc/examples/Stripe*.mhtml` by decoding its quoted-printable HTML with a throwaway Node script (no browser environment was available in this session) and feeding the resulting text through the parser directly — this caught both bugs listed above before they shipped. That verification method proves the parser handles the one real fixture available; it does not prove the label-scan or `"X Careers"` heuristics generalize to other ATS platforms (Greenhouse, Lever, Workday, etc.), since no other non-LinkedIn fixture exists yet. If "Capture Page" turns out to resolve mostly `UNKNOWN` fields on real-world pages beyond Stripe-shaped ones, that's expected per this cycle's Notes and Risks, not a regression — but it's worth collecting a second reference fixture from a different ATS in a future cycle to broaden the heuristics with evidence rather than guesswork.
