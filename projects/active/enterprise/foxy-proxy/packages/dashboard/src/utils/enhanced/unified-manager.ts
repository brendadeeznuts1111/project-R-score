// Enhanced Unified Profile Manager with Advanced Template Support
// Integrates IPFoxy proxies with DuoPlus cloud phones and account management

import type {
  EnhancedUnifiedProfile,
  DuoPlusDeviceCreationResponse
} from "../../types/enhanced-templates";
import {
  getTemplateByName,
  validateTemplateRequirements,
  createDuoPlusDeviceRequest,
  validateDuoPlusConfig,
  mapTemplateToDuoPlus,
  getPlatformDuoPlusConfig,
  ENHANCED_PROFILE_TEMPLATES
} from "../../types/enhanced-templates";
import type { ProxyInfo } from "../../types/proxy";
import type { DuoPlusPhone } from "../duoplus/duoplus";
import type { ProfileCreationOptions } from "../../types/enhanced-templates";

export type { ProfileCreationOptions };

export class EnhancedUnifiedProfileManager {
  private profiles: Map<string, EnhancedUnifiedProfile> = new Map();
  private proxyPhoneMappings: Map<string, string> = new Map();

  constructor() {
    this.initializeDefaultProfiles();
  }

  // Create profile from enhanced template
  createProfileFromTemplate(options: ProfileCreationOptions): EnhancedUnifiedProfile {
    const template = getTemplateByName(options.templateName);
    const requirements = validateTemplateRequirements(options.templateName);

    // Validate requirements
    if (requirements.requiresPhone && !options.phoneId) {
      throw new Error(`Template ${String(options.templateName)} requires a cloud phone`);
    }

    if (requirements.requiresEmail && (!options.emailAddress || !options.emailPassword)) {
      throw new Error(`Template ${String(options.templateName)} requires email configuration`);
    }

    const profileId = this.generateProfileId(String(options.templateName), options.proxyId);

    // Build enhanced configuration
    const enhancedConfig: EnhancedUnifiedProfile = {
      id: profileId,
      name: options.customName || template.name,
      proxyId: options.proxyId,
      phoneId: options.phoneId,
      status: "inactive",

      configuration: {
        ip: "", // Will be set when proxy is linked
        port: 8080,
        username: "",
        password: "",
        protocol: template.configuration.protocol as "http" | "https" | "socks5",
        region: "United States",
        dns: options.customDns || [...template.configuration.dns],
        whitelist: options.customWhitelist || [...template.configuration.whitelist],
        blacklist: options.customBlacklist || [...template.configuration.blacklist]
      },

      // Enhanced features based on template
      cloudPhone: template.cloudPhone
        ? {
          ...template.cloudPhone,
          phoneNumber: options.phoneNumber
        }
        : undefined,

      emailAccount:
        template.emailAccount && options.emailAddress
          ? {
            ...template.emailAccount,
            provider: options.emailProvider || template.emailAccount.provider,
            address: options.emailAddress,
            password: options.emailPassword
          }
          : undefined,

      socialMedia:
        (template as any).socialMedia && options.socialPlatform
          ? {
            ...(template as any).socialMedia,
            platform: options.socialPlatform,
            username: options.socialUsername || "",
            email: options.emailAddress || ""
          }
          : undefined,

      ecommerce:
        (template as any).ecommerce && options.ecommercePlatform
          ? {
            ...(template as any).ecommerce,
            platform: options.ecommercePlatform,
            businessEmail: options.businessEmail || options.emailAddress || ""
          }
          : undefined,

      // DuoPlus Configuration
      duoPlusConfig: options.duoPlusPlatform
        ? {
          templateId: options.duoPlusTemplate || mapTemplateToDuoPlus(options.templateName),
          fingerprintProfile:
              (options.duoPlusFingerprintProfile as "high_trust" | "balanced" | "aggressive") ||
              "balanced",
          phoneConfig: {
            purchasePhone: getPlatformDuoPlusConfig(options.duoPlusPlatform).phoneConfig
              .purchasePhone,
            phoneCountry: getPlatformDuoPlusConfig(options.duoPlusPlatform).phoneConfig
              .phoneCountry,
            phoneType:
                options.duoPlusPhoneType ||
                getPlatformDuoPlusConfig(options.duoPlusPlatform).phoneConfig.phoneType,
            autoVerify:
                options.duoPlusAutoVerify ||
                getPlatformDuoPlusConfig(options.duoPlusPlatform).phoneConfig.autoVerify,
            smsInterception: getPlatformDuoPlusConfig(options.duoPlusPlatform).phoneConfig
              .smsInterception,
            webhookEnabled: getPlatformDuoPlusConfig(options.duoPlusPlatform).phoneConfig
              .webhookEnabled
          },
          proxyConfig: {
            type: getPlatformDuoPlusConfig(options.duoPlusPlatform).proxy.type as
                | "socks5"
                | "http"
                | "https",
            host: "", // Will be set when proxy is linked
            port: 0,
            username: "",
            password: "",
            rotation: getPlatformDuoPlusConfig(options.duoPlusPlatform).proxy.rotation as
                | "static"
                | "rotating"
                | "sticky",
            authentication: getPlatformDuoPlusConfig(options.duoPlusPlatform).proxy
              .authentication as "auto" | "manual"
          },
          deviceCreationRequest: createDuoPlusDeviceRequest(options.templateName, options),
          batchConfig: options.duoPlusBatchConfig
        }
        : undefined,

      performance: {
        responseTime: 0,
        uptime: 100,
        bandwidth: { upload: 0, download: 0 },
        requests: { total: 0, successful: 0, failed: 0 },
        lastUpdated: new Date().toISOString()
      },

      metadata: {
        description: template.description,
        tags: [...template.tags],
        category: template.category,
        priority: template.priority,
        autoRotate: template.configuration.autoRotate,
        failoverEnabled: template.configuration.failoverEnabled
      },

      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString()
    };

    this.profiles.set(profileId, enhancedConfig);
    this.proxyPhoneMappings.set(options.proxyId, options.phoneId);

    return enhancedConfig;
  }

