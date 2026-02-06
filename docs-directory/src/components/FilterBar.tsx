import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { docsData } from '../data/docsData';

interface FilterBarProps {
  selectedCategory: string;
  selectedTag: string;
  onCategoryChange: (category: string) => void;
  onTagChange: (tag: string) => void;
}

export default function FilterBar({ selectedCategory, selectedTag, onCategoryChange, onTagChange }: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const categories = ['All', ...docsData.map(cat => cat.name)];
  const allTags = Array.from(new Set(docsData.flatMap(cat => cat.items.flatMap(item => item.tags || []))));

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm">Filters</span>
              {(selectedCategory !== 'All' || selectedTag) && (
                <span className="px-2 py-1 bg-cloudflare-orange text-white text-xs rounded-full">
                  {selectedCategory !== 'All' && selectedTag ? '2' : '1'}
                </span>
              )}
            </button>
            
            {(selectedCategory !== 'All' || selectedTag) && (
              <div className="flex items-center space-x-2">
                {selectedCategory !== 'All' && (
                  <span className="px-3 py-1 bg-cloudflare-orange text-white text-sm rounded-full flex items-center space-x-1">
                    <span>{selectedCategory}</span>
                    <button
                      onClick={() => onCategoryChange('All')}
                      className="hover:bg-orange-600 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {selectedTag && (
                  <span className="px-3 py-1 bg-cloudflare-orange text-white text-sm rounded-full flex items-center space-x-1">
                    <span>{selectedTag}</span>
                    <button
                      onClick={() => onTagChange('')}
                      className="hover:bg-orange-600 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 space-y-4 animate-slide-up">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => onCategoryChange(category)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      selectedCategory === category
                        ? 'bg-cloudflare-orange text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {allTags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onTagChange('')}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      !selectedTag
                        ? 'bg-cloudflare-orange text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    All Tags
                  </button>
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => onTagChange(tag)}
                      className={`px-3 py-1 text-sm rounded-full transition-colors ${
                        selectedTag === tag
                          ? 'bg-cloudflare-orange text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
