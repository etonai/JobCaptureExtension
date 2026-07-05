# DevCycle001: Claude Design Questions

**Source materials reviewed:** `AGENTS.md`, `doc/planning/DevelopmentProcess.md`, `README.md`, `doc/ideas/brief.md`, `doc/planning/ExtensionRoadmap.md`, `doc/examples/starbuckstext.txt`, `doc/examples/easyposttext.txt`, and the corresponding `*.html` fixtures.

This list is organized by design area per DevCycle001 Phase 1. Each question notes why it matters where that isn't obvious.

Answers below (marked **ED:**) were captured from the user's inline answers in `doc/planning/DevCycle001-CodexQuestions.md` and incorporated here where they resolve the same design question, even though the phrasing differs between the two question lists.

---

## 1. Project Folder Access & Storage Model

1. **How will the extension get durable read/write access to a user-chosen folder?** Manifest V3 extensions can't silently read/write an arbitrary filesystem path across browser restarts. Candidates: the File System Access API (`showDirectoryPicker` + persisted `FileSystemDirectoryHandle` via IndexedDB), the `downloads` API (writes into the Downloads folder or a subfolder, no arbitrary path), or a native messaging host / local companion process. This is the single most consequential technical decision in the roadmap ("Key Design Decisions To Make Early") and blocks DevCycle004 design.
   **ED (via Codex Q1): Go with the recommendation** â€” File System Access API with a user-selected directory handle.
2. **If using the File System Access API, how do we handle permission re-grant?** Directory handle permissions are not guaranteed to persist indefinitely and Chromium may ask the user to re-approve access after browser restarts or on a schedule. Do we prompt on every extension open, only when a write fails, or something else?
   **Unanswered.**
3. **Is Edge's File System Access API support (including any Edge-specific policy restrictions) confirmed sufficient for this use case**, or does it need a spike/verification before committing to it in DevCycle001?
   **Unanswered** â€” the storage mechanism itself is decided (see Q1), but feasibility in Edge specifically has not been verified.
4. **What happens on first run before a project folder is configured?** Does the popup block capture entirely, allow capture but disable save, or force a folder-picker flow before anything else works?
   **ED (via Codex Q24): Go with the recommendation** â€” allow Capture and Review before setup so the user sees value early; require setup only before Save. Configuration itself happens on an Options page (Codex Q8).
5. **Can the project folder be changed later, and if so, what happens to previously saved listings/CSV?** Do we require the user to manually relocate files, or does the extension only ever write forward from the point of reconfiguration?
   **Unanswered.**

## 2. Saved Listing JSON Schema

6. **What are the final field names for the saved listing JSON?** README and brief.md use slightly different examples (README's includes `sourceWebsite`, brief.md's omits it). Should the consolidated design document lock a single canonical schema now?
   **Partially answered.** ED confirmed `sourceWebsite` is excluded from CSV (Codex Q3), and JSON field names should match CSV field names where possible (Codex Q4). Exact full JSON field list still needs to be written out as a locked table in the consolidated design doc â€” see Critical Unanswered Questions.
7. **Should the JSON schema include a version field** (e.g., `"schemaVersion": 1`)?
   **ED (via Codex Q4): Yes**, from the start.
8. **Should `posterRequirements` and `benefits` be plain strings, or structured (e.g., array of bullet lines)?**
   **ED (via Codex Q16/Q17): Go with the recommendation** â€” plain text fields, preserving line breaks for readability; known sections remain first-class fields plus a generic `additionalSections` collection for future-proofing.
9. **Should raw/unedited extraction and user-edited final values both be retained** (e.g., an `extracted` block and a `reviewed`/`final` block)?
   **ED (via Codex Q4): No** â€” no nested `raw`/`sourceText` section. The saved JSON holds only the final (possibly user-edited) values; parser accuracy auditing across raw vs. final is not supported in MVP.
10. **What is the filename convention precisely?**
    **ED (via Codex Q10): Go with the recommendation** â€” date + company slug + title slug + LinkedIn job ID when available. Exact sanitization/truncation rules still need to be spelled out in the design doc.

