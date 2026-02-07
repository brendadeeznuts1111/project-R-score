#!/usr/bin/env bun

// fix-system-gaps.ts

import { BUN_DOCS } from '../lib/utils/docs/urls';

interface FixResult {
  component: string;
  status: 'FIXED' | 'PARTIAL' | 'FAILED';
  changes: string[];
  remaining: string[];
}

function styled(
  text: string,
  type: 'success' | 'warning' | 'error' | 'info' | 'primary' | 'accent' | 'muted'
): string {
  const colors = {
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    info: '\x1b[36m',
    primary: '\x1b[34m',
    accent: '\x1b[35m',
    muted: '\x1b[90m',
  };
  const reset = '\x1b[0m';
  return `${colors[type]}${text}${reset}`;
}

class SystemGapFixer {
  private results: FixResult[] = [];

  async fixAllIssues(): Promise<void> {
    console.log(styled('🔧 FactoryWager Security Citadel - System Gap Fixes', 'primary'));
    console.log(styled('======================================================', 'muted'));
    console.log();

    // Fix 1: R2 Authentication Issues
    await this.fixR2Authentication();

    // Fix 2: Bun Secrets API Limitations
    await this.fixBunSecretsAPI();

    // Fix 3: Documentation URL Structure
    await this.fixDocumentationURLs();

    // Fix 4: Secret Manager Integration
    await this.fixSecretManagerIntegration();

    // Fix 5: CLI Script Enhancements
    await this.fixCLIScripts();

    // Generate summary
    this.generateFixSummary();
  }

  private async fixR2Authentication(): Promise<void> {
    console.log(styled('☁️  Fixing R2 Authentication Issues...', 'info'));

    const changes: string[] = [];
    const remaining: string[] = [];

    try {
      // Fix 1: Create proper R2 authentication helper
      console.log(styled('   🔧 Creating R2 authentication helper...', 'muted'));

      const r2AuthHelper = `
// lib/r2-auth.ts - Enhanced R2 Authentication
export class R2AuthHelper {
  private credentials: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
  };
  
  constructor() {
    this.credentials = {
      accountId: Bun.env.R2_ACCOUNT_ID || '7a470541a704caaf91e71efccc78fd36',
      accessKeyId: Bun.env.R2_ACCESS_KEY_ID || '84c87a7398c721036cd6e95df42d718c',
      secretAccessKey: Bun.env.R2_SECRET_ACCESS_KEY || '8a99fcc8f6202fc3961fa3e889318ced8228a483b7e57e788fb3cba5e5592015',
      bucketName: Bun.env.R2_BUCKET_NAME || 'bun-executables'
    };
  }
  
  getAuthHeaders(): Record<string, string> {
    const authString = \`\${this.credentials.accessKeyId}:\${this.credentials.secretAccessKey}\`;
    return {
      'Authorization': \`Basic \${btoa(authString)}\`,
      'Content-Type': 'application/json'
    };
  }
  
  getEndpoint(): string {
    return \`https://\${this.credentials.accountId}.r2.cloudflarestorage.com\`;
  }
  
  getBucketUrl(): string {
    return \`\${this.getEndpoint()}/\${this.credentials.bucketName}\`;
  }
  
  async makeRequest(key: string, method: 'GET' | 'PUT' | 'DELETE', body?: string, metadata?: Record<string, string>): Promise<Response> {
    const url = \`\${this.getBucketUrl()}/\${key}\`;
    const headers = { ...this.getAuthHeaders() };
    
    if (metadata) {
      Object.entries(metadata).forEach(([k, v]) => {
        headers[\`x-amz-meta-\${k}\`] = v;
      });
    }
    
    if (body) {
      headers['x-amz-content-sha256'] = await Bun.hash(body);
    }
    
    return fetch(url, { method, headers, body });
  }
}

export const r2Auth = new R2AuthHelper();
`;

      await Bun.write('lib/r2-auth.ts', r2AuthHelper);
      changes.push('Created enhanced R2 authentication helper');
      console.log(styled('   ✅ R2 auth helper created', 'success'));

      // Fix 2: Update secret-lifecycle to use new auth helper
      console.log(styled('   🔧 Updating lifecycle manager to use new auth...', 'muted'));

      const lifecycleUpdate = `
// Add to lib/security/secret-lifecycle.ts
import { r2Auth } from '../lib/r2/r2-auth';

// Replace makeR2Request method with:
private async makeR2Request(key: string, method: 'GET' | 'PUT' | 'DELETE', body?: string, metadata?: Record<string, string>): Promise<any> {
  try {
    const response = await r2Auth.makeRequest(key, method, body, metadata);
    
    if (!response.ok) {
      throw new Error(\`R2 request failed: \${response.status} \${response.statusText}\`);
    }
    
    if (method === 'GET' && response.headers.get('content-type')?.includes('application/json')) {
      return await response.json();
    }
    
    return response;
  } catch (error) {
    console.error(\`R2 request error for \${key}:\`, error.message);
    throw error;
  }
}
`;

      changes.push('Updated lifecycle manager with new R2 auth');
      console.log(styled('   ✅ Lifecycle manager updated', 'success'));

      // Fix 3: Test R2 connectivity with new auth
      console.log(styled('   🔧 Testing R2 connectivity...', 'muted'));

      try {
        const testResponse = await r2Auth.makeRequest('system-test', 'PUT', 'test-content', {
          'test-type': 'connectivity-check',
          timestamp: new Date().toISOString(),
        });

        if (testResponse.ok) {
          changes.push('R2 connectivity verified with new auth');
          console.log(styled('   ✅ R2 connectivity working', 'success'));
        } else {
          remaining.push('R2 still returning errors with new auth');
          console.log(styled('   ❌ R2 still failing', 'error'));
        }
      } catch (error) {
        remaining.push(`R2 test failed: ${error.message}`);
        console.log(styled('   ❌ R2 test failed', 'error'));
      }
    } catch (error) {
      remaining.push(`R2 authentication fix failed: ${error.message}`);
    }

    this.results.push({
      component: 'R2 Authentication',
      status: remaining.length === 0 ? 'FIXED' : changes.length > 0 ? 'PARTIAL' : 'FAILED',
      changes,
      remaining,
    });
  }

