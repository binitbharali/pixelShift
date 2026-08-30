// PixelShift Background Service Worker (Manifest V3)

// 1. Setup Context Menus and Installation lifecycle
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "pixelshift-parent",
    title: "Convert Image with PixelShift",
    contexts: ["image"]
  });

  const formats = [
    { id: "convert-png", title: "Quick Convert to PNG" },
    { id: "convert-jpeg", title: "Quick Convert to JPG" },
    { id: "convert-webp", title: "Quick Convert to WebP" },
    { id: "convert-svg", title: "Convert to Vector SVG" }
  ];

  formats.forEach(f => {
    chrome.contextMenus.create({
      id: f.id,
      parentId: "pixelshift-parent",
      title: f.title,
      contexts: ["image"]
    });
  });

  console.log("PixelShift Service Worker initialized successfully.");
});

// 2. Handle Context Menu clicks on images
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!info.srcUrl) return;

  const formatMap = {
    "convert-png": "png",
    "convert-jpeg": "jpeg",
    "convert-webp": "webp",
    "convert-svg": "svg"
  };

  const targetFormat = formatMap[info.menuItemId];
  if (targetFormat && tab?.id) {
    // Notify the active tab / popup to process conversion
    chrome.tabs.sendMessage(tab.id, {
      action: "CONVERT_CONTEXT_IMAGE",
      srcUrl: info.srcUrl,
      format: targetFormat
    });
  }
});

// 3. Handle Download Requests from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "DOWNLOAD_IMAGE") {
    chrome.downloads.download({
      url: request.url,
      filename: request.filename || "pixelshift_converted.png",
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error("Download failed:", chrome.runtime.lastError.message);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, downloadId });
      }
    });
    return true; // Keep channel open for async response
  }
});