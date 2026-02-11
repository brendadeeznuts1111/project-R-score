// lib/rip/index.ts — Core code analysis and transmutation engine

import { file } from 'bun';
import { parse as parseYaml } from 'yaml';

// ============================================================================
// CORE TYPES & INTERFACES
// ============================================================================

export interface RipgrepConfig {
  schema: {
    scope: string[];
    type: string[];
    variant: string[];
    hash_algo: string;
    id_pattern: string;
    ai_prefix: string;
  };
  defaults: {
    scope: string;
    type: string;
    version: string;
    status: string;
  };
  grep: {
    all_tags: string;
    rg_flags: string;
    validate: {
      hooks: string[];
    };
  };
}

export interface PurgeParams {
  scope?: string;
  type?: string;
  pattern?: string;
  autoApprove?: boolean;
  dryRun?: boolean;
}

export interface PurgeResult {
  id: string;
  signature: string;
  grepable: string;
  contentHash: string;
  results: string[];
  timestamp: number;
}

// ============================================================================
// CORE RIPGREP ENGINE
// ============================================================================

export class RipgrepEngine {
  private config: RipgrepConfig;

  constructor(configPath: string = 'bun.yaml') {
    this.config = this.loadConfig(configPath);
  }

  private configPromise: Promise<RipgrepConfig>;

  /**
   * Load configuration from YAML file (async, lazy-init)
   */
  private loadConfig(configPath: string): RipgrepConfig {
    const defaults = this.getDefaultConfig();
    // Kick off async config load; callers that need the resolved config
    // should await ensureConfig().
    this.configPromise = (async () => {
      try {
        const configText = await file(configPath).text();
        return this.parseConfig(configText);
      } catch (error) {
        console.warn(`⚠️  Could not load config from ${configPath}, using defaults`);
        return defaults;
      }
    })();
    return defaults;
  }

  /**
   * Await the async config load (call from any async method that needs config)
   */
  async ensureConfig(): Promise<RipgrepConfig> {
    this.config = await this.configPromise;
    return this.config;
  }

  /**
   * Parse YAML configuration into RipgrepConfig
   */
  private parseConfig(yamlText: string): RipgrepConfig {
    const defaults = this.getDefaultConfig();
    try {
      const raw = parseYaml(yamlText) as Record<string, any> | null;
      if (!raw || typeof raw !== 'object') return defaults;

      return {
        schema: {
          scope: raw.schema?.scope ?? defaults.schema.scope,
          type: raw.schema?.type ?? defaults.schema.type,
          variant: raw.schema?.variant ?? defaults.schema.variant,
          hash_algo: raw.schema?.['hash-algo'] ?? raw.schema?.hash_algo ?? defaults.schema.hash_algo,
          id_pattern: raw.schema?.['id-pattern'] ?? raw.schema?.id_pattern ?? defaults.schema.id_pattern,
          ai_prefix: raw.schema?.['ai-prefix'] ?? raw.schema?.ai_prefix ?? defaults.schema.ai_prefix,
        },
        defaults: {
          scope: raw.defaults?.scope ?? defaults.defaults.scope,
          type: raw.defaults?.type ?? defaults.defaults.type,
          version: raw.defaults?.version ?? defaults.defaults.version,
          status: raw.defaults?.status ?? defaults.defaults.status,
        },
        grep: {
          all_tags: raw.grep?.['all-tags'] ?? raw.grep?.all_tags ?? defaults.grep.all_tags,
          rg_flags: raw.grep?.['rg-flags'] ?? raw.grep?.rg_flags ?? defaults.grep.rg_flags,
          validate: {
            hooks: raw.grep?.validate?.hooks ?? defaults.grep.validate.hooks,
          },
        },
      };
    } catch {
      return defaults;
    }
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): RipgrepConfig {
    return {
      schema: {
        scope: ['FACTORY', 'LINK', 'CODE', 'BUN', 'PURGE', 'AI'],
        type: ['SCAN', 'VALIDATE', 'FIX', 'TRANSMUTE', 'OPTIMIZE', 'AGENT'],
        variant: ['EXPANDED', 'THREAD', 'DASHBOARD', 'COMPRESSED'],
        hash_algo: 'SHA-256',
        id_pattern: '^[A-Z]{3}-RIP-[0-9]{3}$',
        ai_prefix: 'PUR_',
      },
      defaults: {
        scope: 'FACTORY',
        type: 'SCAN',
        version: 'v4.0',
        status: 'ACTIVE',
      },
      grep: {
        all_tags:
          '\\[([A-Z]+)-([A-Z]+)-([A-Z]+)-([A-Z]{3}-RIP-[0-9]{3})-([vV][0-9]+\\.[0-9]+)-\\[([A-Z]+)\\]-([a-f0-9]{64})\\]',
        rg_flags: '--type js --mmap --pcre2-unicode --hyper-accurate',
        validate: {
          hooks: ['parallel-purge', 'link-verify', 'ai-transmute'],
        },
      },
    };
  }

