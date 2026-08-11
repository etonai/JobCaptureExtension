import {
  CSV_BOM,
  CSV_HEADER_LINE,
  CSV_HEADER_TEXT,
  escapeCsvField,
  findOldTrackingCompany,
  findPriorCompanyCaptures,
  formatUnknownCompanyPlaceholder,
  LEGACY_SEARCH_CSV_HEADER_LINE,
  nextUnknownCompanyNumber,
  normalizeCompanyForMatch,
  parseCsvRows,
  parseOldTrackingCompanies,
  PREVIOUS_SEARCH_CSV_HEADER_LINE,
  recordToCsvValues,
  SEARCH_CSV_HEADER_LINE,
  SEARCH_CSV_HEADER_TEXT,
  serializeCsvRow,
  serializeRecordCsvRow,
  serializeSearchTrackingRow,
  validateCsvHeader
} from '../shared/csv.js';
import {
  baseListingFilename,
  descriptionMarkdownFilename,
  descriptionTextFilename,
  filenameWithCollisionSuffix,
  savedDescriptionMarkdownPath,
  savedDescriptionTextPath,
  savedListingPath,
  slugify
} from '../shared/filename.js';
import { findPriorCompanyInCache } from '../shared/priorCompanyCache.js';
import { ensureProjectReadPermission } from '../shared/projectFolderStore.js';
import {
  appendCaptureRecordToCsv,
  appendSearchTrackingRow,
  getNextUnknownCompanyPlaceholder,
  OTHER_LISTINGS_CSV_FILENAME,
  reserveListingFilename,
  saveCaptureRecord,
  SEARCH_TRACKING_CSV_FILENAME,
  SEARCH_TYPE_JOB_SEARCH,
  SEARCH_TYPE_PREMIUM_JOB_SEARCH,
  updateLastSearchTrackingRow
} from '../shared/saveListing.js';
import {
  DEFAULT_RECENT_POSTINGS_AGE,
  RECENT_POSTINGS_AGE_VALUES,
  getRecentPostingsAgeConfig,
  isValidRecentPostingsAgeValue,
  loadRecentPostingsAgeSetting,
  recentPostingsAgeOptions,
  saveRecentPostingsAgeSetting
} from '../shared/recentPostingsSettings.js';
import {
  advanceRecentPostingsPage,
  recentPostingsRunningTotal,
  recordRecentPostingsScan
} from '../shared/recentPostingsTracking.js';
import {
  DEFAULT_JOB_SEARCH_SETTINGS,
  isJobSearchConfigured,
  loadJobSearchSettings,
  saveJobSearchSettings
} from '../shared/jobSearchSettings.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sampleRecord(overrides = {}) {
  return {
    schemaVersion: 1,
    captureTimeUtc: '2026-07-05T21:00:00.000Z',
    captureDateLocal: '2026-07-05',
    captureTimeLocal: '14:00:00',
    sourceWebsite: 'LinkedIn',
    url: 'https://www.linkedin.com/jobs/view/123456789',
    linkedinJobId: '123456789',
    company: 'Starbucks, Inc.',
    title: 'Software "Engineer" Sr',
    location: 'Seattle, WA',
    workplaceType: 'Hybrid',
    employmentType: 'Full-time',
    salaryText: '$127K/yr - $211K/yr',
    postedText: 'Reposted 3 hours ago',
    applicantCountText: 'Over 100 people clicked apply',
    promotionText: 'Promoted by hirer',
    hiringStatusText: 'Responses managed off LinkedIn',
    applyType: 'External Apply',
    description: 'Line one\\nLine two',
    descriptionMarkdown: 'Line one\\n\\nLine two',
    posterRequirements: '',
    benefits: '',
    additionalSections: [],
    savedListingPath: 'saved-listings/example.json',
    notes: 'First line, with comma\nSecond "quoted" line',
    ...overrides
  };
}

