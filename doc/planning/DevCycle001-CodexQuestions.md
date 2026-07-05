# DevCycle001 Codex Questions

**Created:** 2026-07-05
**Author:** Codex
**Purpose:** Independent design questions for DevCycle001, based on the supporting documents and examples.

---

## Source Documents Reviewed

- `doc/examples/`
- `doc/ideas/brief.md`
- `README.md`
- `doc/planning/ExtensionRoadmap.md`

## Framing

The extension is intended to capture the currently open LinkedIn job posting, review/edit the extracted values, save a full structured listing record, and append a compact row to `job-tracking.csv` in a configured project folder.

The most important design questions are around local file access, data schemas, capture identity, parser boundaries, and the user workflow for review and save.

---

## Highest Priority Questions

### 1. How should the extension write to the local project folder?

Chromium extensions have meaningful limits around arbitrary local file access. What storage mechanism should the first implementation target?

Options to evaluate:

- File System Access API with a user-selected directory handle, if available and usable from the extension context in Edge.
- Browser downloads API, using configured filenames and asking the browser to save files.
- A manual export-first workflow where the extension produces CSV/JSON for the user to save.
- A future native helper or companion local app for direct filesystem writes.

Recommendation: make this the first technical spike/design decision because it affects the entire storage and UX model.
ED: Go with the recommendation

### 2. Is `job-tracking.csv` appended automatically, or does the user confirm each write?

After the user reviews the capture, should Save always append a CSV row, or should there be separate actions for saving the full listing and updating the CSV?

Recommendation: one primary Save action should save both the full listing JSON and the CSV row, with clear status after completion.
ED: Go with the recommendation

### 3. What are the exact first-version CSV columns?

The roadmap candidate columns are:

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

Questions:

- Should `sourceWebsite` be included even though the MVP is LinkedIn-only?
ED: No
- Should `promotionText` and `hiringStatusText` be included in the CSV, or only in JSON?
ED: Only in JSON
- Should CSV include a user-managed status column such as `status` or `applicationStatus`?
ED: NO
- Should CSV include an `appliedDate` column, or is that outside capture?
ED: Outside Capture
- Should CSV include `captureDate` and `captureTime` separately for spreadsheet filtering?
ED: Yes

Recommendation: include status-oriented empty columns only if the user expects to maintain this CSV directly as the working tracker.

ED: Go with the recommendation otherwise

### 4. What is the saved listing JSON schema?

The README and brief define a likely shape, but the design document should lock a first schema.

Questions:

- Should JSON use the same field names as CSV where possible?
ED: Yes
- Should the full listing file include a nested `raw` or `sourceText` section?
ED: No
- Should it include a `schemaVersion` field from the beginning?
ED: Yes
- Should it include the CSV row values as a nested object for traceability?
ED: Whatever you suggest
- Should missing fields be empty strings, `null`, omitted, or represented with extraction status metadata?
ED: Empty strings

Recommendation: include `schemaVersion` immediately and use empty strings for missing user-facing text fields in MVP.

### 5. What should happen on repeated captures of the same LinkedIn job?

Possible behaviors:

- Always create a new JSON file and append a new CSV row.
- Reuse/update the saved JSON file and append a new CSV row.
- Reuse/update both the saved JSON file and existing CSV row.
- Ask the user when a duplicate LinkedIn job ID is detected.

Recommendation: for MVP, avoid destructive updates. Save a new JSON file if needed, append a new CSV row, and include `linkedinJobId` so later tooling can detect duplicates.
ED: Go with recommendation
### 6. What counts as a supported LinkedIn job page?

The design should define supported URL/page conditions.

Questions:

- Are only `/jobs/view/...` URLs supported?
- Should search result pages with a selected job pane be supported?
- Should the extension work when LinkedIn uses semantic search routes but shows a job details panel?
- Should unsupported pages show a helpful message or just disable capture?