## 3. CSV Tracking Schema & Write Behavior

11. **What is the final, locked column list and column order for `job-tracking.csv`?** Should `notes` be extension-managed or purely user-managed?
    **Mostly answered via Codex Q3:** exclude `sourceWebsite`; exclude `promotionText`/`hiringStatusText` (JSON only); no `status`/`applicationStatus` column; no `appliedDate` column; include `captureDate` and `captureTime` as separate columns. `notes` remains a user-managed column the extension does not populate (consistent with "only writing" scope answer in Codex Q31 â€” extension does not manage status).
12. **Does the extension only ever append rows, or can it detect and update an existing row for the same `linkedinJobId`/URL?**
    **ED (via Codex Q5): Go with the recommendation** â€” always create a new JSON file and append a new CSV row on repeated captures; no destructive updates. `linkedinJobId` is retained so future tooling can detect duplicates.
13. **What CSV quoting/escaping rules apply?**
    **ED (via Codex Q12): Go with the recommendation** â€” UTF-8, standard/RFC 4180-style quoting, full descriptions kept out of CSV. BOM vs. no-BOM and CRLF vs. LF were not explicitly settled â€” see Critical Unanswered Questions.
14. **What happens if `job-tracking.csv` exists but has a different/older header row?**
    **Unanswered.**
15. **Does `savedListingPath` in the CSV store an absolute path, a path relative to the project folder, or just the filename?**
    **ED (via Codex Q11): Go with the recommendation** â€” project-relative path with forward slashes, e.g. `saved-listings/2026-07-05_starbucks_123.json`.

## 4. Parser Assumptions & Field Extraction

16. **How should Location and Workplace Type be separated when LinkedIn renders them together?**
    **ED (via Codex Q23): Go with the recommendation** â€” preserve visible text as-is; optionally classify only recognized workplace values (`Remote`/`Hybrid`/`On-site`). Exact DOM/positional heuristic still needs to be written out in the design doc.
17. **How is Apply Type actually determined in the DOM?**
    **ED (via Codex Q20): Go with the recommendation** â€” infer `Easy Apply` only from explicit visible button text; infer `External Apply` from the primary Apply button when not Easy Apply; otherwise `Unknown`. Whether Apply Type is user-editable in the review UI was not explicitly confirmed but is assumed yes, consistent with all other reviewed fields being editable.
18. **How do we detect and trigger description expansion deterministically?**
    **Resolved â€” changed approach.** **ED (via Codex Q19): "User will click."** The extension does not need to detect or auto-click a "â€¦more"/"Show more" control; the user is responsible for manually expanding the description before capture. This removes the automated-expansion requirement from README/brief's MVP flow and should be corrected in the consolidated design document.
19. **How do we detect that we're on a "LinkedIn job page" at all?**
    **ED (via Codex Q6): Go with the recommendation** â€” support pages where a job detail view is present; define a narrow first detector and expand after testing. Exact URL pattern(s) for the "narrow first detector" still need to be written out.
