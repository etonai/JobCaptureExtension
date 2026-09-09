function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function fakeElement() {
  const listeners = new Map();
  return {
    listeners,
    className: '',
    textContent: '',
    disabled: false,
    value: '',
    dataset: {},
    classList: {
      add() {},
      remove() {},
      toggle() {}
    },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    replaceChildren() {},
    append() {}
  };
}

const elements = new Map();
globalThis.document = {
  querySelector(selector) {
    if (!elements.has(selector)) {
      elements.set(selector, fakeElement());
    }
    return elements.get(selector);
  },
  createElement() {
    return fakeElement();
  }
};

function fakeWritableFile(initialText = '') {
  let text = initialText;
  return {
    async getFile() {
      return { size: text.length, async text() { return text; } };
    },
    async createWritable({ keepExistingData = false } = {}) {
      let draft = keepExistingData ? text : '';
      let position = 0;
      return {
        async seek(nextPosition) { position = nextPosition; },
        async write(value) {
          const input = String(value);
          draft = draft.slice(0, position) + input + draft.slice(position + input.length);
          position += input.length;
        },
        async close() { text = draft; }
      };
    }
  };
}

const projectFiles = new Map();
const projectHandle = {
  async queryPermission() { return 'granted'; },
  async requestPermission() { return 'granted'; },
  async getFileHandle(name, { create = false } = {}) {
    if (!projectFiles.has(name)) {
      if (!create) throw Object.assign(new Error('Not found'), { name: 'NotFoundError' });
      projectFiles.set(name, fakeWritableFile());
    }
    return projectFiles.get(name);
  }
};

globalThis.indexedDB = {
  open() {
    const request = {};
    setTimeout(() => {
      request.result = {
        objectStoreNames: { contains() { return true; } },
        transaction() {
          return {
            objectStore() {
              return {
                get() {
                  const getRequest = {};
                  setTimeout(() => {
                    getRequest.result = projectHandle;
                    getRequest.onsuccess?.();
                  }, 0);
                  return getRequest;
                }
              };
            }
          };
        },
        close() {}
      };
      request.onsuccess?.();
    }, 0);
    return request;
  }
};

let scanResult = { ok: false, message: 'Popup smoke test scan.' };
let hideBlacklistedResult = { ok: true, scanned: 0, matched: 0, dismissed: 0, failed: 0, companies: [] };
let lastSessionState = null;
let activeTab = {
  id: 1,
  url: 'https://www.linkedin.com/jobs/search-results/?keywords=Software+Engineer&geoId=90000091'
};

globalThis.chrome = {
  runtime: {
    onMessage: { addListener() {} },
    openOptionsPage() {}
  },
  tabs: {
    async query() {
      return [activeTab];
    },
    async update(id, values) { activeTab = { ...activeTab, ...values }; }
  },
  scripting: {
    async executeScript({ func } = {}) {
      if (func && func.name === 'dismissBlacklistedCompanyCards') {
        return [{ result: hideBlacklistedResult }];
      }
      return [{ result: scanResult }];
    }
  },
  storage: {
    local: {
      async get() {
        return {};
      },
      async set() {}
    },
    session: {
      async get(key) {
        return { [key]: key === 'recentPostingsTracking' ? lastSessionState : undefined };
      },
      async set(value) {
        lastSessionState = value.recentPostingsTracking;
      },
      async remove() {}
    }
  }
};

await import('../popup/popup.js');

const buttonSelectors = [
  '#captureButton',
  '#capturePageButton',
  '#saveButton',
  '#recordListingButton',
  '#optionsButton',
  '#openJobSearchButton',
  '#openPremiumJobSearchButton',
  '#nextPageButton',
  '#refreshRecentPostingsButton',
  '#hideBlacklistedButton'
];

for (const selector of buttonSelectors) {
  assert(
    elements.get(selector)?.listeners.has('click'),
    'Expected ' + selector + ' to register a click handler when popup.js initializes.'
  );
}

await new Promise((resolve) => setTimeout(resolve, 0));

assert(
  elements.get('#recentPostingsAgeLabel')?.textContent === '<= 2hr',
  'Expected #recentPostingsAgeLabel to be populated with the default age filter short label.'
);

await elements.get('#openJobSearchButton').listeners.get('click')();