Recommendation: support pages where a job detail view is present, but define a narrow first detector and expand after testing.
ED: Go with recommendation
### 7. Is a popup sufficient for editable review?

The brief says a simple popup is sufficient, but editable full descriptions and optional sections may exceed comfortable popup size.

Questions:

- Should the popup show only summary fields and open a larger extension page for full review?
- Should the description be collapsed in the review UI by default?
- Which fields must be editable before MVP save?
- Is editing the full description required, or only metadata fields?

Recommendation: design a compact popup for capture/status and use an extension page or larger view for detailed review if editing many fields becomes cramped.
ED: Go with recommednation
---

## Project Folder And Storage Questions

### 8. How does the user configure the project folder?

Questions:

- Is configuration done during first run, from an Options page, or from the popup when no folder is configured?
ED: options page
- Should the extension validate that the folder contains `job-tracking.csv` and `saved-listings/`?
ED: Yes
- Should it create missing files/folders automatically after confirmation?
ED: Yes
- Should the selected folder handle/path be persisted in extension storage?
ED: Yes


### 9. What should the default project folder structure be?

Current assumed structure:

```text
Job Search Project/
  job-tracking.csv
  saved-listings/
    ...json
```

Questions:

- Should `saved-listings/` contain one flat folder, or subfolders by year/month/company?
- Should full listing records be `.json`, `.md`, `.html`, or multiple formats?
- Should original page HTML ever be saved, or only extracted structured data?

Recommendation: use one flat `saved-listings/` folder for MVP and save structured JSON only.
ED: Go with recommendation


### 10. How should saved listing filenames be generated?

Questions:

- Should filenames use capture date, company, title, and LinkedIn job ID?
- Should they include time to avoid collisions?
- How should illegal filename characters be sanitized?
- How long can filenames be before truncation?

Recommendation: include date, company slug, title slug, and LinkedIn job ID when available.
ED: Go with recommendation


### 11. Should the CSV store relative or absolute paths to saved listings?

Questions:

- Should `savedListingPath` be relative to the project folder for portability?
- Should absolute paths be avoided in case the project folder moves?
- Should the CSV path use forward slashes for spreadsheet readability?

Recommendation: store project-relative paths, such as `saved-listings/2026-07-05_starbucks_123.json`.
ED: Go with recommendation

### 12. What CSV dialect should be used?

Questions:

- UTF-8 with BOM or UTF-8 without BOM?
- CRLF or LF line endings?
- RFC 4180 style quoting for commas, quotes, and newlines?
- Should long description text be excluded from CSV to avoid awkward spreadsheet rows?

Recommendation: use UTF-8 CSV with standard quoting and keep full descriptions out of the CSV.
ED: Go with recommendation
---

## Capture Record Questions

### 13. What is the minimum viable capture record?

If extraction is incomplete, what fields should be considered enough to save?

Possible minimums:

- URL only
- URL plus capture time
- URL plus company and title
- any capture object, even mostly blank

Recommendation: allow saving if URL and capture time exist, but warn when company/title are blank.
ED: Go with recommendation
### 14. Should capture timestamps be local time, UTC, or both?

Questions:

- Should JSON use ISO UTC, such as `2026-07-05T18:30:00.000Z`?
- Should CSV use a spreadsheet-friendly local timestamp?
- Should timezone be stored separately?

Recommendation: store UTC ISO in JSON and a spreadsheet-friendly local timestamp in CSV, with an explicit timezone or offset if useful.
ED: Go with recommendation. 
### 15. Should visible LinkedIn text be normalized?

Examples contain text like `1 month ago`, `Reposted 3 hours ago`, and `Over 100 people clicked apply`.

Questions:

- Should whitespace be collapsed?
- Should bullet symbols be preserved?
- Should smart punctuation be preserved as displayed?
- Should visible labels like `About the job` be excluded from the description field?

