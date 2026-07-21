import { buildJobSearchUrl } from '../shared/searchUrlBuilder.js';
import { DEFAULT_JOB_SEARCH_SETTINGS, isJobSearchConfigured } from '../shared/jobSearchSettings.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runBuildJobSearchUrlTests() {
  const url = new URL(buildJobSearchUrl(DEFAULT_JOB_SEARCH_SETTINGS));

  assert(url.origin === 'https://www.linkedin.com', `Unexpected origin: ${url.origin}`);
  assert(url.pathname === '/jobs/search-results/', `Unexpected pathname: ${url.pathname}`);
  assert(url.searchParams.get('keywords') === 'Software Engineer', 'Expected keywords param to match configuration.');
  assert(url.searchParams.get('geoId') === '90000091', 'Expected geoId to be preserved verbatim.');
  assert(url.searchParams.get('f_TPR') === 'r86400', 'Expected f_TPR derived from timeframeSeconds.');

  const emittedParams = [...url.searchParams.keys()].sort();
  assert(
    emittedParams.join(',') === 'f_TPR,geoId,keywords',
    `Expected only keywords/geoId/f_TPR params, got: ${emittedParams.join(',')}`
  );

  for (const trackingParam of [
    'start',
    'currentJobId',
    'lipi',
    'referralSearchId',
    'originToLandingJobPostings',
    'origin',
    'showHowYouFit'
  ]) {
    assert(!url.searchParams.has(trackingParam), `Expected no ${trackingParam} param in built URL.`);
  }

  const shortWindow = buildJobSearchUrl({ keywords: 'Software Engineer', geoId: '90000091', timeframeSeconds: 7200 });
  assert(shortWindow.includes('f_TPR=r7200'), `Expected custom timeframe to appear in URL: ${shortWindow}`);

  const opaqueGeoId = buildJobSearchUrl({ keywords: 'Engineer', geoId: 'abc-123_XYZ', timeframeSeconds: 86400 });
  assert(new URL(opaqueGeoId).searchParams.get('geoId') === 'abc-123_XYZ', 'Expected geoId to pass through unmodified.');

  let threwForBlankKeywords = false;
  try {
    buildJobSearchUrl({ keywords: '', geoId: '90000091', timeframeSeconds: 86400 });
  } catch (error) {
    threwForBlankKeywords = true;
  }
  assert(threwForBlankKeywords, 'Expected buildJobSearchUrl to throw when keywords are blank.');

  let threwForBlankGeoId = false;
  try {
    buildJobSearchUrl({ keywords: 'Software Engineer', geoId: '   ', timeframeSeconds: 86400 });
  } catch (error) {
    threwForBlankGeoId = true;
  }
  assert(threwForBlankGeoId, 'Expected buildJobSearchUrl to throw when geoId is blank/whitespace.');
}

function runIsJobSearchConfiguredTests() {
  assert(isJobSearchConfigured(DEFAULT_JOB_SEARCH_SETTINGS) === true, 'Expected default settings to be configured.');
  assert(isJobSearchConfigured({ keywords: '', geoId: '90000091' }) === false, 'Expected blank keywords to be unconfigured.');
  assert(isJobSearchConfigured({ keywords: 'Engineer', geoId: '' }) === false, 'Expected blank geoId to be unconfigured.');
  assert(isJobSearchConfigured({ keywords: '   ', geoId: '90000091' }) === false, 'Expected whitespace-only keywords to be unconfigured.');
}

runBuildJobSearchUrlTests();
runIsJobSearchConfiguredTests();

console.log('searchUrlBuilder tests passed');
