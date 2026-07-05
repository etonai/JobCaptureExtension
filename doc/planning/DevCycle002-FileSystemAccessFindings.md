# DevCycle002 File System Access Findings

**Status:** Work Complete
**Spike Harness:** `spikes/dc002-filesystem-access/extension/`
**Created:** 2026-07-05
**Manual Verification:** Passed, user-reported on 2026-07-05

---

## Purpose

This document records the results of the DevCycle002 File System Access API behavior spike.

The spike harness was implemented and manually verified in Microsoft Edge by the user. All planned tests passed.

## Test Matrix

| Test | Result | Notes |
| --- | --- | --- |
| `showDirectoryPicker` available in extension options page | Passed | User-reported manual Edge verification. |
| User can select project folder with read/write mode | Passed | User-reported manual Edge verification. |
| Directory handle can be stored in IndexedDB | Passed | User-reported manual Edge verification. |
| Directory handle can be restored after options page reload | Passed | User-reported manual Edge verification. |
| Directory handle can be restored or re-checked after extension reload | Passed | User-reported manual Edge verification. |
| Directory handle can be restored or re-checked after Edge restart | Passed | User-reported manual Edge verification. |
| `queryPermission({ mode: "readwrite" })` works | Passed | User-reported manual Edge verification. |
| `requestPermission({ mode: "readwrite" })` works after permission is missing | Passed | User-reported manual Edge verification. |
| `saved-listings/` can be created | Passed | User-reported manual Edge verification. |
| `job-tracking.csv` can be created | Passed | User-reported manual Edge verification. |
| Sample JSON can be written into `saved-listings/` | Passed | User-reported manual Edge verification. |
| Sample CSV row can be appended | Passed | User-reported manual Edge verification. |
| UTF-8 BOM + CRLF CSV output is produced for new CSV files | Passed | User-reported manual Edge verification. |
| Existing CSV with expected header can be appended | Passed | User-reported manual Edge verification. |
| Existing CSV with mismatched header blocks append | Passed | User-reported manual Edge verification. |
| Existing JSON filename is not overwritten | Passed | User-reported manual Edge verification. |
| User-cancelled folder selection behavior documented | Passed | User-reported manual Edge verification. |
| Permission-denied behavior documented | Passed | User-reported manual Edge verification. |
| Permission-lost/re-grant behavior documented | Passed | User-reported manual Edge verification. |
| Unsupported API behavior documented | Passed | User-reported manual Edge verification. |

## Implementation Notes

The spike extension provides:

- an options page for manual testing
- IndexedDB persistence for the selected directory handle
- lazy permission checking before writes
- explicit permission request button
- project structure validation/creation
- sample JSON write
- CSV header creation and validation
- CSV append using the first-version schema from `ExtensionDesign.md`
- diagnostics log in the UI
- JavaScript syntax check passed with `node --check spikes/dc002-filesystem-access/extension/options.js`

## Recommendation

File System Access API remains the recommended implementation path for the local project folder workflow.

Recommended storage and permission flow:

1. Configure the project folder from an extension page or options page using `showDirectoryPicker({ mode: "readwrite" })`.
2. Persist the returned `FileSystemDirectoryHandle` in IndexedDB.
3. Before Save, call `queryPermission({ mode: "readwrite" })`.
4. If permission is not granted, call `requestPermission({ mode: "readwrite" })` from a user-triggered action.
5. If permission is granted, create or validate `saved-listings/` and `job-tracking.csv`.
6. Write the JSON listing first.
7. Append the CSV row only after the JSON listing succeeds.
8. If CSV append fails after JSON succeeds, report partial success and keep the JSON.

## Final Decision

- **Viable:** yes
- **Minimum Edge version tested:** not recorded
- **Recommended permission re-grant flow:** lazy check before Save; request permission only when missing or revoked
- **Fallback required:** no

## Manual Test Instructions

See `spikes/dc002-filesystem-access/README.md`.
