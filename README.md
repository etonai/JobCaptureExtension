# LinkedIn Job Capture Extension

A Microsoft Edge browser extension for capturing the currently open LinkedIn job posting into a structured, reviewable record.

The extension is meant to preserve job postings during a job search. It is not an application bot, job scorer, resume tool, or AI analysis layer. Its job is intentionally narrow: capture what LinkedIn shows, let the user review it, and save or export the result for a local job tracking system and spreadsheet-based activity tracking.

## Project Goal

Build a Chromium Manifest V3 extension for Microsoft Edge that can read the active LinkedIn job page, extract the visible posting details, and produce a structured job capture record.

The first version should prioritize correctness, maintainability, and predictable behavior over broad feature coverage. Capturing an incomplete but usable record is better than failing the whole capture because one field changed or could not be found.

## MVP User Flow

1. The user configures a local project folder for job-search tracking.
2. The user opens a LinkedIn job page in Edge.
3. The user clicks the extension button.
4. The extension verifies that the active tab is a LinkedIn job page.
5. The extension expands the job description when LinkedIn has collapsed it.
6. The extension extracts the job data from the page.
7. The extension shows the captured fields in a simple review UI.
8. The user can edit imperfect fields before saving.
9. The extension saves the full captured listing into the configured project folder.
10. The extension writes or exports key tracking fields to the project spreadsheet.

## What The Extension Captures

The MVP should attempt to capture these fields:

| Area | Fields |
| --- | --- |
| Metadata | Capture date/time, source website, current URL, LinkedIn job ID |
| Company | Company name |
| Position | Position title, location, workplace type, employment type |
| Posting | Posted text, applicant count text, promotion text, hiring status text |
| Compensation | Salary text exactly as displayed |
| Apply | Apply type: `Easy Apply`, `External Apply`, or `Unknown` |
| Description | Complete job description text |
| Extra sections | Poster requirements and benefits sections when present |
| Spreadsheet tracking | Capture date/time, company, title, posted text, applicant count text, URL, and other fields needed for job-search tracking |
| Storage configuration | Project folder, tracking spreadsheet path, and saved listings folder path |

Example record shape:

```json
{
  "captureTime": "2026-07-05T18:30:00.000Z",
  "sourceWebsite": "LinkedIn",
  "url": "https://www.linkedin.com/jobs/view/...",
  "linkedinJobId": "...",
  "company": "Starbucks",
  "title": "software engineer sr - ST; Seattle, WA",
  "location": "Seattle, WA",
  "workplaceType": "On-site",
  "employmentType": "Full-time",
  "salaryText": "$127K/yr - $211K/yr",
  "postedText": "Reposted 3 hours ago",
  "applicantCountText": "Over 100 people clicked apply",
  "promotionText": "Promoted by hirer",
  "hiringStatusText": "Responses managed off LinkedIn",
  "applyType": "External Apply",
  "description": "Now Brewing - Engineer (Senior+)! ...",
  "posterRequirements": "",
  "benefits": "As a Starbucks partner..."
}
```

The exact property names may change during design, but the data should remain structured and easy for CSV-based spreadsheet tracking and another local application to consume later.

## Extension Configuration

The extension should include configuration for a local project folder. This project folder is the root location for job-search tracking artifacts created or updated by the extension.

The configured project folder should contain:

- the CSV tracking spreadsheet used for job-search activity
- an internal saved listings folder containing the full captured job posting records

A likely project folder layout is:

```text
Job Search Project/
  job-tracking.csv
  saved-listings/
    starbucks_2026-07-05_software-engineer-sr.json
    easypost_2026-07-05_software-engineer-iii.json
```

New saved listing file names should be company-first so saved listings are easier to find by company. Each saved listing may include the structured `.json` capture, a plain `.txt` description, and a readable `.md` description. The first iteration should use CSV for the tracking spreadsheet. The extension should treat the project folder as durable configuration rather than asking the user to choose a save location on every capture.

## Spreadsheet Tracking

Spreadsheet synchronization is a high-priority part of the product direction. The extension should make it easy to track job-search activity in a spreadsheet using a compact set of fields such as capture date/time, company, position title, applicant count text, posted age text, current URL, apply type, and status-oriented notes.

The first iteration should save or append spreadsheet tracking data as CSV before deeper synchronization is designed. The important requirement is that the capture record contains the fields needed to maintain a job tracking spreadsheet without retyping the same information manually.

## Example Inputs

The files in `doc/examples/` represent real LinkedIn job page captures used to shape the MVP:

- `easyposttext.txt` shows an Easy Apply posting with remote/full-time metadata, salary text, active hiring status, and poster-added requirements.
- `starbuckstext.txt` shows an external Apply posting with on-site/full-time metadata, reposted text, off-LinkedIn response handling, salary text, and benefits content.
- The corresponding `*.html` files provide saved page structure examples for parser design.

These examples should be treated as fixtures and design references, not as the only LinkedIn layouts the extension will ever encounter.

## Parsing Principles

The parser should be deterministic. No AI or LLM parsing should be used in the extension.

Preferred extraction strategy:

1. Use stable DOM structure and semantic elements where available.
2. Use accessible labels, visible headings, and button text when possible.
3. Use visible text patterns for fields such as posted age, applicant count, salary, workplace type, and employment type.
4. Avoid relying on LinkedIn CSS class names except as a last resort because those names are likely to change.

If a field cannot be extracted, the extension should leave it blank and keep going.

## User Interface

The MVP UI can be a simple extension popup or popup-driven capture flow.

It should include:

- a clear capture action
- capture status and errors
- editable fields for the extracted record
- a save or export action
- project folder configuration for the spreadsheet and saved listings folder
- CSV tracking output for the core job-search fields

The UI should make it obvious when the current page is not supported or when a capture is incomplete.

## Out Of Scope For The Extension MVP

The first version will not include:

- automated job applications
- AI analysis or job scoring
- resume tailoring
- cover letter generation
- SQLite or database management
- duplicate detection
- interview tracking
- recruiter tracking
- dashboards, charts, or search views

Those features belong in a separate local job tracking application after capture is reliable.

## Development Approach

This project uses the DevCycle planning workflow described in `doc/planning/DevelopmentProcess.md`.

Implementation should keep capture logic separate from UI code so the parser can be tested independently and reused later. The extension should use minimal dependencies and standard Chromium extension APIs where practical.

Key priorities:

- robust LinkedIn job page detection
- complete description expansion before capture
- deterministic field extraction
- editable review before save
- graceful handling of missing fields
- readable code with focused tests around parser behavior
- project folder configuration for durable local storage
- CSV output for high-priority tracking fields

## Current Status

The project is in product definition and design alignment. The root README now describes the extension we intend to build; implementation planning should happen in DevCycle documents before development begins.

