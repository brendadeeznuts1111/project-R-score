# TOML Import Examples

This project demonstrates modern TOML import syntax in JavaScript/TypeScript using the `with { type: "toml" }` syntax.

## 🚀 Quick Start

### Static Imports

```typescript
// Import TOML file at the top level
import config from "./config.toml" with { type: "toml" };

// Use the configuration
console.log(config.app.name); // "Enhanced ShortcutRegistry"
console.log(config.app.version); // "1.0.0"
```

### Dynamic Imports

```typescript
// Import TOML file dynamically
const { default: config } = await import("./config.toml", { 
  with: { type: "toml" } 
});

// Use the configuration
console.log(config.unicode.grapheme_clustering.use_intl_segmenter);
```

## 📁 File Structure

```text
shortcut/
├── config.toml              # Main configuration file
├── bunfig.toml             # Bun-specific configuration
├── src/
│   ├── config/
│   │   └── loadConfig.ts    # Configuration loader utilities
│   ├── examples/
│   │   └── toml-import-examples.ts  # Comprehensive examples
│   └── app.ts               # Main application with TOML imports
└── package.json             # Updated with TOML scripts
```

## 🛠️ Available Scripts

```bash
# Run TOML import examples
bun run toml:demo

# Validate configuration
bun run toml:validate

# Run main app with TOML config
bun run toml:app

# Quick config inspection
bun run config:dev
bun run config:prod
```

## 📖 Examples

### 1. Basic Static Import

```typescript
import appConfig from "./config.toml" with { type: "toml" };

function initializeApp() {
  console.log(`🚀 Starting ${appConfig.app.name} v${appConfig.app.version}`);
  
  // Access nested configuration
  const dbConfig = appConfig.database.connection;
  console.log(`🗄️ Database: ${dbConfig.type} at ${dbConfig.path}`);
}
```

### 2. Dynamic Import with Error Handling

```typescript
async function loadConfig(configPath: string = "./config.toml") {
  try {
    const { default: config } = await import(configPath, { 
      with: { type: "toml" } 
    });
    return config;
  } catch (error) {
    console.error(`Failed to load config from ${configPath}:`, error);
    throw new Error(`Configuration loading failed: ${error}`);
  }
}
```

### 3. Environment-Specific Configuration

```typescript
async function loadEnvironmentConfig(env: 'development' | 'production' | 'testing') {
  const configPath = `./config.${env}.toml`;
  
  try {
    const { default: config } = await import(configPath, { 
      with: { type: "toml" } 
    });
    return config;
  } catch (error) {
    console.warn(`Environment config ${configPath} not found, falling back to default`);
    return loadConfig(); // Fallback to default config
  }
}
```

### 4. Configuration Manager Class

```typescript
class ConfigManager {
  private config: any = null;
  
  async loadConfig(): Promise<any> {
    if (!this.config) {
      const { default: config } = await import("./config.toml", { 
        with: { type: "toml" } 
      });
      this.config = config;
    }
    return this.config;
  }
  
  getSection(section: string): any {
    return this.config?.[section];
  }
}
```

### 5. Hot Configuration Reloading

```typescript
class HotConfigReloader {
  private config: any = null;
  private watchers = new Set<Function>();
  
  async reloadConfig(): Promise<void> {
    const newConfig = await import("./config.toml", { 
      with: { type: "toml" } 
    });
    
    if (JSON.stringify(this.config) !== JSON.stringify(newConfig.default)) {
      this.config = newConfig.default;
      this.notifyWatchers();
    }
  }
  
  watchConfig(callback: (config: any) => void): () => void {
    this.watchers.add(callback);
    return () => this.watchers.delete(callback);
  }
}
```

## 🏗️ Configuration Structure

### Main Config (`config.toml`)

```toml
[app]
name = "Enhanced ShortcutRegistry"
version = "1.0.0"
description = "Advanced shortcut management with Unicode support"

[unicode.grapheme_clustering]
use_intl_segmenter = true
enable_fallback = true
cache_size = 1000

[profiles.hierarchy]
max_depth = 10
seed_range = { min = 1000, max = 9999 }
auto_inherit = true
```

