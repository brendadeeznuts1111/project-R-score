#!/usr/bin/env bun

/**
 * Bun Secrets Service - Enhanced TOML Management
 * 
 * Aligns with Bun.api.secrets naming conventions:
 * - BUN_SECRETS_DATABASE_PASSWORD
 * - BUN_SECRETS_API_KEY
 * - BUN_SECRETS_JWT_SECRET
 * - BUN_SECRETS_ENCRYPTION_KEY
 * 
 * @see https://bun.sh/docs/api/secrets
 */

import { Database } from 'bun:sqlite';
import { serve } from 'bun';

// Bun API Secrets aligned interfaces
interface BunSecretsManager {
  // Core secrets following Bun naming convention
  BUN_SECRETS_DATABASE_PASSWORD?: string;
  BUN_SECRETS_API_KEY?: string;
  BUN_SECRETS_JWT_SECRET?: string;
  BUN_SECRETS_ENCRYPTION_KEY?: string;
  BUN_SECRETS_WEBHOOK_SECRET?: string;
  BUN_SECRETS_REDIS_PASSWORD?: string;
  BUN_SECRETS_STORAGE_ACCESS_KEY?: string;
  BUN_SECRETS_MONITORING_TOKEN?: string;
  
  // Environment-specific secrets
  BUN_SECRETS_STRIPE_SECRET_KEY?: string;
  BUN_SECRETS_GITHUB_TOKEN?: string;
  BUN_SECRETS_AWS_ACCESS_KEY?: string;
  BUN_SECRETS_GOOGLE_CLIENT_SECRET?: string;
}

interface TOMLConfiguration {
  service: {
    name: string;
    version: string;
    environment: string;
    region: string;
  };
  database: {
    url: string;
    pool_size: number;
    timeout: number;
  };
  api: {
    base_url: string;
    key_ref: string; // Reference to BUN_SECRETS_API_KEY
    timeout: number;
  };
  security: {
    jwt_secret_ref: string; // Reference to BUN_SECRETS_JWT_SECRET
    encryption_key_ref: string; // Reference to BUN_SECRETS_ENCRYPTION_KEY
    webhook_secret_ref: string; // Reference to BUN_SECRETS_WEBHOOK_SECRET
  };
  integrations: {
    stripe?: {
      secret_key_ref: string; // Reference to BUN_SECRETS_STRIPE_SECRET_KEY
    };
    github?: {
      token_ref: string; // Reference to BUN_SECRETS_GITHUB_TOKEN
    };
    aws?: {
      access_key_ref: string; // Reference to BUN_SECRETS_AWS_ACCESS_KEY
    };
  };
}

class BunSecretsService {
  private db: Database;
  private secrets: BunSecretsManager = {} as BunSecretsManager;
  private config: TOMLConfiguration = {} as TOMLConfiguration;
  
  constructor() {
    this.db = new Database(':memory:');
    this.setupDatabase();
    this.loadSecrets();
    this.initializeConfiguration();
  }
  
