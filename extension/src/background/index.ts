// Background service worker (Manifest V3)
chrome.runtime.onInstalled.addListener(() => {
  console.log('[PinPoint] Extension installed successfully.');
  chrome.storage.local.set({
    pinpointRole: 'reviewer',
    pinpointEmail: 'reviewer@pinpoint.io',
  });
});
