/**
 * PixelShift Error Handler Subsystem
 * Normalizes, classifies, and handles errors across detection, canvas, and file processing.
 */

export const STANDARD_ERROR_MESSAGE = 'Conversion not possible';

export enum ErrorCategory {
  CORS_RESTRICTION = 'CORS_RESTRICTION',
  CORRUPT_IMAGE = 'CORRUPT_IMAGE',
  INVALID_DIMENSIONS = 'INVALID_DIMENSIONS',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  CANVAS_FAILURE = 'CANVAS_FAILURE',
  MEMORY_LIMIT = 'MEMORY_LIMIT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN',
}

export interface NormalizedError {
  category: ErrorCategory;
  userMessage: string; // Guaranteed to be "Conversion not possible" for conversion failures
  technicalDetails?: string;
  isRetryable: boolean;
}

/**
 * Normalizes any runtime exception or rejection into a standard error payload.
 */
export function normalizeError(error: unknown, fallbackMessage = STANDARD_ERROR_MESSAGE): NormalizedError {
  if (!error) {
    return {
      category: ErrorCategory.UNKNOWN,
      userMessage: fallbackMessage,
      isRetryable: false,
    };
  }

  const rawMsg = error instanceof Error ? error.message : String(error);
  const lower = rawMsg.toLowerCase();

  // 1. CORS / Cross-Origin Security Restrictions
  if (lower.includes('cors') || lower.includes('tainted') || lower.includes('cross-origin') || lower.includes('securityerror')) {
    return {
      category: ErrorCategory.CORS_RESTRICTION,
      userMessage: STANDARD_ERROR_MESSAGE,
      technicalDetails: 'Image is protected by website CORS policy. Try downloading or dropping the image file directly.',
      isRetryable: false,
    };
  }

  // 2. Corrupt or un-decodable images
  if (lower.includes('decode') || lower.includes('failed to load') || lower.includes('corrupt') || lower.includes('image.onerror')) {
    return {
      category: ErrorCategory.CORRUPT_IMAGE,
      userMessage: STANDARD_ERROR_MESSAGE,
      technicalDetails: 'Source image data is malformed or unrenderable.',
      isRetryable: false,
    };
  }

  // 3. Dimension issues (0x0, negative, or excessive sizes)
  if (lower.includes('dimension') || lower.includes('width') || lower.includes('height') || lower.includes('0px')) {
    return {
      category: ErrorCategory.INVALID_DIMENSIONS,
      userMessage: STANDARD_ERROR_MESSAGE,
      technicalDetails: 'Image dimensions are 0x0 or exceed browser limits.',
      isRetryable: false,
    };
  }

  // 4. Canvas context / Memory limits
  if (lower.includes('context') || lower.includes('memory') || lower.includes('out of bounds')) {
    return {
      category: ErrorCategory.CANVAS_FAILURE,
      userMessage: STANDARD_ERROR_MESSAGE,
      technicalDetails: 'Browser canvas memory allocation failed.',
      isRetryable: true,
    };
  }

  // 5. Unsupported codec / MIME target
  if (lower.includes('unsupported') || lower.includes('format') || lower.includes('not supported')) {
    return {
      category: ErrorCategory.UNSUPPORTED_FORMAT,
      userMessage: STANDARD_ERROR_MESSAGE,
      technicalDetails: 'Requested output codec is not supported by this browser.',
      isRetryable: false,
    };
  }

  return {
    category: ErrorCategory.UNKNOWN,
    userMessage: STANDARD_ERROR_MESSAGE,
    technicalDetails: rawMsg,
    isRetryable: false,
  };
}

/**
 * Global Unhandled Rejection Logger for Chrome Extension runtime
 */
export function initGlobalErrorListeners(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('unhandledrejection', (event) => {
    console.warn('[PixelShift Global Rejection]:', event.reason);
  });

  window.addEventListener('error', (event) => {
    console.warn('[PixelShift Global Error]:', event.error || event.message);
  });
}