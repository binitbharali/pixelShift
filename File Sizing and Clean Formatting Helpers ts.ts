/**
 * Formats raw byte sizes into human-readable strings (e.g. 1.4 MB)
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return 'Unknown size';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Sanitizes strings for safe, cross-platform file naming
 */
export function sanitizeFileName(name: string): string {
  if (!name || !name.trim()) return 'image';
  return name
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 80);
}

/**
 * Generates an output filename with the correct target extension
 */
export function getConvertedFileName(originalName: string, targetFormat: string): string {
  const base = sanitizeFileName(originalName.replace(/\.[^/.]+$/, ''));
  const ext = targetFormat === 'jpeg' ? 'jpg' : targetFormat;
  return `${base}.${ext}`;
}