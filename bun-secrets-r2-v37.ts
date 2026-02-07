#!/usr/bin/env bun
// Bun.secrets v3.7: Per-Session R2 Native Integration
// Combines user scoping with per-session profiling and native R2 uploads

import { createHash } from 'crypto';

// Configuration from Bun.secrets with fallbacks for testing
const R2_URL = Bun.env.R2_BUCKET_URL || 'https://r2.factory-wager.com';  // cf://r2.factory-wager.com
const SECRET = Bun.env.R2_SECRET || 'test-secret-key';  // Member link from Bun.secrets
const WIKI_ENCRYPTION_KEY = Bun.env.WIKI_ENCRYPTION_KEY || 'default-encryption-key';

// Enhanced session profile interface
interface SessionProfile {
  sessionId: string;
  member: string;
  timestamp: number;
  type: 'junior' | 'wiki' | 'performance' | 'security';
  profile: any;
  metadata: {
    sessionId: string;
    member: string;
    timestamp: number;
    signed: string;
    windowId?: string;
    scope?: string;
    encryptionEnabled: boolean;
    r2Native: boolean;
  };
}

/**
 * Per-Session R2 Native Upload (No Dependencies!)
 */
async function uploadSessionProfile(
  sessionId: string, 
  type: string, 
  profile: any, 
  member = 'anon',
  windowId?: string,
  scope = 'private'
): Promise<string> {
  const timestamp = Date.now();
  const path = `profiles/sessions/${sessionId}/${type}/${member}-${timestamp}.json`;
  
  // Enhanced metadata with window scoping
  const fullProfile = { 
    ...profile, 
    metadata: { 
      sessionId, 
      member, 
      timestamp, 
      signed: new Bun.CryptoHasher('sha256').update(JSON.stringify(profile) + SECRET).digest('hex'),
      windowId,
      scope,
      encryptionEnabled: !!windowId,
      r2Native: true,
      version: '3.7'
    } 
  };
  
  const res = await fetch(`${R2_URL}/${path}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'X-Session-ID': sessionId,
      'X-Member': member,
      'X-Window-ID': windowId || 'none',
      'X-Scope': scope,
      'X-Version': '3.7'
    },
    body: JSON.stringify(fullProfile)
  });
  
  if (!res.ok) {
    throw new Error(`R2 upload failed: ${res.status} ${res.statusText}`);
  }
  
  console.log(`✅ Uploaded: ${path} (${res.status}) | Size: ${(JSON.stringify(fullProfile).length/1024).toFixed(1)}KB | Window: ${windowId || 'none'}`);
  return path;
}

/**
 * JuniorRunner Integration with R2 Native
 */
export async function juniorProfileWithR2(mdFile: string, member: string, windowId?: string): Promise<string> {
  const sessionId = new Bun.CryptoHasher('sha256').update(Date.now().toString() + Math.random()).digest('hex').slice(0,8);
  
  // Mock juniorProfile function (in real implementation, this would be imported)
  const profile = await mockJuniorProfile(mdFile, { lspSafe: true });
  
  return uploadSessionProfile(sessionId, 'junior', profile, member, windowId);
}

/**
 * Wiki Profile Integration with R2 Native
 */
export async function wikiProfileWithR2(wikiContent: string, member: string, windowId?: string): Promise<string> {
  const sessionId = new Bun.CryptoHasher('sha256').update(Date.now().toString() + Math.random()).digest('hex').slice(0,8);
  
  // Mock wikiProfile function (in real implementation, this would be imported)
  const profile = await mockWikiProfile(wikiContent);
  
  return uploadSessionProfile(sessionId, 'wiki', profile, member, windowId);
}

/**
 * Enhanced Bun.secrets Manager with v3.7 R2 Native
 */
class BunSecretsManagerV37 {
  private secrets: Map<string, any> = new Map();
  private activeSessions: Map<string, SessionProfile> = new Map();
  private sessionMetrics: Map<string, { uploads: number; lastActivity: number }> = new Map();

  constructor() {
    this.initializeSecrets();
  }

  private initializeSecrets(): void {
    // Load R2 and secrets configuration
    this.secrets.set('R2_BUCKET_URL', R2_URL);
    this.secrets.set('R2_SECRET', SECRET);
    this.secrets.set('WIKI_ENCRYPTION_KEY', WIKI_ENCRYPTION_KEY);
    
    console.log('🔐 Bun.secrets v3.7 initialized with R2 Native support');
  }

  /**
   * Create per-session profile with R2 Native upload
   */
  async createSessionProfile(
    sessionId: string,
    type: 'junior' | 'wiki' | 'performance' | 'security',
    profile: any,
    member: string,
    windowId?: string,
    scope = 'private'
  ): Promise<string> {
    const sessionProfile: SessionProfile = {
      sessionId,
      member,
      timestamp: Date.now(),
      type,
      profile,
      metadata: {
        sessionId,
        member,
        timestamp: Date.now(),
        signed: new Bun.CryptoHasher('sha256').update(JSON.stringify(profile) + SECRET).digest('hex'),
        windowId,
        scope,
        encryptionEnabled: !!windowId,
        r2Native: true
      }
    };

    // Store in active sessions
    this.activeSessions.set(sessionId, sessionProfile);
    
    // Update metrics
    const metrics = this.sessionMetrics.get(sessionId) || { uploads: 0, lastActivity: Date.now() };
    metrics.uploads++;
    metrics.lastActivity = Date.now();
    this.sessionMetrics.set(sessionId, metrics);

    // Upload to R2 Native
    const path = await uploadSessionProfile(sessionId, type, profile, member, windowId, scope);
    
    console.log(`🌐 Session profile created: ${sessionId} | Type: ${type} | Member: ${member} | Path: ${path}`);
    
    return path;
  }

  /**
   * Get active session
   */
  getSession(sessionId: string): SessionProfile | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * List active sessions
   */
  listActiveSessions(): SessionProfile[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get session metrics
   */
  getSessionMetrics(sessionId: string): { uploads: number; lastActivity: number } | undefined {
    return this.sessionMetrics.get(sessionId);
  }

  /**
   * Cleanup old sessions
   */
  cleanupOldSessions(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [sessionId, profile] of this.activeSessions.entries()) {
      if (now - profile.timestamp > maxAge) {
        this.activeSessions.delete(sessionId);
        this.sessionMetrics.delete(sessionId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} old sessions`);
    }
  }

  /**
   * Generate session ID with window scoping
   */
  generateSessionId(windowId?: string): string {
    const base = Date.now().toString() + Math.random();
    const scoped = windowId ? `${base}-${windowId}` : base;
    return new Bun.CryptoHasher('sha256').update(scoped).digest('hex').slice(0, 8);
  }
}