  /**
   * Generate SHA-256 hash
   */
  private async generateHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Validate parameters against schema
   */
  private validateParams(params: PurgeParams): void {
    const { scope = this.config.defaults.scope } = params;

    if (!this.config.schema.scope.includes(scope)) {
      throw new Error(
        `❌ Invalid scope: ${scope}. Must be one of: ${this.config.schema.scope.join(', ')}`
      );
    }
  }

  /**
   * Generate unique purge ID
   */
  private generateId(type: string): string {
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `FACTORY-${type.toUpperCase()}-${random}`;
  }

  /**
   * Execute ripgrep purge with signature generation
   */
  async purgeRipgrep(params: PurgeParams = {}): Promise<PurgeResult> {
    this.validateParams(params);

    const {
      scope = this.config.defaults.scope,
      type = this.config.defaults.type,
      pattern = '',
    } = params;

    const id = this.generateId(type);
    const version = this.config.defaults.version;
    const status = this.config.defaults.status;

    // Generate base signature
    const baseSignature = `[${scope}][${type}][${id}][${version}][${status}]`;
    const contentHash = await this.generateHash(baseSignature + Date.now().toString());
    const hashSignature = `[${contentHash.substring(0, 64)}]`;

    const readable = `${baseSignature}${hashSignature}`;
    const grepable = `[${scope.toLowerCase()}-${type.toLowerCase()}-${id.toLowerCase()}-${version.toLowerCase()}-${status.toLowerCase()}-${contentHash.substring(0, 8)}]`;

    return {
      id,
      signature: readable,
      grepable,
      contentHash,
      results: [`Pattern: ${pattern}`, `Scope: ${scope}`, `Type: ${type}`],
      timestamp: Date.now(),
    };
  }

  /**
   * Scan for broken links
   */
  async scanBrokenLinks(directory: string = '.'): Promise<string[]> {
    const { spawn } = await import('bun');

    try {
      const result = await spawn(
        ['rg', '--type', 'js', '--no-heading', 'https?://[^\\s\\)\\]\\}>]+', directory],
        {
          stdout: 'pipe',
        }
      );

      const text = await new Response(result.stdout).text();
      return text.split('\n').filter(line => line.trim());
    } catch (error) {
      console.error('❌ Failed to scan for broken links:', error);
      return [];
    }
  }

  /**
   * Scan for non-Bun code patterns
   */
  async scanNonBunCode(directory: string = '.'): Promise<string[]> {
    const { spawn } = await import('bun');

    try {
      const result = await spawn(
        [
          'rg',
          '--type',
          'js',
          '--no-heading',
          'require\\(|module\\.exports|fs\\.|child_process',
          directory,
        ],
        {
          stdout: 'pipe',
        }
      );

      const text = await new Response(result.stdout).text();
      return text.split('\n').filter(line => line.trim());
    } catch (error) {
      console.error('❌ Failed to scan for non-Bun code:', error);
      return [];
    }
  }

  /**
   * Get configuration
   */
  getConfig(): RipgrepConfig {
    return this.config;
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create new RIPGREP engine instance
 */
export function createRipgrepEngine(configPath?: string): RipgrepEngine {
  return new RipgrepEngine(configPath);
}

/**
 * Quick purge function for common use cases
 */
export async function quickPurge(pattern: string, scope = 'FACTORY'): Promise<PurgeResult> {
  const engine = createRipgrepEngine();
  return await engine.purgeRipgrep({ pattern, scope, type: 'PURGE' });
}

// ============================================================================
// EXPORTS
// ============================================================================

export default RipgrepEngine;
