# DevCycle 009: Old Tracking Prior Company Warning

**Status:** Verified
**Start Date:** 2026-07-07
**Target Completion:** TBD
**Focus:** Extend the prior-company warning to also check `old-tracking.txt` beside `job-tracking.csv`.

---

## Goal

DevCycle009 extends the prior-company warning added in DevCycle008. In addition to checking `job-tracking.csv`, the extension should also check an `old-tracking.txt` file in the configured project folder. This file represents companies applied to before the Job Capture extension existed.

When the captured company appears in `old-tracking.txt`, the extension should show the existing yellow warning in the status panel and identify that the prior entry came from `old-tracking.txt`.

## Desired Outcome

After Capture Active Tab, the user should be warned if the captured company appears either in current extension tracking or in the older manual tracking list.

Success looks like:

- capture still works normally on LinkedIn job pages
- the extension reads `old-tracking.txt` from the same project folder as `job-tracking.csv`
- `old-tracking.txt` is treated as optional
- one non-empty company name per line is parsed from `old-tracking.txt`
- matching uses the same company normalization behavior as the CSV warning
- if the company appears in `old-tracking.txt`, the yellow status warning says:

```text
Previously captured company
You have 1 prior entry for COMPANYNAME in old-tracking.txt
```

- if the company appears in `job-tracking.csv` but not `old-tracking.txt`, the existing CSV warning continues to appear
- save behavior remains unchanged
- missing or unreadable `old-tracking.txt` does not break capture

---

## Tasks

### Phase 1: Old Tracking File Format And Matching Design

**Status:** Verified

- [x] Confirm `old-tracking.txt` lives in the configured project folder beside `job-tracking.csv`.
- [x] Parse `old-tracking.txt` as one company per non-empty line.
- [x] Trim leading/trailing whitespace from each line.
- [x] Ignore blank lines.
- [x] Reuse the existing normalized company matching behavior from the CSV prior-company lookup.
- [x] Define source precedence when both `old-tracking.txt` and `job-tracking.csv` match.

**Technical Notes:**

The example file at `doc/examples/old-tracking.txt` is a plain text list:

```text
OpenAI
Seatgeek
Pinterest
...
```

The file may contain mixed casing, trailing spaces, and duplicate companies. The implementation should not require sorting, headers, dates, or CSV parsing for this file.

Recommended source precedence:

- If `old-tracking.txt` matches, show the `old-tracking.txt` warning requested by the user.
- If `old-tracking.txt` does not match but `job-tracking.csv` matches, show the existing CSV warning.
- If both match, prefer the `old-tracking.txt` warning because the user specifically wants to know when the company is on that legacy list.

### Phase 2: Implement Old Tracking Warning Source

**Status:** Verified

- [x] Add helper logic to parse `old-tracking.txt` company lines.
- [x] Add helper logic to find a matching company in the old-tracking list.
- [x] Update the popup's post-capture warning lookup to check `old-tracking.txt`.
- [x] Preserve the existing CSV warning behavior.
- [x] Show the requested warning text when the old-tracking list matches:

```text
You have 1 prior entry for COMPANYNAME in old-tracking.txt
```

- [x] Ensure missing `old-tracking.txt` is non-blocking.
- [x] Ensure unreadable `old-tracking.txt` is non-blocking.
- [x] Bump the manifest version for reload verification.

**Technical Notes:**

Likely files:

- `extension/popup/popup.js`
- `extension/shared/csv.js` or a new/shared helper module if company matching should be reused outside CSV-specific code
- `extension/tests/persistence.test.mjs` or a focused test file for old-tracking parsing/matching
- `extension/README.md` to document the optional `old-tracking.txt` file
- `doc/planning/DevCycle009.md` to record implementation and verification results after approval

The implementation should only read `old-tracking.txt`. It should not create, rewrite, append, sort, or deduplicate that file.

### Phase 3: Regression And Manual Verification

**Status:** Verified

