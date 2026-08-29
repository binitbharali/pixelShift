/**
 * PixelShift Conversion Engine - Core Transformation Subsystem
 * Converts images entirely on the client side using HTML5 Canvas & Binary Encoders.
 */

import { ConversionOptions, ConversionResult, SupportedFormat } from '../types';
import { canvasToBmpBlob, canvasToIcoBlob, canvasToGifBlob } from './binaryImages';

/**
 * Loads an image from a URL, data URL, or Blob into an HTMLImageElement safely.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => resolve(img);
    img.onerror = (err) => {
      // Retry once without crossOrigin attribute if it failed (e.g. data URLs or local files)
      if (img.crossOrigin === 'anonymous') {
        const fallbackImg = new Image();
        fallbackImg.onload = () => resolve(fallbackImg);
        fallbackImg.onerror = () => reject(new Error('Failed to load image from source'));
        fallbackImg.src = src;
      } else {
        reject(err);
      }
    };

    img.src = src;
  });
}

/**
 * Converts SVG text or Blob to clean, well-formed SVG string with XML namespaces
 */
export async function convertToSvg(
  src: string,
  width: number,
  height: number
): Promise<{ svgContent: string; dataUrl: string; blob: Blob }> {
  let innerContent = '';

  if (src.startsWith('data:image/svg+xml')) {
    const raw = decodeURIComponent(src.replace(/^data:image\/svg\+xml;[^,]*,/, ''));
    innerContent = raw;
  } else {
    // Wrap raster image cleanly inside an SVG container
    const img = await loadImage(src);
    const canvas = document.createElement('canvas');
    canvas.width = width || img.naturalWidth || 800;
    canvas.height = height || img.naturalHeight || 600;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
    const pngUri = canvas.toDataURL('image/png');

    innerContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">
  <image width="${canvas.width}" height="${canvas.height}" xlink:href="${pngUri}" />
</svg>`;
  }

  const blob = new Blob([innerContent], { type: 'image/svg+xml;charset=utf-8' });
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(innerContent)}`;

  return { svgContent: innerContent, dataUrl, blob };
}

/**
 * Main Conversion Pipeline
 */
export async function convertImage(
  src: string,
  options: ConversionOptions
): Promise<ConversionResult> {
  const startTime = performance.now();

  try {
    // 1. Special Handling for SVG Vector Target
    if (options.targetFormat === 'svg') {
      try {
        const svgRes = await convertToSvg(src, options.width || 0, options.height || 0);
        return {
          success: true,
          blob: svgRes.blob,
          dataUrl: svgRes.dataUrl,
          sizeBytes: svgRes.blob.size,
          targetFormat: 'svg',
          width: options.width || 800,
          height: options.height || 600,
        };
      } catch (err) {
        return {
          success: false,
          blob: null,
          dataUrl: null,
          sizeBytes: 0,
          targetFormat: 'svg',
          width: 0,
          height: 0,
          errorMessage: 'Conversion not possible',
          error: err instanceof Error ? err.message : 'Unknown conversion error',
        };
      }
    }

    // 2. Decode Source Image
    let img: HTMLImageElement;
    try {
      img = await loadImage(src);
    } catch (loadErr) {
      return {
        success: false,
        blob: null,
        dataUrl: null,
        sizeBytes: 0,
        targetFormat: options.targetFormat,
        width: 0,
        height: 0,
        errorMessage: 'Conversion not possible',
        error: 'Cannot decode source image. ' + (loadErr instanceof Error ? loadErr.message : ''),
      };
    }

    const naturalWidth = img.naturalWidth || img.width;
    const naturalHeight = img.naturalHeight || img.height;

    if (!naturalWidth || !naturalHeight || naturalWidth <= 0 || naturalHeight <= 0) {
      return {
        success: false,
        blob: null,
        dataUrl: null,
        sizeBytes: 0,
        targetFormat: options.targetFormat,
        width: 0,
        height: 0,
        errorMessage: 'Conversion not possible',
        error: 'Invalid image dimensions',
      };
    }

    // 3. Calculate Target Output Dimensions
    let finalWidth = options.width || naturalWidth;
    let finalHeight = options.height || naturalHeight;

    if (options.maintainAspectRatio) {
      const srcRatio = naturalWidth / naturalHeight;
      if (options.width && !options.height) {
        finalHeight = Math.round(options.width / srcRatio);
      } else if (options.height && !options.width) {
        finalWidth = Math.round(options.height * srcRatio);
      } else if (options.width && options.height) {
        const destRatio = options.width / options.height;
        if (destRatio > srcRatio) {
          finalWidth = Math.round(options.height * srcRatio);
        } else {
          finalHeight = Math.round(options.width / srcRatio);
        }
      }
    }

    // Guard bounds (1px to 16384px)
    finalWidth = Math.min(16384, Math.max(1, finalWidth));
    finalHeight = Math.min(16384, Math.max(1, finalHeight));

    // 4. Render to Canvas
    const canvas = document.createElement('canvas');
    canvas.width = finalWidth;
    canvas.height = finalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      return {
        success: false,
        blob: null,
        dataUrl: null,
        sizeBytes: 0,
        targetFormat: options.targetFormat,
        width: finalWidth,
        height: finalHeight,
        errorMessage: 'Conversion not possible',
        error: 'Canvas 2D context unavailable',
      };
    }

    // High quality bicubic scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Apply Background Matte if converting to opaque format or user specified
    const isOpaqueTarget = options.targetFormat === 'jpeg' || options.targetFormat === 'bmp';
    const bgColor = options.backgroundColor || (isOpaqueTarget ? '#ffffff' : null);

    if (bgColor) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, finalWidth, finalHeight);
    }

    // Draw Source Image
    ctx.drawImage(img, 0, 0, finalWidth, finalHeight);

    // 5. Binary & Raster Encoding Pipeline
    let resultBlob: Blob | null = null;
    let resultDataUrl: string | null = null;

    if (options.targetFormat === 'ico') {
      try {
        resultBlob = await canvasToIcoBlob(canvas);
        resultDataUrl = URL.createObjectURL(resultBlob);
      } catch {
        resultBlob = null;
      }
    } else if (options.targetFormat === 'bmp') {
      try {
        resultBlob = canvasToBmpBlob(canvas);
        resultDataUrl = URL.createObjectURL(resultBlob);
      } catch {
        resultBlob = null;
      }
    } else if (options.targetFormat === 'gif') {
      try {
        resultBlob = canvasToGifBlob(canvas);
        resultDataUrl = URL.createObjectURL(resultBlob);
      } catch {
        resultBlob = null;
      }
    } else {
      // Standard raster formats: jpeg, png, webp, avif
      const mimeMap: Record<SupportedFormat, string> = {
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
        avif: 'image/avif',
        svg: 'image/svg+xml',
        gif: 'image/gif',
        bmp: 'image/bmp',
        ico: 'image/x-icon',
      };

      const mimeType = mimeMap[options.targetFormat] || 'image/png';
      const quality = typeof options.quality === 'number' ? Math.max(0.01, Math.min(1, options.quality)) : 0.92;

      resultBlob = await new Promise<Blob | null>((resolve) => {
        try {
          canvas.toBlob(
            (b) => {
              // Strictly verify that the browser actually encoded to the requested MIME type
              // If the browser fell back to 'image/png' for an unsupported format, do not accept as valid
              if (b && (b.type === mimeType || (mimeType === 'image/jpeg' && b.type === 'image/jpeg') || (mimeType === 'image/png' && b.type === 'image/png'))) {
                resolve(b);
              } else if (b && b.type === mimeType) {
                resolve(b);
              } else {
                // Unsupported mime format in this environment - do not silently fallback
                resolve(null);
              }
            },
            mimeType,
            quality
          );
        } catch {
          resolve(null);
        }
      });

      if (resultBlob) {
        resultDataUrl = URL.createObjectURL(resultBlob);
      }
    }

    // 6. Strict Validation Check
    if (!resultBlob || resultBlob.size === 0) {
      return {
        success: false,
        blob: null,
        dataUrl: null,
        sizeBytes: 0,
        targetFormat: options.targetFormat,
        width: finalWidth,
        height: finalHeight,
        errorMessage: 'Conversion not possible',
        error: `Encoding to ${options.targetFormat.toUpperCase()} not supported or failed`,
      };
    }

    return {
      success: true,
      blob: resultBlob,
      dataUrl: resultDataUrl,
      sizeBytes: resultBlob.size,
      targetFormat: options.targetFormat,
      width: finalWidth,
      height: finalHeight,
    };
  } catch (error) {
    return {
      success: false,
      blob: null,
      dataUrl: null,
      sizeBytes: 0,
      targetFormat: options.targetFormat,
      width: 0,
      height: 0,
      errorMessage: 'Conversion not possible',
      error: error instanceof Error ? error.message : 'Unknown conversion failure',
    };
  }
}