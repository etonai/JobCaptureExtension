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
import { reserveListingFilename, saveCaptureRecord } from '../shared/saveListing.js';

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
  const files = new Map();
  const savedListings = {
    name: 'saved-listings',
    files,
    async getFileHandle(name, options = {}) {
      if (!files.has(name)) {
        if (!options.create) {
          const error = new Error('Not found');
          error.name = 'NotFoundError';
          throw error;
        }
        files.set(name, fakeWritableFile());
      }
      return files.get(name).handle;
    }
  };

  return {
    savedListings,
    rootFiles: files,
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
      if (!files.has(name)) {
        if (!options.create) {
          const error = new Error('Not found');
          error.name = 'NotFoundError';
          throw error;
        }
        files.set(name, fakeWritableFile());
      }
      return files.get(name).handle;
    }
  };
}

async function runSaveCaptureRecordTest() {
  const projectHandle = fakeProjectHandle();
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
async function runReservationTests() {
  const record = sampleRecord();
  const base = baseListingFilename(record);
  const filename = await reserveListingFilename(fakeDirectory([base, descriptionTextFilename(base), descriptionMarkdownFilename(base), filenameWithCollisionSuffix(base, 2)]), record);
  assert(filename === filenameWithCollisionSuffix(base, 3), `Expected third filename candidate, got ${filename}`);
}

runCsvTests();
runFilenameTests();
await runReservationTests();
await runSaveCaptureRecordTest();

console.log('persistence helper tests passed');
