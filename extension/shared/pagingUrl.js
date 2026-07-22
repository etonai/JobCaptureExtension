const RESULTS_PER_PAGE = 25;
const SEARCH_RESULTS_PATH_PREFIX = '/jobs/search-results/';

export function isLinkedInJobSearchUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'www.linkedin.com' && parsed.pathname.startsWith(SEARCH_RESULTS_PATH_PREFIX);
  } catch (error) {
    return false;
  }
}

export function getNextStart(url) {
  const parsed = new URL(url);
  const currentStart = Number(parsed.searchParams.get('start'));
  return (Number.isFinite(currentStart) && currentStart > 0 ? currentStart : 0) + RESULTS_PER_PAGE;
}

export function nextPageUrl(currentUrl) {
  const parsed = new URL(currentUrl);
  const nextStart = getNextStart(currentUrl);

  parsed.searchParams.set('start', String(nextStart));
  parsed.searchParams.delete('currentJobId');

  return parsed.toString();
}
