import { UNIFIED_PROFILE_CONSTANTS, PROFILE_TEMPLATES } from "./types";
import type {
  UnifiedProfile,
  ProxyConfiguration,
  PerformanceMetrics,
  ProfileMetadata
} from "./types";

import type { BunFileSystemEntry } from "../../types/bun";

// Declare Bun global for TypeScript
declare const Bun: {
  file(path: string): BunFileSystemEntry;
  write(path: string, data: string | ArrayBuffer | Blob): Promise<void>;
};

export class UnifiedProfileManager {
  private profiles: Map<string, UnifiedProfile> = new Map();
  private proxyPhoneMappings: Map<string, string> = new Map(); // proxyId -> phoneId

  constructor() {
    this.initializeDefaultProfiles();
  }

  // Initialize with some default profiles
  private initializeDefaultProfiles(): void {
    const defaultProfiles = [
      {
        id: "gaming-us-1",
        name: "US Gaming Profile",
        proxyId: "proxy-us-1",
        phoneId: "d0efde27-6bc8-4f5c-bfee-b0bb732bfc36",
        status: UNIFIED_PROFILE_CONSTANTS.STATUS.INACTIVE,
        configuration: {
          ip: "192.168.1.100",
          port: 8080,
          username: "gaming_user",
          password: "gaming_pass",
          protocol: UNIFIED_PROFILE_CONSTANTS.PROTOCOL.HTTPS,
          region: "United States",
          dns: [...UNIFIED_PROFILE_CONSTANTS.DNS.CLOUDFLARE],
          whitelist: [],
          blacklist: []
        },
        performance: {
          responseTime: 45,
          uptime: 99.9,
          bandwidth: { upload: 100, download: 150 },
          requests: { total: 1000, successful: 995, failed: 5 },
          lastUpdated: new Date().toISOString()
        },
        metadata: {
          description: "High-performance gaming profile optimized for low latency",
          tags: [...UNIFIED_PROFILE_CONSTANTS.TEMPLATES.HIGH_PERFORMANCE.tags],
          category: UNIFIED_PROFILE_CONSTANTS.TEMPLATES.HIGH_PERFORMANCE.category,
          priority: UNIFIED_PROFILE_CONSTANTS.TEMPLATES.HIGH_PERFORMANCE.priority,
          autoRotate: UNIFIED_PROFILE_CONSTANTS.TEMPLATES.HIGH_PERFORMANCE.autoRotate,
          failoverEnabled: UNIFIED_PROFILE_CONSTANTS.TEMPLATES.HIGH_PERFORMANCE.failoverEnabled
        },
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString()
      },
      {
        id: "streaming-eu-1",
        name: "EU Streaming Profile",
        proxyId: "proxy-eu-1",
        phoneId: "phone-eu-1",
        status: UNIFIED_PROFILE_CONSTANTS.STATUS.INACTIVE,
        configuration: {
          ip: "192.168.1.101",
          port: 8080,
          username: "stream_user",
          password: "stream_pass",
          protocol: UNIFIED_PROFILE_CONSTANTS.PROTOCOL.HTTPS,
          region: "Germany",
          dns: [...UNIFIED_PROFILE_CONSTANTS.DNS.GOOGLE],
          whitelist: [...UNIFIED_PROFILE_CONSTANTS.TEMPLATES.STREAMING_OPTIMIZED.whitelist],
          blacklist: []
        },
        performance: {
          responseTime: 85,
          uptime: 99.5,
          bandwidth: { upload: 50, download: 100 },
          requests: { total: 500, successful: 490, failed: 10 },
          lastUpdated: new Date().toISOString()
        },
        metadata: {
          description: "Optimized for European streaming services",
          tags: [...UNIFIED_PROFILE_CONSTANTS.TEMPLATES.STREAMING_OPTIMIZED.tags],
          category: UNIFIED_PROFILE_CONSTANTS.TEMPLATES.STREAMING_OPTIMIZED.category,
          priority: UNIFIED_PROFILE_CONSTANTS.TEMPLATES.STREAMING_OPTIMIZED.priority,
          autoRotate: UNIFIED_PROFILE_CONSTANTS.TEMPLATES.STREAMING_OPTIMIZED.autoRotate,
          failoverEnabled: UNIFIED_PROFILE_CONSTANTS.TEMPLATES.STREAMING_OPTIMIZED.failoverEnabled
        },
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString()
      }
    ];

    defaultProfiles.forEach((profile) => {
      this.profiles.set(profile.id, profile);
      this.proxyPhoneMappings.set(profile.proxyId, profile.phoneId);
    });
  }

