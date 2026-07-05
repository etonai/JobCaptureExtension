import {
  chooseProjectFolder,
  forgetProjectFolder,
  getProjectFolderStatus,
  getStoredProjectFolder,
  isFileSystemAccessAvailable,
  queryProjectPermission
} from '../shared/projectFolderStore.js';
import { initializeProjectStructure } from '../shared/saveListing.js';

const elements = {
  apiStatus: document.querySelector('#apiStatus'),
  folderStatus: document.querySelector('#folderStatus'),
  permissionStatus: document.querySelector('#permissionStatus'),
  folderDetails: document.querySelector('#folderDetails'),
  chooseFolderButton: document.querySelector('#chooseFolderButton'),
  validateButton: document.querySelector('#validateButton'),
  forgetFolderButton: document.querySelector('#forgetFolderButton'),
  log: document.querySelector('#log')
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
}

async function validateStructure() {
  const handle = await getStoredProjectFolder();
  await initializeProjectStructure(handle);
  const permission = await queryProjectPermission(handle);
  log('Project structure is ready.', `Permission: ${permission}`);
}

async function forgetFolder() {
  await forgetProjectFolder();
}

elements.chooseFolderButton.addEventListener('click', () => runAction('choose project folder', chooseFolder));
elements.validateButton.addEventListener('click', () => runAction('validate project structure', validateStructure));
elements.forgetFolderButton.addEventListener('click', () => runAction('forget project folder', forgetFolder));

async function init() {
  if (!isFileSystemAccessAvailable()) {
    log('File System Access API is unavailable in this browser context.');
  }
  await refreshStatus();
  log('Options loaded.');
}

init();