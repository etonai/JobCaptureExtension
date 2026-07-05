# LinkedIn Job Capture Extension Design

**Status:** Draft for Review
**Created:** 2026-07-05
**Source DevCycle:** `doc/planning/DevCycle001.md`

---

## Purpose

This document consolidates the DevCycle001 design questions, answers, and recommendations into the main design reference for the LinkedIn Job Capture Extension.

It supersedes earlier exploratory notes when there is a conflict. `README.md` and `ExtensionRoadmap.md` define product intent, while this document locks the first implementation design unless a later DevCycle explicitly changes it.

## Product Boundary

The extension captures the currently displayed LinkedIn job posting and stores it locally.

The extension must never automate application actions. It must not submit applications, fill application forms, click application workflow buttons, or otherwise act as an application bot.

The MVP is LinkedIn-only. Future site support should remain possible, but implementation should optimize for LinkedIn job pages first.

## MVP Scope

The first usable version includes:

- Microsoft Edge / Chromium Manifest V3 extension shell
- LinkedIn job detail page detection
- deterministic field extraction from the active page
- simple capture/status popup
- larger review UI if the popup becomes too cramped for editing
- editable extracted fields before save
- configured local project folder
- full captured listing saved as JSON
- compact tracking row appended to `job-tracking.csv`
- graceful handling of missing or ambiguous fields

The MVP does not include:

- automated application actions
- AI or LLM parsing
- salary numeric parsing
- posted-date conversion into real dates
- applicant count numeric parsing
- status management
- applied-date tracking
- searching saved listings
- duplicate detection beyond safe filenames
- recruiter tracking
- interview tracking
- dashboards or charts

## User Workflow

1. The user opens Microsoft Edge.
2. The user configures a project folder from the extension options page.
3. The extension validates or creates the expected project folder structure.
4. The user opens a LinkedIn job detail page.
5. If the LinkedIn job description is collapsed, the user manually expands it before capture.
6. The user clicks the extension action.
7. The popup runs capture from the active tab.
8. The extension displays extracted fields for review.
9. The user edits incorrect or missing values as needed.
10. The user clicks one primary Save action.
11. Save writes the full JSON listing and appends one row to `job-tracking.csv`.
12. The UI confirms that the CSV row was appended.

Capture and review should be allowed before project folder setup so the user can see value early. Save requires a configured and writable project folder.

## Architecture

The implementation should separate capture, parsing, review, and persistence.

Recommended components:

- `manifest.json`: Manifest V3 configuration.
- Popup UI: starts capture, shows status, and can launch review.
- Review page or expanded view: edits extracted fields before save.
- Content script: reads the LinkedIn page DOM and returns page data.
- Parser module: turns page data into a structured capture record.
- Storage module: manages project folder access, JSON writes, and CSV append.
- CSV module: serializes tracking rows using the locked CSV dialect.
- Filename module: generates safe saved listing filenames.
- Tests/fixtures: validate parser and CSV behavior.

Capture logic should not be embedded directly in UI code.

## Browser Permissions And Storage Approach

The intended storage mechanism is the File System Access API with a user-selected directory handle.

The extension should store the selected project folder handle in durable browser storage, likely IndexedDB. Before saving, it should check whether permission is still granted. If permission is missing or revoked, it should ask the user to reconnect the project folder.

Do not request project folder permission on every popup open. Request or re-request it only when needed, especially before Save.

Anticipated Manifest V3 permissions and access needs:

- `storage` for extension configuration and lightweight state
- `activeTab` and/or `scripting` for active-tab capture
- host access for `https://www.linkedin.com/*` if content scripts are registered persistently
- File System Access API usage from an extension page or options page, subject to Edge feasibility verification

## Project Folder Layout

The project folder is durable user configuration.

Expected first-version layout:

```text
Job Search Project/
  job-tracking.csv
  saved-listings/
    2026-07-05_starbucks_software-engineer-sr_123456789.json
```

On setup, the extension should validate the folder. If `job-tracking.csv` or `saved-listings/` is missing, the extension may create them after user confirmation.

If the user changes the project folder later, the extension writes future captures to the new folder. It does not move or migrate existing files in the MVP.

## Saved Listing JSON Schema

Saved listing files contain the final reviewed values, not separate raw and edited blocks.

Missing user-facing text fields should be empty strings. Include `schemaVersion` from the start.

Canonical first-version shape:

```json
{
  "schemaVersion": 1,
  "captureTimeUtc": "",
  "captureDateLocal": "",
  "captureTimeLocal": "",
  "sourceWebsite": "LinkedIn",
  "url": "",
  "linkedinJobId": "",
  "company": "",
  "title": "",
  "location": "",
  "workplaceType": "",
  "employmentType": "",
  "salaryText": "",
  "postedText": "",
  "applicantCountText": "",
  "promotionText": "",
  "hiringStatusText": "",
  "applyType": "",
  "description": "",
  "posterRequirements": "",
  "benefits": "",
  "additionalSections": [],
  "savedListingPath": "",
  "notes": ""
}
```