  // Create a new unified profile
  createProfile(config: {
    name: string;
    proxyId: string;
    phoneId: string;
    template?: keyof typeof PROFILE_TEMPLATES;
    customConfig?: Partial<ProxyConfiguration>;
    customMetadata?: Partial<ProfileMetadata>;
  }): UnifiedProfile {
    const { name, proxyId, phoneId, template, customConfig, customMetadata } = config;

    // Validate inputs
    this.validateProfileConfig({ name, proxyId, phoneId });

    // Use template or create from defaults
    let baseConfig: ProxyConfiguration;
    let baseMetadata: ProfileMetadata;

    if (template && PROFILE_TEMPLATES[template]) {
      const templateData = PROFILE_TEMPLATES[template];
      baseConfig = {
        ip: "", // Will be set when proxy is linked
        port: 8080,
        username: "",
        password: "",
        protocol: templateData.protocol,
        region: "",
        dns: [...templateData.dns],
        whitelist: [...templateData.whitelist],
        blacklist: [...templateData.blacklist]
      };
      baseMetadata = {
        description: templateData.description,
        tags: [...templateData.tags],
        category: templateData.category,
        priority: templateData.priority,
        autoRotate: templateData.autoRotate,
        failoverEnabled: templateData.failoverEnabled
      };
    } else {
      const defaultConfig = UNIFIED_PROFILE_CONSTANTS.DEFAULTS.GENERAL;
      baseConfig = {
        ip: "", // Will be set when proxy is linked
        port: 8080,
        username: "",
        password: "",
        protocol: defaultConfig.protocol,
        region: "",
        dns: [...defaultConfig.dns],
        whitelist: [...defaultConfig.whitelist],
        blacklist: [...defaultConfig.blacklist]
      };
      baseMetadata = {
        description: "Custom unified profile",
        tags: ["custom"],
        category: defaultConfig.category,
        priority: defaultConfig.priority,
        autoRotate: defaultConfig.autoRotate,
        failoverEnabled: defaultConfig.failoverEnabled
      };
    }

    // Apply custom configurations
    const configuration = { ...baseConfig, ...customConfig };
    const metadata = { ...baseMetadata, ...customMetadata };

    const profile: UnifiedProfile = {
      id: this.generateProfileId(proxyId, phoneId),
      name,
      proxyId,
      phoneId,
      status: UNIFIED_PROFILE_CONSTANTS.STATUS.INACTIVE,
      configuration,
      performance: this.getDefaultPerformanceMetrics(),
      metadata,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString()
    };

    this.profiles.set(profile.id, profile);
    this.proxyPhoneMappings.set(proxyId, phoneId);

    return profile;
  }

  // Get profile by ID
  getProfile(profileId: string): UnifiedProfile | undefined {
    return this.profiles.get(profileId);
  }

  // Get profile by proxy ID
  getProfileByProxy(proxyId: string): UnifiedProfile | undefined {
    const phoneId = this.proxyPhoneMappings.get(proxyId);
    if (!phoneId) {
      return undefined;
    }

    return Array.from(this.profiles.values()).find(
      (profile) => profile.proxyId === proxyId && profile.phoneId === phoneId
    );
  }

  // Get all profiles
  getAllProfiles(): UnifiedProfile[] {
    return Array.from(this.profiles.values());
  }

  // Get profiles by category
  getProfilesByCategory(category: string): UnifiedProfile[] {
    return Array.from(this.profiles.values()).filter(
      (profile) => profile.metadata.category === category
    );
  }

  // Get profiles by status
  getProfilesByStatus(status: string): UnifiedProfile[] {
    return Array.from(this.profiles.values()).filter((profile) => profile.status === status);
  }

