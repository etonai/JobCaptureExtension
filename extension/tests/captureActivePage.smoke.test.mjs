import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { captureActivePage, captureRecentJobPostings } from '../content/captureActivePage.js';

function textNode(text) {
  return { nodeType: 3, textContent: text };
}

function elementNode(tagName, attrs = {}, children = []) {
  const node = {
    nodeType: 1,
    tagName: tagName.toUpperCase(),
    attrs,
    childNodes: [],
    parentElement: null,
    nextElementSibling: null,
    get textContent() {
      return this.childNodes.map((child) => child.textContent || '').join('');
    },
    get innerText() {
      return this.textContent;
    },
    getAttribute(name) {
      return this.attrs[name] || '';
    },
    querySelector(selector) {
      const stack = [...this.childNodes];
      while (stack.length) {
        const current = stack.shift();
        if (current?.nodeType === 1) {
          if (selector === '[data-testid="expandable-text-box"]' && current.attrs['data-testid'] === 'expandable-text-box') {
            return current;
          }
          stack.unshift(...current.childNodes);
        }
      }
      return null;
    },
    closest(selector) {
      let current = this;
      while (current) {
        const componentKey = current.attrs?.componentkey || '';
        const sduiComponent = current.attrs?.['data-sdui-component'] || '';
        if (selector.includes('JobDetails_AboutTheJob') && componentKey.startsWith('JobDetails_AboutTheJob')) {
          return current;
        }
        if (selector.includes('aboutTheJob') && sduiComponent.includes('aboutTheJob')) {
          return current;
        }
        current = current.parentElement;
      }
      return null;
    }
  };

  node.childNodes = children;
  for (let i = 0; i < children.length; i += 1) {
    const child = children[i];
    if (child?.nodeType === 1) {
      child.parentElement = node;
      child.nextElementSibling = children.slice(i + 1).find((sibling) => sibling?.nodeType === 1) || null;
    }
  }
  return node;
}

