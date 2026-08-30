/**
 * PixelShift Format Manager Subsystem
 * Defines format rules, MIME mappings, transparency support, and codec capability checks.
 */

import { SupportedFormat } from '../types';

export interface FormatDefinition {
  format: SupportedFormat;
  label: string;
  extension: string;
  mimeType: string;
  supportsAlpha: boolean;
  supportsQuality: boolean;
  defaultQuality: number;
  isVector: boolean;
  badgeColor: string;
  description: string;
  bestFor: string;
}

/**
 * Master Registry of all supported formats and their capabilities
 */
export const FORMAT_REGISTRY: Record<SupportedFormat, FormatDefinition> = {
  png: {
    format: 'png',
    label: 'PNG',
    extension: 'png',
    mimeType: 'image/png',
    supportsAlpha: true,
    supportsQuality: false,
    defaultQuality: 1.0,
    isVector: false,
    badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    description: 'Lossless raster format with complete alpha transparency support.',
    bestFor: 'Graphics, screenshots, logos, and images requiring crisp edges & transparency.',
  },
  jpeg: {
    format: 'jpeg',
    label: 'JPG / JPEG',
    extension: 'jpg',
    mimeType: 'image/jpeg',
    supportsAlpha: false,
    supportsQuality: true,
    defaultQuality: 0.92,
    isVector: false,
    badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    description: 'Universal lossy photography standard with high compression ratio.',
    bestFor: 'Photographs, complex natural scenes, and web banners with no transparency.',
  },
  webp: {
    format: 'webp',
    label: 'WebP',
    extension: 'webp',
    mimeType: 'image/webp',
    supportsAlpha: true,
    supportsQuality: true,
    defaultQuality: 0.90,
    isVector: false,
    badgeColor: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    description: 'Modern high-efficiency format offering 30% smaller files than JPEG & PNG.',
    bestFor: 'Modern websites, apps, speed optimization, and transparent graphics.',
  },
  svg: {
    format: 'svg',
    label: 'SVG',
    extension: 'svg',
    mimeType: 'image/svg+xml',
    supportsAlpha: true,
    supportsQuality: false,
    defaultQuality: 1.0,
    isVector: true,
    badgeColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    description: 'Resolution-independent XML vector markup that scales infinitely.',
    bestFor: 'Icons, UI vectors, typography, and illustration assets.',
  },
  ico: {
    format: 'ico',
    label: 'ICO (Favicon)',
    extension: 'ico',
    mimeType: 'image/x-icon',
    supportsAlpha: true,
    supportsQuality: false,
    defaultQuality: 1.0,
    isVector: false,
    badgeColor: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    description: 'Windows multi-resolution icon container (16x16, 32x32, 48x48, 64x64).',
    bestFor: 'Website favicons, desktop shortcuts, and app icons.',
  },
  bmp: {
    format: 'bmp',
    label: 'BMP',
    extension: 'bmp',
    mimeType: 'image/bmp',
    supportsAlpha: false,
    supportsQuality: false,
    defaultQuality: 1.0,
    isVector: false,
    badgeColor: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    description: 'Uncompressed raw 32-bit bitmap with zero compression artifacts.',
    bestFor: 'Legacy software, industrial printers, and raw pixel analysis.',
  },
  gif: {
    format: 'gif',
    label: 'GIF',
    extension: 'gif',
    mimeType: 'image/gif',
    supportsAlpha: true,
    supportsQuality: false,
    defaultQuality: 1.0,
    isVector: false,
    badgeColor: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
    description: 'Standard 256-color palette indexed graphic format.',
    bestFor: 'Legacy web animations, simple badge graphics, and retro graphics.',
  },
  avif: {
    format: 'avif',
    label: 'AVIF',
    extension: 'avif',
    mimeType: 'image/avif',
    supportsAlpha: true,
    supportsQuality: true,
    defaultQuality: 0.85,
    isVector: false,
    badgeColor: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    description: 'Next-generation AV1-based codec offering maximum compression efficiency.',
    bestFor: 'Ultra-fast web delivery on modern supported browsers.',
  },
};

/**
 * Format Codec Capability Checker Cache
 */
let formatSupportCache: Record<string, boolean> = {};

/**
 * Probes the browser runtime to verify if a format can be natively encoded by Canvas.
 */
export function isFormatSupportedByBrowser(format: SupportedFormat): boolean {
  if (format === 'svg' || format === 'bmp' || format === 'ico' || format === 'gif') {
    // These formats are powered by custom JavaScript binary/vector engines
    return true;
  }

  if (format in formatSupportCache) {
    return formatSupportCache[format];
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    const mime = FORMAT_REGISTRY[format]?.mimeType || `image/${format}`;
    const dataUrl = canvas.toDataURL(mime);
    const supported = dataUrl.startsWith(`data:${mime}`);
    formatSupportCache[format] = supported;
    return supported;
  } catch {
    formatSupportCache[format] = false;
    return false;
  }
}

/**
 * Resolves standard format metadata
 */
export function getFormatInfo(format: string): FormatDefinition {
  const norm = normalizeFormatString(format);
  return FORMAT_REGISTRY[norm] || FORMAT_REGISTRY.png;
}

/**
 * Normalizes variations (e.g., 'jpg' -> 'jpeg', 'image/x-icon' -> 'ico')
 */
export function normalizeFormatString(fmt: string): SupportedFormat {
  if (!fmt) return 'png';
  const clean = fmt.toLowerCase().trim().replace(/^image\//, '');
  if (clean === 'jpg' || clean === 'jpeg') return 'jpeg';
  if (clean === 'svg+xml' || clean === 'svg') return 'svg';
  if (clean === 'x-icon' || clean === 'vnd.microsoft.icon' || clean === 'ico') return 'ico';
  if (clean === 'webp') return 'webp';
  if (clean === 'avif') return 'avif';
  if (clean === 'bmp') return 'bmp';
  if (clean === 'gif') return 'gif';
  return 'png';
}

/**
 * Checks if converting between two formats requires applying a matte background
 * (e.g. transparent PNG -> opaque JPEG).
 */
export function requiresMatteBackground(sourceFormat: string, targetFormat: SupportedFormat): boolean {
  const targetDef = FORMAT_REGISTRY[targetFormat];
  if (targetDef && !targetDef.supportsAlpha) {
    return true; // Target does not support transparency (JPEG, BMP)
  }
  return false;
}