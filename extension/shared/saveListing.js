import {
  CSV_HEADER_LINE,
  CSV_HEADER_TEXT,
  LEGACY_SEARCH_CSV_HEADER_LINE,
  parseCsvRows,
  SEARCH_CSV_HEADER_LINE,
  SEARCH_CSV_HEADER_TEXT,
  serializeCsvRow,
  serializeRecordCsvRow,
  serializeSearchTrackingRow,
  validateCsvHeader
} from './csv.js';
import {
  baseListingFilename,
  descriptionMarkdownFilename,
  descriptionTextFilename,
  filenameWithCollisionSuffix,
  savedDescriptionMarkdownPath,
  savedDescriptionTextPath,
  savedListingPath
} from './filename.js';
import { ensureProjectPermission, getStoredProjectFolder } from './projectFolderStore.js';

const SAVED_LISTINGS_FOLDER = 'saved-listings';
const CSV_FILENAME = 'job-tracking.csv';
export const OTHER_LISTINGS_CSV_FILENAME = 'other-listings.csv';
export const SEARCH_TRACKING_CSV_FILENAME = 'search-tracking.csv';
export const SEARCH_TYPE_JOB_SEARCH = 'Open Job Search';
export const SEARCH_TYPE_PREMIUM_JOB_SEARCH = 'Open Premium Job Search';
const SEARCH_TRACKING_INITIAL_POSTS_SEEN = 25;
const SEARCH_TRACKING_LEGACY_POSTS_SEEN = 0;

export class CsvHeaderMismatchError extends Error {
  constructor(result) {
    super(`CSV header mismatch. Expected: ${result.expected}. Actual: ${result.actual || '(empty)'}`);
    this.name = 'CsvHeaderMismatchError';
    this.expected = result.expected;
    this.actual = result.actual;
  }
}

function cloneRecord(record) {
  return JSON.parse(JSON.stringify(record || {}));
}

function assertMinimumRecord(record) {
  if (!record?.url) {
    throw new Error('Cannot save because the captured record is missing a URL.');
  }
  if (!record?.captureTimeUtc || !record?.captureDateLocal || !record?.captureTimeLocal) {
    throw new Error('Cannot save because the captured record is missing its capture timestamp.');
  }
}

async function writeTextFile(fileHandle, text, keepExistingData = false) {
  const writable = await fileHandle.createWritable({ keepExistingData });
  await writable.write(text);
  await writable.close();
}

async function appendTextFile(fileHandle, text) {
  const file = await fileHandle.getFile();
  const writable = await fileHandle.createWritable({ keepExistingData: true });
  await writable.seek(file.size);
  await writable.write(text);
  await writable.close();
}

async function fileExists(directoryHandle, filename) {
  try {
    await directoryHandle.getFileHandle(filename, { create: false });
    return true;
  } catch (error) {
    if (error?.name === 'NotFoundError') {
      return false;
    }
    throw error;
  }
}

export async function reserveListingFilename(savedListingsHandle, record) {
  const baseName = baseListingFilename(record);
  for (let suffix = 1; suffix < 1000; suffix += 1) {
    const filename = filenameWithCollisionSuffix(baseName, suffix);
    const txtFilename = descriptionTextFilename(filename);
    const mdFilename = descriptionMarkdownFilename(filename);
    if (
      !(await fileExists(savedListingsHandle, filename))
      && !(await fileExists(savedListingsHandle, txtFilename))
      && !(await fileExists(savedListingsHandle, mdFilename))
    ) {
      return filename;
    }
  }
  throw new Error('Could not find an available saved listing filename.');
}

async function ensureCsvReady(projectHandle, csvFilename = CSV_FILENAME, headerText = CSV_HEADER_TEXT, headerLine = CSV_HEADER_LINE) {
  const csvHandle = await projectHandle.getFileHandle(csvFilename, { create: true });
  const file = await csvHandle.getFile();
  if (file.size === 0) {
    await writeTextFile(csvHandle, headerText);
    return { csvHandle, created: true };
  }

  const text = await file.text();
  const header = validateCsvHeader(text, headerLine);
  if (!header.ok) {
    throw new CsvHeaderMismatchError(header);
  }
  return { csvHandle, created: false };
}