function runCsvTests() {
  assert(CSV_HEADER_TEXT.startsWith(CSV_BOM), 'Expected CSV header text to start with BOM.');
  assert(CSV_HEADER_TEXT.endsWith('\r\n'), 'Expected CSV header text to use CRLF.');
  assert(validateCsvHeader(CSV_HEADER_TEXT).ok, 'Expected BOM header to validate.');
  assert(validateCsvHeader(`${CSV_HEADER_LINE}\r\n`).ok, 'Expected no-BOM header to validate.');
  assert(!validateCsvHeader('wrong,header\r\n').ok, 'Expected wrong header to fail.');
  assert(escapeCsvField('plain') === 'plain', 'Expected plain CSV field unchanged.');
  assert(escapeCsvField('a,b') === '"a,b"', 'Expected comma field to quote.');
  assert(escapeCsvField('a"b') === '"a""b"', 'Expected quote field to escape.');
  assert(escapeCsvField('a\nb') === '"a\nb"', 'Expected newline field to quote.');

  const row = serializeCsvRow(['a,b', 'a"b', 'a\nb']);
  assert(row === '"a,b","a""b","a\nb"\r\n', `Unexpected CSV row: ${row}`);

  const record = sampleRecord();
  const values = recordToCsvValues(record);
  assert(values.length === 15, 'Expected 15 CSV values.');
  const noSalaryValues = recordToCsvValues(sampleRecord({ salaryText: '' }));
  assert(noSalaryValues[9] === '', 'Expected blank salaryText to serialize as a blank salary column.');
  assert(!values.includes(record.description), 'Expected description to be excluded from CSV.');
  const recordRow = serializeRecordCsvRow(record);
  assert(recordRow.includes('"Starbucks, Inc."'), 'Expected company comma to be quoted.');
  assert(recordRow.includes('"Software ""Engineer"" Sr"'), 'Expected title quote to be escaped.');
  assert(recordRow.endsWith('\r\n'), 'Expected serialized record row to use CRLF.');

  const parsedRows = parseCsvRows(`${CSV_HEADER_TEXT}${recordRow}`);
  assert(parsedRows.length === 2, 'Expected CSV parser to read header and one record row.');
  assert(parsedRows[1][2] === 'Starbucks, Inc.', 'Expected CSV parser to preserve company comma.');
  assert(parsedRows[1][14] === record.notes, 'Expected CSV parser to preserve quoted multiline notes.');

  assert(normalizeCompanyForMatch('Starbucks, Inc.') === normalizeCompanyForMatch('starbucks'), 'Expected simple company suffix normalization.');
  const priorCsvText = `${CSV_HEADER_TEXT}${recordRow}${serializeRecordCsvRow(sampleRecord({ captureDateLocal: '2026-07-06', company: 'EasyPost' }))}`;
  const priorSummary = findPriorCompanyCaptures(priorCsvText, 'Starbucks');
  assert(priorSummary.count === 1, `Expected one prior Starbucks match, got ${priorSummary.count}.`);
  const uberCsvText = `${CSV_HEADER_TEXT}${serializeRecordCsvRow(sampleRecord({ company: 'Uber Technologies, Inc.', captureDateLocal: '2026-07-04' }))}`;
  const uberSummary = findPriorCompanyCaptures(uberCsvText, 'Uber');
  assert(uberSummary.count === 1, `Expected Uber to match Uber Technologies, got ${uberSummary.count}.`);
  assert(priorSummary.mostRecentDate === '2026-07-05', `Expected most recent date, got ${priorSummary.mostRecentDate}.`);

  const oldTrackingText = '\uFEFFOpenAI\r\nSNAP\r\nNordstrom \r\nUber Technologies, Inc.\r\n\r\n';
  const oldTrackingCompanies = parseOldTrackingCompanies(oldTrackingText);
  assert(oldTrackingCompanies.length === 4, `Expected four old-tracking companies, got ${oldTrackingCompanies.length}.`);
  assert(oldTrackingCompanies[2] === 'Nordstrom', 'Expected old-tracking parser to trim whitespace.');
  const oldTrackingSummary = findOldTrackingCompany(oldTrackingText, 'Uber');
  assert(oldTrackingSummary.count === 1, `Expected Uber to match old-tracking company, got ${oldTrackingSummary.count}.`);
  assert(findOldTrackingCompany(oldTrackingText, 'Snap').count === 1, 'Expected old-tracking matching to be case-insensitive.');
  assert(findOldTrackingCompany(oldTrackingText, 'Unknown').count === 0, 'Expected unknown old-tracking company not to match.');

  assert(nextUnknownCompanyNumber('') === 1, 'Expected next unknown-company number to be 1 for empty CSV text.');
  assert(nextUnknownCompanyNumber(CSV_HEADER_TEXT) === 1, 'Expected next unknown-company number to be 1 for a header-only CSV.');
  const placeholderCsvText = CSV_HEADER_TEXT
    + serializeRecordCsvRow(sampleRecord({ company: '001U_UNKNOWN', captureDateLocal: '2026-07-01' }))
    + serializeRecordCsvRow(sampleRecord({ company: '003U_UNKNOWN', captureDateLocal: '2026-07-02' }))
    + serializeRecordCsvRow(sampleRecord({ company: '002U_Acme', captureDateLocal: '2026-07-03' }))
    + serializeRecordCsvRow(sampleRecord({ company: '500U Logistics', captureDateLocal: '2026-07-04' }))
    + serializeRecordCsvRow(sampleRecord({ company: '12U_UNKNOWN', captureDateLocal: '2026-07-05' }))
    + serializeRecordCsvRow(sampleRecord({ company: '1234U_UNKNOWN', captureDateLocal: '2026-07-06' }));
  assert(
    nextUnknownCompanyNumber(placeholderCsvText) === 4,
    `Expected next unknown-company number to be 4 (past 003U_, counting the renamed 002U_Acme row, ignoring non-3-digit near-misses), got ${nextUnknownCompanyNumber(placeholderCsvText)}.`
  );
  assert(formatUnknownCompanyPlaceholder(9) === '009U_UNKNOWN', 'Expected single-digit placeholder numbers to be zero-padded to 3 digits.');
  assert(formatUnknownCompanyPlaceholder(142) === '142U_UNKNOWN', 'Expected 3-digit placeholder numbers to pass through unpadded.');
}

