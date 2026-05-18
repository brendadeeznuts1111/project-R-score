// utils/url-validator.ts - Validation pattern for URL safety

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface URLValidationRule {
  name: string;
  validate: (url: string) => boolean;
  message: string;
  severity: 'error' | 'warning';
}

export class URLValidator {
  private static rules: URLValidationRule[] = [
    {
      name: 'format',
      validate: (url: string) => {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      },
      message: 'Invalid URL format',
      severity: 'error'
    },
    {
      name: 'protocol',
      validate: (url: string) => {
        const protocols = ['http:', 'https:', 'ws:', 'wss:', 'postgresql:', 'redis:'];
        try {
          const parsed = new URL(url);
          return protocols.includes(parsed.protocol);
        } catch {
          return false;
        }
      },
      message: 'Unsupported protocol',
      severity: 'error'
    },
    {
      name: 'https',
      validate: (url: string) => {
        try {
          const parsed = new URL(url);
          return parsed.protocol === 'https:' || 
                 parsed.protocol === 'wss:' ||
                 parsed.hostname === 'localhost' ||
                 parsed.hostname?.startsWith('127.') ||
                 parsed.hostname?.startsWith('192.168.') ||
                 parsed.hostname?.startsWith('10.');
        } catch {
          return false;
        }
      },
      message: 'HTTPS required for production URLs',
      severity: 'warning'
    },
    {
      name: 'localhost',
      validate: (url: string) => {
        try {
          const parsed = new URL(url);
          return parsed.hostname !== 'localhost' || parsed.protocol === 'http:';
        } catch {
          return false;
        }
      },
      message: 'Localhost URLs should use HTTP',
      severity: 'warning'
    }
  ];

  /**
   * Validate a single URL
   */
  static validate(url: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    for (const rule of this.rules) {
      if (!rule.validate(url)) {
        if (rule.severity === 'error') {
          errors.push(rule.message);
        } else {
          warnings.push(rule.message);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate multiple URLs
   */
  static validateMultiple(urls: string[]): Record<string, ValidationResult> {
    const results: Record<string, ValidationResult> = {};
    
    for (const url of urls) {
      results[url] = this.validate(url);
    }
    
    return results;
  }

  /**
   * Validate package name
   */
  static validatePackageName(name: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!name) {
      errors.push('Package name is required');
    } else {
      if (typeof name !== 'string') {
        errors.push('Package name must be a string');
      } else {
        if (!/^[a-z0-9-]+$/.test(name)) {
          errors.push('Package name must contain only lowercase letters, numbers, and hyphens');
        }
        if (name.length < 1) {
          errors.push('Package name must be at least 1 character long');
        }
        if (name.length > 214) {
          errors.push('Package name must be less than 215 characters');
        }
        if (name.startsWith('-') || name.endsWith('-')) {
          warnings.push('Package name should not start or end with a hyphen');
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate version string
   */
  static validateVersion(version: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!version) {
      errors.push('Version is required');
    } else {
      if (typeof version !== 'string') {
        errors.push('Version must be a string');
      } else {
        // Semantic versioning pattern
        const semverPattern = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
        if (!semverPattern.test(version)) {
          warnings.push('Version should follow semantic versioning (x.y.z)');
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate environment
   */
  static validateEnvironment(env: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const validEnvironments = ['development', 'staging', 'production', 'test'];
    
    if (!env) {
      errors.push('Environment is required');
    } else {
      if (!validEnvironments.includes(env)) {
        warnings.push(`Environment should be one of: ${validEnvironments.join(', ')}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Add custom validation rule
   */
  static addRule(rule: URLValidationRule): void {
    this.rules.push(rule);
  }

  /**
   * Remove validation rule by name
   */
  static removeRule(name: string): void {
    this.rules = this.rules.filter(rule => rule.name !== name);
  }

  /**
   * Get all validation rules
   */
  static getRules(): URLValidationRule[] {
    return [...this.rules];
  }
}

/**
 * Enhanced URL helper with validation
 */
export class ValidatedURLHelper {
  /**
   * Get registry URL with validation
   */
  static getRegistryUrl(packageName: string, version?: string): string {
    const packageValidation = URLValidator.validatePackageName(packageName);
    if (!packageValidation.isValid) {
      throw new Error(`Invalid package name: ${packageValidation.errors.join(', ')}`);
    }
    
    if (version) {
      const versionValidation = URLValidator.validateVersion(version);
      if (!versionValidation.isValid) {
        throw new Error(`Invalid version: ${versionValidation.errors.join(', ')}`);
      }
    }
    
    return version 
      ? `https://registry.factory-wager.com/@duoplus/${packageName}/${version}`
      : `https://registry.factory-wager.com/@duoplus/${packageName}`;
  }

  /**
   * Get search URL with validation
   */
  static getSearchUrl(query: string): string {
    if (!query || typeof query !== 'string') {
      throw new Error('Search query must be a non-empty string');
    }
    
    if (query.length > 1000) {
      throw new Error('Search query too long (max 1000 characters)');
    }
    
    return `https://registry.factory-wager.com/-/v1/search?text=${encodeURIComponent(query)}`;
  }

  /**
   * Get API URL with validation
   */
  static getApiUrl(endpoint: string, version: string = 'v1', baseUrl?: string): string {
    if (!endpoint || typeof endpoint !== 'string') {
      throw new Error('Endpoint must be a non-empty string');
    }
    
    if (!/^[a-z0-9\-_\/]+$/.test(endpoint)) {
      throw new Error('Endpoint contains invalid characters');
    }
    
    const base = baseUrl || 'http://localhost:3000';
    const url = `${base}/api/${version}/${endpoint}`;
    
    const validation = URLValidator.validate(url);
    if (!validation.isValid) {
      throw new Error(`Invalid URL: ${validation.errors.join(', ')}`);
    }
    
    return url;
  }
}
