import React, { useState } from "react";

import { BucketVisualizer } from "../BucketVisualizer";

const BucketVisualizerPage: React.FC = () => {
  const [refreshInterval, setRefreshInterval] = useState(30000);
  const [maxPreviewSize, setMaxPreviewSize] = useState(1024 * 1024); // 1MB
  const [enableInlinePreview, setEnableInlinePreview] = useState(true);
  const [showAdvancedInfo, setShowAdvancedInfo] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bucket Visualizer</h1>
          <p className="text-gray-600">
            Visualize and manage your Cloudflare R2 bucket contents with enhanced schema support and
            BunFile integration.
          </p>
        </div>

        {/* Configuration Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Refresh Interval (ms)
              </label>
              <input
                type="number"
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                step="1000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Preview Size (bytes)
              </label>
              <input
                type="number"
                value={maxPreviewSize}
                onChange={(e) => setMaxPreviewSize(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                step="1024"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="enablePreview"
                checked={enableInlinePreview}
                onChange={(e) => setEnableInlinePreview(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="enablePreview" className="ml-2 block text-sm text-gray-900">
                Enable Preview
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="showAdvanced"
                checked={showAdvancedInfo}
                onChange={(e) => setShowAdvancedInfo(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="showAdvanced" className="ml-2 block text-sm text-gray-900">
                Show Advanced Info
              </label>
            </div>
          </div>
        </div>

        {/* Bucket Visualizer */}
        <BucketVisualizer
          refreshInterval={refreshInterval}
          maxPreviewSize={maxPreviewSize}
          enableInlinePreview={enableInlinePreview}
          showAdvancedInfo={showAdvancedInfo}
        />

        {/* Documentation */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <h2 className="text-xl font-semibold mb-4">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">🔍 Enhanced Preview</h3>
              <p className="text-sm text-gray-600">
                Smart file previews with syntax highlighting for code, metadata extraction for
                images, and document analysis.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">🏷️ Schema Support</h3>
              <p className="text-sm text-gray-600">
                Comprehensive file schema with categorization, metadata extraction, and processing
                status tracking.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">⚡ BunFile Integration</h3>
              <p className="text-sm text-gray-600">
                Native Bun file operations for optimal performance with streaming and lazy loading
                capabilities.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">📊 Real-time Statistics</h3>
              <p className="text-sm text-gray-600">
                Live bucket statistics including file counts, storage usage, and type distribution
                analytics.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">🔍 Advanced Search</h3>
              <p className="text-sm text-gray-600">
                Powerful search and filtering capabilities with support for file types, names, and
                metadata.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">🛡️ Type Safety</h3>
              <p className="text-sm text-gray-600">
                Full TypeScript support with comprehensive interfaces and strict type checking
                throughout.
              </p>
            </div>
          </div>
        </div>

        {/* Usage Examples */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <h2 className="text-xl font-semibold mb-4">Usage Examples</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Upload with Schema</h3>
              <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-x-auto">
                {`import { uploadWithSchema } from '@/utils/r2';

const result = await uploadWithSchema(file, 'documents/report.pdf', {
  generateChecksum: true,
  extractMetadata: true,
  validateIntegrity: true
});

console.log('File uploaded:', result.result.url);
console.log('Schema:', result.schema);`}
              </pre>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Get Enhanced File</h3>
              <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-x-auto">
                {`import { getEnhancedBunFile } from '@/utils/r2';

const enhancedFile = await getEnhancedBunFile('documents/report.pdf');
if (enhancedFile) {
  const content = await enhancedFile.text();
  const schema = await getFileSchema('documents/report.pdf');
  console.log('File category:', schema?.category);
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BucketVisualizerPage;