function runFilenameTests() {
  assert(slugify('Starbucks, Inc.') === 'starbucks-inc', 'Expected punctuation-safe company slug.');
  assert(slugify('CON', 'fallback') === 'fallback', 'Expected reserved Windows name fallback.');
  assert(slugify('  ***  ', 'fallback') === 'fallback', 'Expected blank slug fallback.');

  const filename = baseListingFilename(sampleRecord());
  assert(filename === 'starbucks-inc_2026-07-05_software-engineer-sr_123456789.json', `Unexpected filename: ${filename}`);
  assert(filenameWithCollisionSuffix(filename, 2).endsWith('-2.json'), 'Expected collision suffix.');
  assert(savedListingPath(filename) === `saved-listings/${filename}`, 'Expected project-relative saved listing path.');
  assert(descriptionTextFilename(filename) === 'starbucks-inc_2026-07-05_software-engineer-sr_123456789.txt', 'Expected description text filename to replace json extension.');
  assert(descriptionMarkdownFilename(filename) === 'starbucks-inc_2026-07-05_software-engineer-sr_123456789.md', 'Expected description Markdown filename to replace json extension.');
  assert(savedDescriptionTextPath(filename) === 'saved-listings/starbucks-inc_2026-07-05_software-engineer-sr_123456789.txt', 'Expected saved description text path.');
  assert(savedDescriptionMarkdownPath(filename) === 'saved-listings/starbucks-inc_2026-07-05_software-engineer-sr_123456789.md', 'Expected saved description Markdown path.');

  const noJobId = baseListingFilename(sampleRecord({ linkedinJobId: '' }));
  assert(/starbucks-inc_2026-07-05_software-engineer-sr_20260705210000\.json/.test(noJobId), `Unexpected fallback id filename: ${noJobId}`);
}

function fakeDirectory(existingNames = []) {
  const existing = new Set(existingNames);
  return {
    async getFileHandle(name, options = {}) {
      if (!existing.has(name) && !options.create) {
        const error = new Error('Not found');
        error.name = 'NotFoundError';
        throw error;
      }
      existing.add(name);
      return { name };
    }
  };
}


function fakeWritableFile(initialText = '') {
  let text = initialText;
  let position = 0;
  return {
    get size() {
      return text.length;
    },
    async text() {
      return text;
    },
    handle: {
      async getFile() {
        return {
          get size() {
            return text.length;
          },
          async text() {
            return text;
          }
        };
      },
      async createWritable({ keepExistingData = false } = {}) {
        position = 0;
        if (!keepExistingData) {
          text = '';
        }
        return {
          async write(value) {
            const valueText = String(value);
            text = text.slice(0, position) + valueText + text.slice(position + valueText.length);
            position += valueText.length;
          },
          async seek(offset) {
            position = offset;
          },
          async close() {}
        };
      }
    }
  };
}

function fakeProjectHandle() {
  const rootFiles = new Map();
  const savedListingFiles = new Map();
  const savedListings = {
    name: 'saved-listings',
    files: savedListingFiles,
    async getFileHandle(name, options = {}) {
      if (!savedListingFiles.has(name)) {
        if (!options.create) {
          const error = new Error('Not found');
          error.name = 'NotFoundError';
          throw error;
        }
        savedListingFiles.set(name, fakeWritableFile());
      }
      return savedListingFiles.get(name).handle;
    }
  };

  return {
    savedListings,
    rootFiles,
    async queryPermission() {
      return 'granted';
    },
    async requestPermission() {
      return 'granted';
    },
    async getDirectoryHandle(name, options = {}) {
      if (name === 'saved-listings' && options.create) {
        return savedListings;
      }
      throw new Error(`Unexpected directory: ${name}`);
    },
    async getFileHandle(name, options = {}) {
      if (!rootFiles.has(name)) {
        if (!options.create) {
          const error = new Error('Not found');
          error.name = 'NotFoundError';
          throw error;
        }
        rootFiles.set(name, fakeWritableFile());
      }
      return rootFiles.get(name).handle;
    }
  };
}

function setStoredProjectHandle(projectHandle) {
  globalThis.indexedDB = {
    open() {
      const request = {};
      queueMicrotask(() => {
        request.result = {
          close() {},
          objectStoreNames: { contains: () => true },
          transaction() {
            return {
              objectStore() {
                return {
                  get(key) {
                    const getRequest = {};
                    queueMicrotask(() => {
                      getRequest.result = key === 'projectFolder' ? projectHandle : null;
                      getRequest.onsuccess?.();
                    });
                    return getRequest;
                  }
                };
              }
            };
          }
        };
        request.onsuccess?.();
      });
      return request;
    }
  };
}

