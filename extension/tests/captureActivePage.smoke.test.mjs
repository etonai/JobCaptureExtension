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
function setMockPage({ href, hostname, pathname, title, bodyText, headings = [], domHeadings = [], paragraphNodes = [], buttonNodes = [] }) {
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
      if (selector === 'p') {
        return paragraphNodes;
      }
      if (selector === 'button[aria-label]') {
        return buttonNodes;
      }
      return [];
    }
  };
}

// Faithful mocks of the real LinkedIn results-list card DOM, verified against
// doc/examples/Starbucksmoreunselectedbare.html: a card's title is a <p> with
// two spans of identical text; its company and location are plain single-text
// <p>s; its age is a <p> with two spans of DIFFERENT text ("Posted N ago" /
// "N ago"). In document order the <p>s run title, company, location, ..., age.
function spanNode(text) {
  return { nodeType: 1, tagName: 'SPAN', childNodes: [{ nodeType: 3, textContent: text }], innerText: text, textContent: text };
}

function echoParagraph(visibleText, hiddenText) {
  const children = [spanNode(visibleText), spanNode(hiddenText)];
  const joined = `${visibleText} ${hiddenText}`;
  return { nodeType: 1, tagName: 'P', childNodes: children, innerText: joined, textContent: joined };
}

function titleParagraph(text) {
  return echoParagraph(text, text);
}

function textParagraph(text) {
  return { nodeType: 1, tagName: 'P', childNodes: [{ nodeType: 3, textContent: text }], innerText: text, textContent: text };
}

// visibleAge like 'Posted 24 minutes ago'; the accessibility echo span carries
// the bare 'N ago'. If no explicit bare form is given, derive it.
function ageParagraph(visibleAge) {
  const bare = visibleAge.replace(/^(?:Posted|Reposted)\s+/i, '');
  return echoParagraph(visibleAge, bare);
}

// Builds the <p> sequence for one card in document order.
function listCardParagraphs({ title, company, location, age }) {
  const nodes = [titleParagraph(title)];
  if (company !== undefined) nodes.push(textParagraph(company));
  if (location !== undefined) nodes.push(textParagraph(location));
  if (age !== undefined) nodes.push(ageParagraph(age));
  return nodes;
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

function runRecentPostingsListCardStructureTest() {
  // Each card is built from the verified real structure: a title <p> (echo
  // spans), then a plain company <p>, then a location <p>, then an age <p>.
  // The company is read positionally as the <p> right after the title.
  const paragraphNodes = [
    ...listCardParagraphs({ title: 'Sr Software Engineer', company: 'Compass', location: 'Seattle, WA', age: 'Posted 24 minutes ago' }),
    ...listCardParagraphs({ title: 'Software Developer I', company: 'Redfin', location: 'Seattle, WA', age: '1 hour ago' }),
    ...listCardParagraphs({ title: 'Senior Software Engineer', company: 'Armada', location: 'Seattle, WA (On-site)', age: 'Reposted 2 hours ago' }),
    // Age too old -> excluded entirely.
    ...listCardParagraphs({ title: 'Staff Engineer', company: 'OldCo', location: 'Remote', age: 'Posted 3 hours ago' }),
    // A card that shows an insight instead of an age -> not a recent posting.
    ...listCardParagraphs({ title: 'Data Engineer', company: 'NoAgeCo', location: 'Austin, TX', age: undefined }),
    // A card where LinkedIn omitted the company <p>: the <p> after the title
    // is the location. Company must be left blank, never mislabeled, but the
    // qualifying-age listing must still appear.
    ...listCardParagraphs({ title: 'Platform Engineer', company: undefined, location: 'Denver, CO', age: 'Posted 42 minutes ago' })
  ];

  setMockPage({
    href: 'https://www.linkedin.com/jobs/search-results/?keywords=software%20engineer',
    hostname: 'www.linkedin.com',
    pathname: '/jobs/search-results/',
    title: 'Software Engineer Jobs | LinkedIn',
    bodyText: 'LinkedIn job results',
    paragraphNodes
  });

  const result = captureRecentJobPostings();
  assert(result.ok === true, 'Expected recent postings scan to be supported on LinkedIn jobs search.');
  assert(result.listings.length === 4, `Expected 4 recent listings (3 with companies + 1 company-omitted), got ${result.listings.length}: ${JSON.stringify(result.listings)}.`);
  assert(result.listings.some((l) => l.company === 'Compass' && l.postedText === 'Posted 24 minutes ago' && l.companySource === 'list-card'), 'Expected Compass read positionally from the card structure.');
  assert(result.listings.some((l) => l.company === 'Redfin' && l.postedText === '1 hour ago' && l.companySource === 'list-card'), 'Expected Redfin from the card structure.');
  assert(result.listings.some((l) => l.company === 'Armada' && l.postedText === 'Reposted 2 hours ago' && l.companySource === 'list-card'), 'Expected Armada at the 2-hour boundary from the card structure.');
  assert(result.listings.some((l) => l.company === '' && l.postedText === 'Posted 42 minutes ago' && l.companySource === 'missing'), 'Expected the company-omitted card to still appear with a blank company, not the location.');
  assert(!result.listings.some((l) => l.company === 'Denver, CO'), 'Expected a location never to be used as a company.');
  assert(!result.listings.some((l) => l.company === 'OldCo'), 'Expected the 3-hour-old card to be excluded by age.');
  assert(!result.listings.some((l) => l.company === 'NoAgeCo'), 'Expected a card with no posting age to be excluded.');
}

// --- Real-fixture verification -------------------------------------------
// Per the verification standard recorded in DevCycle013.md: the production
// captureRecentJobPostings function is run (injection-isolated) against DOM
// nodes parsed MECHANICALLY from the two real saved LinkedIn pages — one per
// observed markup variant. Nothing here is hand-invented structure; if
// LinkedIn's markup drifts from what the extractor assumes, these fail.

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function stripTags(s) {
  return decodeEntities(s.replace(/<[^>]+>/g, ' '));
}

// Top-level <span> children of an element's inner HTML (depth-aware, since
// the Docusign variant nests icon spans inside the title span).
function topLevelSpans(inner) {
  const spans = [];
  const re = /<span\b[^>]*>|<\/span>/g;
  let match;
  let depth = 0;
  let start = -1;
  while ((match = re.exec(inner))) {
    if (match[0][1] !== '/') {
      if (depth === 0) start = match.index + match[0].length;
      depth += 1;
    } else {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        spans.push(inner.slice(start, match.index));
        start = -1;
      }
    }
  }
  return spans;
}