  private setupDatabase() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS secrets_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        secret_name TEXT NOT NULL,
        action TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        environment TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS toml_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        template TEXT NOT NULL,
        category TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS configuration_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_hash TEXT NOT NULL,
        config_json TEXT NOT NULL,
        secrets_count INTEGER NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    this.seedTemplates();
  }
  
  private loadSecrets() {
    // Load secrets following Bun API Secrets pattern
    this.secrets = {
      BUN_SECRETS_DATABASE_PASSWORD: Bun.env.BUN_SECRETS_DATABASE_PASSWORD || 'default-db-password',
      BUN_SECRETS_API_KEY: Bun.env.BUN_SECRETS_API_KEY || 'dev-api-key-12345',
      BUN_SECRETS_JWT_SECRET: Bun.env.BUN_SECRETS_JWT_SECRET || 'dev-jwt-secret-67890',
      BUN_SECRETS_ENCRYPTION_KEY: Bun.env.BUN_SECRETS_ENCRYPTION_KEY || 'dev-encryption-key-abcdef',
      BUN_SECRETS_WEBHOOK_SECRET: Bun.env.BUN_SECRETS_WEBHOOK_SECRET || 'dev-webhook-secret-12345',
      BUN_SECRETS_REDIS_PASSWORD: Bun.env.BUN_SECRETS_REDIS_PASSWORD || 'dev-redis-password',
      BUN_SECRETS_STORAGE_ACCESS_KEY: Bun.env.BUN_SECRETS_STORAGE_ACCESS_KEY || 'dev-storage-key',
      BUN_SECRETS_MONITORING_TOKEN: Bun.env.BUN_SECRETS_MONITORING_TOKEN || 'dev-monitoring-token',
      
      // Third-party integrations
      BUN_SECRETS_STRIPE_SECRET_KEY: Bun.env.BUN_SECRETS_STRIPE_SECRET_KEY || 'sk_test_1234567890',
      BUN_SECRETS_GITHUB_TOKEN: Bun.env.BUN_SECRETS_GITHUB_TOKEN || 'ghp_1234567890abcdef',
      BUN_SECRETS_AWS_ACCESS_KEY: Bun.env.BUN_SECRETS_AWS_ACCESS_KEY || 'AKIAIOSFODNN7EXAMPLE',
      BUN_SECRETS_GOOGLE_CLIENT_SECRET: Bun.env.BUN_SECRETS_GOOGLE_CLIENT_SECRET || 'GOCSPX-1234567890abcdef'
    };
    
    console.log(`🔐 Loaded ${Object.keys(this.secrets).length} secrets following Bun API Secrets pattern`);
  }
  
  private initializeConfiguration() {
    this.config = {
      service: {
        name: 'bun-secrets-service',
        version: '1.3.6+',
        environment: Bun.env.NODE_ENV || 'development',
        region: Bun.env.AWS_REGION || 'us-east-1'
      },
      database: {
        url: 'postgresql://user:${BUN_SECRETS_DATABASE_PASSWORD}@localhost:5432/myapp',
        pool_size: 10,
        timeout: 30000
      },
      api: {
        base_url: 'https://api.example.com',
        key_ref: 'BUN_SECRETS_API_KEY',
        timeout: 10000
      },
      security: {
        jwt_secret_ref: 'BUN_SECRETS_JWT_SECRET',
        encryption_key_ref: 'BUN_SECRETS_ENCRYPTION_KEY',
        webhook_secret_ref: 'BUN_SECRETS_WEBHOOK_SECRET'
      },
      integrations: {
        stripe: {
          secret_key_ref: 'BUN_SECRETS_STRIPE_SECRET_KEY'
        },
        github: {
          token_ref: 'BUN_SECRETS_GITHUB_TOKEN'
        },
        aws: {
          access_key_ref: 'BUN_SECRETS_AWS_ACCESS_KEY'
        }
      }
    };
  }
  
  private seedTemplates() {
    const templates = [
      {
        name: 'basic-service',
        category: 'service',
        template: `# Basic Service Configuration
[service]
name = "my-service"
version = "1.0.0"
environment = "development"

[database]
url = "postgresql://user:\${BUN_SECRETS_DATABASE_PASSWORD}@localhost:5432/myapp"
pool_size = 10

[api]
base_url = "https://api.example.com"
key_ref = "BUN_SECRETS_API_KEY"`
      },
      {
        name: 'production-ready',
        category: 'production',
        template: `# Production Ready Configuration
[service]
name = "production-service"
version = "1.0.0"
environment = "production"
region = "us-east-1"

[database]
url = "postgresql://user:\${BUN_SECRETS_DATABASE_PASSWORD}@prod-db:5432/myapp"
pool_size = 20
timeout = 30000

[security]
jwt_secret_ref = "BUN_SECRETS_JWT_SECRET"
encryption_key_ref = "BUN_SECRETS_ENCRYPTION_KEY"
webhook_secret_ref = "BUN_SECRETS_WEBHOOK_SECRET"

[monitoring]
token_ref = "BUN_SECRETS_MONITORING_TOKEN"
enabled = true`
      },
      {
        name: 'microservices',
        category: 'microservices',
        template: `# Microservices Configuration
[service]
name = "microservice"
version = "1.0.0"
environment = "development"

[database]
url = "postgresql://user:\${BUN_SECRETS_DATABASE_PASSWORD}@postgres:5432/microservice"

[redis]
url = "redis://localhost:6379"
password_ref = "BUN_SECRETS_REDIS_PASSWORD"

[storage]
access_key_ref = "BUN_SECRETS_STORAGE_ACCESS_KEY"
bucket = "microservice-bucket"

[monitoring]
token_ref = "BUN_SECRETS_MONITORING_TOKEN"`
      }
    ];
    
    for (const template of templates) {
      this.db.run(
        'INSERT OR IGNORE INTO toml_templates (name, template, category) VALUES (?, ?, ?)',
        [template.name, template.template, template.category]
      );
    }
  }
  
  /**
   * Generate TOML configuration with secret references
   */
  generateTOML(templateName: string, customizations: Record<string, any> = {}): string {
    const template = this.db.query('SELECT template FROM toml_templates WHERE name = ?').get(templateName) as any;
    
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }
    
    let toml = template.template;
    
    // Apply customizations
    for (const [key, value] of Object.entries(customizations)) {
      const regex = new RegExp(`${key}\\s*=\\s*"[^"]*"`, 'g');
      toml = toml.replace(regex, `${key} = "${value}"`);
    }
    
    // Resolve secret references
    toml = this.resolveSecretReferences(toml);
    
    // Audit the generation
    this.auditSecretUsage(toml);
    
    return toml;
  }
  
  /**
   * Resolve ${BUN_SECRETS_*} references to actual values
   */
  resolveSecretReferences(toml: string): string {
    return toml.replace(/\$\{BUN_SECRETS_([^}]+)\}/g, (match, secretName) => {
      const fullSecretName = `BUN_SECRETS_${secretName}`;
      const value = this.secrets[fullSecretName as keyof BunSecretsManager];
      
      if (!value) {
        console.warn(`⚠️ Secret ${fullSecretName} not found, keeping reference`);
        return match;
      }
      
      return value;
    });
  }
  
  /**
   * Audit secret usage for security compliance
   */
  private auditSecretUsage(toml: string) {
    const secretReferences = toml.match(/\$\{BUN_SECRETS_[^}]+\}/g) || [];
    
    for (const ref of secretReferences) {
      this.db.run(
        'INSERT INTO secrets_audit (secret_name, action, environment) VALUES (?, ?, ?)',
        [ref, 'used', this.config.service.environment]
      );
    }
  }
  
  /**
   * Validate TOML configuration for security compliance
   */
  validateConfiguration(toml: string): {
    valid: boolean;
    issues: Array<{
      severity: 'error' | 'warning' | 'info';
      message: string;
      line?: number;
    }>;
  } {
    const issues: Array<{
      severity: 'error' | 'warning' | 'info';
      message: string;
      line?: number;
    }> = [];
    
    // Check for hardcoded secrets
    const lines = toml.split('\n');
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Critical: Hardcoded passwords or secrets
      if (trimmed.match(/password\s*=\s*"[^"]*"/) && !trimmed.includes('${BUN_SECRETS_')) {
        issues.push({
          severity: 'error',
          message: 'Hardcoded password detected. Use ${BUN_SECRETS_DATABASE_PASSWORD} instead.',
          line: index + 1
        });
      }
      
      // Warning: HTTP URLs in production
      if (trimmed.match(/http:\/\/[^localhost]/) && this.config.service.environment === 'production') {
        issues.push({
          severity: 'warning',
          message: 'HTTP URL detected in production. Use HTTPS for better security.',
          line: index + 1
        });
      }
      
      // Info: Missing secret references
      if (trimmed.includes('api_key') && !trimmed.includes('${BUN_SECRETS_API_KEY')) {
        issues.push({
          severity: 'info',
          message: 'Consider using ${BUN_SECRETS_API_KEY} for API key management.',
          line: index + 1
        });
      }
    });
    
    return {
      valid: issues.filter(i => i.severity === 'error').length === 0,
      issues
    };
  }
  
  /**
   * Get available templates
   */
  getTemplates(): Array<{ name: string; category: string; created_at: string }> {
    return this.db.query('SELECT name, category, created_at FROM toml_templates ORDER BY category, name').all() as any[];
  }
  
  /**
   * Get secret audit trail
   */
  getSecretAudit(limit: number = 50): Array<{
    secret_name: string;
    action: string;
    timestamp: string;
    environment: string;
  }> {
    return this.db.query(
      'SELECT secret_name, action, timestamp, environment FROM secrets_audit ORDER BY timestamp DESC LIMIT ?'
    ).all(limit) as any[];
  }
  
  /**
   * Export configuration with secrets resolved
   */
  exportConfiguration(templateName: string, resolveSecrets: boolean = false): string {
    const toml = this.generateTOML(templateName);
    
    if (!resolveSecrets) {
      return toml;
    }
    
    // Return resolved version (for development/testing only)
    return this.resolveSecretReferences(toml);
  }
  
  /**
   * Get service status
   */
  getServiceStatus(): {
    service: any;
    secrets_count: number;
    templates_count: number;
    environment: string;
  } {
    const secretsCount = Object.keys(this.secrets).length;
    const templatesCount = this.db.query('SELECT COUNT(*) as count FROM toml_templates').get() as any;
    
    return {
      service: this.config.service,
      secrets_count: secretsCount,
      templates_count: templatesCount.count,
      environment: this.config.service.environment
    };
  }
}

