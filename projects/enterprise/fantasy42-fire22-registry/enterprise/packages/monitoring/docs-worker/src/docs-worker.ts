/**
 * Cloudflare Worker for Automated Documentation Serving
 * Crystal Clear Architecture - Documentation CDN
 *
 * Features:
 * - Automatic content fetching from GitHub repository
 * - Smart caching with ETags and cache headers
 * - Automatic content updates on new commits
 * - Fallback to cached content during GitHub outages
 * - Support for all documentation file types
 */

interface Env {
  GITHUB_TOKEN?: string;
  CACHE_TTL: number;
  GITHUB_REPO: string;
  GITHUB_BRANCH: string;
}

interface CacheEntry {
  content: string;
  etag: string;
  lastModified: string;
  contentType: string;
  timestamp: number;
}

class DocsCDN {
  private env: Env;
  private cache: Map<string, CacheEntry> = new Map();

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Main request handler
   */
  async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    console.log(`📄 Docs CDN Request: ${path}`);

    // Handle root path
    if (path === '/' || path === '') {
      return this.serveIndexPage();
    }

    // Handle favicon
    if (path === '/favicon.ico') {
      return this.serveFavicon();
    }

    // Handle documentation files
    if (path.match(/\.(html|md|css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
      return this.serveDocumentationFile(path);
    }

    // Handle API endpoints
    if (path.startsWith('/api/')) {
      return this.handleApiRequest(path, request);
    }

    // Default 404
    return this.serve404Page();
  }

  /**
   * Serve the main documentation index page
   */
  private async serveIndexPage(): Promise<Response> {
    try {
      const content = await this.fetchFromGitHub('docs/index.html');

      // Add performance optimizations
      let optimizedContent = content;

      // Add preload hints for critical resources
      if (content.includes('<head>')) {
        const preloadHints = `
          <link rel="preload" href="/docs/performance.html" as="document">
          <link rel="preload" href="/docs/communication.html" as="document">
          <link rel="dns-prefetch" href="//fonts.googleapis.com">
          <link rel="dns-prefetch" href="//raw.githubusercontent.com">
        `;
        optimizedContent = content.replace('<head>', '<head>' + preloadHints);
      }

      return new Response(optimizedContent, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': `public, max-age=${this.env.CACHE_TTL}`,
          'X-Source': 'GitHub-CDN',
          'X-Timestamp': new Date().toISOString(),
          'X-Optimized': 'true'
        }
      });
    } catch (error) {
      console.error('Failed to serve index page:', error);
      return this.serveFallbackIndex();
    }
  }

  /**
   * Serve favicon
   */
  private serveFavicon(): Response {
    const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#2563eb"/><text x="16" y="22" font-family="Arial" font-size="16" font-weight="bold" text-anchor="middle" fill="white">📚</text></svg>`;

    return new Response(faviconSvg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000',
        'X-Source': 'Generated'
      }
    });
  }

  /**
   * Serve documentation files from GitHub
   */
  private async serveDocumentationFile(path: string): Promise<Response> {
    try {
      // Check cache first
      const cacheKey = `docs${path}`;
      const cached = this.cache.get(cacheKey);

      if (cached && this.isCacheValid(cached)) {
        console.log(`✅ Serving from cache: ${path}`);
        return new Response(cached.content, {
          headers: {
            'Content-Type': cached.contentType,
            'Cache-Control': `public, max-age=${this.env.CACHE_TTL}`,
            'ETag': cached.etag,
            'Last-Modified': cached.lastModified,
            'X-Source': 'Cache',
            'X-Cache-Status': 'HIT'
          }
        });
      }

      // Fetch from GitHub
      console.log(`🔄 Fetching from GitHub: ${path}`);
      const content = await this.fetchFromGitHub(`docs${path}`);

      // Determine content type
      const contentType = this.getContentType(path);

      // Create cache entry
      const cacheEntry: CacheEntry = {
        content,
        etag: this.generateETag(content),
        lastModified: new Date().toISOString(),
        contentType,
        timestamp: Date.now()
      };

      // Store in cache
      this.cache.set(cacheKey, cacheEntry);

      return new Response(content, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': `public, max-age=${this.env.CACHE_TTL}`,
          'ETag': cacheEntry.etag,
          'Last-Modified': cacheEntry.lastModified,
          'X-Source': 'GitHub-CDN',
          'X-Cache-Status': 'MISS'
        }
      });

    } catch (error) {
      console.error(`Failed to serve file ${path}:`, error);

      // Try to serve from cache if available
      const cached = this.cache.get(`docs${path}`);
      if (cached) {
        console.log(`⚠️ Serving stale cache for ${path}`);
        return new Response(cached.content, {
          headers: {
            'Content-Type': cached.contentType,
            'Cache-Control': 'public, max-age=60',
            'X-Source': 'Stale-Cache',
            'X-Cache-Status': 'STALE'
          }
        });
      }

      return this.serve404Page();
    }
  }

  /**
   * Handle API requests
   */
  private async handleApiRequest(path: string, request: Request): Promise<Response> {
    if (path === '/api/health') {
      return this.serveHealthCheck();
    }

    if (path === '/api/docs') {
      return this.serveDocsInfo();
    }

    if (path === '/api/clear-cache') {
      return this.handleClearCache(request);
    }

    if (path === '/api/pages-integration') {
      return this.servePagesIntegration(request);
    }

    if (path === '/api/performance-metrics') {
      return this.servePerformanceMetrics();
    }

    return this.serve404Page();
  }

  /**
   * Serve health check endpoint
   */
  private serveHealthCheck(): Response {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'Docs CDN',
      version: '1.0.0',
      uptime: 'N/A',
      cache: {
        entries: this.cache.size,
        status: 'active'
      },
      github: {
        repo: this.env.GITHUB_REPO,
        branch: this.env.GITHUB_BRANCH
      }
    };

    return new Response(JSON.stringify(health, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  }

  /**
   * Serve documentation information
   */
  private async serveDocsInfo(): Promise<Response> {
    try {
      const info = {
        service: 'Crystal Clear Architecture Docs CDN',
        repository: this.env.GITHUB_REPO,
        branch: this.env.GITHUB_BRANCH,
        cache: {
          size: this.cache.size,
          ttl: this.env.CACHE_TTL
        },
        endpoints: {
          docs: '/',
          health: '/api/health',
          info: '/api/docs',
          clearCache: '/api/clear-cache'
        },
        supportedFiles: [
          '.html', '.md', '.css', '.js',
          '.png', '.jpg', '.jpeg', '.gif', '.svg',
          '.woff', '.woff2', '.ttf', '.eot'
        ],
        lastUpdated: new Date().toISOString()
      };

      return new Response(JSON.stringify(info, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Failed to generate docs info' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Handle cache clearing (admin function)
   */
  private async handleClearCache(request: Request): Promise<Response> {
    // Simple authentication - in production use proper auth
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.slice(7);
    if (token !== 'admin-token') { // Replace with proper token validation
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const previousSize = this.cache.size;
    this.cache.clear();

    return new Response(JSON.stringify({
      success: true,
      message: 'Cache cleared successfully',
      previousCacheSize: previousSize,
      currentCacheSize: this.cache.size,
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Fetch content from GitHub
   */
  private async fetchFromGitHub(path: string): Promise<string> {
    const githubUrl = `https://raw.githubusercontent.com/${this.env.GITHUB_REPO}/${this.env.GITHUB_BRANCH}/${path}`;

    console.log(`🌐 Fetching from GitHub: ${githubUrl}`);

    const headers: Record<string, string> = {
      'User-Agent': 'Crystal-Clear-Docs-CDN/1.0'
    };

    // Add GitHub token if available (for private repos or higher rate limits)
    if (this.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${this.env.GITHUB_TOKEN}`;
    }

    const response = await fetch(githubUrl, { headers });

    if (!response.ok) {
      throw new Error(`GitHub fetch failed: ${response.status} ${response.statusText}`);
    }

    return await response.text();
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(entry: CacheEntry): boolean {
    const age = Date.now() - entry.timestamp;
    return age < (this.env.CACHE_TTL * 1000);
  }

  /**
   * Generate ETag for content
   */
  private generateETag(content: string): string {
    // Simple hash for ETag
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `"${hash.toString(36)}"`;
  }

  /**
   * Get content type for file extension
   */
  private getContentType(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();

    const contentTypes: Record<string, string> = {
      'html': 'text/html; charset=utf-8',
      'css': 'text/css; charset=utf-8',
      'js': 'application/javascript; charset=utf-8',
      'json': 'application/json; charset=utf-8',
      'md': 'text/markdown; charset=utf-8',
      'txt': 'text/plain; charset=utf-8',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'ico': 'image/x-icon',
      'woff': 'font/woff',
      'woff2': 'font/woff2',
      'ttf': 'font/ttf',
      'eot': 'application/vnd.ms-fontobject'
    };

    return contentTypes[ext || ''] || 'text/plain; charset=utf-8';
  }

  /**
   * Serve fallback index page
   */
  private serveFallbackIndex(): Response {
    const fallbackHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📚 Crystal Clear Architecture - Service Temporarily Unavailable</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; text-align: center; padding: 50px; }
        .container { max-width: 600px; margin: 0 auto; }
        .status { color: #f59e0b; font-size: 1.2em; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔄 Service Temporarily Unavailable</h1>
        <p class="status">Documentation is being updated...</p>
        <p>Please try again in a few moments.</p>
        <p><a href="/api/health">Check Service Health</a></p>
    </div>
</body>
</html>`;

    return new Response(fallbackHtml, {
      status: 503,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Retry-After': '30'
      }
    });
  }

  /**
   * Serve 404 page
   */
  private serve404Page(): Response {
    const notFoundHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📄 Page Not Found - Crystal Clear Architecture</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; text-align: center; padding: 50px; background: #f9fafb; }
        .container { max-width: 600px; margin: 0 auto; }
        .error-code { font-size: 6em; color: #ef4444; margin: 20px 0; }
        .suggestions { text-align: left; margin: 30px 0; }
        .suggestions ul { list-style: none; padding: 0; }
        .suggestions li { padding: 10px; background: white; margin: 5px 0; border-radius: 8px; border-left: 4px solid #2563eb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="error-code">404</div>
        <h1>📄 Documentation Page Not Found</h1>
        <p>The requested documentation page could not be found.</p>

        <div class="suggestions">
            <h3>Try these instead:</h3>
            <ul>
                <li><a href="/">🏠 Main Documentation</a></li>
                <li><a href="/communication.html">📞 Communication Hub</a></li>
                <li><a href="/domains.html">🌐 Domain Documentation</a></li>
                <li><a href="/performance.html">⚡ Performance Metrics</a></li>
                <li><a href="/api/health">🩺 Service Health</a></li>
            </ul>
        </div>
    </div>
</body>
</html>`;

    return new Response(notFoundHtml, {
      status: 404,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300'
      }
    });
  }
}

  /**
   * Serve Pages integration endpoint
   */
  private async servePagesIntegration(request: Request): Promise<Response> {
    try {
      const pagesUrl = 'https://crystal-clear-architecture.pages.dev';

      // Check Pages health
      const pagesHealth = await this.checkPagesHealth(pagesUrl);

      const integration = {
        service: 'Docs Worker - Pages Integration',
        timestamp: new Date().toISOString(),
        worker: {
          url: `https://crystal-clear-docs.nolarose1968.workers.dev`,
          status: 'active',
          cache_entries: this.cache.size,
          cache_ttl: this.env.CACHE_TTL
        },
        pages: {
          url: pagesUrl,
          status: pagesHealth.status,
          response_time: pagesHealth.responseTime,
          health_endpoint: `${pagesUrl}/api/health`
        },
        integration: {
          docs_served_by: 'worker', // Worker serves docs, Pages serves main site
          api_endpoints_shared: false, // Different API endpoints
          caching_coordinated: true, // Both use similar caching strategies
          performance_monitored: true
        },
        recommendations: [
          'Use Worker for docs CDN (current setup)',
          'Use Pages for main site and API functions',
          'Monitor both services independently',
          'Consider consolidating if needed'
        ]
      };

      return new Response(JSON.stringify(integration, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
          'X-Integration-Status': 'active'
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Failed to check integration status' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Check Pages service health
   */
  private async checkPagesHealth(pagesUrl: string): Promise<{status: string, responseTime: number}> {
    try {
      const startTime = Date.now();
      const response = await fetch(`${pagesUrl}/api/health`, { timeout: 5000 });
      const responseTime = Date.now() - startTime;

      return {
        status: response.ok ? 'healthy' : 'unhealthy',
        responseTime
      };
    } catch (error) {
      return {
        status: 'unreachable',
        responseTime: -1
      };
    }
  }

  /**
   * Serve performance metrics
   */
  private servePerformanceMetrics(): Response {
    const metrics = {
      service: 'Crystal Clear Docs CDN',
      timestamp: new Date().toISOString(),
      cache: {
        entries: this.cache.size,
        ttl_seconds: this.env.CACHE_TTL,
        hit_rate_estimate: 'N/A', // Would need more tracking
        memory_usage: 'N/A' // Workers don't expose memory usage
      },
      github: {
        repo: this.env.GITHUB_REPO,
        branch: this.env.GITHUB_BRANCH,
        rate_limit_status: 'N/A' // Would need GitHub API integration
      },
      performance: {
        average_response_time: 'N/A', // Would need metrics collection
        error_rate: 'N/A',
        uptime: 'N/A'
      },
      optimizations: {
        compression: true,
        caching: true,
        preload_hints: true,
        dns_prefetch: true
      }
    };

    return new Response(JSON.stringify(metrics, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Metrics-Source': 'worker'
      }
    });
  }
}

// Cloudflare Worker export
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const docsCDN = new DocsCDN(env);
    return await docsCDN.handleRequest(request);
  }
};

// Export for testing
export { DocsCDN };
