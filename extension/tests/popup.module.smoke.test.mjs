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

let scanResult = { ok: false, message: 'Popup smoke test scan.' };
let lastSessionState = null;

globalThis.chrome = {
  runtime: {
    onMessage: { addListener() {} },
    openOptionsPage() {}
  },
  tabs: {
    async query() {
      return [{
        id: 1,
        url: 'https://www.linkedin.com/jobs/search-results/?keywords=Software+Engineer&geoId=90000091'
      }];
    },
    async update() {}
  },
  scripting: {
    async executeScript() {
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
      async get() {
        return {};
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
  '#refreshRecentPostingsButton'
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

scanResult = {
  ok: true,
  listings: [
    { company: 'Acme', postedText: '5 minutes ago', companySource: 'list-card', listPosition: 1 },
    { company: '', postedText: '10 minutes ago', companySource: 'missing', listPosition: 2 },
    { company: 'Beta', postedText: '15 minutes ago', companySource: 'list-card', listPosition: 3 }
  ]
};
elements.get('#refreshRecentPostingsButton').listeners.get('click')();
await new Promise((resolve) => setTimeout(resolve, 0));

assert(
  lastSessionState?.currentPageTotal === 2,
  `Expected the running-total scan to count only company-known listings (2), got ${lastSessionState?.currentPageTotal}.`
);
assert(
  elements.get('#recentPostingsCount')?.textContent === '3',
  'Expected the displayed Recent Postings count to still include the Unknown-company listing.'
);

console.log('popup module smoke test passed');
