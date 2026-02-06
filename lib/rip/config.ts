/**
 * FACTORYWAGER RIPGREP v4.0 - Configuration Management
 * 
 * Configuration schemas and validation for the RIPGREP system
 */

// ============================================================================
// CONFIGURATION SCHEMAS
// ============================================================================

export interface RipgrepSchema {
  scope: string[];
  type: string[];
  variant: string[];
  hash_algo: string;
  id_pattern: string;
  ai_prefix: string;
}

export interface RipgrepDefaults {
  scope: string;
  type: string;
  version: string;
  status: string;
}

export interface RipgrepGrepConfig {
  all_tags: string;
  rg_flags: string;
  validate: {
    hooks: string[];
  };
}

export interface RipgrepFullConfig {
  rules: {
    ripgrep: {
      schema: RipgrepSchema;
      defaults: RipgrepDefaults;
      grep: RipgrepGrepConfig;
    };
  };
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

export const DEFAULT_SCHEMA: RipgrepSchema = {
  scope: ['FACTORY', 'LINK', 'CODE', 'BUN', 'PURGE', 'AI'],
  type: ['SCAN', 'VALIDATE', 'FIX', 'TRANSMUTE', 'OPTIMIZE', 'AGENT'],
  variant: ['EXPANDED', 'THREAD', 'DASHBOARD', 'COMPRESSED'],
  hash_algo: 'SHA-256',
  id_pattern: '^[A-Z]{3}-RIP-[0-9]{3}$',
  ai_prefix: 'PUR_'
};

export const DEFAULT_DEFAULTS: RipgrepDefaults = {
  scope: 'FACTORY',
  type: 'SCAN',
  version: 'v4.0',
  status: 'ACTIVE'
};

export const DEFAULT_GREP_CONFIG: RipgrepGrepConfig = {
  all_tags: '\\[([A-Z]+)-([A-Z]+)-([A-Z]+)-([A-Z]{3}-RIP-[0-9]{3})-([vV][0-9]+\\.[0-9]+)-\\[([A-Z]+)\\]-([a-f0-9]{64})\\]',
  rg_flags: '--type js --mmap --pcre2-unicode --hyper-accurate',
  validate: {
    hooks: ['parallel-purge', 'link-verify', 'ai-transmute']
  }
};

export const DEFAULT_CONFIG: RipgrepFullConfig = {
  rules: {
    ripgrep: {
      schema: DEFAULT_SCHEMA,
      defaults: DEFAULT_DEFAULTS,
      grep: DEFAULT_GREP_CONFIG
    }
  }
};

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

export const PRESET_CONFIGS = {
  // Development configuration - more permissive
  DEVELOPMENT: {
    ...DEFAULT_CONFIG,
    rules: {
      ...DEFAULT_CONFIG.rules,
      ripgrep: {
        ...DEFAULT_CONFIG.rules.ripgrep,
        defaults: {
          ...DEFAULT_CONFIG.rules.ripgrep.defaults,
          scope: 'CODE',
          status: 'DEVELOPMENT'
        },
        grep: {
          ...DEFAULT_CONFIG.rules.ripgrep.grep,
          rg_flags: '--type js --type ts --type jsx --type tsx --mmap'
        }
      }
    }
  },

  // Production configuration - strict validation
  PRODUCTION: {
    ...DEFAULT_CONFIG,
    rules: {
      ...DEFAULT_CONFIG.rules,
      ripgrep: {
        ...DEFAULT_CONFIG.rules.ripgrep,
        defaults: {
          ...DEFAULT_CONFIG.rules.ripgrep.defaults,
          scope: 'FACTORY',
          status: 'PRODUCTION'
        },
        grep: {
          ...DEFAULT_CONFIG.rules.ripgrep.grep,
          rg_flags: '--type js --type ts --type jsx --type tsx --mmap --pcre2-unicode --case-sensitive'
        },
        validate: {
          hooks: ['parallel-purge', 'link-verify', 'ai-transmute', 'security-scan', 'performance-check']
        }
      }
    }
  },

  // Security-focused configuration
  SECURITY: {
    ...DEFAULT_CONFIG,
    rules: {
      ...DEFAULT_CONFIG.rules,
      ripgrep: {
        ...DEFAULT_CONFIG.rules.ripgrep,
        defaults: {
          ...DEFAULT_CONFIG.rules.ripgrep.defaults,
          scope: 'PURGE',
          status: 'SECURITY_AUDIT'
        },
        validate: {
          hooks: ['parallel-purge', 'link-verify', 'security-scan', 'vulnerability-check']
        }
      }
    }
  }
} as const;

// ============================================================================
// CONFIGURATION VALIDATION
// ============================================================================

export class ConfigValidator {
  /**
   * Validate configuration schema
   */
  static validateSchema(config: RipgrepSchema): string[] {
    const errors: string[] = [];

    if (!Array.isArray(config.scope) || config.scope.length === 0) {
      errors.push('Schema scope must be a non-empty array');
    }

    if (!Array.isArray(config.type) || config.type.length === 0) {
      errors.push('Schema type must be a non-empty array');
    }

    if (!Array.isArray(config.variant) || config.variant.length === 0) {
      errors.push('Schema variant must be a non-empty array');
    }

    if (typeof config.hash_algo !== 'string' || config.hash_algo.trim() === '') {
      errors.push('Schema hash_algo must be a non-empty string');
    }

    if (typeof config.id_pattern !== 'string' || config.id_pattern.trim() === '') {
      errors.push('Schema id_pattern must be a non-empty string');
    }

    try {
      new RegExp(config.id_pattern);
    } catch (error) {
      errors.push('Schema id_pattern must be a valid regex');
    }

    return errors;
  }

