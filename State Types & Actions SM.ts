import { ImageMetadata, SupportedFormat, ConversionOptions, ConversionResult } from './index';

export interface BatchItemState {
  id: string;
  original: ImageMetadata;
  status: 'idle' | 'converting' | 'success' | 'error';
  result?: ConversionResult;
  errorMessage?: string;
  progress: number;
}

export interface AppState {
  images: ImageMetadata[];
  selectedIds: Set<string>;
  activeImageId: string | null;
  conversionOptions: ConversionOptions;
  batchQueue: Record<string, BatchItemState>;
  isScanning: boolean;
  isConvertingAll: boolean;
  filterFormat: string | 'all';
  searchQuery: string;
  sourceTabTitle?: string;
  sourceTabUrl?: string;
}

export type AppAction =
  | { type: 'SET_IMAGES'; payload: { images: ImageMetadata[]; tabTitle?: string; tabUrl?: string } }
  | { type: 'ADD_IMAGES'; payload: ImageMetadata[] }
  | { type: 'REMOVE_IMAGE'; payload: string }
  | { type: 'CLEAR_IMAGES' }
  | { type: 'TOGGLE_SELECT_IMAGE'; payload: string }
  | { type: 'SELECT_ALL_IMAGES' }
  | { type: 'DESELECT_ALL_IMAGES' }
  | { type: 'SET_ACTIVE_IMAGE'; payload: string | null }
  | { type: 'SET_TARGET_FORMAT'; payload: SupportedFormat }
  | { type: 'SET_QUALITY'; payload: number }
  | { type: 'SET_RESIZE'; payload: { width?: number; height?: number; maintainAspectRatio?: boolean } }
  | { type: 'SET_BACKGROUND_COLOR'; payload: string }
  | { type: 'SET_SCANNING'; payload: boolean }
  | { type: 'SET_CONVERTING_ALL'; payload: boolean }
  | { type: 'SET_FILTER_FORMAT'; payload: string }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'UPDATE_ITEM_STATUS'; payload: { id: string; status: BatchItemState['status']; result?: ConversionResult; error?: string } }
  | { type: 'RESTORE_SAVED_PREFERENCES'; payload: Partial<ConversionOptions> };