# DevCycle 033: Detect LinkedIn's Exact-Match Boundary

**Status:** VERIFIED
**Start Date:** 2026-08-20
**Target Completion:** 2026-08-24
**Focus:** Detect LinkedIn's transition from exact search matches to related results, notify the user, and record the exact-match count in `search-tracking.csv`.

---

## Goal

LinkedIn sometimes inserts the message "We found more results related to your search that may not be exact matches, but could still be a great fit." in the left-hand search-results column and continues showing job cards below it. The extension currently treats the list as one uninterrupted result set, so the user receives no warning that the remaining jobs may be less relevant and `search-tracking.csv` does not record where exact matches ended.

This cycle will detect that message conservatively, notify the user in the popup, and add an `exactMatches` column to the search-tracking schema. The value will remain `UNKNOWN` until the boundary is actually observed; once observed, it will record the number of job cards that appeared before the boundary across the current paged search.

## Desired Outcome

- A Recent Postings scan detects the exact LinkedIn message in the left-hand results column without confusing matching text elsewhere on the page for the boundary.
- When the message is detected, the popup clearly tells the user that LinkedIn has begun showing related/non-exact results.
- The notification is a persistent, non-modal warning for the active search: it reappears whenever the popup is opened after detection and clears only when a new search is started.
- The active search row in `search-tracking.csv` gains an `exactMatches` value equal to the number of result cards before the boundary across all pages scanned in that search.
- New search rows and scans where the boundary has not been observed use `UNKNOWN`; absence of the message must not be interpreted as proof that every result is an exact match.
- Existing 2-, 3-, and 5-column `search-tracking.csv` rows migrate safely to the new schema with `exactMatches` set to `UNKNOWN`, preserving all existing values.
- Detection and CSV persistence fail safely if LinkedIn changes its wording or DOM structure.

---

## Tasks

### Phase 1: Define and Capture the Exact-Match Boundary

**Status:** Work Complete

- [x] Add a normalized-text detector for LinkedIn's exact-match boundary message inside `captureRecentJobPostings()`.
- [x] Scope detection to the left-hand results list and prefer semantic/structural relationships over generated LinkedIn class names.
- [x] Determine the boundary's position relative to detected result cards, including cards after the message and lazily rendered page content.
- [x] Return explicit boundary metadata from the injected scan result (detected/not detected plus the number of cards before it), separate from the age-filtered Recent Postings listings.
- [x] Fail to an unknown result when the message or its position cannot be established confidently.
- [x] Add capture smoke-test fixtures for no message, message between cards, harmless matching text outside the result list, and minor whitespace differences.

**Technical Notes:**
The primary implementation point is `extension/content/captureActivePage.js` (`captureRecentJobPostings`). Exact-match counting must use all detected result cards before the boundary, not only postings that pass the configured Recent Postings age filter and not only listings with a known company. The supplied English sentence is the initial supported message; normalize whitespace and punctuation conservatively, but do not use a loose substring that could create false positives.

### Phase 2: Notify the User and Track the Search-Level Count

**Status:** Work Complete

- [x] Add exact-match boundary state to the existing per-search paging/session state, or introduce a narrowly scoped companion state if that keeps responsibilities clearer.
- [x] Accumulate the count across scanned pages so a boundary found on a later page includes cards from earlier pages in the same search.
- [x] Freeze the first confidently observed search-level boundary for the active search. A later scan or rescan must not replace that stored count even if lazy rendering produces a different card count; retain the first value and log the disagreement for diagnostics.
- [x] Reset exact-match state whenever a new generic or premium search is opened, consistent with the current Recent Postings session reset behavior.
- [x] Show a prominent, non-modal popup warning when the boundary is detected, including the exact-match count when known.
- [x] Persist the warning for the active search so it reappears on every popup open after detection; do not add dismissal controls or a separate "already notified" state in this cycle.
- [x] Keep the existing Recent Postings list, highlighting, count, and CSV running-total behavior unchanged.
- [x] Add popup/session tests covering first-page detection, later-page detection, repeated scans, page navigation, and starting a new search.

