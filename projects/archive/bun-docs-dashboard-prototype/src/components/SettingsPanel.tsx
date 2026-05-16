import { useState } from 'react';
import { Settings, Palette, Globe, Bell, Download, Trash2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useFavorites } from '../contexts/FavoritesContext';

export default function SettingsPanel() {
  const { isDark, toggleTheme } = useTheme();
  const { favorites, clearFavorites } = useFavorites();
  const [isOpen, setIsOpen] = useState(false);

  const exportData = () => {
    const data = {
      favorites,
      theme: isDark ? 'dark' : 'light',
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'docs-directory-settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearAllData = () => {
    if (confirm('Are you sure you want to clear all data? This will remove favorites, recent items, and settings.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
      >
        <Settings className="w-4 h-4" />
        <span>Settings</span>
      </button>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        >
          ×
        </button>
      </div>

      <div className="space-y-6">
        {/* Appearance */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center space-x-2">
            <Palette className="w-4 h-4" />
            <span>Appearance</span>
          </h4>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Dark Mode</span>
              <button
                onClick={toggleTheme}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isDark ? 'bg-cloudflare-orange' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isDark ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
          </div>
        </div>

        {/* Data Management */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center space-x-2">
            <Globe className="w-4 h-4" />
            <span>Data Management</span>
          </h4>
          <div className="space-y-3">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <div>Favorites: {favorites.length}</div>
              <div>Storage used: ~{JSON.stringify(localStorage).length / 1024}KB</div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={exportData}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
              
              <button
                onClick={clearFavorites}
                className="flex items-center space-x-2 px-3 py-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors"
              >
                <Bell className="w-4 h-4" />
                <span>Clear Favorites</span>
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div>
          <h4 className="text-sm font-medium text-red-700 dark:text-red-300 mb-3 flex items-center space-x-2">
            <Trash2 className="w-4 h-4" />
            <span>Danger Zone</span>
          </h4>
          <button
            onClick={clearAllData}
            className="px-3 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition-colors text-sm"
          >
            Clear All Data
          </button>
        </div>
      </div>
    </div>
  );
}
