# Codex Development Template

This document is an example planning template for projects that use Codex or other AI agents as active contributors during development.

It is intended to be:

- readable by a human project owner
- actionable for an AI agent starting with limited context
- lightweight enough to maintain during normal development

## Core Intent

A good development cycle document should help an agent quickly understand:

- what the current cycle is trying to accomplish
- what work is in scope
- what constraints or assumptions matter
- how success will be verified
- what happened during implementation

The goal is not to create project management overhead. The goal is to create an execution document that can guide implementation and preserve context.

## Suggested Structure

### 1. Cycle Header

Start with a simple header that identifies the cycle and its current state.

Suggested fields:

- cycle name or number
- status
- start date
- target completion or completion date
- focus

Example:

```md
# Development Cycle 2026-0001

**Status:** Planned
**Start Date:** 2026-03-28
**Target Completion:** 2026-03-30
**Focus:** Implement initial authentication flow
```

### 2. Overview

Include a short overview that explains the purpose of the cycle in plain language.

This should answer:

- why this cycle exists
- what user or project problem it addresses
- what meaningful outcome is expected

Keep this section short. One or two paragraphs is usually enough.

### 3. Work Items or Phases

Break the cycle into a small number of concrete work items or phases.

Each work item should include:

- title
- status
- priority when useful
- description
- checklist or acceptance criteria

Example:

```md
### Phase 1: Authentication UI
**Status:** Open
**Priority:** High
**Description:** Build the login form and client-side validation flow.

**Acceptance Criteria:**
- [ ] Login form is displayed
- [ ] Required fields are validated
- [ ] Submission errors are shown clearly
- [ ] Successful login transitions to the authenticated state
```

This format works well because it gives agents a concrete unit of work without requiring a large amount of process.

### 4. Technical Notes

Add technical notes only when they help future implementation.

Good uses for this section:

- key file locations
- architecture constraints
- relevant data flow notes
- integration points
- important design decisions

Avoid filling this section with generic implementation advice that would be true for any project.

### 5. Testing and Validation

Explicitly define how the work should be verified.

This is especially useful for AI-assisted development because it reduces ambiguity about what counts as done.

Suggested content:

- commands to run
- manual verification steps
- critical edge cases
- required user confirmation, if any

Example:

```md
## Testing and Validation

- [ ] Automated tests for login form validation pass
- [ ] Manual login succeeds with valid credentials
- [ ] Invalid credentials show an error message
- [ ] Session persists after page refresh if that is expected behavior
```

### 6. Completion Summary

Reserve a final section for what actually happened.

This should be updated during or after implementation and can include:

- what was completed
- important changes from the original plan
- issues encountered
- follow-up work for future cycles

This makes the cycle document useful after the work is finished, not just before it begins.

## Recommended Balance

Based on the example planning documents reviewed, the most effective default is a middle-weight format:

- more structured than a simple task note
- less heavy than a full design specification
- detailed enough that an AI agent can act from cold start

That means most projects should prefer:

- concise overview
- clear phase or work-item breakdown
- explicit validation steps
- short completion summary

And avoid making every cycle document include:

- exhaustive architecture essays
- large process sections repeated in every cycle
- full Git workflow instructions unless they are truly cycle-specific
- long planning questionnaires unless decisions are still unresolved

## When to Expand Beyond This Template

Some cycles need more detail than others.

Expand the document when:

- the work depends on exact file outputs or formats
- the implementation has many dependencies
- the project has tricky technical constraints
- the cycle is acting as both plan and execution spec

In those cases, it can make sense to include:

- design decisions
- source references
- detailed implementation plan
- dependency tracking
- risk assessment

This pattern is especially appropriate for work similar to modding, infrastructure changes, or complex test refactors.

## Template Guidance for Project Owners

If a project owner creates a `DevCycleTemplate.md`, it should usually aim for:

- clarity over completeness
- execution guidance over bureaucracy
- reusable structure over project-specific filler

The strongest cycle documents are the ones that remain easy to update while development is happening.

## Formatting Guidance

For maximum compatibility across tools and editors:

- prefer plain Markdown
- prefer ASCII characters when possible
- avoid relying on emoji status markers
- keep headings predictable
- use checklists where completion tracking matters

This helps prevent encoding issues and makes the documents easier for both people and agents to parse.

## Summary

The best Codex-oriented development cycle documents are not just planning artifacts. They are shared execution documents.

They should help a contributor with limited context understand:

- what to do
- why it matters
- how to verify it
- what happened

That is the planning style this example is intended to support.
