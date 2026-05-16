import React, { useState, useMemo } from 'react';
import { 
  Server, Terminal, Package, FileText, Cpu, Network, Globe, Database, 
  Shield, Zap, Code, Hash, TestTube, Users, Cookie, Search, Filter,
  ExternalLink, ChevronRight, Book, Settings, Router, Globe2, Lock,
  Clock, Random, Memory, Archive, Layers, GitBranch, Play, Pause
} from 'lucide-react';

interface APIItem {
  name: string;
  description: string;
  category: string;
  methods: string[];
  examples?: string[];
  related?: string[];
}

interface APICategory {
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  description: string;
  apis: APIItem[];
}

const BunAPIsViewer: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAPI, setSelectedAPI] = useState<APIItem | null>(null);

  // Sample APIs data
  const apisData: APICategory[] = [
    {
      name: 'HTTP Server',
      icon: <Server className="w-5 h-5" />,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
      description: 'Built-in HTTP server for high-performance web applications',
      apis: [
        {
          name: 'Bun.serve',
          description: 'Create HTTP server with routing, WebSocket support, and TLS',
          category: 'HTTP Server',
          methods: ['serve(options)', 'stop()', 'reload()'],
          examples: ['Basic server', 'HTTPS server', 'WebSocket server', 'File server']
        }
      ]
    },
    {
      name: 'File I/O',
      icon: <FileText className="w-5 h-5" />,
      color: 'text-orange-500',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20',
      description: 'High-performance file system operations',
      apis: [
        {
          name: 'Bun.file',
          description: 'Read and write files with advanced streaming support',
          category: 'File I/O',
          methods: ['file(path)', 'text()', 'json()', 'arrayBuffer()', 'stream()'],
          examples: ['Read files', 'Write files', 'Stream processing', 'File metadata']
        }
      ]
    }
  ];

  // Filter APIs based on category and search
  const filteredAPIs = useMemo(() => {
    return apisData.flatMap(category => 
      category.apis.filter(api => {
        const matchesCategory = selectedCategory === 'all' || category.name === selectedCategory;
        const matchesSearch = searchQuery === '' || 
          api.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          api.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          category.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      }).map(api => ({ ...api, categoryInfo: category }))
    );
  }, [selectedCategory, searchQuery]);

  // Calculate statistics
  const totalAPIs = apisData.reduce((sum, category) => sum + category.apis.length, 0);
  const totalCategories = apisData.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Code className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bun APIs</h1>
                <p className="text-gray-600 dark:text-gray-300">Complete API Reference & Documentation</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center space-x-2">
                <Package className="w-4 h-4" />
                <span>{totalAPIs} APIs</span>
              </div>
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4" />
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
                  placeholder="Search APIs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Category Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {apisData.map(category => (
                  <option key={category.name} value={category.name}>
                    {category.name} ({category.apis.length})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Category Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
          {apisData.map(category => (
            <div
              key={category.name}
              onClick={() => setSelectedCategory(category.name)}
              className={`bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 cursor-pointer transition-all hover:shadow-xl hover:scale-105 ${
                selectedCategory === category.name ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${category.bgColor}`}>
                  {category.icon}
                </div>
                <span className={`text-2xl font-bold ${category.color}`}>
                  {category.apis.length}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{category.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{category.description}</p>
            </div>
          ))}
        </div>

        {/* APIs List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* API List */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedCategory === 'all' ? 'All APIs' : selectedCategory} 
                <span className="ml-2 text-sm text-gray-500">({filteredAPIs.length})</span>
              </h2>
            </div>
            
            <div className="divide-y divide-slate-200 dark:divide-slate-700 max-h-96 overflow-y-auto">
              {filteredAPIs.map((api: any, index) => {
                const category = api.categoryInfo;
                return (
                  <div
                    key={`${api.category}-${api.name}-${index}`}
                    onClick={() => setSelectedAPI(api)}
                    className={`px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer ${
                      selectedAPI?.name === api.name ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${category.bgColor}`}>
                          {category.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{api.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{api.category}</p>
                        </div>
                      </div>
                      
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* API Details */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">API Details</h2>
            </div>
            
            <div className="p-6">
              {selectedAPI ? (
                <div className="space-y-6">
                  {/* API Header */}
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {selectedAPI.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      {selectedAPI.description}
                    </p>
                  </div>

                  {/* Methods */}
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Methods</h4>
                    <div className="space-y-2">
                      {selectedAPI.methods.map((method, index) => (
                        <div key={index} className="bg-slate-100 dark:bg-slate-700 rounded-lg p-3">
                          <code className="text-sm font-mono text-blue-600 dark:text-blue-400">
                            {method}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Examples */}
                  {selectedAPI.examples && (
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Examples</h4>
                      <div className="space-y-2">
                        {selectedAPI.examples.map((example, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              {example}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* External Link */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <a
                      href="https://bun.sh/docs"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-500 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>View Official Documentation</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Book className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Select an API to view details
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

export default BunAPIsViewer;
