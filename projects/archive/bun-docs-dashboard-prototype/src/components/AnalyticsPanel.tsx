import { useState, useEffect } from 'react';
import { Clock, TrendingUp, Star, Eye } from 'lucide-react';
import { DocItem } from '../types';
import { docsData } from '../data/docsData';
import { useFavorites } from '../contexts/FavoritesContext';

export default function AnalyticsPanel() {
  const { favorites } = useFavorites();
  const [viewCount, setViewCount] = useState(0);
  const [popularItems, setPopularItems] = useState<DocItem[]>([]);

  useEffect(() => {
    // Simulate view count and popular items
    const savedViews = localStorage.getItem('totalViews');
    const currentViews = savedViews ? parseInt(savedViews) : 0;
    setViewCount(currentViews);

    // Get popular items (marked as popular or most favorited)
    const popular = docsData
      .flatMap(cat => cat.items)
      .filter(item => item.popular || favorites.includes(item.id))
      .slice(0, 5);
    setPopularItems(popular);
  }, [favorites]);

  const recordView = () => {
    const newViews = viewCount + 1;
    setViewCount(newViews);
    localStorage.setItem('totalViews', newViews.toString());
  };

  useEffect(() => {
    // Record view on mount
    recordView();
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center space-x-2">
        <TrendingUp className="w-5 h-5 text-cloudflare-orange" />
        <span>Analytics</span>
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Eye className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Total Views</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {viewCount.toLocaleString()}
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Favorites</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {favorites.length}
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Categories</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {docsData.length}
          </div>
        </div>
      </div>

      {popularItems.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Popular Items
          </h4>
          <div className="space-y-2">
            {popularItems.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {item.title}
                </span>
                <div className="flex items-center space-x-2">
                  {item.popular && (
                    <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs rounded-full">
                      Popular
                    </span>
                  )}
                  {favorites.includes(item.id) && (
                    <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs rounded-full">
                      Favorited
                    </span>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