async function migrateLegacySearchTrackingCsv(csvHandle, text) {
  const dataRows = parseCsvRows(text).slice(1);
  const migratedText = dataRows.reduce(
    (acc, row) => acc + serializeCsvRow([row[0] || '', row[1] || '', String(SEARCH_TRACKING_LEGACY_POSTS_SEEN)]),
    SEARCH_CSV_HEADER_TEXT
  );
  await writeTextFile(csvHandle, migratedText);
}

async function ensureSearchTrackingCsvReady(projectHandle) {
  const csvHandle = await projectHandle.getFileHandle(SEARCH_TRACKING_CSV_FILENAME, { create: true });
  const file = await csvHandle.getFile();
  if (file.size === 0) {
    await writeTextFile(csvHandle, SEARCH_CSV_HEADER_TEXT);
    return { csvHandle, created: true };
  }

  const text = await file.text();
  const header = validateCsvHeader(text, SEARCH_CSV_HEADER_LINE);
  if (header.ok) {
    return { csvHandle, created: false };
  }

  const legacyHeader = validateCsvHeader(text, LEGACY_SEARCH_CSV_HEADER_LINE);
  if (legacyHeader.ok) {
    await migrateLegacySearchTrackingCsv(csvHandle, text);
    return { csvHandle, created: false };
  }

  throw new CsvHeaderMismatchError(header);
}

