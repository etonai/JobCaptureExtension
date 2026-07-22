import { getNextStart, isLinkedInJobSearchUrl, nextPageUrl } from '../shared/pagingUrl.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const DC17_GENERIC_URL =
  'https://www.linkedin.com/jobs/search-results/?currentJobId=4442297213&keywords=Software%20Engineer&geoId=90000091&f_TPR=r86400';

const DC18_PREMIUM_URL =
  'https://www.linkedin.com/jobs/search-results/?currentJobId=4443011974&showHowYouFit=HOW_YOU_FIT&keywords=Software%20Engineer&origin=QUALIFICATION_LANDING&referralSearchId=WrpjhhVHZRUEhCSp%2BuALaQ%3D%3D&originToLandingJobPostings=4443011974%2C4443023474%2C4438701013&geoId=90000091&f_TPR=r86400';

function runNextPageUrlTests() {
  const dc17Next = new URL(nextPageUrl(DC17_GENERIC_URL));
  assert(dc17Next.searchParams.get('start') === '25', 'Expected DC17 generic URL to gain start=25.');
  assert(dc17Next.searchParams.get('keywords') === 'Software Engineer', 'Expected DC17 keywords to be preserved.');
  assert(dc17Next.searchParams.get('geoId') === '90000091', 'Expected DC17 geoId to be preserved.');
  assert(dc17Next.searchParams.get('f_TPR') === 'r86400', 'Expected DC17 f_TPR to be preserved.');
  assert(!dc17Next.searchParams.has('currentJobId'), 'Expected currentJobId to be dropped when advancing.');

  const dc18Next = new URL(nextPageUrl(DC18_PREMIUM_URL));
  assert(dc18Next.searchParams.get('start') === '25', 'Expected DC18 premium URL to gain start=25.');
  assert(dc18Next.searchParams.get('keywords') === 'Software Engineer', 'Expected DC18 keywords to be preserved.');
  assert(dc18Next.searchParams.get('geoId') === '90000091', 'Expected DC18 geoId to be preserved.');
  assert(dc18Next.searchParams.get('f_TPR') === 'r86400', 'Expected DC18 f_TPR to be preserved.');
  assert(dc18Next.searchParams.get('origin') === 'QUALIFICATION_LANDING', 'Expected DC18 origin to be preserved.');
  assert(dc18Next.searchParams.get('showHowYouFit') === 'HOW_YOU_FIT', 'Expected DC18 showHowYouFit to be preserved.');
  assert(
    dc18Next.searchParams.get('referralSearchId') === 'WrpjhhVHZRUEhCSp+uALaQ==',
    'Expected DC18 referralSearchId to be preserved.'
  );
  assert(
    dc18Next.searchParams.get('originToLandingJobPostings') === '4443011974,4443023474,4438701013',
    'Expected DC18 originToLandingJobPostings to be preserved.'
  );
  assert(!dc18Next.searchParams.has('currentJobId'), 'Expected currentJobId to be dropped when advancing.');

  const alreadyPage2 = 'https://www.linkedin.com/jobs/search-results/?keywords=Software+Engineer&geoId=90000091&f_TPR=r86400&start=25';
  const page3 = new URL(nextPageUrl(alreadyPage2));
  assert(page3.searchParams.get('start') === '50', 'Expected start=25 to advance to start=50.');

  const nonNumericStart = 'https://www.linkedin.com/jobs/search-results/?keywords=Software+Engineer&geoId=90000091&start=notanumber';
  const nonNumericNext = new URL(nextPageUrl(nonNumericStart));
  assert(nonNumericNext.searchParams.get('start') === '25', 'Expected non-numeric start to reset to 25.');

  const blankStart = 'https://www.linkedin.com/jobs/search-results/?keywords=Software+Engineer&geoId=90000091&start=';
  const blankNext = new URL(nextPageUrl(blankStart));
  assert(blankNext.searchParams.get('start') === '25', 'Expected blank start to reset to 25.');
}

function runGetNextStartTests() {
  const noStart = 'https://www.linkedin.com/jobs/search-results/?keywords=Software+Engineer&geoId=90000091';
  assert(getNextStart(noStart) === 25, 'Expected a URL with no start param to yield a next start of 25.');

  const start25 = 'https://www.linkedin.com/jobs/search-results/?keywords=Software+Engineer&geoId=90000091&start=25';
  assert(getNextStart(start25) === 50, 'Expected start=25 to yield a next start of 50.');

  const nonNumericStart = 'https://www.linkedin.com/jobs/search-results/?keywords=Software+Engineer&geoId=90000091&start=notanumber';
  assert(getNextStart(nonNumericStart) === 25, 'Expected non-numeric start to yield a next start of 25.');

  const negativeStart = 'https://www.linkedin.com/jobs/search-results/?keywords=Software+Engineer&geoId=90000091&start=-10';
  assert(getNextStart(negativeStart) === 25, 'Expected negative start to yield a next start of 25.');
}

function runIsLinkedInJobSearchUrlTests() {
  assert(isLinkedInJobSearchUrl(DC17_GENERIC_URL) === true, 'Expected DC17 generic URL to be recognized as a search-results URL.');
  assert(isLinkedInJobSearchUrl(DC18_PREMIUM_URL) === true, 'Expected DC18 premium URL to be recognized as a search-results URL.');
  assert(
    isLinkedInJobSearchUrl('https://www.linkedin.com/jobs/view/123456789') === false,
    'Expected a job detail URL not to be recognized as a search-results URL.'
  );
  assert(
    isLinkedInJobSearchUrl('https://www.example.com/jobs/search-results/?keywords=Engineer') === false,
    'Expected a non-LinkedIn host not to be recognized.'
  );
  assert(isLinkedInJobSearchUrl('not a url') === false, 'Expected an invalid URL string not to throw and to return false.');
}

runNextPageUrlTests();
runGetNextStartTests();
runIsLinkedInJobSearchUrlTests();

console.log('pagingUrl tests passed');
