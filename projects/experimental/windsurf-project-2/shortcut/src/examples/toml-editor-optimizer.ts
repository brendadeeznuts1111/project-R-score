#!/usr/bin/env bun

/**
 * TOML Editor & Optimizer - Bun API Secrets Aligned
 * 
 * Enhanced service that follows Bun.api.secrets naming conventions
 * Provides real-time TOML editing, validation, and optimization
 * 
 * @see https://bun.sh/docs/api/secrets
 * @see https://github.com/oven-sh/bun
 */

import { Database } from 'bun:sqlite';
import { serve } from 'bun';

// Bun API Secrets Aligned Interface
interface BunSecretsConfig {
  secrets: {
    database_url: string;
    api_key: string;
    encryption_key: string;
    webhook_secret: string;
    jwt_secret: string;
    redis_url: string;
    storage_bucket: string;
    monitoring_token: string;
  };
  environment: 'development' | 'staging' | 'production';
  region: string;
  version: string;
}

interface TOMLOptimizationResult {
  original: string;
  optimized: string;
  compression_ratio: number;
  validation_errors: string[];
  security_issues: Array<{
    pattern: string;
    risk: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    suggestion: string;
  }>;
  performance_metrics: {
    parse_time: number;
    optimize_time: number;
    size_reduction: number;
  };
}

class TOMLEditorOptimizer {
  private db: Database;
  private secrets: BunSecretsConfig;
  
  constructor(secrets: Partial<BunSecretsConfig> = {}) {
    this.db = new Database(':memory:');
    this.setupDatabase();
    
    // Initialize with Bun API Secrets pattern
    this.secrets = {
      secrets: {
        database_url: secrets.secrets?.database_url || 'sqlite://memory',
        api_key: secrets.secrets?.api_key || Bun.env.API_KEY || 'dev-key',
        encryption_key: secrets.secrets?.encryption_key || Bun.env.ENCRYPTION_KEY || 'default-key',
        webhook_secret: secrets.secrets?.webhook_secret || Bun.env.WEBHOOK_SECRET || 'webhook-secret',
        jwt_secret: secrets.secrets?.jwt_secret || Bun.env.JWT_SECRET || 'jwt-secret',
        redis_url: secrets.secrets?.redis_url || 'redis://localhost:6379',
        storage_bucket: secrets.secrets?.storage_bucket || 'observatory-bucket',
        monitoring_token: secrets.secrets?.monitoring_token || 'monitoring-token'
      },
      environment: secrets.environment || 'development',
      region: secrets.region || 'us-east-1',
      version: secrets.version || '1.3.6+'
    };
  }
  