  /**
   * Validate defaults configuration
   */
  static validateDefaults(defaults: RipgrepDefaults, schema: RipgrepSchema): string[] {
    const errors: string[] = [];

    if (!schema.scope.includes(defaults.scope)) {
      errors.push(`Default scope '${defaults.scope}' not found in schema scope array`);
    }

    if (!schema.type.includes(defaults.type)) {
      errors.push(`Default type '${defaults.type}' not found in schema type array`);
    }

    if (typeof defaults.version !== 'string' || defaults.version.trim() === '') {
      errors.push('Default version must be a non-empty string');
    }

    if (typeof defaults.status !== 'string' || defaults.status.trim() === '') {
      errors.push('Default status must be a non-empty string');
    }

    return errors;
  }

  /**
   * Validate grep configuration
   */
  static validateGrepConfig(grep: RipgrepGrepConfig): string[] {
    const errors: string[] = [];

    if (typeof grep.all_tags !== 'string' || grep.all_tags.trim() === '') {
      errors.push('Grep all_tags must be a non-empty string');
    }

    try {
      new RegExp(grep.all_tags);
    } catch (error) {
      errors.push('Grep all_tags must be a valid regex');
    }

    if (typeof grep.rg_flags !== 'string' || grep.rg_flags.trim() === '') {
      errors.push('Grep rg_flags must be a non-empty string');
    }

    if (!Array.isArray(grep.validate.hooks) || grep.validate.hooks.length === 0) {
      errors.push('Grep validate hooks must be a non-empty array');
    }

    return errors;
  }

  /**
   * Validate full configuration
   */
  static validateFullConfig(config: RipgrepFullConfig): string[] {
    const errors: string[] = [];

    if (!config.rules || !config.rules.ripgrep) {
      errors.push('Configuration must contain rules.ripgrep');
      return errors;
    }

    const { schema, defaults, grep } = config.rules.ripgrep;

    errors.push(...this.validateSchema(schema));
    errors.push(...this.validateDefaults(defaults, schema));
    errors.push(...this.validateGrepConfig(grep));

    return errors;
  }
}

// ============================================================================
// CONFIGURATION MANAGER
// ============================================================================

export class ConfigManager {
  private config: RipgrepFullConfig;

  constructor(config: RipgrepFullConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.validate();
  }

  /**
   * Validate current configuration
   */
  private validate(): void {
    const errors = ConfigValidator.validateFullConfig(this.config);
    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): RipgrepFullConfig {
    return this.config;
  }

  /**
   * Get ripgrep configuration
   */
  getRipgrepConfig() {
    return this.config.rules.ripgrep;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<RipgrepFullConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      rules: {
        ...this.config.rules,
        ...(newConfig.rules || {}),
        ripgrep: {
          ...this.config.rules.ripgrep,
          ...(newConfig.rules?.ripgrep || {})
        }
      }
    };
    this.validate();
  }

  /**
   * Load preset configuration
   */
  loadPreset(presetName: keyof typeof PRESET_CONFIGS): void {
    if (!PRESET_CONFIGS[presetName]) {
      throw new Error(`Unknown preset: ${presetName}`);
    }
    this.config = PRESET_CONFIGS[presetName];
    this.validate();
  }

  /**
   * Export configuration as YAML string
   */
  exportYaml(): string {
    const { rules } = this.config;
    
    return `# FACTORYWAGER RIPGREP v4.0 Configuration
rules:
  ripgrep:
    schema:
      scope: [${rules.ripgrep.schema.scope.map(s => `'${s}'`).join(', ')}]
      type: [${rules.ripgrep.schema.type.map(t => `'${t}'`).join(', ')}]
      variant: [${rules.ripgrep.schema.variant.map(v => `'${v}'`).join(', ')}]
      hash_algo: '${rules.ripgrep.schema.hash_algo}'
      id_pattern: '${rules.ripgrep.schema.id_pattern}'
      ai_prefix: '${rules.ripgrep.schema.ai_prefix}'
    defaults:
      scope: '${rules.ripgrep.defaults.scope}'
      type: '${rules.ripgrep.defaults.type}'
      version: '${rules.ripgrep.defaults.version}'
      status: '${rules.ripgrep.defaults.status}'
    grep:
      all_tags: '${rules.ripgrep.grep.all_tags}'
      rg_flags: '${rules.ripgrep.grep.rg_flags}'
      validate:
        hooks: [${rules.ripgrep.grep.validate.hooks.map(h => `'${h}'`).join(', ')}]
`;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  DEFAULT_SCHEMA,
  DEFAULT_DEFAULTS,
  DEFAULT_GREP_CONFIG,
  DEFAULT_CONFIG,
  PRESET_CONFIGS
};

export default {
  ConfigValidator,
  ConfigManager,
  DEFAULT_CONFIG,
  PRESET_CONFIGS
};
