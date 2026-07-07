const WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

export function slugify(value, fallback = 'unknown', maxLength = 48) {
  const slug = String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLength)
    .replace(/-$/g, '');

  if (!slug || WINDOWS_RESERVED_NAMES.test(slug)) {
    return fallback;
  }
  return slug;
}

function fallbackId(record) {
  const time = String(record.captureTimeUtc || new Date().toISOString())
    .replace(/\D/g, '')
    .slice(0, 14);
  return time || String(Date.now());
}

export function baseListingFilename(record) {
  const captureDate = record.captureDateLocal || new Date().toISOString().slice(0, 10);
  const company = slugify(record.company, 'unknown-company', 40);
  const title = slugify(record.title, 'unknown-title', 56);
  const id = slugify(record.linkedinJobId || fallbackId(record), 'no-job-id', 32);
  return `${company}_${captureDate}_${title}_${id}.json`;
}

export function filenameWithCollisionSuffix(filename, suffix) {
  if (!suffix || suffix <= 1) {
    return filename;
  }
  return filename.replace(/\.json$/i, `-${suffix}.json`);
}

export function descriptionTextFilename(jsonFilename) {
  return jsonFilename.replace(/\.json$/i, '.txt');
}

export function descriptionMarkdownFilename(jsonFilename) {
  return jsonFilename.replace(/\.json$/i, '.md');
}

export function savedListingPath(filename) {
  return `saved-listings/${filename}`;
}

export function savedDescriptionTextPath(jsonFilename) {
  return savedListingPath(descriptionTextFilename(jsonFilename));
}

export function savedDescriptionMarkdownPath(jsonFilename) {
  return savedListingPath(descriptionMarkdownFilename(jsonFilename));
}