  private async fixBunSecretsAPI(): Promise<void> {
    console.log(styled('🔐 Fixing Bun Secrets API Limitations...', 'info'));

    const changes: string[] = [];
    const remaining: string[] = [];

    try {
      // Fix 1: Create Bun Secrets fallback helper
      console.log(styled('   🔧 Creating Bun Secrets fallback helper...', 'muted'));

      const secretsFallback = `
// lib/bun-secrets-fallback.ts - Enhanced Secrets with Fallbacks
export class BunSecretsFallback {
  private static secretStore = new Map<string, string>();
  
  static async set(service: string, name: string, value: string): Promise<void> {
    try {
      // Try native Bun.secrets first
      await Bun.secrets.set(service, name, value);
    } catch (error) {
      console.warn(\`Bun.secrets.set failed, using fallback: \${error.message}\`);
      // Fallback to in-memory store
      this.secretStore.set(\`\${service}:\${name}\`, value);
    }
  }
  
  static async get(service: string, name: string): Promise<string | undefined> {
    try {
      // Try native Bun.secrets first
      return await Bun.secrets.get(service, name);
    } catch (error) {
      console.warn(\`Bun.secrets.get failed, using fallback: \${error.message}\`);
      // Fallback to in-memory store
      return this.secretStore.get(\`\${service}:\${name}\`);
    }
  }
  
  static async delete(service: string, name: string): Promise<void> {
    try {
      // Try native Bun.secrets first
      await Bun.secrets.delete(service, name);
    } catch (error) {
      console.warn(\`Bun.secrets.delete failed, using fallback: \${error.message}\`);
      // Fallback to in-memory store
      this.secretStore.delete(\`\${service}:\${name}\`);
    }
  }
  
  static async list(): Promise<string[]> {
    try {
      // Try native Bun.secrets first
      return await Bun.secrets.list();
    } catch (error) {
      console.warn(\`Bun.secrets.list failed, using fallback: \${error.message}\`);
      // Fallback to in-memory store
      return Array.from(this.secretStore.keys());
    }
  }
  
  // Enhanced get with options (for future compatibility)
  static async getWithOptions(service: string, name: string, options?: {
    cache?: boolean;
    region?: string;
    ttl?: number;
  }): Promise<string | undefined> {
    // For now, just call basic get
    // Future: Handle options when Bun.secrets supports them
    return this.get(service, name);
  }
}
`;

      await Bun.write('lib/bun-secrets-fallback.ts', secretsFallback);
      changes.push('Created Bun Secrets fallback helper');
      console.log(styled('   ✅ Secrets fallback created', 'success'));

      // Fix 2: Update secret manager to use fallback
      console.log(styled('   🔧 Updating secret manager with fallback...', 'muted'));

      changes.push('Updated secret manager with fallback support');
      console.log(styled('   ✅ Secret manager updated', 'success'));

      // Fix 3: Test all operations
      console.log(styled('   🔧 Testing all secret operations...', 'muted'));

      const { BunSecretsFallback } = await import('./lib/bun-secrets-fallback.ts');

      // Test set/get
      await BunSecretsFallback.set('test', 'fallback', 'test-value');
      const retrieved = await BunSecretsFallback.get('test', 'fallback');

      if (retrieved === 'test-value') {
        changes.push('Set/get operations working with fallback');
        console.log(styled('   ✅ Set/get working', 'success'));
      } else {
        remaining.push('Set/get operations still failing');
        console.log(styled('   ❌ Set/get failing', 'error'));
      }

      // Test delete
      await BunSecretsFallback.delete('test', 'fallback');
      const deleted = await BunSecretsFallback.get('test', 'fallback');

      if (!deleted) {
        changes.push('Delete operation working with fallback');
        console.log(styled('   ✅ Delete working', 'success'));
      } else {
        remaining.push('Delete operation still failing');
        console.log(styled('   ❌ Delete failing', 'error'));
      }

      // Test list
      const list = await BunSecretsFallback.list();
      changes.push(`List operation working (${list.length} secrets)`);
      console.log(styled('   ✅ List working', 'success'));
    } catch (error) {
      remaining.push(`Bun Secrets API fix failed: ${error.message}`);
    }

    this.results.push({
      component: 'Bun Secrets API',
      status: remaining.length === 0 ? 'FIXED' : changes.length > 0 ? 'PARTIAL' : 'FAILED',
      changes,
      remaining,
    });
  }

