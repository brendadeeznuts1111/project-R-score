#!/usr/bin/env bun

/**
 * Empire Pro TOML Configuration Parser
 * Enhanced configuration management with TOML support
 */

import { readFile } from 'fs/promises';

interface EmpireProConfig {
  service: {
    name: string;
    version: string;
    environment: string;
    debug: boolean;
  };
  database: {
    url: string;
    pool_size: number;
    timeout: number;
    ssl_enabled: boolean;
  };
  redis: {
    url: string;
    pool_size: number;
    timeout: number;
  };
  api: {
    host: string;
    port: number;
    cors_enabled: boolean;
    rate_limit: number;
  };
  security: {
    jwt_secret: string;
    encryption_key: string;
    session_timeout: number;
  };
  cloudflare: {
    r2_endpoint: string;
    r2_access_key_id: string;
    r2_secret_access_key: string;
    r2_bucket: string;
    r2_region: string;
  };
  logging: {
    level: string;
    format: string;
    output: string;
    file_path: string;
  };
  features: {
    einstein_similarity: boolean;
    real_time_monitoring: boolean;
    advanced_analytics: boolean;
    debug_mode: boolean;
  };
  monitoring: {
    metrics_enabled: boolean;
    health_check_interval: number;
    performance_tracking: boolean;
    alert_webhook: string;
  };
  services: Array<{
    name: string;
    url: string;
    timeout: number;
    retries: number;
  }>;
}

class TomlConfigParser {
  private config: EmpireProConfig | null = null;
  
  async loadConfig(filePath: string): Promise<EmpireProConfig> {
    console.log(`📄 Loading TOML configuration from: ${filePath}`);
    
    const start = performance.now();
    
    // Use Bun's built-in TOML import
    const module = await import(filePath, { with: { type: "toml" } });
    this.config = module.default as EmpireProConfig;
    
    const end = performance.now();
    console.log(`⚡ Configuration loaded in ${(end - start).toFixed(3)}ms`);
    
    return this.config;
  }
  
  getConfig(): EmpireProConfig {
    if (!this.config) {
      throw new Error("Configuration not loaded. Call loadConfig() first.");
    }
    return this.config;
  }
  
  // Get specific configuration sections
  getServiceConfig() {
    return this.getConfig().service;
  }
  
  getDatabaseConfig() {
    return this.getConfig().database;
  }
  
  getApiConfig() {
    return this.getConfig().api;
  }
  
  getSecurityConfig() {
    return this.getConfig().security;
  }
  
  getCloudflareConfig() {
    return this.getConfig().cloudflare;
  }
  
  getFeatures() {
    return this.getConfig().features;
  }
  
  getServices() {
    return this.getConfig().services;
  }
  