function fixtureDomNodes(html) {
  const paragraphNodes = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].map((m) => {
    const inner = m[1];
    const spanTexts = topLevelSpans(inner).map((s) => stripTags(s).replace(/\s+/g, ' ').trim());
    const text = stripTags(inner).replace(/\s+/g, ' ').trim();
    return {
      nodeType: 1,
      tagName: 'P',
      childNodes: spanTexts.map((t) => ({ nodeType: 1, tagName: 'SPAN', childNodes: [], innerText: t, textContent: t })),
      innerText: text,
      textContent: text
    };
  });
  const buttonNodes = [...html.matchAll(/<button\b[^>]*aria-label="([^"]*)"/g)].map((m) => ({
    nodeType: 1,
    tagName: 'BUTTON',
    getAttribute(name) {
      return name === 'aria-label' ? decodeEntities(m[1]) : '';
    }
  }));
  return { paragraphNodes, buttonNodes };
}

function runRecentPostingsRealFixtureTest(fixturePath, expectations) {
  const html = readFixture(fixturePath);
  const { paragraphNodes, buttonNodes } = fixtureDomNodes(html);
  setMockPage({
    href: 'https://www.linkedin.com/jobs/search-results/?currentJobId=1',
    hostname: 'www.linkedin.com',
    pathname: '/jobs/search-results/',
    title: 'Jobs | LinkedIn',
    bodyText: '',
    paragraphNodes,
    buttonNodes
  });

  // Same isolation as chrome.scripting.executeScript (see the injection-safe
  // test below): only this one function's body runs in the page.
  const isolated = new Function(`return (${captureRecentJobPostings.toString()});`)();
  const result = isolated();

  assert(result.ok === true, `Expected ${fixturePath} scan to be supported.`);
  for (const { company, postedText } of expectations.present) {
    assert(
      result.listings.some((l) => l.company === company && l.postedText === postedText && l.companySource === 'list-card'),
      `Expected ${company} (${postedText}) from ${fixturePath}, got ${JSON.stringify(result.listings)}.`
    );
  }
  assert(
    !result.listings.some((l) => l.companySource === 'missing'),
    `Expected every recent listing in ${fixturePath} to carry a real company, got ${JSON.stringify(result.listings)}.`
  );
  assert(
    result.listings.length === expectations.count,
    `Expected ${expectations.count} recent listings in ${fixturePath}, got ${result.listings.length}: ${JSON.stringify(result.listings)}.`
  );
}

