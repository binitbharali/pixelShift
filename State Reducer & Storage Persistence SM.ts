import { AppState, AppAction } from '../types/state';

export const initialAppState: AppState = {
  images: [],
  selectedIds: new Set<string>(),
  activeImageId: null,
  conversionOptions: {
    targetFormat: 'webp',
    quality: 0.9,
    maintainAspectRatio: true,
    backgroundColor: '#ffffff',
  },
  batchQueue: {},
  isScanning: false,
  isConvertingAll: false,
  filterFormat: 'all',
  searchQuery: '',
};

/**
 * Saves preferences to chrome.storage.local or localStorage
 */
function persistPreferences(options: AppState['conversionOptions']) {
  const payload = {
    targetFormat: options.targetFormat,
    quality: options.quality,
    backgroundColor: options.backgroundColor,
    maintainAspectRatio: options.maintainAspectRatio,
  };

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.set({ pixelshift_preferences: payload });
  } else {
    localStorage.setItem('pixelshift_preferences', JSON.stringify(payload));
  }
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_IMAGES': {
      const { images, tabTitle, tabUrl } = action.payload;
      const initialQueue: Record<string, any> = {};
      images.forEach((img) => {
        initialQueue[img.id] = {
          id: img.id,
          original: img,
          status: 'idle',
          progress: 0,
        };
      });

      return {
        ...state,
        images,
        selectedIds: new Set(images.map((img) => img.id)), // Auto-select all by default
        batchQueue: initialQueue,
        sourceTabTitle: tabTitle,
        sourceTabUrl: tabUrl,
        activeImageId: images[0]?.id || null,
        isScanning: false,
      };
    }

    case 'ADD_IMAGES': {
      const newImages = action.payload;
      const combined = [...state.images];
      const existingIds = new Set(state.images.map((i) => i.id));
      const updatedQueue = { ...state.batchQueue };
      const updatedSelected = new Set(state.selectedIds);

      newImages.forEach((img) => {
        if (!existingIds.has(img.id)) {
          combined.push(img);
          updatedSelected.add(img.id);
          updatedQueue[img.id] = {
            id: img.id,
            original: img,
            status: 'idle',
            progress: 0,
          };
        }
      });

      return {
        ...state,
        images: combined,
        selectedIds: updatedSelected,
        batchQueue: updatedQueue,
        activeImageId: state.activeImageId || combined[0]?.id || null,
      };
    }

    case 'REMOVE_IMAGE': {
      const idToRemove = action.payload;
      const filtered = state.images.filter((img) => img.id !== idToRemove);
      const updatedSelected = new Set(state.selectedIds);
      updatedSelected.delete(idToRemove);

      const updatedQueue = { ...state.batchQueue };
      delete updatedQueue[idToRemove];

      return {
        ...state,
        images: filtered,
        selectedIds: updatedSelected,
        batchQueue: updatedQueue,
        activeImageId: state.activeImageId === idToRemove ? (filtered[0]?.id || null) : state.activeImageId,
      };
    }

    case 'CLEAR_IMAGES':
      return {
        ...state,
        images: [],
        selectedIds: new Set(),
        activeImageId: null,
        batchQueue: {},
      };

    case 'TOGGLE_SELECT_IMAGE': {
      const id = action.payload;
      const newSelected = new Set(state.selectedIds);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return { ...state, selectedIds: newSelected };
    }

    case 'SELECT_ALL_IMAGES':
      return {
        ...state,
        selectedIds: new Set(state.images.map((img) => img.id)),
      };

    case 'DESELECT_ALL_IMAGES':
      return {
        ...state,
        selectedIds: new Set(),
      };

    case 'SET_ACTIVE_IMAGE':
      return { ...state, activeImageId: action.payload };

    case 'SET_TARGET_FORMAT': {
      const updatedOptions = { ...state.conversionOptions, targetFormat: action.payload };
      persistPreferences(updatedOptions);
      return { ...state, conversionOptions: updatedOptions };
    }

    case 'SET_QUALITY': {
      const updatedOptions = { ...state.conversionOptions, quality: action.payload };
      persistPreferences(updatedOptions);
      return { ...state, conversionOptions: updatedOptions };
    }

    case 'SET_RESIZE': {
      const updatedOptions = {
        ...state.conversionOptions,
        width: action.payload.width,
        height: action.payload.height,
        maintainAspectRatio: action.payload.maintainAspectRatio ?? state.conversionOptions.maintainAspectRatio,
      };
      return { ...state, conversionOptions: updatedOptions };
    }

    case 'SET_BACKGROUND_COLOR': {
      const updatedOptions = { ...state.conversionOptions, backgroundColor: action.payload };
      persistPreferences(updatedOptions);
      return { ...state, conversionOptions: updatedOptions };
    }

    case 'SET_SCANNING':
      return { ...state, isScanning: action.payload };

    case 'SET_CONVERTING_ALL':
      return { ...state, isConvertingAll: action.payload };

    case 'SET_FILTER_FORMAT':
      return { ...state, filterFormat: action.payload };

    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };

    case 'UPDATE_ITEM_STATUS': {
      const { id, status, result, error } = action.payload;
      if (!state.batchQueue[id]) return state;

      return {
        ...state,
        batchQueue: {
          ...state.batchQueue,
          [id]: {
            ...state.batchQueue[id],
            status,
            result,
            errorMessage: error,
            progress: status === 'success' ? 100 : status === 'converting' ? 50 : 0,
          },
        },
      };
    }

    case 'RESTORE_SAVED_PREFERENCES':
      return {
        ...state,
        conversionOptions: {
          ...state.conversionOptions,
          ...action.payload,
        },
      };

    default:
      return state;
  }
}