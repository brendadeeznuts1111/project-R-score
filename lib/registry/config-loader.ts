// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/file-io — Bun.write
// @see https://bun.com/docs/runtime/environment-variables — Bun.env
// lib/registry/config-loader.ts — Registry configuration loader for JSON, JSON5, and JSONL

import { styled } from '../theme/colors';
import type { RegistryConfig } from './registry-types';

export interface ConfigLoadOptions {
  path?: string;
  env?: string;
}

/**
 * Load registry configuration from file
 * Supports: .json, .json5, .jsonl (Bun v1.3.7+)
 */
export async function loadRegistryConfig(
  options: ConfigLoadOptions = {}
): Promise<RegistryConfig | null> {
  const configPath = options.path || findConfigFile();

  if (!configPath) {
    console.info(styled('ℹ️ No config file found, using defaults', 'muted'));
    return getDefaultConfig();
  }

  try {
    const file = Bun.file(configPath);

    if (!(await file.exists())) {
      return getDefaultConfig();
    }

    const content = await file.text();
    const ext = configPath.split('.').pop()?.toLowerCase();

    let config: Partial<RegistryConfig>;

    switch (ext) {
      case 'json5':
        // Bun v1.3.7: Native JSON5 support
        config = Bun.JSON5.parse(content);
        console.info(styled(`📄 Loaded JSON5 config: ${configPath}`, 'success'));
        break;

      case 'jsonl':
        // Bun v1.3.7: Native JSONL support
        const lines = Bun.JSONL.parse(content);
        // Use last line as config (for incremental updates)
        config = lines[lines.length - 1] || {};
        console.info(
          styled(`📄 Loaded JSONL config: ${configPath} (${lines.length} entries)`, 'success')
        );
        break;

      case 'json':
      default:
        config = JSON.parse(content);
        console.info(styled(`📄 Loaded JSON config: ${configPath}`, 'success'));
        break;
    }

    return mergeWithDefaults(config);
  } catch (error) {
    console.error(styled(`❌ Failed to load config: ${error.message}`, 'error'));
    return getDefaultConfig();
  }
}

/**
 * Save registry configuration
 * Supports JSON5 for human-readable configs with comments
 */
export async function saveRegistryConfig(
  config: RegistryConfig,
  options: ConfigLoadOptions = {}
): Promise<boolean> {
  const configPath = options.path || './registry.config.json5';
  const ext = configPath.split('.').pop()?.toLowerCase();

  try {
    let content: string;

    if (ext === 'json5') {
      // Bun v1.3.7: JSON5 stringify
      // Note: Bun.JSON5.stringify may not support options parameter
      content = Bun.JSON5.stringify(config, null, 2);

      // Add header comment
      content = `// FactoryWager Registry Configuration
// Generated: ${new Date().toISOString()}
// Docs: https://docs.factory-wager.com/registry/config

${content}`;
    } else if (ext === 'jsonl') {
      // JSONL: One JSON object per line
      content = JSON.stringify(config);
    } else {
      content = JSON.stringify(config, null, 2);
    }

    await Bun.write(configPath, content);
    console.info(styled(`💾 Saved config: ${configPath}`, 'success'));
    return true;
  } catch (error) {
    console.error(styled(`❌ Failed to save config: ${error.message}`, 'error'));
    return false;
  }
}

/**
 * Find config file in standard locations
 */
function findConfigFile(): string | null {
  const candidates = [
    './registry.config.json5', // Bun v1.3.7: JSON5 preferred
    './registry.config.json',
    './config/registry.config.json5',
    './config/registry.config.json',
    Bun.env.REGISTRY_CONFIG_PATH,
  ].filter(Boolean) as string[];

  for (const path of candidates) {
    try {
      const file = Bun.file(path);
      if (file.size > 0) {
        return path;
      }
    } catch {
      // Continue to next candidate
    }
  }

  return null;
}

/**
 * Get default configuration
 */
