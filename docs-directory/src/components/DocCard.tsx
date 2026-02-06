import { ExternalLink, Star, Sparkles, Heart } from 'lucide-react';
import { DocItem } from '../types';
import { useFavorites } from '../contexts/FavoritesContext';
import { logUIError, ErrorContext } from '../utils/errorLogger';

interface DocCardProps {
  item: DocItem;
  category: string;
}

export default function DocCard({ item, category }: DocCardProps) {
  const { addFavorite, removeFavorite, isFavorite, addRecentItem } = useFavorites();

  const handleClick = () => {
    const context: ErrorContext = {
      component: 'DocCard',
      action: 'handleClick',
      itemId: item.id
    };
    
    if (isValidUrl(item.url)) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
      addRecentItem(item);
    } else {
      logUIError(
        'Invalid or missing URL in DocCard',
        undefined,
        { ...context, url: item.url }
      );
    }
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFavorite(item.id)) {
      removeFavorite(item.id);
    } else {
      addFavorite(item.id);
    }
  };

  return (
    <div 
      className="docs-card group"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-cloudflare-orange uppercase tracking-wide">
          {category}
        </span>
        <div className="flex items-center space-x-1">
          {item.popular && (
            <div className="flex items-center space-x-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs rounded-full">
              <Star className="w-3 h-3" />
              <span>Popular</span>
            </div>
          )}
          {item.new && (
            <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full">
              <Sparkles className="w-3 h-3" />
              <span>New</span>
            </div>
          )}
          <button
            onClick={handleFavoriteClick}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={isFavorite(item.id) ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart 
              className={`w-4 h-4 transition-colors ${
                isFavorite(item.id) 
                  ? 'fill-red-500 text-red-500' 
                  : 'text-gray-400 hover:text-red-500'
              }`}
            />
          </button>
          <ExternalLink className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      
      <h3 className="docs-card-title group-hover:text-cloudflare-orange transition-colors">
        {item.title}
      </h3>
      
      <p className="docs-card-description">
        {item.description}
      </p>
      
      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper function to validate URLs
function isValidUrl(url: string | undefined): url is string {
  return typeof url === 'string' && 
         url.trim().length > 0 && 
         (url.startsWith('http://') || url.startsWith('https://'));
}