**Technical Notes:**
Relevant files include `extension/popup/popup.js`, `extension/popup/popup.html`, popup styling if a distinct notification treatment is needed, and the session helpers in `extension/shared/recentPostingsTracking.js`. The user notification should coexist with Recent Postings results rather than replacing or hiding them. It is intentionally persistent rather than one-shot: reopening the popup for the same search should still show the warning, while opening a new search resets it. Repeated automatic and manual scans must be idempotent. "First observation wins" applies to the first boundary whose page position and preceding-page continuity are both confidently known; later disagreement should be visible only in debug logging and must not mutate the stored CSV value.

### Phase 3: Extend and Migrate `search-tracking.csv`

**Status:** Work Complete

- [x] Add `exactMatches` as a new search-tracking column, using the header label `exactMatches` to match the existing camel-case CSV schema.
- [x] Serialize new search rows with `UNKNOWN` as the default `exactMatches` value.
- [x] Extend `updateLastSearchTrackingRow()` so a detected boundary can update the last row without disturbing `postsSeen`, `recentPostings`, or `freshness`.
- [x] Migrate every recognized older schema to the new schema and assign `UNKNOWN` to all pre-existing rows.
- [x] Preserve UTF-8 BOM, CRLF rows, CSV escaping, and existing header-mismatch safeguards.
- [x] Expand persistence tests for serialization, append, last-row updates, and migration from all supported historical schemas.

**Technical Notes:**
Relevant files are `extension/shared/csv.js`, `extension/shared/saveListing.js`, and `extension/tests/persistence.test.mjs`. The proposed column order is `timestamp,searchType,postsSeen,recentPostings,freshness,exactMatches`, appending the field to minimize migration risk. `UNKNOWN` is intentional for old rows and for active searches whose boundary has not been seen; zero should be written only if LinkedIn explicitly places the boundary before the first result card.

### Phase 4: Documentation and Verification

**Status:** Work Complete

- [x] Document the boundary notification, `exactMatches` semantics, and `UNKNOWN` fallback in `extension/README.md`.
- [x] Bump the extension version.
- [x] Run all extension test suites.
- [ ] Manually verify a LinkedIn result set containing the message: confirm the notification appears, jobs after the message remain visible, and the correct search row receives the count.
- [ ] Manually verify a result set where the message has not appeared: confirm `exactMatches` remains `UNKNOWN` and no notification is shown.
- [x] Verify an existing 5-column `search-tracking.csv` migrates without losing or shifting data through automated persistence coverage.

**Technical Notes:**
Live verification is important because the boundary's placement in LinkedIn's rendered DOM may differ from saved or synthetic fixtures. Record the observed markup and any limitations in this document during implementation.

---

## Open Questions

1. **Should `exactMatches` be a count or a yes/no status?**
   Recommendation: store an integer count once the boundary is observed, because the message defines where exact matches end and the existing CSV already tracks search-level numeric totals. Use `UNKNOWN` until the boundary is seen.

2. **Should absence of the boundary mean all scanned jobs are exact matches?**
   Recommendation: no. Keep `UNKNOWN`, because the boundary may be on a later page, outside the rendered DOM, or expressed with unsupported wording.

3. **What if LinkedIn changes or localizes the message?**
   Recommendation: support the supplied English wording first and fail safely to `UNKNOWN`. Capture new observed variants as fixtures before broadening detection.

4. **Should the boundary notification appear only once or remain visible for the search?**
   Decision: keep a non-modal warning visible whenever the popup is opened for the active search after detection. Do not add dismissal persistence in this cycle; starting a new search clears the warning with the rest of the search session state.

5. **What should happen if a same-page rescan produces a different boundary count?**
   Decision: the first confident search-level observation wins. Preserve its count, do not rewrite the CSV, and log the later disagreement as evidence of lazy rendering or DOM drift.

---

## Notes and Risks

- **Terminology:** In this document, "exact matches" means jobs shown before LinkedIn's own related-results boundary. It is not an independent relevance judgment by the extension.
- **Risk:** LinkedIn may virtualize or lazily render cards, making DOM order incomplete. Only persist a count when the message and its relative card position are both confidently established.
- **Risk:** A later same-page scan may see a different number of lazily rendered cards. The first confident boundary remains authoritative for the active search so the CSV does not oscillate; disagreements are diagnostic evidence for future detector refinement.
- **Risk:** The message may appear on a page after earlier pages were not scanned. Session logic must not present a partial count as authoritative; if continuity cannot be established, keep the value `UNKNOWN` and still notify the user that the boundary was spotted.
- **Risk:** Search rows are updated asynchronously and only the last row is currently mutable. Preserve the existing permission-safe behavior and avoid writing the boundary to the wrong search row.
- **Scope boundary:** This cycle does not hide, remove, recolor, or stop navigation to jobs after the boundary. It only notifies the user and records the boundary-derived count.

