import { captureActivePage, captureRecentJobPostings } from '../content/captureActivePage.js';
import { ensureProjectReadPermission, getProjectFolderStatus, getStoredProjectFolder } from '../shared/projectFolderStore.js';
import { findCachedPriorCompanyWarning, findPriorCompanyInCache, refreshPriorCompanyCache } from '../shared/priorCompanyCache.js';
import { appendCaptureRecordToCsv, OTHER_LISTINGS_CSV_FILENAME, saveCaptureRecord } from '../shared/saveListing.js';
import { getRecentPostingsAgeConfig, loadRecentPostingsAgeSetting } from '../shared/recentPostingsSettings.js';
import { isJobSearchConfigured, loadJobSearchSettings } from '../shared/jobSearchSettings.js';
import { buildJobSearchUrl, buildPremiumJobSearchUrl } from '../shared/searchUrlBuilder.js';
import { isLinkedInJobSearchUrl, nextPageUrl } from '../shared/pagingUrl.js';

const AUTO_CAPTURE_INTENT_KEY = 'popupIntent';
const AUTO_CAPTURE_INTENT_TTL_MS = 10_000;
const AUTO_CAPTURE_READY_MESSAGE = 'popupIntentReady';
const AUTO_CAPTURE_PENDING_TIMEOUT_MS = 1500;
const AUTO_CAPTURE_POLL_MS = 100;

const elements = {
  captureButton: document.querySelector('#captureButton'),
  saveButton: document.querySelector('#saveButton'),
  recordListingButton: document.querySelector('#recordListingButton'),
  notesInput: document.querySelector('#notesInput'),
  optionsButton: document.querySelector('#optionsButton'),
  openJobSearchButton: document.querySelector('#openJobSearchButton'),
  openPremiumJobSearchButton: document.querySelector('#openPremiumJobSearchButton'),
  nextPageButton: document.querySelector('#nextPageButton'),
  refreshRecentPostingsButton: document.querySelector('#refreshRecentPostingsButton'),
  recentPostingsPanel: document.querySelector('#recentPostingsPanel'),
  recentPostingsCount: document.querySelector('#recentPostingsCount'),
  recentPostingsMessage: document.querySelector('#recentPostingsMessage'),
  recentPostingsList: document.querySelector('#recentPostingsList'),
  statusPanel: document.querySelector('#statusPanel'),
  statusTitle: document.querySelector('#statusTitle'),
  statusMessage: document.querySelector('#statusMessage'),
  resultPanel: document.querySelector('#resultPanel'),
  resultCompany: document.querySelector('#resultCompany'),
  resultJobTitle: document.querySelector('#resultJobTitle'),
  resultLocation: document.querySelector('#resultLocation'),
  resultWorkplace: document.querySelector('#resultWorkplace'),
  resultEmployment: document.querySelector('#resultEmployment'),
  resultSalary: document.querySelector('#resultSalary'),
  resultPosted: document.querySelector('#resultPosted'),
  resultApplicants: document.querySelector('#resultApplicants'),
  resultApplyType: document.querySelector('#resultApplyType'),
  resultDescription: document.querySelector('#resultDescription'),
  resultWarnings: document.querySelector('#resultWarnings'),
  resultUrl: document.querySelector('#resultUrl')
};

let lastCaptureRecord = null;
let ignoredAutoCaptureCreatedAt = null;

function setStatus(kind, title, message) {
  elements.statusPanel.className = `status-panel ${kind}`;
  elements.statusTitle.textContent = title;
  elements.statusMessage.textContent = message;
}

function displayValue(value) {
  return value || 'Not captured';
}

function clearRecentPostingsList() {
  elements.recentPostingsList.replaceChildren();
}

function setRecentPostingsState(kind, message, listings = []) {
  clearRecentPostingsList();
  elements.recentPostingsPanel.dataset.state = kind;
  elements.recentPostingsMessage.textContent = message;
  elements.recentPostingsCount.textContent = listings.length ? String(listings.length) : kind === 'loading' ? 'Checking' : '0';
  elements.recentPostingsList.classList.toggle('hidden', listings.length === 0);

  for (const listing of listings) {
    const item = document.createElement('li');
    const company = document.createElement('strong');
    const posted = document.createElement('span');
    if (Number.isInteger(listing.listPosition) && listing.listPosition > 0) {
      const position = document.createElement('span');
      position.className = 'recent-postings-position';
      position.textContent = `${listing.listPosition} `;
      company.append(position);
    }
    company.append(listing.company || 'Unknown company');
    posted.textContent = listing.postedText || '';
    item.append(company, posted);
    elements.recentPostingsList.append(item);
  }
}

