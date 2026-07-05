# DevCycle 004: LinkedIn Parser MVP

**Status:** VERIFIED
**Start Date:** 2026-07-05
**Target Completion:** 2026-07-05
**Focus:** Implement deterministic LinkedIn job page parsing against the provided examples and current extension shell.

---

## Goal

This DevCycle builds the first real LinkedIn job parser for the extension.

DevCycle003 established the Manifest V3 shell, popup flow, options entry point, active-tab capture messaging, and a conservative page detector. DevCycle004 replaces the minimal capture result with a structured, deterministic parser that extracts the MVP fields defined in `doc/planning/ExtensionDesign.md`, while keeping parsing behavior separate from popup UI concerns.

## Desired Outcome

By the end of this DevCycle, clicking Capture on a supported LinkedIn job page should return a structured capture object with the core job posting fields populated when present.

The parser should work against the provided example fixtures and should tolerate missing fields by returning empty strings rather than failing the whole capture. The extension should still not save JSON or append CSV in this cycle; persistence remains planned for DevCycle005.

---

## Tasks

### Phase 1: Parser Module Structure

**Status:** Work Complete

- [x] Create a parser module boundary separate from popup UI code.
- [x] Define the first-version capture object shape in code, matching `ExtensionDesign.md`.
- [x] Add helper functions for text normalization and empty-field defaults.
- [x] Update the active-tab capture flow to call the parser module.
- [x] Keep the parser deterministic and free of AI/LLM behavior.

**Technical Notes:**

The parser helpers currently live inside the injected `captureActivePage` function because `chrome.scripting.executeScript({ func })` serializes that function into the active tab. The popup remains responsible for UI state only.

### Phase 2: Fixture Setup and Parser Tests

**Status:** Work Complete

- [x] Add parser tests using `doc/examples/easyposttext.txt`.
- [x] Add parser tests using `doc/examples/starbuckstext.txt`.
- [x] Add parser/integration tests or reference checks for the saved HTML fixtures.
- [x] Add expected-output assertions for Easy Apply and external Apply examples.
- [x] Add tests for missing fields and empty-string defaults.
- [x] Document any fixture encoding or normalization quirks discovered.

**Technical Notes:**

The text fixtures drive deterministic field assertions. The saved HTML fixtures are covered by lightweight reference checks because they are large hydrated LinkedIn app snapshots with generated classes and embedded resources.

### Phase 3: LinkedIn Page Detection Refinement

**Status:** Work Complete

- [x] Refine the conservative DC3 page detector using fixture evidence.
- [x] Define the first supported LinkedIn job detail conditions.
- [x] Keep unsupported-page results structured and user-friendly.
- [x] Ensure non-LinkedIn pages still return unsupported-page results.
- [x] Record known unsupported LinkedIn layouts for later cycles.

**Technical Notes:**

Supported pages require a LinkedIn host plus at least one job-detail signal: a `/jobs/` path, an `About the job` section, or extracted company/title metadata paired with posted text or an apply-button signal.

### Phase 4: Core Field Extraction

**Status:** Work Complete

- [x] Extract capture timestamps and current URL.
- [x] Extract LinkedIn job ID when available.
- [x] Extract company name.
- [x] Extract position title.
- [x] Extract location.
- [x] Extract workplace type.
- [x] Extract employment type.
- [x] Extract salary text.
- [x] Extract posted text.
- [x] Extract applicant count text.
- [x] Extract promotion text.
- [x] Extract hiring status text.
- [x] Extract apply type: `Easy Apply`, `External Apply`, or `Unknown`.

**Technical Notes:**

The parser preserves visible values instead of converting salary, posting age, or applicant counts into normalized values. `Easy Apply` is inferred only from explicit visible text; plain `Apply` is classified as `External Apply`.

### Phase 5: Description and Optional Section Extraction

**Status:** Work Complete

- [x] Extract the full visible job description text.
- [x] Exclude UI headings such as `About the job` when practical.
- [x] Preserve readable line breaks and bullet-like text.
- [x] Extract `posterRequirements` when present.
- [x] Extract `benefits` when present.
- [x] Capture additional named sections as `additionalSections` where practical.
- [x] Keep the user-manual-expansion requirement visible in the popup.

**Technical Notes:**

`additionalSections` is present in the capture record shape but is not populated yet. This keeps the schema ready without overfitting section parsing during the MVP parser cycle.

### Phase 6: Popup Result Display Update

**Status:** Work Complete

- [x] Update the popup to display the structured parser result at a summary level.
- [x] Show missing or ambiguous core fields clearly.
- [x] Keep the UI simple and avoid building the final editable review UI in this cycle.
- [x] Keep Save disabled or absent, since persistence belongs to DevCycle005.
- [x] Ensure unsupported-page and parser-error states remain clear.

**Technical Notes:**

The popup now shows a compact capture summary for parser verification. It still does not expose save behavior or final editable review controls.

### Phase 7: Verification and Documentation

**Status:** Work Complete

