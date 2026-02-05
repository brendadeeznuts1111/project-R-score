import React, { useState, useEffect, useMemo } from "react";
import {
  Smartphone,
  Cloud,
  Settings,
  AlertCircle,
  Power,
  Globe,
  Shield,
  Activity,
  Upload,
  Download,
  FileText,
  Trash2
} from "lucide-react";

import { useProxyData } from "../../hooks/useProxyData";
import DuoPlusAPI, { type DuoPlusPhone, type DuoPlusAccount } from "../../utils/duoplus";
import { AutomationTaskPanel } from "../../components/AutomationTaskPanel";
import {
  isDuoPlusEnabled,
  isDebugMode,
  isDeveloperMode,
  isPerformanceProfilingEnabled,
  debugLog,
  profilePerformance
} from "../../utils/feature-flags";

export const DuoPlusPage: React.FC = () => {
  // All hooks must be called at the top before any conditional returns
  const { loading, error } = useProxyData();
  const [duoplusAccount, setDuoPlusAccount] = useState<DuoPlusAccount | null>(null);
  const [duoplusPhones, setDuoPlusPhones] = useState<DuoPlusPhone[]>([]);
  const [selectedPhoneId, setSelectedPhoneId] = useState<string>("");
  const [filePath, setFilePath] = useState<string>("/sdcard/Download/ucPHS.txt");
  const [fileOperation, setFileOperation] = useState<"upload" | "download" | "info" | "delete">(
    "info"
  );

  // Initialize DuoPlus API
  const duoplusAPI = useMemo(
    () =>
      new DuoPlusAPI({
        apiToken: "6370486b-c456-4efc-842e-9cd1461d05d8",
        baseUrl: "https://my.duoplus.net"
      }),
    []
  );

  const handleOperationChange = (value: "upload" | "download" | "info" | "delete") => {
    setFileOperation(value);
  };

  // Load DuoPlus data
  useEffect(() => {
    const loadDuoPlusData = async () => {
      debugLog("Loading DuoPlus data...");

      await profilePerformance("load-duoplus-data", async () => {
        try {
          const mockData = await duoplusAPI.getMockData();
          setDuoPlusAccount(mockData.account);
          setDuoPlusPhones(mockData.phones);
          debugLog("DuoPlus data loaded successfully", {
            account: mockData.account,
            phones: mockData.phones.length
          });
        } catch (error) {
          console.error("Failed to load DuoPlus data:", error);
        }
      });
    };

    if (isDuoPlusEnabled()) {
      loadDuoPlusData();
    }
  }, [duoplusAPI]);

  // Early return after all hooks are called
  if (!isDuoPlusEnabled()) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-yellow-900 mb-2">DuoPlus Not Available</h2>
          <p className="text-yellow-800">
            This feature is not enabled in your current build configuration.
          </p>
          {isDeveloperMode() && (
            <p className="text-yellow-700 text-sm mt-2">
              Set VITE_DUOPLUS_ENABLED=true to enable this feature.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading data</h3>
            <p className="mt-2 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const handleStartPhone = async (phoneId: string) => {
    try {
      await duoplusAPI.startPhone(phoneId);
      setDuoPlusPhones((phones) =>
        phones.map((phone) =>
          phone.id === phoneId ? { ...phone, status: "starting" as const } : phone
        )
      );
    } catch (error) {
      console.error("Failed to start phone:", error);
    }
  };

  const handleStopPhone = async (phoneId: string) => {
    try {
      await duoplusAPI.stopPhone(phoneId);
      setDuoPlusPhones((phones) =>
        phones.map((phone) =>
          phone.id === phoneId ? { ...phone, status: "stopping" as const } : phone
        )
      );
    } catch (error) {
      console.error("Failed to stop phone:", error);
    }
  };

  const handleConfigureProxy = async (
    phoneId: string,
    proxy: { ip: string; port: number; username: string; password: string }
  ) => {
    try {
      await duoplusAPI.configureProxy(phoneId, {
        ip: proxy.ip,
        port: proxy.port,
        username: proxy.username,
        password: proxy.password
      });
    } catch (error) {
      console.error("Failed to configure proxy:", error);
    }
  };

  const handleFileOperation = async () => {
    if (!selectedPhoneId) {
      alert("Please select a phone first");
      return;
    }

    try {
      switch (fileOperation) {
        case "download": {
          const blob = await duoplusAPI.downloadFile(selectedPhoneId, filePath);
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filePath.split("/").pop() || "download";
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          break;
        }

        case "info": {
          const info = await duoplusAPI.getFileInfo(selectedPhoneId, filePath);
          alert(
            `File Info:\nName: ${info.name}\nSize: ${info.size} bytes\nModified: ${info.modified}\nType: ${info.type}`
          );
          break;
        }

        case "delete":
          if (confirm(`Are you sure you want to delete ${filePath}?`)) {
            await duoplusAPI.deleteFile(selectedPhoneId, filePath);
            alert("File deleted successfully");
          }
          break;
      }
    } catch (error) {
      alert(`Operation failed: ${error}`);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedPhoneId) {
      return;
    }

    try {
      const result = await duoplusAPI.uploadFile(selectedPhoneId, file, "/sdcard/Download/");
      alert(`File uploaded successfully: ${result}`);
    } catch (error) {
      alert(`Upload failed: ${error}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-100 text-green-800";
      case "offline":
        return "bg-red-100 text-red-800";
      case "starting":
      case "stopping":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading data</h3>
            <p className="mt-2 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!duoplusAccount) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">DuoPlus Cloud Mobile</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage DuoPlus cloud phones with IPFoxy proxy integration
        </p>
      </div>

      {/* DuoPlus Account Info */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Cloud className="h-5 w-5 mr-2" />
            Account Information
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Account ID</p>
              <p className="text-sm text-gray-900">{duoplusAccount.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Balance</p>
              <p className="text-sm text-gray-900">
                ${duoplusAccount.balance} {duoplusAccount.currency}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Active Phones</p>
              <p className="text-sm text-gray-900">
                {duoplusAccount.activePhones}/{duoplusAccount.totalPhones}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Plan</p>
              <p className="text-sm text-gray-900">{duoplusAccount.plan}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
              <Smartphone className="h-6 w-6 text-white" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Cloud Phones</dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">{duoplusPhones.length}</div>
                  <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                    {duoplusPhones.filter((p) => p.status === "online").length} online
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Available Proxies</dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">5</div>
                  <div className="ml-2 flex items-baseline text-sm font-semibold text-gray-600">
                    SOCKS5 ready
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Countries</dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">50+</div>
                  <div className="ml-2 flex items-baseline text-sm font-semibold text-gray-600">
                    Regions
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Last Sync</dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">Now</div>
                  <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                    Live
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* SOCKS5 Proxy Configuration */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            SOCKS5 Proxy Configuration
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Copy these proxy configurations for DuoPlus cloud phone setup
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proxy Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SOCKS5 Config
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Add your proxy data here */}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cloud Phone Management */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Smartphone className="h-5 w-5 mr-2" />
            Cloud Phone Management
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Control and monitor your DuoPlus cloud phones
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {duoplusPhones.map((phone) => (
              <div
                key={phone.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <Smartphone className="h-8 w-8 text-gray-400 mr-3" />
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{phone.name}</h4>
                      <p className="text-xs text-gray-500">
                        {phone.proxy?.ip}:{phone.proxy?.port}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(phone.status)}`}
                  >
                    {phone.status}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    <div>{phone.region}</div>
                    <div>
                      {phone.specs.cpu} • {phone.specs.memory}
                    </div>
                    <div>Last used: {phone.lastUsed}</div>
                  </div>
                  <div className="flex space-x-2">
                    {phone.status === "offline" && (
                      <button
                        onClick={() => handleStartPhone(phone.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-md"
                        title="Start Phone"
                      >
                        <Power className="h-4 w-4" />
                      </button>
                    )}
                    {phone.status === "online" && (
                      <button
                        onClick={() => handleStopPhone(phone.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                        title="Stop Phone"
                      >
                        <Power className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => phone.proxy && handleConfigureProxy(phone.id, phone.proxy)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                      title="Configure Proxy"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Automation Tasks Section */}
      <AutomationTaskPanel api={duoplusAPI} phoneId={selectedPhoneId} />

      {/* File Management Section */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            File Management
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Upload, download, and manage files on your cloud phones
          </p>
        </div>
        <div className="p-6 space-y-6">
          {/* Phone Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Phone</label>
            <select
              value={selectedPhoneId}
              onChange={(e) => setSelectedPhoneId(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">Choose a phone...</option>
              {duoplusPhones.map((phone) => (
                <option key={phone.id} value={phone.id}>
                  {phone.name} ({phone.status})
                </option>
              ))}
            </select>
          </div>

          {/* File Operations */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">File Operations</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* File Path Input */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">File Path</label>
                <input
                  type="text"
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  placeholder="/sdcard/Download/ucPHS.txt"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Example: d0efde27-6bc8-4f5c-bfee-b0bb732bfc36 [/sdcard/Download/ucPHS.txt]
                </p>
              </div>

              {/* Operation Selection */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Operation</label>
                <select
                  value={fileOperation}
                  onChange={(e) =>
                    handleOperationChange(
                      e.target.value as "upload" | "download" | "info" | "delete"
                    )
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="info">Get File Info</option>
                  <option value="download">Download File</option>
                  <option value="delete">Delete File</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleFileOperation}
              disabled={!selectedPhoneId}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {fileOperation === "download" && <Download className="h-4 w-4 mr-2" />}
              {fileOperation === "info" && <FileText className="h-4 w-4 mr-2" />}
              {fileOperation === "delete" && <Trash2 className="h-4 w-4 mr-2" />}
              {fileOperation === "download"
                ? "Download File"
                : fileOperation === "info"
                  ? "Get Info"
                  : "Delete File"}
            </button>

            <label className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              Upload File
              <input
                type="file"
                onChange={handleFileUpload}
                disabled={!selectedPhoneId}
                className="hidden"
              />
            </label>
          </div>

          {/* Quick Actions */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setSelectedPhoneId("d0efde27-6bc8-4f5c-bfee-b0bb732bfc36");
                  setFilePath("/sdcard/Download/ucPHS.txt");
                  setFileOperation("info");
                }}
                className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Load Example File
              </button>
              <button
                onClick={() => setFilePath("/sdcard/Download/")}
                className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Browse Downloads
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* API Access */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <Cloud className="h-6 w-6 text-blue-600 mt-1" />
          <div className="ml-4 flex-1">
            <h3 className="text-lg font-medium text-blue-900">API Access</h3>
            <div className="mt-2 text-sm text-blue-800">
              <p className="mb-2">Direct API access to DuoPlus cloud phone management:</p>
              <div className="bg-blue-100 rounded p-3 font-mono text-xs">
                <div>Token: 6370486b-c456-4efc-842e-9cd1461d05d8</div>
                <div>Endpoint: https://my.duoplus.net/api</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Developer Tools Section - Only shown in developer mode */}
      {isDeveloperMode() && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start">
            <Settings className="h-6 w-6 text-yellow-600 mt-1" />
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-medium text-yellow-900">Developer Tools</h3>
              <div className="mt-2 text-sm text-yellow-800">
                <p className="mb-2">Development tools and debugging information:</p>
                <div className="bg-yellow-100 rounded p-3 font-mono text-xs space-y-1">
                  <div>Feature Flags:</div>
                  <div>• DUOPLUS_ENABLED: {isDuoPlusEnabled() ? "✅" : "❌"}</div>
                  <div>• DEBUG: {isDebugMode() ? "✅" : "❌"}</div>
                  <div>• DEVELOPER_MODE: {isDeveloperMode() ? "✅" : "❌"}</div>
                  <div>
                    • PERFORMANCE_PROFILING: {isPerformanceProfilingEnabled() ? "✅" : "❌"}
                  </div>
                  <div className="mt-2">Loaded Phones: {duoplusPhones.length}</div>
                  <div>Selected Phone: {selectedPhoneId || "None"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