---

## Completion Summary

*Fill in when the cycle closes. Move this document to `doc/planning/completed/` afterward.*

**Completion Date:** 2026-08-20
**Phases Completed:** All implementation phases; live LinkedIn verification remains pending
**Work Deferred:** Manual verification that Refresh updates a closed `search-tracking.csv`, that an open/locked CSV produces actionable feedback and succeeds after retry, and that live boundary/no-boundary searches behave correctly. User approval is required before the cycle can be marked Verified.

**Accomplishments:**
- Added structurally scoped detection of LinkedIn's exact-match boundary and returned its all-card page ordinal independently of the Recent Postings age filter.
- Added continuous paging state, first-observation freezing, skipped-page fallback to `UNKNOWN`, and a persistent non-modal popup warning.
- Migrated `search-tracking.csv` to six columns with `exactMatches`, including safe 2-, 3-, and 5-column migrations.
- Added automated capture, session, popup, serialization, update, migration, and persistence-trigger coverage; documented the workflow and bumped the extension to `0.0.33.1` after the persistence fix.

**Metrics:**
- Files modified: 13 including this DevCycle document
- Tests passing: all five suites (`captureActivePage.smoke`, `pagingUrl`, `persistence`, `popup.module.smoke`, `searchUrlBuilder`)

**Lessons / Notes:**
The exact-match total must be based on all structurally detected cards, not the age-filtered Recent Postings list. Numeric persistence also requires explicit page continuity; detection and notification remain useful even when skipped navigation makes the count unknowable.

---

## Review Disposition

Claude's review was incorporated on 2026-08-20:

- Target completion moved from the start date to 2026-08-24 to account for DOM detection, state/UI work, CSV migration, automated coverage, and live verification.
- Boundary freezing now explicitly means that the first confident search-level observation wins, including when a later rescan of the same page produces a different count.
- Notification behavior is now explicit: it is non-modal, persists across popup openings for the active search, has no dismissal state in this cycle, and clears when a new search begins.
- The existing structural detection approach, incremental CSV migration design, and narrow scope were retained.

## Claude Comments (Original Review)

*Retained as review history; the actionable items below are resolved in the revised plan and summarized in Review Disposition above.*

- **Target Completion date.** `Start Date` and `Target Completion` are both 2026-08-20. Given four phases spanning fragile DOM detection, popup UI/session-state changes, CSV schema migration, and required live LinkedIn verification, that looks like a placeholder rather than a real estimate. Worth fixing or explicitly acknowledging before work starts.

- **Detection approach fits the codebase's existing style well.** `captureRecentJobPostings()` in `captureActivePage.js` already leans on structural/semantic signals (dismiss-button `aria-label`, echo-title spans) instead of generated class names, specifically because LinkedIn's markup has multiple live variants and shifts over time (see the existing comments around `dismissButtonTitles()` and the verified-badge title suffix). Phase 1's instruction to prefer structural relationships and fail to `UNKNOWN` on ambiguity is consistent with that precedent and should integrate cleanly.

- **The "freeze after first observation" rule needs one more sentence of precision.** Phase 2 says the first confidently observed boundary is frozen for the active search, and separately that repeated/idempotent scans must be handled. But lazy-loaded/virtualized cards (called out as a risk) mean a rescan of the *same* page could plausibly place the boundary at a different card count than an earlier scan did. The plan should say explicitly whether "freeze" means "first search-level boundary observation wins, even if a later rescan of the same page would compute a different count" — that's implied but not stated, and it's exactly the kind of ambiguity that causes rework mid-implementation.

- **Popup notification persistence/dismissal is unspecified.** Phase 2 says "show a prominent popup notification when the boundary is detected" but doesn't say whether it reappears every time the popup is reopened for that search, or only once. Given the popup is likely opened repeatedly during a session, an every-open notification could become nagging; worth deciding now rather than during implementation.

- **CSV/migration plan is consistent with the current schema machinery.** `csv.js` already has `SEARCH_CSV_COLUMNS`, `PREVIOUS_SEARCH_CSV_COLUMNS`, and `LEGACY_SEARCH_CSV_COLUMNS` plus a working `migrateLegacySearchTrackingCsv()` path in `saveListing.js`, so adding a fourth recognized schema (5-column → 6-column) is an incremental extension of an existing, tested pattern rather than new machinery. Low risk.

