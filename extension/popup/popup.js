import { captureActivePage } from '../content/captureActivePage.js';

const elements = {
  captureButton: document.querySelector('#captureButton'),
  optionsButton: document.querySelector('#optionsButton'),
  statusPanel: document.querySelector('#statusPanel'),
  statusTitle: document.querySelector('#statusTitle'),
  statusMessage: document.querySelector('#statusMessage'),
  resultPanel: document.querySelector('#resultPanel'),
  resultUrl: document.querySelector('#resultUrl'),
  resultTime: document.querySelector('#resultTime'),
  resultTitle: document.querySelector('#resultTitle'),
  resultHeading: document.querySelector('#resultHeading'),
  resultSignals: document.querySelector('#resultSignals')
};

function setStatus(kind, title, message) {
  elements.statusPanel.className = `status-panel ${kind}`;
  elements.statusTitle.textContent = title;
  elements.statusMessage.textContent = message;
}

function setResult(result) {
  elements.resultPanel.classList.remove('hidden');
  elements.resultUrl.textContent = result.url || '';
  elements.resultTime.textContent = result.captureTimeUtc || '';
  elements.resultTitle.textContent = result.pageTitle || '';
  elements.resultHeading.textContent = result.candidateHeading || '';
  elements.resultSignals.textContent = Object.entries(result.signals || {})
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
}

function clearResult() {
  elements.resultPanel.classList.add('hidden');
  elements.resultUrl.textContent = '';
  elements.resultTime.textContent = '';
  elements.resultTitle.textContent = '';
  elements.resultHeading.textContent = '';
  elements.resultSignals.textContent = '';
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
      setStatus('captured', 'Captured', 'Basic LinkedIn job page signal captured. Full parsing comes in a later DevCycle.');
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
