/**
 * Empire Pro Configuration Parser using Bun v1.3.6 JSONC API
 * Handles JSON with comments, trailing commas, and enhanced validation
 */

import { Bun } from 'bun';

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  config?: any;
}

export class EnhancedConfigParser {
  private readonly configDir: string;

  constructor(configDir = './config') {
    this.configDir = configDir;
  }

  /**
   * Parse configuration file with JSONC support (Bun v1.3.6 feature)
   */
  async parseConfig<T = any>(filePath: string): Promise<ConfigValidationResult> {
    const result: ConfigValidationResult = {
      valid: false,
      errors: [],
      warnings: []
    };

    try {
      // Read configuration file
      const fullPath = `${this.configDir}/${filePath}`;
      const content = await Bun.file(fullPath).text();

      // Use Bun v1.3.6 JSONC.parse() for JSON with comments
      let config: T;
      
      if (filePath.endsWith('.jsonc') || this.hasJsoncFeatures(content)) {
        // Parse JSONC (JSON with comments and trailing commas)
        config = Bun.JSONC.parse(content) as T;
        result.warnings.push('Parsed using JSONC format (comments/trailing commas supported)');
      } else {
        // Parse regular JSON
        config = JSON.parse(content) as T;
      }

      // Validate configuration structure
      const validation = this.validateConfig(config);
      result.errors.push(...validation.errors);
      result.warnings.push(...validation.warnings);
      
      if (validation.valid) {
        result.valid = true;
        result.config = config;
      }

    } catch (error) {
      result.errors.push(`Parse error: ${error.message}`);
    }

    return result;
  }

