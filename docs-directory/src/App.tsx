import { useState, useMemo } from 'react';
import { Search, Book, Cloud, Shield, Zap, Server, Network, Users, Code, Activity, FileText, Bell } from 'lucide-react';
import { ThemeProvider } from './contexts/ThemeContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import SearchModal from './components/SearchModal';
import DocCategorySection from './components/DocCategorySection';
import Sidebar from './components/Sidebar';
import FilterBar from './components/FilterBar';
import Breadcrumbs from './components/Breadcrumbs';
import InternalWikiViewer from './components/InternalWikiViewer';
import BunAPIsViewer from './components/BunAPIsViewer';
import { docsData } from './data/docsData';
import { DocCategory } from './types';

const categoryIcons: Record<string, React.ReactNode> = {
  'Bun Core': <Book className="w-6 h-6" />,
  'Bun APIs': <Shield className="w-6 h-6" />,
  'Performance': <Zap className="w-6 h-6" />,
  'Integrations': <Server className="w-6 h-6" />,
  'Developer Tools': <Code className="w-6 h-6" />,
  'Advanced Topics': <Network className="w-6 h-6" />,
  'Advanced Features': <Zap className="w-6 h-6" />,
  'Fundamentals': <Book className="w-6 h-6" />,
  'Security': <Shield className="w-6 h-6" />,
  'Serverless & Edge': <Server className="w-6 h-6" />,
  'Network': <Network className="w-6 h-6" />,
  'Zero Trust': <Users className="w-6 h-6" />
};

