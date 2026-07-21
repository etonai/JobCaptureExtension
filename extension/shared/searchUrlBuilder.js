import { isJobSearchConfigured } from './jobSearchSettings.js';

const SEARCH_BASE_URL = 'https://www.linkedin.com/jobs/search-results/';

export function buildJobSearchUrl(settings) {
  if (!isJobSearchConfigured(settings)) {
    throw new Error('Job search is not configured. Set keywords and geoId in Options.');
  }

  const params = new URLSearchParams();
  params.set('keywords', settings.keywords.trim());
  params.set('geoId', settings.geoId.trim());
  params.set('f_TPR', `r${settings.timeframeSeconds}`);

  return `${SEARCH_BASE_URL}?${params.toString()}`;
}
