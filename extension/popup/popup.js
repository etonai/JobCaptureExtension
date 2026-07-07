import { captureActivePage } from '../content/captureActivePage.js';
import { findPriorCompanyCaptures } from '../shared/csv.js';
import { ensureProjectPermission, getProjectFolderStatus, getStoredProjectFolder } from '../shared/projectFolderStore.js';
import { saveCaptureRecord } from '../shared/saveListing.js';

const AUTO_CAPTURE_INTENT_KEY = 'popupIntent';
const AUTO_CAPTURE_INTENT_TTL_MS = 10_000;

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

function setStatus(kind, title, message) {
  elements.statusPanel.className = `status-panel ${kind}`;
  elements.statusTitle.textContent = title;
  elements.statusMessage.textContent = message;
}

function displayValue(value) {
  return value || 'Not captured';
}


function priorCompanyWarningMessage(record, summary) {
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
      return null;
    }

    await ensureProjectPermission(projectHandle);

    const csvHandle = await projectHandle.getFileHandle('job-tracking.csv', { create: false });
    const csvFile = await csvHandle.getFile();
    const summary = findPriorCompanyCaptures(await csvFile.text(), record.company);
    return summary.count > 0 ? summary : null;
  } catch (error) {
    if (error?.name === 'NotFoundError') {
      return null;
    }
    return null;
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

async function runCapture() {
  clearResult();
  elements.captureButton.disabled = true;
  setStatus('capturing', 'Capturing', 'Reading the active tab.');

  try {
    const tab = await getActiveTab();
    const [injectionResult] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: captureActivePage
    });

    const result = injectionResult?.result;
    if (!result) {
      throw new Error('The active tab did not return a capture result.');
    }

    setResult(result);
    if (result.ok) {
      lastCaptureRecord = result.record;
      elements.notesInput.value = lastCaptureRecord.notes || '';
      updateSaveButton();
      const folderStatus = await getProjectFolderStatus();
      const priorCompany = await findPriorCompanyWarning(lastCaptureRecord);
      if (priorCompany) {
        setStatus('warning', 'Previously captured company', priorCompanyWarningMessage(lastCaptureRecord, priorCompany));
      } else if (folderStatus.configured) {
        setStatus('captured', 'Captured', 'Structured job fields captured. Review the summary, then save to your project folder.');
      } else {
        setStatus('captured', 'Captured', 'Structured job fields captured. Configure a project folder in Options before saving.');
      }
    } else {
      setStatus('unsupported', 'Unsupported Page', result.message || 'This page is not supported yet.');
    }
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

async function consumeAutoCaptureIntent() {
  const values = await chrome.storage.session.get(AUTO_CAPTURE_INTENT_KEY);
  const intent = values[AUTO_CAPTURE_INTENT_KEY];
  await chrome.storage.session.remove(AUTO_CAPTURE_INTENT_KEY);

  if (!intent) {
    return;
  }

  if (intent.error) {
    setStatus('error', 'Shortcut Failed', intent.error);
    return;
  }

  const isFresh = Date.now() - Number(intent.createdAt || 0) <= AUTO_CAPTURE_INTENT_TTL_MS;
  if (intent.autoCapture && isFresh) {
    await runCapture();
  }
}

elements.captureButton.addEventListener('click', runCapture);
elements.saveButton.addEventListener('click', runSave);
elements.optionsButton.addEventListener('click', openOptions);
updateSaveButton();
consumeAutoCaptureIntent().catch((error) => {
  setStatus('error', 'Shortcut Failed', error.message || String(error));
});