#!/usr/bin/env bun
// Bun.secrets Integration with R2 Support & Per-User Scoped Windows
// Cardinal Flags for Internal Wiki System

import { createHash } from 'crypto';

// Configuration interfaces
interface R2SecretConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  endpoint?: string;
}

interface UserScopedWindow {
  userId: string;
  windowId: string;
  cardinalFlags: {
    read: boolean;
    write: boolean;
    admin: boolean;
    share: boolean;
    export: boolean;
  };
  scope: 'private' | 'team' | 'public' | 'admin';
  createdAt: string;
  expiresAt?: string;
}

interface WikiSecretConfig {
  encryptionKey: string;
  signingKey: string;
  wikiVersion: string;
  features: {
    r2Integration: boolean;
    userScoping: boolean;
    cardinalFlags: boolean;
    encryption: boolean;
  };
}

/**
 * Bun.secrets Manager for R2 and Wiki Integration
 */
class BunSecretsManager {
  private secrets: Map<string, any> = new Map();
  private userWindows: Map<string, UserScopedWindow> = new Map();
  private wikiConfig: WikiSecretConfig;

  constructor() {
    this.initializeSecrets();
    this.wikiConfig = this.loadWikiConfig();
  }

  /**
   * Initialize Bun.secrets with R2 and Wiki configurations
   */
  private initializeSecrets(): void {
    // R2 Configuration Secrets
    this.secrets.set('R2_ACCOUNT_ID', process.env.R2_ACCOUNT_ID || Bun.env.R2_ACCOUNT_ID);
    this.secrets.set('R2_ACCESS_KEY_ID', process.env.R2_ACCESS_KEY_ID || Bun.env.R2_ACCESS_KEY_ID);
    this.secrets.set('R2_SECRET_ACCESS_KEY', process.env.R2_SECRET_ACCESS_KEY || Bun.env.R2_SECRET_ACCESS_KEY);
    this.secrets.set('R2_BUCKET_NAME', process.env.R2_BUCKET_NAME || Bun.env.R2_BUCKET_NAME || 'wiki-storage');
    this.secrets.set('R2_ENDPOINT', process.env.R2_ENDPOINT || Bun.env.R2_ENDPOINT);

    // Wiki Encryption Secrets
    this.secrets.set('WIKI_ENCRYPTION_KEY', process.env.WIKI_ENCRYPTION_KEY || Bun.env.WIKI_ENCRYPTION_KEY);
    this.secrets.set('WIKI_SIGNING_KEY', process.env.WIKI_SIGNING_KEY || Bun.env.WIKI_SIGNING_KEY);
    this.secrets.set('WIKI_VERSION', process.env.WIKI_VERSION || Bun.env.WIKI_VERSION || '3.6.0');

    // Cardinal Flag Secrets
    this.secrets.set('CARDINAL_ADMIN_KEY', process.env.CARDINAL_ADMIN_KEY || Bun.env.CARDINAL_ADMIN_KEY);
    this.secrets.set('CARDINAL_TEAM_KEY', process.env.CARDINAL_TEAM_KEY || Bun.env.CARDINAL_TEAM_KEY);
    this.secrets.set('CARDINAL_PUBLIC_KEY', process.env.CARDINAL_PUBLIC_KEY || Bun.env.CARDINAL_PUBLIC_KEY);

    console.log('🔐 Bun.secrets initialized with R2 and Wiki configurations');
  }

  /**
   * Load Wiki configuration from secrets
   */
  private loadWikiConfig(): WikiSecretConfig {
    return {
      encryptionKey: this.getSecret('WIKI_ENCRYPTION_KEY') || 'default-encryption-key',
      signingKey: this.getSecret('WIKI_SIGNING_KEY') || 'default-signing-key',
      wikiVersion: this.getSecret('WIKI_VERSION') || '3.6.0',
      features: {
        r2Integration: true,
        userScoping: true,
        cardinalFlags: true,
        encryption: true
      }
    };
  }

