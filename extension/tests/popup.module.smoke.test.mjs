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
      return [{ result: { ok: false, message: 'Popup smoke test scan.' } }];
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
      async set() {},
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

console.log('popup module smoke test passed');
