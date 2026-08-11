# DevCycle 030: Capture Non-LinkedIn Job Listings

**Status:** Planning
**Start Date:** 2026-08-11
**Target Completion:** TBD
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

**Status:** Planning

- [ ] Inspect the Stripe example (`doc/examples/Stripe Careers _ Software Engineer, Product Security Data Platforms.mhtml`) to identify what's realistically parseable from a generic careers page (page title, `og:` / JSON-LD `JobPosting` meta tags if present, heading text, etc.) versus what should just fall back to `UNKNOWN`.
- [ ] Add a new capture function (e.g. `captureGenericPage()`), likely alongside `captureActivePage()` in `extension/content/captureActivePage.js` or a new sibling module, that:
  - Never checks for a LinkedIn hostname — it should treat any page as capturable.
  - Attempts to extract `company`, `title`, `location`, `workplaceType`, `employmentType`, `postedText`, `applicantCountText`, `salaryText`, and a `description`/`descriptionMarkdown` using generic signals (document title, common meta tags, JSON-LD `JobPosting` schema if present). Reuse existing helpers from `captureActivePage.js` (`normalizeLine`, `normalizeBlock`, markdown extraction helpers) where they're not LinkedIn-specific, rather than duplicating them.
  - Sets any field other than `company` that it cannot confidently determine to the literal string `'UNKNOWN'` (not `''`).
  - Leaves `company` resolution to the numbered-placeholder logic below when it can't be parsed — the content script itself doesn't know the next number (it has no access to `job-tracking.csv`), so it should return an unresolved-company signal (e.g. `record.company = ''`, or a `companyResolved: false` flag) for the caller to fill in.
  - Sets `applyType` to `'DIRECT'` unconditionally.
  - Sets `linkedinJobId` to `'UNKNOWN'` (or leaves the field out of scope — see Open Questions).
  - Returns the same `{ ok, record, warnings, ... }` envelope shape `captureActivePage()` returns, so `popup.js` can reuse `applyCaptureResult`/`setResult` largely as-is.
- [ ] Add a `nextUnknownCompanyNumber()`-style helper (likely in `extension/shared/saveListing.js` or `csv.js`, since it needs `job-tracking.csv` access already available there) that:
  - Reads `job-tracking.csv`'s `company` column, matches values against `/^(\d{3})U_/` (prefix only — deliberately does **not** require a trailing `UNKNOWN`, since the user will have manually renamed some of them to `###U_COMPANYNAME` by the time this runs again), and returns one more than the highest 3-digit number found (or `1` if none exist).
  - Zero-pads the returned number to 3 digits when building the placeholder (`String(n).padStart(3, '0')`), and only relies on the regex capturing exactly 3 digits to parse existing values — a placeholder is `###U_`, not `##U_` or `####U_`.
  - Ignores any company text that doesn't start with exactly 3 digits followed by `U_` (so a company literally named e.g. "500U Logistics" — 3 digits, but no underscore after `U` — is correctly not misread as a placeholder).
  - Runs when the popup applies the "Capture Page" result (after a successful capture, before Save is available) rather than at content-script injection time, since it needs a project-folder file read.
- [ ] Confirm `baseListingFilename()` (`extension/shared/filename.js`) behaves sensibly for a `company` value like `001U_UNKNOWN` (it will slugify to `001u-unknown`, which is fine — no code change expected, just verify).

**Technical Notes:**
Relevant files: `extension/content/captureActivePage.js` (existing LinkedIn parser and helpers to reuse), `extension/shared/filename.js` (`baseListingFilename`, `slugify`).

### Phase 2: Popup UI Wiring

**Status:** Planning

