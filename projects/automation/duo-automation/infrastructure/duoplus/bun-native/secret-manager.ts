// duoplus/bun-native/secret-manager.ts
import { password, secrets } from 'bun';

export interface SecretConfig {
  algorithm: 'argon2id' | 'bcrypt' | 'argon2d' | 'argon2i';
  memoryCost?: number; // for argon2id
  timeCost?: number;   // for argon2id
  parallelism?: number; // for argon2id
  saltRounds?: number; // for bcrypt
  useSystemKeychain?: boolean; // Use Bun's secrets API for storage
  serviceName?: string; // Service name for system keychain
  
  // Windows-specific enterprise options
  windowsEnterprise?: boolean; // Use enterprise persistence on Windows
  windowsTargetName?: string; // Alternative target name for Windows credentials
}

export interface StoredSecret {
  id: string;
  hashedValue: string;
  algorithm: string;
  salt: string;
  createdAt: Date;
  lastAccessed?: Date;
  metadata?: Record<string, any>;
}

export class BunSecretManager {
  private secrets: Map<string, StoredSecret> = new Map();
  private config: SecretConfig;
  private readonly serviceName: string;

  constructor(config: SecretConfig = { algorithm: 'argon2id' }) {
    this.config = {
      memoryCost: 65536,    // 64MB
      timeCost: 3,          // 3 iterations
      parallelism: 4,       // 4 threads
      useSystemKeychain: true,
      serviceName: 'duoplus-automation',
      windowsEnterprise: process.platform === 'win32', // Auto-enable on Windows
      ...config
    };
    this.serviceName = this.config.serviceName || 'duoplus-automation';
  }

  /**
   * Hash a secret using the configured algorithm
   */
  async hashSecret(secret: string, metadata?: Record<string, any>): Promise<StoredSecret> {
    const id = this.generateSecretId();
    const salt = this.generateSalt();
    
    let hashedValue: string;
    
    switch (this.config.algorithm) {
      case 'argon2id':
        hashedValue = await this.hashWithArgon2id(secret, salt);
        break;
      case 'bcrypt':
        hashedValue = await this.hashWithBcrypt(secret, salt);
        break;
      case 'argon2d':
        hashedValue = await this.hashWithArgon2d(secret, salt);
        break;
      case 'argon2i':
        hashedValue = await this.hashWithArgon2i(secret, salt);
        break;
      default:
        throw new Error(`Unsupported algorithm: ${this.config.algorithm}`);
    }
    
    const storedSecret: StoredSecret = {
      id,
      hashedValue,
      algorithm: this.config.algorithm,
      salt,
      createdAt: new Date(),
      metadata
    };
    
    this.secrets.set(id, storedSecret);
    return storedSecret;
  }

  /**
   * Verify a secret against stored hash
   */
  async verifySecret(secretId: string, secret: string): Promise<boolean> {
    const storedSecret = this.secrets.get(secretId);
    if (!storedSecret) {
      return false;
    }
    
    // Update last accessed time
    storedSecret.lastAccessed = new Date();
    
    try {
      switch (storedSecret.algorithm) {
        case 'argon2id':
          return await this.verifyArgon2id(secret, storedSecret.salt, storedSecret.hashedValue);
        case 'bcrypt':
          return await this.verifyBcrypt(secret, storedSecret.salt, storedSecret.hashedValue);
        case 'argon2d':
          return await this.verifyArgon2d(secret, storedSecret.salt, storedSecret.hashedValue);
        case 'argon2i':
          return await this.verifyArgon2i(secret, storedSecret.salt, storedSecret.hashedValue);
        default:
          return false;
      }
    } catch (error) {
      console.error('Secret verification error:', error);
      return false;
    }
  }

