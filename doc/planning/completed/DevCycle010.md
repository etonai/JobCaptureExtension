# DevCycle 010: Prevent Misleading Salary Capture

**Status:** Verified
**Start Date:** 2026-07-10
**Target Completion:** TBD
**Focus:** Fix salary extraction so jobs without a salary range do not write misleading salary values to capture output or `job-tracking.csv`.

---

## Goal

DevCycle010 fixes a salary capture correctness problem. The current extension appears to fill `salaryText` for some jobs that do not actually show a salary range on the selected job listing, and that misleading value then lands in `job-tracking.csv`.

This cycle should make salary capture conservative: if the active job listing does not clearly display compensation for that listing, the captured salary field should remain blank.

## Desired Outcome

After this cycle is complete:

- jobs with a visible salary range still capture the visible salary text
- jobs without a visible salary range produce a blank salary field
- `job-tracking.csv` does not receive salary values inferred from unrelated page text, neighboring job cards, recommendations, filters, or stale content
- the popup summary accurately shows `Salary` as `Not captured` when no salary was captured
- regression tests cover at least one salary-present case and one salary-absent case
- the manifest version is bumped for reload verification

---

## Tasks

### Phase 1: Reproduce And Identify Salary Leakage Source

**Status:** Verified

- [x] Review the current salary extraction logic in the LinkedIn parser.
- [x] Identify where `salaryText` can be populated when the selected job has no salary range.
- [x] Check whether the source is page-wide visible text, neighboring job cards, LinkedIn search filters, stale job panes, or another pattern.
- [x] Add or update a fixture that represents a job listing with no visible salary range.
- [x] Document the suspected failure mode in this DevCycle before changing parser behavior.

**Technical Notes:**

Likely files:

- `extension/content/captureActivePage.js`
- `extension/tests/captureActivePage.smoke.test.mjs`
- `doc/examples/` fixtures if a new no-salary example is needed
- `extension/PARSER_NOTES.md` if parser behavior notes should be updated

The investigation should focus on preventing false positives. It is acceptable for the parser to miss ambiguous salary-like text if it is not clearly part of the selected job listing.

### Phase 2: Tighten Salary Extraction

**Status:** Verified

- [x] Update salary extraction to only accept salary text from the selected job details context.
- [x] Avoid using broad page-level salary matches when they may come from unrelated LinkedIn content.
- [x] Preserve existing valid salary capture behavior for jobs that clearly show compensation.
- [x] Ensure blank or absent salary remains an empty string in the captured record.
- [x] Bump `extension/manifest.json` version for reload verification.

**Technical Notes:**

Recommended approach:

- Prefer extraction from bounded job detail text near stable job fields rather than scanning all `document.body.innerText` indiscriminately.
- Treat salary as optional and conservative.
- Do not invent normalized salary values in this cycle; continue storing the visible text only when it is trustworthy.

### Phase 3: Regression Checks And Documentation

**Status:** Verified

- [x] Add or update parser smoke tests for salary-present capture.
- [x] Add or update parser smoke tests for salary-absent capture.
- [x] Confirm CSV serialization writes a blank salary field when `salaryText` is blank.
- [x] Run syntax checks and parser/persistence regression tests.
- [x] Update relevant documentation if the salary extraction behavior or known limitations changed.
- [x] Record implementation notes and test results in this DevCycle document.

**Technical Notes:**

Regression checks should include:

```powershell
node --check extension/content/captureActivePage.js
node --check extension/popup/popup.js
node --check extension/shared/csv.js
node extension/tests/captureActivePage.smoke.test.mjs
node extension/tests/persistence.test.mjs
```

Manual verification should include capturing at least one LinkedIn job with a visible salary range and at least one LinkedIn job with no visible salary range, then checking the popup summary and `job-tracking.csv`.

---

## Open Questions

1. **Should ambiguous compensation text be captured?**
   Recommendation: no. If the parser cannot confidently associate compensation text with the selected job details, leave `salaryText` blank.

2. **Should this cycle clean up existing misleading salary values already written to `job-tracking.csv`?**
   Recommendation: no. This cycle should fix future captures only. Editing historical CSV rows should be a separate, explicit data-cleanup cycle if needed.

3. **Should salary extraction be converted into normalized min/max fields?**
   Recommendation: no. Continue preserving visible salary text in this cycle; normalization would be a separate design decision.

---

## Notes and Risks

- LinkedIn pages can contain salary-like text outside the selected job listing, especially in search results, recommended jobs, or filters.
- A conservative parser may leave some real but oddly placed salary text blank. That is preferable to writing misleading salary values to the CSV.
- The existing CSV schema should not change in this cycle.
- Per project process, implementation should not begin until this DevCycle document is reviewed and explicitly approved.

---

## Implementation Notes

Implemented on 2026-07-10 by Codex after user approval to implement DevCycle010.

Suspected failure mode:

- The prior parser scanned all header lines before `About the job` for salary-like text.
- On LinkedIn search/detail pages, that header area can include salary text from neighboring job cards, recommended jobs, filters, or stale page content.
- The fix narrows salary capture to selected-job detail lines after the selected job metadata line.

Behavior implemented:

- Valid salary-present fixtures continue to capture visible salary ranges.
- A salary-like line before the selected job metadata no longer populates `salaryText`.
- If the selected job does not show a salary in its detail lines, `salaryText` remains blank.
- CSV serialization preserves a blank `salaryText` as a blank salary column.
- Manifest version bumped to `0.0.10.0` for reload verification.

Files changed:

- `extension/content/captureActivePage.js`
- `extension/tests/captureActivePage.smoke.test.mjs`
- `extension/tests/persistence.test.mjs`
- `extension/manifest.json`
- `extension/PARSER_NOTES.md`
- `doc/planning/DevCycle010.md`

Automated checks run:

```powershell
node --check extension/content/captureActivePage.js
node --check extension/popup/popup.js
node --check extension/shared/csv.js
node extension/tests/captureActivePage.smoke.test.mjs
node extension/tests/persistence.test.mjs
```

All automated checks passed.

Manual verification remains pending and should include one salary-present LinkedIn job and one salary-absent LinkedIn job.

---

## Completion Summary

*Fill in when the cycle closes. Move this document to `doc/planning/completed/` afterward.*

**Completion Date:** 2026-07-10
**Phases Completed:** Phase 1, Phase 2, and Phase 3 verified.
**Work Deferred:** None.

**Accomplishments:**
- Tightened salary extraction so unrelated salary-like header text is ignored.

**Metrics:**
- Files modified: 6
- Tests passing: 5 automated checks listed above

**Lessons / Notes:**
Conservative salary capture is preferable to misleading salary data in the CSV. Future improvements can add richer DOM-bounded extraction if LinkedIn markup provides a stable salary container.
