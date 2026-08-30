/**
 * PixelShift Download Manager Subsystem
 * Handles single file downloads, batch ZIP bundling, and Chrome Extension download integration.
 */

import JSZip from 'jszip';
import { ConversionResult, ImageMetadata } from '../types';
import { getConvertedFileName, sanitizeFileName } from './filename';

export interface BatchItem {
  id: string;
  original: ImageMetadata;
  result?: ConversionResult;
  status: 'pending' | 'converting' | 'success' | 'error';
  errorMessage?: string;
}

/**
 * Triggers a direct download of a Blob or DataURL file in the browser.
 */
export function triggerFileDownload(blobOrUrl: Blob | string, filename: string): void {
  // If running inside Chrome Extension environment with chrome.downloads available:
  if (typeof chrome !== 'undefined' && chrome?.downloads?.download) {
    const url = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl);
    chrome.downloads.download(
      {
        url,
        filename: sanitizeFileName(filename),
        saveAs: false,
      },
      () => {
        if (typeof blobOrUrl !== 'string') {
          setTimeout(() => URL.revokeObjectURL(url), 10000);
        }
      }
    );
    return;
  }

  // Standard Web DOM Download Anchor trigger:
  const link = document.createElement('a');
  const url = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl);

  link.href = url;
  link.download = sanitizeFileName(filename);
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up memory blob after download is initiated
  if (typeof blobOrUrl !== 'string') {
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    }, 5000);
  }
}

/**
 * Bundles all successfully converted items into a single ZIP archive.
 * Rejects failed conversions and avoids corrupt files.
 */
export async function createAndDownloadBatchZip(
  items: BatchItem[],
  zipName: string = 'PixelShift_Converted_Images.zip',
  onProgress?: (percent: number) => void
): Promise<{ success: boolean; totalDownloaded: number; error?: string }> {
  // Filter out any items that failed or produced no blob
  const validItems = items.filter(
    (item) => item.status === 'success' && item.result?.success && item.result.blob
  );

  if (validItems.length === 0) {
    return {
      success: false,
      totalDownloaded: 0,
      error: 'No successfully converted images to download. Conversion not possible.',
    };
  }

  const zip = new JSZip();
  const nameCounts: Record<string, number> = {};

  // Add each converted image blob into the ZIP directory
  validItems.forEach((item) => {
    if (!item.result?.blob) return;

    let targetFilename = getConvertedFileName(item.original.fileName, item.result.targetFormat);

    // Prevent duplicate filenames inside ZIP
    if (nameCounts[targetFilename]) {
      const ext = targetFilename.split('.').pop() || 'png';
      const base = targetFilename.replace(/\.[^/.]+$/, '');
      targetFilename = `${base}_(${nameCounts[targetFilename]}).${ext}`;
      nameCounts[targetFilename]++;
    } else {
      nameCounts[targetFilename] = 1;
    }

    zip.file(targetFilename, item.result.blob);
  });

  // Generate ZIP file with compression
  try {
    const zipBlob = await zip.generateAsync(
      {
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      },
      (metadata) => {
        if (onProgress) {
          onProgress(Math.round(metadata.percent));
        }
      }
    );

    triggerFileDownload(zipBlob, zipName);

    return {
      success: true,
      totalDownloaded: validItems.length,
    };
  } catch (err) {
    return {
      success: false,
      totalDownloaded: 0,
      error: err instanceof Error ? err.message : 'Failed to generate ZIP archive',
    };
  }
}