import { captureActivePage } from '../content/captureActivePage.js';
import { ensureProjectReadPermission, getProjectFolderStatus, getStoredProjectFolder } from '../shared/projectFolderStore.js';
import { findCachedPriorCompanyWarning, findPriorCompanyInCache, refreshPriorCompanyCache } from '../shared/priorCompanyCache.js';
import { saveCaptureRecord } from '../shared/saveListing.js';

const AUTO_CAPTURE_INTENT_KEY = 'popupIntent';
const AUTO_CAPTURE_INTENT_TTL_MS = 10_000;
const AUTO_CAPTURE_READY_MESSAGE = 'popupIntentReady';
const AUTO_CAPTURE_PENDING_TIMEOUT_MS = 1500;
const AUTO_CAPTURE_POLL_MS = 100;

const elements = {
  captureButton: document.querySelector('#captureButton'),
  saveButton: document.querySelector('#saveButton'),
  notesInput: document.querySelector('#notesInput'),
  optionsButton: document.querySelector('#optionsButton'),
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
function updateSaveButton() {
  const canSave = Boolean(lastCaptureRecord);
  elements.saveButton.classList.toggle('hidden', !canSave);
  elements.saveButton.disabled = !canSave;
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
  updateSaveButton();
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
    updateSaveButton();

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
    elements.saveButton.disabled = false;
  }
}

function openOptions() {
  chrome.runtime.openOptionsPage();
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
elements.optionsButton.addEventListener('click', openOptions);
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === AUTO_CAPTURE_READY_MESSAGE) {
    consumeAutoCaptureIntent().catch((error) => {
      setStatus('error', 'Shortcut Failed', error.message || String(error));
    });
  }
});
updateSaveButton();
consumeAutoCaptureIntent().catch((error) => {
  setStatus('error', 'Shortcut Failed', error.message || String(error));
});