  // Validate configuration
  validateConfig(): { valid: boolean; errors: string[] } {
    if (!this.config) {
      return { valid: false, errors: ["Configuration not loaded"] };
    }
    
    const errors: string[] = [];
    const config = this.config;
    
    // Validate required fields
    if (!config.service.name) errors.push("Service name is required");
    if (!config.database.url) errors.push("Database URL is required");
    if (!config.api.port || config.api.port < 1 || config.api.port > 65535) {
      errors.push("Valid API port is required");
    }
    if (!config.security.jwt_secret) errors.push("JWT secret is required");
    if (!config.cloudflare.r2_endpoint) errors.push("R2 endpoint is required");
    
    // Validate service configurations
    config.services.forEach((service, index) => {
      if (!service.name) errors.push(`Service ${index + 1}: name is required`);
      if (!service.url) errors.push(`Service ${index + 1}: URL is required`);
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  // Merge with environment variables (for secrets)
  mergeWithEnv(): EmpireProConfig {
    if (!this.config) {
      throw new Error("Configuration not loaded");
    }
    
    const merged = { ...this.config };
    
    // Override sensitive values with environment variables if available
    if (process.env.DATABASE_URL) {
      merged.database.url = process.env.DATABASE_URL;
    }
    
    if (process.env.REDIS_URL) {
      merged.redis.url = process.env.REDIS_URL;
    }
    
    if (process.env.JWT_SECRET) {
      merged.security.jwt_secret = process.env.JWT_SECRET;
    }
    
    if (process.env.ENCRYPTION_KEY) {
      merged.security.encryption_key = process.env.ENCRYPTION_KEY;
    }
    
    if (process.env.R2_ENDPOINT) {
      merged.cloudflare.r2_endpoint = process.env.R2_ENDPOINT;
    }
    
    if (process.env.R2_ACCESS_KEY_ID) {
      merged.cloudflare.r2_access_key_id = process.env.R2_ACCESS_KEY_ID;
    }
    
    if (process.env.R2_SECRET_ACCESS_KEY) {
      merged.cloudflare.r2_secret_access_key = process.env.R2_SECRET_ACCESS_KEY;
    }
    
    return merged;
  }
  
  // Export configuration to different formats
  async exportToJson(filePath: string): Promise<void> {
    if (!this.config) {
      throw new Error("Configuration not loaded");
    }
    
    const json = JSON.stringify(this.config, null, 2);
    await writeFile(filePath, json);
    console.log(`✅ Configuration exported to JSON: ${filePath}`);
  }
  
  printConfigSummary(): void {
    if (!this.config) {
      console.log("❌ No configuration loaded");
      return;
    }
    
    console.log("🏰 Empire Pro Configuration Summary");
    console.log("===================================");
    console.log(`📦 Service: ${this.config.service.name} v${this.config.service.version}`);
    console.log(`🌍 Environment: ${this.config.service.environment}`);
    console.log(`🗄️ Database: ${this.config.database.url.split('@')[1] || 'configured'}`);
    console.log(`🚀 API: ${this.config.api.host}:${this.config.api.port}`);
    console.log(`☁️ Cloudflare R2: ${this.config.cloudflare.r2_bucket}`);
    console.log(`🔧 Features: ${Object.values(this.config.features).filter(Boolean).length} enabled`);
    console.log(`🔗 Services: ${this.config.services.length} configured`);
    console.log("");
  }
}

// Demonstration function
async function demonstrateTomlConfig() {
  console.log("🚀 Empire Pro TOML Configuration Parser Demo");
  console.log("============================================");
  console.log("");
  
  const parser = new TomlConfigParser();
  
  try {
    // Load configuration
    const config = await parser.loadConfig("../example.toml");
    
    // Display summary
    parser.printConfigSummary();
    
    // Validate configuration
    console.log("🔍 Configuration Validation:");
    const validation = parser.validateConfig();
    if (validation.valid) {
      console.log("✅ Configuration is valid");
    } else {
      console.log("❌ Configuration has errors:");
      validation.errors.forEach(error => console.log(`   - ${error}`));
    }
    console.log("");
    
    // Show specific sections
    console.log("📊 Configuration Sections:");
    console.log(`🔧 API Config: ${JSON.stringify(parser.getApiConfig(), null, 2)}`);
    console.log("");
    console.log(`🌐 Services: ${parser.getServices().length} configured`);
    parser.getServices().forEach((service, index) => {
      console.log(`   ${index + 1}. ${service.name}: ${service.url} (timeout: ${service.timeout}s)`);
    });
    console.log("");
    
    // Show features
    console.log("🚀 Enabled Features:");
    const features = parser.getFeatures();
    Object.entries(features).forEach(([key, value]) => {
      const status = value ? "✅" : "❌";
      const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      console.log(`   ${status} ${formattedKey}`);
    });
    console.log("");
    
    // Performance test
    console.log("⚡ Performance Test:");
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      await parser.loadConfig("../example.toml");
    }
    const end = performance.now();
    console.log(`   Loaded 1000 times in ${(end - start).toFixed(3)}ms`);
    console.log(`   Average: ${((end - start) / 1000).toFixed(6)}ms per load`);
    console.log("");
    
    console.log("✅ TOML Configuration Parser Demo Complete!");
    console.log("🚀 Empire Pro Config Empire with enhanced TOML support!");
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Run demonstration
if (import.meta.main) {
  demonstrateTomlConfig();
}

export { TomlConfigParser, type EmpireProConfig };
