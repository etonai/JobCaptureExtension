import { ensureProjectReadPermission, getStoredProjectFolder } from './projectFolderStore.js';

export const BLACKLIST_FILENAME = 'blacklist.txt';

export function parseBlacklistText(text) {
  return String(text ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

// blacklist.txt is optional (DevCycle035): a missing project folder or a
// missing file both mean "nothing to hide," not an error. Only a read
// failure once the file is known to exist (e.g. a lock) should throw.
export async function loadBlacklist() {
  const projectHandle = await getStoredProjectFolder();
  if (!projectHandle) {
    return { companies: [], fileFound: false, folderConfigured: false };
  }

  await ensureProjectReadPermission(projectHandle);

  let text = '';
  let fileFound = true;
  try {
    const fileHandle = await projectHandle.getFileHandle(BLACKLIST_FILENAME, { create: false });
    const file = await fileHandle.getFile();
    text = await file.text();
  } catch (error) {
    if (error?.name !== 'NotFoundError') {
      throw error;
    }
    fileFound = false;
  }

  return { companies: parseBlacklistText(text), fileFound, folderConfigured: true };
}