let recentPostingsScanInFlight = false;

async function scanRecentPostings() {
  if (recentPostingsScanInFlight) {
    return;
  }

  recentPostingsScanInFlight = true;
  elements.refreshRecentPostingsButton.disabled = true;
  setRecentPostingsState('loading', 'Scanning the active LinkedIn tab.');

  try {
    const ageValue = await loadRecentPostingsAgeSetting();
    const ageConfig = getRecentPostingsAgeConfig(ageValue);
    const tab = await getActiveTab();
    const [injectionResult] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: captureRecentJobPostings,
      args: [{ maxAgeMinutes: ageConfig.maxAgeMinutes, inclusive: ageConfig.inclusive }]
    });
    const result = injectionResult?.result;
    if (!result) {
      throw new Error('The active tab did not return recent postings.');
    }
    if (!result.ok) {
      setRecentPostingsState('unsupported', result.message || 'Open a LinkedIn jobs page to check recent postings.');
      return;
    }
    if (result.debug) {
      console.debug('[recent-postings-debug]', result.debug);
    }
    const listings = Array.isArray(result.listings) ? result.listings : [];
    if (listings.length === 0) {
      const debugSuffix = result.debug
        ? ` (debug: ${result.debug.titleParagraphCount} cards, ${result.debug.ageLineCount} age-text lines on page)`
        : '';
      setRecentPostingsState('empty', `${ageConfig.emptyStateText}${debugSuffix}`);
      return;
    }
    const noun = listings.length === 1 ? 'posting' : 'postings';
    // The card count backs the position numbers: if it is far below the
    // visible list length, positions are compressed (undetected titles) and
    // the debug console log has the evidence (see DevCycle014.md).
    const cardSuffix = result.debug ? ` (${result.debug.titleParagraphCount} cards detected)` : '';
    setRecentPostingsState('ready', `${listings.length} recent ${noun} found.${cardSuffix}`, listings);
  } catch (error) {
    setRecentPostingsState('error', error.message || String(error));
  } finally {
    recentPostingsScanInFlight = false;
    elements.refreshRecentPostingsButton.disabled = false;
  }
}

function priorCompanyWarningMessage(record, summary) {
  if (summary.source === 'old-tracking') {
    return `You have 1 prior entry for ${record.company} in old-tracking.txt`;
  }

  const entryText = summary.count === 1 ? '1 prior CSV entry' : `${summary.count} prior CSV entries`;
  const dateText = summary.mostRecentDate ? ` Most recent: ${summary.mostRecentDate}.` : '';
  return `You have ${entryText} for ${record.company}.${dateText}`;
}

async function findPriorCompanyWarning(record) {
  if (!record?.company) {
    return null;
  }

  try {
    const projectHandle = await getStoredProjectFolder();
    if (!projectHandle) {
      return findCachedPriorCompanyWarning(record);
    }

    await ensureProjectReadPermission(projectHandle);
    const cache = await refreshPriorCompanyCache(projectHandle);
    return findPriorCompanyInCache(cache, record);
  } catch (error) {
    return findCachedPriorCompanyWarning(record);
  }
}
function updateSaveButtons() {
  const canSave = Boolean(lastCaptureRecord);
  for (const button of [elements.saveButton, elements.recordListingButton]) {
    button.classList.toggle('hidden', !canSave);
    button.disabled = !canSave;
  }
}

function setResult(result) {
  const record = result.record || {};
  const warnings = result.warnings || [];
  elements.resultPanel.classList.remove('hidden');
  elements.resultCompany.textContent = displayValue(record.company);
  elements.resultJobTitle.textContent = displayValue(record.title);
  elements.resultLocation.textContent = displayValue(record.location);
  elements.resultWorkplace.textContent = displayValue(record.workplaceType);
  elements.resultEmployment.textContent = displayValue(record.employmentType);
  elements.resultSalary.textContent = displayValue(record.salaryText);
  elements.resultPosted.textContent = displayValue(record.postedText);
  elements.resultApplicants.textContent = displayValue(record.applicantCountText);
  elements.resultApplyType.textContent = displayValue(record.applyType);
  elements.resultDescription.textContent = record.description
    ? `${record.description.length.toLocaleString()} characters captured`
    : 'Not captured';
  elements.resultWarnings.textContent = warnings.length
    ? warnings.map((warning) => warning.message).join(' ')
    : 'None';
  elements.resultUrl.textContent = result.url || record.url || '';
}

