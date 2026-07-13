import { captureActivePage } from '../content/captureActivePage.js';
import { ensureProjectReadPermission, getProjectFolderStatus, getStoredProjectFolder } from '../shared/projectFolderStore.js';
import { findCachedPriorCompanyWarning, findPriorCompanyInCache, refreshPriorCompanyCache } from '../shared/priorCompanyCache.js';

const AUTO_CAPTURE_INTENT_KEY = 'popupIntent';
const AUTO_CAPTURE_READY_MESSAGE = 'popupIntentReady';

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error('No active tab is available.');
  }
  return tab;
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

async function captureActiveTabForPopup() {
  const tab = await getActiveTab();
  const [injectionResult] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: captureActivePage
  });

  const result = injectionResult?.result;
  if (!result) {
    throw new Error('The active tab did not return a capture result.');
  }

  const folderStatus = result.ok ? await getProjectFolderStatus() : null;
  const priorCompany = result.ok ? await findPriorCompanyWarning(result.record) : null;

  return {
    result,
    folderStatus,
    priorCompany
  };
}

async function storeShortcutIntent(intent) {
  await chrome.storage.session.set({ [AUTO_CAPTURE_INTENT_KEY]: intent });
}

async function notifyPopupIntentReady() {
  await chrome.runtime.sendMessage({ type: AUTO_CAPTURE_READY_MESSAGE }).catch(() => {});
}

async function openPopup() {
  if (!chrome.action?.openPopup) {
    throw new Error('chrome.action.openPopup is not available in this browser.');
  }

  await chrome.action.openPopup();
}

async function finishShortcutCapture(createdAt) {
  try {
    const capture = await captureActiveTabForPopup();
    await storeShortcutIntent({
      autoCapture: true,
      pending: false,
      createdAt,
      capture
    });
  } catch (error) {
    await storeShortcutIntent({
      autoCapture: false,
      pending: false,
      createdAt,
      error: error.message || String(error)
    });
  }

  await notifyPopupIntentReady();
}

chrome.commands.onCommand.addListener((command) => {
  if (command !== 'capture-active-tab') {
    return;
  }

  const createdAt = Date.now();
  storeShortcutIntent({
    autoCapture: true,
    pending: true,
    createdAt
  })
    .then(() => {
      finishShortcutCapture(createdAt);
      return openPopup();
    })
    .catch(async (error) => {
      await storeShortcutIntent({
        autoCapture: false,
        pending: false,
        createdAt,
        error: error.message || String(error)
      });
      await notifyPopupIntentReady();
    });
});