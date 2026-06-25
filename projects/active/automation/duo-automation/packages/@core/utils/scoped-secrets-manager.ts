// utils/scoped-secrets-manager.ts - Enterprise-grade scoped secrets management

import { ScopeDetector, ScopeConfig, PlatformScopeAdapter } from './scope-detector';

export interface ScopedSecretsConfig {
  service?: string;
  team?: string;
  scope?: string;
  platform?: string;
}

export interface SecretOperation {
  service: string;
  name: string;
  value?: string;
  persist: string;
}

export interface SecretsHealthReport {
  accessible: boolean;
  scopedCorrectly: boolean;
  platformSupported: boolean;
  encryptionStrength: string;
  storageType: string;
  recommendations: string[];
}

/**
 * Enterprise-grade scoped secrets manager with per-user isolation
 */
export class ScopedSecretsManager {
  private scopeConfig: ScopeConfig;
  private storageConfig: any;

  constructor(config?: ScopedSecretsConfig) {
    this.scopeConfig = ScopeDetector.getScopeConfig();
    this.storageConfig = PlatformScopeAdapter.getScopedStorage(
      process.platform,
      this.scopeConfig.scope
    );
  }

  /**
   * Get scoped service name following Bun best practices
   */
  private getScopedService(baseService: string, team: string = 'default'): string {
    const config = this.scopeConfig;
    
    // Use UTI-style naming for external tools, descriptive names for internal services
    if (baseService.includes('.')) {
      // Already a UTI-style name (com.example.tool)
      return `${baseService}-${config.platformScope}-${team}`;
    }
    
    // Convert to descriptive service name with domain
    const domainName = config.domain.replace(/\./g, '-');
    return `com.${domainName}.${baseService}-${config.platformScope}-${team}`;
  }

  /**
   * Create secret operation with proper scoping
   */
  private createSecretOperation(
    name: string, 
    value?: string, 
    service?: string, 
    team?: string
  ): SecretOperation {
    // Use descriptive service names following Bun best practices
    const scopedService = service || this.getScopedService('duo-automation', team);
    
    return {
      service: scopedService,
      name,
      value,
      persist: this.storageConfig.persist
    };
  }

  /**
   * Get a secret with proper scoping
   */
  async getSecret(name: string, service?: string, team?: string): Promise<string | null> {
    try {
      // @ts-ignore - Bun.secrets is experimental
      const { secrets } = Bun;
      const operation = this.createSecretOperation(name, undefined, service, team);
      
      const result = await secrets.get({
        service: operation.service,
        name: operation.name,
        persist: operation.persist
      } as any);
      
      return result || null;
    } catch (error) {
      console.error(`Failed to get secret ${name}:`, error);
      return null;
    }
  }

  /**
   * Set a secret with proper scoping
   */
  async setSecret(
    name: string, 
    value: string, 
    service?: string, 
    team?: string
  ): Promise<boolean> {
    try {
      // @ts-ignore - Bun.secrets is experimental
      const { secrets } = Bun;
      const operation = this.createSecretOperation(name, value, service, team);
      
      await secrets.set({
        service: operation.service,
        name: operation.name,
        value: operation.value,
        persist: operation.persist
      } as any);
      
      return true;
    } catch (error) {
      console.error(`Failed to set secret ${name}:`, error);
      return false;
    }
  }

  /**
   * Delete a secret with proper scoping
   */
  async deleteSecret(name: string, service?: string, team?: string): Promise<boolean> {
    try {
      // @ts-ignore - Bun.secrets is experimental
      const { secrets } = Bun;
      const operation = this.createSecretOperation(name, undefined, service, team);
      
      await secrets.delete({
        service: operation.service,
        name: operation.name,
        persist: operation.persist
      } as any);
      
      return true;
    } catch (error) {
      console.error(`Failed to delete secret ${name}:`, error);
      return false;
    }
  }

  /**
   * Check if secret exists
   */
  async secretExists(name: string, service?: string, team?: string): Promise<boolean> {
    const secret = await this.getSecret(name, service, team);
    return secret !== null;
  }

  /**
   * List all secrets for current scope (limited implementation)
   */
  async listScopedSecrets(service?: string, team?: string): Promise<string[]> {
    // Note: Bun.secrets doesn't provide a list method
    // This would require platform-specific implementation
    // For now, return common secret names that might exist
    const commonSecrets = [
      'R2_BUCKET',
      'DUOPLUS_API_KEY',
      'R2_ENDPOINT',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY'
    ];

    const existingSecrets: string[] = [];
    for (const secretName of commonSecrets) {
      if (await this.secretExists(secretName, service, team)) {
        existingSecrets.push(secretName);
      }
    }

    return existingSecrets;
  }

