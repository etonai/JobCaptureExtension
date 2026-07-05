import { captureActivePage } from '../content/captureActivePage.js';

const elements = {
  captureButton: document.querySelector('#captureButton'),
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

function setStatus(kind, title, message) {
  elements.statusPanel.className = `status-panel ${kind}`;
  elements.statusTitle.textContent = title;
  elements.statusMessage.textContent = message;
}

function displayValue(value) {
  return value || 'Not captured';
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
  elements.resultPanel.classList.add('hidden');
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
      setStatus('captured', 'Captured', 'Structured job fields captured for review. Saving is planned for a later DevCycle.');
    } else {
      setStatus('unsupported', 'Unsupported Page', result.message || 'This page is not supported yet.');
    }
  } catch (error) {
    setStatus('error', 'Capture Failed', error.message || String(error));
  } finally {
    elements.captureButton.disabled = false;
  }
}

function openOptions() {
  chrome.runtime.openOptionsPage();
}

elements.captureButton.addEventListener('click', runCapture);
elements.optionsButton.addEventListener('click', openOptions);
