/**
 * Image Metadata Extraction Engine
 */
import { ImageMetadata, SupportedFormat } from '../types';
import { sanitizeFileName, formatFileSize } from './filename';

/**
 * Extracts complete metadata from an image File or Blob object
 */
export async function extractFileMetadata(file: File): Promise<ImageMetadata> {
  const objectUrl = URL.createObjectURL(file);
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const cleanName = sanitizeFileName(file.name.replace(/\.[^/.]+$/, ''));

  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = () => {
      const width = img.naturalWidth || 800;
      const height = img.naturalHeight || 600;
      const aspectRatio = Number((width / Math.max(1, height)).toFixed(2));

      // Inspect transparency by sampling canvas pixels
      const hasAlpha = checkCanvasAlpha(img);

      resolve({
        id: `meta_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        src: objectUrl,
        originalFormat: ext,
        fileName: cleanName,
        width,
        height,
        fileSizeBytes: file.size,
        aspectRatio,
        sourceType: 'upload',
        altText: file.name,
        isTransparent: hasAlpha,
      });
    };

    img.onerror = () => {
      // Fallback for unrenderable or SVG files
      resolve({
        id: `meta_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        src: objectUrl,
        originalFormat: ext,
        fileName: cleanName,
        width: 800,
        height: 600,
        fileSizeBytes: file.size,
        aspectRatio: 1.33,
        sourceType: 'upload',
        altText: file.name,
      });
    };

    img.src = objectUrl;
  });
}

/**
 * Checks if the image contains transparent or semi-transparent pixels
 */
export function checkCanvasAlpha(img: HTMLImageElement): boolean {
  try {
    const sampleWidth = Math.min(100, img.naturalWidth || 100);
    const sampleHeight = Math.min(100, img.naturalHeight || 100);
    const canvas = document.createElement('canvas');
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    ctx.drawImage(img, 0, 0, sampleWidth, sampleHeight);
    const imgData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
    const data = imgData.data;

    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) {
        return true; // Transparent pixel found
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Parses basic EXIF metadata tags from JPEG ArrayBuffers
 */
export function extractBasicExif(arrayBuffer: ArrayBuffer): Record<string, string | number> {
  const dataView = new DataView(arrayBuffer);
  const tags: Record<string, string | number> = {};

  try {
    // Check for JPEG SOI marker 0xFFD8
    if (dataView.getUint16(0, false) !== 0xFFD8) return tags;

    let offset = 2;
    const length = dataView.byteLength;

    while (offset < length) {
      const marker = dataView.getUint16(offset, false);
      offset += 2;

      // APP1 Marker for Exif (0xFFE1)
      if (marker === 0xFFE1) {
        const app1Length = dataView.getUint16(offset, false);
        offset += 2;

        // Check for 'Exif\0\0' string
        if (dataView.getUint32(offset, false) === 0x45786966) {
          tags['Header'] = 'EXIF Metadata Present';
          tags['App1BlockSize'] = app1Length;
        }
        break;
      } else if ((marker & 0xFF00) !== 0xFF00) {
        break;
      } else {
        offset += dataView.getUint16(offset, false);
      }
    }
  } catch {
    // Ignore malformed EXIF
  }

  return tags;
}