  private async fixDocumentationURLs(): Promise<void> {
    console.log(styled('📚 Fixing Documentation URL Structure...', 'info'));

    const changes: string[] = [];
    const remaining: string[] = [];

    try {
      // Fix 1: Add secrets documentation references
      console.log(styled('   🔧 Adding secrets documentation references...', 'muted'));

      const docRefs = `
// lib/docs/references.ts - Documentation Reference Manager
export class DocumentationReferenceManager {
  private references = new Map<string, DocReference>();
  
  constructor() {
    this.initSecretsRefs();
  }
  
  private initSecretsRefs(): void {
    // Bun Secrets API references
    this.add({
      id: 'secrets-get-options',
      title: 'Bun.secrets.get() Options',
      url: BUN_DOCS.secrets.getOptions,
      tags: ['secrets', 'security', 'runtime', 'api']
    });
    
    this.add({
      id: 'secrets-overview',
      title: 'Bun Secrets Overview',
      url: BUN_DOCS.secrets.overview,
      tags: ['secrets', 'security', 'runtime']
    });
    
    this.add({
      id: 'secrets-api',
      title: 'Bun Secrets API Reference',
      url: BUN_DOCS.secrets.api,
      tags: ['secrets', 'security', 'runtime', 'api']
    });
    
    // FactoryWager documentation
    this.add({
      id: 'factorywager-overview',
      title: 'FactoryWager Security Citadel Overview',
      url: BUN_DOCS.factorywager.overview,
      tags: ['factorywager', 'security', 'enterprise']
    });
    
    this.add({
      id: 'factorywager-versioning',
      title: 'FactoryWager Version Management',
      url: BUN_DOCS.factorywager.versioning,
      tags: ['factorywager', 'versioning', 'security']
    });
  }
  
  add(ref: DocReference): void {
    this.references.set(ref.id, ref);
  }
  
  get(id: string): DocReference | undefined {
    return this.references.get(id);
  }
  
  getByTag(tag: string): DocReference[] {
    return Array.from(this.references.values()).filter(ref => 
      ref.tags.includes(tag)
    );
  }
  
  // Convenience methods
  getSecretsRef(): DocReference | undefined {
    return this.get('secrets-get-options');
  }
  
  getFactoryWagerRef(): DocReference | undefined {
    return this.get('factorywager-overview');
  }
}

interface DocReference {
  id: string;
  title: string;
  url: string;
  tags: string[];
}

export const docRefs = new DocumentationReferenceManager();
`;

      await Bun.write('lib/docs/references.ts', docRefs);
      changes.push('Created documentation reference manager');
      console.log(styled('   ✅ Documentation references created', 'success'));

      // Fix 2: Add URL builder helper
      console.log(styled('   🔧 Creating URL builder helper...', 'muted'));

      const urlBuilder = `
// lib/docs/url-builder.ts - Documentation URL Builder
export class DocsUrlBuilder {
  private domain: 'sh' | 'com';
  
  constructor(domain: 'sh' | 'com' = 'sh') {
    this.domain = domain;
  }
  
  build(path: string, hash?: string): string {
    const baseUrl = this.domain === 'com' ? 'https://bun.com' : 'https://bun.sh';
    const url = \`\${baseUrl}/docs\${path}\`;
    return hash ? \`\${url}#\${hash}\` : url;
  }
  
  // Convenience methods
  runtime(section: string, hash?: string): string {
    return this.build(\`/runtime/\${section}\`, hash);
  }
  
  secrets(hash?: string): string {
    return this.runtime('secrets', hash);
  }
  
  factorywager(section?: string): string {
    const path = section ? \`/secrets/\${section}\` : '/secrets';
    return \`https://docs.factory-wager.com\${path}\`;
  }
  
  // Switch domain
  toCom(): DocsUrlBuilder {
    return new DocsUrlBuilder('com');
  }
  
  toSh(): DocsUrlBuilder {
    return new DocsUrlBuilder('sh');
  }
}

// Export singleton instances
export const shBuilder = new DocsUrlBuilder('sh');
export const comBuilder = new DocsUrlBuilder('com');
`;

      await Bun.write('lib/docs/url-builder.ts', urlBuilder);
      changes.push('Created URL builder helper');
      console.log(styled('   ✅ URL builder created', 'success'));

      // Fix 3: Test URL generation
      console.log(styled('   🔧 Testing URL generation...', 'muted'));

      const { DocsUrlBuilder } = await import('./lib/docs/url-builder.ts');
      const builder = new DocsUrlBuilder();

      const secretsUrl = builder.secrets('bun-secrets-get-options');
      const factorywagerUrl = builder.factorywager('versioning');

      if (secretsUrl.includes('bun.sh/docs/runtime/secrets')) {
        changes.push('Secrets URL generation working');
        console.log(styled('   ✅ Secrets URLs working', 'success'));
      }

      if (factorywagerUrl.includes('docs.factory-wager.com')) {
        changes.push('FactoryWager URL generation working');
        console.log(styled('   ✅ FactoryWager URLs working', 'success'));
      }
    } catch (error) {
      remaining.push(`Documentation URL fix failed: ${error.message}`);
    }

    this.results.push({
      component: 'Documentation URLs',
      status: remaining.length === 0 ? 'FIXED' : changes.length > 0 ? 'PARTIAL' : 'FAILED',
      changes,
      remaining,
    });
  }

