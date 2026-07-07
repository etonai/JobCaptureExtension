# DevCycle 002: File System Access API Behavior Spike

**Status:** VERIFIED
**Start Date:** 2026-07-05
**Target Completion:** 2026-07-05
**Focus:** Verify whether Microsoft Edge can support the planned project folder workflow from a Manifest V3 extension context.

---

## Goal

This DevCycle validates the highest-risk technical assumption in the extension design: durable local project folder access.

The planned extension depends on selecting a local project folder, persisting access to it, creating or validating files and folders inside it, writing full saved listing JSON files, and appending rows to `job-tracking.csv`. Before building the main extension shell or parser flow around that assumption, this cycle should prove the File System Access API behavior in Microsoft Edge or document a required fallback approach.

## Desired Outcome

By the end of this DevCycle, the project should have clear evidence showing whether the File System Access API is viable for the extension's local storage model in Microsoft Edge.

If viable, the cycle should document the exact permission, persistence, read/write, and re-grant behavior future DevCycles should implement. If not viable, the cycle should document the blocking behavior and recommend an alternate storage path before DevCycle003 begins.

---

## Tasks

### Phase 1: Spike Harness Setup

**Status:** Work Complete

- [x] Create a minimal Manifest V3 spike extension or equivalent local test harness.
- [x] Add an extension page or options page that can trigger project folder selection.
- [x] Add basic UI/status output for each storage operation being tested.
- [x] Document how to load and run the spike in Microsoft Edge.

**Technical Notes:**

The spike should be intentionally small and disposable unless the code proves useful for later implementation. It should focus on File System Access behavior, not LinkedIn capture, parsing, or review UI.

The preferred API to test is `showDirectoryPicker({ mode: "readwrite" })` from the intended extension context.

### Phase 2: Folder Permission and Persistence Tests

**Status:** Work Complete

- [x] Verify whether `showDirectoryPicker` is available in the selected Edge extension context.
- [x] Request a user-selected project folder with read/write access.
- [x] Persist the selected directory handle using IndexedDB or another appropriate browser-side store.
- [x] Restore the directory handle after extension page reload.
- [x] Restore or re-check the directory handle after extension reload.
- [x] Restore or re-check the directory handle after browser restart, if practical.
- [x] Test `queryPermission()` behavior before writes.
- [x] Test `requestPermission()` behavior when permission is missing or downgraded.
- [x] Document the recommended permission re-grant flow.

**Technical Notes:**

The design preference is to avoid prompting on every popup open. The spike should verify whether permission can be checked lazily at Save time and re-requested only when needed.

Important outcomes to record:

- whether handles can be persisted
- whether permissions survive reloads/restarts
- what user gesture is required to re-request permission
- whether Edge blocks or restricts the API in extension pages

### Phase 3: Project Folder Read/Write Tests

**Status:** Work Complete

- [x] Create or validate a `saved-listings/` folder inside the selected project folder.
- [x] Create `job-tracking.csv` if it does not exist.
- [x] Write a sample JSON listing file into `saved-listings/`.
- [x] Append a sample row to `job-tracking.csv`.
- [x] Write CSV using the planned dialect: UTF-8 with BOM, CRLF line endings, and RFC 4180-style quoting.
- [x] Validate behavior when `job-tracking.csv` already exists with the expected header.
- [x] Validate behavior when `job-tracking.csv` exists with a mismatched header.
- [x] Validate behavior when the target JSON filename already exists.

**Technical Notes:**

Use the project folder model from `doc/planning/ExtensionDesign.md`:

```text
Job Search Project/
  job-tracking.csv
  saved-listings/
    sample-listing.json
```

The spike should not implement the real parser or capture schema beyond a sample JSON object and sample CSV row sufficient to test file operations.

### Phase 4: Failure Mode Documentation

**Status:** Work Complete

- [x] Document behavior when the user cancels folder selection.
- [x] Document behavior when permission is denied.
- [x] Document behavior when permission is lost or must be re-granted.
- [x] Document behavior when `showDirectoryPicker` is unavailable.
- [x] Document behavior when folder or file creation fails.
- [x] Document behavior when CSV append fails after JSON write succeeds.
- [x] Document any Edge-specific policy, version, or security limitations discovered.

**Technical Notes:**

The output should describe user-visible implications, not only technical exceptions. Future implementation DevCycles need to know which failures block Save, which can produce partial success, and which require a fallback design.

### Phase 5: Spike Findings and Recommendation

**Status:** Work Complete

- [x] Create a findings document summarizing test results.
- [x] State whether File System Access API remains the recommended implementation path.
- [x] If viable, record the recommended storage and permission flow for DevCycle003 and DevCycle005.
- [x] If not viable, recommend the fallback approach to design next.
- [x] Update `doc/planning/ExtensionDesign.md` if the spike changes any storage assumptions.
- [x] Update `doc/planning/ExtensionRoadmap.md` if the spike changes future DevCycles.

**Technical Notes:**

Suggested output file:

- `doc/planning/DevCycle002-FileSystemAccessFindings.md`

The findings should be concise but specific enough that implementation can follow them without repeating the spike.

---

## Open Questions

1. **What minimum Edge version should the project support?**
   Recommendation: determine this from the spike results rather than guessing before testing.

2. **Should the spike code be discarded or promoted into the real extension?**
   Recommendation: treat it as disposable unless the implementation is clean and directly reusable.

3. **What fallback should be considered if File System Access API is not viable?**
   Recommendation: evaluate fallbacks only if the spike fails. Likely candidates are a manual export/download workflow or a future native helper.

---

## Notes and Risks

- This DevCycle is a technical spike, not the full extension shell.
- Do not implement LinkedIn parsing, review UI, or production CSV tracking beyond sample file writes.
- File System Access API behavior may differ between normal web pages, extension pages, popups, options pages, and service workers.
- Directory handle persistence and permission re-grant behavior are the most important findings.
- If the selected API is not viable in Edge, later roadmap items may need to be redesigned before implementation continues.

---

## Completion Summary

*Fill in when the cycle closes. Move this document to `doc/planning/completed/` afterward.*

**Completion Date:** 2026-07-05
**Phases Completed:** All
**Work Deferred:** None.

**Accomplishments:**
- Created a minimal Manifest V3 File System Access API spike extension.
- Added an options page for selecting and persisting a project folder handle.
- Implemented sample project folder validation, JSON write, CSV creation, CSV append, header validation, and diagnostics logging.
- Created `doc/planning/DevCycle002-FileSystemAccessFindings.md` and recorded that all manual Edge tests passed.

**Metrics:**
- Files added: 6
- JavaScript syntax check: passed with `node --check spikes/dc002-filesystem-access/extension/options.js`

**Lessons / Notes:**
Microsoft Edge supports the planned File System Access API workflow according to user-reported manual verification. File System Access API remains the recommended storage path for the project folder workflow. The DevCycle is Work Complete; `Verified` status still requires explicit user approval under the project workflow.




