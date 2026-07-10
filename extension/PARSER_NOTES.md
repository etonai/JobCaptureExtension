# LinkedIn Parser Notes

DevCycle004 introduced the first deterministic LinkedIn parser used by the popup capture flow.

## Current Approach

- The injected capture function reads the active page URL, document title, and visible `document.body.innerText`.
- Parsing is local and deterministic; it does not call an AI/LLM service.
- Missing user-facing fields return empty strings. `applyType` returns `Easy Apply`, `External Apply`, or `Unknown`.
- The parser preserves visible strings for salary, posted age, applicant count, promotion, and hiring status instead of converting them to normalized numeric or date values.
- Job descriptions are captured as plain text with readable line breaks. The user must manually expand collapsed LinkedIn descriptions before capture.

## Supported Signals

A page is treated as a supported LinkedIn job page when it is on a LinkedIn host and has at least one job-detail signal:

- a `/jobs/` URL path
- an `About the job` section
- extracted company/title metadata plus either posted text or an apply button signal

Non-LinkedIn pages and LinkedIn pages without job-detail signals return structured unsupported results.

## Fixture Coverage

The smoke test uses these visible-text fixtures for field extraction:

- `doc/examples/easyposttext.txt`
- `doc/examples/starbuckstext.txt`

The saved HTML fixtures are currently used as reference checks for title and hydrated LinkedIn snapshot markers:

- `doc/examples/easyposteasyapplybare.html`
- `doc/examples/Starbucksmoreunselectedbare.html`

The HTML snapshots include large hydrated application markup and generated class names. The text fixtures are the clearer source for deterministic parser assertions in this cycle.

## Known Limitations

- LinkedIn DOM and visible text ordering can change.
- The parser does not click expansion controls or navigate job panes.
- Salary, posted age, and applicant count are captured as visible text only. Salary capture is conservative and only accepts salary-like text from the selected job detail lines after the job metadata line.
- `additionalSections` is defined in the record shape but is not populated yet.
- Benefits are captured only when a recognizable benefits heading has visible content.
- The popup shows a summary for verification, not the final editable review UI.
- Persistence to JSON and CSV is intentionally deferred to a later DevCycle.