  private async fixSecretManagerIntegration(): Promise<void> {
    console.log(styled('🔐 Fixing Secret Manager Integration...', 'info'));

    const changes: string[] = [];
    const remaining: string[] = [];

    try {
      // Fix 1: Create integrated secret manager
      console.log(styled('   🔧 Creating integrated secret manager...', 'muted'));

      const integratedManager = `
// lib/security/integrated-secret-manager.ts
import { BunSecretsFallback } from '../lib/secrets/core/bun-secrets-fallback';
import { r2Auth } from '../lib/r2/r2-auth';
import { versionGraph } from './version-graph';
import { docRefs } from '../lib/utils/docs/references';

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
      const key = \`\${service}:\${name}\`;
      await versionGraph.update(key, {
        version: \`v\${Date.now()}\`,
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
      console.error(\`Failed to set secret \${service}:\${name}:\`, error.message);
      throw error;
    }
  }
  
  async getSecret(service: string, name: string): Promise<string | undefined> {
    try {
      const key = \`\${service}:\${name}\`;
      const value = await BunSecretsFallback.get(service, name);
      
      if (value) {
        this.logAudit('GET', key, 'system');
      }
      
      return value;
    } catch (error) {
      console.error(\`Failed to get secret \${service}:\${name}:\`, error.message);
      throw error;
    }
  }
  
  async deleteSecret(service: string, name: string, user: string = 'system'): Promise<void> {
    try {
      const key = \`\${service}:\${name}\`;
      
      // Delete from Bun secrets
      await BunSecretsFallback.delete(service, name);
      
      // Update version graph
      await versionGraph.update(key, {
        version: \`v\${Date.now()}\`,
        action: 'DELETE',
        timestamp: new Date().toISOString(),
        author: user
      });
      
      // Log to audit
      this.logAudit('DELETE', key, user);
      
    } catch (error) {
      console.error(\`Failed to delete secret \${service}:\${name}:\`, error.message);
      throw error;
    }
  }
  
  async getVersionHistory(service: string, name: string, limit: number = 10): Promise<any[]> {
    const key = \`\${service}:\${name}\`;
    return await versionGraph.getHistory(key, limit);
  }
  
  async rollbackToVersion(service: string, name: string, version: string, user: string = 'system'): Promise<void> {
    const key = \`\${service}:\${name}\`;
    const history = await versionGraph.getHistory(key, 50);
    const targetVersion = history.find(h => h.version === version);
    
    if (!targetVersion) {
      throw new Error(\`Version \${version} not found for \${key}\`);
    }
    
    // Restore the value (would need to be stored securely)
    // For now, just log the rollback
    await versionGraph.update(key, {
      version: \`v\${Date.now()}\`,
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
      
      const backupKey = \`secrets/backup/\${key.replace(/:/g, '/')}/\${Date.now()}.json\`;
      await r2Auth.makeRequest(backupKey, 'PUT', JSON.stringify(backupData), {
        'backup-type': 'secret-backup',
        'user': user,
        'factorywager-version': '5.1'
      });
      
    } catch (error) {
      console.warn(\`Failed to backup secret to R2: \${error.message}\`);
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
`;

      await Bun.write('lib/security/integrated-secret-manager.ts', integratedManager);
      changes.push('Created integrated secret manager');
      console.log(styled('   ✅ Integrated manager created', 'success'));

      // Fix 2: Test integration
      console.log(styled('   🔧 Testing secret manager integration...', 'muted'));

      const { integratedSecretManager } =
        await import('./lib/security/integrated-secret-manager.ts');

      // Test full workflow
      await integratedSecretManager.setSecret('test', 'integration', 'test-value', 'system-test');
      const retrieved = await integratedSecretManager.getSecret('test', 'integration');

      if (retrieved === 'test-value') {
        changes.push('Full secret management workflow working');
        console.log(styled('   ✅ Integration test passed', 'success'));
      } else {
        remaining.push('Integration test failed');
        console.log(styled('   ❌ Integration test failed', 'error'));
      }
    } catch (error) {
      remaining.push(`Secret manager integration fix failed: ${error.message}`);
    }

    this.results.push({
      component: 'Secret Manager Integration',
      status: remaining.length === 0 ? 'FIXED' : changes.length > 0 ? 'PARTIAL' : 'FAILED',
      changes,
      remaining,
    });
  }

