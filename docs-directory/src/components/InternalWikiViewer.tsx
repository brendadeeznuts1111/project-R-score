import React, { useState, useMemo } from 'react';
import { Book, FileText, Globe, Cpu, Shield, Database, Zap, Palette, Search, Filter, ExternalLink, ChevronRight } from 'lucide-react';

interface WikiUtility {
  name: string;
  category: string;
  wikiUrl: string;
  docsUrl: string;
  hasExample: boolean;
}

interface WikiCategory {
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  description: string;
  utilities: WikiUtility[];
}

const InternalWikiViewer: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedUtility, setSelectedUtility] = useState<WikiUtility | null>(null);

  // Mock data for internal wiki utilities
  const wikiData: WikiCategory[] = [
    {
      name: 'FILE SYSTEM',
      icon: <FileText className="w-5 h-5" />,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
      description: 'File operations and directory management',
      utilities: [
        { name: 'MAIN', category: 'FILE SYSTEM', wikiUrl: '/wiki/fs/main', docsUrl: 'https://bun.sh/docs/api/file-io', hasExample: true },
        { name: 'READ FILE', category: 'FILE SYSTEM', wikiUrl: '/wiki/fs/read', docsUrl: 'https://bun.sh/docs/api/file-io#bun-file', hasExample: true },
        { name: 'WRITE FILE', category: 'FILE SYSTEM', wikiUrl: '/wiki/fs/write', docsUrl: 'https://bun.sh/docs/api/file-io#bun-write', hasExample: true }
      ]
    },
    {
      name: 'NETWORKING',
      icon: <Globe className="w-5 h-5" />,
      color: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
      description: 'HTTP, WebSocket, TCP, UDP, DNS',
      utilities: [
        { name: 'MAIN', category: 'NETWORKING', wikiUrl: '/wiki/net/main', docsUrl: 'https://bun.sh/docs/api/http', hasExample: true },
        { name: 'FETCH', category: 'NETWORKING', wikiUrl: '/wiki/net/fetch', docsUrl: 'https://bun.sh/docs/api/fetch', hasExample: true },
        { name: 'SERVE', category: 'NETWORKING', wikiUrl: '/wiki/net/serve', docsUrl: 'https://bun.sh/docs/api/http', hasExample: true }
      ]
    },
    {
      name: 'PROCESS',
      icon: <Cpu className="w-5 h-5" />,
      color: 'text-purple-500',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20',
      description: 'Process management and system operations',
      utilities: [
        { name: 'MAIN', category: 'PROCESS', wikiUrl: '/wiki/process/main', docsUrl: 'https://bun.sh/docs/api/process', hasExample: true },
        { name: 'SPAWN', category: 'PROCESS', wikiUrl: '/wiki/process/spawn', docsUrl: 'https://bun.sh/docs/api/spawn', hasExample: true },
        { name: 'EXEC', category: 'PROCESS', wikiUrl: '/wiki/process/exec', docsUrl: 'https://bun.sh/docs/api/exec', hasExample: true }
      ]
    }
  ];

  // Filter utilities based on category and search
  const filteredUtilities = useMemo(() => {
    return wikiData.flatMap(category => 
      category.utilities.filter(utility => {
        const matchesCategory = selectedCategory === 'all' || category.name === selectedCategory;
        const matchesSearch = searchQuery === '' || 
          utility.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          category.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      })
    );
  }, [selectedCategory, searchQuery]);

  // Calculate statistics
  const totalUtilities = wikiData.reduce((sum, category) => sum + category.utilities.length, 0);
  const totalCategories = wikiData.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-slate-900 dark:to-purple-900">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Book className="w-8 h-8 text-purple-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Internal Wiki</h1>
                <p className="text-gray-600 dark:text-gray-300">Bun Utilities Documentation</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4" />
                <span>{totalUtilities} Utilities</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span>{totalCategories} Categories</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search utilities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Category Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {wikiData.map(category => (
                  <option key={category.name} value={category.name}>
                    {category.name} ({category.utilities.length})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Category Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
          {wikiData.map(category => (
            <div
              key={category.name}
              onClick={() => setSelectedCategory(category.name)}
              className={`bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 cursor-pointer transition-all hover:shadow-xl hover:scale-105 ${
                selectedCategory === category.name ? 'ring-2 ring-purple-500' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${category.bgColor}`}>
                  {category.icon}
                </div>
                <span className={`text-2xl font-bold ${category.color}`}>
                  {category.utilities.length}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{category.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{category.description}</p>
            </div>
          ))}
        </div>

        {/* Utilities List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Utility List */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedCategory === 'all' ? 'All Utilities' : selectedCategory} 
                <span className="ml-2 text-sm text-gray-500">({filteredUtilities.length})</span>
              </h2>
            </div>
            
            <div className="divide-y divide-slate-200 dark:divide-slate-700 max-h-96 overflow-y-auto">
              {filteredUtilities.map((utility, index) => {
                const category = wikiData.find(cat => cat.name === utility.category);
                return (
                  <div
                    key={`${utility.category}-${utility.name}-${index}`}
                    onClick={() => setSelectedUtility(utility)}
                    className={`px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer ${
                      selectedUtility?.name === utility.name ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${category?.bgColor}`}>
                          {category?.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{utility.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{utility.category}</p>
                        </div>
                      </div>
                      
                      {utility.hasExample && (
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Utility Details */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Utility Details</h2>
            </div>
            
            <div className="p-6">
              {selectedUtility ? (
                <div className="space-y-6">
                  {/* Utility Header */}
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {selectedUtility.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Category: {selectedUtility.category}
                    </p>
                  </div>

                  {/* Links */}
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Documentation Links</h4>
                    <div className="space-y-2">
                      <a
                        href={selectedUtility.wikiUrl}
                        className="flex items-center space-x-2 text-purple-600 hover:text-purple-500 transition-colors"
                      >
                        <Book className="w-4 h-4" />
                        <span>Internal Wiki</span>
                      </a>
                      <a
                        href={selectedUtility.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 text-blue-600 hover:text-blue-500 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Official Documentation</span>
                      </a>
                    </div>
                  </div>

                  {/* Example Indicator */}
                  {selectedUtility.hasExample && (
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Examples</h4>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          Code examples available
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Book className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Select a utility to view details
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InternalWikiViewer;