  private setupDatabase() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS toml_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT UNIQUE NOT NULL,
        content TEXT NOT NULL,
        optimized TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME DEFAULT (datetime('now', '+1 hour'))
      );
      
      CREATE TABLE IF NOT EXISTS optimization_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original_hash TEXT,
        optimization_score REAL,
        issues_fixed INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }
  
  /**
   * Parse and validate TOML content
   */
  async parseTOML(content: string): Promise<any> {
    const startTime = performance.now();
    
    try {
      // Simple TOML parser implementation (since 'toml' module is not available)
      const result = this.simpleTOMLParser(content);
      
      const parseTime = performance.now() - startTime;
      return { success: true, data: result, parse_time: parseTime };
    } catch (error) {
      const parseTime = performance.now() - startTime;
      return { 
        success: false, 
        error: (error as Error).message, 
        parse_time: parseTime 
      };
    }
  }
  
  /**
   * Simple TOML parser implementation
   */
  private simpleTOMLParser(content: string): any {
    const result: any = {};
    const lines = content.split('\n');
    let currentSection = result;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      // Section headers
      const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);
      if (sectionMatch) {
        const sectionPath = sectionMatch[1].split('.');
        currentSection = result;
        
        for (const section of sectionPath) {
          if (!currentSection[section]) {
            currentSection[section] = {};
          }
          currentSection = currentSection[section];
        }
        continue;
      }
      
      // Key-value pairs
      const keyValueMatch = trimmed.match(/^([^=]+)\s*=\s*(.+)$/);
      if (keyValueMatch) {
        const key = keyValueMatch[1].trim();
        let value = keyValueMatch[2].trim();
        
        // Remove quotes from string values
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        // Convert boolean values
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        // Convert numeric values
        else if (!isNaN(Number(value)) && value !== '') value = Number(value);
        
        currentSection[key] = value;
      }
    }
    
    return result;
  }
  
  /**
   * Optimize TOML content for performance and security
   */
  async optimizeTOML(content: string, options: {
    minify?: boolean;
    validate_security?: boolean;
    sort_keys?: boolean;
    remove_comments?: boolean;
  } = {}): Promise<TOMLOptimizationResult> {
    const startTime = performance.now();
    const originalSize = new Blob([content]).size;
    
    // Parse original content
    const parseResult = await this.parseTOML(content);
    if (!parseResult.success) {
      throw new Error(`TOML parsing failed: ${parseResult.error}`);
    }
    
    let optimized = content;
    let issues: typeof TOMLOptimizationResult.prototype.security_issues = [];
    
    // Security validation
    if (options.validate_security !== false) {
      issues = await this.validateSecurity(content);
    }
    
    // Optimization steps
    if (options.sort_keys) {
      optimized = await this.sortKeys(optimized);
    }
    
    if (options.remove_comments) {
      optimized = this.removeComments(optimized);
    }
    
    if (options.minify) {
      optimized = this.minifyTOML(optimized);
    }
    
    // Apply security fixes
    for (const issue of issues) {
      if (issue.risk === 'critical' || issue.risk === 'high') {
        optimized = this.applySecurityFix(optimized, issue);
      }
    }
    
    const optimizedSize = new Blob([optimized]).size;
    const optimizeTime = performance.now() - startTime;
    
    // Cache result
    const hash = Bun.hash.crc32(content).toString(16);
    this.db.run(
      'INSERT OR REPLACE INTO toml_cache (hash, content, optimized) VALUES (?, ?, ?)',
      [hash, content, optimized]
    );
    
    return {
      original: content,
      optimized,
      compression_ratio: originalSize > 0 ? (originalSize - optimizedSize) / originalSize : 0,
      validation_errors: [],
      security_issues: issues,
      performance_metrics: {
        parse_time: parseResult.parse_time,
        optimize_time: optimizeTime,
        size_reduction: originalSize - optimizedSize
      }
    };
  }
  
  /**
   * Validate security patterns in TOML content
   */
  private async validateSecurity(content: string): Promise<Array<{
    pattern: string;
    risk: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    suggestion: string;
  }>> {
    const issues: Array<{
      pattern: string;
      risk: 'critical' | 'high' | 'medium' | 'low';
      description: string;
      suggestion: string;
    }> = [];
    
    // Critical: Hardcoded secrets
    const secretPatterns = [
      /password\s*=\s*["'][^"']+["']/gi,
      /secret_key\s*=\s*["'][^"']+["']/gi,
      /api_key\s*=\s*["'][^"']+["']/gi,
      /jwt_secret\s*=\s*["'][^"']+["']/gi
    ];
    
    for (const pattern of secretPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          issues.push({
            pattern: match,
            risk: 'critical',
            description: 'Hardcoded secret detected in TOML',
            suggestion: 'Use environment variables or Bun.secrets API'
          });
        }
      }
    }
    
    // High: Insecure URLs
    const insecureUrlPattern = /https?:\/\/localhost:\d+/gi;
    const insecureMatches = content.match(insecureUrlPattern);
    if (insecureMatches) {
      for (const match of insecureMatches) {
        issues.push({
          pattern: match,
          risk: 'high',
          description: 'Insecure localhost URL detected',
          suggestion: 'Use environment-specific URLs or secure endpoints'
        });
      }
    }
    
    // Medium: Plain HTTP URLs
    const httpPattern = /http:\/\/[^localhost]/gi;
    const httpMatches = content.match(httpPattern);
    if (httpMatches) {
      for (const match of httpMatches) {
        issues.push({
          pattern: match,
          risk: 'medium',
          description: 'HTTP URL detected (non-HTTPS)',
          suggestion: 'Use HTTPS URLs for better security'
        });
      }
    }
    
    return issues;
  }
  
  /**
   * Sort keys alphabetically for better readability
   */
  private async sortKeys(content: string): Promise<string> {
    try {
      const parsed = await this.parseTOML(content);
      if (!parsed.success) return content;
      
      const sorted = this.sortObjectKeys(parsed.data);
      return this.stringifyTOML(sorted);
    } catch {
      return content;
    }
  }
  
  private sortObjectKeys(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(this.sortObjectKeys.bind(this));
    }
    
    if (obj && typeof obj === 'object') {
      const sorted: any = {};
      const keys = Object.keys(obj).sort();
      
      for (const key of keys) {
        sorted[key] = this.sortObjectKeys(obj[key]);
      }
      
      return sorted;
    }
    
    return obj;
  }
  
  /**
   * Remove comments from TOML
   */
  private removeComments(content: string): string {
    return content
      .split('\n')
      .map(line => line.replace(/#.*$/, '').trim())
      .filter(line => line.length > 0)
      .join('\n');
  }
  
  /**
   * Minify TOML by removing unnecessary whitespace
   */
  private minifyTOML(content: string): string {
    return content
      .replace(/\n\s*\n/g, '\n')  // Remove empty lines
      .replace(/^[ \t]+/gm, '')   // Remove leading whitespace
      .replace(/[ \t]+$/gm, '')   // Remove trailing whitespace
      .trim();
  }
  
  /**
   * Apply security fixes to TOML content
   */
  private applySecurityFix(content: string, issue: any): string {
    switch (issue.risk) {
      case 'critical':
        // Replace hardcoded secrets with environment variable references
        return content
          .replace(/password\s*=\s*["'][^"']+["']/gi, 'password = "${BUN_SECRETS_DATABASE_PASSWORD}"')
          .replace(/api_key\s*=\s*["'][^"']+["']/gi, 'api_key = "${BUN_SECRETS_API_KEY}"')
          .replace(/jwt_secret\s*=\s*["'][^"']+["']/gi, 'jwt_secret = "${BUN_SECRETS_JWT_SECRET}"');
      
      case 'high':
        // Replace localhost with environment variable
        return content.replace(
          /https?:\/\/localhost:\d+/gi,
          '${BUN_ENV_API_BASE_URL}'
        );
      
      default:
        return content;
    }
  }
  
  /**
   * Convert object back to TOML string
   */
  private stringifyTOML(obj: any): string {
    const lines: string[] = [];
    
    const processObject = (o: any, prefix = '') => {
      for (const [key, value] of Object.entries(o)) {
        if (value === null || value === undefined) continue;
        
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof value === 'object' && !Array.isArray(value)) {
          lines.push(`[${fullKey}]`);
          processObject(value, fullKey);
        } else if (Array.isArray(value)) {
          lines.push(`${key} = [${value.map(v => JSON.stringify(v)).join(', ')}]`);
        } else if (typeof value === 'string') {
          lines.push(`${key} = "${value}"`);
        } else if (typeof value === 'number') {
          lines.push(`${key} = ${value}`);
        } else if (typeof value === 'boolean') {
          lines.push(`${key} = ${value}`);
        }
      }
    };
    
    processObject(obj);
    return lines.join('\n');
  }
  
  /**
   * Get cached optimization result
   */
  getCachedResult(content: string): TOMLOptimizationResult | null {
    const hash = Bun.hash.crc32(content).toString(16);
    const row = this.db.query('SELECT * FROM toml_cache WHERE hash = ?').get(hash) as any;
    
    if (row) {
      return {
        original: row.content,
        optimized: row.optimized,
        compression_ratio: 0,
        validation_errors: [],
        security_issues: [],
        performance_metrics: {
          parse_time: 0,
          optimize_time: 0,
          size_reduction: 0
        }
      };
    }
    
    return null;
  }
  
  /**
   * Get optimization history
   */
  getOptimizationHistory(): any[] {
    return this.db.query('SELECT * FROM optimization_history ORDER BY timestamp DESC LIMIT 10').all();
  }
  
  /**
   * Get service environment (public getter)
   */
  getServiceEnvironment(): string {
    return this.secrets.environment;
  }
  
  /**
   * Get service region (public getter)
   */
  getServiceRegion(): string {
    return this.secrets.region;
  }
  
  /**
   * Get service version (public getter)
   */
  getServiceVersion(): string {
    return this.secrets.version;
  }
  
  /**
   * Check if secrets are configured (public getter)
   */
  hasSecretsConfigured(): boolean {
    return Object.keys(this.secrets.secrets).length > 0;
  }
}