  /**
   * Get secret value
   */
  getSecret(key: string): string | undefined {
    return this.secrets.get(key);
  }

  /**
   * Get R2 configuration
   */
  getR2Config(): R2SecretConfig {
    return {
      accountId: this.getSecret('R2_ACCOUNT_ID') || '',
      accessKeyId: this.getSecret('R2_ACCESS_KEY_ID') || '',
      secretAccessKey: this.getSecret('R2_SECRET_ACCESS_KEY') || '',
      bucketName: this.getSecret('R2_BUCKET_NAME') || 'wiki-storage',
      endpoint: this.getSecret('R2_ENDPOINT')
    };
  }

  /**
   * Create per-user scoped window with cardinal flags
   */
  createUserScopedWindow(userId: string, scope: 'private' | 'team' | 'public' | 'admin' = 'private'): UserScopedWindow {
    const windowId = this.generateWindowId(userId);
    const cardinalFlags = this.assignCardinalFlags(userId, scope);

    const userWindow: UserScopedWindow = {
      userId,
      windowId,
      cardinalFlags,
      scope,
      createdAt: new Date().toISOString(),
      expiresAt: scope === 'public' ? undefined : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h expiry
    };

    this.userWindows.set(windowId, userWindow);
    console.log(`🪟 Created user scoped window: ${windowId} for user: ${userId} with scope: ${scope}`);
    
    return userWindow;
  }

