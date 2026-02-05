/**
 * Bun HTML Integration
 * Domain-Driven Design Implementation
 *
 * Leverages Bun's native HTML import system for optimal performance
 * and automatic ETag generation with ahead-of-time bundling.
 */

// Import HTML templates using Bun's native HTML import feature
// These will be automatically bundled with ETags and cache headers
import dashboardTemplate from '../templates/dashboard.html' with { type: 'text' };
import collectionsTemplate from '../templates/collections.html' with { type: 'text' };
import regulatoryTemplate from '../templates/regulatory.html' with { type: 'text' };
import financialTemplate from '../templates/financial.html' with { type: 'text' };

import { HTMLTemplateManager, htmlTemplateManager } from './html-templates';
import { envConfig } from './environment-configuration';
import { TimezoneUtils } from './timezone-configuration';

export interface BunHTMLConfig {
  enableCaching?: boolean;
  development?: boolean;
  minify?: boolean;
  preloadTemplates?: boolean;
}

export class BunHTMLIntegration {
  private templateManager: HTMLTemplateManager;
  private config: Required<BunHTMLConfig>;

  constructor(config: BunHTMLConfig = {}) {
    this.templateManager = HTMLTemplateManager.getInstance();

    this.config = {
      enableCaching: config.enableCaching ?? true,
      development: config.development ?? envConfig.app.isDevelopment,
      minify: config.minify ?? !envConfig.app.isDevelopment,
      preloadTemplates: config.preloadTemplates ?? envConfig.app.isProduction,
    };
  }

  /**
   * Get bundled routes with automatic ETag generation
   * Uses Bun's native HTML import system
   */
  getBundledRoutes(): Record<string, Response> {
    const routes: Record<string, Response> = {};

    if (this.config.enableCaching) {
      // Dashboard route with automatic ETag
      routes['/dashboard'] = this.createHTMLResponse('dashboard', {
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
      });

      // Collections route
      routes['/collections'] = this.createHTMLResponse('collections', {
        transactionCount: '150',
        totalVolume: '75000',
        successRate: '98.2%',
        averageProcessingTime: '1.2s',
      });

      // Financial reports route
      routes['/financial'] = this.createHTMLResponse('financial', {
        periodStart: '2024-01-01',
        periodEnd: '2024-01-31',
        totalRevenue: '125000',
        netProfit: '98000',
        complianceScore: '99.1%',
      });

      // Regulatory reports route
      routes['/regulatory'] = this.createHTMLResponse('regulatory', {
        jurisdiction: 'US',
        reportType: 'Monthly',
        generatedAt: new Date().toISOString(),
        complianceStatus: 'Compliant',
      });
    }

    return routes;
  }

  /**
   * Create HTML response with optimized headers
   */
  private createHTMLResponse(templateName: string, data: any): Response {
    let html: string;

    try {
      // Use our template manager for dynamic content
      html = this.templateManager.renderTemplate(templateName, data);
    } catch (error) {
      console.warn(`Template ${templateName} not found, using fallback`);
      // Fallback to imported HTML if template not found
      switch (templateName) {
        case 'dashboard':
          html = dashboardTemplate;
          break;
        case 'collections':
          html = collectionsTemplate;
          break;
        case 'financial':
          html = financialTemplate;
          break;
        case 'regulatory':
          html = regulatoryTemplate;
          break;
        default:
          html = '<html><body>Template not found</body></html>';
      }
    }

    // Create response with optimal caching headers
    const headers = new Headers({
      'Content-Type': 'text/html;charset=utf-8',
      'X-Template-Name': templateName,
      'X-Template-Cached': 'true',
    });

    if (this.config.enableCaching) {
      // Add cache headers based on template type
      const cacheControl = this.getCacheControlForTemplate(templateName);
      headers.set('Cache-Control', cacheControl);
    }

    return new Response(html, { headers });
  }

  /**
   * Get optimal cache control headers for different template types
   */
  private getCacheControlForTemplate(templateName: string): string {
    // Different cache strategies for different template types
    const cacheStrategies = {
      dashboard: 'public, max-age=300', // 5 minutes - frequently updated
      collections: 'public, max-age=60', // 1 minute - volatile data
      financial: 'public, max-age=1800', // 30 minutes - semi-static
      regulatory: 'public, max-age=3600', // 1 hour - compliance reports
    };

    return cacheStrategies[templateName as keyof typeof cacheStrategies] || 'public, max-age=300'; // Default 5 minutes
  }

