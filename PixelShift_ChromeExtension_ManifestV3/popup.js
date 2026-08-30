let extracted = [];
let selectedIndex = 0;

const scanBtn = document.getElementById('scanBtn');
const dropBox = document.getElementById('dropBox');
const fileInput = document.getElementById('fileInput');
const convertBtn = document.getElementById('convertBtn');
const statusEl = document.getElementById('status');

// 1. Scan Page
scanBtn.addEventListener('click', async () => {
  statusEl.innerText = 'Scanning webpage images...';
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    statusEl.innerText = 'Cannot access active tab.';
    return;
  }
  chrome.tabs.sendMessage(tab.id, { action: 'SCAN_PAGE' }, (res) => {
    if (chrome.runtime.lastError || !res) {
      statusEl.innerText = 'Unable to scan this page. Drop image files directly!';
      return;
    }
    if (res && res.images) {
      const pageImages = res.images.map(img => ({ ...img, isDrop: false }));
      // Keep dropped files if any
      const droppedOnly = extracted.filter(i => i.isDrop);
      extracted = [...droppedOnly, ...pageImages];
      selectedIndex = 0;
      renderGallery();
      statusEl.innerText = 'Found ' + pageImages.length + ' images on ' + (res.title || 'page');
    }
  });
});

// 2. Embedded Drag & Drop Box Handlers
dropBox.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files.length > 0) {
    handleFiles(e.target.files);
    e.target.value = '';
  }
});

['dragenter', 'dragover'].forEach(eventName => {
  dropBox.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropBox.classList.add('dragover');
  });
  document.body.addEventListener(eventName, (e) => e.preventDefault());
});

['dragleave', 'drop'].forEach(eventName => {
  dropBox.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropBox.classList.remove('dragover');
  });
});

dropBox.addEventListener('drop', (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (e.dataTransfer && e.dataTransfer.files.length > 0) {
    handleFiles(e.dataTransfer.files);
  }
});

// Clipboard Paste
window.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  const files = [];
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const file = items[i].getAsFile();
      if (file) files.push(file);
    }
  }
  if (files.length > 0) handleFiles(files);
});

function handleFiles(files) {
  const newItems = [];
  Array.from(files).forEach((file, i) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target.result;
      const item = {
        src,
        fileName: file.name.replace(/\.[^/.]+$/, ""),
        originalFormat: ext,
        width: 800,
        height: 600,
        isDrop: true
      };
      extracted.unshift(item);
      selectedIndex = 0;
      renderGallery();
      statusEl.innerText = 'Added ' + file.name + ' to converter.';
    };
    reader.readAsDataURL(file);
  });
}

function renderGallery() {
  const gal = document.getElementById('gallery');
  gal.innerHTML = '';
  if (extracted.length === 0) {
    gal.innerHTML = '<div class="empty-state">No images loaded yet.<br/>Scan active webpage or drop images above.</div>';
    return;
  }
  extracted.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'card' + (idx === selectedIndex ? ' selected' : '');
    
    const img = document.createElement('img');
    img.src = item.src;
    div.appendChild(img);

    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.innerText = (item.originalFormat || 'img').toUpperCase();
    div.appendChild(tag);

    if (item.isDrop) {
      const dropTag = document.createElement('span');
      dropTag.className = 'drop-tag';
      dropTag.innerText = 'DROP';
      div.appendChild(dropTag);
    }

    div.onclick = () => {
      selectedIndex = idx;
      renderGallery();
    };
    gal.appendChild(div);
  });
}

// 3. Local Canvas Converter & Downloader
convertBtn.addEventListener('click', async () => {
  if (!extracted[selectedIndex]) {
    statusEl.innerText = 'Please select or drop an image first.';
    return;
  }
  const item = extracted[selectedIndex];
  const fmt = document.getElementById('formatSelect').value;
  statusEl.innerText = 'Converting to ' + fmt.toUpperCase() + '...';
  
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const w = img.naturalWidth || img.width || 800;
      const h = img.naturalHeight || img.height || 600;

      if (!w || !h || w <= 0 || h <= 0) {
        statusEl.innerText = 'Conversion not possible';
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        statusEl.innerText = 'Conversion not possible';
        return;
      }

      if (fmt === 'jpeg' || fmt === 'jpg' || fmt === 'bmp') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
      }
      ctx.drawImage(img, 0, 0, w, h);

      let dataUrl = '';
      const ext = fmt === 'jpeg' ? 'jpg' : fmt;
      const safeName = (item.fileName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'image') + '.' + ext;

      if (fmt === 'svg') {
        const pngUri = canvas.toDataURL('image/png');
        const svgContent = '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '"><image width="' + w + '" height="' + h + '" href="' + pngUri + '" /></svg>';
        dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgContent);
      } else if (fmt === 'jpeg' || fmt === 'jpg') {
        dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        if (!dataUrl.startsWith('data:image/jpeg')) {
          statusEl.innerText = 'Conversion not possible';
          return;
        }
      } else if (fmt === 'webp') {
        dataUrl = canvas.toDataURL('image/webp', 0.92);
        if (!dataUrl.startsWith('data:image/webp')) {
          statusEl.innerText = 'Conversion not possible';
          return;
        }
      } else if (fmt === 'png') {
        dataUrl = canvas.toDataURL('image/png');
        if (!dataUrl.startsWith('data:image/png')) {
          statusEl.innerText = 'Conversion not possible';
          return;
        }
      } else {
        // Formats not directly convertible by canvas without additional native codecs
        // Strictly prevent disguised/fallback download
        statusEl.innerText = 'Conversion not possible';
        return;
      }

      if (!dataUrl) {
        statusEl.innerText = 'Conversion not possible';
        return;
      }

      chrome.runtime.sendMessage({
        action: 'DOWNLOAD_IMAGE',
        url: dataUrl,
        filename: safeName
      });
      statusEl.innerText = 'Converted & downloaded ' + safeName + '!';
    } catch (err) {
      statusEl.innerText = 'Conversion not possible';
    }
  };
  img.onerror = () => {
    statusEl.innerText = 'Conversion not possible';
  };
  img.src = item.src;
});