- [x] Run parser tests against text fixtures.
- [x] Run HTML fixture reference checks added in this cycle.
- [x] Run existing DC3 smoke tests through the updated smoke test entry point.
- [x] Run JavaScript syntax checks.
- [x] Manually test the extension capture flow in Edge if a live or representative LinkedIn job page is available.
- [x] Document parser assumptions and known limitations.
- [x] Update `ExtensionDesign.md` if parser findings change any design assumptions.

**Technical Notes:**

Manual Edge verification and regression checks were completed by the user. No design assumptions required a change to `ExtensionDesign.md` during this cycle.

---

## Manual Test Checklist

Run these checks from Microsoft Edge after reloading the unpacked extension from `C:\dev\JobCaptureExtension\extension`.

### Reload / Version Check

- [x] Open `edge://extensions/`.
- [x] Reload the unpacked `LinkedIn Job Capture` extension.
- [x] Confirm the displayed extension version is `0.0.4.2`.
- [x] Confirm the extension name is `LinkedIn Job Capture`.

### Basic Popup Checks

- [x] Open the extension popup.
- [x] Confirm the popup title says `Capture Job`.
- [x] Confirm the popup includes the manual expansion reminder.
- [x] Click the options/settings button and confirm the options page opens.
- [x] Confirm there is no Save button or persistence workflow in this DevCycle.

### Unsupported Page Checks

- [x] Open a non-LinkedIn page such as `https://example.com/`.
- [x] Click `Capture Active Tab`.
- [x] Confirm the popup shows `Unsupported Page`.
- [x] Confirm a structured summary appears with missing fields shown as `Not captured` where appropriate.

### LinkedIn Non-Job Page Checks

- [x] Open a LinkedIn page that is not a job detail page, such as the LinkedIn home page or profile page.
- [x] Click `Capture Active Tab`.
- [x] Confirm the popup shows an unsupported-page message rather than pretending to capture a job.

### LinkedIn Job Page Checks

- [x] Open a LinkedIn job detail page.
- [x] Manually expand the job description if LinkedIn has collapsed it.
- [x] Click `Capture Active Tab`.
- [x] Confirm the popup status changes to `Captured`.
- [x] Confirm the summary shows company, title, location, posted text, applicants, apply type, and URL when those values are visible on the page.
- [x] Confirm the description field reports a non-zero character count when the job description is visible.
- [x] Confirm missing optional fields show `Not captured` instead of causing an error.

### Apply Type Checks

- [x] Test a job with an `Easy Apply` button and confirm Apply Type is `Easy Apply`.
- [x] Test a job with a standard `Apply` button and confirm Apply Type is `External Apply`.

### Regression Checks

- [x] Run `node --check extension/content/captureActivePage.js`.
- [x] Run `node --check extension/popup/popup.js`.
- [x] Run `node extension/tests/captureActivePage.smoke.test.mjs`.
- [x] Confirm the smoke test prints `capture parser fixture tests passed`.

## Open Questions

1. **Should DC4 parse directly from the live DOM, fixture text, or both?**
   Answer: the extension parser reads live page visible text (`document.body.innerText`), while tests use the provided visible-text fixtures for repeatability.

2. **How much parser output should the popup show?**
   Answer: the popup shows a compact structured summary and defers full editing/review to DevCycle006.

3. **Should small derived fixtures be created from the large saved HTML files?**
   Answer: not in this cycle. The large saved HTML files are retained as reference snapshots, while the text fixtures drive parser assertions.

4. **How should ambiguous fields be represented in DC4?**
   Answer: the parser returns best-effort values plus warning objects for missing quality fields, without blocking capture.

---

## Notes and Risks

- LinkedIn DOM structure may change frequently; avoid depending on generated CSS class names.
- The parser must remain deterministic and local-only.
- Capturing incomplete records is preferable to failing the entire capture.
- DC4 does not implement final project folder persistence, JSON file saving, or CSV append behavior.
- DC4 does not implement application automation of any kind.
- The saved HTML fixtures are large hydrated app snapshots; text fixtures are more maintainable for deterministic parser assertions.
- Example text output can contain encoding/display quirks; parser tests normalize LinkedIn middle-dot separators carefully.

---

## Completion Summary

**Completion Date:** 2026-07-05
**Phases Completed:** 7 of 7 implementation phases; manual Edge verification and regression checks complete.
**Work Deferred:** Final editable review UI; project folder persistence; JSON saving; CSV append behavior; richer `additionalSections` parsing.

**Accomplishments:**
- Implemented a structured LinkedIn capture record with MVP fields.
- Added deterministic parsing for EasyPost and Starbucks fixture examples.
- Updated popup summary display for structured capture output.
- Added unsupported-page behavior with structured records and parser warnings.
- Added parser smoke tests and HTML fixture reference checks.
- Documented parser assumptions and limitations in `extension/PARSER_NOTES.md`.

**Metrics:**
- Files modified: 6
- Files added: 1
- Automated checks run: 4

**Lessons / Notes:**
The text fixtures are the best source for repeatable parser assertions. The saved HTML fixtures are useful as layout/reference snapshots, but their generated class names and hydrated markup make them a poor first target for brittle DOM selector tests.