function getDefaultConfig(): RegistryConfig {
  return {
    name: 'FactoryWager Private Registry',
    url: 'https://registry.factory-wager.com',
    storage: {
      type: 'r2',
      bucket: 'npm-registry',
      prefix: 'packages/',
    },
    cdn: {
      enabled: true,
      url: 'https://registry.factory-wager.com',
      signedUrls: false,
      expirySeconds: 3600,
    },
    auth: {
      type: 'jwt',
      tokenExpiry: '7d',
    },
    packages: [
      {
        pattern: '@factorywager/*',
        access: 'authenticated',
        publish: ['admin', 'developer'],
      },
      {
        pattern: '*',
        access: 'all',
      },
    ],
  };
}

/**
 * Merge config with defaults
 */
function mergeWithDefaults(config: Partial<RegistryConfig>): RegistryConfig {
  const defaults = getDefaultConfig();

  return {
    ...defaults,
    ...config,
    storage: { ...defaults.storage, ...config.storage },
    cdn: { ...defaults.cdn, ...config.cdn },
    auth: { ...defaults.auth, ...config.auth },
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: RegistryConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.name) {
    errors.push('Registry name is required');
  }

  if (!config.url) {
    errors.push('Registry URL is required');
  }

  if (config.storage?.type === 'r2') {
    if (!config.storage.bucket) {
      errors.push('R2 bucket name is required');
    }
  }

  if (config.auth?.type === 'jwt' && !config.auth.jwtSecret) {
    // Warning only - can use env var
    console.info(
      styled('⚠️ JWT secret not in config, will use REGISTRY_SECRET env var', 'warning')
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0];

  console.info(styled('⚙️ Registry Config Loader (Bun v1.3.7+)', 'accent'));
  console.info(styled('=======================================', 'accent'));

  switch (command) {
    case 'load': {
      const path = args[1];
      const config = await loadRegistryConfig({ path });

      if (config) {
        console.info(styled('\n📋 Configuration:', 'info'));
        console.info(styled(JSON.stringify(config, null, 2), 'muted'));

        const validation = validateConfig(config);
        if (!validation.valid) {
          console.info(styled('\n❌ Validation errors:', 'error'));
          validation.errors.forEach(e => console.info(styled(`  - ${e}`, 'error')));
        }
      }
      break;
    }

    case 'save': {
      const path = args[1] || './registry.config.json5';
      const config = getDefaultConfig();
      config.name = args[2] || config.name;

      await saveRegistryConfig(config, { path });
      break;
    }

    case 'init': {
      const path = args[1] || './registry.config.json5';

      // JSON5 example with comments
      const example = `// FactoryWager Registry Configuration
// Bun v1.3.7+: Supports JSON5 with comments and trailing commas

{
  // Registry name
  name: "My Private Registry",

  // Public URL
  url: "https://npm.mycompany.com",

  // R2 Storage configuration
  storage: {
    type: "r2",
    bucket: "npm-registry",
    prefix: "packages/",
    // Bun v1.3.7: Optional compression
    // compression: "gzip", // or "br", "deflate"
  },

  // CDN configuration
  cdn: {
    enabled: true,
    url: "https://npm.mycompany.com",
    signedUrls: false,
    expirySeconds: 3600,
  },

  // Authentication
  auth: {
    type: "jwt", // "none", "basic", "token", "jwt"
    tokenExpiry: "7d",
  },

  // Package access rules
  packages: [
    {
      pattern: "@mycompany/*",
      access: "authenticated",
      publish: ["admin", "developer"],
    },
    {
      pattern: "*",
      access: "all", // Public access for proxy
    },
  ],
}
`;

      await Bun.write(path, example);
      console.info(styled(`✅ Created ${path}`, 'success'));
      break;
    }

    default:
      console.info(styled('\nCommands:', 'info'));
      console.info(styled('  load [path]        Load and validate config', 'muted'));
      console.info(styled('  save [path] [name] Save config', 'muted'));
      console.info(styled('  init [path]        Create example JSON5 config', 'muted'));
      console.info(styled('\nBun v1.3.7+ Features:', 'info'));
      console.info(styled('  • JSON5 support (comments, trailing commas)', 'muted'));
      console.info(styled('  • JSONL support (streaming config updates)', 'muted'));
  }
}
