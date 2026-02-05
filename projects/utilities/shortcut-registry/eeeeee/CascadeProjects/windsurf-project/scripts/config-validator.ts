#!/usr/bin/env bun
// scripts/config-validator.ts - Configuration Validation Script
// Validates environment configuration for DuoPlus Admin System

import { config } from "../src/config/config";
import { existsSync } from "fs";

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  environment: string;
}

class ConfigValidator {
  private results: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    environment: "",
  };

  async validate(): Promise<ValidationResult> {
    console.log("🔍 DuoPlus Configuration Validator");
    console.log("=====================================");

    try {
      // Load configuration
      const envConfig = config.getConfig();
      this.results.environment = envConfig.duoplus.environment;

      console.log(`📊 Environment: ${this.results.environment}`);
      console.log("");

      // Validate different aspects
      this.validateBasicConfig(envConfig);
      this.validateSecurityConfig(envConfig);
      this.validateExternalServices(envConfig);
      this.validateFilePermissions(envConfig);
      this.validateFeatureFlags(envConfig);
      this.validatePerformanceConfig(envConfig);

      // Print results
      this.printResults();

      return this.results;
    } catch (error) {
      this.results.valid = false;
      this.results.errors.push(`Configuration loading failed: ${error}`);
      this.printResults();
      return this.results;
    }
  }

  private validateBasicConfig(config: any): void {
    console.log("🔧 Basic Configuration:");

    // Port validation
    if (config.duoplus.port < 1024 || config.duoplus.port > 65535) {
      this.results.errors.push("Port must be between 1024 and 65535");
    }

    // Host validation
    if (!config.duoplus.host) {
      this.results.errors.push("API host must be specified");
    }

    // Database path
    if (!config.duoplus.dbPath) {
      this.results.errors.push("Database path must be specified");
    }

    console.log("  ✅ Basic configuration validated");
  }

  private validateSecurityConfig(config: any): void {
    console.log("🔒 Security Configuration:");

    const isProduction = config.duoplus.environment === "production";

    // JWT Secret validation
    if (config.duoplus.security.jwtSecret === "default-secret-change-in-production") {
      if (isProduction) {
        this.results.errors.push("JWT secret must be changed in production");
      } else {
        this.results.warnings.push("Using default JWT secret (OK for development)");
      }
    }

    if (config.duoplus.security.jwtSecret.length < 32) {
      this.results.errors.push("JWT secret must be at least 32 characters");
    }

    // Session timeout validation
    if (config.duoplus.security.sessionTimeout > 86400) {
      this.results.warnings.push("Session timeout > 24 hours may be a security risk");
    }

    console.log("  ✅ Security configuration validated");
  }

  private validateExternalServices(config: any): void {
    console.log("🌐 External Services:");

    const isProduction = config.duoplus.environment === "production";

    // KYC Provider
    if (!config.duoplus.kyc.provider) {
      this.results.errors.push("KYC provider must be specified");
    }

    if (isProduction && config.duoplus.kyc.provider === "mock") {
      this.results.errors.push("Mock KYC provider not allowed in production");
    }

    // S3 Configuration
    if (isProduction) {
      if (!config.duoplus.s3.accessKey || !config.duoplus.s3.secretKey) {
        this.results.errors.push("S3 credentials required in production");
      }
    }

    // Lightning Network
    if (!config.duoplus.lightning.endpoint) {
      this.results.warnings.push("Lightning endpoint not specified (using mock)");
    }

    console.log("  ✅ External services validated");
  }

  private validateFilePermissions(config: any): void {
    console.log("📁 File Permissions:");

    // Database directory
    const dbDir = config.duoplus.dbPath.split("/").slice(0, -1).join("/");
    if (dbDir && !existsSync(dbDir)) {
      this.results.warnings.push(`Database directory does not exist: ${dbDir}`);
    }

    // Log directory
    const logDir = config.duoplus.logging.logFile.split("/").slice(0, -1).join("/");
    if (logDir && !existsSync(logDir)) {
      this.results.warnings.push(`Log directory does not exist: ${logDir}`);
    }

    // Certificate files
    if (config.duoplus.lightning.certPath && !existsSync(config.duoplus.lightning.certPath)) {
      this.results.warnings.push(`Lightning certificate not found: ${config.duoplus.lightning.certPath}`);
    }

    console.log("  ✅ File permissions validated");
  }

  private validateFeatureFlags(config: any): void {
    console.log("🚀 Feature Flags:");

    // Check feature dependencies
    if (config.duoplus.features.aiRiskPrediction && !config.duoplus.metricsEnabled) {
      this.results.warnings.push("AI Risk Prediction requires metrics to be enabled");
    }

    if (config.duoplus.features.familyControls && !config.duoplus.kyc.apiKey) {
      this.results.warnings.push("Family Controls requires KYC API key");
    }

    console.log("  ✅ Feature flags validated");
  }

  private validatePerformanceConfig(config: any): void {
    console.log("⚡ Performance Configuration:");

    // Cache TTL validation
    if (config.duoplus.performance.cacheTTL < 30) {
      this.results.warnings.push("Cache TTL < 30 seconds may reduce performance");
    }

    // Concurrent rebalancing validation
    if (config.duoplus.performance.maxConcurrentRebalancing > 20) {
      this.results.warnings.push("High concurrent rebalancing may overwhelm system");
    }

    // APY refresh interval
    if (config.duoplus.performance.apyRefreshInterval < 10) {
      this.results.warnings.push("APY refresh interval < 10 seconds may cause excessive API calls");
    }

    console.log("  ✅ Performance configuration validated");
  }

  private printResults(): void {
    console.log("");
    console.log("📊 Validation Results:");
    console.log("======================");

    if (this.results.errors.length > 0) {
      console.log("❌ Errors:");
      this.results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    if (this.results.warnings.length > 0) {
      console.log("⚠️  Warnings:");
      this.results.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning}`);
      });
    }

    if (this.results.errors.length === 0) {
      console.log("✅ Configuration is valid!");
    } else {
      console.log(`❌ Configuration has ${this.results.errors.length} error(s)`);
    }

    console.log("");
    console.log(`Environment: ${this.results.environment}`);
    console.log(`Errors: ${this.results.errors.length}`);
    console.log(`Warnings: ${this.results.warnings.length}`);
    console.log(`Valid: ${this.results.valid}`);

    // Exit with error code if invalid
    if (!this.results.valid) {
      process.exit(1);
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new ConfigValidator();
  validator.validate().catch((error) => {
    console.error("❌ Validation failed:", error);
    process.exit(1);
  });
}

export { ConfigValidator };
