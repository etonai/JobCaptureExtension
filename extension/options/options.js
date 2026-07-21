import {
  chooseProjectFolder,
  forgetProjectFolder,
  getProjectFolderStatus,
  getStoredProjectFolder,
  isFileSystemAccessAvailable,
  queryProjectPermission
} from '../shared/projectFolderStore.js';
import { clearPriorCompanyCache, refreshPriorCompanyCache } from '../shared/priorCompanyCache.js';
import { initializeProjectStructure } from '../shared/saveListing.js';
import {
  loadRecentPostingsAgeSetting,
  recentPostingsAgeOptions,
  saveRecentPostingsAgeSetting
} from '../shared/recentPostingsSettings.js';
import { loadJobSearchSettings, saveJobSearchSettings } from '../shared/jobSearchSettings.js';

const elements = {
  apiStatus: document.querySelector('#apiStatus'),
  folderStatus: document.querySelector('#folderStatus'),
  permissionStatus: document.querySelector('#permissionStatus'),
  folderDetails: document.querySelector('#folderDetails'),
  chooseFolderButton: document.querySelector('#chooseFolderButton'),
  validateButton: document.querySelector('#validateButton'),
  forgetFolderButton: document.querySelector('#forgetFolderButton'),
  log: document.querySelector('#log'),
  recentPostingsAgeGroup: document.querySelector('#recentPostingsAgeGroup'),
  recentPostingsAgeStatus: document.querySelector('#recentPostingsAgeStatus'),
  jobSearchKeywordsInput: document.querySelector('#jobSearchKeywordsInput'),
  jobSearchGeoIdInput: document.querySelector('#jobSearchGeoIdInput'),
  jobSearchStatus: document.querySelector('#jobSearchStatus')
};

function timestamp() {
  return new Date().toLocaleTimeString();
}

function log(message, detail) {
  const suffix = detail ? ` ${detail}` : '';
  elements.log.textContent += `[${timestamp()}] ${message}${suffix}\n`;
  elements.log.scrollTop = elements.log.scrollHeight;
}

function permissionLabel(permission) {
  if (permission === 'granted') return 'Granted';
  if (permission === 'prompt') return 'Needs reconnect';
  if (permission === 'denied') return 'Denied';
  if (permission === 'missing') return 'Missing';
  return permission || 'Unknown';
}

async function refreshStatus() {
  const status = await getProjectFolderStatus();
  elements.apiStatus.textContent = status.apiAvailable ? 'Available' : 'Unavailable';
  elements.folderStatus.textContent = status.configured ? 'Configured' : 'Not configured';
  elements.permissionStatus.textContent = permissionLabel(status.permission);
  elements.validateButton.disabled = !status.configured;
  elements.forgetFolderButton.disabled = !status.configured;

  if (!status.apiAvailable) {
    elements.folderDetails.textContent = 'File System Access API is not available in this browser context.';
  } else if (!status.configured) {
    elements.folderDetails.textContent = 'No project folder is configured yet.';
  } else {
    elements.folderDetails.textContent = `Configured folder: ${status.folderName || 'Selected folder'}`;
  }
}

async function runAction(label, action) {
  log(`Starting: ${label}`);
  try {
    await action();
    await refreshStatus();
    log(`Succeeded: ${label}`);
  } catch (error) {
    await refreshStatus().catch(() => {});
    log(`Failed: ${label}.`, error.message || String(error));
  }
}

async function chooseFolder() {
  await chooseProjectFolder();
  const handle = await getStoredProjectFolder();
  await initializeProjectStructure(handle);
  await refreshPriorCompanyCache(handle);
}

async function validateStructure() {
  const handle = await getStoredProjectFolder();
  await initializeProjectStructure(handle);
  await refreshPriorCompanyCache(handle);
  const permission = await queryProjectPermission(handle);
  log('Project structure is ready.', `Permission: ${permission}`);
}

async function forgetFolder() {
  await forgetProjectFolder();
  await clearPriorCompanyCache();
}

elements.chooseFolderButton.addEventListener('click', () => runAction('choose project folder', chooseFolder));
elements.validateButton.addEventListener('click', () => runAction('validate project structure', validateStructure));
elements.forgetFolderButton.addEventListener('click', () => runAction('forget project folder', forgetFolder));

function buildRecentPostingsAgeGroup(selectedValue) {
  elements.recentPostingsAgeGroup.querySelectorAll('.radio-option').forEach((node) => node.remove());

  for (const option of recentPostingsAgeOptions()) {
    const wrapper = document.createElement('div');
    wrapper.className = 'radio-option';

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'recentPostingsAge';
    input.id = `recentPostingsAge_${option.value}`;
    input.value = option.value;
    input.checked = option.value === selectedValue;
    input.addEventListener('change', () => {
      if (input.checked) {
        selectRecentPostingsAge(option.value);
      }
    });

    const label = document.createElement('label');
    label.setAttribute('for', input.id);
    label.textContent = option.label;

    wrapper.append(input, label);
    elements.recentPostingsAgeGroup.append(wrapper);
  }
}

async function selectRecentPostingsAge(value) {
  elements.recentPostingsAgeStatus.textContent = 'Saving...';
  try {
    await saveRecentPostingsAgeSetting(value);
    elements.recentPostingsAgeStatus.textContent = 'Saved.';
    log('Saved Recent Postings age filter.', value);
  } catch (error) {
    elements.recentPostingsAgeStatus.textContent = 'Failed to save preference.';
    log('Failed to save Recent Postings age filter.', error.message || String(error));
  }
}

async function initRecentPostingsAgeGroup() {
  const selectedValue = await loadRecentPostingsAgeSetting();
  buildRecentPostingsAgeGroup(selectedValue);
  elements.recentPostingsAgeStatus.textContent = 'Loaded saved preference.';
}

async function saveJobSearchFromInputs() {
  elements.jobSearchStatus.textContent = 'Saving...';
  try {
    const saved = await saveJobSearchSettings({
      keywords: elements.jobSearchKeywordsInput.value,
      geoId: elements.jobSearchGeoIdInput.value,
      timeframeSeconds: 86400
    });
    elements.jobSearchStatus.textContent = 'Saved.';
    log('Saved Job Search configuration.', `keywords="${saved.keywords}" geoId="${saved.geoId}"`);
  } catch (error) {
    elements.jobSearchStatus.textContent = 'Failed to save preference.';
    log('Failed to save Job Search configuration.', error.message || String(error));
  }
}

async function initJobSearchFields() {
  const settings = await loadJobSearchSettings();
  elements.jobSearchKeywordsInput.value = settings.keywords;
  elements.jobSearchGeoIdInput.value = settings.geoId;
  elements.jobSearchStatus.textContent = 'Loaded saved preference.';

  elements.jobSearchKeywordsInput.addEventListener('change', saveJobSearchFromInputs);
  elements.jobSearchGeoIdInput.addEventListener('change', saveJobSearchFromInputs);
}

async function init() {
  if (!isFileSystemAccessAvailable()) {
    log('File System Access API is unavailable in this browser context.');
  }
  await refreshStatus();
  await initRecentPostingsAgeGroup();
  await initJobSearchFields();
  log('Options loaded.');
}

init();