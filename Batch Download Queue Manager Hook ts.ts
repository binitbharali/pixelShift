import { useState, useCallback } from 'react';
import { ImageMetadata, ConversionOptions, SupportedFormat } from '../types';
import { convertImage } from '../utils/imageConverter';
import { getConvertedFileName } from '../utils/filename';
import {
  triggerFileDownload,
  createAndDownloadBatchZip,
  BatchItem,
} from '../utils/downloadManager';

export function useBatchDownload() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [zipProgress, setZipProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  /**
   * Converts and immediately downloads a single image.
   */
  const downloadSingleImage = useCallback(
    async (image: ImageMetadata, options: ConversionOptions) => {
      setStatusMessage(`Converting ${image.fileName}...`);
      try {
        const res = await convertImage(image.src, options);
        if (res.success && res.blob) {
          const filename = getConvertedFileName(image.fileName, options.targetFormat);
          triggerFileDownload(res.blob, filename);
          setStatusMessage(`Downloaded ${filename}!`);
        } else {
          setStatusMessage(res.errorMessage || 'Conversion not possible');
        }
      } catch (err) {
        setStatusMessage('Conversion not possible');
      }
    },
    []
  );

  /**
   * Converts a queue of images and packages them into a ZIP archive.
   */
  const convertAndDownloadZip = useCallback(
    async (images: ImageMetadata[], options: ConversionOptions) => {
      if (images.length === 0) return;

      setIsProcessing(true);
      setZipProgress(0);
      setStatusMessage(`Converting 0 / ${images.length} images...`);

      const batchItems: BatchItem[] = images.map((img) => ({
        id: img.id,
        original: img,
        status: 'pending',
      }));

      // Convert sequentially or in small concurrency chunks to prevent memory spikes
      let completedCount = 0;

      for (let i = 0; i < batchItems.length; i++) {
        const item = batchItems[i];
        item.status = 'converting';

        try {
          const result = await convertImage(item.original.src, options);
          if (result.success && result.blob) {
            item.status = 'success';
            item.result = result;
          } else {
            item.status = 'error';
            item.errorMessage = result.errorMessage || 'Conversion not possible';
          }
        } catch {
          item.status = 'error';
          item.errorMessage = 'Conversion not possible';
        }

        completedCount++;
        setStatusMessage(`Converted ${completedCount} / ${images.length} images...`);
      }

      setStatusMessage('Creating ZIP archive...');
      const zipResult = await createAndDownloadBatchZip(
        batchItems,
        `PixelShift_${options.targetFormat.toUpperCase()}_Export.zip`,
        (pct) => setZipProgress(pct)
      );

      if (zipResult.success) {
        setStatusMessage(`Downloaded ZIP with ${zipResult.totalDownloaded} images!`);
      } else {
        setStatusMessage(zipResult.error || 'Conversion not possible');
      }

      setIsProcessing(false);
    },
    []
  );

  return {
    isProcessing,
    zipProgress,
    statusMessage,
    downloadSingleImage,
    convertAndDownloadZip,
  };
}