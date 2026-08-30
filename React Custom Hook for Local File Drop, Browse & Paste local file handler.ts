import { useState, useCallback, useEffect, DragEvent, ChangeEvent } from 'react';
import { ImageMetadata } from '../types';
import { processLocalFiles, extractFilesFromClipboard } from '../utils/localFileHandler';

interface UseLocalFileDropOptions {
  onFilesAdded: (newItems: ImageMetadata[]) => void;
  onError?: (msg: string) => void;
}

export function useLocalFileDrop({ onFilesAdded, onError }: UseLocalFileDropOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!files || files.length === 0) return;
      setIsProcessing(true);
      try {
        const { successItems, errorCount } = await processLocalFiles(files);
        if (successItems.length > 0) {
          onFilesAdded(successItems);
        }
        if (errorCount > 0 && onError) {
          onError(`${errorCount} non-image file(s) were skipped.`);
        }
      } catch (err) {
        if (onError) onError('Failed to process dropped files.');
      } finally {
        setIsProcessing(false);
      }
    },
    [onFilesAdded, onError]
  );

  // Drag-and-drop event handlers
  const onDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer?.files) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  // File Picker Change handler
  const onFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
        e.target.value = ''; // Reset input to allow re-uploading the same file
      }
    },
    [handleFiles]
  );

  // Global Clipboard Paste Listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const files = extractFilesFromClipboard(e);
      if (files.length > 0) {
        e.preventDefault();
        handleFiles(files);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleFiles]);

  return {
    isDragging,
    isProcessing,
    dragProps: {
      onDragEnter,
      onDragOver,
      onDragLeave,
      onDrop,
    },
    onFileInputChange,
  };
}