function runRecentPostingsDocusignFixtureTest() {
  // Docusign variant: title <p> has an EMPTY first span; only the dismiss
  // buttons identify the cards. This is the exact page that produced the
  // all-"Unknown company" report against 0.0.13.12.
  runRecentPostingsRealFixtureTest('doc/examples/Senior Software Engineer _ Docusign _ LinkedIn.html', {
    count: 4,
    present: [
      { company: 'Remitly, Inc. - XML', postedText: 'Posted 1 hour ago' },
      { company: 'Weights & Biases', postedText: 'Posted 1 hour ago' },
      { company: 'Parametrix', postedText: 'Posted 2 hours ago' },
      { company: 'Cisco', postedText: 'Posted 42 minutes ago' }
    ]
  });
}

function runRecentPostingsStarbucksFixtureTest() {
  // Starbucks variant: titles render as the identical-two-span echo.
  runRecentPostingsRealFixtureTest('doc/examples/Starbucksmoreunselectedbare.html', {
    count: 4,
    present: [
      { company: 'Armada', postedText: 'Posted 7 minutes ago' },
      { company: 'Microsoft', postedText: 'Posted 23 minutes ago' },
      { company: 'SpaceX', postedText: 'Posted 48 minutes ago' },
      { company: 'CoreWeave', postedText: 'Posted 1 hour ago' }
    ]
  });
}

function runRecentPostingsIsInjectionSafeTest() {
  // `chrome.scripting.executeScript({ func: captureRecentJobPostings })`
  // serializes and runs only that one function's body in the target page -
  // it does NOT carry along sibling top-level functions from this module,
  // including `captureActivePage`. A plain Node import test can't catch a
  // reference back into `captureActivePage`, because both are in the same
  // module scope here. `new Function(...)` recreates the real isolation:
  // it only closes over the global scope, never this file's module scope,
  // matching what actually happens in the browser. This caught the
  // ReferenceError that shipped in 0.0.13.6-0.0.13.9 and made every
  // fallback-path call fail silently on real LinkedIn pages.
  const isolatedCaptureRecentJobPostings = new Function(`return (${captureRecentJobPostings.toString()});`)();

  setMockPage({
    href: 'https://www.linkedin.com/jobs/view/555666777',
    hostname: 'www.linkedin.com',
    pathname: '/jobs/view/555666777',
    title: 'Isolated Injection Check',
    bodyText: [
      'IsolatedCo',
      'Isolated Engineer',
      'Remote | 10 minutes ago | 2 applicants',
      'About the job'
    ].join('\n')
  });

  const result = isolatedCaptureRecentJobPostings();
  assert(result.ok === true, 'Expected the isolated (injection-realistic) call to run without a ReferenceError.');
  assert(result.listings.some((listing) => listing.company === 'IsolatedCo' && listing.postedText === '10 minutes ago'), `Expected the isolated call to still find the posting, got ${JSON.stringify(result.listings)}.`);
}

function runRecentPostingsWholePageFallbackTest() {
  setMockPage({
    href: 'https://www.linkedin.com/jobs/search-results/?keywords=engineer',
    hostname: 'www.linkedin.com',
    pathname: '/jobs/search-results/',
    title: 'Software Engineer Jobs | LinkedIn',
    bodyText: [
      'FreshCo',
      'Backend Engineer',
      'Remote | 13 minutes ago | 12 applicants',
      'HourCo',
      'Platform Engineer',
      'Seattle, WA | 1 hour ago | 9 applicants',
      'BoundaryCo',
      'Systems Engineer',
      'Denver, CO | 2 hours ago | 20 applicants',
      'OldCo',
      'Staff Engineer',
      'Remote | 3 hours ago | 45 applicants'
    ].join('\n')
    // Intentionally no recentNodes: this reproduces a real LinkedIn page
    // where candidateBlocks()'s guessed card selectors match nothing, which
    // is the situation that caused every 2-hour-or-less listing to vanish
    // once the per-card denylist fallback was removed. See "Redesign Drops
    // All Listings When Card Selectors Don't Match" in DevCycle013.md.
  });

  const result = captureRecentJobPostings();
  assert(result.ok === true, 'Expected the whole-page fallback scan to be supported.');
  assert(result.listings.length === 3, `Expected all 3 qualifying-age postings to be found even without a card selector match, got ${result.listings.length}.`);
  assert(result.listings.some((listing) => listing.company === 'FreshCo' && listing.postedText === '13 minutes ago' && listing.companySource === 'detail-page'), 'Expected the first posting to be labeled via the detail-page header parser.');
  assert(result.listings.some((listing) => listing.company === '' && listing.postedText === '1 hour ago' && listing.companySource === 'missing'), 'Expected the second posting to still be reported with an unresolved company, not dropped.');
  assert(result.listings.some((listing) => listing.company === '' && listing.postedText === '2 hours ago' && listing.companySource === 'missing'), 'Expected the third posting (2-hour boundary) to still be reported with an unresolved company, not dropped.');
  assert(!result.listings.some((listing) => listing.postedText === '3 hours ago'), 'Expected the 3-hour-old posting to be excluded by age, not just by the fallback.');
}