function AppContent() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTag, setSelectedTag] = useState('');

  const filteredData = useMemo(() => {
    let filtered = [...docsData];
    
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(cat => cat.name === selectedCategory);
    }
    
    if (selectedTag) {
      filtered = filtered.map(category => ({
        ...category,
        items: category.items.filter(item => item.tags?.includes(selectedTag))
      })).filter(category => category.items.length > 0);
    }
    
    return filtered;
  }, [selectedCategory, selectedTag]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setIsSearchOpen(true);
    }
  };

  const scrollToCategory = (categoryId: string) => {
    const element = document.getElementById(`category-${categoryId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex" onKeyDown={handleKeyDown}>
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <Cloud className="w-8 h-8 text-cloudflare-orange" />
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Docs Directory
                </h1>
              </div>
              
              <button
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                <Search className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-300">Search</span>
                <kbd className="px-2 py-1 bg-white dark:bg-gray-800 rounded text-xs border border-gray-300 dark:border-gray-600">
                  ⌘K
                </kbd>
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="bg-gradient-to-br from-cloudflare-orange to-orange-600 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <h2 className="text-4xl font-bold">
                Bun-Powered Docs Directory
              </h2>
              <span className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm font-medium">
                ⚡ Powered by Bun
              </span>
            </div>
            <p className="text-xl mb-8 opacity-90">
              Explore comprehensive documentation with Bun's native performance, security features, and the latest v1.3.8 capabilities
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <div className="flex items-center space-x-2 bg-white bg-opacity-20 px-4 py-2 rounded-full">
                <span>{docsData.reduce((acc, cat) => acc + cat.items.length, 0)}</span>
                <span>Total Docs</span>
              </div>
              <div className="flex items-center space-x-2 bg-white bg-opacity-20 px-4 py-2 rounded-full">
                <span>{docsData.length}</span>
                <span>Categories</span>
              </div>
              <div className="flex items-center space-x-2 bg-white bg-opacity-20 px-4 py-2 rounded-full">
                <span>{filteredData.reduce((acc, cat) => acc + cat.items.length, 0)}</span>
                <span>Filtered Results</span>
              </div>
              <div className="flex items-center space-x-2 bg-white bg-opacity-20 px-4 py-2 rounded-full">
                <span>6</span>
                <span>Bun Categories</span>
              </div>
            </div>
          </div>
        </section>

        {/* Filter Bar */}
        <FilterBar
          selectedCategory={selectedCategory}
          selectedTag={selectedTag}
          onCategoryChange={setSelectedCategory}
          onTagChange={setSelectedTag}
        />

        {/* Quick Navigation */}
        <section className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-16 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center space-x-6 overflow-x-auto">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                Quick jump:
              </span>
              {filteredData.map((category) => (
                <button
                  key={category.id}
                  onClick={() => scrollToCategory(category.id)}
                  className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-cloudflare-orange transition-colors whitespace-nowrap"
                >
                  {categoryIcons[category.name]}
                  <span>{category.name}</span>
                </button>
              ))}
              <button
                onClick={() => window.open('#advanced-dashboard', '_self')}
                className="flex items-center space-x-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-500 transition-colors whitespace-nowrap font-medium"
              >
                <Activity className="w-4 h-4" />
                <span>Advanced Dashboard</span>
              </button>
              <button
                onClick={() => window.open('#bun-v138', '_self')}
                className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400 hover:text-green-500 transition-colors whitespace-nowrap font-medium"
              >
                <Zap className="w-4 h-4" />
                <span>Bun v1.3.8</span>
              </button>
              <button
                onClick={() => window.open('#markdown-parser', '_self')}
                className="flex items-center space-x-2 text-sm text-yellow-600 dark:text-yellow-400 hover:text-yellow-500 transition-colors whitespace-nowrap font-medium"
              >
                <FileText className="w-4 h-4" />
                <span>Markdown Parser</span>
              </button>
              <button
                onClick={() => window.open('#enhanced-perf', '_self')}
                className="flex items-center space-x-2 text-sm text-red-600 dark:text-red-400 hover:text-red-500 transition-colors whitespace-nowrap font-medium"
              >
                <Zap className="w-4 h-4" />
                <span>Enhanced Perf</span>
              </button>
              <button
                onClick={() => window.open('#rss-feed', '_self')}
                className="flex items-center space-x-2 text-sm text-orange-600 dark:text-orange-400 hover:text-orange-500 transition-colors whitespace-nowrap font-medium"
              >
                <Book className="w-4 h-4" />
                <span>RSS Feed</span>
              </button>
              <button
                onClick={() => window.open('#dashboard', '_self')}
                className="flex items-center space-x-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-500 transition-colors whitespace-nowrap font-medium"
              >
                <Activity className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => window.location.hash = 'rss-manager'}
                className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400 hover:text-green-500 transition-colors whitespace-nowrap font-medium"
              >
                <Bell className="w-4 h-4" />
                <span>RSS Manager</span>
              </button>
              <button
                onClick={() => window.location.hash = 'internal-wiki'}
                className="flex items-center space-x-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-500 transition-colors whitespace-nowrap font-medium"
              >
                <Book className="w-4 h-4" />
                <span>Internal Wiki</span>
              </button>
              <button
                onClick={() => window.location.hash = 'bun-apis'}
                className="flex items-center space-x-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors whitespace-nowrap font-medium"
              >
                <Code className="w-4 h-4" />
                <span>Bun APIs</span>
              </button>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Route-based content */}
          {window.location.hash === '#internal-wiki' ? (
            <InternalWikiViewer />
          ) : window.location.hash === '#bun-apis' ? (
            <BunAPIsViewer />
          ) : (
            <>
              {/* Breadcrumbs */}
              <Breadcrumbs 
                items={
                  selectedCategory !== 'All' 
                    ? [{ label: selectedCategory }]
                    : selectedTag 
                    ? [{ label: 'All Categories', href: '#' }, { label: `Tag: ${selectedTag}` }]
                    : []
                }
              />

              {filteredData.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400 text-lg">
                    No documentation found matching your filters.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedCategory('All');
                      setSelectedTag('');
                    }}
                    className="mt-4 px-4 py-2 bg-cloudflare-orange text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                filteredData.map((category, index) => (
                  <div 
                    key={category.id} 
                    id={`category-${category.id}`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <DocCategorySection category={category} />
                  </div>
                ))
              )}
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-gray-900 dark:bg-black text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">Resources</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><a href="#" className="hover:text-white transition-colors">API Documentation</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Getting Started</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Tutorials</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Support</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Company</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Connect</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><a href="#" className="hover:text-white transition-colors">GitHub</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Twitter</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Discord</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
              <p>&copy; 2024 Documentation Directory. Built with inspiration from Cloudflare.</p>
            </div>
          </div>
        </footer>
      </div>

      {/* Search Modal */}
      <SearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <FavoritesProvider>
        <AppContent />
      </FavoritesProvider>
    </ThemeProvider>
  );
}