async function runSaveCaptureRecordTest() {
  const projectHandle = fakeProjectHandle();
  setStoredProjectHandle(projectHandle);

  const result = await saveCaptureRecord(sampleRecord());
  const jsonName = 'starbucks-inc_2026-07-05_software-engineer-sr_123456789.json';
  const txtName = 'starbucks-inc_2026-07-05_software-engineer-sr_123456789.txt';
  const mdName = 'starbucks-inc_2026-07-05_software-engineer-sr_123456789.md';

  assert(result.ok === true && result.partial === false, `Expected full save success, got ${JSON.stringify(result)}`);
  assert(result.csvAppended === true, 'Expected CSV append to succeed after sibling file writes.');
  assert(projectHandle.savedListings.files.has(jsonName), 'Expected JSON file to be written.');
  assert(projectHandle.savedListings.files.has(txtName), 'Expected TXT file to be written.');
  assert(projectHandle.savedListings.files.has(mdName), 'Expected MD file to be written.');
  assert(await projectHandle.savedListings.files.get(txtName).text() === sampleRecord().description, 'Expected TXT file to contain plain description.');
  assert(await projectHandle.savedListings.files.get(mdName).text() === sampleRecord().descriptionMarkdown, 'Expected MD file to contain Markdown description.');
  const csvText = await projectHandle.rootFiles.get('job-tracking.csv').text();
  assert(csvText.includes('Starbucks, Inc.'), 'Expected CSV file to include saved record row.');
  assert(csvText.includes('"First line, with comma\nSecond ""quoted"" line"'), 'Expected CSV file to quote and escape notes.');
}

async function runAppendCaptureRecordToCsvTest() {
  const projectHandle = fakeProjectHandle();
  setStoredProjectHandle(projectHandle);

  const result = await appendCaptureRecordToCsv(sampleRecord({ savedListingPath: '' }), OTHER_LISTINGS_CSV_FILENAME);

  assert(result.ok === true, 'Expected CSV-only record append to succeed.');
  assert(result.csvFile === OTHER_LISTINGS_CSV_FILENAME, `Expected ${OTHER_LISTINGS_CSV_FILENAME}, got ${result.csvFile}.`);
  assert(result.csvAppended === true, 'Expected CSV-only record append result to indicate append success.');
  assert(projectHandle.rootFiles.has(OTHER_LISTINGS_CSV_FILENAME), 'Expected other-listings.csv to be written at the project root.');
  assert(!projectHandle.rootFiles.has('job-tracking.csv'), 'Expected CSV-only append not to write job-tracking.csv.');
  assert(projectHandle.savedListings.files.size === 0, 'Expected CSV-only append not to write saved listing files.');

  const csvText = await projectHandle.rootFiles.get(OTHER_LISTINGS_CSV_FILENAME).text();
  assert(csvText.startsWith(CSV_HEADER_TEXT), 'Expected other-listings.csv to start with the standard CSV header.');
  assert(csvText.includes('Starbucks, Inc.'), 'Expected other-listings.csv to include the captured record row.');
}

async function runGetNextUnknownCompanyPlaceholderTest() {
  const projectHandle = fakeProjectHandle();
  setStoredProjectHandle(projectHandle);

  const firstPlaceholder = await getNextUnknownCompanyPlaceholder();
  assert(firstPlaceholder === '001U_UNKNOWN', `Expected first placeholder to be 001U_UNKNOWN with no job-tracking.csv yet, got ${firstPlaceholder}.`);

  const seededCsvText = CSV_HEADER_TEXT
    + serializeRecordCsvRow(sampleRecord({ company: '001U_UNKNOWN', captureDateLocal: '2026-07-01' }))
    + serializeRecordCsvRow(sampleRecord({ company: '004U_Acme', captureDateLocal: '2026-07-02' }));
  projectHandle.rootFiles.set('job-tracking.csv', fakeWritableFile(seededCsvText));

  const nextPlaceholder = await getNextUnknownCompanyPlaceholder();
  assert(nextPlaceholder === '005U_UNKNOWN', `Expected placeholder to continue past a renamed 004U_ row, got ${nextPlaceholder}.`);

  // DevCycle030's DIRECT/UNKNOWN record shape must round-trip through the
  // ordinary save pipeline with no special-casing.
  const directRecord = sampleRecord({
    sourceWebsite: 'Generic',
    company: nextPlaceholder,
    applyType: 'DIRECT',
    linkedinJobId: 'UNKNOWN',
    workplaceType: 'UNKNOWN',
    postedText: 'UNKNOWN',
    applicantCountText: 'UNKNOWN'
  });
  const saveResult = await saveCaptureRecord(directRecord);
  assert(saveResult.ok === true && saveResult.partial === false, `Expected a DIRECT/UNKNOWN record to save cleanly, got ${JSON.stringify(saveResult)}.`);
  assert(saveResult.savedListingPath.startsWith('saved-listings/005u-unknown_'), `Expected the saved filename to start with the company placeholder, got ${saveResult.savedListingPath}.`);
  const savedCsvText = await projectHandle.rootFiles.get('job-tracking.csv').text();
  assert(savedCsvText.includes('005U_UNKNOWN') && savedCsvText.includes('DIRECT') && savedCsvText.includes('UNKNOWN'), 'Expected job-tracking.csv to record the placeholder company and DIRECT/UNKNOWN fields.');
}

