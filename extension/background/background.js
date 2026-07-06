const AUTO_CAPTURE_INTENT_KEY = 'popupIntent';

async function requestPopupAutoCapture() {
  await chrome.storage.session.set({
    [AUTO_CAPTURE_INTENT_KEY]: {
      autoCapture: true,
      createdAt: Date.now()
    }
  });
}

async function openPopup() {
  if (!chrome.action?.openPopup) {
    throw new Error('chrome.action.openPopup is not available in this browser.');
  }

  await chrome.action.openPopup();
}

chrome.commands.onCommand.addListener((command) => {
  if (command !== 'capture-active-tab') {
    return;
  }

  requestPopupAutoCapture()
    .then(openPopup)
    .catch(async (error) => {
      await chrome.storage.session.set({
        [AUTO_CAPTURE_INTENT_KEY]: {
          autoCapture: false,
          createdAt: Date.now(),
          error: error.message || String(error)
        }
      });
    });
});