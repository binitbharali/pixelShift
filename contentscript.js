// PixelShift Content Script - DOM Image Scanner
(() => {
  function scanAllImages() {
    const images = [];
    const seen = new Set();

    // Helper function to safely extract file extensions
    const getExt = (url) => {
      try {
        const clean = url.split('#')[0].split('?')[0];
        const match = clean.match(/\.([0-9a-z]+)$/i);
        return match ? match[1].toLowerCase() : 'png';
      } catch {
        return 'png';
      }
    };

    // Helper function to clean file names
    const getFileName = (url, fallback) => {
      try {
        const clean = url.split('#')[0].split('?')[0];
        const seg = clean.split('/').filter(Boolean).pop();
        return seg ? seg.replace(/\.[^/.]+$/, "") : fallback;
      } catch {
        return fallback;
      }
    };

    // 1. Scan standard <img> tags and <picture> sources
    document.querySelectorAll('img, picture source').forEach((el, index) => {
      const src = el.src || el.currentSrc || el.getAttribute('srcset')?.split(' ')[0] || el.getAttribute('data-src');
      if (src && !seen.has(src) && !src.startsWith('data:image/svg+xml;base64,PHN2Zy')) {
        seen.add(src);
        const format = getExt(src);
        const name = el.getAttribute('alt') || getFileName(src, `image_${index + 1}`);
        images.push({
          src,
          fileName: name.replace(/[^a-zA-Z0-9_-]/g, '_'),
          originalFormat: format,
          width: el.naturalWidth || el.width || 300,
          height: el.naturalHeight || el.height || 200,
          sourceType: 'img',
          altText: el.alt || ''
        });
      }
    });

    // 2. Scan CSS background-image elements
    document.querySelectorAll('*').forEach((el, index) => {
      const bg = window.getComputedStyle(el).backgroundImage;
      if (bg && bg !== 'none' && bg.startsWith('url(')) {
        const match = bg.match(/url\(["']?([^"']*)["']?\)/);
        if (match && match[1] && !seen.has(match[1])) {
          const src = match[1];
          seen.add(src);
          images.push({
            src,
            fileName: getFileName(src, `background_${index + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_'),
            originalFormat: getExt(src),
            width: el.offsetWidth || 400,
            height: el.offsetHeight || 300,
            sourceType: 'background'
          });
        }
      }
    });

    // 3. Scan inline <svg> vector elements
    document.querySelectorAll('svg').forEach((svg, index) => {
      try {
        const s = new XMLSerializer().serializeToString(svg);
        const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
        const name = svg.getAttribute('aria-label') || svg.id || `vector_icon_${index + 1}`;
        images.push({
          src,
          fileName: name.replace(/[^a-zA-Z0-9_-]/g, '_'),
          originalFormat: 'svg',
          width: svg.clientWidth || 100,
          height: svg.clientHeight || 100,
          sourceType: 'svg'
        });
      } catch (err) {
        // Ignore un-serializable SVGs
      }
    });

    // 4. Scan meta thumbnail / OpenGraph image tags
    const og = document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
               document.querySelector('meta[name="twitter:image"]')?.getAttribute('content');
    if (og && !seen.has(og)) {
      seen.add(og);
      images.push({
        src: og,
        fileName: 'social_preview',
        originalFormat: getExt(og),
        width: 1200,
        height: 630,
        sourceType: 'meta'
      });
    }

    return images;
  }

  // Listen for SCAN_PAGE messages sent from popup.js
  chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.action === 'SCAN_PAGE') {
      const results = scanAllImages();
      sendResponse({
        success: true,
        images: results,
        title: document.title,
        url: window.location.href
      });
    }
  });
})();