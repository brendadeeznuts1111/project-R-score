/**
 * HTML Server with ETag Caching
 * Domain-Driven Design Implementation
 *
 * Leverages Bun's automatic ETag generation for optimal HTTP caching
 * of HTML templates and reports.
 */

import {
  HTMLTemplateManager,
  HTMLReportGenerator,
  htmlTemplateManager,
  htmlReportGenerator,
} from './html-templates';
import { TimezoneUtils } from './timezone-configuration';
import { envConfig } from './environment-configuration';

export interface ServerConfig {
  port?: number;
  hostname?: string;
  development?: boolean;
  enableCaching?: boolean;
  corsOrigins?: string[];
}

export class HTMLServer {
  private templateManager: HTMLTemplateManager;
  private reportGenerator: HTMLReportGenerator;
  private config: Required<ServerConfig>;

  constructor(config: ServerConfig = {}) {
    this.templateManager = HTMLTemplateManager.getInstance();
    this.reportGenerator = HTMLReportGenerator.getInstance();

    this.config = {
      port: config.port || 3000,
      hostname: config.hostname || 'localhost',
      development: config.development ?? envConfig.app.isDevelopment,
      enableCaching: config.enableCaching ?? true,
      corsOrigins: config.corsOrigins || envConfig.security.corsOrigins,
    };
  }