20. **Are "Promotion Text" and "Hiring Status Text" always co-located and separated by `Â·`, or independent optional fields that can appear alone?**
    **Unanswered** (Codex's Q21 addressed posted/applicant-count ordering but not this specific promotion/hiring-status pairing question).
21. **Should the `.html` fixtures be the actual parser test fixtures and the `.txt` files be reference/expected-output only?**
    **ED (via Codex Q18/Q30): Go with the recommendation** â€” DOM/accessible labels first, `innerText` fallback second, and fixtures should cover both HTML and text cases. Large HTML files are usable as-is initially; smaller focused fixtures can be extracted later once parser boundaries are known.
22. **What's the defined behavior when a field's extracted value is ambiguous rather than simply missing?**
    **Unanswered** for the general case. Related but narrower: company/title detection when logos or repeated names could create ambiguity (Codex Q22) is also unanswered â€” see Critical Unanswered Questions.

## 5. Review UI & Editing Workflow

23. **Popup vs. larger extension page:** is a browser action popup sufficient for the review UI, or should the design commit to a full extension tab/page?
    **ED (via Codex Q7): Go with the recommendation** â€” compact popup for capture/status; use an extension page or larger view for detailed review once editing many fields becomes cramped.
24. **Are any fields required before Save is enabled?**
    **ED (via Codex Q13): Go with the recommendation** â€” allow Save if URL and capture time exist; warn (but don't block) when company/title are blank.
25. **Does editing a field in the review UI change what's written to the CSV row, the JSON listing, or both?**
    **Unanswered** â€” specifically whether correcting company/title after initial extraction also changes the already-generated filename slug.
26. **What does a "capture status" error look like when only some fields fail?**
    **Partially answered.** Codex Q26 lists the likely status states (unsupported page, not configured, capturing, expansion failed but continued, fields missing, save succeeded, JSON saved but CSV failed, CSV saved but JSON failed, permission lost) but the question of *which failures block Save vs. which only warn* was left open â€” see Critical Unanswered Questions. Separately, ED confirmed (Codex Q27): the post-save UI should **not** show the saved JSON filename, **should** show that a CSV row was appended, and should **not** offer to copy the saved listing path.

## 6. Permissions, Environment & Non-Functional

27. **What Manifest V3 permissions and host permissions are anticipated?**
    **Unanswered** (no direct Codex equivalent) â€” still needs to be listed explicitly for DevCycle002 manifest scoping.
28. **Is there a minimum supported Edge version** dictated by File System Access API availability?
    **Unanswered.**
29. **Should captured records ever leave the local machine, or is local-disk-only storage a hard requirement?**
    **Unanswered**, though the chosen File System Access approach (Q1) implies local-disk-only in practice.

## 7. Cross-Cutting / Consolidation Process

30. **Should the consolidated design document treat README.md as authoritative where README and brief.md conflict?**
    **Unanswered directly**, though ED's answers throughout (e.g., excluding `sourceWebsite` from CSV, confirming CSV tracking is in-scope per Codex Q31) effectively resolve the specific conflicts raised. Recommend stating this precedence rule explicitly in `ExtensionDesign.md` for any future, still-undiscovered conflicts.
31. **Should the consolidated `ExtensionDesign.md` include the locked JSON schema and CSV schema verbatim?**
    **ED (via Codex "Suggested Decisions" section): Go with the recommendation** â€” the design document should include dedicated sections for product boundaries, user workflow, architecture, permissions/storage, folder layout, JSON schema, CSV schema/dialect, capture/review/save behavior, parser strategy, error handling, duplicate-capture behavior, testing strategy, and deferred features.

## Additional Decisions Captured From Codex Questions (Not Originally Asked By Claude)

- **Product boundary:** the extension must **never** automate application actions â€” no clicking submit, no form-filling, no automated workflows (Codex Q32, hard requirement).
- **Scope boundary:** CSV tracking is in-scope for the MVP; editing/managing job-search status is not (the extension only writes, never edits, status-oriented columns); searching saved listings is out of scope; duplicate detection beyond safe filenames is out of scope (Codex Q31).
- **Multi-site future-proofing:** optimize for LinkedIn now, but keep `sourceWebsite` and `linkedinJobId`/source-specific-ID naming decisions explicit so a future site parser isn't blocked (Codex Q33).
- **Minimum viable capture record:** URL + capture time is sufficient to allow Save; warn when company/title are blank (Codex Q13).
- **Timestamps:** store UTC ISO 8601 in JSON; store a spreadsheet-friendly local timestamp in CSV (Codex Q14).
- **Text normalization:** collapse excessive whitespace; otherwise preserve visible wording as displayed (Codex Q15).
- **Testing minimum:** parser fixture tests (against both `.txt` and `.html` fixtures) and CSV serialization tests are required before the MVP is considered stable (Codex Q28).

---

## Critical Unanswered Questions

These are the design questions that remain open and materially block writing a complete `ExtensionDesign.md` or starting implementation with confidence. Everything else above has either been answered or is a detail that can be decided during implementation without much risk.

1. **Edge File System Access API feasibility spike.** The mechanism (File System Access API) is chosen, but its actual availability/behavior in Microsoft Edge (permission persistence across restarts, any Edge-specific policy restrictions) has not been verified. This blocks confident DevCycle002/004 architecture.

   **Codex recommendation:** Treat File System Access API as the intended storage mechanism, but make Edge verification the first technical spike before building storage-dependent features. Verify that an extension page or options page can call `showDirectoryPicker({ mode: "readwrite" })`, persist a directory handle, restore it, create `saved-listings/`, write JSON, and create/append `job-tracking.csv`.

2. **Directory handle permission re-grant flow.** Not decided: prompt every open, only on write failure, or some other pattern. Needed before implementing the storage layer.

   **Codex recommendation:** Store the directory handle, check permission only when the user tries to save, and request permission only if needed. Do not prompt on every popup open. If permission is missing or revoked, show a clear "Reconnect project folder" action.

3. **Company/Title extraction heuristic.** No answer on how to reliably pick the correct company name and title out of the DOM when logos, repeated names, or "People you can reach out to" sections could produce ambiguous candidates. This is a core parser correctness risk for DevCycle003.

   **Codex recommendation:** Use a ranked extraction strategy. First identify the main job detail container. Within that container, extract the title from the primary job heading, then extract the company from the nearest company link/name adjacent to that heading. Ignore logo alt text, contact/network sections, recommendation cards, and "People you can reach out to" content. If multiple candidates remain, choose the highest-confidence candidate for review and flag the field as ambiguous in the UI.

4. **Full canonical JSON field list.** ED confirmed JSON field names should match CSV where possible and that `schemaVersion` and `additionalSections` are included, but the complete, final JSON schema (every field name, in order) has not been written out and locked.

   **Codex recommendation:** Lock this first-version JSON schema:

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

   Missing user-facing text fields should be empty strings. `additionalSections` should contain objects shaped like `{ "heading": "", "text": "" }`.

5. **CSV dialect specifics: BOM and line endings.** UTF-8 and RFC 4180-style quoting are confirmed, but UTF-8-with-BOM vs. without, and CRLF vs. LF, were never explicitly settled.

   **Codex recommendation:** Use UTF-8 with BOM, CRLF line endings, and RFC 4180-style quoting. This should maximize compatibility with Excel on Windows while remaining readable by normal CSV tooling.

6. **CSV header-mismatch handling.** No decision on what the extension does if `job-tracking.csv` already exists with a different or outdated header row (validate and block, validate and warn, or ignore and append blindly).

   **Codex recommendation:** Validate the header before appending. If the header does not exactly match the expected first-version schema, block the CSV append and show a clear error such as "CSV columns do not match this extension version." Still allow the JSON listing to be saved. Do not append blindly, because that risks silent data corruption.

7. **Error-state blocking matrix.** The list of possible status/error states is defined (Codex Q26), but which of those states should block Save versus merely warn the user has not been decided.

   **Codex recommendation:** Block Save when there is no URL, no capture time, no configured project folder, denied/lost project folder permission, or the extension cannot write the JSON listing. Warn but allow Save when company, title, salary, applicant count, workplace type, employment type, or optional sections are missing, or when a field is ambiguous. If JSON saves but CSV append fails, report partial success and keep the JSON. If JSON fails, do not write the CSV row because `savedListingPath` would be invalid.

8. **Promotion Text vs. Hiring Status Text disambiguation.** When only one of the two appears, there's no defined rule for identifying which field it belongs to rather than guessing by position.

   **Codex recommendation:** Use phrase classification rather than position alone. Treat phrases containing `Promoted` as `promotionText`. Treat phrases such as `Actively reviewing applicants`, `Responses managed off LinkedIn`, or other reviewing/response/application-handling language as `hiringStatusText`. If a phrase does not match known promotion or status patterns, leave both fields blank and surface the phrase for review rather than guessing.