Recommendation: normalize excessive whitespace but preserve user-visible wording.
ED: Go with recommendation
### 16. Should the parser preserve section structure inside descriptions?

Questions:

- Is plain text enough for full descriptions?
- Should the JSON preserve paragraphs, bullets, and section headings as arrays or markdown-like text?
- Should extracted optional sections be separate fields only, or also remain in the full text?

Recommendation: start with plain text fields, but preserve line breaks enough to keep descriptions readable.
ED: Go with recommendation
### 17. How should optional LinkedIn sections be represented?

Examples include:

- Requirements added by the job poster
- Benefits found in job post

Questions:

- Should these be fixed fields, flexible named sections, or both?
- Should additional future LinkedIn sections be captured generically?
- Should partial/truncated section headings, like `Benefits found in job po`, be treated as a parser issue or a fixture limitation?

Recommendation: keep known first-class fields plus a generic `additionalSections` collection for future-proofing.
ED: Go with recommendation
---

## Parser And LinkedIn Page Questions

### 18. What should be the parser's primary source of truth?

Questions:

- Should extraction rely mostly on DOM relationships and visible headings?
- Should `innerText` from the job details container be used as a fallback?
- Should structured data embedded in page scripts be used if available?
- Should tests use saved HTML, extracted text fixtures, or both?

Recommendation: use DOM/accessible labels first, text fallback second, and fixtures for both HTML and text cases.
ED: Go with recommendation
### 19. How should the parser expand the description?

Questions:

- What controls count as description expansion controls?
- Should the extension click buttons with text like `...more`, `Show more`, or accessible labels?
ED: User will click
- How long should it wait after expansion?
- What should happen if expansion fails?

### 20. How should apply type be detected?

Examples show `Easy Apply` and `Apply`.

Questions:

- Is any visible `Easy Apply` button enough?
- Does visible `Apply` always mean external apply?
- How should disabled or already-applied states be handled?
- Should apply type be editable by the user?

Recommendation: infer `Easy Apply` only from explicit visible text; infer `External Apply` from primary Apply button when not Easy Apply; otherwise `Unknown`.
ED: Go with recommendation
### 21. How should posted text and applicant count be split?

Examples combine location, posted age, and applicant count on one visible line separated by dots.

Questions:

- Should parsing assume the order `location · postedText · applicantCountText`?
- How should missing applicant count be handled?
- How should phrases like `Over 100 people clicked apply` differ from `Over 100 applicants`?

Recommendation: preserve the exact applicant count phrase and avoid normalizing to a number.
ED: Go with recommendation
### 22. How should company and title be detected when LinkedIn shows logos or repeated names?

Questions:

- Should logo alt text be ignored for company extraction?
- Should the first prominent company link/name be used?
- How should repeated company names in the page chrome or recommendations be avoided?

### 23. How broad should workplace type and employment type extraction be?

Questions:

- Should recognized workplace types be only `Remote`, `Hybrid`, and `On-site`?
- Should employment type support arbitrary visible text beyond `Full-time`, `Contract`, and `Internship`?
- Should unrecognized values be preserved as visible text?

Recommendation: preserve visible text and optionally classify only known workplace values.
ED: Go with recommendation
---

## UX Questions

### 24. What should the first-run experience be?

Questions:

- Should the extension prompt for project folder before any capture?
- Should capture be allowed before configuration, with export-only behavior?
- Should the popup show setup status every time until configured?

Recommendation: require setup before Save, but allow Capture and Review so the user can see value before configuring storage.
ED: Go with recommendation
### 25. What should the review screen prioritize?

Questions:

- Which fields should be visible at the top?
- Should CSV fields be grouped separately from full listing fields?
- Should missing fields be highlighted?
- Should the user be able to edit the generated filename or notes before saving?

### 26. What status and error messages are needed?

Likely states:

- unsupported page
- not configured
- capturing
- expansion failed but capture continued
- fields missing
- save succeeded
- JSON saved but CSV failed
- CSV saved but JSON failed
- project folder permission lost

Question: Which failures should block save, and which should produce warnings?

### 27. Should the extension show a post-save link or path?

Questions:

- Should the UI show the saved JSON filename after save?
ED: No
- Should it show that a row was appended to `job-tracking.csv`?
ED: Yes
- Should it offer to copy the saved listing path?
ED: No
---

## Testing And Fixtures Questions

### 28. What tests should be required before implementation cycles are considered complete?

Questions:

- Parser unit tests against `easyposttext.txt` and `starbuckstext.txt`?
- Parser tests against saved HTML files?
- CSV serialization tests?
- Filename slug/sanitization tests?
- Manual Edge extension load checklist?

Recommendation: at minimum, parser fixture tests and CSV serialization tests should exist before calling the MVP stable.
ED: Go with recommendation
### 29. Should example fixtures be cleaned or transformed?

The text examples show mojibake for smart punctuation in command output, likely encoding-related.

Questions:

- Are the fixture files actually UTF-8 and only displayed incorrectly by the terminal?
- Should tests assert exact punctuation, or normalized text?
- Should fixture files be regenerated with known encoding before parser tests are built?

### 30. Should saved HTML fixtures be considered stable enough for tests?

Questions:

- Are the `*bare.html` files manually stripped or complete saved pages?
- Do they include enough dynamic DOM content for parser tests?
- Should smaller targeted fixtures be created from them later to avoid huge test inputs?

Recommendation: use large HTML files initially as reference material, then create smaller focused fixtures once parser boundaries are known.
ED: Go with recommendation
---

## Scope And Product Boundary Questions

### 31. What belongs in the extension versus the later local application?

Questions:

- Is CSV tracking part of the extension MVP? Current answer appears to be yes.
ED: Yes
- Is editing job-search status part of the extension MVP, or only writing blank/status columns?
ED: Only writing
- Is searching saved listings part of the extension? Current answer appears to be no.
ED: No
- Is duplicate detection part of the extension? Current answer appears to be no, except safe filenames.
ED: No
### 32. Should this extension ever automate application actions?

The docs say no. Should the design document explicitly state that the extension must not click application submit buttons, fill forms, or automate application workflows?

Recommendation: yes, make this a hard product boundary.
ED: Correct. NEVER automate application actions
### 33. Should the extension support sites other than LinkedIn later?

Questions:

- Should the schema be LinkedIn-specific for MVP?
- Should `sourceWebsite` and parser boundaries be designed to allow future site-specific parsers?
- Should `linkedinJobId` remain a top-level field or become a source-specific ID?

Recommendation: optimize for LinkedIn now, but keep `sourceWebsite` and `sourceJobId`/`linkedinJobId` decisions explicit
ED: Go with recommendation
---

## Suggested Decisions To Capture In `ExtensionDesign.md`

The final design document should probably include these sections:

- Product boundaries
- User workflow
- Extension architecture
- Browser permissions and storage approach
- Project folder layout
- Saved listing JSON schema
- CSV schema and dialect
- Capture/review/save behavior
- Parser strategy and assumptions
- Error handling rules
- Duplicate/repeated capture behavior
- Testing strategy
- Deferred features
  ED: Go with recommendation
## Codex Default Recommendations

If the user wants a concrete starting point, my default recommendations are:

- Use one primary Save action that writes both JSON and CSV after review.
- Store full listings as JSON in `saved-listings/`.
- Store project-relative saved listing paths in `job-tracking.csv`.
- Use `schemaVersion` in JSON from the start.
- Use text-preserving fields; avoid salary/date/applicant numeric parsing in MVP.
- Append new CSV rows for repeated captures rather than updating existing rows.
- Keep descriptions out of CSV; store them in JSON only.
- Make folder access the first technical design decision before implementation.
  ED: Go with recommendation