/**
 * Enhanced Wiki Server with v3.7 R2 Native Integration
 */
class WikiServerV37 {
  private secretsManager: BunSecretsManagerV37;

  constructor() {
    this.secretsManager = new BunSecretsManagerV37();
  }

  /**
   * Start enhanced wiki server
   */
  startServer(port: number = 3002): void {
    const self = this;
    
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
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID, X-Window-ID, X-Session-ID'
        };

        if (req.method === 'OPTIONS') {
          return new Response(null, { headers: corsHeaders });
        }

        const userId = req.headers.get('X-User-ID') || 'anonymous';
        const windowId = req.headers.get('X-Window-ID');
        const sessionId = req.headers.get('X-Session-ID');

        try {
          switch (path) {
            case '/':
              return self.serveDashboardV37(userId, windowId, sessionId, corsHeaders);

            case '/api/session/create':
              if (req.method === 'POST') {
                return self.createSession(req, corsHeaders);
              }
              break;

            case '/api/session/profile':
              if (req.method === 'POST') {
                return self.uploadSessionProfile(req, corsHeaders);
              }
              break;

            case '/api/session/list':
              if (req.method === 'GET') {
                return self.listSessions(req, corsHeaders);
              }
              break;

            case '/api/session/metrics':
              if (req.method === 'GET') {
                return self.getSessionMetrics(req, corsHeaders);
              }
              break;

            case '/api/junior/profile':
              if (req.method === 'POST') {
                return self.juniorProfile(req, corsHeaders);
              }
              break;

            case '/api/wiki/profile':
              if (req.method === 'POST') {
                return self.wikiProfile(req, corsHeaders);
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

    console.log(`🌐 Wiki Server v3.7 with R2 Native started on port ${port}`);
    console.log(`📊 Dashboard: http://localhost:${port}`);
    console.log(`🚀 R2 Native: ${R2_URL}`);
    console.log(`🔐 Secrets: Loaded`);

    // Cleanup old sessions every hour
    setInterval(() => {
      this.secretsManager.cleanupOldSessions();
    }, 60 * 60 * 1000);

    return server;
  }

  /**
   * Serve v3.7 dashboard
   */
  private async serveDashboardV37(userId: string, windowId: string | null, sessionId: string | null, corsHeaders: Record<string, string>): Promise<Response> {
    const activeSessions = this.secretsManager.listActiveSessions();
    const currentSession = sessionId ? this.secretsManager.getSession(sessionId) : null;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wiki v3.7 - R2 Native Integration</title>
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
        .session-list { margin-top: 20px; }
        .session-item { background: rgba(255,255,255,0.05); padding: 15px; margin: 10px 0; border-radius: 8px; }
        .actions { margin-top: 30px; }
        .btn { background: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px; }
        .btn:hover { background: #45a049; }
        .btn.secondary { background: #2196F3; }
        .btn.secondary:hover { background: #1976D2; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 20px; }
        .metric { text-align: center; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px; }
        .metric-value { font-size: 2em; font-weight: bold; }
        .metric-label { font-size: 0.9em; opacity: 0.8; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">🚀 Wiki v3.7</h1>
            <p class="subtitle">R2 Native • Per-Session • No Dependencies</p>
        </div>

        <div class="card">
            <h3>🌟 v3.7 Features</h3>
            <div class="features">
                <div class="feature">
                    <div class="feature-icon">☁️</div>
                    <h4>R2 Native</h4>
                    <span class="status enabled">Enabled</span>
                    <p>Direct R2 uploads<br>No dependencies</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">🔄</div>
                    <h4>Per-Session</h4>
                    <span class="status enabled">Enabled</span>
                    <p>Session-based profiling<br>Isolated uploads</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">🔐</div>
                    <h4>Bun.secrets</h4>
                    <span class="status enabled">Enabled</span>
                    <p>Secure credentials<br>Window scoping</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">⚡</div>
                    <h4>Zero Deps</h4>
                    <span class="status enabled">Enabled</span>
                    <p>Native Bun APIs<br>Maximum performance</p>
                </div>
            </div>
        </div>

        <div class="card">
            <h3>📊 Session Metrics</h3>
            <div class="metrics">
                <div class="metric">
                    <div class="metric-value">${activeSessions.length}</div>
                    <div class="metric-label">Active Sessions</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${activeSessions.reduce((sum, s) => sum + (this.secretsManager.getSessionMetrics(s.sessionId)?.uploads || 0), 0)}</div>
                    <div class="metric-label">Total Uploads</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${activeSessions.filter(s => s.type === 'junior').length}</div>
                    <div class="metric-label">Junior Profiles</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${activeSessions.filter(s => s.type === 'wiki').length}</div>
                    <div class="metric-label">Wiki Profiles</div>
                </div>
            </div>
        </div>

        <div class="card">
            <h3>🔄 Active Sessions</h3>
            <div class="session-list">
                ${activeSessions.length > 0 ? activeSessions.map(session => `
                    <div class="session-item">
                        <strong>Session ID:</strong> ${session.sessionId}<br>
                        <strong>Type:</strong> ${session.type}<br>
                        <strong>Member:</strong> ${session.member}<br>
                        <strong>Window:</strong> ${session.metadata.windowId || 'none'}<br>
                        <strong>Scope:</strong> ${session.metadata.scope}<br>
                        <strong>Created:</strong> ${new Date(session.timestamp).toLocaleString()}<br>
                        <strong>R2 Native:</strong> ${session.metadata.r2Native ? '✅' : '❌'}
                    </div>
                `).join('') : '<p>No active sessions. Create a session to get started.</p>'}
            </div>
        </div>

        <div class="actions">
            <button class="btn" onclick="createSession()">Create Session</button>
            <button class="btn secondary" onclick="juniorProfile()">Junior Profile</button>
            <button class="btn secondary" onclick="wikiProfile()">Wiki Profile</button>
            <button class="btn secondary" onclick="refreshSessions()">Refresh</button>
        </div>
    </div>

    <script>
        let currentSessionId = null;

        async function createSession() {
            try {
                const response = await fetch('/api/session/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        userId: 'demo-user',
                        type: 'junior',
                        member: 'demo-member'
                    })
                });
                
                const result = await response.json();
                if (result.success) {
                    currentSessionId = result.sessionId;
                    alert('Session created: ' + result.sessionId);
                    location.reload();
                } else {
                    alert('Error: ' + result.error);
                }
            } catch (error) {
                alert('Error: ' + error.message);
            }
        }

        async function juniorProfile() {
            if (!currentSessionId) {
                alert('Please create a session first');
                return;
            }
            
            try {
                const response = await fetch('/api/junior/profile', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-Session-ID': currentSessionId
                    },
                    body: JSON.stringify({
                        mdFile: '# Test Markdown\\nThis is a test.',
                        member: 'demo-member'
                    })
                });
                
                const result = await response.json();
                if (result.success) {
                    alert('Junior profile uploaded: ' + result.path);
                    location.reload();
                } else {
                    alert('Error: ' + result.error);
                }
            } catch (error) {
                alert('Error: ' + error.message);
            }
        }

        async function wikiProfile() {
            if (!currentSessionId) {
                alert('Please create a session first');
                return;
            }
            
            try {
                const response = await fetch('/api/wiki/profile', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-Session-ID': currentSessionId
                    },
                    body: JSON.stringify({
                        wikiContent: '# Wiki Content\\nThis is wiki content.',
                        member: 'demo-member'
                    })
                });
                
                const result = await response.json();
                if (result.success) {
                    alert('Wiki profile uploaded: ' + result.path);
                    location.reload();
                } else {
                    alert('Error: ' + result.error);
                }
            } catch (error) {
                alert('Error: ' + error.message);
            }
        }

