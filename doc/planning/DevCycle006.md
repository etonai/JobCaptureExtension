# DevCycle 006: Manual Field Trial

**Status:** Planning
**Start Date:** TBD
**Target Completion:** TBD
**Focus:** Use the current extension in real job-search activity for at least one day before deciding whether more product work is needed.

---

## Goal

This DevCycle pauses feature development and tests the current extension in real use.

DevCycle005 produced a useful MVP: LinkedIn capture, parser output, project folder setup, JSON saves, sibling description `.txt` saves, and CSV tracking. Before building review/editing UI or packaging work, this cycle should answer a simpler question: does the current workflow feel good enough after actual use?

## Desired Outcome

By the end of this DevCycle, the user should have used the extension for at least one day of real job-search activity and recorded concrete observations.

The output of the cycle should be a short field-trial findings section in this document that answers:

- what worked well
- what felt annoying or risky
- what parser mistakes occurred, if any
- whether review/editing UI is still desired
- whether packaging/hardening is worth doing now
- what the next DevCycle should be, if any

---

## Tasks

### Phase 1: Field Trial Setup

**Status:** Planning

- [ ] Confirm the extension is loaded from `C:\dev\JobCaptureExtension\extension`.
- [ ] Confirm the displayed extension version is `0.0.5.1` or later.
- [ ] Confirm the project folder is configured.
- [ ] Confirm `saved-listings/` and `job-tracking.csv` exist in the project folder.
- [ ] Run the regression checks once before starting the field trial, if practical.

**Technical Notes:**

This phase is only setup for manual use. Do not add new extension features during this cycle unless the extension is blocked by a defect.

### Phase 2: Minimum One-Day Manual Use

**Status:** Planning

- [ ] Use the extension during normal job-search activity for at least one day.
- [ ] Capture and save multiple real LinkedIn job postings.
- [ ] Include both Easy Apply and external Apply jobs if they naturally occur.
- [ ] Include jobs with missing or unusual fields if they naturally occur.
- [ ] Avoid correcting files manually during capture unless needed for the job search itself.

**Technical Notes:**

The goal is to observe the product as-is. The user should note friction instead of immediately expanding scope.

### Phase 3: Output Inspection

**Status:** Planning

- [ ] Inspect several saved JSON files.
- [ ] Inspect several sibling description `.txt` files.
- [ ] Inspect `job-tracking.csv` in a spreadsheet editor.
- [ ] Confirm CSV rows are useful for tracking job-search activity.
- [ ] Confirm saved filenames are understandable enough.
- [ ] Confirm repeated saves do not overwrite earlier captures.

**Technical Notes:**

Pay special attention to whether the CSV has enough information for day-to-day tracking and whether the description `.txt` files are useful in practice.

### Phase 4: Findings and Next-Step Decision

**Status:** Planning

- [ ] Record field-trial findings in this document.
- [ ] List parser bugs or capture defects, if any.
- [ ] List UX friction, if any.
- [ ] Decide whether review/editing UI is necessary now.
- [ ] Decide whether packaging/hardening is necessary now.
- [ ] Decide whether the next DevCycle should be bug fixes, polish, release hardening, or no immediate extension work.

**Technical Notes:**

The field-trial findings should drive future work. If the extension feels good enough, it is acceptable to stop active extension development for now.

---

## Field Trial Notes

*Fill this in during or after the one-day manual trial.*

### Jobs Captured

- TBD

### What Worked Well

- TBD

### Problems Or Friction

- TBD

### Parser Issues

- TBD

### Save / CSV / File Output Issues

- TBD

### Desired Changes After Real Use

- TBD

### Next-Step Decision

- TBD

---

## Open Questions

1. **Is review/editing UI still necessary?**
   Recommendation: only build it if real captures show frequent parser mistakes that are worth correcting before save.

2. **Is packaging/hardening necessary now?**
   Recommendation: only do it if the unpacked-extension workflow becomes annoying or if the extension will be used regularly enough to justify formal release cleanup.

3. **Should the next cycle be feature work or bug-fix only?**
   Recommendation: let the field-trial notes decide. Bugs found in real use should outrank speculative feature work.

---

## Notes and Risks

- This DevCycle intentionally avoids new feature implementation.
- A one-day field trial may not expose every LinkedIn layout issue, but it is enough to challenge whether DC6/DC7 feature plans are actually needed.
- The extension may already be sufficient for current personal use.
- If a blocking defect appears, pause the field trial and create a narrow bug-fix task or cycle.

---

## Completion Summary

*Fill in when the cycle closes. Move this document to `doc/planning/completed/` afterward.*

**Completion Date:** TBD
**Phases Completed:** TBD
**Work Deferred:** TBD

**Accomplishments:**
- TBD

**Metrics:**
- Jobs captured: TBD
- Field trial duration: TBD
- Bugs found: TBD

**Lessons / Notes:**
TBD