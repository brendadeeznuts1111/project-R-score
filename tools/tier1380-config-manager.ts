#!/usr/bin/env bun
// tools/tier1380-config-manager.ts — Configuration manager for A/B tests and system settings

import { writeFileSync, readFileSync, existsSync } from "fs";
import { validateConfig, COMMON_SCHEMAS } from "../lib/utils/config-validator";
import { logger } from "../lib/utils/logger";

/**
 * 🚀 Prefetch Optimizations
 *
 * This file includes prefetch hints for optimal performance:
 * - DNS prefetching for external domains
 * - Preconnect for faster handshakes
 * - Resource preloading for critical assets
 *
 * Generated automatically by optimize-examples-prefetch.ts
 */
import { join } from "path";

interface ABTestConfig {
  [testName: string]: {
    variants: string[];
    weights: number[];
    enabled: boolean;
  };
}

interface Tier1380Config {
  r2Bucket: string;
  publicApiUrl: string;
  variant: string;
  cacheEnabled: boolean;
  cacheTTL: number;
  compressionLevel: number;
  environment: 'development' | 'staging' | 'production';
}

interface SnapshotMetadata {
  tier: string;
  environment: string;
  variant: string;
  cacheHit: boolean;
  checksum: string;
  compressionRatio: string;
  compressionLevel: string;
  headersCount: string;
  cookiesCount: string;
  abTestsCount: string;
}

interface CompleteConfig {
  abTests: ABTestConfig;
  tier1380: Tier1380Config;
  snapshot: SnapshotMetadata | null;
  lastUpdated: string;
}

export class Tier1380ConfigManager {
  private configPath: string;
  private config: CompleteConfig;

  constructor(configPath: string = "./config/tier1380-config.json") {
    this.configPath = configPath;
    this.config = this.loadOrCreateConfig();
  }

  /**
   * Load existing configuration or create default
   */
  private loadOrCreateConfig(): CompleteConfig {
    if (existsSync(this.configPath)) {
      try {
        const data = readFileSync(this.configPath, "utf-8");
        return JSON.parse(data);
      } catch (error: unknown) {
        console.warn(`⚠️ Could not load config from ${this.configPath}, creating new one`);
        return this.createDefaultConfig();
      }
    }
    return this.createDefaultConfig();
  }

