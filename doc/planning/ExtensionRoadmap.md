# Extension Roadmap

**Status:** Planning
**Created:** 2026-07-05
**Project:** LinkedIn Job Capture Extension

---

## Purpose

This roadmap defines the larger plan for building the LinkedIn Job Capture Extension across multiple DevCycles.

The extension should capture the currently open LinkedIn job posting, let the user review the extracted data, save the full listing into a configured local project folder, and update a CSV tracking spreadsheet with the fields needed for job-search activity tracking.

This document is not a DevCycle. It is the project-level map that future DevCycle documents should draw from.

## Product Direction

The extension should do one job well: preserve LinkedIn job postings in a useful local structure.

Core outcomes:

- capture the current LinkedIn job posting deterministically
- avoid AI or LLM parsing in the extension
- let the user inspect captured values before saving, with editing added later only if real use shows it is needed
- store the full captured listing in a local project folder
- append high-priority tracking fields to a CSV spreadsheet
- keep the capture logic separate from the UI so it can be tested and reused

## First Version Scope

The first usable version should include:

- Microsoft Edge / Chromium Manifest V3 extension shell
- LinkedIn job page detection
- content script capture flow
- user reminder to manually expand collapsed LinkedIn descriptions before capture
- deterministic extraction for the fields defined in `README.md` and `ExtensionDesign.md`
- simple capture/save UI, with editable review deferred until real use proves it is needed
- project folder configuration
- saved listings folder inside the project folder
- full captured listing saved as structured JSON
- `job-tracking.csv` created or appended inside the project folder
- graceful behavior when some fields cannot be extracted

## Local Storage Model

The extension should treat the configured project folder as durable configuration.

Expected first-iteration layout:

```text
Job Search Project/
  job-tracking.csv
  saved-listings/
    2026-07-05_starbucks_software-engineer-sr.json
    2026-07-05_easypost_software-engineer-iii.json
```

The CSV should contain compact tracking fields that are useful for day-to-day job-search management. The saved listing JSON files should preserve the fuller capture record, including description text and optional sections.

## Planned DevCycles

### DevCycle001: Product Design and Technical Shape

Goal: make the core design decisions before implementation begins.

Likely work:

- define the extension architecture
- define the capture record schema
- define the CSV column schema for `job-tracking.csv`
- define the saved listing JSON format
- define the project folder configuration approach
- identify expected Edge/Chromium extension permissions
- define the MVP popup/review flow
- document parser assumptions from `doc/examples/`
- consolidate decisions into `doc/planning/ExtensionDesign.md`

Desired outcome: the project has enough design detail to begin targeted technical validation without constantly rediscovering product decisions.

### DevCycle002: File System Access API Behavior Spike

Goal: verify the highest-risk technical assumption before building storage-dependent extension features.

Likely work:

- create a minimal Manifest V3 spike extension or equivalent local test harness
- verify Microsoft Edge support for `showDirectoryPicker` from the intended extension context
- request a user-selected project folder with read/write access
- persist and restore the directory handle across extension reloads and browser restarts where possible
- test `queryPermission()` and `requestPermission()` behavior
- create or validate `saved-listings/`
- create `job-tracking.csv` when missing
- write a sample JSON file into `saved-listings/`
- append a sample CSV row using the planned CSV dialect
- document permission loss, re-grant, unsupported API, and policy restriction behavior
- decide whether File System Access API remains the implementation path or whether a fallback approach is needed

Desired outcome: the project has verified evidence that Edge can support the planned local project folder workflow, or a documented alternative path if it cannot.

### DevCycle003: Extension Shell and Basic Capture Flow

Goal: create the working extension foundation after storage feasibility is known.

Likely work:

- create the main Manifest V3 extension structure
- add popup UI shell
- add options page entry point for project folder configuration
- add content script and message passing
- detect supported LinkedIn job pages
- return a minimal capture result from the active tab
- show unsupported-page and capture-error states
- document local loading instructions for Edge

Desired outcome: clicking the extension on a LinkedIn job page runs a basic capture flow and displays a result in the popup.

### DevCycle004: LinkedIn Parser MVP

Goal: implement deterministic extraction against the provided examples and live LinkedIn page structure assumptions.

Likely work:

