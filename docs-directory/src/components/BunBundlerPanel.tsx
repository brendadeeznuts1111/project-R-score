import React, { useState } from 'react';
import { Package, Play, Square, Settings, Trash2, Plus, Download, Upload } from 'lucide-react';
import { useBunBundler } from '../hooks/useBunBundler';

export default function BunBundlerPanel() {
  const { isBundling, bundleResult, bundleHistory, bundle, analyzeBundle, optimizeBundle } = useBunBundler();
  const [config, setConfig] = useState({
    entry: './src/index.ts',
    output: './dist/bundle.js',
    format: 'esm' as const,
    minify: true,
    sourcemap: true,
    target: 'browser' as const,
    external: ['react', 'react-dom']
  });

  const handleBundle = async () => {
    await bundle(config);
  };

  const handleOptimize = async () => {
    if (bundleResult?.output) {
      const optimized = await optimizeBundle(bundleResult.output);
      console.log('Optimized bundle:', optimized);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
          <Package className="w-5 h-5 text-cloudflare-orange" />
          <span>Bun Bundler</span>
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleBundle}
            disabled={isBundling}
            className="flex items-center space-x-2 px-3 py-2 bg-cloudflare-orange text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {isBundling ? (
              <>
                <Settings className="w-4 h-4 animate-spin" />
                <span>Bundling...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Bundle</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Bundle Configuration */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Configuration</h4>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Entry Point</label>
              <input
                type="text"
                value={config.entry}
                onChange={(e) => setConfig(prev => ({ ...prev, entry: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Output</label>
              <input
                type="text"
                value={config.output}
                onChange={(e) => setConfig(prev => ({ ...prev, output: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Format</label>
              <select
                value={config.format}
                onChange={(e) => setConfig(prev => ({ ...prev, format: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              >
                <option value="esm">ESM</option>
                <option value="cjs">CommonJS</option>
                <option value="iife">IIFE</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Target</label>
              <select
                value={config.target}
                onChange={(e) => setConfig(prev => ({ ...prev, target: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              >
                <option value="browser">Browser</option>
                <option value="node">Node.js</option>
                <option value="bun">Bun</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">External</label>
              <input
                type="text"
                value={config.external.join(', ')}
                onChange={(e) => setConfig(prev => ({ 
                  ...prev, 
                  external: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.minify}
                onChange={(e) => setConfig(prev => ({ ...prev, minify: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Minify</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.sourcemap}
                onChange={(e) => setConfig(prev => ({ ...prev, sourcemap: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Sourcemap</span>
            </label>
          </div>
        </div>
      </div>

      {/* Bundle Result */}
      {bundleResult && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Bundle Result</h4>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 text-xs rounded-full ${
                bundleResult.success 
                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                  : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
              }`}>
                {bundleResult.success ? 'Success' : 'Failed'}
              </span>
              {bundleResult.success && (
                <button
                  onClick={handleOptimize}
                  className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                >
                  Optimize
                </button>
              )}
            </div>
          </div>

          {bundleResult.success ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Size</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {formatFileSize(bundleResult.size)}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Duration</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {bundleResult.duration}ms
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Complexity</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {analyzeBundle(bundleResult.output).complexity}%
                  </div>
                </div>
              </div>

              {bundleResult.warnings.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">Warnings</div>
                  <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                    {bundleResult.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Output Preview</div>
                <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto max-h-32">
                  {bundleResult.output.slice(0, 500)}...
                </pre>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">Errors</div>
              <ul className="text-xs text-red-700 dark:text-red-300 space-y-1">
                {bundleResult.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Bundle History */}
      {bundleHistory.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Bundle History</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {bundleHistory.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
                <div className="flex items-center space-x-3">
                  <span className={`w-2 h-2 rounded-full ${
                    result.success ? 'bg-green-500' : 'bg-red-500'
                  }`}></span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {formatFileSize(result.size)}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {result.duration}ms
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bun Bundler Features */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-600 dark:text-gray-400">
          <div className="font-medium mb-2">Bun Bundler Features:</div>
          <ul className="space-y-1">
            <li>• Lightning-fast bundling with native performance</li>
            <li>• Built-in minification and optimization</li>
            <li>• Multiple output formats (ESM, CJS, IIFE)</li>
            <li>• Source map generation</li>
            <li>• Tree shaking and dead code elimination</li>
            <li>• CSS and asset bundling</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
