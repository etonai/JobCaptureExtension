# DevCycle 001: Design Question Gathering

**Status:** VERIFIED
**Start Date:** 2026-07-05
**Target Completion:** TBD
**Focus:** Gather and refine design questions from Claude and Codex, then consolidate the answers into the primary extension design document.

---

## Goal

This DevCycle is for design discovery, not implementation.

Claude and Codex will each read the supporting project documents and independently create a question list. Those questions will be reviewed, answered, refined, and combined into a single design document that defines the extension clearly enough for implementation planning.

## Desired Outcome

By the end of this DevCycle, the project should have one consolidated design document that captures the important questions, decisions, answers, and remaining constraints for the LinkedIn Job Capture Extension.

That document will become the main design reference for later DevCycles.

---

## Supporting Documents

Both Claude and Codex should read:

- `doc/examples/`
- `doc/ideas/brief.md`
- `README.md`
- `doc/planning/ExtensionRoadmap.md`

---

## Tasks

### Phase 1: Independent Question Lists

**Status:** Work Complete

- [x] Codex reads the supporting documents and creates a Codex question list file.
- [X] Claude reads the supporting documents and creates a Claude question list file.

**Technical Notes:**

Suggested files:

- `doc/planning/DevCycle001-CodexQuestions.md`
- `doc/planning/DevCycle001-ClaudeQuestions.md`

The question lists should focus on design choices, data formats, extension constraints, user workflow, project folder behavior, CSV tracking, parser assumptions, and any risks that should be resolved before implementation begins.

### Phase 2: Question Review and Iteration

**Status:** Work Complete

- [X] Review both question lists.
- [X] Identify duplicates, conflicts, gaps, and high-priority unanswered questions.
- [X] Iterate on the questions and answers with the user.

**Technical Notes:**

This phase may update the individual question files or create temporary working notes, but it should not begin extension implementation.

### Phase 3: Consolidated Design Document

**Status:** Work Complete

- [x] Combine the refined questions and answers into a single design document.
- [x] Record the key decisions that future implementation DevCycles should follow.
- [x] Record unresolved questions separately, if any remain.

**Technical Notes:**

Suggested output file:

- `doc/planning/ExtensionDesign.md`

This document is the intended output of DevCycle001.

---

## Open Questions

1. **What should the final design document be named?**
   Recommendation: Use `doc/planning/ExtensionDesign.md` unless a different name becomes clearer during the cycle.

2. **Should the individual question files remain after consolidation?**
   Recommendation: Keep them as historical working notes until DevCycle001 is completed, then decide whether to move or retain them with the completed cycle materials.

---

## Notes and Risks

- This DevCycle must stop at design output. No extension implementation should begin during this cycle.
- The main risk is allowing implementation details to start before the storage, CSV, parser, and UX decisions are clear.
- Claude and Codex may phrase similar questions differently; consolidation should preserve the best version of each design concern rather than mechanically merging every question.

---

## Completion Summary

*Fill in when the cycle closes. Move this document to `doc/planning/completed/` afterward.*

**Completion Date:** 2026-07-05
**Phases Completed:** All
**Work Deferred:** User verification and future implementation planning.

**Accomplishments:**
- Created independent Claude and Codex question lists.
- Consolidated refined questions, answers, decisions, and remaining open questions into `doc/planning/ExtensionDesign.md`.

**Metrics:**
- Files modified: 4 planning/design documents.

**Lessons / Notes:**
The design phase clarified that CSV tracking is in scope, File System Access API is the preferred storage approach pending Edge verification, and the user will manually expand LinkedIn descriptions before capture.



