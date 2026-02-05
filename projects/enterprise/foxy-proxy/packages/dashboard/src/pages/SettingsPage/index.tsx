import React, { useState } from "react";
import {
  Key,
  Smartphone,
  Bell,
  Save,
  Eye,
  EyeOff,
  Cloud,
  Database,
  Terminal,
  Layers,
  Cpu,
  Info
} from "lucide-react";

import { SchemaMatchingDashboard } from "../../components/SchemaMatchingDashboard";
import {
  getEnabledFeatures,
  COMPILE_TIME_FEATURES,
  RUNTIME_FEATURES,
  getBuildMode,
  getCurrentTier as getTier
} from "../../utils/feature-flags";

export const SettingsPage: React.FC = () => {
  const [apiToken, setApiToken] = useState("");
  const [apiId, setApiId] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [showId, setShowId] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState("30");

  // R2 Configuration
  const [r2AccountId, setR2AccountId] = useState("");
  const [r2AccessKeyId, setR2AccessKeyId] = useState("");
  const [r2SecretAccessKey, setR2SecretAccessKey] = useState("");
  const [r2BucketName, setR2BucketName] = useState("foxy-proxy-storage");
  const [r2PublicUrl, setR2PublicUrl] = useState("");
  const [showR2Secret, setShowR2Secret] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Save settings logic here
    console.log("Settings saved");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">Manage your account settings and preferences</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* API Configuration */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Key className="h-5 w-5 mr-2" />
              API Configuration
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="apiToken" className="block text-sm font-medium text-gray-700">
                API Token
              </label>
              <div className="mt-1 relative">
                <input
                  type={showToken ? "text" : "password"}
                  id="apiToken"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="Enter your IPFoxy API token"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showToken ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Your IPFoxy API token. Find this in your IPFoxy dashboard.
              </p>
            </div>

            <div>
              <label htmlFor="apiId" className="block text-sm font-medium text-gray-700">
                API ID
              </label>
              <div className="mt-1 relative">
                <input
                  type={showId ? "text" : "password"}
                  id="apiId"
                  value={apiId}
                  onChange={(e) => setApiId(e.target.value)}
                  placeholder="Enter your IPFoxy API ID"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowId(!showId)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showId ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Your IPFoxy API user ID. Find this in your IPFoxy dashboard.
              </p>
            </div>
          </div>
        </div>

        {/* Mobile Integration */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Smartphone className="h-5 w-5 mr-2" />
              Mobile Integration
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Push Notifications</h4>
                <p className="text-sm text-gray-500">
                  Receive notifications about proxy status and usage on your mobile device
                </p>
              </div>
              <button
                type="button"
                className="relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer bg-primary-600 transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                role="switch"
                aria-checked="true"
              >
                <span className="translate-x-5 inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200"></span>
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Mobile Dashboard</h4>
                <p className="text-sm text-gray-500">
                  Access your dashboard from mobile devices with optimized interface
                </p>
              </div>
              <button
                type="button"
                className="relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer bg-primary-600 transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                role="switch"
                aria-checked="true"
              >
                <span className="translate-x-5 inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200"></span>
              </button>
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-md">
              <div className="flex">
                <Smartphone className="h-5 w-5 text-blue-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Mobile App Available</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      Download our mobile app for iOS and Android to manage your proxies on the go.
                    </p>
                    <div className="mt-3 flex space-x-3">
                      <button className="text-blue-800 underline text-sm">Download for iOS</button>
                      <button className="text-blue-800 underline text-sm">
                        Download for Android
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* R2 Storage Configuration */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Database className="h-5 w-5 mr-2" />
              Cloudflare R2 Storage
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="r2AccountId" className="block text-sm font-medium text-gray-700">
                Account ID
              </label>
              <input
                type="text"
                id="r2AccountId"
                value={r2AccountId}
                onChange={(e) => setR2AccountId(e.target.value)}
                placeholder="Your Cloudflare account ID"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="r2AccessKeyId" className="block text-sm font-medium text-gray-700">
                Access Key ID
              </label>
              <input
                type="text"
                id="r2AccessKeyId"
                value={r2AccessKeyId}
                onChange={(e) => setR2AccessKeyId(e.target.value)}
                placeholder="R2 API access key ID"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="r2SecretAccessKey"
                className="block text-sm font-medium text-gray-700"
              >
                Secret Access Key
              </label>
              <div className="mt-1 relative">
                <input
                  type={showR2Secret ? "text" : "password"}
                  id="r2SecretAccessKey"
                  value={r2SecretAccessKey}
                  onChange={(e) => setR2SecretAccessKey(e.target.value)}
                  placeholder="R2 API secret access key"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowR2Secret(!showR2Secret)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                >
                  {showR2Secret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="r2BucketName" className="block text-sm font-medium text-gray-700">
                Bucket Name
              </label>
              <input
                type="text"
                id="r2BucketName"
                value={r2BucketName}
                onChange={(e) => setR2BucketName(e.target.value)}
                placeholder="R2 bucket name"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="r2PublicUrl" className="block text-sm font-medium text-gray-700">
                Public URL (Optional)
              </label>
              <input
                type="url"
                id="r2PublicUrl"
                value={r2PublicUrl}
                onChange={(e) => setR2PublicUrl(e.target.value)}
                placeholder="https://your-custom-domain.com"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
              <p className="mt-1 text-sm text-gray-500">
                Custom domain for public file access. Leave empty to use default R2 URL.
              </p>
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-md">
              <div className="flex">
                <Cloud className="h-5 w-5 text-blue-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">R2 Storage Setup</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      Configure your Cloudflare R2 bucket for file storage and CDN capabilities.
                    </p>
                    <div className="mt-3">
                      <a
                        href="https://dash.cloudflare.com/r2"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-800 underline text-sm"
                      >
                        Manage R2 Buckets →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              Preferences
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Email Notifications</h4>
                <p className="text-sm text-gray-500">
                  Receive email updates about your proxy status and important events
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNotifications(!notifications)}
                className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                  notifications ? "bg-primary-600" : "bg-gray-200"
                }`}
                role="switch"
                aria-checked={notifications}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                    notifications ? "translate-x-5" : "translate-x-0"
                  }`}
                ></span>
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Dark Mode</h4>
                <p className="text-sm text-gray-500">Use dark theme for the dashboard interface</p>
              </div>
              <button
                type="button"
                onClick={() => setDarkMode(!darkMode)}
                className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                  darkMode ? "bg-primary-600" : "bg-gray-200"
                }`}
                role="switch"
                aria-checked={darkMode}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                    darkMode ? "translate-x-5" : "translate-x-0"
                  }`}
                ></span>
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Auto Refresh</h4>
                <p className="text-sm text-gray-500">
                  Automatically refresh proxy data at regular intervals
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                  autoRefresh ? "bg-primary-600" : "bg-gray-200"
                }`}
                role="switch"
                aria-checked={autoRefresh}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                    autoRefresh ? "translate-x-5" : "translate-x-0"
                  }`}
                ></span>
              </button>
            </div>

            {autoRefresh && (
              <div>
                <label
                  htmlFor="refreshInterval"
                  className="block text-sm font-medium text-gray-700"
                >
                  Refresh Interval (seconds)
                </label>
                <select
                  id="refreshInterval"
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                >
                  <option value="15">15 seconds</option>
                  <option value="30">30 seconds</option>
                  <option value="60">1 minute</option>
                  <option value="300">5 minutes</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Build Tier & Feature Flags */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Layers className="h-5 w-5 mr-2" />
              Build Tier & Feature Flags
            </h3>
          </div>
          <div className="p-6 space-y-6">
            {/* Current Tier Info */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Current Configuration</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Build Tier</span>
                    <Cpu className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="text-lg font-bold text-gray-900 capitalize">{getTier()}</div>
                  <div className="text-xs text-gray-500 mt-1">Build Mode: {getBuildMode()}</div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-700">Compile-time Features</span>
                    <Terminal className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="text-lg font-bold text-blue-900">
                    {Object.values(COMPILE_TIME_FEATURES).filter(Boolean).length}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">Enabled at build time</div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-700">Runtime Features</span>
                    <Info className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="text-lg font-bold text-green-900">
                    {Object.values(RUNTIME_FEATURES).filter(Boolean).length}
                  </div>
                  <div className="text-xs text-green-600 mt-1">Enabled at runtime</div>
                </div>
              </div>
            </div>

            {/* Enabled Features List */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Enabled Features</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex flex-wrap gap-2">
                  {getEnabledFeatures().map((feature) => (
                    <span
                      key={feature}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
                {getEnabledFeatures().length === 0 && (
                  <div className="text-sm text-gray-500 italic">No features enabled</div>
                )}
              </div>
            </div>

            {/* CLI Command Hints */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">CLI Command Hints</h4>
              <div className="space-y-3">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Terminal className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div>
                      <h5 className="font-medium text-yellow-800">Build Tiers</h5>
                      <div className="mt-2 space-y-1">
                        <code className="block text-xs bg-yellow-100 p-2 rounded text-yellow-900">
                          bun run tiers:free # Build free tier
                        </code>
                        <code className="block text-xs bg-yellow-100 p-2 rounded text-yellow-900">
                          bun run tiers:premium # Build premium tier
                        </code>
                        <code className="block text-xs bg-yellow-100 p-2 rounded text-yellow-900">
                          bun run tiers:enterprise # Build enterprise tier
                        </code>
                        <code className="block text-xs bg-yellow-100 p-2 rounded text-yellow-900">
                          bun run tiers:all # Build all tiers
                        </code>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Smartphone className="h-4 w-4 text-green-600 mt-0.5" />
                    <div>
                      <h5 className="font-medium text-green-800">CashApp CLI</h5>
                      <div className="mt-2 space-y-1">
                        <code className="block text-xs bg-green-100 p-2 rounded text-green-900">
                          bun run cashapp # Show CashApp CLI help
                        </code>
                        <code className="block text-xs bg-green-100 p-2 rounded text-green-900">
                          bun run cashapp:demo # Run demo mode
                        </code>
                        <code className="block text-xs bg-green-100 p-2 rounded text-green-900">
                          bun run cashapp:provision # Provision accounts
                        </code>
                        <code className="block text-xs bg-green-100 p-2 rounded text-green-900">
                          bun run cashapp:monitor # Monitor scaling
                        </code>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Database className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div>
                      <h5 className="font-medium text-blue-800">Profile CLI</h5>
                      <div className="mt-2 space-y-1">
                        <code className="block text-xs bg-blue-100 p-2 rounded text-blue-900">
                          bun run profile # Show profile CLI help
                        </code>
                        <code className="block text-xs bg-blue-100 p-2 rounded text-blue-900">
                          bun run profile:create # Create new profile
                        </code>
                        <code className="block text-xs bg-blue-100 p-2 rounded text-blue-900">
                          bun run profile:list # List all profiles
                        </code>
                        <code className="block text-xs bg-blue-100 p-2 rounded text-blue-900">
                          bun run profile:export # Export profiles
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Schema Matching */}
        <SchemaMatchingDashboard />

        {/* Save Button */}
        <div className="flex justify-end">
          <button type="submit" className="btn-primary flex items-center space-x-2">
            <Save className="h-4 w-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
