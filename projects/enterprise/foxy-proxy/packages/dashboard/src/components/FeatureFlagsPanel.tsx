import React, { useState, useEffect } from "react";

import {
  COMPILE_TIME_FEATURES,
  RUNTIME_FEATURES
} from "../utils/feature-flags";

interface FeatureState {
  name: string;
  enabled: boolean;
  type: "compile-time" | "runtime";
  category?: string;
}

/**
 * Feature Flags Panel Component - Enhanced
 * Displays and allows toggling of compile-time and runtime feature flags
 * with search, filtering, grouping, and export/import functionality
 */
export const FeatureFlagsPanel: React.FC = () => {
  const [features, setFeatures] = useState<FeatureState[]>([]);
  const [filter, setFilter] = useState<"all" | "enabled" | "disabled">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [runtimeToggles, setRuntimeToggles] = useState<Record<string, boolean>>({});
  const [copyNotification, setCopyNotification] = useState(false);

  // Initialize features on component mount
  useEffect(() => {
    const compileTimeFeatures = Object.entries(COMPILE_TIME_FEATURES).map(([name, enabled]) => ({
      name,
      enabled,
      type: "compile-time" as const
    }));

    const runtimeFeatures = Object.entries(RUNTIME_FEATURES).map(([name, enabled]) => ({
      name,
      enabled,
      type: "runtime" as const
    }));

    // Initialize runtime toggles from localStorage
    const savedToggles = localStorage.getItem("featureFlagToggles");
    if (savedToggles) {
      try {
        setRuntimeToggles(JSON.parse(savedToggles));
      } catch (e) {
        console.error("Failed to parse saved feature toggles:", e);
      }
    }

    setFeatures([...runtimeFeatures, ...compileTimeFeatures]);
  }, []);

  const handleRuntimeToggle = (featureName: string) => {
    setRuntimeToggles((prev) => {
      const updated = {
        ...prev,
        [featureName]: !prev[featureName]
      };
      // Persist to localStorage
      localStorage.setItem("featureFlagToggles", JSON.stringify(updated));
      return updated;
    });
  };

  const filteredFeatures = features.filter((feature) => {
    // Check filter status
    let passesFilter = true;

    if (filter === "enabled") {
      if (feature.type === "runtime") {
        passesFilter = runtimeToggles[feature.name] ?? feature.enabled;
      } else {
        passesFilter = feature.enabled;
      }
    } else if (filter === "disabled") {
      if (feature.type === "runtime") {
        passesFilter = !(runtimeToggles[feature.name] ?? feature.enabled);
      } else {
        passesFilter = !feature.enabled;
      }
    }

    // Check search term
    const passesSearch = searchTerm === "" || feature.name.includes(searchTerm);

    return passesFilter && passesSearch;
  });

  const enabledCount = features.filter((f) => {
    if (f.type === "runtime") {
      return runtimeToggles[f.name] ?? f.enabled;
    }
    return f.enabled;
  }).length;

  const runtimeCount = features.filter((f) => f.type === "runtime").length;

  return (
    <div className="feature-flags-panel p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2 text-gray-900">Feature Flags</h2>
        <p className="text-gray-600 text-sm">
          Manage compile-time and runtime feature flags for the dashboard
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-blue-600 text-sm font-medium">Total Features</p>
          <p className="text-2xl font-bold text-blue-900">{features.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-green-600 text-sm font-medium">Enabled</p>
          <p className="text-2xl font-bold text-green-900">{enabledCount}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <p className="text-purple-600 text-sm font-medium">Runtime Toggleable</p>
          <p className="text-2xl font-bold text-purple-900">{runtimeCount}</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search features..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Filter and Control Buttons */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded text-sm font-medium transition ${
            filter === "all"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          All ({features.length})
        </button>
        <button
          onClick={() => setFilter("enabled")}
          className={`px-4 py-2 rounded text-sm font-medium transition ${
            filter === "enabled"
              ? "bg-green-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Enabled ({enabledCount})
        </button>
        <button
          onClick={() => setFilter("disabled")}
          className={`px-4 py-2 rounded text-sm font-medium transition ${
            filter === "disabled"
              ? "bg-red-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Disabled ({features.length - enabledCount})
        </button>

        <div className="flex-1"></div>

        {/* Export Button */}
        <button
          onClick={() => {
            const state = {
              runtimeToggles,
              timestamp: new Date().toISOString(),
              version: "1.0"
            };
            navigator.clipboard.writeText(JSON.stringify(state, null, 2));
            setCopyNotification(true);
            setTimeout(() => setCopyNotification(false), 2000);
          }}
          className="px-4 py-2 rounded text-sm font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 transition"
        >
          {copyNotification ? "✓ Copied!" : "📋 Export"}
        </button>

        {/* Reset Button */}
        <button
          onClick={() => {
            setRuntimeToggles({});
            localStorage.removeItem("featureFlagToggles");
          }}
          className="px-4 py-2 rounded text-sm font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 transition"
        >
          🔄 Reset
        </button>
      </div>

      {/* Features List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredFeatures.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No features found with the selected filter
          </div>
        ) : (
          filteredFeatures.map((feature) => {
            const isEnabled =
              feature.type === "runtime"
                ? (runtimeToggles[feature.name] ?? feature.enabled)
                : feature.enabled;

            return (
              <div
                key={feature.name}
                className={`flex items-center justify-between p-3 rounded-lg border transition ${
                  isEnabled ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{feature.name}</h3>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        feature.type === "runtime"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {feature.type === "runtime" ? "⚙️ Runtime" : "🔧 Build-time"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-medium ${
                      isEnabled ? "text-green-600" : "text-gray-500"
                    }`}
                  >
                    {isEnabled ? "ON" : "OFF"}
                  </span>

                  {feature.type === "runtime" ? (
                    <button
                      onClick={() => handleRuntimeToggle(feature.name)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        isEnabled ? "bg-green-600" : "bg-gray-300"
                      }`}
                      aria-label={`Toggle ${feature.name}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  ) : (
                    <div className="w-11 text-center">
                      <span className="text-2xl">{isEnabled ? "✓" : "✕"}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> Build-time features are determined at build time and cannot be
          toggled. Only runtime features can be toggled using the switches above. Changes are
          persisted to localStorage.
        </p>
      </div>
    </div>
  );
};

export default FeatureFlagsPanel;
