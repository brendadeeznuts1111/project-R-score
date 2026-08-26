#!/usr/bin/env bun
/**
 * ⚙️ Registry Configuration Loader
 * 
 * Supports JSON, JSON5, and JSONL config files (Bun v1.3.7+)
 */

import type { RegistryConfig } from '@factorywager/registry-core/types';
import {
  FACTORY_WAGER_NPM_READ_URL,
  parseLocalRegistryWriteUrl,
  resolveRegistryReadUrl,
} from '../../../src/registry-planes';

type RegistryConfigInput = Partial<RegistryConfig> & { url?: unknown };

function styled(text: string, _style: string): string {
  return text;
}

function parseConfigInput(value: unknown): RegistryConfigInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Registry config must be an object');
  }
  return value as RegistryConfigInput;
}

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
    
    if (!await file.exists()) {
      return getDefaultConfig();
    }

    const content = await file.text();
    const ext = configPath.split('.').pop()?.toLowerCase();

    let rawConfig: unknown;

    switch (ext) {
      case 'json5':
        // Bun v1.3.7: Native JSON5 support
        rawConfig = Bun.JSON5.parse(content);
        console.info(styled(`📄 Loaded JSON5 config: ${configPath}`, 'success'));
        break;
      
      case 'jsonl':
        // Bun v1.3.7: Native JSONL support
        const lines = Bun.JSONL.parse(content);
        // Use last line as config (for incremental updates)
        rawConfig = lines[lines.length - 1] || {};
        console.info(styled(`📄 Loaded JSONL config: ${configPath} (${lines.length} entries)`, 'success'));
        break;
      
      case 'json':
      default:
        rawConfig = JSON.parse(content);
        console.info(styled(`📄 Loaded JSON config: ${configPath}`, 'success'));
        break;
    }

    return mergeWithDefaults(parseConfigInput(rawConfig));
  } catch (error) {
    console.error(styled(`❌ Failed to load config: ${error.message}`, 'error'));
    return null;
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
    './registry.config.json5',  // Bun v1.3.7: JSON5 preferred
    './registry.config.json',
    './config/registry.config.json5',
    './config/registry.config.json',
    process.env.REGISTRY_CONFIG_PATH,
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
export function getDefaultConfig(): RegistryConfig {
  return {
    name: 'FactoryWager Private Registry',
    readUrl: FACTORY_WAGER_NPM_READ_URL,
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
export function mergeWithDefaults(
  config: RegistryConfigInput,
  warn: (message: string) => void = console.warn
): RegistryConfig {
  const defaults = getDefaultConfig();
  const { url: legacyUrl, ...planeConfig } = config;
  if (legacyUrl !== undefined) {
    warn(
      'Legacy config.url is ambiguous and was ignored; use readUrl or localWriteUrl explicitly'
    );
  }
  const readUrl = resolveRegistryReadUrl({
    explicit: planeConfig.readUrl,
    env: {},
    warn,
  });
  const localWriteUrl =
    planeConfig.localWriteUrl === undefined
      ? undefined
      : parseLocalRegistryWriteUrl(planeConfig.localWriteUrl);
  
  return {
    ...defaults,
    ...planeConfig,
    readUrl,
    ...(localWriteUrl ? { localWriteUrl } : {}),
    storage: { ...defaults.storage, ...planeConfig.storage },
    cdn: { ...defaults.cdn, ...planeConfig.cdn },
    auth: { ...defaults.auth, ...planeConfig.auth },
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

  try {
    resolveRegistryReadUrl({ explicit: config.readUrl, env: {}, warn: () => {} });
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Registry read URL is invalid');
  }

  if (config.localWriteUrl !== undefined) {
    try {
      parseLocalRegistryWriteUrl(config.localWriteUrl);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Local registry write URL is invalid');
    }
  }

  if (config.storage?.type === 'r2') {
    if (!config.storage.bucket) {
      errors.push('R2 bucket name is required');
    }
  }

  if (config.auth?.type === 'jwt' && !config.auth.jwtSecret) {
    // Warning only - can use env var
    console.info(styled('⚠️ JWT secret not in config, will use REGISTRY_SECRET env var', 'warning'));
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
  
  // Public FactoryWager metadata read plane (GET/HEAD only, no credentials)
  readUrl: "https://registry.factory-wager.com/api/npm",

  // Optional development write gateway (HTTP loopback only)
  localWriteUrl: "http://localhost:4873",
  
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
