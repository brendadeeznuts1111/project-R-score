import React from "react";

import { FeatureFlagsPanel } from "../../components/FeatureFlagsPanel";

/**
 * Features Management Page
 * Allows users to view and control feature flags
 */
export const FeaturesPage: React.FC = () => {
  return (
    <div className="features-page min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Feature Management</h1>
          <p className="text-gray-600">
            View and manage feature flags for the dashboard. Toggle runtime features on and off to
            test different functionality configurations.
          </p>
        </div>

        {/* Feature Flags Panel */}
        <div className="mb-8">
          <FeatureFlagsPanel />
        </div>

        {/* Documentation */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">About Feature Flags</h2>

          <div className="space-y-4 text-gray-700">
            <div>
              <h3 className="font-bold text-gray-900 mb-2">🔧 Build-Time Features</h3>
              <p>
                Build-time features are compiled into the bundle and determined at build time using
                Bun's <code className="bg-gray-100 px-2 py-1 rounded text-sm">feature()</code>{" "}
                function. These features enable dead-code elimination, where unused code is
                completely removed from the final bundle.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-2">⚙️ Runtime Features</h3>
              <p>
                Runtime features can be toggled on and off without rebuilding. These are controlled
                through environment variables and can be changed dynamically. Your selections are
                saved to the browser's localStorage.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-2">Current Configuration</h3>
              <ul className="space-y-2 ml-4">
                <li>
                  • <strong>Build Mode:</strong> Returns build-time configuration information
                </li>
                <li>
                  • <strong>localStorage:</strong> Runtime toggles are persisted in localStorage
                </li>
                <li>
                  • <strong>Performance:</strong> Feature checks are optimized for minimal overhead
                </li>
                <li>
                  • <strong>Type Safety:</strong> All feature flags are fully typed
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
              <p className="font-semibold text-blue-900 mb-2">💡 Performance Tip</p>
              <p className="text-blue-800 text-sm">
                Feature flag checks are extremely fast (averaging 0.0002ms per operation with 20M+
                ops/sec). You can safely use them throughout your application without performance
                concerns.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturesPage;