function clearResult() {
  lastCaptureRecord = null;
  updateSaveButtons();
  elements.resultPanel.classList.add('hidden');
  elements.notesInput.value = '';
  for (const key of [
    'resultCompany',
    'resultJobTitle',
    'resultLocation',
    'resultWorkplace',
    'resultEmployment',
    'resultSalary',
    'resultPosted',
    'resultApplicants',
    'resultApplyType',
    'resultDescription',
    'resultWarnings',
    'resultUrl'
  ]) {
    elements[key].textContent = '';
  }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error('No active tab is available.');
  }
  return tab;
}

function applyCaptureResult(capture) {
  const result = capture?.result;
  if (!result) {
    throw new Error('The active tab did not return a capture result.');
  }

  setResult(result);
  if (result.ok) {
    lastCaptureRecord = result.record;
    elements.notesInput.value = lastCaptureRecord.notes || '';
    updateSaveButtons();

    if (capture.priorCompany) {
      setStatus('warning', 'Previously captured company', priorCompanyWarningMessage(lastCaptureRecord, capture.priorCompany));
    } else if (capture.folderStatus?.configured) {
      setStatus('captured', 'Captured', 'Structured job fields captured. Review the summary, then save to your project folder.');
    } else {
      setStatus('captured', 'Captured', 'Structured job fields captured. Configure a project folder in Options before saving.');
    }
  } else {
    setStatus('unsupported', 'Unsupported Page', result.message || 'This page is not supported yet.');
  }
}

async function captureActiveTabWithChecks() {
  const tab = await getActiveTab();
  const [injectionResult] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: captureActivePage
  });

  const result = injectionResult?.result;
  if (!result) {
    throw new Error('The active tab did not return a capture result.');
  }

  return {
    result,
    folderStatus: result.ok ? await getProjectFolderStatus() : null,
    priorCompany: result.ok ? await findPriorCompanyWarning(result.record) : null
  };
}

async function runCapture() {
  clearResult();
  elements.captureButton.disabled = true;
  setStatus('capturing', 'Capturing', 'Reading the active tab.');

  try {
    applyCaptureResult(await captureActiveTabWithChecks());
  } catch (error) {
    setStatus('error', 'Capture Failed', error.message || String(error));
  } finally {
    elements.captureButton.disabled = false;
  }
}
async function runSave() {
  if (!lastCaptureRecord) {
    setStatus('error', 'Nothing To Save', 'Capture a supported LinkedIn job before saving.');
    return;
  }

  lastCaptureRecord.notes = elements.notesInput.value;
  elements.saveButton.disabled = true;
  elements.recordListingButton.disabled = true;
  elements.captureButton.disabled = true;
  setStatus('capturing', 'Saving', 'Writing JSON listing and CSV tracking row.');

  try {
    const result = await saveCaptureRecord(lastCaptureRecord);
    lastCaptureRecord = result.record;
    elements.notesInput.value = lastCaptureRecord.notes || '';
    if (result.partial) {
      setResult({ ok: true, record: lastCaptureRecord, warnings: [{ message: result.csvError }] });
      setStatus('warning', 'Partially Saved', `JSON saved to ${result.savedListingPath}. CSV append failed: ${result.csvError}`);
    } else {
      setResult({ ok: true, record: lastCaptureRecord, warnings: [] });
      setStatus('captured', 'Saved', `JSON saved and CSV row appended: ${result.savedListingPath}`);
    }
  } catch (error) {
    const message = error.message || String(error);
    const suffix = /project folder/i.test(message) ? ' Open Options to choose or reconnect the project folder.' : '';
    setStatus('error', 'Save Failed', `${message}${suffix}`);
  } finally {
    elements.captureButton.disabled = false;
    updateSaveButtons();
  }
}

async function runRecordListing() {
  if (!lastCaptureRecord) {
    setStatus('error', 'Nothing To Record', 'Capture a supported LinkedIn job before recording a listing.');
    return;
  }

  lastCaptureRecord.notes = elements.notesInput.value;
  elements.saveButton.disabled = true;
  elements.recordListingButton.disabled = true;
  elements.captureButton.disabled = true;
  setStatus('capturing', 'Recording Listing', `Writing CSV row to ${OTHER_LISTINGS_CSV_FILENAME}.`);

  try {
    const result = await appendCaptureRecordToCsv(lastCaptureRecord, OTHER_LISTINGS_CSV_FILENAME);
    lastCaptureRecord = result.record;
    elements.notesInput.value = lastCaptureRecord.notes || '';
    setResult({ ok: true, record: lastCaptureRecord, warnings: [] });
    setStatus('captured', 'Listing Recorded', `CSV row appended to ${result.csvFile}.`);
  } catch (error) {
    const message = error.message || String(error);
    const suffix = /project folder/i.test(message) ? ' Open Options to choose or reconnect the project folder.' : '';
    setStatus('error', 'Record Failed', `${message}${suffix}`);
  } finally {
    elements.captureButton.disabled = false;
    updateSaveButtons();
  }
}