function linkedInAboutJobDom(children) {
  const heading = elementNode('h2', {}, [textNode('About the job')]);
  const description = elementNode('span', { 'data-testid': 'expandable-text-box' }, children);
  const container = elementNode('div', { componentkey: 'JobDetails_AboutTheJob_123' }, [heading, description]);
  return { heading, container };
}
function setMockPage({ href, hostname, pathname, title, bodyText, headings = [], domHeadings = [], recentNodes = [] }) {
  globalThis.window = {
    location: { href, hostname, pathname }
  };
  globalThis.document = {
    title,
    body: { innerText: bodyText },
    querySelectorAll(selector) {
      if (selector === 'h1, h2, h3, h4') {
        return domHeadings;
      }
      if (selector === 'h1, h2') {
        return headings.map((text) => ({ innerText: text, textContent: text }));
      }
      if (/job-card|jobs-search-results|data-job-id|jobs\/view/.test(selector)) {
        return recentNodes;
      }
      return [];
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
  assert(record.workplaceType === 'Remote', 'Expected Remote workplace.');
  assert(record.employmentType === 'Full-time', 'Expected Full-time employment.');
  assert(record.applyType === 'Easy Apply', 'Expected Easy Apply.');
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
  assert(record.employmentType === 'Full-time', 'Expected Full-time employment.');
  assert(record.applyType === 'External Apply', `Expected External Apply, got ${record.applyType}.`);
  assert(record.description.includes('Now Brewing'), 'Expected Starbucks description.');
}



function runSalaryAbsentDoesNotUseUnrelatedHeaderSalaryTest() {
  setMockPage({
    href: 'https://www.linkedin.com/jobs/view/999888777',
    hostname: 'www.linkedin.com',
    pathname: '/jobs/view/999888777',
    title: 'Principal Engineer | NoSalary Co | LinkedIn',
    bodyText: [
      'Recommended job',
      '$180K/yr - $240K/yr',
      'NoSalary Co',
      'Principal Engineer',
      'United States | 2 days ago | 15 applicants',
      'Remote',
      'Full-time',
      'Easy Apply',
      'About the job',
      'Build reliable systems without a posted salary range.'
    ].join('\n'),
    headings: ['Principal Engineer']
  });

  const result = captureActivePage();
  const record = result.record;
  assert(result.ok === true, 'Expected no-salary fixture to be supported.');
  assert(record.company === 'NoSalary Co', 'Expected NoSalary Co company.');
  assert(record.title === 'Principal Engineer', 'Expected Principal Engineer title.');
  assert(record.salaryText === '', 'Expected blank salary when selected job has no salary.');
  assert(record.workplaceType === 'Remote', 'Expected Remote workplace.');
  assert(record.employmentType === 'Full-time', 'Expected Full-time employment.');
  assert(record.applyType === 'Easy Apply', 'Expected Easy Apply.');
}

function runMarkdownDescriptionDomTest() {
  const { heading } = linkedInAboutJobDom([
    elementNode('p', {}, [elementNode('strong', {}, [textNode('Responsibilities:')])]),
    elementNode('ul', {}, [
      elementNode('li', {}, [textNode('Build reliable systems')]),
      elementNode('li', {}, [textNode('Improve developer tooling')])
    ]),
    elementNode('p', {}, [
      textNode('Learn more at '),
      elementNode('a', { href: 'https://example.com/jobs' }, [textNode('our careers page')]),
      textNode('.')
    ])
  ]);

  setMockPage({
    href: 'https://www.linkedin.com/jobs/view/777888999',
    hostname: 'www.linkedin.com',
    pathname: '/jobs/view/777888999',
    title: 'Markdown Engineer | Example Co | LinkedIn',
    bodyText: [
      'Example Co',
      'Markdown Engineer',
      'Remote · 1 day ago · 10 applicants',
      'Easy Apply',
      'About the job',
      'Plain fallback description'
    ].join('\n'),
    domHeadings: [heading]
  });

  const result = captureActivePage();
  const markdown = result.record.descriptionMarkdown;
  assert(result.ok === true, 'Expected Markdown DOM fixture to be supported.');
  assert(markdown.includes('**Responsibilities:**'), `Expected bold Markdown heading, got ${markdown}.`);
  assert(markdown.includes('- Build reliable systems'), `Expected first Markdown bullet, got ${markdown}.`);
  assert(markdown.includes('- Improve developer tooling'), `Expected second Markdown bullet, got ${markdown}.`);
  assert(markdown.includes('[our careers page](https://example.com/jobs)'), `Expected Markdown link, got ${markdown}.`);
}

function recentCard(company, lines) {
  return {
    innerText: lines.join('\n'),
    textContent: lines.join('\n'),
    querySelector(selector) {
      if (/company|subtitle|primary-description/i.test(selector)) {
        return { innerText: company, textContent: company };
      }
      return null;
    }
  };
}

function recentTextBlock(lines) {
  return {
    innerText: lines.join('\n'),
    textContent: lines.join('\n'),
    querySelector() {
      return null;
    }
  };
}
function recentNoisyCompanySelector(noisyCompany, lines) {
  return {
    innerText: lines.join('\n'),
    textContent: lines.join('\n'),
    querySelector(selector) {
      if (/company|subtitle|primary-description/i.test(selector)) {
        return { innerText: noisyCompany, textContent: noisyCompany };
      }
      return null;
    }
  };
}
function runRecentPostingsSyntheticCardsTest() {
  setMockPage({
    href: 'https://www.linkedin.com/jobs/search/?keywords=software%20engineer',
    hostname: 'www.linkedin.com',
    pathname: '/jobs/search/',
    title: 'Software Engineer Jobs | LinkedIn',
    bodyText: 'LinkedIn job results',
    recentNodes: [
      recentCard('FreshCo', ['Backend Engineer', 'FreshCo', 'Remote | 37 minutes ago | 12 applicants']),
      recentCard('HourCo', ['Platform Engineer', 'HourCo', 'Seattle, WA | 1 hour ago | 9 applicants']),
      recentCard('BoundaryCo', ['Systems Engineer', 'BoundaryCo', 'Denver, CO | 2 hours ago | 20 applicants']),
      recentCard('OldCo', ['Staff Engineer', 'OldCo', 'Remote | 3 hours ago | 45 applicants']),
      recentCard('AncientCo', ['Frontend Engineer', 'AncientCo', 'Remote | 1 day ago | 8 applicants']),
      recentCard('RepostCo', ['Core Engineer', 'RepostCo', 'Reposted 1 hour ago']),
      recentTextBlock(['Reliability Engineer', 'SignalWorks', 'Be an early applicant', 'Remote | 42 minutes ago | 4 applicants']),
      recentTextBlock(['Data Platform Engineer', 'AlumniSafe Co', '91 school alumni work here', 'Posted 1 hour ago']),
      recentNoisyCompanySelector('91 school alumni work here', ['Machine Learning Engineer', 'SelectorSafe Co', '91 school alumni work here', '1 hour ago']),
      recentTextBlock(['Cloud Engineer', 'LocationSafe Co', 'Redmond, WA (Hybrid)', 'Posted 1 hour ago']),
      recentNoisyCompanySelector('Redmond, WA (Hybrid)', ['AI Engineer', 'SelectorLocation Co', 'Redmond, WA (Hybrid)', '1 hour ago']),
      recentTextBlock(['Benefits Engineer', 'BenefitsSafe Co', 'Vision, 401(k), +1 benefit', 'Posted 1 hour ago']),
      recentNoisyCompanySelector('Vision, 401(k), +1 benefit', ['Principal Engineer', 'SelectorBenefits Co', 'Vision, 401(k), +1 benefit', '1 hour ago']),
      recentCard('Microsoft', ['Software Engineer', 'Microsoft', 'Posted 2 hours ago']),
      recentCard('Microsoft', ['Software Engineer', 'Microsoft', '2 hours ago']),
      recentTextBlock(['·', 'Posted 2 hours ago']),
      recentTextBlock(['Platform Engineer', 'WorksHereSafe Co', '1 school alumni works here', 'Posted 6 minutes ago']),
      recentTextBlock(['Senior Applied AI Engineer', '48 minutes ago'])
    ]
  });

  const result = captureRecentJobPostings();
  assert(result.ok === true, 'Expected recent postings scan to be supported on LinkedIn jobs search.');
  assert(result.listings.length === 13, `Expected 13 recent postings, got ${result.listings.length}.`);
  assert(result.listings.some((listing) => listing.company === 'FreshCo' && listing.postedText === '37 minutes ago'), 'Expected minute-old listing.');
  assert(result.listings.some((listing) => listing.company === 'HourCo' && listing.postedText === '1 hour ago'), 'Expected 1-hour listing.');
  assert(result.listings.some((listing) => listing.company === 'BoundaryCo' && listing.postedText === '2 hours ago'), 'Expected 2-hour boundary listing.');
  assert(result.listings.some((listing) => listing.company === 'RepostCo' && listing.postedText === 'Reposted 1 hour ago'), 'Expected reposted 1-hour listing.');
  assert(result.listings.some((listing) => listing.company === 'SignalWorks' && listing.postedText === '42 minutes ago'), 'Expected early-applicant noise to be skipped when inferring company.');
  assert(!result.listings.some((listing) => listing.company === 'Be an early applicant'), 'Expected early-applicant CTA not to be used as a company.');
  assert(result.listings.some((listing) => listing.company === 'AlumniSafe Co' && listing.postedText === 'Posted 1 hour ago'), 'Expected alumni social proof to be skipped when inferring company.');
  assert(!result.listings.some((listing) => listing.company === '91 school alumni work here'), 'Expected alumni social proof not to be used as a company.');
  assert(result.listings.some((listing) => listing.company === 'SelectorSafe Co' && listing.postedText === '1 hour ago'), 'Expected noisy selector company text to fall back to inferred company.');
  assert(result.listings.some((listing) => listing.company === 'LocationSafe Co' && listing.postedText === 'Posted 1 hour ago'), 'Expected location line to be skipped when inferring company.');
  assert(result.listings.some((listing) => listing.company === 'SelectorLocation Co' && listing.postedText === '1 hour ago'), 'Expected noisy selector location text to fall back to inferred company.');
  assert(!result.listings.some((listing) => listing.company === 'Redmond, WA (Hybrid)'), 'Expected location text not to be used as a company.');
  assert(result.listings.some((listing) => listing.company === 'BenefitsSafe Co' && listing.postedText === 'Posted 1 hour ago'), 'Expected benefits line to be skipped when inferring company.');
  assert(result.listings.some((listing) => listing.company === 'SelectorBenefits Co' && listing.postedText === '1 hour ago'), 'Expected noisy selector benefits text to fall back to inferred company.');
  assert(!result.listings.some((listing) => listing.company === 'Vision, 401(k), +1 benefit'), 'Expected benefits text not to be used as a company.');
  assert(result.listings.filter((listing) => listing.company === 'Microsoft' && /2 hours ago/.test(listing.postedText)).length === 1, 'Expected equivalent Microsoft age variants to be deduplicated.');
  assert(result.listings.some((listing) => listing.company === 'WorksHereSafe Co' && listing.postedText === 'Posted 6 minutes ago'), 'Expected singular works-here social proof to be skipped when inferring company.');
  assert(!result.listings.some((listing) => listing.company === '1 school alumni works here'), 'Expected singular alumni social proof not to be used as a company.');
  assert(!result.listings.some((listing) => listing.company === '·'), 'Expected separator bullet not to be used as a company.');
  assert(!result.listings.some((listing) => listing.company === 'Senior Applied AI Engineer'), 'Expected title-only fallback not to be used as a company.');
  assert(!result.listings.some((listing) => listing.company === 'OldCo'), 'Expected 3-hour listing to be excluded.');
  assert(!result.listings.some((listing) => listing.company === 'AncientCo'), 'Expected day-old listing to be excluded.');
}

function runRecentPostingsDetailFallbackTest() {
  setMockPage({
    href: 'https://www.linkedin.com/jobs/view/123456789',
    hostname: 'www.linkedin.com',
    pathname: '/jobs/view/123456789',
    title: 'Software Engineer III Core Platform | Blue Origin | LinkedIn',
    bodyText: [
      'Blue Origin',
      'Software Engineer III Core Platform',
      'Seattle, WA | Reposted 2 hours ago | 35 applicants',
      'Hybrid',
      'Full-time',
      'About the job'
    ].join('\n')
  });

  const result = captureRecentJobPostings();
  assert(result.ok === true, 'Expected recent postings detail fallback to be supported.');
  assert(result.listings.length === 1, `Expected one recent detail listing, got ${result.listings.length}.`);
  assert(result.listings[0].company === 'Blue Origin', `Expected Blue Origin, got ${result.listings[0].company}.`);
  assert(result.listings[0].postedText === 'Reposted 2 hours ago', `Expected reposted 2 hours, got ${result.listings[0].postedText}.`);
}

function runRecentPostingsUnsupportedPageTest() {
  setMockPage({
    href: 'https://example.com/jobs',
    hostname: 'example.com',
    pathname: '/jobs',
    title: 'Example Jobs',
    bodyText: 'Example Jobs\nExampleCo\n1 hour ago'
  });

  const result = captureRecentJobPostings();
  assert(result.ok === false, 'Expected non-LinkedIn recent scan to be unsupported.');
  assert(result.reason === 'not_linkedin', 'Expected not_linkedin recent scan reason.');
  assert(result.listings.length === 0, 'Expected no listings for unsupported page.');
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
runSalaryAbsentDoesNotUseUnrelatedHeaderSalaryTest();
runMarkdownDescriptionDomTest();
runUnsupportedPageTest();
runRecentPostingsSyntheticCardsTest();
runRecentPostingsDetailFallbackTest();
runRecentPostingsUnsupportedPageTest();
runHtmlFixtureReferenceChecks();

console.log('capture parser fixture tests passed');









