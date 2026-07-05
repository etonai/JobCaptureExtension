import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { captureActivePage } from '../content/captureActivePage.js';

function setMockPage({ href, hostname, pathname, title, bodyText, headings = [] }) {
  globalThis.window = {
    location: { href, hostname, pathname }
  };
  globalThis.document = {
    title,
    body: { innerText: bodyText },
    querySelectorAll(selector) {
      if (selector !== 'h1, h2') {
        return [];
      }
      return headings.map((text) => ({ innerText: text, textContent: text }));
    }
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readFixture(relativePath) {
  return readFileSync(resolve(relativePath), 'utf8');
}

function runEasyPostFixtureTest() {
  setMockPage({
    href: 'https://www.linkedin.com/jobs/view/111222333',
    hostname: 'www.linkedin.com',
    pathname: '/jobs/view/111222333',
    title: 'Software Engineer | EasyPost | LinkedIn',
    bodyText: [
      '0 notifications',
      'Skip to search',
      'Skip to main content',
      readFixture('doc/examples/easyposttext.txt')
    ].join('\n'),
    headings: ['Software Engineer']
  });

  const result = captureActivePage();
  const record = result.record;
  assert(result.ok === true, 'Expected EasyPost fixture to be supported.');
  assert(record.schemaVersion === 1, 'Expected schemaVersion 1.');
  assert(record.sourceWebsite === 'LinkedIn', 'Expected LinkedIn sourceWebsite.');
  assert(record.linkedinJobId === '111222333', 'Expected job id from URL.');
  assert(record.company === 'EasyPost', `Expected EasyPost company, got ${record.company}.`);
  assert(record.title === 'Software Engineer', `Expected Software Engineer title, got ${record.title}.`);
  assert(record.location === 'United States', `Expected United States location, got ${record.location}.`);
  assert(record.postedText === '1 month ago', `Expected posted text, got ${record.postedText}.`);
  assert(record.applicantCountText === 'Over 100 applicants', `Expected applicant count, got ${record.applicantCountText}.`);
  assert(record.promotionText === 'Promoted by hirer', `Expected promotion text, got ${record.promotionText}.`);
  assert(record.hiringStatusText === 'Actively reviewing applicants', `Expected hiring status, got ${record.hiringStatusText}.`);
  assert(record.salaryText === '$130K/yr - $170K/yr', `Expected salary, got ${record.salaryText}.`);
  assert(record.workplaceType === 'Remote', `Expected Remote workplace, got ${record.workplaceType}.`);
  assert(record.employmentType === 'Full-time', `Expected Full-time employment, got ${record.employmentType}.`);
  assert(record.applyType === 'Easy Apply', `Expected Easy Apply, got ${record.applyType}.`);
  assert(record.description.includes('Position Summary'), 'Expected description to include Position Summary.');
  assert(record.posterRequirements.includes("Bachelor's Degree"), 'Expected poster requirements.');
  assert(record.benefits === '', 'Expected empty benefits for EasyPost fixture.');
}

function runStarbucksFixtureTest() {
  setMockPage({
    href: 'https://www.linkedin.com/jobs/view/444555666',
    hostname: 'www.linkedin.com',
    pathname: '/jobs/view/444555666',
    title: 'software engineer sr - ST; Seattle, WA | Starbucks | LinkedIn',
    bodyText: [
      'Easy Apply',
      readFixture('doc/examples/starbuckstext.txt')
    ].join('\n'),
    headings: ['software engineer sr - ST; Seattle, WA']
  });

  const result = captureActivePage();
  const record = result.record;
  assert(result.ok === true, 'Expected Starbucks fixture to be supported.');
  assert(record.company === 'Starbucks', `Expected Starbucks company, got ${record.company}.`);
  assert(record.title === 'software engineer sr - ST; Seattle, WA', `Expected Starbucks title, got ${record.title}.`);
  assert(record.location === 'Seattle, WA', `Expected Seattle location, got ${record.location}.`);
  assert(record.postedText === 'Reposted 3 hours ago', `Expected reposted text, got ${record.postedText}.`);
  assert(record.applicantCountText === 'Over 100 people clicked apply', `Expected clicked apply count, got ${record.applicantCountText}.`);
  assert(record.promotionText === 'Promoted by hirer', `Expected promotion text, got ${record.promotionText}.`);
  assert(record.hiringStatusText === 'Responses managed off LinkedIn', `Expected hiring status, got ${record.hiringStatusText}.`);
  assert(record.salaryText === '$127K/yr - $211K/yr', `Expected salary, got ${record.salaryText}.`);
  assert(record.workplaceType === 'On-site', `Expected On-site workplace, got ${record.workplaceType}.`);
  assert(record.employmentType === 'Full-time', `Expected Full-time employment, got ${record.employmentType}.`);
  assert(record.applyType === 'External Apply', `Expected External Apply, got ${record.applyType}.`);
  assert(record.description.includes('Now Brewing'), 'Expected Starbucks description.');
}


function runHtmlFixtureReferenceChecks() {
  const easyPostHtml = readFixture('doc/examples/easyposteasyapplybare.html');
  const starbucksHtml = readFixture('doc/examples/Starbucksmoreunselectedbare.html');

  assert(easyPostHtml.includes('<title>Software Engineer | EasyPost | LinkedIn</title>'), 'Expected EasyPost HTML title marker.');
  assert(starbucksHtml.includes('<title>software engineer sr - ST; Seattle, WA | Starbucks | LinkedIn</title>'), 'Expected Starbucks HTML title marker.');
  assert(easyPostHtml.includes('data-rehydrated="true"'), 'Expected EasyPost saved HTML to be a hydrated LinkedIn app snapshot.');
  assert(starbucksHtml.includes('data-rehydrated="true"'), 'Expected Starbucks saved HTML to be a hydrated LinkedIn app snapshot.');
}
function runUnsupportedPageTest() {
  setMockPage({
    href: 'https://example.com/',
    hostname: 'example.com',
    pathname: '/',
    title: 'Example Domain',
    bodyText: 'Example Domain',
    headings: ['Example Domain']
  });

  const result = captureActivePage();
  assert(result.ok === false, 'Expected non-LinkedIn page to be unsupported.');
  assert(result.reason === 'not_linkedin', 'Expected not_linkedin reason.');
  assert(result.record.company === '', 'Expected empty string default for missing company.');
  assert(result.record.applyType === 'Unknown', 'Expected Unknown apply type default.');
}

runEasyPostFixtureTest();
runStarbucksFixtureTest();
runUnsupportedPageTest();
runHtmlFixtureReferenceChecks();

console.log('capture parser fixture tests passed');