  /**
   * Check if content has JSONC features (comments or trailing commas)
   */
  private hasJsoncFeatures(content: string): boolean {
    return (
      /\/\*[\s\S]*?\*\/|\/\/.*$/gm.test(content) || // Block or line comments
      /,\s*[\}\]]/gm.test(content) // Trailing commas
    );
  }

  /**
   * Validate configuration structure and values
   */
  private validateConfig(config: any): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic structure validation
    if (!config || typeof config !== 'object') {
      errors.push('Configuration must be a valid object');
      return { valid: false, errors, warnings };
    }

    // Service configuration validation
    if (config.service) {
      if (!config.service.name) {
        errors.push('Service name is required');
      }
      if (!config.service.version) {
        warnings.push('Service version not specified');
      }
    }

    // Database configuration validation
    if (config.database) {
      if (!config.database.url) {
        errors.push('Database URL is required');
      }
      if (config.database.pool_size && (config.database.pool_size < 1 || config.database.pool_size > 100)) {
        warnings.push('Database pool size should be between 1 and 100');
      }
    }

    // R2 configuration validation
    if (config.r2) {
      const requiredR2Fields = ['endpoint', 'access_key_id', 'secret_access_key', 'bucket'];
      for (const field of requiredR2Fields) {
        if (!config.r2[field]) {
          errors.push(`R2 ${field.replace(/_/g, ' ')} is required`);
        }
      }

      // Validate R2 endpoint format
      if (config.r2.endpoint && !config.r2.endpoint.includes('.r2.cloudflarestorage.com')) {
        warnings.push('R2 endpoint should be a valid Cloudflare R2 URL');
      }
    }

    // Security configuration validation
    if (config.security) {
      if (config.security.jwt_secret && config.security.jwt_secret.length < 32) {
        errors.push('JWT secret must be at least 32 characters long');
      }
      if (config.security.encryption_key && config.security.encryption_key.length < 32) {
        errors.push('Encryption key must be at least 32 characters long');
      }
    }

    // API configuration validation
    if (config.api) {
      if (config.api.port && (config.api.port < 1 || config.api.port > 65535)) {
        errors.push('API port must be between 1 and 65535');
      }
      if (config.api.rate_limit && config.api.rate_limit < 1) {
        warnings.push('API rate limit should be positive');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Create a sample configuration with JSONC features
   */
  createSampleConfig(): string {
    return `// Empire Pro Configuration (JSONC format supported)
// This file supports comments and trailing commas

{
  // Service configuration
  "service": {
    "name": "empire-pro-config-empire",
    "version": "1.0.0",
    "environment": "production", // development | staging | production
    "debug": false, // Disable debug in production!
  },

  // Database configuration
  "database": {
    "url": "\${DATABASE_URL:-postgresql://user:pass@localhost:5432/empire_pro}",
    "pool_size": 20,
    "timeout": 30,
    "ssl_enabled": true,
  },

  // Redis configuration
  "redis": {
    "url": "\${REDIS_URL:-redis://localhost:6379}",
    "pool_size": 10,
    "timeout": 5,
  },

  // R2 Storage configuration
  "r2": {
    "endpoint": "https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com",
    "access_key_id": "69765dd738766bca38be63e7d0192cf8",
    "secret_access_key": "1d9326ffb0c59ebecb612f401a87f71942574984375fb283fc4359630d7d929a",
    "bucket": "factory-wager-packages",
    "region": "auto",
    "public_domain": "https://pub-dc0e1ef5dd2245be81d6670a9b7b1550.r2.dev",
  },

  // Security configuration
  "security": {
    "jwt_secret": "\${JWT_SECRET}", // Must be 32+ characters
    "encryption_key": "\${ENCRYPTION_KEY}", // Must be 32+ characters
    "session_timeout": 3600,
    "rate_limiting": {
      "enabled": true,
      "requests_per_minute": 100,
    },
  },

  // API configuration
  "api": {
    "host": "0.0.0.0",
    "port": 3001,
    "cors_enabled": true,
    "rate_limit": 1000, // Requests per minute
  },

  // Monitoring configuration
  "monitoring": {
    "enabled": true,
    "metrics_endpoint": "/metrics",
    "health_check": {
      "enabled": true,
      "endpoint": "/health",
      "interval": 30, // seconds
    },
  },
}`;
  }

  /**
   * Save configuration with JSONC formatting
   */
  async saveConfig(filePath: string, config: any, useJsonc = true): Promise<void> {
    const content = useJsonc 
      ? this.formatJsonc(config)
      : JSON.stringify(config, null, 2);

    const fullPath = `${this.configDir}/${filePath}`;
    await Bun.write(fullPath, content);
  }

  /**
   * Format configuration as JSONC with comments
   */
  private formatJsonc(config: any, indent = 0): string {
    const spaces = '  '.repeat(indent);
    const lines: string[] = [];
    
    lines.push(`${spaces}{`);
    
    for (const [key, value] of Object.entries(config)) {
      const comment = this.getFieldComment(key);
      if (comment) {
        lines.push(`${spaces}  // ${comment}`);
      }
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        lines.push(`${spaces}  "${key}": {`);
        lines.push(this.formatJsonc(value, indent + 2));
        lines.push(`${spaces}  },`);
      } else {
        const jsonValue = JSON.stringify(value, null, 2).split('\n').join(`\n${spaces}  `);
        lines.push(`${spaces}  "${key}": ${jsonValue},`);
      }
    }
    
    lines.push(`${spaces}}`);
    return lines.join('\n');
  }

  /**
   * Get documentation comments for configuration fields
   */
  private getFieldComment(key: string): string {
    const comments: Record<string, string> = {
      service: 'Service configuration',
      database: 'Database configuration',
      redis: 'Redis configuration',
      r2: 'R2 Storage configuration',
      security: 'Security configuration',
      api: 'API configuration',
      monitoring: 'Monitoring configuration',
      name: 'Service name identifier',
      version: 'Semantic version',
      environment: 'Runtime environment',
      debug: 'Enable debug logging',
      url: 'Connection URL',
      pool_size: 'Connection pool size',
      timeout: 'Connection timeout in seconds',
      endpoint: 'API endpoint URL',
      bucket: 'Storage bucket name',
      jwt_secret: 'JWT signing secret',
      encryption_key: 'Data encryption key',
      port: 'Server port',
      enabled: 'Feature enabled flag'
    };
    
    return comments[key] || '';
  }
}

// CLI interface for configuration operations
if (import.meta.main) {
  const parser = new EnhancedConfigParser();
  const command = process.argv[2];
  const file = process.argv[3] || 'empire-config.jsonc';
  
  switch (command) {
    case 'parse':
      const result = await parser.parseConfig(file);
      console.log('Parse result:', result);
      break;
    case 'sample':
      const sample = parser.createSampleConfig();
      console.log(sample);
      break;
    case 'validate':
      const validation = await parser.parseConfig(file);
      console.log(`Validation: ${validation.valid ? '✅ PASSED' : '❌ FAILED'}`);
      if (validation.errors.length > 0) {
        console.log('Errors:', validation.errors);
      }
      if (validation.warnings.length > 0) {
        console.log('Warnings:', validation.warnings);
      }
      break;
    default:
      console.log('Usage: bun config-parser.ts [parse|sample|validate] [file]');
  }
}