// HTTP Server for TOML Editor & Optimizer
const editor = new TOMLEditorOptimizer();

const server = serve({
  port: 3001,
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
          return new Response(getEditorHTML(), {
            headers: { 'Content-Type': 'text/html', ...corsHeaders }
          });
        
        case '/api/optimize':
          if (req.method === 'POST') {
            const body = await req.json();
            const result = await editor.optimizeTOML(body.content, body.options);
            
            return new Response(JSON.stringify(result, null, 2), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }
          break;
        
        case '/api/validate':
          if (req.method === 'POST') {
            const body = await req.json();
            const result = await editor.parseTOML(body.content);
            
            return new Response(JSON.stringify(result, null, 2), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }
          break;
        
        case '/api/history':
          if (req.method === 'GET') {
            const history = editor.getOptimizationHistory();
            
            return new Response(JSON.stringify(history, null, 2), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }
          break;
        
        case '/api/secrets':
          if (req.method === 'GET') {
            // Return safe, non-sensitive configuration
            const safeConfig = {
              environment: editor.getServiceEnvironment(),
              region: editor.getServiceRegion(),
              version: editor.getServiceVersion(),
              has_secrets: editor.hasSecretsConfigured()
            };
            
            return new Response(JSON.stringify(safeConfig, null, 2), {
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

function getEditorHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TOML Editor & Optimizer - Bun API Secrets</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        .editor-container { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .monospace { font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; }
        .diff-added { background-color: #d4edda; }
        .diff-removed { background-color: #f8d7da; }
    </style>
</head>
<body class="bg-gray-50">
    <header class="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg">
        <div class="container mx-auto px-4 py-6">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <i class="fas fa-code text-3xl"></i>
                    <div>
                        <h1 class="text-2xl font-bold">TOML Editor & Optimizer</h1>
                        <p class="text-purple-100">Bun API Secrets Aligned Service</p>
                    </div>
                </div>
                <div class="flex items-center space-x-4">
                    <span class="bg-green-500 px-3 py-1 rounded-full text-sm font-semibold">
                        <i class="fas fa-circle text-xs mr-2"></i>Service Active
                    </span>
                    <button onclick="loadConfig()" class="bg-white text-purple-600 px-4 py-2 rounded-lg hover:bg-purple-50 transition">
                        <i class="fas fa-cog mr-2"></i>Load Config
                    </button>
                </div>
            </div>
        </div>
    </header>

    <main class="container mx-auto px-4 py-8">
        <!-- Control Panel -->
        <div class="bg-white rounded-xl shadow-md p-6 mb-8">
            <h2 class="text-xl font-bold text-gray-800 mb-4">Optimization Options</h2>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <label class="flex items-center space-x-2">
                    <input type="checkbox" id="minify" checked class="rounded text-purple-600">
                    <span>Minify</span>
                </label>
                <label class="flex items-center space-x-2">
                    <input type="checkbox" id="validate_security" checked class="rounded text-purple-600">
                    <span>Security Validation</span>
                </label>
                <label class="flex items-center space-x-2">
                    <input type="checkbox" id="sort_keys" class="rounded text-purple-600">
                    <span>Sort Keys</span>
                </label>
                <label class="flex items-center space-x-2">
                    <input type="checkbox" id="remove_comments" class="rounded text-purple-600">
                    <span>Remove Comments</span>
                </label>
            </div>
            <div class="mt-4 flex space-x-4">
                <button onclick="optimizeTOML()" class="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition">
                    <i class="fas fa-magic mr-2"></i>Optimize TOML
                </button>
                <button onclick="validateTOML()" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
                    <i class="fas fa-check-circle mr-2"></i>Validate Only
                </button>
                <button onclick="clearEditors()" class="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition">
                    <i class="fas fa-eraser mr-2"></i>Clear
                </button>
            </div>
        </div>

        <!-- Editor Container -->
        <div class="editor-container mb-8">
            <!-- Original TOML -->
            <div class="bg-white rounded-xl shadow-lg overflow-hidden">
                <div class="bg-gray-800 text-white p-4">
                    <h3 class="font-semibold flex items-center">
                        <i class="fas fa-edit mr-2"></i>
                        Original TOML
                    </h3>
                </div>
                <div class="p-4">
                    <textarea id="originalTOML" class="w-full h-96 p-4 border rounded-lg monospace text-sm" 
                        placeholder="# Enter your TOML content here...
[app]
name = \"My Application\"
version = \"1.0.0\"
database_url = \"http://localhost:5432/myapp\"
api_key = \"sk-1234567890abcdef\"

[features]
authentication = true
caching = true
logging = true"></textarea>
                </div>
            </div>

            <!-- Optimized TOML -->
            <div class="bg-white rounded-xl shadow-lg overflow-hidden">
                <div class="bg-green-800 text-white p-4">
                    <h3 class="font-semibold flex items-center">
                        <i class="fas fa-rocket mr-2"></i>
                        Optimized TOML
                    </h3>
                </div>
                <div class="p-4">
                    <textarea id="optimizedTOML" class="w-full h-96 p-4 border rounded-lg monospace text-sm bg-green-50" 
                        readonly placeholder="Optimized TOML will appear here..."></textarea>
                </div>
            </div>
        </div>

        <!-- Results Panel -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <!-- Performance Metrics -->
            <div class="bg-white rounded-xl shadow-md p-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <i class="fas fa-tachometer-alt text-purple-600 mr-2"></i>
                    Performance Metrics
                </h3>
                <div id="performanceMetrics" class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span>Parse Time:</span>
                        <span id="parseTime" class="font-mono">-</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Optimize Time:</span>
                        <span id="optimizeTime" class="font-mono">-</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Size Reduction:</span>
                        <span id="sizeReduction" class="font-mono">-</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Compression:</span>
                        <span id="compressionRatio" class="font-mono">-</span>
                    </div>
                </div>
            </div>

            <!-- Security Issues -->
            <div class="bg-white rounded-xl shadow-md p-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <i class="fas fa-shield-alt text-red-600 mr-2"></i>
                    Security Issues
                </h3>
                <div id="securityIssues" class="space-y-2 text-sm max-h-40 overflow-y-auto">
                    <p class="text-gray-500">No issues detected</p>
                </div>
            </div>

            <!-- Configuration -->
            <div class="bg-white rounded-xl shadow-md p-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <i class="fas fa-cog text-blue-600 mr-2"></i>
                    Service Configuration
                </h3>
                <div id="serviceConfig" class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span>Environment:</span>
                        <span id="environment" class="font-mono">-</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Region:</span>
                        <span id="region" class="font-mono">-</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Version:</span>
                        <span id="version" class="font-mono">-</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Secrets:</span>
                        <span id="hasSecrets" class="font-mono">-</span>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <script>
        async function optimizeTOML() {
            const content = document.getElementById('originalTOML').value;
            const options = {
                minify: document.getElementById('minify').checked,
                validate_security: document.getElementById('validate_security').checked,
                sort_keys: document.getElementById('sort_keys').checked,
                remove_comments: document.getElementById('remove_comments').checked
            };

            try {
                const response = await fetch('/api/optimize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content, options })
                });

                const result = await response.json();
                
                if (response.ok) {
                    document.getElementById('optimizedTOML').value = result.optimized;
                    updateMetrics(result);
                    updateSecurityIssues(result.security_issues);
                    showNotification('TOML optimized successfully!', 'success');
                } else {
                    showNotification(\`Error: \${result.error}\`, 'error');
                }
            } catch (error) {
                showNotification(\`Network error: \${error.message}\`, 'error');
            }
        }

        async function validateTOML() {
            const content = document.getElementById('originalTOML').value;

            try {
                const response = await fetch('/api/validate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content })
                });

                const result = await response.json();
                
                if (response.ok) {
                    if (result.success) {
                        showNotification('TOML is valid!', 'success');
                    } else {
                        showNotification(\`Validation error: \${result.error}\`, 'error');
                    }
                } else {
                    showNotification(\`Error: \${result.error}\`, 'error');
                }
            } catch (error) {
                showNotification(\`Network error: \${error.message}\`, 'error');
            }
        }

        function clearEditors() {
            document.getElementById('originalTOML').value = '';
            document.getElementById('optimizedTOML').value = '';
            clearMetrics();
            showNotification('Editors cleared', 'info');
        }

        function updateMetrics(result) {
            document.getElementById('parseTime').textContent = result.performance_metrics.parse_time.toFixed(2) + 'ms';
            document.getElementById('optimizeTime').textContent = result.performance_metrics.optimize_time.toFixed(2) + 'ms';
            document.getElementById('sizeReduction').textContent = result.performance_metrics.size_reduction + ' bytes';
            document.getElementById('compressionRatio').textContent = (result.compression_ratio * 100).toFixed(1) + '%';
        }

        function clearMetrics() {
            document.getElementById('parseTime').textContent = '-';
            document.getElementById('optimizeTime').textContent = '-';
            document.getElementById('sizeReduction').textContent = '-';
            document.getElementById('compressionRatio').textContent = '-';
        }

        function updateSecurityIssues(issues) {
            const container = document.getElementById('securityIssues');
            
            if (issues.length === 0) {
                container.innerHTML = '<p class="text-gray-500">No issues detected</p>';
                return;
            }

            container.innerHTML = issues.map(issue => \`
                <div class="p-2 rounded border-l-4 border-\${issue.risk === 'critical' ? 'red' : issue.risk === 'high' ? 'orange' : 'yellow'}-500 bg-\${issue.risk === 'critical' ? 'red' : issue.risk === 'high' ? 'orange' : 'yellow'}-50">
                    <div class="font-semibold text-\${issue.risk === 'critical' ? 'red' : issue.risk === 'high' ? 'orange' : 'yellow'}-800">
                        \${issue.pattern}
                    </div>
                    <div class="text-xs text-gray-600 mt-1">\${issue.description}</div>
                    <div class="text-xs text-blue-600 mt-1">\${issue.suggestion}</div>
                </div>
            \`).join('');
        }

        async function loadConfig() {
            try {
                const response = await fetch('/api/secrets');
                const config = await response.json();
                
                document.getElementById('environment').textContent = config.environment;
                document.getElementById('region').textContent = config.region;
                document.getElementById('version').textContent = config.version;
                document.getElementById('hasSecrets').textContent = config.has_secrets ? '✓ Configured' : '✗ Missing';
                
                showNotification('Configuration loaded', 'success');
            } catch (error) {
                showNotification(\`Failed to load config: \${error.message}\`, 'error');
            }
        }

        function showNotification(message, type) {
            const notification = document.createElement('div');
            notification.className = \`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 \${
                type === 'success' ? 'bg-green-500' : 
                type === 'error' ? 'bg-red-500' : 'bg-blue-500'
            }\`;
            notification.innerHTML = \`
                <div class="flex items-center">
                    <i class="fas fa-\${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'} mr-2"></i>
                    \${message}
                </div>
            \`;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 3000);
        }

        // Load configuration on page load
        loadConfig();
    </script>
</body>
</html>`;
}

console.log(`🚀 TOML Editor & Optimizer Service`);
console.log(`===================================`);
console.log(`📝 Editor: http://localhost:3001`);
console.log(`🔧 API: http://localhost:3001/api`);
console.log(`🔐 Secrets: Aligned with Bun API Secrets`);
console.log(`⏰ Started at ${new Date().toLocaleString()}`);
console.log(``);
console.log(`🎯 Features:`);
console.log(`   • Real-time TOML editing and optimization`);
console.log(`   • Security validation with Bun.secrets pattern`);
console.log(`   • Performance metrics and caching`);
console.log(`   • Interactive web interface`);
console.log(`   • CORS-enabled API endpoints`);
console.log(``);
console.log(`🔥 Open your browser and navigate to: http://localhost:3001`);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n🛑 Shutting down TOML Editor service...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\\n🛑 Shutting down TOML Editor service...');
  server.stop();
  process.exit(0);
});
