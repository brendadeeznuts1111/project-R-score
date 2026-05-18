// utils/scope-detector.ts - Multi-tenant organizational scoping detection system

export type Scope = 'ENTERPRISE' | 'DEVELOPMENT' | 'LOCAL-SANDBOX';
export type PlatformScope = 'ENTERPRISE' | 'USER' | 'LOCAL';

export interface ScopeConfig {
  scope: Scope;
  platformScope: PlatformScope;
  domain: string;
  pathPrefix: string;
  storageType: string;
  encryptionType: string;
}

export interface DomainMapping {
  domain: string;
  scope: Scope;
  description: string;
}

/**
 * Comprehensive scope detection and management system
 */
export class ScopeDetector {
  
  /**
   * Domain-to-scope mapping matrix
   */
  private static readonly DOMAIN_MAPPINGS: DomainMapping[] = [
    {
      domain: 'apple.factory-wager.com',
      scope: 'ENTERPRISE',
      description: 'Production enterprise environment with organizational-level isolation'
    },
    {
      domain: 'dev.apple.factory-wager.com',
      scope: 'DEVELOPMENT',
      description: 'Development environment with non-production isolation'
    },
    {
      domain: 'localhost',
      scope: 'LOCAL-SANDBOX',
      description: 'Local development sandbox with workstation isolation'
    }
  ];

  /**
   * Platform-specific scope configurations
   */
  private static readonly PLATFORM_CONFIGS: Record<string, Partial<ScopeConfig>> = {
    'win32': {
      platformScope: 'ENTERPRISE',
      storageType: 'Credential Manager',
      encryptionType: 'DPAPI'
    },
    'darwin': {
      platformScope: 'USER',
      storageType: 'Keychain',
      encryptionType: 'AES-256'
    },
    'linux': {
      platformScope: 'USER',
      storageType: 'Secret Service',
      encryptionType: 'AES-256'
    }
  };

  /**
   * Detect scope from serving domain
   */
  static detectFromDomain(hostname: string): Scope {
    const mapping = this.DOMAIN_MAPPINGS.find(m => m.domain === hostname);
    return mapping?.scope || 'LOCAL-SANDBOX';
  }

  /**
   * Get complete scope configuration
   */
  static getScopeConfig(hostname?: string): ScopeConfig {
    const domain = hostname || this.getCurrentDomain();
    const scope = this.detectFromDomain(domain);
    const platform = process.platform;
    const platformConfig = this.PLATFORM_CONFIGS[platform] || {
      platformScope: 'LOCAL',
      storageType: 'Encrypted Local',
      encryptionType: 'AES-256'
    };

    const pathPrefix = this.getPathPrefix(scope);
    
    return {
      scope,
      platformScope: platformConfig.platformScope as PlatformScope,
      domain,
      pathPrefix,
      storageType: platformConfig.storageType!,
      encryptionType: platformConfig.encryptionType!
    };
  }

  /**
   * Get current serving domain
   */
  static getCurrentDomain(): string {
    // Check environment variables first
    if (process.env.DOMAIN) {
      return process.env.DOMAIN;
    }
    
    // Check hostname
    if (typeof process !== 'undefined' && process.hostname) {
      return process.hostname;
    }
    
    // Fallback to localhost for development
    return 'localhost';
  }

  /**
   * Get path prefix for scope
   */
  static getPathPrefix(scope: Scope): string {
    switch (scope) {
      case 'ENTERPRISE':
        return 'enterprise/';
      case 'DEVELOPMENT':
        return 'development/';
      case 'LOCAL-SANDBOX':
        return 'local/';
      default:
        return 'global/';
    }
  }

  /**
   * Validate scope configuration
   */
  static validateScope(config: ScopeConfig): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate domain mapping
    const domainMapping = this.DOMAIN_MAPPINGS.find(m => m.domain === config.domain);
    if (!domainMapping) {
      warnings.push(`Unknown domain: ${config.domain}, using LOCAL-SANDBOX fallback`);
    }

    // Validate platform support
    if (!this.PLATFORM_CONFIGS[process.platform]) {
      warnings.push(`Unsupported platform: ${process.platform}, using fallback configuration`);
    }

