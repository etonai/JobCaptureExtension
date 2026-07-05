import {
  CSV_BOM,
  CSV_HEADER_LINE,
  CSV_HEADER_TEXT,
  escapeCsvField,
  recordToCsvValues,
  serializeCsvRow,
  serializeRecordCsvRow,
  validateCsvHeader
} from '../shared/csv.js';
import {
  baseListingFilename,
  descriptionTextFilename,
  filenameWithCollisionSuffix,
  savedDescriptionTextPath,
  savedListingPath,
  slugify
} from '../shared/filename.js';
import { reserveListingFilename } from '../shared/saveListing.js';

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
    description: 'Line one\nLine two',
    posterRequirements: '',
    benefits: '',
    additionalSections: [],
    savedListingPath: 'saved-listings/example.json',
    notes: 'First line\nSecond line',
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
}

function runFilenameTests() {
  assert(slugify('Starbucks, Inc.') === 'starbucks-inc', 'Expected punctuation-safe company slug.');
  assert(slugify('CON', 'fallback') === 'fallback', 'Expected reserved Windows name fallback.');
  assert(slugify('  ***  ', 'fallback') === 'fallback', 'Expected blank slug fallback.');

  const filename = baseListingFilename(sampleRecord());
  assert(filename === '2026-07-05_starbucks-inc_software-engineer-sr_123456789.json', `Unexpected filename: ${filename}`);
  assert(filenameWithCollisionSuffix(filename, 2).endsWith('-2.json'), 'Expected collision suffix.');
  assert(savedListingPath(filename) === `saved-listings/${filename}`, 'Expected project-relative saved listing path.');

  const noJobId = baseListingFilename(sampleRecord({ linkedinJobId: '' }));
  assert(/2026-07-05_starbucks-inc_software-engineer-sr_20260705210000\.json/.test(noJobId), `Unexpected fallback id filename: ${noJobId}`);
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

async function runReservationTests() {
  const record = sampleRecord();
  const base = baseListingFilename(record);
  const filename = await reserveListingFilename(fakeDirectory([base, filenameWithCollisionSuffix(base, 2)]), record);
  assert(filename === filenameWithCollisionSuffix(base, 3), `Expected third filename candidate, got ${filename}`);
}

runCsvTests();
runFilenameTests();
await runReservationTests();

console.log('persistence helper tests passed');