  // Link proxy to profile with real data
  linkProxyToProfile(profileId: string, proxy: ProxyInfo): void {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Profile ${profileId} not found`);
    }

    profile.configuration.ip = proxy.ip;
    profile.configuration.port = proxy.port;
    profile.configuration.username = proxy.username;
    profile.configuration.password = proxy.password;
    profile.configuration.region = proxy.country || "Unknown";

    profile.status = "active";
    profile.lastUsed = new Date().toISOString();
  }

  // Link phone to profile with real data
  linkPhoneToProfile(profileId: string, phone: DuoPlusPhone): void {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Profile ${profileId} not found`);
    }

    if (profile.cloudPhone) {
      profile.cloudPhone.location = {
        country: phone.region,
        region: phone.region,
        city: phone.region // API doesn't provide city, use region
      };
    }

    profile.status = "active";
    profile.lastUsed = new Date().toISOString();
  }

  // Get profiles by category
  getProfilesByCategory(category: string): EnhancedUnifiedProfile[] {
    return Array.from(this.profiles.values()).filter(
      (profile) => profile.metadata.category === category
    );
  }

  // Get profiles requiring phone verification
  getProfilesNeedingPhoneVerification(): EnhancedUnifiedProfile[] {
    return Array.from(this.profiles.values()).filter((profile) => profile.cloudPhone?.smsEnabled);
  }

  // Get profiles with email accounts
  getProfilesWithEmailAccounts(): EnhancedUnifiedProfile[] {
    return Array.from(this.profiles.values()).filter((profile) => profile.emailAccount);
  }

  // Get social media profiles
  getSocialMediaProfiles(): EnhancedUnifiedProfile[] {
    return Array.from(this.profiles.values()).filter((profile) => profile.socialMedia);
  }

  // Get e-commerce profiles
  getEcommerceProfiles(): EnhancedUnifiedProfile[] {
    return Array.from(this.profiles.values()).filter((profile) => profile.ecommerce);
  }

  // Get DuoPlus-enabled profiles
  getDuoPlusProfiles(): EnhancedUnifiedProfile[] {
    return Array.from(this.profiles.values()).filter((profile) => profile.duoPlusConfig);
  }

  // Get profiles by DuoPlus template
  getProfilesByDuoPlusTemplate(templateId: string): EnhancedUnifiedProfile[] {
    return Array.from(this.profiles.values()).filter(
      (profile) => profile.duoPlusConfig?.templateId === templateId
    );
  }

  // Get profiles by fingerprint profile
  getProfilesByFingerprintProfile(
    fingerprintProfile: "high_trust" | "balanced" | "aggressive"
  ): EnhancedUnifiedProfile[] {
    return Array.from(this.profiles.values()).filter(
      (profile) => profile.duoPlusConfig?.fingerprintProfile === fingerprintProfile
    );
  }

  // Update performance metrics
  updatePerformanceMetrics(
    profileId: string,
    metrics: Partial<EnhancedUnifiedProfile["performance"]>
  ): void {
    const profile = this.profiles.get(profileId);
    if (profile) {
      profile.performance = {
        ...profile.performance,
        ...metrics,
        lastUpdated: new Date().toISOString()
      };
    }
  }

  // Get profile statistics
  getProfileStatistics(): {
    total: number;
    active: number;
    byCategory: Record<string, number>;
    withPhones: number;
    withEmails: number;
    withSocialMedia: number;
    withEcommerce: number;
    withDuoPlus: number;
    byDuoPlusTemplate: Record<string, number>;
    byFingerprintProfile: Record<string, number>;
    } {
    const profiles = Array.from(this.profiles.values());

    return {
      total: profiles.length,
      active: profiles.filter((p) => p.status === "active").length,
      byCategory: profiles.reduce(
        (acc, profile) => {
          acc[profile.metadata.category] = (acc[profile.metadata.category] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      withPhones: profiles.filter((p) => p.cloudPhone).length,
      withEmails: profiles.filter((p) => p.emailAccount).length,
      withSocialMedia: profiles.filter((p) => p.socialMedia).length,
      withEcommerce: profiles.filter((p) => p.ecommerce).length,
      withDuoPlus: profiles.filter((p) => p.duoPlusConfig).length,
      byDuoPlusTemplate: profiles.reduce(
        (acc, profile) => {
          if (profile.duoPlusConfig?.templateId) {
            acc[profile.duoPlusConfig.templateId] =
              (acc[profile.duoPlusConfig.templateId] || 0) + 1;
          }
          return acc;
        },
        {} as Record<string, number>
      ),
      byFingerprintProfile: profiles.reduce(
        (acc, profile) => {
          if (profile.duoPlusConfig?.fingerprintProfile) {
            acc[profile.duoPlusConfig.fingerprintProfile] =
              (acc[profile.duoPlusConfig.fingerprintProfile] || 0) + 1;
          }
          return acc;
        },
        {} as Record<string, number>
      )
    };
  }

  // Export profiles with sensitive data masked
  exportProfiles(maskSensitive: boolean = true): string {
    const profiles = Array.from(this.profiles.values()).map((profile) => {
      const exported = { ...profile };

      if (maskSensitive) {
        // Mask sensitive information
        if (exported.configuration.password) {
          exported.configuration.password = "***MASKED***";
        }
        if (exported.emailAccount?.password) {
          exported.emailAccount.password = "***MASKED***";
        }
      }

      return exported;
    });

    return JSON.stringify(profiles, null, 2);
  }

  // Import profiles
  importProfiles(jsonData: string): { imported: number; errors: string[] } {
    const errors: string[] = [];
    let imported = 0;

    try {
      const profiles = JSON.parse(jsonData);

      for (const profileData of profiles) {
        try {
          // Validate profile structure
          if (!this.validateProfile(profileData)) {
            errors.push(`Invalid profile structure: ${profileData.name || "Unknown"}`);
            continue;
          }

          // Validate DuoPlus configuration if present
          if (profileData.duoPlusConfig) {
            const validation = validateDuoPlusConfig(
              profileData.metadata?.category?.toUpperCase() as keyof typeof ENHANCED_PROFILE_TEMPLATES,
              profileData.duoPlusConfig.deviceCreationRequest || {
                template_id: profileData.duoPlusConfig.templateId,
                fingerprint_profile: profileData.duoPlusConfig.fingerprintProfile
              }
            );

            if (!validation.isValid) {
              errors.push(
                `Invalid DuoPlus configuration for ${profileData.name || "Unknown"}: ${validation.errors.join(", ")}`
              );
              continue;
            }
          }

          this.profiles.set(profileData.id, profileData);
          imported++;
        } catch (error) {
          errors.push(`Failed to import profile: ${profileData.name || "Unknown"} - ${error}`);
        }
      }
    } catch (error) {
      errors.push(`Failed to parse JSON data: ${error}`);
    }

    return { imported, errors };
  }

  // Delete profile
  deleteProfile(profileId: string): boolean {
    const profile = this.profiles.get(profileId);
    if (profile) {
      this.proxyPhoneMappings.delete(profile.proxyId);
      return this.profiles.delete(profileId);
    }
    return false;
  }

  // Get all profiles
  getAllProfiles(): EnhancedUnifiedProfile[] {
    return Array.from(this.profiles.values());
  }

  // Get profile by ID
  getProfileById(profileId: string): EnhancedUnifiedProfile | undefined {
    return this.profiles.get(profileId);
  }

  // Update DuoPlus device creation response
  updateDuoPlusDeviceResponse(profileId: string, response: DuoPlusDeviceCreationResponse): void {
    const profile = this.profiles.get(profileId);
    if (profile && profile.duoPlusConfig) {
      profile.duoPlusConfig.deviceCreationResponse = response;

      // Update status based on response
      if (response.status === "ready") {
        profile.status = "active";
      } else if (response.status === "error") {
        profile.status = "error";
      } else {
        profile.status = "configuring";
      }
    }
  }

  // Get profiles ready for DuoPlus device creation
  getProfilesPendingDeviceCreation(): EnhancedUnifiedProfile[] {
    return Array.from(this.profiles.values()).filter(
      (profile) =>
        profile.duoPlusConfig &&
        !profile.duoPlusConfig.deviceCreationResponse &&
        profile.status === "inactive"
    );
  }

  // Get profiles with completed device creation
  getProfilesWithCompletedDevices(): EnhancedUnifiedProfile[] {
    return Array.from(this.profiles.values()).filter(
      (profile) => profile.duoPlusConfig?.deviceCreationResponse?.status === "ready"
    );
  }

  // Private helper methods
  private generateProfileId(templateName: string, proxyId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${templateName.toLowerCase()}-${proxyId}-${timestamp}-${random}`;
  }

  private validateProfile(profile: unknown): boolean {
    return (
      profile &&
      typeof profile === "object" &&
      "id" in profile &&
      typeof profile.id === "string" &&
      "name" in profile &&
      typeof profile.name === "string" &&
      "proxyId" in profile &&
      typeof profile.proxyId === "string" &&
      "phoneId" in profile &&
      typeof profile.phoneId === "string" &&
      "configuration" in profile &&
      "metadata" in profile
    );
  }

  private initializeDefaultProfiles(): void {
    // Initialize with example profiles if needed
    // This can be populated with default templates on first run
  }
}

// Export singleton instance
export const enhancedProfileManager = new EnhancedUnifiedProfileManager();