- **Scope boundary is a strength.** Explicitly ruling out hiding/removing/recoloring post-boundary cards keeps this cycle's blast radius small and testable, and matches the project's general preference for narrow, verifiable increments.

**Overall: the plan is adequate to start implementation.** The phase breakdown, technical notes, and open-questions/recommendations are concrete and traceable to actual files and existing patterns. Fix the completion date and tighten the two ambiguities above (freeze semantics under rescans, notification dismissal) before or during Phase 1/2, but neither blocks starting the work.

---

## Bug Report: Exact-Match Detection Does Not Update `search-tracking.csv`

**Reported:** 2026-08-20
**Status:** Work Complete; live locked-file verification pending
**Affected Version:** `0.0.33.0`
**Fixed Version:** `0.0.33.1`

### Observed Behavior

1. The user refreshed Recent Postings on a LinkedIn search-results page.
2. The popup displayed **Related results reached**, confirming that the boundary detector ran and the exact-match boundary state reached the popup.
3. `search-tracking.csv` did not update.
4. The CSV had been open during an earlier test, which may have blocked that earlier write, but a Recent Postings refresh still did not produce the expected visible CSV update.

### Expected Behavior

User-initiated search workflow actions must persist the current tracking state to `search-tracking.csv`:

- **Recent Postings refresh:** after a successful scan, migrate the CSV schema if necessary and update the last search row's `recentPostings`, `freshness`, and `exactMatches` values.
- **Open Job Search:** append a new six-column row with the initial search values and `exactMatches` set to `UNKNOWN`, then reset the in-memory/session tracking state for the new search.
- **Open Premium Job Search:** perform the same append and reset behavior as Open Job Search.
- **Next Page:** persist `postsSeen`, the committed Recent Postings running total, and any already-established `exactMatches` value before or as the page advances.

A write failure or skipped write must be surfaced to the user instead of existing only as a console warning. If the file is locked by Excel or another program, the popup should explain that `search-tracking.csv` must be closed before retrying.

### Initial Assessment

- The visible warning strongly suggests this is a persistence/trigger/permission problem rather than a boundary-detection problem.
- `updateLastSearchTrackingRow()` was designed for automatic popup-open scans and intentionally uses permission-query-only behavior so it cannot prompt without user activation. The manual refresh currently shares that path, so it may skip the write when permission is not already granted even though the refresh click is a valid user gesture that could request permission.
- An open CSV may also cause `createWritable()` or the final file replacement to fail on Windows. This must be distinguished from a permission skip and reported clearly.
- The three user-gesture paths should share one explicit persistence contract while automatic popup-open scans remain best-effort and non-prompting.

### Fix Tasks

- [ ] Reproduce with `search-tracking.csv` closed and inspect whether the refresh write is skipped for permission or fails while opening/writing the file.
- [x] Separate user-initiated persistence from automatic scan persistence so Refresh, both Open Search buttons, and Next Page may obtain write permission when required.
- [x] Ensure each trigger writes the complete applicable six-column state without erasing an existing exact-match count.
- [x] Display actionable popup feedback for permission skips, locked-file failures, schema errors, and other persistence failures.
- [x] Add automated tests for all four triggers: Recent Postings refresh, Open Job Search, Open Premium Job Search, and Next Page.
- [ ] Manually verify the CSV update with the file closed, then verify the locked-file error and retry behavior with the file open.
- [x] Return the DevCycle to Work Complete only after the bug is fixed and automated tests pass; keep Verified pending user approval.

### Resolution

Version `0.0.33.1` prepares project-folder write permission at the beginning of each user-triggered action, before later asynchronous browser work can lose the action's permission context. Refresh records session boundary state and attempts the CSV update; both Open Search buttons append a six-column row; Next Page persists `postsSeen`, the Recent Postings running total, and any frozen exact-match count together. Automatic popup-open scans remain query-only and non-prompting.

Persistence failures are no longer console-only on these actions. The popup reports skipped writes and errors, and lock-like errors instruct the user to close `search-tracking.csv` before retrying. The popup smoke test now exercises all four triggers through real popup handlers and an in-memory project-folder/CSV implementation.
