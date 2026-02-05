import React, { useState, useMemo } from "react";
import {
  Smartphone,
  Server,
  Globe,
  Activity,
  AlertCircle,
  Power,
  Settings,
  RefreshCw,
  Link,
  Shield,
  TrendingUp,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Star,
  Zap
} from "lucide-react";

import { useProxyData } from "../../hooks/useProxyData";
import { DuoPlusAPI, type DuoPlusPhone } from "../../utils/duoplus";
import { UnifiedProfileManager } from "../../utils/unified";
import {
  UNIFIED_PROFILE_CONSTANTS,
  PROFILE_TEMPLATES,
  type UnifiedProfile
} from "../../utils/unified";

export const UnifiedManagementPage: React.FC = () => {
  const { data: proxyData, loading: proxyLoading, error: proxyError } = useProxyData();
  const [duoplusPhones, setDuoPlusPhones] = useState<DuoPlusPhone[]>([]);
  const [selectedProxy, setSelectedProxy] = useState<string>("");
  const [selectedPhone, setSelectedPhone] = useState<string>("");
  const [showProxyDetails, setShowProxyDetails] = useState(false);
  const [showPhoneDetails, setShowPhoneDetails] = useState(false);
  const [showProfiles, setShowProfiles] = useState(true);
  const [selectedTemplate, setSelectedTemplate] =
    useState<keyof typeof PROFILE_TEMPLATES>("BALANCED_USAGE");

  // Initialize Profile Manager
  const profileManager = useMemo(() => new UnifiedProfileManager(), []);
  const [profiles, setProfiles] = useState<UnifiedProfile[]>([]);

  // Load profiles
  React.useEffect(() => {
    setProfiles(profileManager.getAllProfiles());
  }, [profileManager]);

  // Initialize DuoPlus API
  const duoplusAPI = useMemo(
    () =>
      new DuoPlusAPI({
        apiToken: import.meta.env.VITE_DUOPLUS_API_TOKEN || "",
        baseUrl: import.meta.env.VITE_DUOPLUS_API_URL || "https://my.duoplus.net"
      }),
    []
  );

  // Load DuoPlus data
  React.useEffect(() => {
    const loadDuoPlusData = async () => {
      try {
        const mockData = await duoplusAPI.getMockData();
        setDuoPlusPhones(mockData.phones);
      } catch (err) {
        console.error("Failed to load DuoPlus data:", err);
      }
    };

    loadDuoPlusData();
  }, [duoplusAPI]);

  const handleProxyAction = (proxyId: string, action: string) => {
    console.log(`Proxy ${action}: ${proxyId}`);
    // Implement proxy actions
  };

  const handlePhoneAction = async (phoneId: string, action: string) => {
    try {
      switch (action) {
        case "start":
          await duoplusAPI.startPhone(phoneId);
          break;
        case "stop":
          await duoplusAPI.stopPhone(phoneId);
          break;
        case "restart":
          await duoplusAPI.restartPhone(phoneId);
          break;
      }
      // Refresh data
      const mockData = await duoplusAPI.getMockData();
      setDuoPlusPhones(mockData.phones);
    } catch (error) {
      console.error(`Failed to ${action} phone:`, error);
    }
  };

  const handleLinkProxyToPhone = () => {
    if (selectedProxy && selectedPhone) {
      try {
        const newProfile = profileManager.createProfile({
          name: `${selectedProxy} + ${selectedPhone}`,
          proxyId: selectedProxy,
          phoneId: selectedPhone,
          template: selectedTemplate,
          customConfig: {
            ip: proxyData?.proxies.find((p) => p.id === selectedProxy)?.ip || "",
            region: proxyData?.proxies.find((p) => p.id === selectedProxy)?.country || ""
          }
        });

        setProfiles(profileManager.getAllProfiles());
        console.log("Created unified profile:", newProfile);
      } catch (error) {
        console.error("Failed to create profile:", error);
      }
    }
  };

  const handleProfileAction = (profileId: string, action: string) => {
    switch (action) {
      case "activate":
        profileManager.activateProfile(profileId);
        break;
      case "deactivate":
        profileManager.deactivateProfile(profileId);
        break;
      case "delete":
        profileManager.deleteProfile(profileId);
        break;
    }
    setProfiles(profileManager.getAllProfiles());
  };

  const getPerformanceRating = (profileId: string | undefined) => {
    if (!profileId) {
      return "poor";
    }
    return profileManager.getPerformanceRating(profileId);
  };

  if (proxyLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (proxyError || !proxyData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading data</h3>
            <p className="mt-2 text-sm text-red-700">{proxyError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Unified Management</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your proxies and DuoPlus cloud phones in one place
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
              <Server className="h-6 w-6 text-white" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Proxies</dt>
                <dd className="text-2xl font-semibold text-gray-900">{proxyData.proxies.length}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
              <Smartphone className="h-6 w-6 text-white" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Cloud Phones</dt>
                <dd className="text-2xl font-semibold text-gray-900">{duoplusPhones.length}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Active Services</dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {proxyData.proxies.filter((p) => p.status === "active").length +
                    duoplusPhones.filter((p) => p.status === "online").length}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Countries</dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {proxyData.stats.countries.length}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Link Configuration */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Link className="h-5 w-5 mr-2" />
            Link Proxy to Phone
          </h3>
          <p className="mt-1 text-sm text-gray-600">Configure a proxy on a specific cloud phone</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Proxy</label>
              <select
                value={selectedProxy}
                onChange={(e) => setSelectedProxy(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Choose a proxy...</option>
                {proxyData.proxies.map((proxy) => (
                  <option key={proxy.id} value={proxy.id}>
                    {proxy.ip}:{proxy.port} ({proxy.country})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Phone</label>
              <select
                value={selectedPhone}
                onChange={(e) => setSelectedPhone(e.target.value)}
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Template
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) =>
                  setSelectedTemplate(e.target.value as keyof typeof PROFILE_TEMPLATES)
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                {Object.entries(PROFILE_TEMPLATES).map(([key, template]) => (
                  <option key={key} value={key}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleLinkProxyToPhone}
                disabled={!selectedProxy || !selectedPhone}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Proxies and Phones Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Proxies Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Server className="h-5 w-5 mr-2" />
                Proxies
              </h3>
              <button
                onClick={() => setShowProxyDetails(!showProxyDetails)}
                className="text-gray-400 hover:text-gray-600"
              >
                {showProxyDetails ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {proxyData.proxies
                .slice(0, showProxyDetails ? proxyData.proxies.length : 3)
                .map((proxy) => (
                  <div key={proxy.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Globe className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {proxy.ip}:{proxy.port}
                          </p>
                          <p className="text-sm text-gray-500">{proxy.country}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            proxy.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {proxy.status}
                        </span>
                        <button
                          onClick={() => handleProxyAction(proxy.id, "toggle")}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Power className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Cloud Phones Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Smartphone className="h-5 w-5 mr-2" />
                Cloud Phones
              </h3>
              <button
                onClick={() => setShowPhoneDetails(!showPhoneDetails)}
                className="text-gray-400 hover:text-gray-600"
              >
                {showPhoneDetails ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {duoplusPhones.slice(0, showPhoneDetails ? duoplusPhones.length : 3).map((phone) => (
                <div key={phone.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Smartphone className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{phone.name}</p>
                        <p className="text-sm text-gray-500">{phone.region}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          phone.status === "online"
                            ? "bg-green-100 text-green-800"
                            : phone.status === "offline"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {phone.status}
                      </span>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handlePhoneAction(phone.id, "start")}
                          className="text-gray-400 hover:text-green-600"
                          title="Start"
                        >
                          <Power className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handlePhoneAction(phone.id, "restart")}
                          className="text-gray-400 hover:text-blue-600"
                          title="Restart"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Unified Profiles Section */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Star className="h-5 w-5 mr-2" />
              Unified Profiles ({profiles.length})
            </h3>
            <button
              onClick={() => setShowProfiles(!showProfiles)}
              className="text-gray-400 hover:text-gray-600"
            >
              {showProfiles ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <div className="p-6">
          {profiles.length === 0 ? (
            <div className="text-center py-8">
              <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-sm font-medium text-gray-900 mb-2">No unified profiles yet</h3>
              <p className="text-sm text-gray-500">Create your first proxy-phone profile above</p>
            </div>
          ) : (
            <div className="space-y-4">
              {profiles.slice(0, showProfiles ? profiles.length : 3).map((profile) => (
                <div key={profile.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <Zap className="h-8 w-8 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{profile.name}</p>
                        <p className="text-sm text-gray-500">
                          {profile.configuration.ip}:{profile.configuration.port} •{" "}
                          {profile.configuration.region}
                        </p>
                        <div className="flex items-center space-x-4 mt-1">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              profile.status === UNIFIED_PROFILE_CONSTANTS.STATUS.ACTIVE
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {profile.status}
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {profile.metadata.category}
                          </span>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              getPerformanceRating(profile.id) === "excellent"
                                ? "bg-green-100 text-green-800"
                                : getPerformanceRating(profile.id) === "good"
                                  ? "bg-blue-100 text-blue-800"
                                  : getPerformanceRating(profile.id) === "fair"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                            }`}
                          >
                            {getPerformanceRating(profile.id)} performance
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() =>
                          handleProfileAction(
                            profile.id,
                            profile.status === UNIFIED_PROFILE_CONSTANTS.STATUS.ACTIVE
                              ? "deactivate"
                              : "activate"
                          )
                        }
                        className="text-gray-400 hover:text-green-600"
                        title={
                          profile.status === UNIFIED_PROFILE_CONSTANTS.STATUS.ACTIVE
                            ? "Deactivate"
                            : "Activate"
                        }
                      >
                        <Power className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleProfileAction(profile.id, "delete")}
                        className="text-gray-400 hover:text-red-600"
                        title="Delete Profile"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Response Time</p>
                      <p className="font-medium">{profile.performance.responseTime}ms</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Uptime</p>
                      <p className="font-medium">{profile.performance.uptime}%</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Success Rate</p>
                      <p className="font-medium">
                        {profile.performance.requests.total > 0
                          ? Math.round(
                            (profile.performance.requests.successful /
                                profile.performance.requests.total) *
                                100
                          )
                          : 0}
                        %
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Priority</p>
                      <p className="font-medium capitalize">{profile.metadata.priority}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Quick Actions
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh All Services
            </button>
            <button className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              <Shield className="h-4 w-4 mr-2" />
              Test All Connections
            </button>
            <button className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              <TrendingUp className="h-4 w-4 mr-2" />
              View Performance Metrics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