function runRecentPostingsWholePageFallbackEchoDedupTest() {
  setMockPage({
    href: 'https://www.linkedin.com/jobs/search-results/?keywords=engineer',
    hostname: 'www.linkedin.com',
    pathname: '/jobs/search-results/',
    title: 'Software Engineer Jobs | LinkedIn',
    // Reproduces the real page reported by the user: each card's age is
    // rendered twice (a visible "Posted N ago" span plus a duplicate
    // aria-hidden "N ago" span for accessibility), which without dedup
    // produced two "Unknown company" rows per real posting.
    bodyText: [
      'Remitly',
      'Software Engineer',
      'Remote | 30 minutes ago | 8 applicants',
      'Some Other Card',
      'Posted 24 minutes ago',
      '24 minutes ago',
      'Another Card',
      'Posted 2 hours ago',
      '2 hours ago'
    ].join('\n')
  });

  const result = captureRecentJobPostings();
  assert(result.ok === true, 'Expected the whole-page fallback scan to be supported.');
  assert(result.listings.length === 3, `Expected 3 distinct postings after echo dedup, got ${result.listings.length}: ${JSON.stringify(result.listings)}.`);
  assert(result.listings.some((listing) => listing.company === 'Remitly' && listing.postedText === '30 minutes ago'), 'Expected the detail-page-derived Remitly posting.');
  assert(result.listings.filter((listing) => listing.postedText === 'Posted 24 minutes ago' || listing.postedText === '24 minutes ago').length === 1, 'Expected the visible/aria-hidden echo pair for the 24-minute posting to collapse into a single row.');
  assert(result.listings.filter((listing) => listing.postedText === 'Posted 2 hours ago' || listing.postedText === '2 hours ago').length === 1, 'Expected the visible/aria-hidden echo pair for the 2-hour posting to collapse into a single row.');
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

function runRecentPostingsDetailFallbackMissingCompanyTest() {
  setMockPage({
    href: 'https://www.linkedin.com/jobs/view/999000111',
    hostname: 'www.linkedin.com',
    pathname: '/jobs/view/999000111',
    title: 'Mystery Listing',
    bodyText: [
      'United States | 5 minutes ago | 3 applicants',
      'About the job'
    ].join('\n')
  });

  const result = captureRecentJobPostings();
  assert(result.ok === true, 'Expected recent postings detail fallback to be supported even without an identifiable company.');
  assert(result.listings.length === 1, `Expected the qualifying-age detail listing to still be reported, got ${result.listings.length}.`);
  assert(result.listings[0].company === '', `Expected a blank company rather than a guess, got ${result.listings[0].company}.`);
  assert(result.listings[0].companySource === 'missing', 'Expected companySource to be missing.');
  assert(result.listings[0].postedText === '5 minutes ago', `Expected 5 minutes ago, got ${result.listings[0].postedText}.`);
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
runRecentPostingsListCardStructureTest();
runRecentPostingsDocusignFixtureTest();
runRecentPostingsStarbucksFixtureTest();
runRecentPostingsIsInjectionSafeTest();
runRecentPostingsWholePageFallbackTest();
runRecentPostingsWholePageFallbackEchoDedupTest();
runRecentPostingsDetailFallbackTest();
runRecentPostingsDetailFallbackMissingCompanyTest();
runRecentPostingsUnsupportedPageTest();
runHtmlFixtureReferenceChecks();

console.log('capture parser fixture tests passed');









