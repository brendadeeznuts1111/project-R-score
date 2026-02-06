import { Moon, Sun, Clock, Heart } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { docsData } from '../data/docsData';
import AnalyticsPanel from './AnalyticsPanel';
import SettingsPanel from './SettingsPanel';
import BunPerformancePanel from './BunPerformancePanel';
import BunFileSystemPanel from './BunFileSystemPanel';
import BunSQLitePanel from './BunSQLitePanel';
import BunBundlerPanel from './BunBundlerPanel';
import BunTestPanel from './BunTestPanel';

export default function Sidebar() {
  const { isDark, toggleTheme } = useTheme();
  const { favorites, recentItems } = useFavorites();

  const getFavoriteItems = () => {
    return docsData
      .flatMap(category => category.items)
      .filter(item => favorites.includes(item.id));
  };

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-6 hidden lg:block overflow-y-auto">
      {/* Theme Toggle */}
      <div className="mb-8">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
        >
          {isDark ? (
            <>
              <Sun className="w-4 h-4" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4" />
              <span>Dark Mode</span>
            </>
          )}
        </button>
      </div>

      {/* Bun Development Tools */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
          <span>⚡</span>
          <span>Bun Dev Tools</span>
        </h3>
        <div className="space-y-4">
          <BunBundlerPanel />
          <BunTestPanel />
        </div>
      </div>

      {/* Bun System Panels */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center space-x-2">
          <span>🔧</span>
          <span>Bun System</span>
        </h3>
        <div className="space-y-4">
          <BunPerformancePanel />
          <BunSQLitePanel />
          <BunFileSystemPanel />
        </div>
      </div>

      {/* Analytics Panel */}
      <AnalyticsPanel />

      {/* Recent Items */}
      {recentItems.length > 0 && (
        <div className="mb-8">
          <h3 className="flex items-center space-x-2 text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
            <Clock className="w-4 h-4" />
            <span>Recent</span>
          </h3>
          <div className="space-y-2">
            {recentItems.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-2 text-sm text-gray-600 dark:text-gray-400 hover:text-cloudflare-orange dark:hover:text-cloudflare-orange hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
              >
                {item.title}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Favorites */}
      {favorites.length > 0 && (
        <div className="mb-8">
          <h3 className="flex items-center space-x-2 text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
            <Heart className="w-4 h-4" />
            <span>Favorites</span>
            <span className="text-xs text-gray-500">({favorites.length})</span>
          </h3>
          <div className="space-y-2">
            {getFavoriteItems().map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-2 text-sm text-gray-600 dark:text-gray-400 hover:text-cloudflare-orange dark:hover:text-cloudflare-orange hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
              >
                {item.title}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Settings Panel */}
      <div className="mb-8">
        <SettingsPanel />
      </div>

      {/* Stats */}
      <div className="pt-8 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <div>{docsData.reduce((acc, cat) => acc + cat.items.length, 0)} Total Docs</div>
          <div>{docsData.length} Categories</div>
          <div>{favorites.length} Favorites</div>
          <div className="text-cloudflare-orange font-medium">⚡ Powered by Bun</div>
        </div>
      </div>
    </aside>
  );
}
