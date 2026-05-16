import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DocItem } from '../types';
import { logStorageError, ErrorContext } from '../utils/errorLogger';
import { withRetry, DEFAULT_RETRY_CONFIG } from '../utils/recoveryManager';

interface FavoritesContextType {
  favorites: string[];
  addFavorite: (itemId: string) => void;
  removeFavorite: (itemId: string) => void;
  clearFavorites: () => void;
  isFavorite: (itemId: string) => boolean;
  recentItems: DocItem[];
  addRecentItem: (item: DocItem) => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>(() => {
    return loadFromLocalStorage<string[]>('favorites', []);
  });

  const [recentItems, setRecentItems] = useState<DocItem[]>(() => {
    return loadFromLocalStorage<DocItem[]>('recentItems', []);
  });

  useEffect(() => {
    saveToLocalStorage('favorites', favorites);
  }, [favorites]);

  useEffect(() => {
    saveToLocalStorage('recentItems', recentItems);
  }, [recentItems]);

  const addFavorite = (itemId: string) => {
    if (!isValidItemId(itemId)) {
      logStorageError(
        'Invalid item ID provided to addFavorite',
        undefined,
        { component: 'FavoritesProvider', action: 'addFavorite', itemId }
      );
      return;
    }
    setFavorites(prev => [...prev, itemId]);
  };

  const removeFavorite = (itemId: string) => {
    if (!isValidItemId(itemId)) {
      logStorageError(
        'Invalid item ID provided to removeFavorite',
        undefined,
        { component: 'FavoritesProvider', action: 'removeFavorite', itemId }
      );
      return;
    }
    setFavorites(prev => prev.filter(id => id !== itemId));
  };

  const clearFavorites = () => {
    setFavorites([]);
  };

  const isFavorite = (itemId: string) => {
    if (!isValidItemId(itemId)) {
      logStorageError(
        'Invalid item ID provided to isFavorite',
        undefined,
        { component: 'FavoritesProvider', action: 'isFavorite', itemId }
      );
      return false;
    }
    return favorites.includes(itemId);
  };

  const addRecentItem = (item: DocItem) => {
    if (!isValidDocItem(item)) {
      logStorageError(
        'Invalid DocItem provided to addRecentItem',
        undefined,
        { component: 'FavoritesProvider', action: 'addRecentItem', item }
      );
      return;
    }
    setRecentItems(prev => {
      const filtered = prev.filter(i => i.id !== item.id);
      return [item, ...filtered].slice(0, 5);
    });
  };

  return (
    <FavoritesContext.Provider value={{
      favorites,
      addFavorite,
      removeFavorite,
      clearFavorites,
      isFavorite,
      recentItems,
      addRecentItem
    }}>
      {children}
    </FavoritesContext.Provider>
  );
}

// Helper functions for localStorage operations
function loadFromLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return defaultValue;
    
    const parsed = JSON.parse(saved);
    
    // Type validation for DocItem arrays
    if (key === 'recentItems' && Array.isArray(parsed)) {
      return parsed.filter((item): item is DocItem => 
        item && 
        typeof item.id === 'string' && 
        typeof item.title === 'string' && 
        typeof item.description === 'string' && 
        typeof item.url === 'string' && 
        typeof item.category === 'string'
      ) as T;
    }
    
    // Type validation for string arrays
    if (key === 'favorites' && Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string') as T;
    }
    
    return parsed;
  } catch (error) {
    logStorageError(
      `Failed to load ${key} from localStorage`,
      error instanceof Error ? error : new Error(String(error)),
      { component: 'FavoritesProvider', action: 'loadFromLocalStorage', key }
    );
    return defaultValue;
  }
}

async function saveToLocalStorage<T>(key: string, data: T): Promise<void> {
  const context: ErrorContext = { component: 'FavoritesProvider', action: 'saveToLocalStorage', key };
  
  const result = await withRetry(
    async () => {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (error) {
        throw error instanceof Error ? error : new Error(String(error));
      }
    },
    context,
    DEFAULT_RETRY_CONFIG
  );
  
  if (!result.success) {
    logStorageError(
      `Failed to save ${key} to localStorage after ${result.attempts} attempts`,
      result.error,
      context
    );
  }
}

function isValidItemId(itemId: string): itemId is string {
  return typeof itemId === 'string' && itemId.trim().length > 0;
}

function isValidDocItem(item: any): item is DocItem {
  return item && 
    typeof item.id === 'string' && 
    typeof item.title === 'string' && 
    typeof item.description === 'string' && 
    typeof item.url === 'string' && 
    typeof item.category === 'string' &&
    item.id.trim().length > 0 &&
    item.title.trim().length > 0 &&
    item.description.trim().length > 0;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