    // Validate scope consistency
    if (config.scope === 'ENTERPRISE' && config.platformScope !== 'ENTERPRISE') {
      warnings.push(`ENTERPRISE scope with non-ENTERPRISE platform scope may have reduced security`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get all available domain mappings
   */
  static getDomainMappings(): DomainMapping[] {
    return [...this.DOMAIN_MAPPINGS];
  }

  /**
   * Get platform configuration
   */
  static getPlatformConfig(platform: string): Partial<ScopeConfig> {
    return this.PLATFORM_CONFIGS[platform] || {
      platformScope: 'LOCAL',
      storageType: 'Encrypted Local',
      encryptionType: 'AES-256'
    };
  }

  /**
   * Check if scope supports enterprise features
   */
  static supportsEnterpriseFeatures(config: ScopeConfig): boolean {
    return config.scope === 'ENTERPRISE' && 
           config.platformScope === 'ENTERPRISE' &&
           config.storageType === 'Credential Manager';
  }

  /**
   * Get scoped service name
   */
  static getScopedServiceName(baseService: string, team: string = 'default'): string {
    const config = this.getScopeConfig();
    return `${baseService}-${config.platformScope}-${team}`;
  }

  /**
   * Get scoped R2 path
   */
  static getScopedR2Path(basePath: string, hostname?: string): string {
    const config = this.getScopeConfig(hostname);
    return `${config.pathPrefix}${basePath}`;
  }

  /**
   * Get local mirror path
   */
  static getLocalMirrorPath(basePath: string, hostname?: string): string {
    const config = this.getScopeConfig(hostname);
    return `data/${config.scope.toLowerCase()}/${basePath}`;
  }

  /**
   * Export scope configuration as environment variables
   */
  static exportAsEnv(config: ScopeConfig): Record<string, string> {
    return {
      'SCOPE': config.scope,
      'PLATFORM_SCOPE': config.platformScope,
      'DOMAIN': config.domain,
      'PATH_PREFIX': config.pathPrefix,
      'STORAGE_TYPE': config.storageType,
      'ENCRYPTION_TYPE': config.encryptionType
    };
  }

  /**
   * Create scope-aware directory structure
   */
  static createScopeDirectories(basePath: string): string[] {
    const config = this.getScopeConfig();
    const directories = [
      this.getLocalMirrorPath(basePath),
      `data/${config.scope.toLowerCase()}/cache`,
      `data/${config.scope.toLowerCase()}/logs`,
      `data/${config.scope.toLowerCase()}/temp`
    ];

    // In a real implementation, this would create directories
    // For now, return the paths that would be created
    return directories;
  }
}

/**
 * Platform-aware scoping adapter
 */
export class PlatformScopeAdapter {
  
  /**
   * Get platform-specific storage configuration
   */
  static getScopedStorage(platform: string, scope: string): {
    persist: string;
    type: string;
    encryption: string;
    isolation: string;
  } {
    const platformScope = this.getPlatformScope(platform, scope);
    
    switch (platform) {
      case 'win32':
        return {
          persist: 'CRED_PERSIST_ENTERPRISE',
          type: 'CREDENTIAL_MANAGER',
          encryption: 'DPAPI',
          isolation: 'Enterprise-level per-machine isolation'
        };
      
      case 'darwin':
        return {
          persist: 'CRED_PERSIST_ENTERPRISE',
          type: 'KEYCHAIN',
          encryption: 'AES-256',
          isolation: 'Per-user keychain access'
        };
      
      case 'linux':
        return {
          persist: 'CRED_PERSIST_ENTERPRISE',
          type: 'SECRET_SERVICE',
          encryption: 'AES-256',
          isolation: 'Per-user secret service access'
        };
      
      default:
        return {
          persist: 'CRED_PERSIST_LOCAL_MACHINE',
          type: 'ENCRYPTED_LOCAL',
          encryption: 'AES-256',
          isolation: 'Local file system isolation'
        };
    }
  }

  /**
   * Get platform scope based on platform and organizational scope
   */
  static getPlatformScope(platform: string, organizationalScope: string): PlatformScope {
    if (platform === 'win32') {
      return 'ENTERPRISE';
    }
    
    if (organizationalScope === 'ENTERPRISE' && (platform === 'darwin' || platform === 'linux')) {
      return 'USER';
    }
    
    return 'LOCAL';
  }

  /**
   * Validate platform capability for scope
   */
  static validatePlatformCapability(platform: string, requiredScope: string): {
    supported: boolean;
    recommendations: string[];
    fallbackAvailable: boolean;
  } {
    const recommendations: string[] = [];
    let supported = false;
    let fallbackAvailable = false;

    switch (platform) {
      case 'win32':
        supported = true;
        if (requiredScope === 'ENTERPRISE') {
          // Windows fully supports enterprise scoping
        }
        break;
      
      case 'darwin':
      case 'linux':
        supported = requiredScope !== 'ENTERPRISE' || requiredScope === 'USER';
        if (requiredScope === 'ENTERPRISE') {
          recommendations.push('Consider using USER scoping on macOS/Linux platforms');
          fallbackAvailable = true;
        }
        break;
      
      default:
        supported = false;
        recommendations.push('Platform not supported for enterprise scoping');
        recommendations.push('Use LOCAL scoping or upgrade to a supported platform');
        fallbackAvailable = true;
        break;
    }

    return {
      supported,
      recommendations,
      fallbackAvailable
    };
  }

  /**
   * Get platform-specific security features
   */
  static getSecurityFeatures(platform: string): {
    available: string[];
    recommended: string[];
    limitations: string[];
  } {
    switch (platform) {
      case 'win32':
        return {
          available: ['Credential Manager', 'DPAPI', 'Enterprise Scoping', 'Machine-level Isolation'],
          recommended: ['Credential Manager', 'Enterprise Scoping'],
          limitations: ['Requires Windows Credential Manager service']
        };
      
      case 'darwin':
        return {
          available: ['Keychain', 'AES-256', 'User Scoping', 'Secure Enclave'],
          recommended: ['Keychain', 'User Scoping'],
          limitations: ['No enterprise-level scoping available']
        };
      
      case 'linux':
        return {
          available: ['Secret Service', 'AES-256', 'User Scoping', 'GNOME Keyring'],
          recommended: ['Secret Service', 'User Scoping'],
          limitations: ['Varies by distribution', 'Requires libsecret']
        };
      
      default:
        return {
          available: ['Encrypted Local Storage', 'AES-256'],
          recommended: ['Encrypted Local Storage'],
          limitations: ['No OS-level secure storage', 'Manual key management required']
        };
    }
  }
}