  // Update profile configuration
  updateProfile(
    profileId: string,
    updates: {
      configuration?: Partial<ProxyConfiguration>;
      metadata?: Partial<ProfileMetadata>;
      status?: UnifiedProfile["status"];
    }
  ): boolean {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      return false;
    }

    if (updates.configuration) {
      profile.configuration = { ...profile.configuration, ...updates.configuration };
    }
    if (updates.metadata) {
      profile.metadata = { ...profile.metadata, ...updates.metadata };
    }
    if (updates.status) {
      profile.status = updates.status;
    }

    profile.lastUsed = new Date().toISOString();
    this.profiles.set(profileId, profile);
    return true;
  }

  // Delete profile
  deleteProfile(profileId: string): boolean {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      return false;
    }

    this.profiles.delete(profileId);
    this.proxyPhoneMappings.delete(profile.proxyId);
    return true;
  }

  // Activate profile
  activateProfile(profileId: string): boolean {
    return this.updateProfile(profileId, {
      status: UNIFIED_PROFILE_CONSTANTS.STATUS.ACTIVE
    });
  }

  // Deactivate profile
  deactivateProfile(profileId: string): boolean {
    return this.updateProfile(profileId, {
      status: UNIFIED_PROFILE_CONSTANTS.STATUS.INACTIVE
    });
  }

  // Update performance metrics
  updatePerformanceMetrics(profileId: string, metrics: Partial<PerformanceMetrics>): boolean {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      return false;
    }

    profile.performance = { ...profile.performance, ...metrics };
    profile.performance.lastUpdated = new Date().toISOString();
    this.profiles.set(profileId, profile);
    return true;
  }

  // Get performance rating
  getPerformanceRating(profileId: string): "excellent" | "good" | "fair" | "poor" {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      return "poor";
    }

    const { responseTime, uptime } = profile.performance;
    const thresholds = UNIFIED_PROFILE_CONSTANTS.THRESHOLDS;

    if (
      responseTime <= thresholds.RESPONSE_TIME.EXCELLENT &&
      uptime >= thresholds.UPTIME.EXCELLENT
    ) {
      return "excellent";
    }
    if (responseTime <= thresholds.RESPONSE_TIME.GOOD && uptime >= thresholds.UPTIME.GOOD) {
      return "good";
    }
    if (responseTime <= thresholds.RESPONSE_TIME.FAIR && uptime >= thresholds.UPTIME.FAIR) {
      return "fair";
    }
    return "poor";
  }

  // Validate profile configuration
  private validateProfileConfig(config: { name: string; proxyId: string; phoneId: string }): void {
    const { name, proxyId, phoneId } = config;
    const validation = UNIFIED_PROFILE_CONSTANTS.VALIDATION;

    if (
      name.length < validation.PROFILE_NAME_LENGTH.min ||
      name.length > validation.PROFILE_NAME_LENGTH.max
    ) {
      throw new Error(
        `Profile name must be between ${validation.PROFILE_NAME_LENGTH.min} and ${validation.PROFILE_NAME_LENGTH.max} characters`
      );
    }

    if (!proxyId || !phoneId) {
      throw new Error("Both proxy ID and phone ID are required");
    }

    // Check if profile already exists
    const existingProfileId = this.generateProfileId(proxyId, phoneId);
    if (this.profiles.has(existingProfileId)) {
      throw new Error("A profile for this proxy-phone combination already exists");
    }
  }

  // Generate unique profile ID
  private generateProfileId(proxyId: string, phoneId: string): string {
    return `${proxyId}-${phoneId}`;
  }

  // Get default performance metrics
  private getDefaultPerformanceMetrics(): PerformanceMetrics {
    return {
      responseTime: 100,
      uptime: 99.0,
      bandwidth: { upload: 50, download: 50 },
      requests: { total: 0, successful: 0, failed: 0 },
      lastUpdated: new Date().toISOString()
    };
  }

  // Export profiles to JSON (with BunFileSystemEntry support for large datasets)
  exportProfiles(): string {
    const profiles = Array.from(this.profiles.values());
    return JSON.stringify(profiles, null, 2);
  }

  // Export profiles to file (BunFileSystemEntry optimized)
  async exportProfilesToFile(filePath: string): Promise<BunFileSystemEntry> {
    try {
      const jsonData = this.exportProfiles();
      await Bun.write(filePath, jsonData);
      return Bun.file(filePath);
    } catch (error) {
      throw new Error(`Failed to export profiles to file: ${error}`);
    }
  }

  // Stream export profiles for large datasets
  async *streamProfiles(): AsyncGenerator<string, void, unknown> {
    const profiles = Array.from(this.profiles.values());

    // Start JSON array
    yield "[\n";

    for (let i = 0; i < profiles.length; i++) {
      const profile = profiles[i];
      const jsonProfile = JSON.stringify(profile, null, 2);

      // Add comma if not last item
      if (i < profiles.length - 1) {
        yield jsonProfile + ",\n";
      } else {
        yield jsonProfile + "\n";
      }
    }

    // End JSON array
    yield "]";
  }

  // Import profiles from JSON (with BunFileSystemEntry support)
  importProfiles(jsonData: string): { imported: number; errors: string[] } {
    const errors: string[] = [];
    let imported = 0;

    try {
      const profiles: UnifiedProfile[] = JSON.parse(jsonData);

      for (const profile of profiles) {
        try {
          // Validate profile structure
          if (!profile.id || !profile.name || !profile.proxyId || !profile.phoneId) {
            errors.push(`Invalid profile structure: ${profile.name || "Unknown"}`);
            continue;
          }

          this.profiles.set(profile.id, profile);
          this.proxyPhoneMappings.set(profile.proxyId, profile.phoneId);
          imported++;
        } catch {
          errors.push(`Failed to import profile: ${profile.name || "Unknown"}`);
        }
      }
    } catch {
      errors.push("Invalid JSON format");
    }

    return { imported, errors };
  }

  // Import profiles from BunFileSystemEntry (optimized for large files)
  async importProfilesFromFile(filePath: string): Promise<{ imported: number; errors: string[] }> {
    try {
      const file = Bun.file(filePath);

      if (!(await file.exists())) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Use streaming for large files
      if (file.size > 10 * 1024 * 1024) {
        // 10MB threshold
        return await this.importProfilesFromStream(file);
      } else {
        const jsonData = await file.text();
        return this.importProfiles(jsonData);
      }
    } catch (error) {
      throw new Error(`Failed to import profiles from file: ${error}`);
    }
  }

  // Import profiles from stream (memory-efficient for large files)
  private async importProfilesFromStream(
    file: BunFileSystemEntry
  ): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    try {
      const stream = file.stream();
      let buffer = "";

      for await (const chunk of stream) {
        buffer += new TextDecoder().decode(chunk);

        // Process complete JSON objects
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line

        for (const line of lines) {
          if (line.trim()) {
            try {
              const profile = JSON.parse(line);
              if (this.validateAndImportProfile(profile)) {
                imported++;
              } else {
                errors.push(`Invalid profile: ${profile.name || "Unknown"}`);
              }
            } catch {
              errors.push(`Failed to parse profile: ${line.substring(0, 50)}...`);
            }
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        try {
          const profile = JSON.parse(buffer);
          if (this.validateAndImportProfile(profile)) {
            imported++;
          } else {
            errors.push(`Invalid profile: ${profile.name || "Unknown"}`);
          }
        } catch {
          errors.push("Failed to parse remaining data");
        }
      }
    } catch (error) {
      errors.push(`Stream processing failed: ${error}`);
    }

    return { imported, errors };
  }

  // Validate and import a single profile
  private validateAndImportProfile(profile: UnifiedProfile): boolean {
    try {
      if (!profile.id || !profile.name || !profile.proxyId || !profile.phoneId) {
        return false;
      }

      this.profiles.set(profile.id, profile);
      this.proxyPhoneMappings.set(profile.proxyId, profile.phoneId);
      return true;
    } catch {
      return false;
    }
  }

  // Get statistics (with optional file export)
  getStatistics(): {
    total: number;
    active: number;
    inactive: number;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
    averagePerformance: {
      responseTime: number;
      uptime: number;
      successRate: number;
    };
    } {
    const profiles = Array.from(this.profiles.values());

    const stats = {
      total: profiles.length,
      active: profiles.filter((p) => p.status === UNIFIED_PROFILE_CONSTANTS.STATUS.ACTIVE).length,
      inactive: profiles.filter((p) => p.status === UNIFIED_PROFILE_CONSTANTS.STATUS.INACTIVE)
        .length,
      byCategory: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      averagePerformance: {
        responseTime: 0,
        uptime: 0,
        successRate: 0
      }
    };

    // Calculate category and priority distributions
    profiles.forEach((profile) => {
      stats.byCategory[profile.metadata.category] =
        (stats.byCategory[profile.metadata.category] || 0) + 1;
      stats.byPriority[profile.metadata.priority] =
        (stats.byPriority[profile.metadata.priority] || 0) + 1;
    });

    // Calculate average performance
    if (profiles.length > 0) {
      const totalResponseTime = profiles.reduce((sum, p) => sum + p.performance.responseTime, 0);
      const totalUptime = profiles.reduce((sum, p) => sum + p.performance.uptime, 0);
      const totalSuccessRate = profiles.reduce((sum, p) => {
        const rate =
          p.performance.requests.total > 0
            ? (p.performance.requests.successful / p.performance.requests.total) * 100
            : 0;
        return sum + rate;
      }, 0);

      stats.averagePerformance = {
        responseTime: Math.round(totalResponseTime / profiles.length),
        uptime: Math.round((totalUptime / profiles.length) * 100) / 100,
        successRate: Math.round((totalSuccessRate / profiles.length) * 100) / 100
      };
    }

    return stats;
  }

  // Export statistics to file (BunFileSystemEntry optimized)
  async exportStatisticsToFile(filePath: string): Promise<BunFileSystemEntry> {
    try {
      const stats = this.getStatistics();
      const jsonData = JSON.stringify(stats, null, 2);
      await Bun.write(filePath, jsonData);
      return Bun.file(filePath);
    } catch (error) {
      throw new Error(`Failed to export statistics to file: ${error}`);
    }
  }

  // Backup all data to file (complete backup with BunFileSystemEntry)
  async backupData(filePath: string): Promise<BunFileSystemEntry> {
    try {
      const backupData = {
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        profiles: Array.from(this.profiles.values()),
        mappings: Object.fromEntries(this.proxyPhoneMappings),
        statistics: this.getStatistics()
      };

      const jsonData = JSON.stringify(backupData, null, 2);
      await Bun.write(filePath, jsonData);
      return Bun.file(filePath);
    } catch (error) {
      throw new Error(`Failed to backup data: ${error}`);
    }
  }

  // Restore data from backup file (BunFileSystemEntry optimized)
  async restoreData(filePath: string): Promise<{ restored: number; errors: string[] }> {
    try {
      const file = Bun.file(filePath);

      if (!(await file.exists())) {
        throw new Error(`Backup file not found: ${filePath}`);
      }

      const jsonData = await file.text();
      const backupData = JSON.parse(jsonData);

      const errors: string[] = [];
      let restored = 0;

      // Clear existing data
      this.profiles.clear();
      this.proxyPhoneMappings.clear();

      // Restore profiles
      if (backupData.profiles && Array.isArray(backupData.profiles)) {
        for (const profile of backupData.profiles) {
          try {
            if (profile.id && profile.name && profile.proxyId && profile.phoneId) {
              this.profiles.set(profile.id, profile);
              this.proxyPhoneMappings.set(profile.proxyId, profile.phoneId);
              restored++;
            } else {
              errors.push(`Invalid profile in backup: ${profile.name || "Unknown"}`);
            }
          } catch {
            errors.push(`Failed to restore profile: ${profile.name || "Unknown"}`);
          }
        }
      }

      // Restore mappings if available
      if (backupData.mappings) {
        try {
          Object.entries(backupData.mappings).forEach(([proxyId, phoneId]) => {
            this.proxyPhoneMappings.set(proxyId, phoneId as string);
          });
        } catch {
          errors.push("Failed to restore proxy-phone mappings");
        }
      }

      return { restored, errors };
    } catch (error) {
      throw new Error(`Failed to restore data from backup: ${error}`);
    }
  }
}