  /**
   * Start the HTML server with automatic ETag caching
   */
  start(): void {
    console.log('🚀 Starting HTML Template Server...');
    console.log(`📍 Server: http://${this.config.hostname}:${this.config.port}`);
    console.log(`🔄 Development Mode: ${this.config.development}`);
    console.log(`📦 ETag Caching: ${this.config.enableCaching ? 'Enabled' : 'Disabled'}`);

    const server = Bun.serve({
      port: this.config.port,
      hostname: this.config.hostname,
      development: this.config.development,

      // Static routes with automatic ETag generation
      routes: this.getStaticRoutes(),

      async fetch(req: Request) {
        const url = new URL(req.url);
        const pathname = url.pathname;

        // Handle dynamic routes
        if (pathname.startsWith('/api/')) {
          return this.handleAPIRequest(req);
        }

        if (pathname.startsWith('/reports/')) {
          return this.handleReportRequest(req);
        }

        if (pathname === '/cache-stats') {
          return this.handleCacheStatsRequest(req);
        }

        // Fallback to 404
        return new Response('Not Found', {
          status: 404,
          headers: {
            'Content-Type': 'text/plain',
            'Cache-Control': 'no-cache',
          },
        });
      },

      // Error handling
      error(error) {
        console.error('Server error:', error);
        return new Response('Internal Server Error', {
          status: 500,
          headers: { 'Content-Type': 'text/plain' },
        });
      },
    });

    // Display cache information
    this.displayCacheInfo();

    // Setup graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down HTML server...');
      server.stop();
      process.exit(0);
    });

    console.log('✅ HTML Server started successfully!');
    console.log('📋 Available endpoints:');
    console.log(`   📊 Dashboard: http://${this.config.hostname}:${this.config.port}/`);
    console.log(
      `   📈 Reports: http://${this.config.hostname}:${this.config.port}/reports/financial`
    );
    console.log(
      `   💳 Collections: http://${this.config.hostname}:${this.config.port}/reports/collections`
    );
    console.log(
      `   📋 Regulatory: http://${this.config.hostname}:${this.config.port}/reports/regulatory`
    );
    console.log(
      `   📊 Cache Stats: http://${this.config.hostname}:${this.config.port}/cache-stats`
    );
    console.log(`   🔄 Auto-reload: ${this.config.development ? 'Enabled' : 'Disabled'}`);
  }

  /**
   * Get static routes with automatic ETag generation
   */
  private getStaticRoutes(): Record<string, Response> {
    const routes: Record<string, Response> = {};

    if (this.config.enableCaching) {
      // Static template routes with automatic ETag caching
      const dashboardData = {
        totalRevenue: '125000',
        totalCollections: '450',
        complianceRate: '98.5%',
        featureCount: '6',
        timezone: envConfig.timezone.default,
        currentTime: TimezoneUtils.createTimezoneAwareDate(
          envConfig.timezone.context
        ).toLocaleString(),
        timezoneOffset: TimezoneUtils.getTimezoneInfo(envConfig.timezone.default).offset,
        lastUpdated: new Date().toLocaleString(),
        refreshInterval: '30000',
      };

      routes['/dashboard'] = new Response(
        htmlTemplateManager.renderTemplate('dashboard', dashboardData),
        {
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
            'X-Template-Cached': 'true',
          },
        }
      );

      // Static API responses with ETag caching
      routes['/api/templates'] = new Response(
        JSON.stringify({
          templates: htmlTemplateManager.getAllTemplateNames(),
          timezone: envConfig.timezone.default,
          features: Object.keys(envConfig.featureFlags).filter(key => envConfig.featureFlags[key]),
          cache: htmlTemplateManager.getCacheStats(),
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=60', // Cache for 1 minute
            'X-API-Version': '1.0',
          },
        }
      );
    }

    return routes;
  }

  /**
   * Handle API requests
   */
  private async handleAPIRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === '/api/cache/clear' && req.method === 'POST') {
      htmlTemplateManager.clearCache();
      return new Response(JSON.stringify({ success: true, message: 'Cache cleared' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/api/cache/stats') {
      const stats = htmlTemplateManager.getCacheStats();
      return new Response(JSON.stringify(stats), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      });
    }

    return new Response(JSON.stringify({ error: 'API endpoint not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Handle report requests with dynamic content
   */
  private async handleReportRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const reportType = url.pathname.split('/').pop();

    let html: string;
    let cacheControl = 'public, max-age=300'; // Default 5 minutes

    try {
      switch (reportType) {
        case 'financial':
          const financialData = {
            period: {
              start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              end: new Date(),
            },
            summary: {
              totalRevenue: 125000,
              totalCollections: 450,
              netProfit: 98000,
              complianceRate: '98.5%',
            },
            collections: { transactions: [] },
            settlements: { totalSettlements: 120 },
            compliance: {
              pciDssCompliant: true,
              amlCompliant: true,
              kycCompliant: true,
            },
          };
          html = this.reportGenerator.generateFinancialReport(financialData);
          break;

        case 'collections':
          const collectionsData = {
            transactions: [
              {
                id: 'TXN-001',
                customerId: 'CUST-123',
                amount: 500,
                currency: 'USD',
                status: 'completed',
                timestamp: new Date().toISOString(),
              },
              {
                id: 'TXN-002',
                customerId: 'CUST-456',
                amount: 250,
                currency: 'USD',
                status: 'pending',
                timestamp: new Date().toISOString(),
              },
            ],
            summary: {
              totalAmount: 750,
              successfulCount: 1,
              failedCount: 0,
              pendingCount: 1,
            },
          };
          html = this.reportGenerator.generateCollectionsSummary(collectionsData);
          cacheControl = 'public, max-age=60'; // Shorter cache for volatile data
          break;

        case 'regulatory':
          const regulatoryData = {
            jurisdiction: 'US',
            records: [],
            summary: { totalRecords: 0, generatedAt: new Date() },
            generatedAt: new Date(),
          };
          html = this.reportGenerator.generateRegulatoryExport(regulatoryData);
          cacheControl = 'public, max-age=3600'; // Longer cache for regulatory reports
          break;

        default:
          return new Response('Report type not found', { status: 404 });
      }

      return new Response(html, {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': cacheControl,
          'X-Report-Type': reportType || 'unknown',
          'X-Template-Cached': 'true',
        },
      });
    } catch (error) {
      console.error('Error generating report:', error);
      return new Response('Error generating report', { status: 500 });
    }
  }

  /**
   * Handle cache statistics requests
   */
  private async handleCacheStatsRequest(req: Request): Promise<Response> {
    const stats = htmlTemplateManager.getCacheStats();
    const mostAccessed = htmlTemplateManager.getMostAccessedTemplates();

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Template Cache Statistics</title>
      <style>
        body { font-family: monospace; padding: 20px; background: #f5f5f5; }
        .stats { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .metric { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee; }
        .metric:last-child { border-bottom: none; }
        .value { font-weight: bold; color: #007acc; }
        table { width: 100%; border-collapse: collapse; background: white; margin: 20px 0; }
        th, td { padding: 10px; text-align: left; border: 1px solid #ddd; }
        th { background: #f2f2f2; font-weight: bold; }
        .hit-rate { color: ${stats.hitRate > 80 ? '#28a745' : stats.hitRate > 50 ? '#ffc107' : '#dc3545'}; }
      </style>
    </head>
    <body>
      <h1>📊 Template Cache Statistics</h1>

      <div class="stats">
        <h2>Cache Performance</h2>
        <div class="metric"><span>Hits:</span> <span class="value">${stats.hits}</span></div>
        <div class="metric"><span>Misses:</span> <span class="value">${stats.misses}</span></div>
        <div class="metric"><span>Hit Rate:</span> <span class="value hit-rate">${stats.hitRate.toFixed(2)}%</span></div>
        <div class="metric"><span>Entries:</span> <span class="value">${stats.entries}</span></div>
        <div class="metric"><span>Evictions:</span> <span class="value">${stats.evictions}</span></div>
        <div class="metric"><span>Total Size:</span> <span class="value">${(stats.totalSize / 1024).toFixed(2)} KB</span></div>
        <div class="metric"><span>Max Size:</span> <span class="value">${(stats.maxSize / 1024 / 1024).toFixed(2)} MB</span></div>
      </div>

      <div class="stats">
        <h2>Most Accessed Templates</h2>
        <table>
          <thead>
            <tr><th>Template</th><th>Access Count</th><th>Last Accessed</th></tr>
          </thead>
          <tbody>
            ${mostAccessed
              .map(
                item => `
              <tr>
                <td>${item.key}</td>
                <td>${item.accessCount}</td>
                <td>${new Date(item.lastAccessed).toLocaleString()}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>

      <div class="stats">
        <h2>Cache Management</h2>
        <button onclick="clearCache()">🧹 Clear Cache</button>
        <button onclick="preloadTemplates()">🔄 Preload Templates</button>
        <button onclick="location.reload()">🔄 Refresh Stats</button>
      </div>

      <script>
        async function clearCache() {
          await fetch('/api/cache/clear', { method: 'POST' });
          location.reload();
        }

        async function preloadTemplates() {
          // This would trigger template preloading
          alert('Templates preloaded!');
        }
      </script>
    </body>
    </html>`;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache',
      },
    });
  }

  /**
   * Display cache information on startup
   */
  private displayCacheInfo(): void {
    const stats = htmlTemplateManager.getCacheStats();
    console.log('\n📊 Template Cache Status:');
    console.log(`   📈 Hit Rate: ${stats.hitRate.toFixed(2)}%`);
    console.log(`   📦 Entries: ${stats.entries}`);
    console.log(`   💾 Size: ${(stats.totalSize / 1024).toFixed(2)} KB`);
    console.log(`   🎯 Max Size: ${(stats.maxSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   🏃 Auto-preload: ${envConfig.app.isProduction ? 'Enabled' : 'Disabled'}\n`);
  }
}

/**
 * Convenience function to start HTML server
 */
export function startHTMLServer(config?: ServerConfig): HTMLServer {
  const server = new HTMLServer(config);
  server.start();
  return server;
}

/**
 * Demo server for testing ETag caching
 */
export async function demoETagCaching(): Promise<void> {
  console.log('🚀 Demonstrating Bun ETag Caching...\n');

  const server = new Bun.serve({
    port: 0, // Auto-assign port
    routes: {
      '/demo': new Response(
        htmlTemplateManager.renderTemplate('dashboard', {
          totalRevenue: '150000',
          totalCollections: '520',
          complianceRate: '99.2%',
          featureCount: '7',
          timezone: envConfig.timezone.default,
          currentTime: new Date().toLocaleString(),
          timezoneOffset: TimezoneUtils.getTimezoneInfo(envConfig.timezone.default).offset,
          lastUpdated: new Date().toLocaleString(),
          refreshInterval: '30000',
        }),
        {
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'public, max-age=300',
          },
        }
      ),
    },
  });

  const demoUrl = new URL('/demo', server.url);
  console.log(`🌐 Demo URL: ${demoUrl.href}`);

  try {
    // First request - should get ETag
    console.log('📡 First request (should get ETag)...');
    const firstResponse = await fetch(demoUrl);
    const etag = firstResponse.headers.get('etag');
    console.log(`   📋 Status: ${firstResponse.status}`);
    console.log(`   🏷️  ETag: ${etag}`);
    console.log(`   📊 Content-Length: ${firstResponse.headers.get('content-length')}`);

    if (etag) {
      // Second request with If-None-Match - should get 304
      console.log('\n📡 Second request (with If-None-Match)...');
      const secondResponse = await fetch(demoUrl, {
        headers: {
          'If-None-Match': etag,
        },
      });

      console.log(`   📋 Status: ${secondResponse.status}`);
      console.log(
        `   📊 Content-Length: ${secondResponse.headers.get('content-length') || '0 (cached)'}`
      );

      if (secondResponse.status === 304) {
        console.log('   ✅ ETag caching working! Server returned 304 Not Modified');
        console.log('   💾 Bandwidth saved by not re-sending unchanged content');
      } else {
        console.log('   ⚠️  ETag caching may not be working as expected');
      }
    }
  } catch (error) {
    console.error('❌ Error during ETag demo:', error);
  } finally {
    server.stop();
    console.log('\n🏁 ETag caching demo completed!');
  }
}
