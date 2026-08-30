/**
 * PixelShift Local File Handler
 * Handles file reading, format validation, memory cleanup, and batch ingestion.
 */

import { ImageMetadata, SupportedFormat } from '../types';
import { sanitizeFileName } from './filename';

export const ACCEPTED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'image/gif',
  'image/bmp',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/avif',
  'image/tiff',
];

export const ACCEPTED_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'webp', 'svg', 'gif', 'bmp', 'ico', 'avif'
];

/**
 * Checks if a given file is a valid image by MIME or extension.
 */
export function isValidImageFile(file: File): boolean {
  if (file.type && file.type.startsWith('image/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return ACCEPTED_EXTENSIONS.includes(ext);
}

/**
 * Reads a single local File and converts it into a normalized ImageMetadata object.
 */
export function processLocalFile(file: File): Promise<ImageMetadata> {
  return new Promise((resolve, reject) => {
    if (!isValidImageFile(file)) {
      return reject(new Error(`File "${file.name}" is not a supported image format.`));
    }

    const objectUrl = URL.createObjectURL(file);
    const rawExt = file.name.split('.').pop()?.toLowerCase() || 'png';
    const ext = rawExt === 'jpg' ? 'jpeg' : rawExt;
    const cleanName = sanitizeFileName(file.name.replace(/\.[^/.]+$/, ''));

    const img = new Image();

    img.onload = () => {
      const width = img.naturalWidth || img.width || 800;
      const height = img.naturalHeight || img.height || 600;
      const aspectRatio = Number((width / Math.max(1, height)).toFixed(2));

      resolve({
        id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        src: objectUrl,
        originalFormat: ext,
        fileName: cleanName,
        width,
        height,
        fileSizeBytes: file.size,
        aspectRatio,
        sourceType: 'upload',
        altText: file.name,
      });
    };

    img.onerror = () => {
      // If image decode fails (e.g. malformed or binary-specific), fallback gracefully
      resolve({
        id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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
 * Batch processes an array of local Files in parallel.
 */
export async function processLocalFiles(files: FileList | File[]): Promise<{
  successItems: ImageMetadata[];
  errorCount: number;
}> {
  const fileArray = Array.from(files);
  const successItems: ImageMetadata[] = [];
  let errorCount = 0;

  await Promise.all(
    fileArray.map(async (file) => {
      try {
        const meta = await processLocalFile(file);
        successItems.push(meta);
      } catch (err) {
        errorCount++;
        console.warn(`[PixelShift] Skipped invalid local file: ${file.name}`, err);
      }
    })
  );

  return { successItems, errorCount };
}

/**
 * Extracts image files from a Clipboard Event (e.g. Ctrl+V / Cmd+V).
 */
export function extractFilesFromClipboard(event: ClipboardEvent): File[] {
  const items = event.clipboardData?.items;
  if (!items) return [];

  const files: File[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.indexOf('image') !== -1) {
      const file = item.getAsFile();
      if (file) files.push(file);
    }
  }
  return files;
}

/**
 * Revokes a list of Blob URLs from browser memory to prevent memory leaks.
 */
export function revokeMemoryUrls(items: ImageMetadata[]): void {
  items.forEach((item) => {
    if (item.src && item.src.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(item.src);
      } catch {
        // Ignore revoked errors
      }
    }
  });
}