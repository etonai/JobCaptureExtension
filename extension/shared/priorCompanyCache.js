import { findOldTrackingCompany, findPriorCompanyCaptures } from './csv.js';

export const PRIOR_COMPANY_CACHE_KEY = 'priorCompanyCache';

async function readProjectTextFile(projectHandle, filename) {
  try {
    const fileHandle = await projectHandle.getFileHandle(filename, { create: false });
    const file = await fileHandle.getFile();
    return await file.text();
  } catch (error) {
    return '';
  }
}

export function findPriorCompanyInCache(cache, record) {
  if (!record?.company || !cache) {
    return null;
  }

  const oldTrackingSummary = findOldTrackingCompany(cache.oldTrackingText || '', record.company);
  if (oldTrackingSummary.count > 0) {
    return { ...oldTrackingSummary, source: 'old-tracking', cached: true };
  }

  const csvSummary = findPriorCompanyCaptures(cache.csvText || '', record.company);
  if (csvSummary.count > 0) {
    return { ...csvSummary, source: 'csv', cached: true };
  }

  return null;
}

export async function getPriorCompanyCache() {
  if (!globalThis.chrome?.storage?.local) {
    return null;
  }

  const values = await chrome.storage.local.get(PRIOR_COMPANY_CACHE_KEY);
  return values[PRIOR_COMPANY_CACHE_KEY] || null;
}

export async function clearPriorCompanyCache() {
  if (!globalThis.chrome?.storage?.local) {
    return;
  }

  await chrome.storage.local.remove(PRIOR_COMPANY_CACHE_KEY);
}

export async function findCachedPriorCompanyWarning(record) {
  return findPriorCompanyInCache(await getPriorCompanyCache(), record);
}

export async function refreshPriorCompanyCache(projectHandle) {
  const cache = {
    oldTrackingText: await readProjectTextFile(projectHandle, 'old-tracking.txt'),
    csvText: await readProjectTextFile(projectHandle, 'job-tracking.csv'),
    refreshedAt: new Date().toISOString()
  };

  if (globalThis.chrome?.storage?.local) {
    await chrome.storage.local.set({ [PRIOR_COMPANY_CACHE_KEY]: cache });
  }

  return cache;
}