### Bun Config (`bunfig.toml`)

```toml
[serve.static]
plugins = ["bun-plugin-tailwind"]
env = "BUN_PUBLIC_*"

[build]
entry_points = ["src/app.js"]
outdir = "dist"
minify = true
```

## 🔧 Advanced Features

### Type Safety

```typescript
// Define TypeScript interfaces for your TOML structure
interface AppConfig {
  app: {
    name: string;
    version: string;
    description: string;
  };
  unicode: {
    grapheme_clustering: {
      use_intl_segmenter: boolean;
      enable_fallback: boolean;
    };
  };
}

// Use with type assertion
const { default: config } = await import("./config.toml", { 
  with: { type: "toml" } 
}) as { default: AppConfig };
```

### Configuration Validation

```typescript
function validateConfig(config: AppConfig): boolean {
  const required = ['app.name', 'app.version', 'unicode.grapheme_clustering'];
  
  for (const path of required) {
    const value = getNestedValue(config, path);
    if (!value) {
      console.error(`Required configuration missing: ${path}`);
      return false;
    }
  }
  
  return true;
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}
```

### Environment Variables Integration

```typescript
// Load environment-specific overrides
async function loadConfigWithEnv(): Promise<AppConfig> {
  const env = import.meta.env?.NODE_ENV || 'development';
  
  const { default: baseConfig } = await import("./config.toml", { 
    with: { type: "toml" } 
  });
  
  try {
    const { default: envConfig } = await import(`./config.${env}.toml`, { 
      with: { type: "toml" } 
    });
    
    // Merge configurations
    return { ...baseConfig, ...envConfig };
  } catch {
    return baseConfig;
  }
}
```

## 🎯 Best Practices

### 1. Error Handling

Always wrap TOML imports in try-catch blocks:

```typescript
async function safeLoadConfig(path: string) {
  try {
    const { default: config } = await import(path, { 
      with: { type: "toml" } 
    });
    return { success: true, config };
  } catch (error) {
    return { success: false, error };
  }
}
```

### 2. Configuration Caching

Cache loaded configurations to avoid repeated imports:

```typescript
class ConfigCache {
  private cache = new Map<string, any>();
  
  async load(path: string): Promise<any> {
    if (this.cache.has(path)) {
      return this.cache.get(path);
    }
    
    const { default: config } = await import(path, { 
      with: { type: "toml" } 
    });
    
    this.cache.set(path, config);
    return config;
  }
}
```

### 3. Type Safety

Always define TypeScript interfaces for your TOML structure:

```typescript
interface DatabaseConfig {
  connection: {
    type: string;
    path: string;
    max_connections: number;
  };
  migrations: {
    auto_migrate: boolean;
    backup_enabled: boolean;
  };
}
```

### 4. Environment-Specific Configs

Use separate TOML files for different environments:

```text
config.toml           # Default configuration
config.development.toml  # Development overrides
config.production.toml   # Production settings
config.testing.toml      # Test environment
```

## 🔍 Debugging

### Check Configuration Loading

```bash
# View loaded configuration
bun run config:dev

# Test production config with fallback
bun run config:prod
```

### Common Issues

1. **Import Errors**: Ensure TOML files exist and are properly formatted
2. **Type Errors**: Define proper TypeScript interfaces
3. **Path Issues**: Use relative paths from the importing file
4. **Environment Variables**: Check `import.meta.env` availability

## 📚 Additional Resources

- [Bun TOML Support](https://bun.sh/docs/configuration/toml)
- [TOML Specification](https://toml.io/en/)
- [TypeScript Configuration](https://www.typescriptlang.org/docs/handbook/compiler-options.html)

## 🤝 Contributing

1. Create new TOML configuration examples
2. Add more import patterns
3. Improve error handling
4. Add comprehensive tests

## 📄 License

MIT License - see LICENSE file for details.
