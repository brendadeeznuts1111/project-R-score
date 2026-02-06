
// lib/security/integrated-secret-manager.ts
import { BunSecretsFallback } from '../bun-secrets-fallback';
import { r2Auth } from '../r2-auth';
import { versionGraph } from './version-graph';
import { docRefs } from '../docs/references';

export class IntegratedSecretManager {
  private auditLog: Array<{
    timestamp: string;
    action: string;
    key: string;
    user: string;
    metadata?: any;
  }> = [];
  
  async setSecret(service: string, name: string, value: string, user: string = 'system', metadata?: any): Promise<void> {
    try {
      // Store in Bun secrets (with fallback)
      await BunSecretsFallback.set(service, name, value);
      
      // Create version entry
      const key = `${service}:${name}`;
      await versionGraph.update(key, {
        version: `v${Date.now()}`,
        action: 'CREATE',
        timestamp: new Date().toISOString(),
        author: user,
        value: value.substring(0, 10) + '...', // Don't log full values
        metadata
      });
      
      // Log to audit
      this.logAudit('SET', key, user, metadata);
      
      // Backup to R2
      await this.backupToR2(key, value, user, metadata);
      
    } catch (error) {
      console.error(`Failed to set secret ${service}:${name}:`, error.message);
      throw error;
    }
  }
  
  async getSecret(service: string, name: string): Promise<string | undefined> {
    try {
      const key = `${service}:${name}`;
      const value = await BunSecretsFallback.get(service, name);
      
      if (value) {
        this.logAudit('GET', key, 'system');
      }
      
      return value;
    } catch (error) {
      console.error(`Failed to get secret ${service}:${name}:`, error.message);
      throw error;
    }
  }
  
  async deleteSecret(service: string, name: string, user: string = 'system'): Promise<void> {
    try {
      const key = `${service}:${name}`;
      
      // Delete from Bun secrets
      await BunSecretsFallback.delete(service, name);
      
      // Update version graph
      await versionGraph.update(key, {
        version: `v${Date.now()}`,
        action: 'DELETE',
        timestamp: new Date().toISOString(),
        author: user
      });
      
      // Log to audit
      this.logAudit('DELETE', key, user);
      
    } catch (error) {
      console.error(`Failed to delete secret ${service}:${name}:`, error.message);
      throw error;
    }
  }
  
  async getVersionHistory(service: string, name: string, limit: number = 10): Promise<any[]> {
    const key = `${service}:${name}`;
    return await versionGraph.getHistory(key, limit);
  }
  
  async rollbackToVersion(service: string, name: string, version: string, user: string = 'system'): Promise<void> {
    const key = `${service}:${name}`;
    const history = await versionGraph.getHistory(key, 50);
    const targetVersion = history.find(h => h.version === version);
    
    if (!targetVersion) {
      throw new Error(`Version ${version} not found for ${key}`);
    }
    
    // Restore the value (would need to be stored securely)
    // For now, just log the rollback
    await versionGraph.update(key, {
      version: `v${Date.now()}`,
      action: 'ROLLBACK',
      timestamp: new Date().toISOString(),
      author: user,
      rollbackTo: version
    });
    
    this.logAudit('ROLLBACK', key, user, { rollbackTo: version });
  }
  
  private async backupToR2(key: string, value: string, user: string, metadata?: any): Promise<void> {
    try {
      const backupData = {
        key,
        value, // In production, encrypt this
        timestamp: new Date().toISOString(),
        user,
        metadata,
        backupVersion: '1.0'
      };
      
      const backupKey = `secrets/backup/${key.replace(/:/g, '/')}/${Date.now()}.json`;
      await r2Auth.makeRequest(backupKey, 'PUT', JSON.stringify(backupData), {
        'backup-type': 'secret-backup',
        'user': user,
        'factorywager-version': '5.1'
      });
      
    } catch (error) {
      console.warn(`Failed to backup secret to R2: ${error.message}`);
      // Don't fail the operation if backup fails
    }
  }
  
  private logAudit(action: string, key: string, user: string, metadata?: any): void {
    this.auditLog.push({
      timestamp: new Date().toISOString(),
      action,
      key,
      user,
      metadata
    });
    
    // Keep audit log manageable
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-500);
    }
  }
  
  getAuditLog(limit: number = 100): any[] {
    return this.auditLog.slice(-limit);
  }
  
  // Get documentation reference
  getDocumentation(): any {
    return {
      secrets: docRefs.getSecretsRef(),
      factorywager: docRefs.getFactoryWagerRef(),
      references: docRefs.getByTag('secrets')
    };
  }
}

export const integratedSecretManager = new IntegratedSecretManager();