async function runAppendSearchTrackingRowTest() {
  const projectHandle = fakeProjectHandle();
  setStoredProjectHandle(projectHandle);

  const row = serializeSearchTrackingRow({ timestamp: '2026-07-27 09:15:00', searchType: SEARCH_TYPE_JOB_SEARCH, postsSeen: 25, recentPostings: 0, freshness: '2 hours or less' });
  assert(row === '2026-07-27 09:15:00,Open Job Search,25,0,2 hours or less\r\n', `Unexpected search-tracking row: ${row}`);

  const firstResult = await appendSearchTrackingRow(SEARCH_TYPE_JOB_SEARCH, new Date(2026, 6, 27, 9, 15, 0));
  assert(firstResult.ok === true, 'Expected first search-tracking append to succeed.');
  assert(firstResult.csvFile === SEARCH_TRACKING_CSV_FILENAME, `Expected ${SEARCH_TRACKING_CSV_FILENAME}, got ${firstResult.csvFile}.`);
  assert(firstResult.csvCreated === true, 'Expected first append to create search-tracking.csv.');

  const secondResult = await appendSearchTrackingRow(SEARCH_TYPE_PREMIUM_JOB_SEARCH, new Date(2026, 6, 27, 9, 16, 30));
  assert(secondResult.csvCreated === false, 'Expected second append to reuse the existing search-tracking.csv.');

  const csvText = await projectHandle.rootFiles.get(SEARCH_TRACKING_CSV_FILENAME).text();
  assert(csvText.startsWith(SEARCH_CSV_HEADER_TEXT), 'Expected search-tracking.csv to start with the search-tracking header.');
  assert(csvText.includes('2026-07-27 09:15:00,Open Job Search,25'), 'Expected search-tracking.csv to record the Open Job Search press with postsSeen 25.');
  assert(csvText.includes('2026-07-27 09:16:30,Open Premium Job Search,25'), 'Expected search-tracking.csv to record the Open Premium Job Search press with postsSeen 25.');
  assert(!projectHandle.rootFiles.has('job-tracking.csv'), 'Expected search tracking not to write job-tracking.csv.');
}

async function runUpdateLastSearchTrackingRowPostsSeenTest() {
  const projectHandle = fakeProjectHandle();
  setStoredProjectHandle(projectHandle);

  await appendSearchTrackingRow(SEARCH_TYPE_JOB_SEARCH, new Date(2026, 6, 27, 9, 15, 0));
  await appendSearchTrackingRow(SEARCH_TYPE_PREMIUM_JOB_SEARCH, new Date(2026, 6, 27, 9, 20, 0));

  globalThis.chrome = { storage: { local: fakeChromeStorageLocal() } };
  await saveRecentPostingsAgeSetting(RECENT_POSTINGS_AGE_VALUES.ONE_HOUR_OR_LESS);
  const updateResult = await updateLastSearchTrackingRow({ postsSeen: 50, recentPostings: 7 });
  assert(updateResult.ok === true && updateResult.updated === true, `Expected Posts Seen update to succeed, got ${JSON.stringify(updateResult)}.`);

  const csvText = await projectHandle.rootFiles.get(SEARCH_TRACKING_CSV_FILENAME).text();
  const rows = csvText.trim().split('\r\n');
  assert(rows.length === 3, `Expected header plus two data rows, got ${rows.length}.`);
  assert(rows[1].includes(',25,0,2 hours or less'), `Expected first row's postsSeen to remain 25, got: ${rows[1]}`);
  assert(rows[2].includes(',50,7,1 hour or less'), `Expected last row's postsSeen to be updated to 50, got: ${rows[2]}`);
  delete globalThis.chrome;
}