  /**
   * Get development routes with hot reloading
   */
  getDevelopmentRoutes(): Record<string, Response> {
    return {
      '/dev/templates': new Response(
        JSON.stringify({
          templates: this.templateManager.getAllTemplateNames(),
          cacheStats: this.templateManager.getCacheStats(),
          environment: {
            development: this.config.development,
            timezone: envConfig.timezone.default,
            caching: this.config.enableCaching,
          },
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
        }
      ),
    };
  }

  /**
   * Create Bun.serve configuration with optimal settings
   */
  createBunServeConfig(port: number = 3000): any {
    const routes = {
      ...this.getBundledRoutes(),
      ...(this.config.development ? this.getDevelopmentRoutes() : {}),
    };

    return {
      port,
      hostname: envConfig.server?.host || 'localhost',
      development: this.config.development,

      routes,

      // Enable automatic ETag generation and caching
      async fetch(req: Request) {
        const url = new URL(req.url);

        // Handle dynamic API routes
        if (url.pathname.startsWith('/api/')) {
          return this.handleAPIRoute(req);
        }

        // Handle report generation
        if (url.pathname.startsWith('/reports/')) {
          return this.handleReportRoute(req);
        }

        // Handle cache management
        if (url.pathname === '/cache/stats') {
          return this.handleCacheStats(req);
        }

        // Fallback to 404
        return new Response('Not Found', {
          status: 404,
          headers: { 'Content-Type': 'text/plain' },
        });
      },

      // Error handling
      error(error: Error) {
        console.error('Server error:', error);
        return new Response('Internal Server Error', {
          status: 500,
          headers: { 'Content-Type': 'text/plain' },
        });
      },
    };
  }

  /**
   * Handle API routes
   */
  private async handleAPIRoute(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === '/api/templates' && req.method === 'GET') {
      return new Response(
        JSON.stringify({
          templates: this.templateManager.getAllTemplateNames(),
          cache: this.templateManager.getCacheStats(),
          config: this.config,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=60',
          },
        }
      );
    }

    if (url.pathname === '/api/cache/clear' && req.method === 'POST') {
      this.templateManager.clearCache();
      return new Response(JSON.stringify({ success: true, message: 'Cache cleared' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'API endpoint not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Handle report routes
   */
  private async handleReportRoute(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const reportType = url.pathname.split('/').pop();

    try {
      let data: any;

      switch (reportType) {
        case 'financial':
          data = {
            period: {
              start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              end: new Date(),
            },
            summary: {
              totalRevenue: 125000,
              totalCollections: 450,
              netProfit: 98000,
            },
            generatedAt: new Date(),
          };
          break;

        case 'collections':
          data = {
            transactions: [],
            summary: {
              totalAmount: 75000,
              successfulCount: 140,
              failedCount: 10,
            },
          };
          break;

        default:
          return new Response('Report type not found', { status: 404 });
      }

      const html = this.templateManager.renderTemplate(reportType!, data);
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': this.getCacheControlForTemplate(reportType!),
          'X-Report-Type': reportType,
        },
      });
    } catch (error) {
      console.error('Error generating report:', error);
      return new Response('Error generating report', { status: 500 });
    }
  }

  /**
   * Handle cache stats
   */
  private async handleCacheStats(req: Request): Promise<Response> {
    const stats = this.templateManager.getCacheStats();
    const html = this.generateCacheStatsHTML(stats);

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache',
      },
    });
  }

  /**
   * Generate cache stats HTML
   */
  private generateCacheStatsHTML(stats: any): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Bun HTML Template Cache Stats</title>
      <style>
        body { font-family: monospace; padding: 20px; background: #f5f5f5; }
        .stats { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .metric { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee; }
        .metric:last-child { border-bottom: none; }
        .value { font-weight: bold; color: #007acc; }
        .hit-rate { color: ${stats.hitRate > 80 ? '#28a745' : stats.hitRate > 50 ? '#ffc107' : '#dc3545'}; }
      </style>
    </head>
    <body>
      <h1>🚀 Bun HTML Template Cache Statistics</h1>

      <div class="stats">
        <h2>Cache Performance</h2>
        <div class="metric"><span>Hits:</span> <span class="value">${stats.hits}</span></div>
        <div class="metric"><span>Misses:</span> <span class="value">${stats.misses}</span></div>
        <div class="metric"><span>Hit Rate:</span> <span class="value hit-rate">${stats.hitRate.toFixed(2)}%</span></div>
        <div class="metric"><span>Entries:</span> <span class="value">${stats.entries}</span></div>
        <div class="metric"><span>Size:</span> <span class="value">${(stats.totalSize / 1024).toFixed(2)} KB</span></div>
      </div>

      <div class="stats">
        <h2>Bun Integration Status</h2>
        <div class="metric"><span>Development Mode:</span> <span class="value">${this.config.development ? 'Enabled' : 'Disabled'}</span></div>
        <div class="metric"><span>Caching:</span> <span class="value">${this.config.enableCaching ? 'Enabled' : 'Disabled'}</span></div>
        <div class="metric"><span>Minification:</span> <span class="value">${this.config.minify ? 'Enabled' : 'Disabled'}</span></div>
        <div class="metric"><span>Auto ETags:</span> <span class="value">✅ Enabled</span></div>
      </div>
    </body>
    </html>`;
  }

  /**
   * Preload templates for production
   */
  async preloadTemplates(): Promise<void> {
    if (!this.config.preloadTemplates) return;

    console.log('🔄 Preloading templates for production...');

    const templates = this.templateManager.getAllTemplateNames();
    const preloadData = {
      dashboard: {
        totalRevenue: '0',
        totalCollections: '0',
        complianceRate: '0%',
        featureCount: '0',
      },
      collections: { transactionCount: '0', totalVolume: '0' },
      financial: { totalRevenue: '0', netProfit: '0' },
      regulatory: { jurisdiction: 'US' },
    };

    for (const templateName of templates) {
      try {
        const data = preloadData[templateName as keyof typeof preloadData] || {};
        this.templateManager.renderTemplate(templateName, data);
        console.log(`   ✅ Preloaded: ${templateName}`);
      } catch (error) {
        console.log(`   ⚠️  Failed to preload: ${templateName}`);
      }
    }

    console.log('✅ Template preloading complete!');
  }
}

/**
 * Create optimized Bun server with HTML integration
 */
export function createBunHTMLServer(port: number = 3000, config?: BunHTMLConfig) {
  const bunHTML = new BunHTMLIntegration(config);
  const serveConfig = bunHTML.createBunServeConfig(port);

  console.log('🚀 Starting Bun HTML Server...');
  console.log(`📍 Development Mode: ${serveConfig.development}`);
  console.log(`🔄 Caching: ${config?.enableCaching !== false ? 'Enabled' : 'Disabled'}`);
  console.log(`📦 Minification: ${config?.minify !== false ? 'Enabled' : 'Disabled'}`);
  console.log(`🏷️  Auto ETags: ✅ Enabled by Bun`);
  console.log('');

  const server = Bun.serve(serveConfig);

  console.log('📋 Available Routes:');
  Object.keys(serveConfig.routes).forEach(route => {
    console.log(`   🌐 ${route}`);
  });
  console.log('');
  console.log(`🎯 Server: http://${serveConfig.hostname}:${port}`);
  console.log(`📊 Cache Stats: http://${serveConfig.hostname}:${port}/cache/stats`);
  console.log(`🔧 API: http://${serveConfig.hostname}:${port}/api/templates`);

  // Preload templates if configured
  if (config?.preloadTemplates) {
    bunHTML.preloadTemplates().catch(console.error);
  }

  return server;
}

/**
 * Build production bundle with ahead-of-time bundling
 */
export async function buildProductionBundle(entryPoint: string = './src/index.ts') {
  console.log('🏗️  Building production bundle with AOT bundling...');

  const buildResult = await Bun.build({
    entrypoints: [entryPoint],
    outdir: './dist',
    target: 'bun',
    minify: true,
    sourcemap: 'external',
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  });

  if (buildResult.success) {
    console.log('✅ Production bundle created successfully!');
    console.log(`📦 Output: ./dist/`);
    console.log(`🎯 Entry: ${entryPoint}`);
    console.log(`📊 Files: ${buildResult.outputs.length}`);

    // Show file details
    buildResult.outputs.forEach((output, index) => {
      console.log(`   ${index + 1}. ${output.path} (${(output.size / 1024).toFixed(2)} KB)`);
    });

    console.log('\n🚀 Ready for production deployment!');
    console.log('   Run: bun run ./dist/index.js');
  } else {
    console.error('❌ Build failed:');
    buildResult.logs.forEach(log => console.error(`   ${log}`));
  }

  return buildResult;
}
