/**
 * PixelShift Permissions & Security Validator
 * Validates extension capabilities, sanitizes external URLs, prevents CORS memory leaks,
 * and guards against path traversal vulnerabilities.
 */

export interface SecurityAuditResult {
  hasActiveTab: boolean;
  hasDownloads: boolean;
  hasStorage: boolean;
  isSandboxed: boolean;
  cspCompliant: boolean;
}

/**
 * Checks and audits active extension runtime permissions dynamically.
 */
export async function auditExtensionPermissions(): Promise<SecurityAuditResult> {
  const result: SecurityAuditResult = {
    hasActiveTab: false,
    hasDownloads: false,
    hasStorage: false,
    isSandboxed: true,
    cspCompliant: true,
  };

  if (typeof chrome !== 'undefined' && chrome.permissions) {
    try {
      result.hasActiveTab = await new Promise((res) =>
        chrome.permissions.contains({ permissions: ['activeTab'] }, res)
      );
      result.hasDownloads = await new Promise((res) =>
        chrome.permissions.contains({ permissions: ['downloads'] }, res)
      );
      result.hasStorage = await new Promise((res) =>
        chrome.permissions.contains({ permissions: ['storage'] }, res)
      );
    } catch {
      // Chrome permissions check fallback
    }
  }

  return result;
}

/**
 * Validates and sanitizes image URLs to prevent javascript:, data:text/html, or malicious protocols.
 */
export function isSafeImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;

  const trimmed = url.trim().toLowerCase();

  // Block dangerous executable URI schemes
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('vbscript:') ||
    trimmed.startsWith('file:') ||
    trimmed.startsWith('data:text/') ||
    trimmed.startsWith('data:application/')
  ) {
    return false;
  }

  // Allow standard web protocols and image data URIs
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:image/')
  ) {
    return true;
  }

  return false;
}

/**
 * Path Traversal & Injection Shield for downloaded filenames.
 * Strips out '../', null bytes, shell metacharacters, and Windows reserved device names.
 */
export function sanitizeSafePath(fileName: string, defaultName = 'pixelshift_image'): string {
  if (!fileName || !fileName.trim()) return defaultName;

  let clean = fileName
    .trim()
    .replace(/\0/g, '') // Remove null bytes
    .replace(/(\.\.(\/|\\|$))+/g, '') // Strip directory traversal (../ or ..\)
    .replace(/[<>:"/\\|?*`$;&]/g, '_') // Remove OS reserved/injection chars
    .replace(/\s+/g, '_') // Replace whitespaces
    .slice(0, 100); // Limit length to 100 chars

  // Filter Windows reserved device names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
  const windowsReserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
  if (windowsReserved.test(clean)) {
    clean = `safe_${clean}`;
  }

  return clean || defaultName;
}

/**
 * Safely wraps an image inside an isolated Canvas to test for CORS tainting before processing.
 */
export async function testCanvasOriginSafety(src: string): Promise<{ isSafe: boolean; isTainted: boolean }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve({ isSafe: true, isTainted: false });

        ctx.drawImage(img, 0, 0, 1, 1);
        // Attempt pixel extraction - if cross-origin blocked, this throws a SecurityError
        ctx.getImageData(0, 0, 1, 1);
        resolve({ isSafe: true, isTainted: false });
      } catch (err) {
        // Tainted by CORS
        resolve({ isSafe: false, isTainted: true });
      }
    };

    img.onerror = () => {
      resolve({ isSafe: false, isTainted: false });
    };

    img.src = src;
  });
}