scanResult = {
  ok: true,
  cardCount: 3,
  exactMatchBoundary: { detected: true, exactMatchesOnPage: 2 },
  listings: [
    { company: 'Acme', postedText: '5 minutes ago', companySource: 'list-card', listPosition: 1 },
    { company: '', postedText: '10 minutes ago', companySource: 'missing', listPosition: 2 },
    { company: 'Beta', postedText: '15 minutes ago', companySource: 'list-card', listPosition: 3 }
  ]
};
await elements.get('#refreshRecentPostingsButton').listeners.get('click')();

assert(
  lastSessionState?.currentPageTotal === 2,
  `Expected the running-total scan to count only company-known listings (2), got ${lastSessionState?.currentPageTotal}.`
);
assert(
  elements.get('#recentPostingsCount')?.textContent === '3',
  'Expected the displayed Recent Postings count to still include the Unknown-company listing.'
);
assert(lastSessionState?.exactMatches === 2, `Expected the first-page boundary to persist 2 exact matches, got ${lastSessionState?.exactMatches}.`);
assert(
  elements.get('#exactMatchWarningMessage')?.textContent.includes('after 2 exact matches'),
  'Expected the popup to notify the user with the detected exact-match count.'
);

const searchCsv = projectFiles.get('search-tracking.csv');
const refreshedCsvText = await (await searchCsv.getFile()).text();
assert(refreshedCsvText.includes(',2 hours or less,2'), 'Expected manual Refresh to persist the exact-match count in search-tracking.csv.');

await elements.get('#openJobSearchButton').listeners.get('click')();
let triggeredCsvText = await (await searchCsv.getFile()).text();
assert(triggeredCsvText.includes('Open Job Search,25,0,2 hours or less,UNKNOWN'), 'Expected Open Job Search to append a seven-column tracking row.');

await elements.get('#openPremiumJobSearchButton').listeners.get('click')();
triggeredCsvText = await (await searchCsv.getFile()).text();
assert(triggeredCsvText.includes('Open Premium Job Search,25,0,2 hours or less,UNKNOWN'), 'Expected Open Premium Job Search to append a seven-column tracking row.');

await elements.get('#nextPageButton').listeners.get('click')();
await elements.get('#nextPageButton').listeners.get('click')();
triggeredCsvText = await (await searchCsv.getFile()).text();
assert(triggeredCsvText.includes('Open Premium Job Search,50,0,2 hours or less,UNKNOWN'), 'Expected Next Page to update the last row with the next postsSeen value while preserving exactMatches.');

await elements.get('#hideBlacklistedButton').listeners.get('click')();
assert(
  elements.get('#statusTitle')?.textContent === 'No Blacklist File',
  `Expected a missing blacklist.txt to report "No Blacklist File", got ${elements.get('#statusTitle')?.textContent}.`
);

projectFiles.set('blacklist.txt', fakeWritableFile('   \n# comment only\n'));
await elements.get('#hideBlacklistedButton').listeners.get('click')();
assert(
  elements.get('#statusTitle')?.textContent === 'Blacklist Empty',
  `Expected a blank/comment-only blacklist.txt to report "Blacklist Empty", got ${elements.get('#statusTitle')?.textContent}.`
);

projectFiles.set('blacklist.txt', fakeWritableFile('Amazon\nMeta\n'));
hideBlacklistedResult = { ok: true, scanned: 5, matched: 2, dismissed: 2, failed: 0, companies: ['Amazon', 'Amazon'] };
await elements.get('#hideBlacklistedButton').listeners.get('click')();
assert(
  elements.get('#statusTitle')?.textContent === 'Blacklisted Postings Hidden',
  `Expected matches to report "Blacklisted Postings Hidden", got ${elements.get('#statusTitle')?.textContent}.`
);
assert(
  elements.get('#statusMessage')?.textContent.includes('Hid 2 postings'),
  `Expected the dismissed count in the status message, got ${elements.get('#statusMessage')?.textContent}.`
);

hideBlacklistedResult = { ok: true, scanned: 5, matched: 0, dismissed: 0, failed: 0, companies: [] };
await elements.get('#hideBlacklistedButton').listeners.get('click')();
assert(
  elements.get('#statusTitle')?.textContent === 'No Matches Found',
  `Expected no matches to report "No Matches Found", got ${elements.get('#statusTitle')?.textContent}.`
);

hideBlacklistedResult = { ok: false, reason: 'not_linkedin', message: 'This page is not on LinkedIn.' };
await elements.get('#hideBlacklistedButton').listeners.get('click')();
assert(
  elements.get('#statusTitle')?.textContent === 'Unsupported Page',
  `Expected a non-LinkedIn tab to report "Unsupported Page", got ${elements.get('#statusTitle')?.textContent}.`
);

console.log('popup module smoke test passed');