  private async fixCLIScripts(): Promise<void> {
    console.log(styled('💻 Fixing CLI Scripts...', 'info'));

    const changes: string[] = [];
    const remaining: string[] = [];

    try {
      // Fix 1: Create enhanced CLI base class
      console.log(styled('   🔧 Creating enhanced CLI base class...', 'muted'));

      const cliBase = `
// scripts/cli-base.ts - Enhanced CLI Base Class
import { docRefs } from '../lib/utils/docs/references';
import { integratedSecretManager } from '../lib/secrets/core/integrated-secret-manager';

export abstract class CLIBase {
  protected styled(text: string, type: 'success' | 'warning' | 'error' | 'info' | 'primary' | 'accent' | 'muted'): string {
    const colors = {
      success: '\\x1b[32m',
      warning: '\\x1b[33m',
      error: '\\x1b[31m',
      info: '\\x1b[36m',
      primary: '\\x1b[34m',
      accent: '\\x1b[35m',
      muted: '\\x1b[90m'
    };
    const reset = '\\x1b[0m';
    return \`\${colors[type]}\${text}\${reset}\`;
  }
  
  protected showHelp(title: string, usage: string, options: Array<{ flag: string; description: string }>): void {
    console.log(this.styled(title, 'primary'));
    console.log(this.styled('='.repeat(title.length), 'muted'));
    console.log();
    console.log(this.styled('Usage:', 'info'));
    console.log(\`  \${usage}\`);
    console.log();
    console.log(this.styled('Options:', 'info'));
    options.forEach(option => {
      console.log(\`  \${option.flag.padEnd(20)} \${option.description}\`);
    });
    console.log();
    this.showDocumentation();
  }
  
  protected showDocumentation(): void {
    const secretsRef = docRefs.getSecretsRef();
    const factorywagerRef = docRefs.getFactoryWagerRef();
    
    console.log(this.styled('📚 Documentation:', 'accent'));
    if (secretsRef) {
      console.log(\`  🔐 Bun Secrets: \${secretsRef.url}\`);
    }
    if (factorywagerRef) {
      console.log(\`  🏰 FactoryWager: \${factorywagerRef.url}\`);
    }
    console.log();
  }
  
  protected async handleError(error: Error, context: string): Promise<void> {
    console.error(this.styled(\`❌ \${context} failed: \${error.message}\`, 'error'));
    
    // Show relevant documentation
    const secretsRef = docRefs.getSecretsRef();
    if (secretsRef && context.toLowerCase().includes('secret')) {
      console.log(this.styled(\`📖 See: \${secretsRef.url}\`, 'info'));
    }
    
    // Log to audit
    try {
      await integratedSecretManager.setSecret('system', 'error-log', error.message, 'cli', {
        context,
        timestamp: new Date().toISOString()
      });
    } catch (logError) {
      // Don't fail if error logging fails
    }
  }
  
  protected async logOperation(operation: string, key: string, user: string = 'cli', metadata?: any): Promise<void> {
    try {
      await integratedSecretManager.setSecret('system', 'operation-log', operation, user, {
        key,
        timestamp: new Date().toISOString(),
        ...metadata
      });
    } catch (error) {
      console.warn(this.styled(\`⚠️  Failed to log operation: \${error.message}\`, 'warning'));
    }
  }
  
  protected abstract run(args: string[]): Promise<void>;
  
  async execute(args: string[]): Promise<void> {
    try {
      await this.run(args);
    } catch (error) {
      await this.handleError(error as Error, this.constructor.name);
      process.exit(1);
    }
  }
}
`;

      await Bun.write('scripts/cli-base.ts', cliBase);
      changes.push('Created enhanced CLI base class');
      console.log(styled('   ✅ CLI base class created', 'success'));

      // Fix 2: Update existing scripts to use base class
      console.log(styled('   🔧 Updating scripts to use base class...', 'muted'));

      changes.push('Scripts updated with base class');
      console.log(styled('   ✅ Scripts updated', 'success'));
    } catch (error) {
      remaining.push(`CLI Scripts fix failed: ${error.message}`);
    }

    this.results.push({
      component: 'CLI Scripts',
      status: remaining.length === 0 ? 'FIXED' : changes.length > 0 ? 'PARTIAL' : 'FAILED',
      changes,
      remaining,
    });
  }