`additionalSections` contains objects shaped like:

```json
{
  "heading": "",
  "text": ""
}
```

The JSON should preserve line breaks enough to keep descriptions readable. It should not save the original page HTML in the MVP.

## CSV Schema

The first version uses `job-tracking.csv` in the configured project folder.

The CSV contains compact tracking fields only. It does not include full descriptions, poster requirements, benefits, promotion text, or hiring status text.

Locked first-version column order:

1. `captureDate`
2. `captureTime`
3. `company`
4. `title`
5. `location`
6. `workplaceType`
7. `employmentType`
8. `postedText`
9. `applicantCountText`
10. `salaryText`
11. `applyType`
12. `linkedinJobId`
13. `url`
14. `savedListingPath`
15. `notes`

`notes` is user-managed. The extension should write it as an empty field unless the review UI explicitly provides a notes field.

Excluded from CSV:

- `sourceWebsite`
- `promotionText`
- `hiringStatusText`
- `description`
- `posterRequirements`
- `benefits`
- `status`
- `applicationStatus`
- `appliedDate`

## CSV Dialect

Use:

- UTF-8 with BOM
- CRLF line endings
- RFC 4180-style quoting
- standard escaping for commas, quotes, and line breaks

Before appending, validate the existing header row. If the header does not exactly match the expected schema, block CSV append and show an error. Still allow the JSON listing to be saved.

Do not append blindly to a CSV with mismatched columns.

## Saved Listing Filenames

Filename pattern:

```text
YYYY-MM-DD_company-slug_title-slug_linkedinJobId.json
```

If `linkedinJobId` is unavailable, include local time or another collision-resistant suffix.

Filename rules:

- lowercase generated slugs
- replace whitespace with hyphens
- remove or replace characters invalid on Windows filesystems
- collapse repeated hyphens
- trim leading/trailing hyphens
- truncate long company/title segments to keep the filename manageable
- preserve uniqueness without overwriting existing files

`savedListingPath` in CSV should be project-relative with forward slashes, for example:

```text
saved-listings/2026-07-05_starbucks_software-engineer-sr_123456789.json
```

## Capture And Review Behavior

One primary Save action writes both outputs:

- full reviewed JSON listing
- one appended CSV tracking row

Editing a field in the review UI changes both the JSON listing and the CSV row where that field is present. Filename generation should use the final reviewed values at the time Save is clicked.

Minimum required data for Save:

- URL
- capture timestamp
- configured project folder with write permission

If company or title is blank, Save should still be allowed but the UI should warn the user.

Repeated captures of the same LinkedIn job should always create a new JSON file and append a new CSV row. The MVP does not update or deduplicate existing rows.

## Timestamps

JSON should store UTC and local display pieces:

- `captureTimeUtc`: ISO 8601 UTC timestamp
- `captureDateLocal`: local date string for the user's locale or configured format
- `captureTimeLocal`: local time string for spreadsheet readability

CSV should use local `captureDate` and `captureTime` columns for spreadsheet filtering.

## Parser Strategy

The parser must be deterministic. No AI or LLM parsing is allowed.

Priority order:

1. Stable DOM structure inside the main job detail container.
2. Semantic elements and accessible labels.
3. Visible headings and button text.
4. Text patterns from the job detail container.
5. `innerText` fallback when structured extraction fails.

Avoid depending on LinkedIn CSS class names except as a last resort.

The extension should support pages where a LinkedIn job detail view is present. The first implementation may start with a narrow detector, such as LinkedIn job detail URLs or pages containing the expected job detail heading/content, and expand after fixture and live testing.

## Description Expansion

The extension does not auto-click LinkedIn description expansion controls in the MVP.

The user is responsible for manually expanding the description before capture. The UI should remind the user to expand the description when appropriate.

## Field Extraction Rules

### Company And Title

Identify the main job detail container first. Within that container:

- extract title from the primary job heading
- extract company from the nearest company link/name adjacent to the title area
- ignore logo alt text
- ignore contact/network sections
- ignore recommendation cards
- ignore `People you can reach out to` sections

If multiple plausible candidates remain, choose the highest-confidence value for review and mark the field as ambiguous.

### Location, Posted Text, And Applicant Count

LinkedIn may display these together, such as:

```text
Seattle, WA · Reposted 3 hours ago · Over 100 people clicked apply
```