        function refreshSessions() {
            location.reload();
        }
    </script>
</body>
</html>`;

    return new Response(html, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html' }
    });
  }

  /**
   * Create session API
   */
  private async createSession(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
    try {
      const body = await req.json();
      const { userId, type, member, windowId, scope } = body;

      const sessionId = this.secretsManager.generateSessionId(windowId);
      
      // Create initial session profile
      const initialProfile = {
        created: true,
        type,
        userId,
        createdAt: new Date().toISOString()
      };

      const path = await this.secretsManager.createSessionProfile(
        sessionId, 
        type, 
        initialProfile, 
        member, 
        windowId, 
        scope
      );

      return Response.json({
        success: true,
        sessionId,
        path,
        session: this.secretsManager.getSession(sessionId)
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
   * Upload session profile API
   */
  private async uploadSessionProfile(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
    try {
      const sessionId = req.headers.get('X-Session-ID');
      const body = await req.json();
      const { type, profile, member, windowId, scope } = body;

      if (!sessionId) {
        return Response.json({
          success: false,
          error: 'Missing X-Session-ID header'
        }, {
          status: 400,
          headers: corsHeaders
        });
      }

      const path = await this.secretsManager.createSessionProfile(
        sessionId,
        type,
        profile,
        member,
        windowId,
        scope
      );

      return Response.json({
        success: true,
        path,
        sessionId
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
   * List sessions API
   */
  private async listSessions(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
    const sessions = this.secretsManager.listActiveSessions();

    return Response.json({
      success: true,
      sessions,
      count: sessions.length
    }, {
      headers: corsHeaders
    });
  }

  /**
   * Get session metrics API
   */
  private async getSessionMetrics(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
    const sessionId = req.headers.get('X-Session-ID');
    
    if (sessionId) {
      const metrics = this.secretsManager.getSessionMetrics(sessionId);
      return Response.json({
        success: true,
        sessionId,
        metrics
      }, {
        headers: corsHeaders
      });
    } else {
      // Return all session metrics
      const allMetrics: Record<string, any> = {};
      const sessions = this.secretsManager.listActiveSessions();
      
      for (const session of sessions) {
        allMetrics[session.sessionId] = this.secretsManager.getSessionMetrics(session.sessionId);
      }
      
      return Response.json({
        success: true,
        metrics: allMetrics
      }, {
        headers: corsHeaders
      });
    }
  }

  /**
   * Junior profile API
   */
  private async juniorProfile(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
    try {
      const sessionId = req.headers.get('X-Session-ID');
      const body = await req.json();
      const { mdFile, member, windowId } = body;

      if (!sessionId) {
        return Response.json({
          success: false,
          error: 'Missing X-Session-ID header'
        }, {
          status: 400,
          headers: corsHeaders
        });
      }

      const profile = await mockJuniorProfile(mdFile, { lspSafe: true });
      const path = await this.secretsManager.createSessionProfile(
        sessionId,
        'junior',
        profile,
        member,
        windowId
      );

      return Response.json({
        success: true,
        path,
        sessionId
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
   * Wiki profile API
   */
  private async wikiProfile(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
    try {
      const sessionId = req.headers.get('X-Session-ID');
      const body = await req.json();
      const { wikiContent, member, windowId } = body;

      if (!sessionId) {
        return Response.json({
          success: false,
          error: 'Missing X-Session-ID header'
        }, {
          status: 400,
          headers: corsHeaders
        });
      }

      const profile = await mockWikiProfile(wikiContent);
      const path = await this.secretsManager.createSessionProfile(
        sessionId,
        'wiki',
        profile,
        member,
        windowId
      );

      return Response.json({
        success: true,
        path,
        sessionId
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
}

// Mock functions for demonstration
async function mockJuniorProfile(mdFile: string, options: any): Promise<any> {
  return {
    type: 'junior',
    file: mdFile,
    options,
    metrics: {
      size: mdFile.length,
      lines: mdFile.split('\n').length,
      words: mdFile.split(/\s+/).length,
      processed: Date.now()
    },
    features: {
      lspSafe: options.lspSafe || false,
      profiling: true,
      analysis: true
    }
  };
}

async function mockWikiProfile(wikiContent: string): Promise<any> {
  return {
    type: 'wiki',
    content: wikiContent,
    metrics: {
      size: wikiContent.length,
      sections: (wikiContent.match(/^#+/gm) || []).length,
      links: (wikiContent.match(/\[.*?\]/g) || []).length,
      processed: Date.now()
    },
    features: {
      markdown: true,
      parsing: true,
      structure: true
    }
  };
}

// Initialize and start the v3.7 server
const wikiServerV37 = new WikiServerV37();
wikiServerV37.startServer(3002);

export { 
  BunSecretsManagerV37, 
  WikiServerV37, 
  uploadSessionProfile
};