function openOptions() {
  chrome.runtime.openOptionsPage();
}

async function openJobSearchUrl(buildUrl, failureTitle) {
  const settings = await loadJobSearchSettings();
  if (!isJobSearchConfigured(settings)) {
    setStatus('error', 'Job Search Not Configured', 'Set keywords and geoId in Options, then try again.');
    openOptions();
    return;
  }

  try {
    const url = buildUrl(settings);
    await chrome.tabs.create({ url });
  } catch (error) {
    setStatus('error', failureTitle, error.message || String(error));
  }
}

function openJobSearch() {
  return openJobSearchUrl(buildJobSearchUrl, 'Open Job Search Failed');
}

function openPremiumJobSearch() {
  return openJobSearchUrl(buildPremiumJobSearchUrl, 'Open Premium Job Search Failed');
}

async function goToNextPage() {
  try {
    const tab = await getActiveTab();
    if (!tab.url || !isLinkedInJobSearchUrl(tab.url)) {
      setStatus('error', 'Not a Job Search Page', 'Open a LinkedIn job search (generic or premium) first, then try Next Page.');
      return;
    }

    const url = nextPageUrl(tab.url);
    await chrome.tabs.update(tab.id, { url });
    setStatus('capturing', 'Advancing Page', 'Loading the next page of results. Once it loads, click the Recent Postings refresh button to rescan.');
  } catch (error) {
    setStatus('error', 'Next Page Failed', error.message || String(error));
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readAutoCaptureIntent() {
  const values = await chrome.storage.session.get(AUTO_CAPTURE_INTENT_KEY);
  return values[AUTO_CAPTURE_INTENT_KEY] || null;
}

async function waitForCompletedAutoCaptureIntent(createdAt) {
  const deadline = Date.now() + AUTO_CAPTURE_PENDING_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const intent = await readAutoCaptureIntent();
    if (!intent || Number(intent.createdAt || 0) !== Number(createdAt || 0)) {
      return null;
    }
    if (!intent.pending) {
      return intent;
    }
    await delay(AUTO_CAPTURE_POLL_MS);
  }
  return null;
}

async function consumeAutoCaptureIntent() {
  let intent = await readAutoCaptureIntent();

  if (!intent) {
    return;
  }

  if (ignoredAutoCaptureCreatedAt === intent.createdAt) {
    await chrome.storage.session.remove(AUTO_CAPTURE_INTENT_KEY);
    return;
  }

  const isFresh = Date.now() - Number(intent.createdAt || 0) <= AUTO_CAPTURE_INTENT_TTL_MS;
  if (!isFresh) {
    await chrome.storage.session.remove(AUTO_CAPTURE_INTENT_KEY);
    return;
  }

  if (intent.pending) {
    clearResult();
    setStatus('capturing', 'Capturing', 'Reading the active tab and checking prior companies.');
    const completedIntent = await waitForCompletedAutoCaptureIntent(intent.createdAt);
    if (completedIntent) {
      intent = completedIntent;
    } else {
      ignoredAutoCaptureCreatedAt = intent.createdAt;
      await chrome.storage.session.remove(AUTO_CAPTURE_INTENT_KEY);
      await runCapture();
      return;
    }
  }

  await chrome.storage.session.remove(AUTO_CAPTURE_INTENT_KEY);

  if (intent.error) {
    setStatus('error', 'Shortcut Failed', intent.error);
    return;
  }

  if (!intent.autoCapture) {
    return;
  }

  clearResult();
  if (intent.capture) {
    applyCaptureResult(intent.capture);
  } else {
    await runCapture();
  }
}

elements.captureButton.addEventListener('click', runCapture);
elements.saveButton.addEventListener('click', runSave);
elements.recordListingButton.addEventListener('click', runRecordListing);
elements.optionsButton.addEventListener('click', openOptions);
elements.openJobSearchButton.addEventListener('click', openJobSearch);
elements.openPremiumJobSearchButton.addEventListener('click', openPremiumJobSearch);
elements.nextPageButton.addEventListener('click', goToNextPage);
elements.refreshRecentPostingsButton.addEventListener('click', scanRecentPostings);
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === AUTO_CAPTURE_READY_MESSAGE) {
    consumeAutoCaptureIntent().catch((error) => {
      setStatus('error', 'Shortcut Failed', error.message || String(error));
    });
  }
});
updateSaveButtons();
scanRecentPostings();
consumeAutoCaptureIntent().catch((error) => {
  setStatus('error', 'Shortcut Failed', error.message || String(error));
});