- extract metadata, company, title, location, workplace type, employment type, salary text, posting text, applicant count, promotion text, hiring status, apply type, description, poster requirements, and benefits
- include UI guidance that the user should manually expand collapsed descriptions before capture
- isolate parser code from UI code
- add parser fixtures based on `doc/examples/`
- add focused parser tests
- define behavior for missing or ambiguous fields

Desired outcome: the extension can produce a useful structured capture object from representative LinkedIn job pages.

### DevCycle005: Project Folder, Saved Listings, and CSV Tracking

Goal: persist captured records into the configured local project structure using the storage approach proven in DevCycle002.

Likely work:

- add project folder configuration UI
- create or validate the expected project folder structure
- save full capture records into `saved-listings/`
- create or append `job-tracking.csv`
- write CSV headers when the file does not exist
- validate CSV headers before append
- map capture records into CSV tracking rows
- handle duplicate filenames or repeated captures safely
- show save success and failure states

Desired outcome: a reviewed capture can be saved locally as both a full listing record and a CSV tracking row.

### DevCycle006: Manual Field Trial

Goal: use the current extension in real job-search activity for at least one day before deciding whether more product work is actually needed.

Likely work:

- use the extension on real LinkedIn job postings for a minimum of one day
- capture/save multiple jobs through the normal workflow
- inspect generated JSON, sibling description `.txt`, and `job-tracking.csv` output
- record parser mistakes, awkward UI moments, missing fields, save failures, or confusing messages
- record which roadmap ideas still feel valuable after real use
- avoid adding new features during the field trial unless a blocking defect appears
- decide whether the next cycle should be bug fixes, review/editing UI, release hardening, or no immediate extension work

Desired outcome: the next planning decision is based on real usage evidence rather than roadmap inertia.

### Future Candidate: Review UI, Editing, and Capture Polish

Goal: improve the capture workflow only if manual use shows that correction before save is worth the added UI.

Possible work:

- build an editable review UI for extracted fields
- distinguish required, optional, missing, and ambiguous fields
- allow the user to correct extraction mistakes before saving
- add a notes field before save if spreadsheet notes become useful
- improve user-facing errors and status messages where field-trial notes show friction
- refine filename generation or CSV row mapping if real captures expose issues

Desired outcome: the extension becomes more comfortable for everyday capture without overbuilding features that are not yet needed.

### Future Candidate: Packaging, Hardening, and Follow-Up Planning

Goal: prepare the MVP for repeatable local use if the field trial shows the current unpacked-extension workflow is worth keeping long-term.

Possible work:

- document installation/loading steps
- review extension permissions
- verify behavior in Microsoft Edge
- add regression checks for any new field-trial bugs
- improve parser resilience where real testing exposes weak spots
- document known LinkedIn layout limitations
- decide what belongs in the extension versus a later local tracking application

Desired outcome: the MVP is stable enough for regular personal use and has a clear next-step plan.

## Candidate CSV Columns

Initial `job-tracking.csv` columns are locked in `doc/planning/ExtensionDesign.md`.

Current first-version columns:

- captureDate
- captureTime
- company
- title
- location
- workplaceType
- employmentType
- postedText
- applicantCountText
- salaryText
- applyType
- linkedinJobId
- url
- savedListingPath
- notes

These should remain text-friendly. The MVP should not parse salary into numeric fields or convert LinkedIn posted-age text into computed dates unless that is explicitly added later.

## Key Design Decisions To Make Early

- Does Microsoft Edge support the planned File System Access API behavior from the required extension context?
- What exact permission re-grant flow does Edge require after extension reloads or browser restarts?
- What exact LinkedIn URL/DOM conditions define the first supported job detail page detector?
- How much editing belongs in the popup versus a larger extension page?

## Out Of Scope For The MVP

The following should remain outside the extension MVP unless a future DevCycle explicitly brings them in:

- automated job applications
- AI analysis or scoring
- resume tailoring
- cover letter generation
- SQLite or database management
- duplicate detection beyond safe filename handling
- recruiter tracking
- interview tracking
- dashboards, charts, or search views

## Planning Notes

Future implementation work should be planned through DevCycle documents in `doc/planning/`, using `DevCycleTemplate.md` and the workflow described in `DevelopmentProcess.md`.

When a DevCycle document is created, it should be narrow enough that its tasks can be completed, reviewed, and moved to `doc/planning/completed/` without carrying the whole project inside one oversized cycle.


