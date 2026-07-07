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
export function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const input = String(text ?? '').replace(/^\uFEFF/, '');

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\r' || char === '\n') {
      row.push(field);
      field = '';
      if (row.some((value) => value !== '')) {
        rows.push(row);
      }
      row = [];
      if (char === '\r' && next === '\n') {
        i += 1;
      }
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((value) => value !== '')) {
    rows.push(row);
  }
  return rows;
}

export function csvRowsToObjects(text) {
  const rows = parseCsvRows(text);
  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((header) => String(header || '').replace(/^\uFEFF/, ''));
  return rows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ''])));
}

export function normalizeCompanyForMatch(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(inc|incorporated|llc|ltd|co|company|corp|corporation)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function companyMatches(left, right) {
  const normalizedLeft = normalizeCompanyForMatch(left);
  const normalizedRight = normalizeCompanyForMatch(right);
  if (!normalizedLeft || !normalizedRight) {
    return false;
  }
  return normalizedLeft === normalizedRight
    || normalizedLeft.startsWith(`${normalizedRight} `)
    || normalizedRight.startsWith(`${normalizedLeft} `);
}

export function findPriorCompanyCaptures(csvText, company) {
  const normalizedCompany = normalizeCompanyForMatch(company);
  if (!normalizedCompany) {
    return { count: 0, mostRecentDate: '', matches: [] };
  }

  const matches = csvRowsToObjects(csvText)
    .filter((row) => companyMatches(row.company, company))
    .map((row) => ({
      company: row.company || '',
      captureDate: row.captureDate || '',
      captureTime: row.captureTime || '',
      title: row.title || '',
      url: row.url || ''
    }));

  const mostRecentDate = matches
    .map((row) => row.captureDate)
    .filter(Boolean)
    .sort()
    .at(-1) || '';

  return {
    count: matches.length,
    mostRecentDate,
    matches
  };
}
export function parseOldTrackingCompanies(text) {
  return String(text ?? '')
    .replace(/^\uFEFF/, '')
    .split(/\r\n|\n|\r/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function findOldTrackingCompany(oldTrackingText, company) {
  const match = parseOldTrackingCompanies(oldTrackingText)
    .find((oldCompany) => companyMatches(oldCompany, company));

  return match
    ? { count: 1, company: match }
    : { count: 0, company: '' };
}