async function runUpdateLastSearchTrackingRowSkipsWithoutPromptTest() {
  const projectHandle = fakeProjectHandle();
  setStoredProjectHandle(projectHandle);

  globalThis.chrome = { storage: { local: fakeChromeStorageLocal() } };
  await appendSearchTrackingRow(SEARCH_TYPE_JOB_SEARCH, new Date(2026, 6, 27, 9, 15, 0));

  let permission = 'prompt';
  let requestPermissionCalls = 0;
  projectHandle.queryPermission = async () => permission;
  projectHandle.requestPermission = async () => {
    requestPermissionCalls += 1;
    throw new Error('requestPermission must not be called from a non-user-gesture update.');
  };

  const skippedResult = await updateLastSearchTrackingRow({ recentPostings: 9 });
  assert(skippedResult.ok === false && skippedResult.skipped === true, `Expected update to be skipped without granted permission, got ${JSON.stringify(skippedResult)}.`);
  assert(requestPermissionCalls === 0, 'Expected requestPermission to never be called from updateLastSearchTrackingRow.');

  const unchangedCsvText = await projectHandle.rootFiles.get(SEARCH_TRACKING_CSV_FILENAME).text();
  assert(unchangedCsvText.includes(',25,0,2 hours or less'), 'Expected the row to remain unchanged when the update is skipped.');

  permission = 'granted';
  const updatedResult = await updateLastSearchTrackingRow({ recentPostings: 9 });
  assert(updatedResult.ok === true && updatedResult.updated === true, `Expected update to succeed once permission is granted, got ${JSON.stringify(updatedResult)}.`);
  assert(requestPermissionCalls === 0, 'Expected requestPermission still never to be called even once granted.');

  const updatedCsvText = await projectHandle.rootFiles.get(SEARCH_TRACKING_CSV_FILENAME).text();
  assert(updatedCsvText.includes(',25,9,2 hours or less'), 'Expected the row to update once permission is already granted.');

  delete globalThis.chrome;
}

async function runSearchTrackingLegacyMigrationTest() {
  const projectHandle = fakeProjectHandle();
  setStoredProjectHandle(projectHandle);

  const legacyText = `${CSV_BOM}${LEGACY_SEARCH_CSV_HEADER_LINE}\r\n2026-07-27 09:15:00,Open Job Search\r\n2026-07-27 09:16:30,Open Premium Job Search\r\n`;
  projectHandle.rootFiles.set(SEARCH_TRACKING_CSV_FILENAME, fakeWritableFile(legacyText));

  const result = await appendSearchTrackingRow(SEARCH_TYPE_JOB_SEARCH, new Date(2026, 6, 27, 9, 30, 0));
  assert(result.csvCreated === false, 'Expected legacy migration to reuse the existing file rather than report creation.');

  const csvText = await projectHandle.rootFiles.get(SEARCH_TRACKING_CSV_FILENAME).text();
  assert(validateCsvHeader(csvText, SEARCH_CSV_HEADER_LINE).ok, 'Expected migrated file to start with the new 5-column header.');
  assert(csvText.includes('2026-07-27 09:15:00,Open Job Search,0,0,Unknown'), 'Expected legacy row to be backfilled with default tracking values.');
  assert(csvText.includes('2026-07-27 09:16:30,Open Premium Job Search,0,0,Unknown'), 'Expected legacy row to be backfilled with default tracking values.');
  assert(csvText.includes('2026-07-27 09:30:00,Open Job Search,25,0,2 hours or less'), 'Expected newly appended row to have default recent-postings values.');
}

async function runSearchTrackingPreviousSchemaMigrationTest() {
  const projectHandle = fakeProjectHandle();
  setStoredProjectHandle(projectHandle);

  const previousText = CSV_BOM + PREVIOUS_SEARCH_CSV_HEADER_LINE + '\r\n2026-07-27 09:15:00,Open Job Search,75\r\n';
  projectHandle.rootFiles.set(SEARCH_TRACKING_CSV_FILENAME, fakeWritableFile(previousText));

  await updateLastSearchTrackingRow({ recentPostings: 4 });
  const csvText = await projectHandle.rootFiles.get(SEARCH_TRACKING_CSV_FILENAME).text();
  assert(validateCsvHeader(csvText, SEARCH_CSV_HEADER_LINE).ok, 'Expected the 3-column schema to migrate to 5 columns.');
  assert(csvText.includes('2026-07-27 09:15:00,Open Job Search,75,4,2 hours or less'), 'Expected migration to preserve postsSeen and apply the update.');
}

function runRecentPostingsTrackingTests() {
  let state = recordRecentPostingsScan(null, 0, 2);
  assert(recentPostingsRunningTotal(state) === 2, 'Expected first-page scan total of 2.');

  state = recordRecentPostingsScan(state, 0, 3);
  assert(recentPostingsRunningTotal(state) === 3, 'Expected same-page refresh to replace, not add, its count.');

  state = advanceRecentPostingsPage(state, 25);
  assert(state.previousPagesTotal === 3 && state.currentPageTotal === 0, 'Expected Next Page to commit and reset the current page.');

  state = recordRecentPostingsScan(state, 25, 4);
  assert(recentPostingsRunningTotal(state) === 7, 'Expected second-page scan to add to committed pages.');

  state = recordRecentPostingsScan(state, 25, 0);
  assert(recentPostingsRunningTotal(state) === 3, 'Expected a zero-result rescan to replace the current-page count.');

  state = recordRecentPostingsScan(state, 50, 5);
  assert(recentPostingsRunningTotal(state) === 8, 'Expected direct page navigation to commit the prior page before scanning.');
}
async function runReservationTests() {
  const record = sampleRecord();
  const base = baseListingFilename(record);
  const filename = await reserveListingFilename(fakeDirectory([base, descriptionTextFilename(base), descriptionMarkdownFilename(base), filenameWithCollisionSuffix(base, 2)]), record);
  assert(filename === filenameWithCollisionSuffix(base, 3), `Expected third filename candidate, got ${filename}`);
}

