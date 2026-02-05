#!/usr/bin/env bun
/**
 * Bun TOML Parsing Examples
 *
 * Demonstrates how to work with TOML files in Bun using available APIs
 * Since direct TOML imports with `with { type: "toml" }` are not yet supported,
 * we'll use alternative approaches for TOML parsing.
 */

import { readFileSync } from "fs";

// 1. Using Bun's built-in file reading with manual TOML parsing
// Note: As of Bun v1.3.6, direct TOML imports are not yet available
// We'll need to use a TOML parser library or implement basic parsing

// Simple TOML parser for demonstration (basic implementation)
function parseToml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.split("\n");
  let currentSection: Record<string, unknown> = result;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Section headers
    const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      const sectionPath = sectionMatch[1].split(".");
      currentSection = result;

      for (const section of sectionPath) {
        if (!currentSection[section]) {
          currentSection[section] = {};
        }
        currentSection = currentSection[section] as Record<string, unknown>;
      }
      continue;
    }

    // Key-value pairs
    const keyValueMatch = trimmed.match(/^([^=]+)=(.*)$/);
    if (keyValueMatch) {
      const key = keyValueMatch[1].trim();
      const value = keyValueMatch[2].trim();

      // Remove quotes from strings
      // Parse different data types
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        currentSection[key] = value.slice(1, -1); // Remove quotes
      } else if (value === "true") {
        currentSection[key] = true;
      } else if (value === "false") {
        currentSection[key] = false;
      } else if (!isNaN(Number(value))) {
        currentSection[key] = Number(value);
      } else {
        currentSection[key] = value; // Keep as string if no other type matches
      }
    }
  }

  return result;
}

// 2. Load and parse TOML file
function loadTomlFile(filePath: string): Record<string, unknown> | null {
  try {
    const content = readFileSync(filePath, "utf-8");
    return parseToml(content);
  } catch (error) {
    console.error(`Failed to load TOML file ${filePath}:`, error);
    return null;
  }
}

// 3. Async TOML loading
async function loadTomlFileAsync(
  filePath: string
): Promise<Record<string, unknown> | null> {
  try {
    const file = Bun.file(filePath);
    const exists = await file.exists();

    if (!exists) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = await file.text();
    return parseToml(content);
  } catch (error) {
    console.error(`Failed to load TOML file ${filePath}:`, error);
    return null;
  }
}

// 4. Configuration interfaces
interface ServerConfig {
  host: string;
  port: number;
  ssl: boolean;
  workers?: number;
}

interface DatabaseConfig {
  url: string;
  pool_size: number;
  timeout: number;
  retry_attempts: number;
}

interface FeaturesConfig {
  auth: boolean;
  logging: boolean;
  monitoring: boolean;
  caching: boolean;
}

interface AppConfig {
  server: ServerConfig;
  database: DatabaseConfig;
  features: FeaturesConfig;
  redis?: Record<string, unknown>;
  logging?: Record<string, unknown>;
  security?: Record<string, unknown>;
  monitoring?: Record<string, unknown>;
  [key: string]: unknown; // Add index signature to make it assignable to Record<string, unknown>
}

// 5. Type-safe configuration loader
class ConfigLoader {
  private static cache = new Map<string, AppConfig>();

  static async loadConfig(filePath: string): Promise<AppConfig | null> {
    if (this.cache.has(filePath)) {
      return this.cache.get(filePath)!;
    }

    const config = await loadTomlFileAsync(filePath);

    if (!config) {
      return null;
    }

    // Type validation
    if (!this.validateConfig(config)) {
      console.error(`Invalid configuration in ${filePath}`);
      return null;
    }

    const typedConfig = config as AppConfig;
    this.cache.set(filePath, typedConfig);
    return typedConfig;
  }

  static validateConfig(config: Record<string, unknown>): config is AppConfig {
    if (!config || typeof config !== "object") {
      return false;
    }

    const server = config.server as Record<string, unknown>;
    const database = config.database as Record<string, unknown>;
    const features = config.features as Record<string, unknown>;

    return (
      typeof server === "object" &&
      server !== null &&
      typeof server.host === "string" &&
      typeof server.port === "number" &&
      server.port > 0 &&
      server.port < 65536 &&
      typeof server.ssl === "boolean" &&
      typeof database === "object" &&
      database !== null &&
      typeof database.url === "string" &&
      typeof database.pool_size === "number" &&
      typeof features === "object" &&
      features !== null &&
      typeof features.auth === "boolean"
    );
  }

  static clearCache(): void {
    this.cache.clear();
  }
}

// 6. Environment-specific configuration loading
async function loadEnvironmentConfig(env: string): Promise<AppConfig | null> {
  const configPath = `./examples/config/${env}.toml`;
  let config = await ConfigLoader.loadConfig(configPath);

  if (!config) {
    console.warn(`Failed to load ${env} config, trying fallback...`);
    config = await ConfigLoader.loadConfig("./examples/config/example.toml");
  }

  return config;
}

