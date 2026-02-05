# Bun TOML Import Guide

## Current Status (Bun v1.3.6)

**Important Note**: Direct TOML imports using `with { type: "toml" }` syntax are **not yet supported** in Bun v1.3.6. This feature is planned for future releases but is currently not available.

## Working Solutions

### 1. File Reading + Custom Parser

The most reliable approach is to read TOML files and parse them manually or use a TOML parsing library.

```typescript
import { readFileSync } from "fs";
import { Bun } from "bun";

// Simple TOML parser implementation
function parseToml(content: string): any {
  const result: any = {};
  const lines = content.split('\n');
  let currentSection: any = result;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Section headers
    const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      const sectionPath = sectionMatch[1].split('.');
      currentSection = result;

      for (const section of sectionPath) {
        if (!currentSection[section]) {
          currentSection[section] = {};
        }
        currentSection = currentSection[section];
      }
      continue;
    }

    // Key-value pairs
    const keyValueMatch = trimmed.match(/^([^=]+)=(.*)$/);
    if (keyValueMatch) {
      const key = keyValueMatch[1].trim();
      let value = keyValueMatch[2].trim();

      // Parse different data types
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1); // Remove quotes
      } else if (value === 'true') {
        value = true;
      } else if (value === 'false') {
        value = false;
      } else if (!isNaN(Number(value))) {
        value = Number(value);
      }

      currentSection[key] = value;
    }
  }

  return result;
}

// Load TOML file synchronously
function loadTomlFile(filePath: string): any {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return parseToml(content);
  } catch (error) {
    console.error(`Failed to load TOML file ${filePath}:`, error);
    return null;
  }
}

// Load TOML file asynchronously
async function loadTomlFileAsync(filePath: string): Promise<any> {
  try {
    const file = Bun.file(filePath);
    const content = await file.text();
    return parseToml(content);
  } catch (error) {
    console.error(`Failed to load TOML file ${filePath}:`, error);
    return null;
  }
}
```

### 2. Type-Safe Configuration Management

```typescript
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
}

class ConfigLoader {
  private static cache = new Map<string, AppConfig>();

  static async loadConfig(filePath: string): Promise<AppConfig | null> {
    if (this.cache.has(filePath)) {
      return this.cache.get(filePath)!;
    }

    const config = await loadTomlFileAsync(filePath);

    if (!config || !this.validateConfig(config)) {
      return null;
    }

    const typedConfig = config as AppConfig;
    this.cache.set(filePath, typedConfig);
    return typedConfig;
  }

  static validateConfig(config: any): config is AppConfig {
    return (
      config &&
      typeof config.server === 'object' &&
      typeof config.server.host === 'string' &&
      typeof config.server.port === 'number' &&
      config.server.port > 0 && config.server.port < 65536 &&
      typeof config.server.ssl === 'boolean' &&
      typeof config.database === 'object' &&
      typeof config.database.url === 'string' &&
      typeof config.database.pool_size === 'number' &&
      typeof config.features === 'object' &&
      typeof config.features.auth === 'boolean'
    );
  }
}
```

### 3. Environment-Specific Configuration

```typescript
async function loadEnvironmentConfig(env: string): Promise<AppConfig | null> {
  const configPath = `./config/${env}.toml`;
  let config = await ConfigLoader.loadConfig(configPath);

  if (!config) {
    console.warn(`Failed to load ${env} config, trying fallback...`);
    config = await ConfigLoader.loadConfig('./config/default.toml');
  }

  return config;
}

// Usage examples
const devConfig = await loadEnvironmentConfig("development");
const prodConfig = await loadEnvironmentConfig("production");
```

### 4. Configuration Merging

```typescript
async function mergeConfigs(...configPaths: string[]): Promise<AppConfig | null> {
  const merged: Partial<AppConfig> = {};

  for (const path of configPaths) {
    const config = await ConfigLoader.loadConfig(path);
    if (config) {
      Object.assign(merged, config);
    }
  }

  return merged as AppConfig || null;
}

// Usage
const mergedConfig = await mergeConfigs(
  "./config/base.toml",
  "./config/development.toml"
);
```

## Example TOML Files

### `config/development.toml`
```toml
[server]
host = "127.0.0.1"
port = 3001
ssl = false
workers = 1

[database]
url = "postgresql://dev:dev@localhost:5432/mydb_dev"
pool_size = 5
timeout = 10
retry_attempts = 1

[features]
auth = false
logging = true
monitoring = false
caching = false
```

### `config/production.toml`

```toml
[server]
host = "0.0.0.0"
port = 443
ssl = true
workers = 8

[database]
url = "postgresql://prod_user:secure_password@db.internal:5432/mydb_prod"
pool_size = 50
timeout = 60
retry_attempts = 5

[features]
auth = true
logging = true
monitoring = true
caching = true
```

## Advanced Features

### Hot Reloading

```typescript
class ConfigManager {
  private watchers = new Map<string, () => void>();

  async watchConfig(filePath: string, callback: (config: AppConfig) => void) {
    const initialConfig = await ConfigLoader.loadConfig(filePath);
    if (initialConfig) {
      callback(initialConfig);
    }

    // File watching would go here when Bun supports it
    // For now, manual reloading is required
  }
}
```

### Configuration Validation

```typescript
function validateServerConfig(config: ServerConfig): boolean {
  return (
    typeof config.host === 'string' &&
    typeof config.port === 'number' &&
    config.port > 0 && config.port < 65536 &&
    typeof config.ssl === 'boolean'
  );
}
```

## Alternative: External TOML Libraries

For more robust TOML parsing, you can use external libraries:

```bash
bun add @iarna/toml
```

```typescript
import TOML from '@iarna/toml';

async function loadTomlWithLibrary(filePath: string): Promise<any> {
  const content = await Bun.file(filePath).text();
  return TOML.parse(content);
}
```

## Future Support

When Bun adds native TOML import support, the syntax will likely be:

```typescript
// This syntax is NOT YET SUPPORTED
import config from "./config/app.toml" with { type: "toml" };

// Dynamic import
const { default: config } = await import("./config/app.toml", {
  with: { type: "toml" }
});
```

## Best Practices

1. **Use TypeScript interfaces** for type safety
2. **Implement validation** for all configuration values
3. **Cache configurations** to avoid repeated file reads
4. **Use environment-specific configs** for different deployment stages
5. **Provide fallbacks** for missing configuration files
6. **Document your schema** for team collaboration

## Complete Example

See `examples/toml-parsing-example.ts` for a complete, working demonstration of TOML configuration management in Bun v1.3.6.
