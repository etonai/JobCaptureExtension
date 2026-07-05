const DB_NAME = 'job-capture-fs-spike';
const DB_VERSION = 1;
const STORE_NAME = 'handles';
const PROJECT_HANDLE_KEY = 'projectFolder';
const CSV_HEADER = [
  'captureDate',
  'captureTime',
  'company',
  'title',
  'location',
  'workplaceType',
  'employmentType',
  'postedText',
  'applicantCountText',
  'salaryText',
  'applyType',
  'linkedinJobId',
  'url',
  'savedListingPath',
  'notes'
];
const CSV_HEADER_LINE = CSV_HEADER.join(',');
const CSV_BOM = '\uFEFF';

const elements = {
  apiStatus: document.querySelector('#apiStatus'),
  handleStatus: document.querySelector('#handleStatus'),
  permissionStatus: document.querySelector('#permissionStatus'),
  log: document.querySelector('#log'),
  selectFolderButton: document.querySelector('#selectFolderButton'),
  checkPermissionButton: document.querySelector('#checkPermissionButton'),
  requestPermissionButton: document.querySelector('#requestPermissionButton'),
  validateStructureButton: document.querySelector('#validateStructureButton'),
  writeJsonButton: document.querySelector('#writeJsonButton'),
  appendCsvButton: document.querySelector('#appendCsvButton'),
  runAllButton: document.querySelector('#runAllButton'),
  clearLogButton: document.querySelector('#clearLogButton'),
  forgetFolderButton: document.querySelector('#forgetFolderButton')
};

let projectHandle = null;

function timestamp() {
  return new Date().toISOString();
}

function log(message, detail) {
  const suffix = detail === undefined ? '' : `\n${formatDetail(detail)}`;
  elements.log.textContent += `[${timestamp()}] ${message}${suffix}\n`;
  elements.log.scrollTop = elements.log.scrollHeight;
}

