const STORAGE_KEY = 'jobSearchConfig';

export const DEFAULT_JOB_SEARCH_SETTINGS = Object.freeze({
  keywords: 'Software Engineer',
  geoId: '90000091',
  timeframeSeconds: 86400
});

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeTimeframeSeconds(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_JOB_SEARCH_SETTINGS.timeframeSeconds;
}

function normalizeJobSearchSettings(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    keywords: normalizeString(source.keywords),
    geoId: normalizeString(source.geoId),
    timeframeSeconds: normalizeTimeframeSeconds(source.timeframeSeconds ?? DEFAULT_JOB_SEARCH_SETTINGS.timeframeSeconds)
  };
}

export function isJobSearchConfigured(settings) {
  const normalized = normalizeJobSearchSettings(settings);
  return normalized.keywords !== '' && normalized.geoId !== '';
}

export async function loadJobSearchSettings() {
  if (!globalThis.chrome?.storage?.local) {
    return { ...DEFAULT_JOB_SEARCH_SETTINGS };
  }

  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    const value = stored?.[STORAGE_KEY];
    if (!value || typeof value !== 'object') {
      return { ...DEFAULT_JOB_SEARCH_SETTINGS };
    }
    return normalizeJobSearchSettings(value);
  } catch (error) {
    return { ...DEFAULT_JOB_SEARCH_SETTINGS };
  }
}

export async function saveJobSearchSettings(value) {
  const normalized = normalizeJobSearchSettings(value);
  if (globalThis.chrome?.storage?.local) {
    await chrome.storage.local.set({ [STORAGE_KEY]: normalized });
  }
  return normalized;
}