// HTTP Server for Bun Secrets Service
const secretsService = new BunSecretsService();

const server = serve({
  port: 3002,
  hostname: 'localhost',
  async fetch(req) {
    const url = new URL(req.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      switch (url.pathname) {
        case '/':
          return new Response(getServiceHTML(), {
            headers: { 'Content-Type': 'text/html', ...corsHeaders }
          });
        
        case '/api/status':
          if (req.method === 'GET') {
            const status = secretsService.getServiceStatus();
            
            return new Response(JSON.stringify(status, null, 2), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }
          break;
        
        case '/api/templates':
          if (req.method === 'GET') {
            const templates = secretsService.getTemplates();
            
            return new Response(JSON.stringify(templates, null, 2), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }
          break;
        
        case '/api/generate':
          if (req.method === 'POST') {
            const body = await req.json();
            const toml = secretsService.generateTOML(body.template, body.customizations);
            
            return new Response(JSON.stringify({ toml }, null, 2), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }
          break;
        
        case '/api/validate':
          if (req.method === 'POST') {
            const body = await req.json();
            const validation = secretsService.validateConfiguration(body.toml);
            
            return new Response(JSON.stringify(validation, null, 2), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }
          break;
        
        case '/api/export':
          if (req.method === 'POST') {
            const body = await req.json();
            const exported = secretsService.exportConfiguration(body.template, body.resolve_secrets);
            
            return new Response(JSON.stringify({ toml: exported }, null, 2), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }
          break;
        
        case '/api/audit':
          if (req.method === 'GET') {
            const audit = secretsService.getSecretAudit(parseInt(url.searchParams.get('limit') || '50'));
            
            return new Response(JSON.stringify(audit, null, 2), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }
          break;
        
        default:
          return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      return new Response(
        JSON.stringify({ error: (error as Error).message }, null, 2),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }
    
    return new Response('Method Not Allowed', { status: 405 });
  }
});

function getServiceHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bun Secrets Service - TOML Configuration Manager</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-gray-50">
    <header class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
        <div class="container mx-auto px-4 py-6">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <i class="fas fa-key text-3xl"></i>
                    <div>
                        <h1 class="text-2xl font-bold">Bun Secrets Service</h1>
                        <p class="text-indigo-100">TOML Configuration Manager - API Secrets Aligned</p>
                    </div>
                </div>
                <div class="flex items-center space-x-4">
                    <span class="bg-green-500 px-3 py-1 rounded-full text-sm font-semibold">
                        <i class="fas fa-circle text-xs mr-2"></i>Service Active
                    </span>
                    <button onclick="refreshStatus()" class="bg-white text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-50 transition">
                        <i class="fas fa-sync-alt mr-2"></i>Refresh
                    </button>
                </div>
            </div>
        </div>
    </header>

    <main class="container mx-auto px-4 py-8">
        <!-- Service Status -->
        <div class="bg-white rounded-xl shadow-md p-6 mb-8">
            <h2 class="text-xl font-bold text-gray-800 mb-4">Service Status</h2>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4" id="serviceStatus">
                <!-- Status will be loaded here -->
            </div>
        </div>

        <!-- Configuration Generator -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <!-- Template Selection -->
            <div class="bg-white rounded-xl shadow-lg p-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">
                    <i class="fas fa-file-code text-indigo-600 mr-2"></i>
                    Configuration Templates
                </h3>
                <div class="space-y-4">
                    <select id="templateSelect" class="w-full p-3 border rounded-lg">
                        <option value="">Select a template...</option>
                    </select>
                    
                    <div class="space-y-2">
                        <label class="block text-sm font-medium text-gray-700">Customizations</label>
                        <input type="text" id="serviceName" placeholder="Service name" class="w-full p-2 border rounded">
                        <input type="text" id="serviceVersion" placeholder="Version (e.g., 1.0.0)" class="w-full p-2 border rounded">
                        <input type="text" id="environment" placeholder="Environment" class="w-full p-2 border rounded">
                    </div>
                    
                    <div class="flex space-x-2">
                        <button onclick="generateConfig()" class="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
                            <i class="fas fa-cog mr-2"></i>Generate
                        </button>
                        <button onclick="validateConfig()" class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                            <i class="fas fa-check-circle mr-2"></i>Validate
                        </button>
                    </div>
                </div>
            </div>

            <!-- Generated Configuration -->
            <div class="bg-white rounded-xl shadow-lg p-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">
                    <i class="fas fa-code text-green-600 mr-2"></i>
                    Generated TOML
                </h3>
                <textarea id="generatedTOML" class="w-full h-64 p-4 border rounded-lg font-mono text-sm" 
                    placeholder="Generated TOML configuration will appear here..." readonly></textarea>
                <div class="mt-4 flex space-x-2">
                    <button onclick="exportConfig(false)" class="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
                        <i class="fas fa-download mr-2"></i>Export (Secrets Refs)
                    </button>
                    <button onclick="exportConfig(true)" class="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition">
                        <i class="fas fa-unlock mr-2"></i>Export (Resolved)
                    </button>
                </div>
            </div>
        </div>

        <!-- Validation Results -->
        <div class="bg-white rounded-xl shadow-md p-6 mb-8">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">
                <i class="fas fa-shield-alt text-red-600 mr-2"></i>
                Validation Results
            </h3>
            <div id="validationResults" class="space-y-2">
                <p class="text-gray-500">No validation performed yet</p>
            </div>
        </div>

        <!-- Audit Trail -->
        <div class="bg-white rounded-xl shadow-md p-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">
                <i class="fas fa-history text-purple-600 mr-2"></i>
                Secret Usage Audit Trail
            </h3>
            <div id="auditTrail" class="space-y-2 max-h-64 overflow-y-auto">
                <!-- Audit trail will be loaded here -->
            </div>
        </div>
    </main>

    <script>
        let templates = [];
        let currentConfig = '';

        async function loadTemplates() {
            try {
                const response = await fetch('/api/templates');
                templates = await response.json();
                
                const select = document.getElementById('templateSelect');
                select.innerHTML = '<option value="">Select a template...</option>';
                
                templates.forEach(template => {
                    const option = document.createElement('option');
                    option.value = template.name;
                    option.textContent = \`\${template.name} (\${template.category})\`;
                    select.appendChild(option);
                });
            } catch (error) {
                showNotification(\`Failed to load templates: \${error.message}\`, 'error');
            }
        }

        async function refreshStatus() {
            try {
                const response = await fetch('/api/status');
                const status = await response.json();
                
                const container = document.getElementById('serviceStatus');
                container.innerHTML = \`
                    <div class="text-center p-4 bg-blue-50 rounded-lg">
                        <div class="text-2xl font-bold text-blue-600">\${status.secrets_count}</div>
                        <div class="text-sm text-gray-600">Secrets Loaded</div>
                    </div>
                    <div class="text-center p-4 bg-green-50 rounded-lg">
                        <div class="text-2xl font-bold text-green-600">\${status.templates_count}</div>
                        <div class="text-sm text-gray-600">Templates</div>
                    </div>
                    <div class="text-center p-4 bg-purple-50 rounded-lg">
                        <div class="text-2xl font-bold text-purple-600">\${status.service.version}</div>
                        <div class="text-sm text-gray-600">Version</div>
                    </div>
                    <div class="text-center p-4 bg-orange-50 rounded-lg">
                        <div class="text-2xl font-bold text-orange-600">\${status.environment}</div>
                        <div class="text-sm text-gray-600">Environment</div>
                    </div>
                \`;
            } catch (error) {
                showNotification(\`Failed to load status: \${error.message}\`, 'error');
            }
        }

        async function generateConfig() {
            const templateName = document.getElementById('templateSelect').value;
            if (!templateName) {
                showNotification('Please select a template', 'warning');
                return;
            }

            const customizations = {};
            const serviceName = document.getElementById('serviceName').value;
            const serviceVersion = document.getElementById('serviceVersion').value;
            const environment = document.getElementById('environment').value;

            if (serviceName) customizations.name = \`"\${serviceName}"\`;
            if (serviceVersion) customizations.version = \`"\${serviceVersion}"\`;
            if (environment) customizations.environment = \`"\${environment}"\`;

            try {
                const response = await fetch('/api/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ template: templateName, customizations })
                });

                const result = await response.json();
                
                if (response.ok) {
                    currentConfig = result.toml;
                    document.getElementById('generatedTOML').value = result.toml;
                    showNotification('Configuration generated successfully!', 'success');
                } else {
                    showNotification(\`Error: \${result.error}\`, 'error');
                }
            } catch (error) {
                showNotification(\`Network error: \${error.message}\`, 'error');
            }
        }

        async function validateConfig() {
            if (!currentConfig) {
                showNotification('Please generate a configuration first', 'warning');
                return;
            }

            try {
                const response = await fetch('/api/validate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ toml: currentConfig })
                });

                const result = await response.json();
                
                if (response.ok) {
                    displayValidationResults(result);
                    showNotification(\`Validation complete: \${result.valid ? 'Valid' : 'Issues found'}\`, result.valid ? 'success' : 'warning');
                } else {
                    showNotification(\`Error: \${result.error}\`, 'error');
                }
            } catch (error) {
                showNotification(\`Network error: \${error.message}\`, 'error');
            }
        }

        function displayValidationResults(validation) {
            const container = document.getElementById('validationResults');
            
            if (validation.issues.length === 0) {
                container.innerHTML = '<p class="text-green-600 font-semibold">✅ No issues found</p>';
                return;
            }

            container.innerHTML = validation.issues.map(issue => \`
                <div class="p-3 rounded border-l-4 border-\${issue.severity === 'error' ? 'red' : issue.severity === 'warning' ? 'yellow' : 'blue'}-500 bg-\${issue.severity === 'error' ? 'red' : issue.severity === 'warning' ? 'yellow' : 'blue'}-50">
                    <div class="flex items-center">
                        <i class="fas fa-\${issue.severity === 'error' ? 'exclamation-triangle' : issue.severity === 'warning' ? 'exclamation-circle' : 'info-circle'} text-\${issue.severity === 'error' ? 'red' : issue.severity === 'warning' ? 'yellow' : 'blue'}-600 mr-2"></i>
                        <span class="font-medium">\${issue.message}</span>
                        \${issue.line ? \`<span class="ml-auto text-sm text-gray-500">Line \${issue.line}</span>\` : ''}
                    </div>
                </div>
            \`).join('');
        }

        async function exportConfig(resolveSecrets) {
            if (!currentConfig) {
                showNotification('Please generate a configuration first', 'warning');
                return;
            }

            const templateName = document.getElementById('templateSelect').value;
            if (!templateName) {
                showNotification('Please select a template', 'warning');
                return;
            }

            try {
                const response = await fetch('/api/export', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ template: templateName, resolve_secrets: resolveSecrets })
                });

                const result = await response.json();
                
                if (response.ok) {
                    // Download the file
                    const blob = new Blob([result.toml], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = \`config-\${templateName}\${resolveSecrets ? '-resolved' : '-secrets'}.toml\`;
                    a.click();
                    URL.revokeObjectURL(url);
                    
                    showNotification(\`Configuration exported (\${resolveSecrets ? 'secrets resolved' : 'secret references'})\`, 'success');
                } else {
                    showNotification(\`Error: \${result.error}\`, 'error');
                }
            } catch (error) {
                showNotification(\`Network error: \${error.message}\`, 'error');
            }
        }

        async function loadAuditTrail() {
            try {
                const response = await fetch('/api/audit?limit=20');
                const audit = await response.json();
                
                const container = document.getElementById('auditTrail');
                
                if (audit.length === 0) {
                    container.innerHTML = '<p class="text-gray-500">No audit entries found</p>';
                    return;
                }

                container.innerHTML = audit.map(entry => \`
                    <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div class="flex items-center">
                            <i class="fas fa-key text-purple-600 mr-2"></i>
                            <span class="font-mono text-sm">\${entry.secret_name}</span>
                        </div>
                        <div class="text-right">
                            <div class="text-xs text-gray-600">\${entry.action}</div>
                            <div class="text-xs text-gray-500">\${new Date(entry.timestamp).toLocaleString()}</div>
                        </div>
                    </div>
                \`).join('');
            } catch (error) {
                console.error('Failed to load audit trail:', error);
            }
        }

        function showNotification(message, type) {
            const notification = document.createElement('div');
            notification.className = \`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 \${
                type === 'success' ? 'bg-green-500' : 
                type === 'error' ? 'bg-red-500' : 
                type === 'warning' ? 'bg-orange-500' : 'bg-blue-500'
            }\`;
            notification.innerHTML = \`
                <div class="flex items-center">
                    <i class="fas fa-\${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'} mr-2"></i>
                    \${message}
                </div>
            \`;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 3000);
        }

        // Initialize on page load
        document.addEventListener('DOMContentLoaded', () => {
            loadTemplates();
            refreshStatus();
            loadAuditTrail();
        });
    </script>
</body>
</html>`;
}

console.log(`🔐 Bun Secrets Service`);
console.log(`======================`);
console.log(`🌐 Service: http://localhost:3002`);
console.log(`🔧 API: http://localhost:3002/api`);
console.log(`🔑 Secrets: Following Bun API Secrets pattern`);
console.log(`⏰ Started at ${new Date().toLocaleString()}`);
console.log(``);
console.log(`🎯 Features:`);
console.log(`   • TOML configuration generation with secret references`);
console.log(`   • Bun API Secrets aligned naming convention`);
console.log(`   • Security validation and audit trail`);
console.log(`   • Interactive web interface`);
console.log(`   • Template-based configuration management`);
console.log(``);
console.log(`🔥 Open your browser and navigate to: http://localhost:3002`);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n🛑 Shutting down Bun Secrets service...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\\n🛑 Shutting down Bun Secrets service...');
  server.stop();
  process.exit(0);
});