function formatDetail(detail) {
  if (detail instanceof Error) {
    return `${detail.name}: ${detail.message}`;
  }
  if (typeof detail === 'string') {
    return detail;
  }
  return JSON.stringify(detail, null, 2);
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet(key) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

async function idbSet(key, value) {
  const db = await openDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

async function idbDelete(key) {
  const db = await openDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

async function loadStoredHandle() {
  projectHandle = await idbGet(PROJECT_HANDLE_KEY);
  updateHandleStatus();
  if (projectHandle) {
    await checkPermission(false);
  }
}

function ensureApiAvailable() {
  if (!('showDirectoryPicker' in window)) {
    throw new Error('window.showDirectoryPicker is not available in this extension context.');
  }
}

function ensureHandle() {
  if (!projectHandle) {
    throw new Error('No project folder handle is stored. Select a project folder first.');
  }
  return projectHandle;
}

function updateApiStatus() {
  elements.apiStatus.textContent = 'showDirectoryPicker' in window ? 'Yes' : 'No';
}

function updateHandleStatus() {
  elements.handleStatus.textContent = projectHandle ? 'Yes' : 'No';
}

async function checkPermission(shouldLog = true) {
  const handle = ensureHandle();
  const permission = await handle.queryPermission({ mode: 'readwrite' });
  elements.permissionStatus.textContent = permission;
  if (shouldLog) {
    log('Permission checked.', { permission });
  }
  return permission;
}

async function requestPermission() {
  const handle = ensureHandle();
  const permission = await handle.requestPermission({ mode: 'readwrite' });
  elements.permissionStatus.textContent = permission;
  log('Permission requested.', { permission });
  return permission;
}

async function ensureWritablePermission() {
  const permission = await checkPermission(false);
  if (permission === 'granted') {
    return;
  }
  const requested = await requestPermission();
  if (requested !== 'granted') {
    throw new Error(`Read/write permission was not granted. Current permission: ${requested}`);
  }
}

async function selectProjectFolder() {
  ensureApiAvailable();
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
  projectHandle = handle;
  await idbSet(PROJECT_HANDLE_KEY, handle);
  updateHandleStatus();
  log('Project folder selected and handle stored.', { name: handle.name });
  await checkPermission();
}

async function getSavedListingsHandle() {
  const handle = ensureHandle();
  await ensureWritablePermission();
  return await handle.getDirectoryHandle('saved-listings', { create: true });
}

async function validateStructure() {
  const savedListings = await getSavedListingsHandle();
  await getCsvHandle(true);
  log('Project structure validated/created.', {
    savedListingsFolder: savedListings.name,
    csvFile: 'job-tracking.csv'
  });
}

async function getCsvHandle(create) {
  const handle = ensureHandle();
  await ensureWritablePermission();
  return await handle.getFileHandle('job-tracking.csv', { create });
}

function localDateParts(date) {
  const yyyy = String(date.getFullYear()).padStart(4, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return {
    date: `${yyyy}-${mm}-${dd}`,
    time: `${hh}:${mi}:${ss}`,
    stamp: `${yyyy}${mm}${dd}-${hh}${mi}${ss}`
  };
}

function sampleRecord() {
  const now = new Date();
  const local = localDateParts(now);
  const filename = `sample-listing-${local.stamp}.json`;
  return {
    schemaVersion: 1,
    captureTimeUtc: now.toISOString(),
    captureDateLocal: local.date,
    captureTimeLocal: local.time,
    sourceWebsite: 'LinkedIn',
    url: 'https://www.linkedin.com/jobs/view/sample-spike',
    linkedinJobId: `sample-${local.stamp}`,
    company: 'Spike Company',
    title: 'File System Access Test',
    location: 'Local Machine',
    workplaceType: 'Remote',
    employmentType: 'Full-time',
    salaryText: '',
    postedText: 'Spike run',
    applicantCountText: '',
    promotionText: '',
    hiringStatusText: '',
    applyType: 'Unknown',
    description: 'Sample JSON written by the DevCycle002 File System Access API spike.',
    posterRequirements: '',
    benefits: '',
    additionalSections: [],
    savedListingPath: `saved-listings/${filename}`,
    notes: ''
  };
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

async function writeSampleJson() {
  const savedListings = await getSavedListingsHandle();
  const record = sampleRecord();
  const filename = record.savedListingPath.split('/').pop();
  const fileHandle = await savedListings.getFileHandle(filename, { create: true });
  const existingFile = await fileHandle.getFile();
  if (existingFile.size > 0) {
    throw new Error(`Refusing to overwrite existing sample JSON file: ${filename}`);
  }
  await writeTextFile(fileHandle, `${JSON.stringify(record, null, 2)}\n`);
  log('Sample JSON listing written.', { path: record.savedListingPath });
  return record;
}

function escapeCsvField(value) {
  const text = value == null ? '' : String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function csvRow(values) {
  return `${values.map(escapeCsvField).join(',')}\r\n`;
}

function recordToCsvValues(record) {
  return [
    record.captureDateLocal,
    record.captureTimeLocal,
    record.company,
    record.title,
    record.location,
    record.workplaceType,
    record.employmentType,
    record.postedText,
    record.applicantCountText,
    record.salaryText,
    record.applyType,
    record.linkedinJobId,
    record.url,
    record.savedListingPath,
    record.notes
  ];
}

function normalizeHeader(text) {
  const firstLine = text.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/)[0] ?? '';
  return firstLine.trimEnd();
}

async function ensureCsvReady(fileHandle) {
  const file = await fileHandle.getFile();
  if (file.size === 0) {
    await writeTextFile(fileHandle, `${CSV_BOM}${CSV_HEADER_LINE}\r\n`);
    return { created: true, headerMatched: true };
  }

  const text = await file.text();
  const actualHeader = normalizeHeader(text);
  if (actualHeader !== CSV_HEADER_LINE) {
    throw new Error(`CSV header mismatch. Expected: ${CSV_HEADER_LINE}. Actual: ${actualHeader}`);
  }
  return { created: false, headerMatched: true };
}

async function appendCsvRow(record) {
  const fileHandle = await getCsvHandle(true);
  const csvState = await ensureCsvReady(fileHandle);
  await appendTextFile(fileHandle, csvRow(recordToCsvValues(record)));
  log('CSV row appended.', {
    file: 'job-tracking.csv',
    created: csvState.created,
    savedListingPath: record.savedListingPath
  });
}

async function appendStandaloneCsvRow() {
  const record = sampleRecord();
  await appendCsvRow(record);
}

async function runAllWriteTests() {
  await validateStructure();
  const record = await writeSampleJson();
  await appendCsvRow(record);
  log('All write tests completed. Reload the extension page and browser to continue persistence checks.');
}

async function forgetFolder() {
  await idbDelete(PROJECT_HANDLE_KEY);
  projectHandle = null;
  elements.permissionStatus.textContent = 'Unknown';
  updateHandleStatus();
  log('Stored project folder handle removed from IndexedDB.');
}

async function runAction(label, action) {
  log(`Starting: ${label}`);
  try {
    await action();
    log(`Succeeded: ${label}`);
  } catch (error) {
    log(`Failed: ${label}`, error);
  }
}

elements.selectFolderButton.addEventListener('click', () => runAction('select project folder', selectProjectFolder));
elements.checkPermissionButton.addEventListener('click', () => runAction('check permission', () => checkPermission(true)));
elements.requestPermissionButton.addEventListener('click', () => runAction('request permission', requestPermission));
elements.validateStructureButton.addEventListener('click', () => runAction('validate/create structure', validateStructure));
elements.writeJsonButton.addEventListener('click', () => runAction('write sample JSON', writeSampleJson));
elements.appendCsvButton.addEventListener('click', () => runAction('append CSV row', appendStandaloneCsvRow));
elements.runAllButton.addEventListener('click', () => runAction('run all write tests', runAllWriteTests));
elements.clearLogButton.addEventListener('click', () => {
  elements.log.textContent = '';
});
elements.forgetFolderButton.addEventListener('click', () => runAction('forget stored handle', forgetFolder));

async function init() {
  updateApiStatus();
  try {
    await loadStoredHandle();
    log('Spike page initialized.');
  } catch (error) {
    log('Initialization failed.', error);
  }
}

init();