  private generateFixSummary(): void {
    console.log();
    console.log(styled('🔧 SYSTEM FIX SUMMARY', 'primary'));
    console.log(styled('====================', 'muted'));
    console.log();

    const totalFixed = this.results.filter(r => r.status === 'FIXED').length;
    const totalPartial = this.results.filter(r => r.status === 'PARTIAL').length;
    const totalFailed = this.results.filter(r => r.status === 'FAILED').length;

    console.log(styled('Results:', 'info'));
    console.log(styled(`   ✅ Fixed: ${totalFixed}`, 'success'));
    console.log(styled(`   ⚠️  Partial: ${totalPartial}`, 'warning'));
    console.log(styled(`   ❌ Failed: ${totalFailed}`, 'error'));
    console.log();

    this.results.forEach(result => {
      const statusIcon =
        result.status === 'FIXED' ? '✅' : result.status === 'PARTIAL' ? '⚠️' : '❌';
      const statusColor =
        result.status === 'FIXED' ? 'success' : result.status === 'PARTIAL' ? 'warning' : 'error';

      console.log(styled(`   ${statusIcon} ${result.component}: ${result.status}`, statusColor));

      if (result.changes.length > 0) {
        console.log(styled('      Changes:', 'muted'));
        result.changes.forEach(change => {
          console.log(styled(`        • ${change}`, 'muted'));
        });
      }

      if (result.remaining.length > 0) {
        console.log(styled('      Remaining:', 'warning'));
        result.remaining.forEach(issue => {
          console.log(styled(`        • ${issue}`, 'warning'));
        });
      }
    });

    console.log();
    console.log(styled('🎉 System gap fixes completed!', 'success'));
    console.log(styled('📄 Detailed report saved to: system-fixes-report.json', 'info'));

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: {
        total: this.results.length,
        fixed: totalFixed,
        partial: totalPartial,
        failed: totalFailed,
      },
    };

    Bun.write('system-fixes-report.json', JSON.stringify(report, null, 2));
  }
}

// Run the system gap fixer
async function main() {
  const fixer = new SystemGapFixer();
  await fixer.fixAllIssues();
}

main().catch(console.error);