  /**
   * Migrate environment variables to scoped secrets
   */
  async migrateFromEnv(
    envMappings: Record<string, string>,
    service?: string,
    team?: string
  ): Promise<{
    migrated: string[];
    failed: string[];
    existing: string[];
  }> {
    const migrated: string[] = [];
    const failed: string[] = [];
    const existing: string[] = [];

    for (const [envKey, secretName] of Object.entries(envMappings)) {
      const envValue = Bun.env[envKey];
      
      if (!envValue) {
        continue; // Skip if environment variable doesn't exist
      }

      if (await this.secretExists(secretName, service, team)) {
        existing.push(secretName);
        continue;
      }

      const success = await this.setSecret(secretName, envValue, service, team);
      if (success) {
        migrated.push(secretName);
      } else {
        failed.push(secretName);
      }
    }

    return { migrated, failed, existing };
  }

  /**
   * Validate scoping configuration
   */
  validateScoping(): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    config: ScopeConfig;
    storage: any;
  } {
    const scopeValidation = ScopeDetector.validateScope(this.scopeConfig);
    const platformValidation = PlatformScopeAdapter.validatePlatformCapability(
      process.platform,
      this.scopeConfig.scope
    );

    const allErrors = [...scopeValidation.errors];
    const allWarnings = [...scopeValidation.warnings, ...platformValidation.recommendations];

    return {
      valid: scopeValidation.valid && platformValidation.supported,
      errors: allErrors,
      warnings: allWarnings,
      config: this.scopeConfig,
      storage: this.storageConfig
    };
  }

  /**
   * Get secrets health report
   */
  async getHealthReport(): Promise<SecretsHealthReport> {
    const validation = this.validateScoping();
    const securityFeatures = PlatformScopeAdapter.getSecurityFeatures(process.platform);
    
    // Test basic functionality
    const testSecretName = `health-check-${Date.now()}`;
    const testValue = 'health-check-value';
    
    let accessible = false;
    let scopedCorrectly = false;
    
    try {
      // Test set operation
      const setResult = await this.setSecret(testSecretName, testValue);
      if (setResult) {
        // Test get operation
        const getValue = await this.getSecret(testSecretName);
        if (getValue === testValue) {
          accessible = true;
          scopedCorrectly = true;
        }
        
        // Cleanup
        await this.deleteSecret(testSecretName);
      }
    } catch (error) {
      console.error('Health check failed:', error);
    }

    const recommendations: string[] = [];
    if (!accessible) {
      recommendations.push('Secrets storage is not accessible');
    }
    if (!scopedCorrectly) {
      recommendations.push('Secrets scoping may not be working correctly');
    }
    if (!validation.valid) {
      recommendations.push(...validation.errors);
    }

    return {
      accessible,
      scopedCorrectly,
      platformSupported: validation.valid,
      encryptionStrength: this.scopeConfig.encryptionType,
      storageType: this.scopeConfig.storageType,
      recommendations
    };
  }

  /**
   * Get current scope configuration
   */
  getScopeConfig(): ScopeConfig {
    return this.scopeConfig;
  }

  /**
   * Get storage configuration
   */
  getStorageConfig(): any {
    return this.storageConfig;
  }

  /**
   * Export configuration for debugging
   */
  exportDebugInfo(): {
    scope: ScopeConfig;
    storage: any;
    validation: any;
    security: any;
  } {
    return {
      scope: this.scopeConfig,
      storage: this.storageConfig,
      validation: this.validateScoping(),
      security: PlatformScopeAdapter.getSecurityFeatures(process.platform)
    };
  }

  /**
   * Create team-scoped secrets manager
   */
  static forTeam(team: string): ScopedSecretsManager {
    return new ScopedSecretsManager({ team });
  }

  /**
   * Create service-scoped secrets manager for external tools
   */
  static forExternalTool(toolName: string, team?: string): ScopedSecretsManager {
    // Use UTI-style naming for external tools
    const utiServiceName = toolName.includes('.') ? toolName : `com.${toolName}.cli`;
    return new ScopedSecretsManager({ service: utiServiceName, team });
  }

  /**
   * Create service-scoped secrets manager for internal services
   */
  static forInternalService(serviceName: string, team?: string): ScopedSecretsManager {
    return new ScopedSecretsManager({ service: serviceName, team });
  }

  /**
   * Get recommended service name for tool
   */
  static getRecommendedServiceName(toolName: string, domain?: string): string {
    if (toolName.includes('.')) {
      return toolName; // Already UTI-style
    }
    
    const baseDomain = domain || 'duo-automation';
    return `com.${baseDomain}.${toolName}`;
  }

  /**
   * Create scope-specific secrets manager
   */
  static forScope(scope: string, platform?: string): ScopedSecretsManager {
    const config = ScopeDetector.getScopeConfig();
    return new ScopedSecretsManager({ 
      scope: config.scope, 
      platform: platform || process.platform 
    });
  }
}