- [ ] Add a `capturePageButton` ("Capture Page") to `extension/popup/popup.html`, positioned directly below `#captureButton` ("Capture Active Tab").
- [ ] Wire a `runCapturePage()` handler in `extension/popup/popup.js`, mirroring `runCapture()`/`captureActiveTabWithChecks()` but injecting `captureGenericPage` instead of `captureActivePage` via `chrome.scripting.executeScript`.
- [ ] After a successful capture with no resolved `company`, call Phase 1's `nextUnknownCompanyNumber()` helper against the project folder's `job-tracking.csv` and set `record.company` to the zero-padded `` `${String(n).padStart(3, '0')}U_UNKNOWN` `` before displaying the result / enabling Save.
- [ ] Confirm the existing result panel, prior-company warning, Save/Record Listing buttons, and notes textarea all work unmodified against a `DIRECT`-sourced record (they're generic over `lastCaptureRecord` today, so this should mostly be "wire the button and reuse `applyCaptureResult`").

**Technical Notes:**
Relevant files: `extension/popup/popup.html`, `extension/popup/popup.js` (`elements`, `runCapture`, `captureActiveTabWithChecks`, `applyCaptureResult`).

### Phase 3: Save Pipeline Verification

**Status:** Planning

- [ ] Confirm `saveCaptureRecord()` (`extension/shared/saveListing.js`) — used by the existing "Save Capture" button — needs no changes to handle a `DIRECT` record: it only requires `url`, `captureTimeUtc`, `captureDateLocal`, `captureTimeLocal` (via `assertMinimumRecord`), and already writes JSON + `.txt` + `.md` to `saved-listings/` plus a row to `job-tracking.csv` (`CSV_FILENAME`).
- [ ] Verify `recordToCsvValues()`/`CSV_COLUMNS` (`extension/shared/csv.js`) round-trip `'UNKNOWN'` and `###U_UNKNOWN` field values correctly (no special-casing needed — they're just strings).
- [ ] Double check there's no race between Phase 2's `nextUnknownCompanyNumber()` read and the eventual save: the number is read once at capture time, and the CSV row for *this* capture doesn't exist yet at that point, so it can't self-collide — but confirm a second, not-yet-saved "Capture Page" click in the same popup session re-reads the CSV rather than caching a stale next-number (see Open Question 5).

**Technical Notes:**
No new CSV column is expected. This phase is verification, not new implementation, unless testing surfaces a gap.

### Phase 4: Tests

**Status:** Planning

- [ ] Add unit tests for the new generic parser (likely `extension/tests/captureGenericPage.test.mjs` or extending `captureActivePage.smoke.test.mjs`), following the existing pattern of hand-built fake DOM nodes (see `captureActivePage.smoke.test.mjs`) informed by the structure observed in the Stripe `.mhtml` fixture.
- [ ] Cover: a page with rich metadata (most fields parsed), a bare page with none (everything falls back to `UNKNOWN`, `company` falls back to `###U_UNKNOWN`), `applyType` always `DIRECT`, and `notes` passthrough from the popup.
- [ ] Add focused tests for `nextUnknownCompanyNumber()`: empty CSV → `1`; existing `001U_UNKNOWN`/`003U_UNKNOWN` rows → `4`; a row already manually renamed to `002U_Acme` still counts toward the max (prefix-only match, no `UNKNOWN` requirement); a real company name that happens to contain digits followed by `U_` in an unrelated way is not miscounted; non-3-digit or malformed near-matches (e.g. `12U_UNKNOWN`, `1234U_UNKNOWN`) are ignored; output is always zero-padded to 3 digits (e.g. `9` → `009U_UNKNOWN`).
- [ ] Update `extension/README.md` to document the new button and capture path, consistent with how prior DevCycles have documented behavior changes there.

**Technical Notes:**
Relevant files: `extension/tests/captureActivePage.smoke.test.mjs` (pattern to follow), `extension/README.md`.

---

## Open Questions

1. **What should `linkedinJobId` hold for a non-LinkedIn capture — `'UNKNOWN'`, or an empty string since the field is inherently LinkedIn-specific and not "unparsed"?**
   Recommendation: Use `'UNKNOWN'` for consistency with every other non-`company` field per the stated goal, rather than carving out a silent exception a future reader would have to notice.

2. **Should the generic parser attempt JSON-LD `JobPosting` structured-data extraction, or start with simpler signals (document title, meta tags) and treat JSON-LD as a stretch goal?**
   Recommendation: Check what's actually present in the Stripe fixture first (Phase 1's first task) before committing to a parsing strategy — many ATS-hosted career pages (Greenhouse, Lever, Workday, etc.) do embed `JobPosting` JSON-LD, which would be far more reliable than text-position heuristics, but it's worth confirming rather than assuming.

3. **Does "Capture Page" need its own popup button state machine, or can it share `runCapture()`/`lastCaptureRecord` wholesale (just swapping which content-script function is injected)?**
   Recommendation: Share as much as possible — the record shape, result panel, notes field, and Save/Record Listing buttons are already generic. A separate `runCapturePage()` should only differ in which function it injects and the resulting `sourceWebsite`/`applyType` values.

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

*Fill in when the cycle closes. Move this document to `doc/planning/completed/` afterward.*

**Completion Date:** [YYYY-MM-DD]
**Phases Completed:** [List or "All"]
**Work Deferred:** [What was not done and why, or "None"]

**Accomplishments:**
- [What was built or changed]
- [What was built or changed]

**Metrics:**
- Files modified: [N]
- [Other relevant measure: e.g., tests passing, lines reduced, features shipped]

**Lessons / Notes:**
[Anything worth remembering for future cycles: surprises, decisions made, things that worked well or didn't.]