- [x] Verify capture still succeeds when `old-tracking.txt` is absent.
- [x] Verify capture still succeeds when `old-tracking.txt` is empty.
- [x] Verify no old-tracking warning appears when the captured company is absent from the file.
- [x] Verify the requested yellow warning appears when the captured company is present in `old-tracking.txt`.
- [x] Verify the existing CSV warning still appears when the company is only in `job-tracking.csv`.
- [x] Verify old-tracking warning precedence when the company appears in both files.
- [x] Verify Save Capture still writes JSON, TXT, MD, CSV, and notes as before.

**Technical Notes:**

Regression checks should include:

```powershell
node --check extension/popup/popup.js
node --check extension/shared/csv.js
node --check extension/shared/saveListing.js
node extension/tests/captureActivePage.smoke.test.mjs
node extension/tests/persistence.test.mjs
```

Manual testing should use a project folder containing both `job-tracking.csv` and `old-tracking.txt`, with at least one company that exists only in `old-tracking.txt`.

---

## Open Questions

1. **Should `old-tracking.txt` use exact normalized matching or broader fuzzy matching?**
   Recommendation: reuse the current normalized company matching from DC8, including simple variants like `Uber` versus `Uber Technologies, Inc.`, but avoid broad fuzzy matching.

2. **Should duplicate lines in `old-tracking.txt` change the warning count?**
   Recommendation: no. The requested warning says `1 prior entry`, so the old-tracking warning should report one prior legacy entry for the company regardless of duplicate lines.

3. **Should `old-tracking.txt` dates be supported later?**
   Recommendation: not in this cycle. The current format is company-only, so the warning should not mention dates for old-tracking matches.

---

## Notes and Risks

- `old-tracking.txt` is user-maintained plain text, so whitespace, casing, duplicates, and naming variants are expected.
- The file should be optional. A missing file should not be treated as an error.
- The warning text should make the source clear so the user can distinguish legacy tracking from extension-created CSV tracking.
- This DevCycle should not change save behavior or write to `old-tracking.txt`.
- Per the project process, implementation should not begin until this DevCycle document is reviewed and explicitly approved.

---

## Implementation Notes

Implemented on 2026-07-07 by Codex after user approval to implement DevCycle009.

Files changed:

- `extension/shared/csv.js`
- `extension/popup/popup.js`
- `extension/tests/persistence.test.mjs`
- `extension/manifest.json`
- `extension/README.md`
- `doc/planning/DevCycle009.md`

Behavior implemented:

- `old-tracking.txt` is read from the configured project folder beside `job-tracking.csv`.
- The file is parsed as one company per non-empty trimmed line.
- Matching reuses the same normalized company matching used by CSV prior-company warnings.
- `old-tracking.txt` matches take precedence over CSV matches.
- Missing or unreadable `old-tracking.txt` is ignored so capture and CSV warning behavior continue.
- The extension only reads `old-tracking.txt`; it does not create, edit, sort, or deduplicate it.
- Manifest version bumped to `0.0.9.0` for reload verification.

Automated checks run:

```powershell
node --check extension/popup/popup.js
node --check extension/shared/csv.js
node --check extension/shared/saveListing.js
node --check extension/content/captureActivePage.js
node extension/tests/captureActivePage.smoke.test.mjs
node extension/tests/persistence.test.mjs
node -e "JSON.parse(require('fs').readFileSync('extension/manifest.json','utf8')); console.log('manifest json ok')"
```

All automated checks passed.

---

## Completion Summary

*Fill in when the cycle closes. Move this document to `doc/planning/completed/` afterward.*

**Completion Date:** 2026-07-07
**Phases Completed:** Phase 1, Phase 2, and Phase 3 verified.
**Work Deferred:** None.

**Accomplishments:**
- Added optional old-tracking prior-company warning with old-tracking precedence over CSV warnings.

**Metrics:**
- Files modified: 6
- Tests passing: 7 automated checks listed above

**Lessons / Notes:**
Keep `old-tracking.txt` read-only in the extension. The file is a user-maintained legacy source and should remain outside save behavior.



