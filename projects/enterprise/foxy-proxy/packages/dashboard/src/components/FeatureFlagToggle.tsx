import React, { useState, useEffect } from "react";
import {
  Settings,
  ToggleLeft,
  ToggleRight,
  Info,
  Bug,
  Zap,
  Shield,
  Crown,
  BarChart3,
  Clock,
  Globe
} from "lucide-react";

import {
  isDebugMode,
  isDeveloperMode,
  isDuoPlusEnabled,
  isEnhancedTemplatesEnabled,
  isDateTimeStandardizationEnabled,
  isBunTimezoneEnabled,
  areBetaFeaturesEnabled,
  isAdvancedAnalyticsEnabled,
  isPremiumEnabled,
  isAnalyticsEnabled,
  isMonitoringEnabled,
  getBuildMode
} from "../utils/feature-flags";
import { DateUtils } from "../utils/date-utils";

interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  category: "core" | "platform" | "advanced" | "system";
  dependencies?: string[];
}

export const FeatureFlagToggle: React.FC = () => {
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentTimezone, setCurrentTimezone] = useState<string>("");
  const [buildMode] = useState<string>(() => getBuildMode());

  useEffect(() => {
    // Update time every second when date/time features are enabled
    if (isDateTimeStandardizationEnabled()) {
      const updateTime = () => {
        const now = DateUtils.now();
        setCurrentTime(now.format("DISPLAY_DATETIME"));
        setCurrentTimezone(DateUtils.getEffectiveTimezone());
      };

      updateTime();
      const interval = setInterval(updateTime, 1000);
      return () => clearInterval(interval);
    }
  }, []);

  const featureFlags: FeatureFlag[] = [
    // Core Features
    {
      key: "debug",
      name: "Debug Mode",
      description: "Enable debug logging and development tools",
      icon: <Bug className="w-4 h-4" />,
      enabled: isDebugMode(),
      category: "core"
    },
    {
      key: "developer",
      name: "Developer Mode",
      description: "Show developer tools and advanced options",
      icon: <Settings className="w-4 h-4" />,
      enabled: isDeveloperMode(),
      category: "core"
    },
    {
      key: "premium",
      name: "Premium Features",
      description: "Unlock advanced premium capabilities",
      icon: <Crown className="w-4 h-4" />,
      enabled: isPremiumEnabled(),
      category: "core"
    },

    // Platform Features
    {
      key: "duoplus",
      name: "DuoPlus Integration",
      description: "Cloud phone management and control",
      icon: <Zap className="w-4 h-4" />,
      enabled: isDuoPlusEnabled,
      category: "platform"
    },
    {
      key: "enhanced_templates",
      name: "Enhanced Templates",
      description: "Advanced template system with 7+ categories",
      icon: <BarChart3 className="w-4 h-4" />,
      enabled: isEnhancedTemplatesEnabled,
      category: "platform"
    },
    {
      key: "date_time_standardization",
      name: "Date/Time Standardization",
      description: "Unified timezone-aware date handling",
      icon: <Clock className="w-4 h-4" />,
      enabled: isDateTimeStandardizationEnabled(),
      category: "platform"
    },
    {
      key: "bun_timezone",
      name: "Bun Timezone Support",
      description: "Built-in timezone management",
      icon: <Globe className="w-4 h-4" />,
      enabled: isBunTimezoneEnabled(),
      category: "platform",
      dependencies: ["date_time_standardization"]
    },
    {
      key: "beta_features",
      name: "Beta Features",
      description: "Enable experimental features",
      icon: <Info className="w-4 h-4" />,
      enabled: areBetaFeaturesEnabled(),
      category: "platform"
    },

    // Advanced Features
    {
      key: "advanced_analytics",
      name: "Advanced Analytics",
      description: "Enhanced analytics and reporting",
      icon: <BarChart3 className="w-4 h-4" />,
      enabled: isAdvancedAnalyticsEnabled(),
      category: "advanced"
    },
    {
      key: "analytics",
      name: "Basic Analytics",
      description: "Standard analytics and metrics",
      icon: <BarChart3 className="w-4 h-4" />,
      enabled: isAnalyticsEnabled(),
      category: "advanced"
    },
    {
      key: "monitoring",
      name: "System Monitoring",
      description: "Application health monitoring",
      icon: <Shield className="w-4 h-4" />,
      enabled: isMonitoringEnabled(),
      category: "advanced"
    }
  ];

  const categories = [
    { key: "core", name: "Core Features", color: "blue" },
    { key: "platform", name: "Platform Features", color: "green" },
    { key: "advanced", name: "Advanced Features", color: "purple" },
    { key: "system", name: "System Features", color: "gray" }
  ];

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      core: "bg-blue-50 border-blue-200 text-blue-800",
      platform: "bg-green-50 border-green-200 text-green-800",
      advanced: "bg-purple-50 border-purple-200 text-purple-800",
      system: "bg-gray-50 border-gray-200 text-gray-800"
    };
    return colors[category] || colors.system;
  };

  const getStatusColor = (enabled: boolean) => {
    return enabled
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-red-100 text-red-800 border-red-200";
  };

  const isDependencyMet = (dependencies?: string[]) => {
    if (!dependencies) {
      return true;
    }
    return dependencies.every((dep) => {
      const flag = featureFlags.find((f) => f.key === dep);
      return flag?.enabled;
    });
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Feature Flags</h2>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="px-2 py-1 bg-gray-100 rounded">Build: {buildMode}</span>
          {isDateTimeStandardizationEnabled() && (
            <>
              <span className="px-2 py-1 bg-blue-100 rounded">Time: {currentTime}</span>
              <span className="px-2 py-1 bg-green-100 rounded">TZ: {currentTimezone}</span>
            </>
          )}
        </div>
      </div>

      {categories.map((category) => {
        const categoryFlags = featureFlags.filter((flag) => flag.category === category.key);
        if (categoryFlags.length === 0) {
          return null;
        }

        return (
          <div key={category.key} className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(category.key)}`}
              >
                {category.name}
              </span>
              <span className="text-sm text-gray-500">
                ({categoryFlags.filter((f) => f.enabled).length}/{categoryFlags.length} enabled)
              </span>
            </h3>

            <div className="grid gap-3 md:grid-cols-2">
              {categoryFlags.map((flag) => {
                const dependencyMet = isDependencyMet(flag.dependencies);

                return (
                  <div
                    key={flag.key}
                    className={`border rounded-lg p-4 transition-all ${
                      dependencyMet
                        ? "border-gray-200 hover:shadow-md"
                        : "border-gray-100 opacity-50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${getCategoryColor(flag.category)}`}>
                          {flag.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 flex items-center gap-2">
                            {flag.name}
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(flag.enabled)}`}
                            >
                              {flag.enabled ? "ON" : "OFF"}
                            </span>
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">{flag.description}</p>
                          {flag.dependencies && (
                            <div className="mt-2">
                              <span className="text-xs text-gray-500">
                                Requires: {flag.dependencies.join(", ")}
                              </span>
                              {!dependencyMet && (
                                <span className="ml-2 text-xs text-red-600 font-medium">
                                  ⚠️ Dependencies not met
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="ml-3">
                        {flag.enabled ? (
                          <ToggleRight className="w-6 h-6 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Feature-specific content */}
                    {flag.key === "date_time_standardization" && flag.enabled && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="text-xs text-gray-600">
                          <div>UTC Storage: {DateUtils.now().format("ISO")}</div>
                          <div>Local Display: {DateUtils.now().format("DISPLAY_DATETIME")}</div>
                          <div>File Timestamp: {DateUtils.fileTimestamp()}</div>
                        </div>
                      </div>
                    )}

                    {flag.key === "bun_timezone" && flag.enabled && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="text-xs text-gray-600">
                          <div>Bun TZ: {DateUtils.getBunTimezone() || "Not set"}</div>
                          <div>Effective TZ: {DateUtils.getEffectiveTimezone()}</div>
                          <div>Offset: {DateUtils.getCurrentTimezoneOffset()}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Developer Mode Info */}
      {isDeveloperMode() && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800">Developer Mode Active</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Feature flags are set at build time. To modify them, update your environment
                variables and rebuild.
              </p>
              <div className="mt-2 text-xs text-yellow-600 font-mono">
                Example: VITE_DATE_TIME_STANDARDIZATION=true bun run build
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {featureFlags.filter((f) => f.enabled).length}
            </div>
            <div className="text-sm text-gray-600">Features Enabled</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {featureFlags.filter((f) => !f.enabled).length}
            </div>
            <div className="text-sm text-gray-600">Features Disabled</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{categories.length}</div>
            <div className="text-sm text-gray-600">Categories</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 capitalize">{buildMode}</div>
            <div className="text-sm text-gray-600">Build Mode</div>
          </div>
        </div>
      </div>
    </div>
  );
};