function runPriorCompanyCacheTests() {
  const cache = {
    oldTrackingText: 'OpenAI\nStarbucks\nNordstrom\n',
    csvText: `${CSV_HEADER_TEXT}${serializeRecordCsvRow(sampleRecord({ company: 'EasyPost', captureDateLocal: '2026-07-08' }))}${serializeRecordCsvRow(sampleRecord({ company: 'Nordstrom', captureDateLocal: '2026-07-10' }))}`,
    refreshedAt: '2026-07-13T12:00:00.000Z'
  };

  const oldTrackingWarning = findPriorCompanyInCache(cache, sampleRecord({ company: 'Starbucks, Inc.' }));
  assert(oldTrackingWarning?.source === 'old-tracking', 'Expected old-tracking match when the company is only in old-tracking.txt.');
  assert(oldTrackingWarning.count === 1, 'Expected cached old-tracking match count.');

  const csvWarning = findPriorCompanyInCache(cache, sampleRecord({ company: 'EasyPost' }));
  assert(csvWarning?.source === 'csv', 'Expected cached CSV match.');
  assert(csvWarning.mostRecentDate === '2026-07-08', 'Expected cached CSV most recent date.');

  const bothSourcesWarning = findPriorCompanyInCache(cache, sampleRecord({ company: 'Nordstrom' }));
  assert(bothSourcesWarning?.source === 'csv', 'Expected job-tracking.csv match to be preferred over old-tracking.txt when both match.');
  assert(bothSourcesWarning.mostRecentDate === '2026-07-10', 'Expected the CSV most recent date, not the old-tracking summary, when both sources match.');

  const missingWarning = findPriorCompanyInCache(cache, sampleRecord({ company: 'Unknown Company' }));
  assert(missingWarning === null, 'Expected no cached warning for unknown company.');
}
async function runProjectPermissionTests() {
  const modes = [];
  const promptHandle = {
    async queryPermission(options) {
      modes.push(`query:${options.mode}`);
      return 'prompt';
    },
    async requestPermission(options) {
      modes.push(`request:${options.mode}`);
      return 'granted';
    }
  };

  const result = await ensureProjectReadPermission(promptHandle);
  assert(result === 'granted', `Expected read permission to be granted, got ${result}.`);
  assert(modes.join('|') === 'query:read|request:read', `Expected read-only permission flow, got ${modes.join('|')}.`);
}

function fakeChromeStorageLocal() {
  const store = new Map();
  return {
    async get(key) {
      return { [key]: store.has(key) ? store.get(key) : undefined };
    },
    async set(values) {
      for (const [key, value] of Object.entries(values)) {
        store.set(key, value);
      }
    }
  };
}

