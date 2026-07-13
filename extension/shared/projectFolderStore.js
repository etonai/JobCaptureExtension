const DB_NAME = 'job-capture-project-folder';
const DB_VERSION = 1;
const STORE_NAME = 'handles';
const PROJECT_HANDLE_KEY = 'projectFolder';
const PROJECT_META_KEY = 'projectFolderMeta';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet(key) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

async function idbSet(key, value) {
  const db = await openDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

async function idbDelete(key) {
  const db = await openDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export function isFileSystemAccessAvailable() {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window && typeof indexedDB !== 'undefined';
}

export async function getStoredProjectFolder() {
  return await idbGet(PROJECT_HANDLE_KEY);
}

export async function getStoredProjectFolderMeta() {
  return await idbGet(PROJECT_META_KEY);
}

export async function storeProjectFolder(handle) {
  const meta = {
    name: handle.name || 'Selected folder',
    configuredAt: new Date().toISOString()
  };
  await idbSet(PROJECT_HANDLE_KEY, handle);
  await idbSet(PROJECT_META_KEY, meta);
  return meta;
}

export async function forgetProjectFolder() {
  await idbDelete(PROJECT_HANDLE_KEY);
  await idbDelete(PROJECT_META_KEY);
}

export async function chooseProjectFolder() {
  if (!isFileSystemAccessAvailable()) {
    throw new Error('Project folder access is not available in this browser context.');
  }
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
  return await storeProjectFolder(handle);
}

export async function queryProjectPermission(handle) {
  if (!handle) {
    return 'missing';
  }
  if (typeof handle.queryPermission !== 'function') {
    return 'unsupported';
  }
  return await handle.queryPermission({ mode: 'readwrite' });
}

export async function ensureProjectReadPermission(handle) {
  if (!handle) {
    throw new Error('Project folder is not configured. Open Options and choose a project folder.');
  }

  if (typeof handle.queryPermission !== 'function') {
    return 'unsupported';
  }

  const current = await handle.queryPermission({ mode: 'read' });
  if (current === 'granted') {
    return 'granted';
  }
  if (typeof handle.requestPermission !== 'function') {
    throw new Error(`Project folder read permission is ${current}. Reconnect the folder from Options.`);
  }

  const requested = await handle.requestPermission({ mode: 'read' });
  if (requested !== 'granted') {
    throw new Error(`Project folder read permission was not granted. Current permission: ${requested}`);
  }
  return requested;
}

export async function ensureProjectPermission(handle) {
  if (!handle) {
    throw new Error('Project folder is not configured. Open Options and choose a project folder.');
  }

  const current = await queryProjectPermission(handle);
  if (current === 'granted') {
    return 'granted';
  }
  if (typeof handle.requestPermission !== 'function') {
    throw new Error(`Project folder permission is ${current}. Reconnect the folder from Options.`);
  }

  const requested = await handle.requestPermission({ mode: 'readwrite' });
  if (requested !== 'granted') {
    throw new Error(`Project folder read/write permission was not granted. Current permission: ${requested}`);
  }
  return requested;
}

export async function getProjectFolderStatus() {
  const handle = await getStoredProjectFolder();
  const meta = await getStoredProjectFolderMeta();
  const permission = handle ? await queryProjectPermission(handle) : 'missing';
  return {
    apiAvailable: isFileSystemAccessAvailable(),
    configured: Boolean(handle),
    folderName: handle?.name || meta?.name || '',
    permission,
    configuredAt: meta?.configuredAt || ''
  };
}