// 7. Configuration merging utility
async function mergeConfigs(
  ...configPaths: string[]
): Promise<AppConfig | null> {
  const merged: Partial<AppConfig> = {};

  for (const path of configPaths) {
    const config = await ConfigLoader.loadConfig(path);
    if (config) {
      Object.assign(merged, config);
    }
  }

  return Object.keys(merged).length > 0 ? (merged as AppConfig) : null;
}

// 8. Configuration comparison
function compareConfigs(base: AppConfig, compare: AppConfig): void {
  console.log("📊 Configuration Comparison:");
  console.log("==========================");

  console.log("Server:");
  console.log(
    `  Base: ${base.server.host}:${base.server.port} (SSL: ${base.server.ssl})`
  );
  console.log(
    `  Compare: ${compare.server.host}:${compare.server.port} (SSL: ${compare.server.ssl})`
  );

  console.log("Database:");
  console.log(`  Base pool: ${base.database.pool_size}`);
  console.log(`  Compare pool: ${compare.database.pool_size}`);

  console.log("Features:");
  Object.keys(base.features).forEach((key) => {
    const baseVal = base.features[key as keyof FeaturesConfig];
    const compareVal = compare.features[key as keyof FeaturesConfig];
    const status = baseVal === compareVal ? "✅" : "🔄";
    console.log(`  ${key}: ${baseVal} → ${compareVal} ${status}`);
  });
}

// 9. Hot reload simulation
async function demonstrateConfigReloading() {
  console.log("🔥 Configuration Reloading Demo:");
  console.log("==================================");

  const configPath = "./examples/config/example.toml";
  let config = await ConfigLoader.loadConfig(configPath);

  if (config) {
    console.log("Initial config loaded:", config.server);

    // Clear cache and reload
    ConfigLoader.clearCache();
    config = await ConfigLoader.loadConfig(configPath);
    if (config) {
      console.log("Config reloaded:", config.server);
    }
  }
}

// Main demonstration function
async function runTomlDemo() {
  console.log("🚀 Bun TOML Parsing Examples");
  console.log("==============================");

  // 1. Sync TOML loading
  console.log("\n1️⃣ Synchronous TOML Loading:");
  const baseConfig = loadTomlFile("./examples/config/example.toml");
  if (baseConfig) {
    console.log("Base config server:", baseConfig.server);
  }

  // 2. Async TOML loading
  console.log("\n2️⃣ Asynchronous TOML Loading:");
  const asyncConfig = await loadTomlFileAsync("./examples/config/example.toml");
  if (asyncConfig) {
    console.log("Async config server:", asyncConfig.server);
  }

  // 3. Type-safe config loading
  console.log("\n3️⃣ Type-Safe Config Loading:");
  const typedConfig = await ConfigLoader.loadConfig(
    "./examples/config/example.toml"
  );
  if (typedConfig) {
    console.log("Typed config server:", typedConfig.server);
    console.log("Database URL:", typedConfig.database.url);
    console.log("Features:", typedConfig.features);
  }

  // 4. Environment-specific loading
  console.log("\n4️⃣ Environment-Specific Loading:");
  const devConfig = await loadEnvironmentConfig("development");
  const prodConfig = await loadEnvironmentConfig("production");

  if (devConfig) console.log("Dev config:", devConfig.server);
  if (prodConfig) console.log("Prod config:", prodConfig.server);

  // 5. Config merging
  console.log("\n5️⃣ Configuration Merging:");
  const mergedConfig = await mergeConfigs(
    "./examples/config/development.toml",
    "./examples/config/example.toml"
  );
  if (mergedConfig) {
    console.log("Merged config server:", mergedConfig.server);
  }

  // 6. Configuration comparison
  if (devConfig && prodConfig) {
    console.log("\n6️⃣ Configuration Comparison:");
    compareConfigs(devConfig, prodConfig);
  }

  // 7. Hot reload demo
  console.log("\n7️⃣ Hot Reloading:");
  await demonstrateConfigReloading();

  console.log("\n✅ TOML parsing examples completed!");
  console.log(
    "\n📝 Note: Direct TOML imports with `with { type: 'toml' }` are not yet supported in Bun v1.3.6"
  );
  console.log("   Use file reading + parsing approach as shown above.");
}

// Export utilities
export {
  ConfigLoader,
  compareConfigs,
  loadEnvironmentConfig,
  loadTomlFile,
  loadTomlFileAsync,
  mergeConfigs,
  parseToml,
  type AppConfig,
  type DatabaseConfig,
  type FeaturesConfig,
  type ServerConfig,
};

// Run demonstration if executed directly
if (import.meta.main) {
  runTomlDemo().catch(console.error);
}