async function runRecentPostingsSettingsTests() {
  assert(isValidRecentPostingsAgeValue(RECENT_POSTINGS_AGE_VALUES.TWO_HOURS_OR_LESS), 'Expected two-hours value to be valid.');
  assert(isValidRecentPostingsAgeValue(RECENT_POSTINGS_AGE_VALUES.ONE_HOUR_OR_LESS), 'Expected one-hour value to be valid.');
  assert(isValidRecentPostingsAgeValue(RECENT_POSTINGS_AGE_VALUES.LESS_THAN_ONE_HOUR), 'Expected less-than-one-hour value to be valid.');
  assert(!isValidRecentPostingsAgeValue('unknownValue'), 'Expected unrecognized value to be invalid.');
  assert(recentPostingsAgeOptions().length === 3, 'Expected exactly three Recent Postings age options.');

  const twoHours = getRecentPostingsAgeConfig(RECENT_POSTINGS_AGE_VALUES.TWO_HOURS_OR_LESS);
  assert(twoHours.maxAgeMinutes === 120 && twoHours.inclusive === true, 'Expected 2-hours-or-less to be 120 minutes inclusive.');
  const oneHour = getRecentPostingsAgeConfig(RECENT_POSTINGS_AGE_VALUES.ONE_HOUR_OR_LESS);
  assert(oneHour.maxAgeMinutes === 60 && oneHour.inclusive === true, 'Expected 1-hour-or-less to be 60 minutes inclusive.');
  const lessThanOneHour = getRecentPostingsAgeConfig(RECENT_POSTINGS_AGE_VALUES.LESS_THAN_ONE_HOUR);
  assert(lessThanOneHour.maxAgeMinutes === 60 && lessThanOneHour.inclusive === false, 'Expected less-than-1-hour to be 60 minutes exclusive.');
  assert(getRecentPostingsAgeConfig('unknownValue').value === DEFAULT_RECENT_POSTINGS_AGE, 'Expected unrecognized config lookup to default to 2-hours-or-less.');

  delete globalThis.chrome;
  const defaultedValue = await loadRecentPostingsAgeSetting();
  assert(defaultedValue === DEFAULT_RECENT_POSTINGS_AGE, `Expected default when chrome.storage is unavailable, got ${defaultedValue}.`);

  globalThis.chrome = { storage: { local: fakeChromeStorageLocal() } };
  const initialValue = await loadRecentPostingsAgeSetting();
  assert(initialValue === DEFAULT_RECENT_POSTINGS_AGE, `Expected default with no saved value, got ${initialValue}.`);

  const saved = await saveRecentPostingsAgeSetting(RECENT_POSTINGS_AGE_VALUES.LESS_THAN_ONE_HOUR);
  assert(saved === RECENT_POSTINGS_AGE_VALUES.LESS_THAN_ONE_HOUR, 'Expected save to return the validated value.');
  const persistedValue = await loadRecentPostingsAgeSetting();
  assert(persistedValue === RECENT_POSTINGS_AGE_VALUES.LESS_THAN_ONE_HOUR, `Expected persisted value to be restored, got ${persistedValue}.`);

  const invalidSaved = await saveRecentPostingsAgeSetting('unknownValue');
  assert(invalidSaved === DEFAULT_RECENT_POSTINGS_AGE, 'Expected an invalid saved value to fall back to the default.');
  const afterInvalidSave = await loadRecentPostingsAgeSetting();
  assert(afterInvalidSave === DEFAULT_RECENT_POSTINGS_AGE, 'Expected an invalid saved value to persist as the default.');

  delete globalThis.chrome;
}

async function runJobSearchSettingsTests() {
  assert(isJobSearchConfigured(DEFAULT_JOB_SEARCH_SETTINGS) === true, 'Expected default job search settings to be configured.');
  assert(isJobSearchConfigured({ keywords: '', geoId: '90000091' }) === false, 'Expected blank keywords to be unconfigured.');
  assert(isJobSearchConfigured({ keywords: 'Engineer', geoId: '  ' }) === false, 'Expected blank geoId to be unconfigured.');

  delete globalThis.chrome;
  const defaultedSettings = await loadJobSearchSettings();
  assert(
    defaultedSettings.keywords === DEFAULT_JOB_SEARCH_SETTINGS.keywords &&
      defaultedSettings.geoId === DEFAULT_JOB_SEARCH_SETTINGS.geoId &&
      defaultedSettings.timeframeSeconds === DEFAULT_JOB_SEARCH_SETTINGS.timeframeSeconds,
    `Expected defaults when chrome.storage is unavailable, got ${JSON.stringify(defaultedSettings)}.`
  );

  globalThis.chrome = { storage: { local: fakeChromeStorageLocal() } };
  const initialSettings = await loadJobSearchSettings();
  assert(initialSettings.keywords === DEFAULT_JOB_SEARCH_SETTINGS.keywords, 'Expected default keywords with no saved value.');

  const saved = await saveJobSearchSettings({ keywords: '  Backend Engineer  ', geoId: '12345', timeframeSeconds: 7200 });
  assert(saved.keywords === 'Backend Engineer', `Expected trimmed keywords, got "${saved.keywords}".`);
  assert(saved.geoId === '12345', `Expected verbatim geoId, got "${saved.geoId}".`);
  assert(saved.timeframeSeconds === 7200, `Expected saved timeframe, got ${saved.timeframeSeconds}.`);

  const persisted = await loadJobSearchSettings();
  assert(persisted.keywords === 'Backend Engineer', 'Expected persisted keywords to be restored.');
  assert(persisted.geoId === '12345', 'Expected persisted geoId to be restored.');

  const blankSaved = await saveJobSearchSettings({ keywords: '   ', geoId: '12345', timeframeSeconds: 86400 });
  assert(isJobSearchConfigured(blankSaved) === false, 'Expected blank keywords to persist as unconfigured rather than falling back to defaults.');

  delete globalThis.chrome;
}

runCsvTests();
runFilenameTests();
runPriorCompanyCacheTests();
await runReservationTests();
await runProjectPermissionTests();
await runSaveCaptureRecordTest();
await runAppendCaptureRecordToCsvTest();
await runGetNextUnknownCompanyPlaceholderTest();
await runAppendSearchTrackingRowTest();
await runUpdateLastSearchTrackingRowPostsSeenTest();
await runUpdateLastSearchTrackingRowSkipsWithoutPromptTest();
await runSearchTrackingLegacyMigrationTest();
await runSearchTrackingPreviousSchemaMigrationTest();
runRecentPostingsTrackingTests();
await runRecentPostingsSettingsTests();
await runJobSearchSettingsTests();

console.log('persistence helper tests passed');
