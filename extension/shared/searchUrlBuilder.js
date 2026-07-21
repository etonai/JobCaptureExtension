import { isJobSearchConfigured } from './jobSearchSettings.js';

const SEARCH_BASE_URL = 'https://www.linkedin.com/jobs/search-results/';

function baseSearchParams(settings) {
  if (!isJobSearchConfigured(settings)) {
    throw new Error('Job search is not configured. Set keywords and geoId in Options.');
  }

  const params = new URLSearchParams();
  params.set('keywords', settings.keywords.trim());
  params.set('geoId', settings.geoId.trim());
  params.set('f_TPR', `r${settings.timeframeSeconds}`);
  return params;
}

export function buildJobSearchUrl(settings) {
  const params = baseSearchParams(settings);
  return `${SEARCH_BASE_URL}?${params.toString()}`;
}

export function buildPremiumJobSearchUrl(settings) {
  const params = baseSearchParams(settings);
  params.set('origin', 'QUALIFICATION_LANDING');
  params.set('showHowYouFit', 'HOW_YOU_FIT');
  return `${SEARCH_BASE_URL}?${params.toString()}`;
}