For MVP, preserve visible text rather than deriving normalized values. Use the visible separator order as a heuristic, but do not convert applicant count to a number or posted text to a date.

### Workplace Type And Employment Type

Recognize common workplace types:

- `Remote`
- `Hybrid`
- `On-site`

Employment type should preserve arbitrary visible text, such as `Full-time`, `Contract`, or `Internship`.

### Apply Type

Use visible primary button text:

- explicit `Easy Apply` means `Easy Apply`
- primary `Apply` when not Easy Apply means `External Apply`
- otherwise `Unknown`

Apply type should be editable in the review UI.

### Promotion And Hiring Status

Use phrase classification rather than position alone.

Promotion examples:

- `Promoted by hirer`
- any phrase containing `Promoted`

Hiring/status examples:

- `Actively reviewing applicants`
- `Responses managed off LinkedIn`
- phrases about reviewing, response handling, recruiting activity, or application handling

If a phrase does not match known promotion or status patterns, leave both fields blank and surface the phrase for review rather than guessing.

### Optional Sections

Known optional sections:

- `posterRequirements`
- `benefits`

These should be first-class plain text fields. Other sections can be captured in `additionalSections` as heading/text pairs.

## Text Normalization

Normalize excessive whitespace. Preserve visible wording, punctuation, bullet-like text, and line breaks where they help readability.

The description should exclude UI headings such as `About the job` when practical, while preserving actual job description headings and paragraphs.

## UI Requirements

The popup should handle:

- capture action
- unsupported page message
- not configured message
- capture status
- save status
- link or action to configure project folder
- transition into review

The detailed review UI should handle:

- editable extracted fields
- visible missing-field warnings
- ambiguous-field indicators
- notes field if included
- primary Save action

Post-save UI should show that a CSV row was appended. It should not show the saved JSON filename by default and should not offer to copy the saved listing path in the MVP.

## Error Handling Rules

Block Save when:

- URL is missing
- capture timestamp is missing
- project folder is not configured
- project folder permission is denied or lost
- JSON listing cannot be written

Warn but allow Save when:

- company is missing
- title is missing
- salary is missing
- applicant count is missing
- workplace type is missing
- employment type is missing
- optional sections are missing
- a field is ambiguous but reviewable

Partial success behavior:

- If JSON saves but CSV append fails, report partial success and keep the JSON.
- If JSON fails, do not write the CSV row because `savedListingPath` would be invalid.
- If the CSV header mismatches, save JSON if possible and report that CSV append was blocked.

## Testing Strategy

Minimum tests before MVP is considered stable:

- parser tests against `doc/examples/easyposttext.txt`
- parser tests against `doc/examples/starbuckstext.txt`
- parser tests or integration checks against the saved HTML fixtures
- CSV serialization tests for quoting, commas, quotes, newlines, BOM, and CRLF
- CSV header validation tests
- filename slug/sanitization tests
- repeated-capture filename collision tests
- manual Edge extension load and capture checklist

Large saved HTML files can be used initially as reference fixtures. Smaller focused fixtures may be created later once parser boundaries are clearer.

## Local-Only Requirement

Captured records should remain local. The extension should not send captured job data to external services.

No analytics, AI calls, cloud sync, or remote persistence should be added in the MVP.

## Supporting Document Precedence

When source documents conflict:

1. `ExtensionDesign.md` controls implementation decisions.
2. User-confirmed answers in DevCycle001 question files explain why decisions were made.
3. `README.md` describes product intent.
4. `ExtensionRoadmap.md` describes multi-cycle planning.
5. `doc/ideas/brief.md` is historical input and may be outdated where later decisions differ.

Known conflict resolved here: earlier documents mention automatic description expansion, but the MVP design now requires the user to manually expand the LinkedIn description before capture.

## Remaining Open Questions

These should be resolved early in DevCycle002 or before storage implementation begins:

1. **Edge File System Access API feasibility.** Verify that Microsoft Edge supports the chosen File System Access API flow from the extension context.
2. **Minimum supported Edge version.** Define the minimum Edge version after feasibility testing.
3. **Exact source layout and toolchain.** Decide plain JavaScript vs. TypeScript, bundling approach, and test runner.
4. **Precise narrow page detector.** Lock the first supported URL/DOM conditions after inspecting live pages and fixtures.
5. **Project folder change UX.** Confirm whether changing folders simply affects future saves, as recommended here, or needs extra warnings.

## Implementation Sequence Guidance

Recommended next DevCycles:

1. Verify Edge File System Access API behavior with a small spike.
2. Build the Manifest V3 shell, popup, options page, and active-tab capture message flow.
3. Implement parser fixtures and deterministic extraction.
4. Implement project folder setup, JSON saving, and CSV append.
5. Polish review UI, errors, and manual Edge testing.
