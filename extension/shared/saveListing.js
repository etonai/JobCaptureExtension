import { CSV_HEADER_TEXT, serializeRecordCsvRow, validateCsvHeader } from './csv.js';
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

async function ensureCsvReady(projectHandle, csvFilename = CSV_FILENAME) {
  const csvHandle = await projectHandle.getFileHandle(csvFilename, { create: true });
  const file = await csvHandle.getFile();
  if (file.size === 0) {
    await writeTextFile(csvHandle, CSV_HEADER_TEXT);
    return { csvHandle, created: true };
  }

  const text = await file.text();
  const header = validateCsvHeader(text);
  if (!header.ok) {
    throw new CsvHeaderMismatchError(header);
  }
  return { csvHandle, created: false };
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