  /**
   * Generate unique window ID
   */
  private generateWindowId(userId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return createHash('sha256')
      .update(`${userId}-${timestamp}-${random}`)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Assign cardinal flags based on user scope and secrets
   */
  private assignCardinalFlags(userId: string, scope: string): UserScopedWindow['cardinalFlags'] {
    const adminKey = this.getSecret('CARDINAL_ADMIN_KEY');
    const teamKey = this.getSecret('CARDINAL_TEAM_KEY');
    const publicAccessKey = this.getSecret('CARDINAL_PUBLIC_KEY');

    // Check user permissions against cardinal keys
    const userHash = createHash('sha256').update(userId).digest('hex');
    const isAdmin = adminKey ? createHash('sha256').update(`${userId}-${adminKey}`).digest('hex').substring(0, 8) === userHash.substring(0, 8) : false;
    const isTeam = teamKey ? createHash('sha256').update(`${userId}-${teamKey}`).digest('hex').substring(0, 8) === userHash.substring(0, 8) : false;

    switch (scope) {
      case 'admin':
        return {
          read: true,
          write: true,
          admin: true,
          share: true,
          export: true
        };
      case 'team':
        return {
          read: true,
          write: isTeam || isAdmin,
          admin: isAdmin,
          share: isTeam || isAdmin,
          export: true
        };
      case 'public':
        return {
          read: true,
          write: false,
          admin: false,
          share: false,
          export: false
        };
      case 'private':
      default:
        return {
          read: true,
          write: true,
          admin: isAdmin,
          share: isTeam || isAdmin,
          export: true
        };
    }
  }

  /**
   * Get user scoped window
   */
  getUserScopedWindow(windowId: string): UserScopedWindow | undefined {
    const window = this.userWindows.get(windowId);
    
    // Check if window has expired
    if (window && window.expiresAt && new Date(window.expiresAt) < new Date()) {
      this.userWindows.delete(windowId);
      return undefined;
    }
    
    return window;
  }

  /**
   * Validate cardinal flag permissions
   */
  validateCardinalPermission(windowId: string, action: keyof UserScopedWindow['cardinalFlags'], userId?: string): boolean {
    const window = this.getUserScopedWindow(windowId);
    
    if (!window) {
      return false;
    }

    // Validate user ownership if userId provided
    if (userId && window.userId !== userId) {
      // Check if user has cross-access permissions
      const userWindow = this.getUserScopedWindow(this.generateWindowId(userId));
      if (!userWindow || !userWindow.cardinalFlags.admin) {
        return false;
      }
    }

    return window.cardinalFlags[action];
  }

  /**
   * Upload wiki content to R2 with user scoping
   */
  async uploadWikiToR2(content: string, windowId: string, userId: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // Validate permissions
      if (!this.validateCardinalPermission(windowId, 'write', userId)) {
        return { success: false, error: 'Insufficient permissions to write to wiki' };
      }

      const window = this.getUserScopedWindow(windowId);
      if (!window) {
        return { success: false, error: 'Invalid window ID' };
      }

      const r2Config = this.getR2Config();
      const contentHash = createHash('sha256').update(content).digest('hex');
      
      // Encrypt content if encryption is enabled
      const encryptedContent = this.wikiConfig.features.encryption 
        ? this.encryptContent(content, windowId)
        : content;

      // Create R2 upload URL with user scoping
      const objectKey = `wiki/${window.scope}/${window.userId}/${contentHash}.md`;
      const uploadUrl = `https://${r2Config.accountId}.r2.cloudflarestorage.com/${r2Config.bucketName}/${objectKey}`;

      // Upload to R2
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `AWS ${r2Config.accessKeyId}:${this.generateSignature(objectKey, r2Config.secretAccessKey)}`,
          'Content-Type': 'text/markdown',
          'X-Wiki-Version': this.wikiConfig.wikiVersion,
          'X-User-Window': windowId,
          'X-User-Scope': window.scope,
          'X-Content-Hash': contentHash
        },
        body: encryptedContent
      });

      if (!response.ok) {
        throw new Error(`R2 upload failed: ${response.status} ${response.statusText}`);
      }

      console.log(`☁️ Wiki content uploaded to R2: ${objectKey}`);
      
      return { 
        success: true, 
        url: `r2://${r2Config.bucketName}/${objectKey}`,
        objectKey,
        contentHash
      };

    } catch (error) {
      console.error('❌ R2 upload error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Download wiki content from R2 with user scoping
   */
  async downloadWikiFromR2(objectKey: string, windowId: string, userId: string): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      // Validate permissions
      if (!this.validateCardinalPermission(windowId, 'read', userId)) {
        return { success: false, error: 'Insufficient permissions to read wiki' };
      }

      const window = this.getUserScopedWindow(windowId);
      if (!window) {
        return { success: false, error: 'Invalid window ID' };
      }

      const r2Config = this.getR2Config();
      const downloadUrl = `https://${r2Config.accountId}.r2.cloudflarestorage.com/${r2Config.bucketName}/${objectKey}`;

      // Download from R2
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `AWS ${r2Config.accessKeyId}:${this.generateSignature(objectKey, r2Config.secretAccessKey)}`,
          'X-User-Window': windowId,
          'X-User-Scope': window.scope
        }
      });

      if (!response.ok) {
        throw new Error(`R2 download failed: ${response.status} ${response.statusText}`);
      }

      let content = await response.text();

      // Decrypt content if encryption is enabled
      if (this.wikiConfig.features.encryption) {
        content = this.decryptContent(content, windowId);
      }

      console.log(`☁️ Wiki content downloaded from R2: ${objectKey}`);

      return { success: true, content };

    } catch (error) {
      console.error('❌ R2 download error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate AWS signature for R2 authentication
   */
  private generateSignature(objectKey: string, secretKey: string): string {
    const stringToSign = `PUT\n\napplication/octet-stream\n${new Date().toISOString()}\n/${objectKey}`;
    return createHash('sha256')
      .update(stringToSign)
      .update(secretKey)
      .digest('base64');
  }

  /**
   * Encrypt content with window-specific key
   */
  private encryptContent(content: string, windowId: string): string {
    const encryptionKey = this.wikiConfig.encryptionKey + windowId;
    const cipher = createHash('sha256').update(encryptionKey).digest('hex');
    
    // Simple XOR encryption (in production, use proper encryption)
    return Buffer.from(content).map(byte => byte ^ cipher.charCodeAt(0)).toString('base64');
  }

  /**
   * Decrypt content with window-specific key
   */
  private decryptContent(encryptedContent: string, windowId: string): string {
    const encryptionKey = this.wikiConfig.encryptionKey + windowId;
    const cipher = createHash('sha256').update(encryptionKey).digest('hex');
    
    // Simple XOR decryption (in production, use proper decryption)
    const encrypted = Buffer.from(encryptedContent, 'base64');
    return Buffer.from(encrypted.map(byte => byte ^ cipher.charCodeAt(0))).toString();
  }

  /**
   * List user's wiki windows
   */
  listUserWindows(userId: string): UserScopedWindow[] {
    return Array.from(this.userWindows.values())
      .filter(window => window.userId === userId && (!window.expiresAt || new Date(window.expiresAt) > new Date()));
  }

  /**
   * Get wiki configuration
   */
  getWikiConfig(): WikiSecretConfig {
    return this.wikiConfig;
  }

  /**
   * Cleanup expired windows
   */
  cleanupExpiredWindows(): void {
    const now = new Date();
    let cleaned = 0;
    
    for (const [windowId, window] of this.userWindows.entries()) {
      if (window.expiresAt && new Date(window.expiresAt) < now) {
        this.userWindows.delete(windowId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired windows`);
    }
  }
}

/**
 * Wiki Server with Bun.secrets Integration
 */
class WikiServer {
  private secretsManager: BunSecretsManager;

  constructor() {
    this.secretsManager = new BunSecretsManager();
  }

  /**
   * Start wiki server with R2 and user scoping
   */
  startServer(port: number = 3001): void {
    const self = this; // Store reference to this
    
    const server = Bun.serve({
      port,
      hostname: '0.0.0.0',
      
      async fetch(req) {
        const url = new URL(req.url);
        const path = url.pathname;

        // CORS headers
        const corsHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID, X-Window-ID'
        };

        if (req.method === 'OPTIONS') {
          return new Response(null, { headers: corsHeaders });
        }

        const userId = req.headers.get('X-User-ID') || 'anonymous';
        const windowId = req.headers.get('X-Window-ID');

        try {
          switch (path) {
            case '/':
              return self.serveDashboard(userId, windowId, corsHeaders);

            case '/api/window/create':
              if (req.method === 'POST') {
                return self.createWindow(req, corsHeaders);
              }
              break;

            case '/api/window/list':
              if (req.method === 'GET') {
                return self.listWindows(userId, corsHeaders);
              }
              break;

            case '/api/wiki/upload':
              if (req.method === 'POST') {
                return self.uploadWiki(req, corsHeaders);
              }
              break;

            case '/api/wiki/download':
              if (req.method === 'GET') {
                return self.downloadWiki(req, corsHeaders);
              }
              break;

            case '/api/secrets/config':
              if (req.method === 'GET') {
                return self.getSecretsConfig(corsHeaders);
              }
              break;

            default:
              return new Response('Not Found', { status: 404, headers: corsHeaders });
          }
        } catch (error) {
          console.error('Server error:', error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
      }
    });

    console.log(`🌐 Wiki Server with Bun.secrets started on port ${port}`);
    console.log(`📊 Dashboard: http://localhost:${port}`);
    console.log(`🔐 R2 Integration: ${this.secretsManager.getWikiConfig().features.r2Integration ? 'Enabled' : 'Disabled'}`);
    console.log(`👥 User Scoping: ${this.secretsManager.getWikiConfig().features.userScoping ? 'Enabled' : 'Disabled'}`);
    console.log(`🚩 Cardinal Flags: ${this.secretsManager.getWikiConfig().features.cardinalFlags ? 'Enabled' : 'Disabled'}`);

    // Cleanup expired windows every hour
    setInterval(() => {
      this.secretsManager.cleanupExpiredWindows();
    }, 60 * 60 * 1000);

    return server;
  }

  /**
   * Serve dashboard
   */
  private async serveDashboard(userId: string, windowId: string | null, corsHeaders: Record<string, string>): Promise<Response> {
    const windows = windowId ? [this.secretsManager.getUserScopedWindow(windowId)] : this.secretsManager.listUserWindows(userId);
    const config = this.secretsManager.getWikiConfig();

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wiki with Bun.secrets Integration</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; min-height: 100vh; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 40px; }
        .title { font-size: 3em; margin: 0; }
        .subtitle { font-size: 1.2em; opacity: 0.8; }
        .card { background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); padding: 25px; border-radius: 15px; margin: 20px 0; border: 1px solid rgba(255,255,255,0.2); }
        .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
        .feature { text-align: center; padding: 20px; }
        .feature-icon { font-size: 2em; margin-bottom: 10px; }
        .status { display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 0.9em; }
        .enabled { background: #4CAF50; }
        .disabled { background: #f44336; }
        .window-list { margin-top: 20px; }
        .window-item { background: rgba(255,255,255,0.05); padding: 15px; margin: 10px 0; border-radius: 8px; }
        .flags { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
        .flag { background: rgba(255,255,255,0.2); padding: 3px 8px; border-radius: 10px; font-size: 0.8em; }
        .actions { margin-top: 30px; }
        .btn { background: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px; }
        .btn:hover { background: #45a049; }
        .btn.secondary { background: #2196F3; }
        .btn.secondary:hover { background: #1976D2; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">🔐 Wiki with Bun.secrets</h1>
            <p class="subtitle">R2 Integration • User Scoping • Cardinal Flags</p>
        </div>

        <div class="card">
            <h3>🚀 Integration Features</h3>
            <div class="features">
                <div class="feature">
                    <div class="feature-icon">☁️</div>
                    <h4>R2 Storage</h4>
                    <span class="status ${config.features.r2Integration ? 'enabled' : 'disabled'}">
                        ${config.features.r2Integration ? 'Enabled' : 'Disabled'}
                    </span>
                </div>
                <div class="feature">
                    <div class="feature-icon">👥</div>
                    <h4>User Scoping</h4>
                    <span class="status ${config.features.userScoping ? 'enabled' : 'disabled'}">
                        ${config.features.userScoping ? 'Enabled' : 'Disabled'}
                    </span>
                </div>
                <div class="feature">
                    <div class="feature-icon">🚩</div>
                    <h4>Cardinal Flags</h4>
                    <span class="status ${config.features.cardinalFlags ? 'enabled' : 'disabled'}">
                        ${config.features.cardinalFlags ? 'Enabled' : 'Disabled'}
                    </span>
                </div>
                <div class="feature">
                    <div class="feature-icon">🔒</div>
                    <h4>Encryption</h4>
                    <span class="status ${config.features.encryption ? 'enabled' : 'disabled'}">
                        ${config.features.encryption ? 'Enabled' : 'Disabled'}
                    </span>
                </div>
            </div>
        </div>

        <div class="card">
            <h3>🪟 User Scoped Windows</h3>
            <div class="window-list">
                ${windows.length > 0 ? windows.map(window => window ? `
                    <div class="window-item">
                        <strong>Window ID:</strong> ${window.windowId}<br>
                        <strong>Scope:</strong> ${window.scope}<br>
                        <strong>Created:</strong> ${new Date(window.createdAt).toLocaleString()}<br>
                        <strong>Cardinal Flags:</strong>
                        <div class="flags">
                            ${Object.entries(window.cardinalFlags).map(([flag, enabled]) => 
                                `<span class="flag ${enabled ? 'enabled' : 'disabled'}">${flag}: ${enabled ? '✅' : '❌'}</span>`
                            ).join('')}
                        </div>
                    </div>
                ` : '').join('') : '<p>No windows found. Create a window to get started.</p>'}
            </div>
        </div>

        <div class="actions">
            <button class="btn" onclick="createWindow()">Create New Window</button>
            <button class="btn secondary" onclick="listWindows()">Refresh Windows</button>
            <button class="btn secondary" onclick="viewConfig()">View Configuration</button>
        </div>
    </div>

    <script>
        async function createWindow() {
            const scope = prompt('Enter scope (private/team/public/admin):', 'private');
            if (!scope) return;
            
            try {
                const response = await fetch('/api/window/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ scope, userId: 'demo-user' })
                });
                
                const result = await response.json();
                if (result.success) {
                    alert('Window created: ' + result.window.windowId);
                    location.reload();
                } else {
                    alert('Error: ' + result.error);
                }
            } catch (error) {
                alert('Error: ' + error.message);
            }
        }

        async function listWindows() {
            location.reload();
        }

        async function viewConfig() {
            try {
                const response = await fetch('/api/secrets/config');
                const config = await response.json();
                alert('Wiki Configuration:\\n' + JSON.stringify(config, null, 2));
            } catch (error) {
                alert('Error: ' + error.message);
            }
        }
    </script>
</body>
</html>`;

    return new Response(html, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html' }
    });
  }

  /**
   * Create new window API
   */
  private async createWindow(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
    try {
      const body = await req.json();
      const { scope, userId } = body;

      if (!userId || !scope) {
        return Response.json({ success: false, error: 'Missing userId or scope' }, {
          status: 400,
          headers: corsHeaders
        });
      }

      const window = this.secretsManager.createUserScopedWindow(userId, scope);

      return Response.json({
        success: true,
        window
      }, {
        headers: corsHeaders
      });

    } catch (error) {
      return Response.json({
        success: false,
        error: error.message
      }, {
        status: 500,
        headers: corsHeaders
      });
    }
  }

  /**
   * List windows API
   */
  private async listWindows(userId: string, corsHeaders: Record<string, string>): Promise<Response> {
    const windows = this.secretsManager.listUserWindows(userId);

    return Response.json({
      success: true,
      windows,
      count: windows.length
    }, {
      headers: corsHeaders
    });
  }

  /**
   * Upload wiki API
   */
  private async uploadWiki(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
    try {
      const userId = req.headers.get('X-User-ID') || 'anonymous';
      const windowId = req.headers.get('X-Window-ID');
      const content = await req.text();

      if (!windowId) {
        return Response.json({
          success: false,
          error: 'Missing X-Window-ID header'
        }, {
          status: 400,
          headers: corsHeaders
        });
      }

      const result = await this.secretsManager.uploadWikiToR2(content, windowId, userId);

      return Response.json(result, {
        headers: corsHeaders
      });

    } catch (error) {
      return Response.json({
        success: false,
        error: error.message
      }, {
        status: 500,
        headers: corsHeaders
      });
    }
  }

  /**
   * Download wiki API
   */
  private async downloadWiki(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
    try {
      const userId = req.headers.get('X-User-ID') || 'anonymous';
      const windowId = req.headers.get('X-Window-ID');
      const objectKey = new URL(req.url).searchParams.get('objectKey');

      if (!windowId || !objectKey) {
        return Response.json({
          success: false,
          error: 'Missing X-Window-ID header or objectKey parameter'
        }, {
          status: 400,
          headers: corsHeaders
        });
      }

      const result = await this.secretsManager.downloadWikiFromR2(objectKey, windowId, userId);

      if (result.success) {
        return new Response(result.content, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/markdown'
          }
        });
      } else {
        return Response.json(result, {
          status: 404,
          headers: corsHeaders
        });
      }

    } catch (error) {
      return Response.json({
        success: false,
        error: error.message
      }, {
        status: 500,
        headers: corsHeaders
      });
    }
  }

  /**
   * Get secrets configuration API
   */
  private async getSecretsConfig(corsHeaders: Record<string, string>): Promise<Response> {
    const config = this.secretsManager.getWikiConfig();
    const r2Config = this.secretsManager.getR2Config();

    return Response.json({
      wiki: config,
      r2: {
        ...r2Config,
        secretAccessKey: r2Config.secretAccessKey ? '***configured***' : undefined
      }
    }, {
      headers: corsHeaders
    });
  }
}

// Initialize and start the server
const wikiServer = new WikiServer();
wikiServer.startServer(3001);

export { BunSecretsManager, WikiServer, UserScopedWindow, R2SecretConfig, WikiSecretConfig };
