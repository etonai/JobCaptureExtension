export const CSV_COLUMNS = [
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

export const CSV_BOM = '\uFEFF';
export const CSV_HEADER_LINE = CSV_COLUMNS.join(',');
export const CSV_HEADER_TEXT = `${CSV_BOM}${CSV_HEADER_LINE}\r\n`;

export function escapeCsvField(value) {
  const text = value == null ? '' : String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function serializeCsvRow(values) {
  return `${values.map(escapeCsvField).join(',')}\r\n`;
}

export function normalizeCsvHeader(text) {
  return String(text ?? '').replace(/^\uFEFF/, '').split(/\r\n|\n|\r/)[0]?.trimEnd() ?? '';
}

export function validateCsvHeader(text) {
  const actual = normalizeCsvHeader(text);
  return {
    ok: actual === CSV_HEADER_LINE,
    expected: CSV_HEADER_LINE,
    actual
  };
}

export function recordToCsvValues(record) {
  return [
    record.captureDateLocal || '',
    record.captureTimeLocal || '',
    record.company || '',
    record.title || '',
    record.location || '',
    record.workplaceType || '',
    record.employmentType || '',
    record.postedText || '',
    record.applicantCountText || '',
    record.salaryText || '',
    record.applyType || '',
    record.linkedinJobId || '',
    record.url || '',
    record.savedListingPath || '',
    record.notes || ''
  ];
}

export function serializeRecordCsvRow(record) {
  return serializeCsvRow(recordToCsvValues(record));
}