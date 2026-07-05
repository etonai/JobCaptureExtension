import { captureActivePage } from '../content/captureActivePage.js';

function setMockPage({ href, hostname, pathname, title, bodyText, headings }) {
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

setMockPage({
  href: 'https://www.linkedin.com/jobs/view/123456789',
  hostname: 'www.linkedin.com',
  pathname: '/jobs/view/123456789',
  title: 'Software Engineer | Example Company | LinkedIn',
  bodyText: 'Example Company\nSoftware Engineer\nAbout the job\nBuild useful tools.',
  headings: ['Software Engineer']
});

const supported = captureActivePage();
assert(supported.ok === true, 'Expected LinkedIn job page to be supported.');
assert(supported.minimalRecord.sourceWebsite === 'LinkedIn', 'Expected LinkedIn sourceWebsite.');
assert(supported.candidateHeading === 'Software Engineer', 'Expected candidate heading.');

setMockPage({
  href: 'https://example.com/',
  hostname: 'example.com',
  pathname: '/',
  title: 'Example Domain',
  bodyText: 'Example Domain',
  headings: ['Example Domain']
});

const unsupported = captureActivePage();
assert(unsupported.ok === false, 'Expected non-LinkedIn page to be unsupported.');
assert(unsupported.reason === 'not_linkedin', 'Expected not_linkedin reason.');

console.log('capture smoke tests passed');