  /**
   * Create default configuration
   */
  private createDefaultConfig(): CompleteConfig {
    return {
      abTests: {
        url_structure: {
          variants: ["direct", "fragments"],
          weights: [50, 50],
          enabled: true
        },
        doc_layout: {
          variants: ["sidebar", "topnav"],
          weights: [60, 40],
          enabled: true
        },
        cta_color: {
          variants: ["blue", "green", "orange"],
          weights: [34, 33, 33],
          enabled: true
        },
        content_density: {
          variants: ["compact", "balanced", "spacious"],
          weights: [20, 60, 20],
          enabled: true
        }
      },
      tier1380: {
        r2Bucket: "scanner-cookies",
        publicApiUrl: "https://api.tier1380.com",
        variant: "enhanced-live",
        cacheEnabled: true,
        cacheTTL: 300000, // 5 minutes
        compressionLevel: 3,
        environment: "development"
      },
      snapshot: null,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Load configuration from environment variables
   */
  loadFromEnvironment(): boolean {
    logger.info("Loading configuration from environment variables", {
      module: 'Tier1380ConfigManager'
    });

    try {
      // Validate environment configuration
      const envConfig = {
        r2Bucket: process.env.TIER1380_R2_BUCKET,
        publicApiUrl: process.env.TIER1380_PUBLIC_API_URL,
        variant: process.env.TIER1380_VARIANT,
        cacheEnabled: process.env.TIER1380_CACHE_ENABLED,
        cacheTTL: process.env.TIER1380_CACHE_TTL ? Number(process.env.TIER1380_CACHE_TTL) : undefined,
        compressionLevel: process.env.TIER1380_COMPRESSION_LEVEL ? Number(process.env.TIER1380_COMPRESSION_LEVEL) : undefined,
        environment: process.env.NODE_ENV
      };

      const schema = {
        r2Bucket: {
          type: 'string' as const,
          required: true,
          minLength: 1,
          description: 'R2 bucket name',
          envVar: 'TIER1380_R2_BUCKET'
        },
        publicApiUrl: {
          type: 'url' as const,
          required: false,
          description: 'Public API URL',
          envVar: 'TIER1380_PUBLIC_API_URL'
        },
        variant: {
          type: 'string' as const,
          required: false,
          enum: ['development', 'staging', 'production', 'enhanced-live'],
          description: 'Deployment variant',
          envVar: 'TIER1380_VARIANT'
        },
        cacheEnabled: {
          type: 'boolean' as const,
          required: false,
          description: 'Enable caching',
          envVar: 'TIER1380_CACHE_ENABLED'
        },
        cacheTTL: {
          type: 'number' as const,
          required: false,
          min: 1000,
          max: 3600000,
          description: 'Cache TTL in milliseconds',
          envVar: 'TIER1380_CACHE_TTL'
        },
        compressionLevel: {
          type: 'number' as const,
          required: false,
          min: 1,
          max: 9,
          description: 'Compression level',
          envVar: 'TIER1380_COMPRESSION_LEVEL'
        },
        environment: {
          type: 'string' as const,
          required: false,
          enum: ['development', 'staging', 'production'],
          description: 'Environment',
          envVar: 'NODE_ENV'
        }
      };

      const validation = validateConfig(envConfig, schema, {
        module: 'Tier1380ConfigManager',
        environment: envConfig.environment
      });

      if (!validation.isValid) {
        logger.error('Configuration validation failed', {
          module: 'Tier1380ConfigManager',
          errors: validation.errors
        });
        return false;
      }

      // Apply validated configuration
      const validatedConfig = validation.config;
      if (validatedConfig.r2Bucket) this.config.tier1380.r2Bucket = validatedConfig.r2Bucket;
      if (validatedConfig.publicApiUrl) this.config.tier1380.publicApiUrl = validatedConfig.publicApiUrl;
      if (validatedConfig.variant) this.config.tier1380.variant = validatedConfig.variant;
      if (validatedConfig.cacheEnabled !== undefined) this.config.tier1380.cacheEnabled = validatedConfig.cacheEnabled;
      if (validatedConfig.cacheTTL) this.config.tier1380.cacheTTL = validatedConfig.cacheTTL;
      if (validatedConfig.compressionLevel) this.config.tier1380.compressionLevel = validatedConfig.compressionLevel;
      if (validatedConfig.environment) this.config.tier1380.environment = validatedConfig.environment;

      // Load A/B test configurations
      const abTestPattern = /^public_ab_test_(.+)$/;
      for (const [key, value] of Object.entries(process.env)) {
        const match = key.match(abTestPattern);
        if (match && value) {
          const testName = match[1];
          const config = this.parseABTestConfig(value);

          if (config) {
            this.config.abTests[testName] = {
              ...config,
              enabled: true
            };
            logger.info(`Loaded A/B test configuration`, {
              module: 'Tier1380ConfigManager',
              testName,
              variants: config.variants
            });
          }
        }
      }

      logger.info('Configuration loaded successfully', {
        module: 'Tier1380ConfigManager',
        config: {
          r2Bucket: this.config.tier1380.r2Bucket,
          variant: this.config.tier1380.variant,
          environment: this.config.tier1380.environment,
          cacheEnabled: this.config.tier1380.cacheEnabled
        }
      });

      return true;

    } catch (error) {
      logger.error('Failed to load configuration from environment', {
        module: 'Tier1380ConfigManager',
        error
      });
      return false;
    }
  }

  /**
   * Parse A/B test configuration from environment variable string
   */
  private parseABTestConfig(configString: string): { variants: string[]; weights: number[] } | null {
    try {
      const parts = configString.split(",");
      const variants: string[] = [];
      const weights: number[] = [];

      for (const part of parts) {
        const [variant, weightStr] = part.split(":");
        if (!variant || !weightStr) {
          console.warn(`⚠️ Invalid config part: ${part}`);
          return null;
        }

        const weight = parseFloat(weightStr);
        if (isNaN(weight) || weight < 0) {
          console.warn(`⚠️ Invalid weight: ${weightStr}`);
          return null;
        }

        variants.push(variant);
        weights.push(weight);
      }

      // Validate weights sum to 100
      const sum = weights.reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 100) > 0.01) {
        console.warn(`⚠️ Weights must sum to 100 (got ${sum})`);
        return null;
      }

      return { variants, weights };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.warn(`⚠️ Error parsing config: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Update snapshot metadata from API response
   */
  updateSnapshotMetadata(snapshotResponse: any): void {
    this.config.snapshot = {
      tier: snapshotResponse.metadata?.tier || "1380-enhanced",
      environment: snapshotResponse.metadata?.environment || this.config.tier1380.environment,
      variant: snapshotResponse.metadata?.variant || this.config.tier1380.variant,
      cacheHit: snapshotResponse.cacheHit?.toString() || "false",
      checksum: snapshotResponse.checksum || "",
      compressionRatio: snapshotResponse.compressionRatio || "0",
      compressionLevel: snapshotResponse.metadata?.["compression-level"] || "3",
      headersCount: snapshotResponse.metadata?.["headers-count"] || "0",
      cookiesCount: snapshotResponse.metadata?.["cookies-count"] || "0",
      abTestsCount: snapshotResponse.metadata?.["ab-tests-count"] || "0"
    };

    this.config.lastUpdated = new Date().toISOString();
    this.saveConfig();

    console.log("📸 Updated snapshot metadata:");
    console.log(`   Key: ${snapshotResponse.key}`);
    console.log(`   Cache Hit: ${this.config.snapshot.cacheHit}`);
    console.log(`   Compression: ${this.config.snapshot.compressionRatio}%`);
  }

  /**
   * Validate current configuration
   */
  validateConfig(): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate A/B test configurations
    for (const [testName, testConfig] of Object.entries(this.config.abTests)) {
      if (!testConfig.variants || testConfig.variants.length === 0) {
        errors.push(`A/B test ${testName}: No variants defined`);
      }

      if (!testConfig.weights || testConfig.weights.length === 0) {
        errors.push(`A/B test ${testName}: No weights defined`);
      }

      if (testConfig.variants.length !== testConfig.weights.length) {
        errors.push(`A/B test ${testName}: Variants and weights count mismatch`);
      }

      const weightSum = testConfig.weights.reduce((a, b) => a + b, 0);
      if (Math.abs(weightSum - 100) > 0.01) {
        errors.push(`A/B test ${testName}: Weights must sum to 100 (got ${weightSum})`);
      }
    }

    // Validate Tier-1380 configuration
    if (!this.config.tier1380.r2Bucket) {
      errors.push("Tier-1380: R2 bucket not configured");
    }

    if (!this.config.tier1380.publicApiUrl) {
      errors.push("Tier-1380: Public API URL not configured");
    }

    if (!this.config.tier1380.variant) {
      errors.push("Tier-1380: Variant not configured");
    }

    if (this.config.tier1380.cacheTTL <= 0) {
      errors.push("Tier-1380: Cache TTL must be positive");
    }

    if (this.config.tier1380.compressionLevel < 0 || this.config.tier1380.compressionLevel > 9) {
      errors.push("Tier-1380: Compression level must be 0-9");
    }

    // Warnings
    if (this.config.tier1380.environment === "production" && this.config.tier1380.cacheTTL < 60000) {
      warnings.push("Production environment: Consider longer cache TTL (>= 60s)");
    }

    if (this.config.tier1380.compressionLevel > 6) {
      warnings.push("High compression level may impact performance");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate environment export script
   */
  generateEnvScript(): string {
    const lines: string[] = [
      "#!/bin/bash",
      "# FactoryWager Tier-1380 Environment Configuration",
      "# Generated on " + new Date().toISOString(),
      ""
    ];

    // A/B test configurations
    lines.push("# A/B Test Configuration");
    for (const [testName, testConfig] of Object.entries(this.config.abTests)) {
      if (testConfig.enabled) {
        const configString = testConfig.variants.map((variant, i) =>
          `${variant}:${testConfig.weights[i]}`
        ).join(",");
        lines.push(`export public_ab_test_${testName}="${configString}"`);
      }
    }

    lines.push("");

    // Tier-1380 configuration
    lines.push("# Enhanced System Configuration");
    lines.push(`export R2_BUCKET="${this.config.tier1380.r2Bucket}"`);
    lines.push(`export PUBLIC_API_URL="${this.config.tier1380.publicApiUrl}"`);
    lines.push(`export TIER1380_VARIANT="${this.config.tier1380.variant}"`);
    lines.push(`export TIER1380_CACHE_ENABLED="${this.config.tier1380.cacheEnabled}"`);
    lines.push(`export TIER1380_CACHE_TTL="${this.config.tier1380.cacheTTL}"`);
    lines.push(`export TIER1380_COMPRESSION_LEVEL="${this.config.tier1380.compressionLevel}"`);
    lines.push(`export NODE_ENV="${this.config.tier1380.environment}"`);

    return lines.join("\n");
  }

  /**
   * Save configuration to file
   */
  private saveConfig(): void {
    try {
      const configDir = this.configPath.substring(0, this.configPath.lastIndexOf("/"));
      if (!existsSync(configDir)) {
        // Create directory if it doesn't exist
        Bun.write(configDir + "/.gitkeep", "");
      }

      writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      console.log(`💾 Configuration saved to ${this.configPath}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error(`❌ Failed to save configuration: ${errorMessage}`);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): CompleteConfig {
    return { ...this.config };
  }

  /**
   * Update A/B test configuration
   */
  updateABTest(testName: string, variants: string[], weights: number[], enabled: boolean = true): void {
    this.config.abTests[testName] = { variants, weights, enabled };
    this.config.lastUpdated = new Date().toISOString();
    this.saveConfig();
    console.log(`✅ Updated A/B test: ${testName}`);
  }

  /**
   * Update Tier-1380 configuration
   */
  updateTier1380Config(config: Partial<Tier1380Config>): void {
    this.config.tier1380 = { ...this.config.tier1380, ...config };
    this.config.lastUpdated = new Date().toISOString();
    this.saveConfig();
    console.log(`✅ Updated Tier-1380 configuration`);
  }

  /**
   * Display configuration summary
   */
  displaySummary(): void {
    console.log("\n🏭 FactoryWager Tier-1380 Configuration Summary");
    console.log("=".repeat(50));

    // A/B Tests
    console.log("\n🧪 A/B Tests:");
    for (const [testName, testConfig] of Object.entries(this.config.abTests)) {
      const status = testConfig.enabled ? "✅" : "❌";
      const weightSum = testConfig.weights.reduce((a, b) => a + b, 0);
      console.log(`   ${status} ${testName}: ${testConfig.variants.join(", ")} (${testConfig.weights.join("/")}) - Sum: ${weightSum}%`);
    }

    // Tier-1380 Configuration
    console.log("\n⚙️ Tier-1380 Configuration:");
    console.log(`   R2 Bucket: ${this.config.tier1380.r2Bucket}`);
    console.log(`   API URL: ${this.config.tier1380.publicApiUrl}`);
    console.log(`   Variant: ${this.config.tier1380.variant}`);
    console.log(`   Cache: ${this.config.tier1380.cacheEnabled ? "enabled" : "disabled"} (${this.config.tier1380.cacheTTL}ms)`);
    console.log(`   Compression: Level ${this.config.tier1380.compressionLevel}`);
    console.log(`   Environment: ${this.config.tier1380.environment}`);

    // Snapshot Metadata
    if (this.config.snapshot) {
      console.log("\n📸 Last Snapshot:");
      console.log(`   Tier: ${this.config.snapshot.tier}`);
      console.log(`   Cache Hit: ${this.config.snapshot.cacheHit}`);
      console.log(`   Compression: ${this.config.snapshot.compressionRatio}%`);
      console.log(`   Checksum: ${this.config.snapshot.checksum}`);
    }

    console.log(`\n📅 Last Updated: ${this.config.lastUpdated}`);
  }

  /**
   * Export configuration for deployment
   */
  exportForDeployment(): { environment: string[]; config: CompleteConfig } {
    const envScript = this.generateEnvScript();
    return {
      environment: envScript.split("\n"),
      config: this.getConfig()
    };
  }
}

// CLI interface
if (import.meta.path === Bun.main) {
  const manager = new Tier1380ConfigManager();
  const command = process.argv[2];

  switch (command) {
    case "load":
      manager.loadFromEnvironment();
      break;

    case "validate":
      const validation = manager.validateConfig();
      console.log(`Validation: ${validation.valid ? "✅ PASSED" : "❌ FAILED"}`);
      if (validation.errors.length > 0) {
        console.log("\nErrors:");
        validation.errors.forEach(error => console.log(`   ❌ ${error}`));
      }
      if (validation.warnings.length > 0) {
        console.log("\nWarnings:");
        validation.warnings.forEach(warning => console.log(`   ⚠️ ${warning}`));
      }
      break;

    case "summary":
      manager.displaySummary();
      break;

    case "export":
      const exported = manager.exportForDeployment();
      console.log("📦 Environment Export:");
      console.log(exported.environment.join("\n"));
      break;

    case "update-snapshot":
      // Example: Update with sample snapshot response
      const sampleSnapshot = {
        success: true,
        key: "snapshots/enhanced-live-2024-02-04.tier1380.zst",
        cacheHit: true,
        checksum: "5b6e38b626c6690077fa1dbccd347fbebc0d3d77",
        compressionRatio: "57.4",
        metadata: {
          tier: "1380-enhanced",
          environment: "production",
          variant: "enhanced-live",
          "cache-hit": "true",
          "compression-level": "3",
          "headers-count": "3",
          "cookies-count": "3",
          "ab-tests-count": "4",
          "compression-ratio": "57.4"
        }
      };
      manager.updateSnapshotMetadata(sampleSnapshot);
      break;

    default:
      console.log("Usage:");
      console.log("  bun tier1380-config-manager.ts load        - Load from environment");
      console.log("  bun tier1380-config-manager.ts validate    - Validate configuration");
      console.log("  bun tier1380-config-manager.ts summary     - Display summary");
      console.log("  bun tier1380-config-manager.ts export      - Export environment");
      console.log("  bun tier1380-config-manager.ts update-snapshot - Update with sample");
      break;
  }
}

export default Tier1380ConfigManager;
