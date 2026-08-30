// PixelShift Manifest V3 Service Worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('PixelShift extension installed successfully.');
});

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'DOWNLOAD_IMAGE') {
    chrome.downloads.download({
      url: message.url,
      filename: message.filename || 'pixelshift_image.png',
      saveAs: false
    }, (downloadId) => {
      sendResponse({ success: true, downloadId });
    });
    return true; // Keep message channel open for async response
  }
  
  if (message.action === 'PING') {
    sendResponse({ status: 'active', version: '1.0.0' });
  }
});
