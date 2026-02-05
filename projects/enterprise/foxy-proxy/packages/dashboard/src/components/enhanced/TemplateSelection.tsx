// Enhanced Template Selection Component
// Provides UI for creating profiles with advanced configurations

import { useState } from "react";

import {
  enhancedProfileManager,
  type ProfileCreationOptions
} from "../../utils/enhanced/unified-manager";
import {
  ENHANCED_PROFILE_TEMPLATES,
  getTemplatesByCategory,
  getAllTemplates,
  TEMPLATE_CATEGORIES
} from "../../types/enhanced-templates";
import type { EnhancedUnifiedProfile } from "../../types/enhanced-templates";
import {
  areEnhancedTemplatesEnabled,
  isDebugMode,
  isDeveloperMode,
  areBetaFeaturesEnabled,
  debugLog
} from "../../utils/feature-flags";

interface TemplateSelectionProps {
  onProfileCreated?: (profile: EnhancedUnifiedProfile) => void;
  availableProxies: Array<{ id: string; ip: string; country: string }>;
  availablePhones: Array<{ id: string; name: string; region: string }>;
}

export function EnhancedTemplateSelection({
  onProfileCreated,
  availableProxies,
  availablePhones
}: TemplateSelectionProps) {
  // All hooks must be called at the top before any conditional returns
  const [selectedTemplate, setSelectedTemplate] = useState<
    keyof typeof ENHANCED_PROFILE_TEMPLATES | null
  >(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [formData, setFormData] = useState<Partial<ProfileCreationOptions>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Early return after all hooks are called
  if (!areEnhancedTemplatesEnabled()) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-yellow-900 mb-2">
            Enhanced Templates Not Available
          </h2>
          <p className="text-yellow-800">
            This feature is not enabled in your current build configuration.
          </p>
          {isDeveloperMode() && (
            <p className="text-yellow-700 text-sm mt-2">
              Set VITE_ENHANCED_TEMPLATES=true to enable this feature.
            </p>
          )}
        </div>
      </div>
    );
  }

  const categories = [
    { id: "all", name: "All Templates", icon: "📋" },
    { id: "GAMING", name: "Gaming", icon: "🎮" },
    { id: "SOCIAL_MEDIA", name: "Social Media", icon: "📱" },
    { id: "ECOMMERCE", name: "E-commerce", icon: "🛒" },
    { id: "SCRAPING", name: "Web Scraping", icon: "🕷️" },
    { id: "DEVELOPMENT", name: "Development", icon: "💻" },
    { id: "STREAMING", name: "Streaming", icon: "📺" }
  ];

  const getFilteredTemplates = () => {
    if (selectedCategory === "all") {
      return getAllTemplates();
    }
    return getTemplatesByCategory(selectedCategory as keyof typeof TEMPLATE_CATEGORIES);
  };

  const handleTemplateSelect = (templateKey: string) => {
    debugLog("Template selected:", templateKey);
    setSelectedTemplate(templateKey as keyof typeof ENHANCED_PROFILE_TEMPLATES);
    setFormData({
      templateName: templateKey as keyof typeof ENHANCED_PROFILE_TEMPLATES,
      proxyId: "",
      phoneId: ""
    });
    setError(null);
  };

  const handleCreateProfile = async () => {
    if (!selectedTemplate) {
      setError("Please select a template");
      return;
    }

    if (!formData.proxyId || !formData.phoneId) {
      setError("Please select both a proxy and phone");
      return;
    }

    const template = ENHANCED_PROFILE_TEMPLATES[selectedTemplate];

    debugLog("Creating profile with template:", selectedTemplate, template);

    // Validate required fields based on template
    if (template.emailAccount && (!formData.emailAddress || !formData.emailPassword)) {
      setError("This template requires email configuration");
      return;
    }

    if ("socialMedia" in template && template.socialMedia && !formData.socialUsername) {
      setError("This template requires social media username");
      return;
    }

    if ("ecommerce" in template && template.ecommerce && !formData.businessEmail) {
      setError("This template requires business email");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const profile = enhancedProfileManager.createProfileFromTemplate({
        ...(formData as ProfileCreationOptions),
        templateName: selectedTemplate
      });

      debugLog("Profile created successfully:", profile);
      onProfileCreated?.(profile);

      // Reset form
      setSelectedTemplate(null);
      setFormData({});
    } catch (err) {
      debugLog("Profile creation failed:", err);
      setError(err instanceof Error ? err.message : "Failed to create profile");
    } finally {
      setIsCreating(false);
    }
  };

  const renderTemplateCard = (template: {
    key: string;
    name: string;
    description: string;
    tags: readonly string[];
    cloudPhone?: unknown;
    emailAccount?: unknown;
    socialMedia?: unknown;
    ecommerce?: unknown;
    category?: { icon?: string };
  }) => {
    const isSelected = selectedTemplate === template.key;
    const requirements = {
      requiresPhone: !!template.cloudPhone,
      requiresEmail: !!template.emailAccount,
      requiresSocialMedia: "socialMedia" in template && !!template.socialMedia,
      requiresEcommerce: "ecommerce" in template && !!template.ecommerce
    };

    return (
      <div
        key={template.key}
        className={`border rounded-lg p-4 cursor-pointer transition-all ${
          isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
        }`}
        onClick={() => handleTemplateSelect(template.key)}
      >
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-gray-900">{template.name}</h3>
          <span className="text-2xl">{template.category?.icon || "📋"}</span>
        </div>

        <p className="text-sm text-gray-600 mb-3">{template.description}</p>

        <div className="flex flex-wrap gap-1 mb-3">
          {template.tags.map((tag: string) => (
            <span key={tag} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
              {tag}
            </span>
          ))}
        </div>

        <div className="text-xs text-gray-500">
          <div className="flex gap-4">
            {requirements.requiresPhone && <span>📱 Phone Required</span>}
            {requirements.requiresEmail && <span>📧 Email Required</span>}
            {requirements.requiresSocialMedia && <span>👥 Social Media</span>}
            {requirements.requiresEcommerce && <span>🛒 E-commerce</span>}
          </div>
        </div>
      </div>
    );
  };

  const renderConfigurationForm = () => {
    if (!selectedTemplate) {
      return null;
    }

    const template = ENHANCED_PROFILE_TEMPLATES[selectedTemplate];

    return (
      <div className="mt-6 p-4 border rounded-lg bg-gray-50">
        <h3 className="font-semibold mb-4">Configure {template.name}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Basic Configuration */}
          <div>
            <label className="block text-sm font-medium mb-1">Custom Name (Optional)</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded"
              placeholder={template.name}
              value={formData.customName || ""}
              onChange={(e) => setFormData({ ...formData, customName: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Proxy *</label>
            <select
              className="w-full px-3 py-2 border rounded"
              value={formData.proxyId || ""}
              onChange={(e) => setFormData({ ...formData, proxyId: e.target.value })}
              required
            >
              <option value="">Select a proxy</option>
              {availableProxies.map((proxy) => (
                <option key={proxy.id} value={proxy.id}>
                  {proxy.ip} ({proxy.country})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Cloud Phone *</label>
            <select
              className="w-full px-3 py-2 border rounded"
              value={formData.phoneId || ""}
              onChange={(e) => setFormData({ ...formData, phoneId: e.target.value })}
              required
            >
              <option value="">Select a phone</option>
              {availablePhones.map((phone) => (
                <option key={phone.id} value={phone.id}>
                  {phone.name} ({phone.region})
                </option>
              ))}
            </select>
          </div>

          {/* Phone Configuration */}
          {template.cloudPhone && (
            <div>
              <label className="block text-sm font-medium mb-1">Phone Number (Optional)</label>
              <input
                type="tel"
                className="w-full px-3 py-2 border rounded"
                placeholder="+1-555-0123"
                value={formData.phoneNumber || ""}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              />
            </div>
          )}

          {/* Email Configuration */}
          {template.emailAccount && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Email Provider</label>
                <select
                  className="w-full px-3 py-2 border rounded"
                  value={formData.emailProvider || "gmail"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      emailProvider: e.target.value as "gmail" | "outlook" | "yahoo" | "custom"
                    })
                  }
                >
                  <option value="gmail">Gmail</option>
                  <option value="outlook">Outlook</option>
                  <option value="yahoo">Yahoo</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email Address *</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border rounded"
                  placeholder="account@example.com"
                  value={formData.emailAddress || ""}
                  onChange={(e) => setFormData({ ...formData, emailAddress: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email Password *</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border rounded"
                  placeholder="••••••••"
                  value={formData.emailPassword || ""}
                  onChange={(e) => setFormData({ ...formData, emailPassword: e.target.value })}
                  required
                />
              </div>
            </>
          )}

          {/* Social Media Configuration */}
          {"socialMedia" in template && template.socialMedia && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Social Platform</label>
                <select
                  className="w-full px-3 py-2 border rounded"
                  value={formData.socialPlatform || "facebook"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      socialPlatform: e.target.value as
                        | "facebook"
                        | "instagram"
                        | "twitter"
                        | "linkedin"
                        | "tiktok"
                    })
                  }
                >
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                  <option value="twitter">Twitter</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="tiktok">TikTok</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Social Media Username</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Enter social media username"
                  value={formData.socialUsername || ""}
                  onChange={(e) => setFormData({ ...formData, socialUsername: e.target.value })}
                />
              </div>
            </>
          )}

          {/* E-commerce Configuration */}
          {"ecommerce" in template && template.ecommerce && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">E-commerce Platform</label>
                <select
                  className="w-full px-3 py-2 border rounded"
                  value={formData.ecommercePlatform || "shopify"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      ecommercePlatform: e.target.value as "amazon" | "ebay" | "shopify" | "etsy"
                    })
                  }
                >
                  <option value="amazon">Amazon</option>
                  <option value="ebay">eBay</option>
                  <option value="shopify">Shopify</option>
                  <option value="etsy">Etsy</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Business Email</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border rounded"
                  placeholder="business@company.com"
                  value={formData.businessEmail || ""}
                  onChange={(e) => setFormData({ ...formData, businessEmail: e.target.value })}
                />
              </div>
            </>
          )}
        </div>

        {/* Custom Settings */}
        <div className="mt-4 pt-4 border-t">
          <h4 className="font-medium mb-2">Custom Settings (Optional)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Custom DNS Servers</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded"
                placeholder="8.8.8.8, 1.1.1.1"
                value={formData.customDns?.join(", ") || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    customDns: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                  })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Custom Whitelist</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded"
                placeholder="example.com, test.com"
                value={formData.customWhitelist?.join(", ") || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    customWhitelist: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                  })
                }
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            onClick={handleCreateProfile}
            disabled={isCreating}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isCreating ? "Creating..." : "Create Profile"}
          </button>

          <button
            onClick={() => setSelectedTemplate(null)}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Enhanced Profile Templates</h2>
        <p className="text-gray-600">
          Create optimized profiles combining IPFoxy proxies with DuoPlus cloud phones
        </p>
        {areBetaFeaturesEnabled() && (
          <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            🚀 Beta Features Enabled
          </div>
        )}
      </div>

      {/* Developer Tools Section - Only shown in developer mode */}
      {isDeveloperMode() && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <div className="text-2xl mr-3">🛠️</div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-900">Developer Tools</h3>
              <div className="mt-2 text-sm text-yellow-800">
                <div className="font-mono text-xs space-y-1">
                  <div>Feature Flags:</div>
                  <div>• ENHANCED_TEMPLATES: {areEnhancedTemplatesEnabled() ? "✅" : "❌"}</div>
                  <div>• DEBUG: {isDebugMode() ? "✅" : "❌"}</div>
                  <div>• DEVELOPER_MODE: {isDeveloperMode() ? "✅" : "❌"}</div>
                  <div>• BETA_FEATURES: {areBetaFeaturesEnabled() ? "✅" : "❌"}</div>
                  <div className="mt-2">Available Templates: {getFilteredTemplates().length}</div>
                  <div>Selected Category: {selectedCategory}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <span className="mr-2">{category.icon}</span>
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {getFilteredTemplates().map((template) => renderTemplateCard(template))}
      </div>

      {/* Configuration Form */}
      {renderConfigurationForm()}
    </div>
  );
}
