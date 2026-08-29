export type SupportedFormat = 'png' | 'jpeg' | 'webp' | 'svg' | 'gif' | 'bmp' | 'ico' | 'avif';

export type ImageSourceType = 'img' | 'background' | 'svg' | 'canvas' | 'meta' | 'picture' | 'upload';

export interface ImageMetadata {
  id: string;
  src: string;
  originalFormat: string; // 'png' | 'jpg' | 'svg' | 'webp', etc.
  fileName: string;
  width: number;
  height: number;
  fileSizeBytes?: number;
  aspectRatio: number;
  sourceType: ImageSourceType;
  altText?: string;
  domSelector?: string;
  isTransparent?: boolean;
  colorSpace?: string;
  exifData?: Record<string, string | number>;
}

export interface ConversionOptions {
  targetFormat: SupportedFormat;
  quality?: number; // 0.1 to 1.0 (for lossy jpeg/webp/avif)
  width?: number; // custom resize width
  height?: number; // custom resize height
  maintainAspectRatio?: boolean;
  backgroundColor?: string; // Hex for replacing transparency when converting to JPG/BMP
  cropMode?: 'fit' | 'fill' | 'stretch';
}

export interface ConversionResult {
  success: boolean;
  blob: Blob | null;
  dataUrl: string | null;
  sizeBytes: number;
  targetFormat: SupportedFormat;
  width: number;
  height: number;
  errorMessage?: string;
  error?: string;
}