function formatLocalTimestamp(date) {
  const yyyy = String(date.getFullYear()).padStart(4, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

export async function appendSearchTrackingRow(searchType, now = new Date()) {
  const projectHandle = await getStoredProjectFolder();
  if (!projectHandle) {
    throw new Error('Project folder is not configured. Open Options and choose a project folder before tracking searches.');
  }

  await ensureProjectPermission(projectHandle);

  const csvState = await ensureSearchTrackingCsvReady(projectHandle);
  await appendTextFile(
    csvState.csvHandle,
    serializeSearchTrackingRow({
      timestamp: formatLocalTimestamp(now),
      searchType,
      postsSeen: SEARCH_TRACKING_INITIAL_POSTS_SEEN
    })
  );

  return {
    ok: true,
    csvFile: SEARCH_TRACKING_CSV_FILENAME,
    csvCreated: csvState.created,
    csvAppended: true
  };
}

export async function updateLastSearchTrackingRowPostsSeen(postsSeen) {
  const projectHandle = await getStoredProjectFolder();
  if (!projectHandle) {
    throw new Error('Project folder is not configured. Open Options and choose a project folder before tracking searches.');
  }

  await ensureProjectPermission(projectHandle);

  const csvState = await ensureSearchTrackingCsvReady(projectHandle);
  const file = await csvState.csvHandle.getFile();
  const text = await file.text();
  const dataRows = parseCsvRows(text).slice(1);

  if (dataRows.length === 0) {
    return { ok: true, csvFile: SEARCH_TRACKING_CSV_FILENAME, updated: false };
  }

  dataRows[dataRows.length - 1][2] = String(postsSeen);
  const updatedText = dataRows.reduce(
    (acc, row) => acc + serializeCsvRow([row[0] || '', row[1] || '', row[2] || '']),
    SEARCH_CSV_HEADER_TEXT
  );
  await writeTextFile(csvState.csvHandle, updatedText);

  return { ok: true, csvFile: SEARCH_TRACKING_CSV_FILENAME, updated: true };
}

export async function initializeProjectStructure(projectHandle) {
  await ensureProjectPermission(projectHandle);
  const savedListingsHandle = await projectHandle.getDirectoryHandle(SAVED_LISTINGS_FOLDER, { create: true });
  const csvState = await ensureCsvReady(projectHandle);
  return {
    savedListingsFolder: savedListingsHandle.name,
    csvFile: CSV_FILENAME,
    csvCreated: csvState.created
  };
}

export async function appendCaptureRecordToCsv(record, csvFilename = CSV_FILENAME) {
  const projectHandle = await getStoredProjectFolder();
  if (!projectHandle) {
    throw new Error('Project folder is not configured. Open Options and choose a project folder before saving.');
  }

  await ensureProjectPermission(projectHandle);
  assertMinimumRecord(record);

  const finalRecord = cloneRecord(record);
  const csvState = await ensureCsvReady(projectHandle, csvFilename);
  await appendTextFile(csvState.csvHandle, serializeRecordCsvRow(finalRecord));

  return {
    ok: true,
    csvFile: csvFilename,
    csvCreated: csvState.created,
    csvAppended: true,
    record: finalRecord
  };
}

export async function saveCaptureRecord(record) {
  const projectHandle = await getStoredProjectFolder();
  if (!projectHandle) {
    throw new Error('Project folder is not configured. Open Options and choose a project folder before saving.');
  }

  await ensureProjectPermission(projectHandle);
  assertMinimumRecord(record);

  const savedListingsHandle = await projectHandle.getDirectoryHandle(SAVED_LISTINGS_FOLDER, { create: true });
  const finalRecord = cloneRecord(record);
  const filename = await reserveListingFilename(savedListingsHandle, finalRecord);
  finalRecord.savedListingPath = savedListingPath(filename);

  const txtFilename = descriptionTextFilename(filename);
  const jsonHandle = await savedListingsHandle.getFileHandle(filename, { create: true });
  const existingFile = await jsonHandle.getFile();
  if (existingFile.size > 0) {
    throw new Error(`Refusing to overwrite existing listing: ${filename}`);
  }

  await writeTextFile(jsonHandle, `${JSON.stringify(finalRecord, null, 2)}\n`);

  const mdFilename = descriptionMarkdownFilename(filename);

  try {
    const txtHandle = await savedListingsHandle.getFileHandle(txtFilename, { create: true });
    const existingTxtFile = await txtHandle.getFile();
    if (existingTxtFile.size > 0) {
      throw new Error(`Refusing to overwrite existing description text file: ${txtFilename}`);
    }
    await writeTextFile(txtHandle, finalRecord.description || '');
  } catch (error) {
    return {
      ok: true,
      partial: true,
      savedListingPath: finalRecord.savedListingPath,
      savedDescriptionTextPath: savedDescriptionTextPath(filename),
      savedDescriptionMarkdownPath: savedDescriptionMarkdownPath(filename),
      descriptionTextSaved: false,
      descriptionMarkdownSaved: false,
      csvAppended: false,
      partialMessage: `JSON saved to ${finalRecord.savedListingPath}, but description text save failed: ${error.message || String(error)}`,
      record: finalRecord
    };
  }

  try {
    const mdHandle = await savedListingsHandle.getFileHandle(mdFilename, { create: true });
    const existingMdFile = await mdHandle.getFile();
    if (existingMdFile.size > 0) {
      throw new Error(`Refusing to overwrite existing description Markdown file: ${mdFilename}`);
    }
    await writeTextFile(mdHandle, finalRecord.descriptionMarkdown || finalRecord.description || '');
  } catch (error) {
    return {
      ok: true,
      partial: true,
      savedListingPath: finalRecord.savedListingPath,
      savedDescriptionTextPath: savedDescriptionTextPath(filename),
      savedDescriptionMarkdownPath: savedDescriptionMarkdownPath(filename),
      descriptionTextSaved: true,
      descriptionMarkdownSaved: false,
      csvAppended: false,
      partialMessage: `JSON and description text saved, but description Markdown save failed: ${error.message || String(error)}`,
      record: finalRecord
    };
  }

  try {
    const result = await appendCaptureRecordToCsv(finalRecord, CSV_FILENAME);
    return {
      ok: true,
      partial: false,
      savedListingPath: finalRecord.savedListingPath,
      savedDescriptionTextPath: savedDescriptionTextPath(filename),
      savedDescriptionMarkdownPath: savedDescriptionMarkdownPath(filename),
      descriptionTextSaved: true,
      descriptionMarkdownSaved: true,
      csvAppended: result.csvAppended,
      csvCreated: result.csvCreated,
      record: result.record
    };
  } catch (error) {
    return {
      ok: true,
      partial: true,
      savedListingPath: finalRecord.savedListingPath,
      savedDescriptionTextPath: savedDescriptionTextPath(filename),
      savedDescriptionMarkdownPath: savedDescriptionMarkdownPath(filename),
      descriptionTextSaved: true,
      descriptionMarkdownSaved: true,
      csvAppended: false,
      csvError: error.message || String(error),
      partialMessage: `JSON, description text, and description Markdown saved, but CSV append failed: ${error.message || String(error)}`,
      record: finalRecord
    };
  }
}