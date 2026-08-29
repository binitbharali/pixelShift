/**
 * PixelShift DOM Image Detection Engine
 * Discovers and extracts all image sources from a DOM document.
 */

import { ImageMetadata } from '../types';
import { sanitizeFileName } from './filename';

export interface ScanOptions {
  minWidth?: number;
  minHeight?: number;
  includeSvg?: boolean;
  includeCanvas?: boolean;
  includeBackgrounds?: boolean;
  includeMeta?: boolean;
}

/**
 * Normalizes any URL into an absolute URL string.
 */
function toAbsoluteUrl(url: string, baseUrl: string = window.location.href): string {
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}

/**
 * Extracts format/extension from a URL, MIME type, or data URI.
 */
export function extractFormat(url: string): string {
  if (!url) return 'unknown';

  // Data URI handling (e.g. data:image/webp;base64,...)
  if (url.startsWith('data:image/')) {
    const mimeMatch = url.match(/^data:image\/([a-zA-Z0-9+.-]+);/);
    if (mimeMatch && mimeMatch[1]) {
      const sub = mimeMatch[1].toLowerCase();
      if (sub === 'svg+xml') return 'svg';
      if (sub === 'jpeg') return 'jpeg';
      return sub;
    }
  }

  // Standard URL extension extraction
  try {
    const cleanUrl = url.split('#')[0].split('?')[0];
    const match = cleanUrl.match(/\.([0-9a-z]+)$/i);
    if (match && match[1]) {
      const ext = match[1].toLowerCase();
      if (ext === 'jpg') return 'jpeg';
      return ext;
    }
  } catch {
    // ignore
  }

  return 'png';
}

/**
 * Core Detection Engine: Scans the target Document or DOM container
 */
export function scanDocumentImages(
  doc: Document = document,
  options: ScanOptions = {}
): ImageMetadata[] {
  const {
    minWidth = 10,
    minHeight = 10,
    includeSvg = true,
    includeCanvas = true,
    includeBackgrounds = true,
    includeMeta = true,
  } = options;

  const results: ImageMetadata[] = [];
  const seenUrls = new Set<string>();

  // Helper to add unique image
  const addImage = (
    src: string,
    sourceType: ImageMetadata['sourceType'],
    elementInfo: {
      width?: number;
      height?: number;
      alt?: string;
      title?: string;
      customName?: string;
    }
  ) => {
    if (!src || src.trim() === '') return;
    const absoluteSrc = toAbsoluteUrl(src);

    // Skip tracking pixels, tiny spacers, and duplicates
    if (seenUrls.has(absoluteSrc)) return;
    if (absoluteSrc.startsWith('data:image/gif;base64,R0lGOD')) return; // 1x1 spacer GIF

    const w = elementInfo.width || 300;
    const h = elementInfo.height || 200;
    if (w < minWidth || h < minHeight) return;

    seenUrls.add(absoluteSrc);

    const format = extractFormat(absoluteSrc);
    const fallbackName = `${sourceType}_${results.length + 1}`;
    const rawName = elementInfo.customName || elementInfo.alt || elementInfo.title || fallbackName;
    const fileName = sanitizeFileName(rawName.replace(/\.[^/.]+$/, ''));

    results.push({
      id: `img_${Date.now()}_${results.length}_${Math.random().toString(36).substring(2, 6)}`,
      src: absoluteSrc,
      originalFormat: format,
      fileName,
      width: w,
      height: h,
      aspectRatio: Number((w / Math.max(1, h)).toFixed(2)),
      sourceType,
      altText: elementInfo.alt,
    });
  };

  // 1. Scan <img> elements
  const imgElements = doc.querySelectorAll('img');
  imgElements.forEach((img, idx) => {
    const src =
      img.currentSrc ||
      img.src ||
      img.getAttribute('data-src') ||
      img.getAttribute('data-original') ||
      img.getAttribute('data-lazy-src');

    if (src) {
      addImage(src, 'img', {
        width: img.naturalWidth || img.width || parseInt(img.getAttribute('width') || '0', 10) || 300,
        height: img.naturalHeight || img.height || parseInt(img.getAttribute('height') || '0', 10) || 200,
        alt: img.alt || undefined,
        title: img.title || undefined,
        customName: img.alt ? `image_${sanitizeFileName(img.alt)}` : `page_img_${idx + 1}`,
      });
    }
  });

  // 2. Scan <picture> and <source> responsive sources
  const pictureSources = doc.querySelectorAll('picture source');
  pictureSources.forEach((source, idx) => {
    const srcset = source.getAttribute('srcset');
    if (srcset) {
      // Split candidate URLs (e.g., "image-2x.jpg 2x, image-1x.jpg 1x")
      const candidates = srcset.split(',').map((s) => s.trim().split(' ')[0]);
      candidates.forEach((candUrl) => {
        if (candUrl) {
          addImage(candUrl, 'picture', {
            width: 800,
            height: 600,
            customName: `picture_source_${idx + 1}`,
          });
        }
      });
    }
  });

  // 3. Scan CSS background-image properties
  if (includeBackgrounds) {
    const allElements = doc.querySelectorAll('*');
    allElements.forEach((el, idx) => {
      // Skip script/style elements
      if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'LINK'].includes(el.tagName)) return;

      try {
        const bg = window.getComputedStyle(el).backgroundImage;
        if (bg && bg !== 'none' && bg.includes('url(')) {
          const matches = bg.match(/url\(["']?([^"']*)["']?\)/g);
          if (matches) {
            matches.forEach((m) => {
              const cleaned = m.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
              if (cleaned && !cleaned.startsWith('data:image/svg+xml;base64,PHN2Zy')) {
                const rect = el.getBoundingClientRect();
                addImage(cleaned, 'background', {
                  width: Math.round(rect.width) || 600,
                  height: Math.round(rect.height) || 400,
                  customName: `css_background_${idx + 1}`,
                });
              }
            });
          }
        }
      } catch {
        // Ignore cross-origin access issues
      }
    });
  }

  // 4. Scan inline SVG elements
  if (includeSvg) {
    const svgElements = doc.querySelectorAll('svg');
    svgElements.forEach((svg, idx) => {
      try {
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svg);
        const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
        const rect = svg.getBoundingClientRect();
        const w = Math.round(rect.width) || parseInt(svg.getAttribute('width') || '100', 10) || 100;
        const h = Math.round(rect.height) || parseInt(svg.getAttribute('height') || '100', 10) || 100;
        const label = svg.getAttribute('aria-label') || svg.id || `vector_${idx + 1}`;

        addImage(dataUrl, 'svg', {
          width: w,
          height: h,
          customName: label,
        });
      } catch {
        // Skip un-serializable SVGs
      }
    });
  }

  // 5. Scan HTML5 Canvas snapshots
  if (includeCanvas) {
    const canvasElements = doc.querySelectorAll('canvas');
    canvasElements.forEach((cvs, idx) => {
      try {
        const dataUrl = cvs.toDataURL('image/png');
        addImage(dataUrl, 'canvas', {
          width: cvs.width || 300,
          height: cvs.height || 150,
          customName: `canvas_snapshot_${idx + 1}`,
        });
      } catch {
        // Canvas may be tainted by CORS
      }
    });
  }

  // 6. Scan Meta OpenGraph / Twitter Cards
  if (includeMeta) {
    const ogImage =
      doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
      doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content');

    if (ogImage) {
      addImage(ogImage, 'meta', {
        width: 1200,
        height: 630,
        customName: 'social_share_banner',
      });
    }
  }

  return results;
}