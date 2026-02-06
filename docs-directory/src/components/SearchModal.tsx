import { useState, useEffect, useMemo } from 'react';
import { Search, X, ExternalLink } from 'lucide-react';
import { SearchResult, DocItem } from '../types';
import { docsData } from '../data/docsData';
import { logUIError, ErrorContext } from '../utils/errorLogger';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState<SearchResult[]>([]);

  const allItems = useMemo(() => {
    const items: { item: DocItem; category: string; itemLower: { title: string; description: string; category: string } }[] = [];
    docsData.forEach(category => {
      category.items.forEach(item => {
        items.push({ 
          item, 
          category: category.name,
          itemLower: {
            title: item.title.toLowerCase(),
            description: item.description.toLowerCase(),
            category: category.name.toLowerCase()
          }
        });
      });
    });
    return items;
  }, []);

  const searchResults = useMemo(() => {
    if (!query.trim()) {
      return [];
    }

    const queryLower = query.toLowerCase();
    
    return allItems
      .map(({ item, category, itemLower }) => {
        const titleScore = itemLower.title.includes(queryLower) ? 10 : 0;
        const descriptionScore = itemLower.description.includes(queryLower) ? 5 : 0;
        const categoryScore = itemLower.category.includes(queryLower) ? 3 : 0;
        
        const score = titleScore + descriptionScore + categoryScore;
        
        return { item, category, score };
      })
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [query, allItems]);

  useEffect(() => {
    setResults(searchResults);
    setSelectedIndex(0);
  }, [searchResults]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (results.length > 0) {
            setSelectedIndex(prev => (prev + 1) % results.length);
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (results.length > 0) {
            setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
          }
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            const url = results[selectedIndex].item.url;
            if (isValidUrl(url)) {
              window.open(url, '_blank', 'noopener,noreferrer');
            } else {
              logUIError(
                'Invalid URL in search result',
                undefined,
                { component: 'SearchModal', action: 'search_result_enter', url }
              );
            }
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!isOpen) {
          setQuery('');
          setSelectedIndex(0);
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen]);

  // Helper function to validate URLs
  const isValidUrl = (url: string | undefined): url is string => {
    return typeof url === 'string' && 
           url.trim().length > 0 && 
           (url.startsWith('http://') || url.startsWith('https://'));
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    // Escape special regex characters in the query
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      // Check if this part matches the query (case-insensitive)
      const isMatch = part.toLowerCase() === query.toLowerCase();
      return isMatch ? (
        <span key={index} className="search-highlight">{part}</span>
      ) : (
        <span key={index}>{part}</span>
      );
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 animate-slide-up">
        <div className="flex items-center border-b border-gray-200 dark:border-gray-700 p-4">
          <Search className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documentation..."
            className="flex-1 outline-none text-lg bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            autoFocus
          />
          <button
            onClick={onClose}
            className="ml-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </button>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              {query.trim() ? 'No results found' : 'Type to search documentation...'}
            </div>
          ) : (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={result.item.id}
                  onClick={() => {
                    const url = result.item.url;
                    if (isValidUrl(url)) {
                      window.open(url, '_blank', 'noopener,noreferrer');
                    } else {
                      logUIError(
                        'Invalid URL in search result',
                        undefined,
                        { component: 'SearchModal', action: 'search_result_click', url }
                      );
                    }
                    onClose();
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-start space-x-3 ${
                    index === selectedIndex ? 'bg-gray-50 dark:bg-gray-700' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs font-medium text-cloudflare-orange uppercase">
                        {result.category}
                      </span>
                      <ExternalLink className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                    </div>
                    <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                      {highlightText(result.item.title, query)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {highlightText(result.item.description, query)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {results.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center justify-between">
              <span>
                Use ↑↓ to navigate, Enter to open, Escape to close
              </span>
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">⌘K</kbd>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
