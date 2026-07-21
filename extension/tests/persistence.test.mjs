import {
  CSV_BOM,
  CSV_HEADER_LINE,
  CSV_HEADER_TEXT,
  escapeCsvField,
  findOldTrackingCompany,
  findPriorCompanyCaptures,
  normalizeCompanyForMatch,
  parseCsvRows,
  parseOldTrackingCompanies,
  recordToCsvValues,
  serializeCsvRow,
  serializeRecordCsvRow,
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
  OTHER_LISTINGS_CSV_FILENAME,
  reserveListingFilename,
  saveCaptureRecord
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
      async createWritable() {
        position = 0;
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
async function runReservationTests() {
  const record = sampleRecord();
  const base = baseListingFilename(record);
  const filename = await reserveListingFilename(fakeDirectory([base, descriptionTextFilename(base), descriptionMarkdownFilename(base), filenameWithCollisionSuffix(base, 2)]), record);
  assert(filename === filenameWithCollisionSuffix(base, 3), `Expected third filename candidate, got ${filename}`);
}

function runPriorCompanyCacheTests() {
  const cache = {
    oldTrackingText: 'OpenAI\nStarbucks\n',
    csvText: `${CSV_HEADER_TEXT}${serializeRecordCsvRow(sampleRecord({ company: 'EasyPost', captureDateLocal: '2026-07-08' }))}`,
    refreshedAt: '2026-07-13T12:00:00.000Z'
  };

  const oldTrackingWarning = findPriorCompanyInCache(cache, sampleRecord({ company: 'Starbucks, Inc.' }));
  assert(oldTrackingWarning?.source === 'old-tracking', 'Expected cached old-tracking match to be preferred.');
  assert(oldTrackingWarning.count === 1, 'Expected cached old-tracking match count.');

  const csvWarning = findPriorCompanyInCache(cache, sampleRecord({ company: 'EasyPost' }));
  assert(csvWarning?.source === 'csv', 'Expected cached CSV match.');
  assert(csvWarning.mostRecentDate === '2026-07-08', 'Expected cached CSV most recent date.');

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
await runRecentPostingsSettingsTests();
await runJobSearchSettingsTests();

console.log('persistence helper tests passed');
