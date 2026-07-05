# Development Process

This document defines how we plan and execute development work.

## Core Approach

We will work in development cycles called `DevCycles`.

A DevCycle is our equivalent of a sprint.

Accepted shorthand:

- `DevCycle` is the formal name
- `Cycle` is an informal short form
- `DC` is the abbreviated reference form

Each DevCycle has:

- a clear goal
- a defined set of tasks
- an end-of-cycle review of what was completed

## Planning Structure

The planning folders are organized like this:

- `doc/planning/` contains active planning documents
- `doc/planning/completed/` contains finished DevCycle documents

At any given time:

- `DevelopmentProcess.md` describes the overall workflow
- one active DevCycle document should define the current plan
- completed DevCycle documents should be moved into `completed/`

## Naming Conventions

DevCycle files should use this format:

`DevCycle001.md`

Examples:

- `DevCycle001.md`
- `DevCycle002.md`
- `DevCycle157.md`

Git commit messages and related references can use the abbreviated form:

- `DC-1`
- `DC-01`
- `DC-001`
- `DC-157`

DevCycle documents should be based on a `DevCycleTemplate.md` file.

The structure and contents of that template are project-specific and are not defined in this document.

## DevCycle Workflow

Each DevCycle follows this lifecycle:

1. Create a new DevCycle document in `doc/planning/`.
2. Define the goal of the DevCycle.
3. Break the DevCycle into concrete tasks.
4. Work through the tasks during development.
5. Update the DevCycle document as tasks are completed or adjusted.
6. Review the DevCycle when its planned work is done.
7. Move the completed DevCycle document into `doc/planning/completed/`.
8. Create the next DevCycle document for the next set of goals and tasks.

## Status Values

DevCycle documents and individual phases use these status values:

- **Planning** — work is defined but not yet started
- **In Progress** — work is actively underway
- **Work Complete** — implementation is done, pending verification
- **Verified** — work is confirmed correct and the phase or cycle is closed

`Verified` is a permission-gated status. Agents may not set a DevCycle or phase to `Verified` without explicit user permission.

## Verification Authority

Agents are not allowed to mark a DevCycle or phase as `Verified` without explicit user permission.

Until that permission is given:

- agents should stop at `Work Complete` when implementation is done and verification is pending user approval
- agents may report that work appears complete or tested, but they must not change the recorded status to `Verified`
- the user is the authority for deciding when `Verified` is appropriate

## DevCycle Document Expectations

Each DevCycle document should include:

- a DevCycle name or number
- the purpose of the DevCycle
- the desired outcome
- a task list
- notes, risks, or open questions if needed

Suggested sections:

- `Goal`
- `Desired Outcome`
- `Tasks`
- `Notes and Risks`
- `Completion Summary`

## Task Guidelines

Tasks inside a DevCycle should be:

- specific enough to act on
- small enough to complete within the DevCycle
- clearly tied to the DevCycle goal

When useful, tasks can include:

- implementation work
- design work
- research work
- documentation work
- testing or review work

## Completion Rules

A DevCycle is complete when:

- the planned tasks are finished, or
- the remaining tasks are intentionally deferred to a future DevCycle

When a DevCycle closes:

- record any important notes in the DevCycle document
- move the DevCycle document to `doc/planning/completed/`
- start the next DevCycle document in `doc/planning/`

A DevCycle or phase should not be marked `Verified` during closure unless the user has explicitly approved that status.

## Working Agreement

We will use DevCycle documents as the source of truth for short-term development planning.

That means:

- new work should almost always be added to the current DevCycle document
- work that does not fit the current DevCycle goal should usually be considered for a future DevCycle
- small unrelated tasks, such as minor bug fixes or maintenance work, can still be handled during the current DevCycle when appropriate
- once a DevCycle is completed, we do not keep it as an active planning document

This process is intended to keep planning lightweight, visible, and easy to maintain as the project grows.