  /**
   * Hash with Argon2id (recommended for passwords)
   */
  private async hashWithArgon2id(secret: string, salt: string): Promise<string> {
    try {
      // Bun's password.hash supports argon2id
      const hash = await password.hash(secret, {
        algorithm: 'argon2id',
        memoryCost: this.config.memoryCost,
        timeCost: this.config.timeCost
      });
      return hash;
    } catch (error) {
      throw new Error(`Argon2id hashing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Hash with bcrypt
   */
  private async hashWithBcrypt(secret: string, salt: string): Promise<string> {
    try {
      const hash = await password.hash(secret, {
        algorithm: 'bcrypt'
      });
      return hash;
    } catch (error) {
      throw new Error(`Bcrypt hashing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Hash with Argon2d
   */
  private async hashWithArgon2d(secret: string, salt: string): Promise<string> {
    try {
      const hash = await password.hash(secret, {
        algorithm: 'argon2d',
        memoryCost: this.config.memoryCost,
        timeCost: this.config.timeCost
      });
      return hash;
    } catch (error) {
      throw new Error(`Argon2d hashing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Hash with Argon2i
   */
  private async hashWithArgon2i(secret: string, salt: string): Promise<string> {
    try {
      const hash = await password.hash(secret, {
        algorithm: 'argon2i',
        memoryCost: this.config.memoryCost,
        timeCost: this.config.timeCost
      });
      return hash;
    } catch (error) {
      throw new Error(`Argon2i hashing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Verify Argon2id hash
   */
  private async verifyArgon2id(secret: string, salt: string, hash: string): Promise<boolean> {
    try {
      return await password.verify(secret, hash, 'argon2id');
    } catch (error) {
      return false;
    }
  }

  /**
   * Verify bcrypt hash
   */
  private async verifyBcrypt(secret: string, salt: string, hash: string): Promise<boolean> {
    try {
      return await password.verify(secret, hash, 'bcrypt');
    } catch (error) {
      return false;
    }
  }

  /**
   * Verify Argon2d hash
   */
  private async verifyArgon2d(secret: string, salt: string, hash: string): Promise<boolean> {
    try {
      return await password.verify(secret, hash, 'argon2d');
    } catch (error) {
      return false;
    }
  }

  /**
   * Verify Argon2i hash
   */
  private async verifyArgon2i(secret: string, salt: string, hash: string): Promise<boolean> {
    try {
      return await password.verify(secret, hash, 'argon2i');
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate cryptographically secure random salt
   */
  private generateSalt(): string {
    // Generate a simple salt using random values
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate unique secret ID
   */
  private generateSecretId(): string {
    return `secret_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  /**
   * Store DuoPlus API key securely using system keychain with Windows enterprise support
   */
  async storeApiKeySecurely(apiKey: string, teamId?: string): Promise<boolean> {
    if (!this.config.useSystemKeychain) {
      console.warn('System keychain is disabled. Falling back to in-memory storage.');
      const id = await this.storeApiKey(apiKey, teamId);
      return !!id;
    }

    try {
      // Use Windows-specific naming for enterprise scenarios
      let secretName = teamId ? `api-key-${teamId}` : 'api-key-default';
      let service = this.serviceName;
      
      if (process.platform === 'win32' && this.config.windowsEnterprise) {
        // Windows enterprise naming convention
        service = this.config.windowsTargetName || `com.duoplus.enterprise.${this.serviceName}`;
        secretName = `DuoPlus_API_${teamId || 'Default'}`;
        console.log(`🪟 Using Windows enterprise persistence: ${service}`);
      }

      await secrets.set({
        service,
        name: secretName,
        value: apiKey
      });
      
      console.log(`✅ API key stored securely in system keychain for ${secretName}`);
      if (process.platform === 'win32' && this.config.windowsEnterprise) {
        console.log(`   🏢 Windows Enterprise: Scoped per user with CRED_PERSIST_ENTERPRISE`);
      }
      return true;
    } catch (error) {
      console.error('❌ Failed to store API key in system keychain:', error instanceof Error ? error.message : String(error));
      // Fallback to in-memory storage
      const id = await this.storeApiKey(apiKey, teamId);
      return !!id;
    }
  }

  /**
   * Retrieve DuoPlus API key from system keychain with Windows enterprise support
   */
  async getApiKeySecurely(teamId?: string): Promise<string | null> {
    if (!this.config.useSystemKeychain) {
      console.warn('System keychain is disabled. Cannot retrieve secure API key.');
      return null;
    }

    try {
      // Use Windows-specific naming for enterprise scenarios
      let secretName = teamId ? `api-key-${teamId}` : 'api-key-default';
      let service = this.serviceName;
      
      if (process.platform === 'win32' && this.config.windowsEnterprise) {
        service = this.config.windowsTargetName || `com.duoplus.enterprise.${this.serviceName}`;
        secretName = `DuoPlus_API_${teamId || 'Default'}`;
      }

      const apiKey = await secrets.get({
        service,
        name: secretName
      });
      
      return apiKey;
    } catch (error) {
      console.error('❌ Failed to retrieve API key from system keychain:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * Delete DuoPlus API key from system keychain with Windows enterprise support
   */
  async deleteApiKeySecurely(teamId?: string): Promise<boolean> {
    if (!this.config.useSystemKeychain) {
      console.warn('System keychain is disabled. Cannot delete secure API key.');
      return false;
    }

    try {
      // Use Windows-specific naming for enterprise scenarios
      let secretName = teamId ? `api-key-${teamId}` : 'api-key-default';
      let service = this.serviceName;
      
      if (process.platform === 'win32' && this.config.windowsEnterprise) {
        service = this.config.windowsTargetName || `com.duoplus.enterprise.${this.serviceName}`;
        secretName = `DuoPlus_API_${teamId || 'Default'}`;
      }

      const deleted = await secrets.delete({
        service,
        name: secretName
      });
      
      if (deleted) {
        console.log(`✅ API key deleted from system keychain for ${secretName}`);
        if (process.platform === 'win32' && this.config.windowsEnterprise) {
          console.log(`   🏢 Windows Enterprise: Removed from Credential Manager`);
        }
      }
      return deleted;
    } catch (error) {
      console.error('❌ Failed to delete API key from system keychain:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Store proxy credentials securely using system keychain
   */
  async storeProxyCredentialsSecurely(username: string, password: string, provider: string): Promise<boolean> {
    if (!this.config.useSystemKeychain) {
      console.warn('System keychain is disabled. Falling back to in-memory storage.');
      const id = await this.storeProxyCredentials(username, password, provider);
      return !!id;
    }

    try {
      const credentials = JSON.stringify({ username, password, provider });
      const secretName = `proxy-${provider}`;
      
      await secrets.set({
        service: this.serviceName,
        name: secretName,
        value: credentials
      });
      
      console.log(`✅ Proxy credentials stored securely in system keychain for ${provider}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to store proxy credentials in system keychain:', error instanceof Error ? error.message : String(error));
      // Fallback to in-memory storage
      const id = await this.storeProxyCredentials(username, password, provider);
      return !!id;
    }
  }

  /**
   * Retrieve proxy credentials from system keychain
   */
  async getProxyCredentialsSecurely(provider: string): Promise<{ username: string; password: string } | null> {
    if (!this.config.useSystemKeychain) {
      console.warn('System keychain is disabled. Cannot retrieve secure proxy credentials.');
      return null;
    }

    try {
      const secretName = `proxy-${provider}`;
      const credentialsJson = await secrets.get({
        service: this.serviceName,
        name: secretName
      });
      
      if (!credentialsJson) {
        return null;
      }
      
      const credentials = JSON.parse(credentialsJson);
      return { username: credentials.username, password: credentials.password };
    } catch (error) {
      console.error('❌ Failed to retrieve proxy credentials from system keychain:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * Delete proxy credentials from system keychain
   */
  async deleteProxyCredentialsSecurely(provider: string): Promise<boolean> {
    if (!this.config.useSystemKeychain) {
      console.warn('System keychain is disabled. Cannot delete secure proxy credentials.');
      return false;
    }

    try {
      const secretName = `proxy-${provider}`;
      const deleted = await secrets.delete({
        service: this.serviceName,
        name: secretName
      });
      
      if (deleted) {
        console.log(`✅ Proxy credentials deleted from system keychain for ${provider}`);
      }
      return deleted;
    } catch (error) {
      console.error('❌ Failed to delete proxy credentials from system keychain:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Store DuoPlus API key securely (legacy method for backward compatibility)
   */
  async storeApiKey(apiKey: string, teamId?: string): Promise<string> {
    const secret = await this.hashSecret(apiKey, {
      type: 'duoplus_api_key',
      teamId,
      permissions: ['read', 'write']
    });
    
    return secret.id;
  }

  /**
   * Store proxy credentials securely (legacy method for backward compatibility)
   */
  async storeProxyCredentials(username: string, password: string, provider: string): Promise<string> {
    const credentials = `${username}:${password}`;
    const secret = await this.hashSecret(credentials, {
      type: 'proxy_credentials',
      provider,
      createdAt: new Date().toISOString()
    });
    
    return secret.id;
  }

  /**
   * Retrieve and verify API key (legacy method for backward compatibility)
   */
  async getApiKey(secretId: string, providedApiKey: string): Promise<boolean> {
    return this.verifySecret(secretId, providedApiKey);
  }

  /**
   * Retrieve and verify proxy credentials (legacy method for backward compatibility)
   */
  async getProxyCredentials(secretId: string, providedUsername: string, providedPassword: string): Promise<boolean> {
    const credentials = `${providedUsername}:${providedPassword}`;
    return this.verifySecret(secretId, credentials);
  }

  /**
   * List all stored secrets in system keychain
   */
  async listSystemSecrets(): Promise<string[]> {
    if (!this.config.useSystemKeychain) {
      console.warn('System keychain is disabled.');
      return [];
    }

    // Note: Bun's secrets API doesn't provide a list method
    // This is a placeholder for future implementation or custom tracking
    console.log('📋 System keychain secrets listing not directly supported by Bun API');
    return [];
  }

  /**
   * Check if system keychain is available
   */
  async isSystemKeychainAvailable(): Promise<boolean> {
    if (!this.config.useSystemKeychain) {
      return false;
    }

    try {
      // Test with a dummy secret to check availability
      const testName = `test-${Date.now()}`;
      await secrets.set({
        service: this.serviceName,
        name: testName,
        value: 'test'
      });
      
      // Clean up test secret
      await secrets.delete({
        service: this.serviceName,
        name: testName
      });
      
      return true;
    } catch (error) {
      console.warn('System keychain not available:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Get system keychain status and information with Windows enterprise details
   */
  async getSystemKeychainInfo(): Promise<{
    available: boolean;
    serviceName: string;
    platform: string;
    enabled: boolean;
    windowsEnterprise?: boolean;
    windowsTargetName?: string;
    credentialManagerPath?: string;
  }> {
    const available = await this.isSystemKeychainAvailable();
    
    const info: any = {
      available,
      serviceName: this.serviceName,
      platform: process.platform || 'unknown',
      enabled: this.config.useSystemKeychain || false
    };

    // Add Windows-specific enterprise information
    if (process.platform === 'win32') {
      info.windowsEnterprise = this.config.windowsEnterprise || false;
      info.windowsTargetName = this.config.windowsTargetName;
      info.credentialManagerPath = 'Control Panel → Credential Manager → Windows Credentials';
      
      if (this.config.windowsEnterprise) {
        console.log('🪟 Windows Enterprise Mode:');
        console.log(`   📍 Credential Manager: ${info.credentialManagerPath}`);
        console.log(`   🔐 Persistence: CRED_PERSIST_ENTERPRISE (per-user scope)`);
        console.log(`   🏢 Encryption: Windows Data Protection API`);
      }
    }
    
    return info;
  }

  /**
   * Store enterprise credentials with Windows-specific naming and persistence
   */
  async storeEnterpriseCredentials(type: 'api-key' | 'proxy' | 'custom', value: string, identifier?: string): Promise<boolean> {
    if (!this.config.useSystemKeychain) {
      console.warn('System keychain is disabled. Cannot store enterprise credentials.');
      return false;
    }

    try {
      let service = this.serviceName;
      let name = `${type}-${identifier || 'default'}`;
      
      if (process.platform === 'win32' && this.config.windowsEnterprise) {
        // Windows enterprise naming with proper prefixes
        service = this.config.windowsTargetName || `com.duoplus.enterprise.${this.serviceName}`;
        name = `DuoPlus_${type.replace('-', '_').toUpperCase()}_${identifier || 'Default'}`;
        
        console.log(`🪟 Storing enterprise credential: ${name}`);
        console.log(`   🏢 Service: ${service}`);
        console.log(`   🔐 Persistence: CRED_PERSIST_ENTERPRISE`);
      }

      await secrets.set({
        service,
        name,
        value
      });
      
      console.log(`✅ Enterprise ${type} stored securely`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to store enterprise ${type}:`, error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Retrieve enterprise credentials with Windows-specific naming
   */
  async getEnterpriseCredentials(type: 'api-key' | 'proxy' | 'custom', identifier?: string): Promise<string | null> {
    if (!this.config.useSystemKeychain) {
      console.warn('System keychain is disabled. Cannot retrieve enterprise credentials.');
      return null;
    }

    try {
      let service = this.serviceName;
      let name = `${type}-${identifier || 'default'}`;
      
      if (process.platform === 'win32' && this.config.windowsEnterprise) {
        service = this.config.windowsTargetName || `com.duoplus.enterprise.${this.serviceName}`;
        name = `DuoPlus_${type.replace('-', '_').toUpperCase()}_${identifier || 'Default'}`;
      }

      const value = await secrets.get({
        service,
        name
      });
      
      return value;
    } catch (error) {
      console.error(`❌ Failed to retrieve enterprise ${type}:`, error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * Delete enterprise credentials with Windows-specific naming
   */
  async deleteEnterpriseCredentials(type: 'api-key' | 'proxy' | 'custom', identifier?: string): Promise<boolean> {
    if (!this.config.useSystemKeychain) {
      console.warn('System keychain is disabled. Cannot delete enterprise credentials.');
      return false;
    }

    try {
      let service = this.serviceName;
      let name = `${type}-${identifier || 'default'}`;
      
      if (process.platform === 'win32' && this.config.windowsEnterprise) {
        service = this.config.windowsTargetName || `com.duoplus.enterprise.${this.serviceName}`;
        name = `DuoPlus_${type.replace('-', '_').toUpperCase()}_${identifier || 'Default'}`;
      }

      const deleted = await secrets.delete({
        service,
        name
      });
      
      if (deleted) {
        console.log(`✅ Enterprise ${type} deleted successfully`);
        if (process.platform === 'win32' && this.config.windowsEnterprise) {
          console.log(`   🏢 Removed from Windows Credential Manager`);
        }
      }
      return deleted;
    } catch (error) {
      console.error(`❌ Failed to delete enterprise ${type}:`, error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Rotate secret (create new hash for same secret)
   */
  async rotateSecret(secretId: string, newSecret: string): Promise<string> {
    const oldSecret = this.secrets.get(secretId);
    if (!oldSecret) {
      throw new Error('Secret not found');
    }
    
    const newStoredSecret = await this.hashSecret(newSecret, oldSecret.metadata);
    
    // Remove old secret and store new one
    this.secrets.delete(secretId);
    this.secrets.set(newStoredSecret.id, newStoredSecret);
    
    return newStoredSecret.id;
  }

  /**
   * Delete secret
   */
  deleteSecret(secretId: string): boolean {
    return this.secrets.delete(secretId);
  }

  /**
   * List all secrets (without exposing the actual secrets)
   */
  listSecrets(): Array<{
    id: string;
    algorithm: string;
    createdAt: Date;
    lastAccessed?: Date;
    metadata?: Record<string, any>;
  }> {
    return Array.from(this.secrets.values()).map(secret => ({
      id: secret.id,
      algorithm: secret.algorithm,
      createdAt: secret.createdAt,
      lastAccessed: secret.lastAccessed,
      metadata: secret.metadata
    }));
  }

  /**
   * Export secrets for backup (encrypted)
   */
  async exportSecrets(encryptionKey: string): Promise<string> {
    const secretsData = JSON.stringify(Array.from(this.secrets.entries()));
    const encrypted = await this.encryptData(secretsData, encryptionKey);
    return encrypted;
  }

  /**
   * Import secrets from backup
   */
  async importSecrets(encryptedData: string, encryptionKey: string): Promise<void> {
    const decrypted = await this.decryptData(encryptedData, encryptionKey);
    const secretsData = JSON.parse(decrypted);
    
    for (const [id, secret] of secretsData) {
      this.secrets.set(id, secret);
    }
  }

  /**
   * Simple encryption for backup/restore
   */
  private async encryptData(data: string, key: string): Promise<string> {
    // In a real implementation, use proper encryption
    // For now, use Bun's built-in crypto
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const keyBuffer = encoder.encode(key);
    
    // Simple XOR for demonstration (use proper encryption in production)
    const encrypted = new Uint8Array(dataBuffer.length);
    for (let i = 0; i < dataBuffer.length; i++) {
      encrypted[i] = dataBuffer[i] ^ keyBuffer[i % keyBuffer.length];
    }
    
    // Convert Uint8Array to base64 string
    let binary = '';
    for (let i = 0; i < encrypted.length; i++) {
      binary += String.fromCharCode(encrypted[i]);
    }
    
    return btoa(binary);
  }

  /**
   * Simple decryption for backup/restore
   */
  private async decryptData(encryptedData: string, key: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyBuffer = encoder.encode(key);
    
    const encrypted = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );
    
    const decrypted = new Uint8Array(encrypted.length);
    for (let i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ keyBuffer[i % keyBuffer.length];
    }
    
    return new TextDecoder().decode(decrypted);
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): {
    totalSecrets: number;
    secretsByAlgorithm: Record<string, number>;
    oldestSecret: Date | null;
    recentlyAccessed: number;
  } {
    const secrets = Array.from(this.secrets.values());
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const secretsByAlgorithm: Record<string, number> = {};
    let oldestSecret: Date | null = null;
    let recentlyAccessed = 0;
    
    for (const secret of secrets) {
      secretsByAlgorithm[secret.algorithm] = (secretsByAlgorithm[secret.algorithm] || 0) + 1;
      
      if (!oldestSecret || secret.createdAt < oldestSecret) {
        oldestSecret = secret.createdAt;
      }
      
      if (secret.lastAccessed && secret.lastAccessed > oneWeekAgo) {
        recentlyAccessed++;
      }
    }
    
    return {
      totalSecrets: secrets.length,
      secretsByAlgorithm,
      oldestSecret,
      recentlyAccessed
    };
  }
}
