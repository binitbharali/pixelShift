// PixelShift Content Script - DOM Image Scanner
(() => {
  function scanAllImages() {
    const images = [];
    const seen = new Set();

    function pushImg(src, type, el, format) {
      if (!src || seen.has(src) || src.startsWith('javascript:')) return;
      seen.add(src);
      const rect = el ? el.getBoundingClientRect() : { width: 300, height: 200 };
      const w = Math.round(rect.width || el?.naturalWidth || 300);
      const h = Math.round(rect.height || el?.naturalHeight || 200);
      images.push({
        id: 'img_' + Math.random().toString(36).substr(2, 9),
        src: src,
        originalFormat: format || (src.includes('.svg') ? 'svg' : src.includes('.webp') ? 'webp' : src.includes('.png') ? 'png' : 'jpeg'),
        fileName: src.split('/').pop().split('?')[0] || 'webpage_image',
        width: w,
        height: h,
        sourceType: type,
        altText: el?.alt || el?.title || ''
      });
    }

    // 1. img tags
    document.querySelectorAll('img').forEach(img => {
      pushImg(img.currentSrc || img.src, 'img', img);
    });

    // 2. picture sources
    document.querySelectorAll('picture source').forEach(s => {
      if (s.srcset) pushImg(s.srcset.split(',')[0].split(' ')[0], 'picture', s);
    });

    // 3. svgs
    document.querySelectorAll('svg').forEach(svg => {
      try {
        const str = new XMLSerializer().serializeToString(svg);
        pushImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(str), 'svg', svg, 'svg');
      } catch (e) {}
    });

    // 4. css background images
    document.querySelectorAll('*').forEach(el => {
      const bg = window.getComputedStyle(el).backgroundImage;
      if (bg && bg !== 'none' && bg.startsWith('url(')) {
        const m = bg.match(/url\(["']?([^"']*)["']?\)/);
        if (m && m[1]) pushImg(m[1], 'background', el);
      }
    });

    return images;
  }

  // Messaging handler
  chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.action === 'SCAN_PAGE') {
      const results = scanAllImages();
      sendResponse({ success: true, images: results, title: document.title, url: window.location.href });
    }
  });
})();
