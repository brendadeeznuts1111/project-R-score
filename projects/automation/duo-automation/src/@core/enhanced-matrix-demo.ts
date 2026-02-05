#!/usr/bin/env bun

/**
 * Production Application Integration with Enhanced Matrix System
 * 
 * Example production application demonstrating the enhanced multi-tenant
 * scoping and platform matrix with advanced connection management.
 */

import { MatrixConnectionManager, fetchWithScope } from './enhanced-matrix-system';

class ProductionApp {
  private connectionManager: MatrixConnectionManager;
  private currentScope: any = null;
  
  async initialize() {
    console.log('🚀 Initializing Production Application with Enhanced Matrix System');
    
    // Auto-detect scope and apply configuration
    this.connectionManager = new MatrixConnectionManager();
    const scope = await this.connectionManager.detectScope();
    this.currentScope = scope;
    
    console.log(`✅ App initialized for ${scope.detectedScope} scope`);
    console.log(`🌐 Domain: ${scope.servingDomain}`);
    console.log(`🖥️ Platform: ${scope.platform}`);
    console.log(`📊 Max connections: ${scope.connectionConfig.maxConnections}`);
    console.log(`🍪 Preloaded cookies: ${scope.preloadedCookies?.length || 0}`);
    console.log(`🏷️ Feature flags: ${scope.featureFlags.join(', ')}`);
    
    // Start monitoring if enabled
    if (scope.statsEnabled) {
      this.startHealthChecks();
    }
    
    // Preconnect to configured domains
    if (scope.connectionConfig.preconnectDomains.length > 0) {
      console.log(`🔗 Preconnecting to ${scope.connectionConfig.preconnectDomains.length} domains`);
    }
  }
  
  async fetchData(url: string, options?: {
    saveToData?: boolean;
    requestId?: string;
    customHeaders?: Record<string, string>;
  }) {
    // Use scope-aware fetch with all optimizations
    return this.connectionManager.makeScopedRequest(url, {
      saveToData: options?.saveToData ?? this.currentScope?.dataPersistence !== 'none',
      requestId: options?.requestId || `data_fetch_${Date.now()}`,
      headers: options?.customHeaders
    });
  }
  
  async batchProcess(urls: string[], concurrency: number = 3) {
    console.log(`📦 Processing ${urls.length} URLs with concurrency ${concurrency}`);
    
    // Use the underlying ecosystem for batch processing
    const ecosystem = this.connectionManager['ecosystem'];
    
    const requests = urls.map(url => ({
      url,
      options: { 
        headers: { 
          'X-Batch-Request': 'true',
          'X-App-Version': '1.0.0'
        } 
      }
    }));
    
    const results = await ecosystem.batchRequests(requests, concurrency);
    
    console.log(`✅ Batch processing completed: ${results.length} responses`);
    return results;
  }
  
  async privateRegistryAccess(packageName: string) {
    console.log(`📦 Accessing private registry for package: ${packageName}`);
    
    const response = await fetchWithScope(
      `https://npm.pkg.github.com/factory-wager/${packageName}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FACTORY_WAGER_NPM_TOKEN}`,
          'X-Package-Request': 'true'
        },
      }
    );
    
    if (response.ok) {
      const packageData = await response.json();
      console.log(`✅ Successfully fetched ${packageName}`);
      return packageData;
    } else {
      console.error(`❌ Failed to fetch ${packageName}: ${response.status}`);
      throw new Error(`Registry access failed: ${response.statusText}`);
    }
  }
  
  async uploadToR2(key: string, data: any, metadata?: Record<string, string>) {
    // Check if R2_STORAGE feature flag is enabled
    if (!this.currentScope?.featureFlags.includes('R2_STORAGE')) {
      throw new Error('R2_STORAGE feature flag not enabled in current scope');
    }
    
    console.log(`☁️ Uploading to R2: ${key}`);
    
    try {
      // Use Bun's native S3 API
      const result = await Bun.s3.write(key, data, {
        contentType: metadata?.contentType || 'application/octet-stream',
        metadata
      });
      
      console.log(`✅ Successfully uploaded to R2: ${key}`);
      return result;
    } catch (error) {
      console.error(`❌ R2 upload failed:`, error);
      throw error;
    }
  }
  
  async demonstrateScopeFeatures() {
    console.log('\n🎯 Demonstrating Enhanced Matrix Features');
    console.log('='.repeat(50));
    
    // 1. Show current scope statistics
    const stats = this.connectionManager.getScopeStats();
    console.log('\n📊 Current Scope Statistics:');
    console.log(`Scope: ${stats.scope}`);
    console.log(`Domain: ${stats.domain}`);
    console.log(`Platform: ${stats.platform}`);
    console.log(`Cookie Count: ${stats.cookieCount}`);
    console.log(`Available CLI Commands: ${stats.availableCLI.join(', ')}`);
    
    // 2. Demonstrate scoped request with headers
    console.log('\n🌐 Making Scoped Request:');
    try {
      const response = await this.fetchData('https://httpbin.org/headers', {
        customHeaders: {
          'X-Demo-Request': 'enhanced-matrix-demo'
        }
      });
      
      if (response.ok) {
        const headers = await response.json();
        console.log('✅ Scoped request successful');
        console.log('Response headers include:', Object.keys(headers.headers).join(', '));
      }
    } catch (error) {
      console.log('⚠️ Demo request failed (expected in some environments)');
    }
    
    // 3. Demonstrate batch processing
    console.log('\n📦 Demonstrating Batch Processing:');
    const testUrls = [
      'https://httpbin.org/delay/1',
      'https://httpbin.org/delay/1',
      'https://httpbin.org/delay/1'
    ];
    
    try {
      const batchResults = await this.batchProcess(testUrls, 2);
      console.log(`✅ Batch completed: ${batchResults.length} responses`);
    } catch (error) {
      console.log('⚠️ Batch processing demo failed (expected in some environments)');
    }
    
    // 4. Show feature flag capabilities
    console.log('\n🏷️ Feature Flag Capabilities:');
    this.currentScope.featureFlags.forEach(flag => {
      console.log(`  ✅ ${flag}`);
    });
    
    // 5. Show available CLI commands
    console.log('\n💻 Available CLI Commands:');
    this.currentScope.cliCommands.forEach(cmd => {
      console.log(`  💻 bun enhanced-matrix ${cmd}`);
    });
  }
  
  private startHealthChecks() {
    console.log('🏥 Starting health check monitoring');
    
    setInterval(async () => {
      try {
        const stats = this.connectionManager.getScopeStats();
        await this.reportMetrics(stats);
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, 60000); // Every minute
  }
  
  private async reportMetrics(stats: any) {
    // In production, this would send metrics to your monitoring system
    console.log(`📈 Health Check - Scope: ${stats.scope}, Connections: ${stats.connectionStats.length}`);
  }
  
  async cleanup() {
    console.log('🧹 Cleaning up application resources');
    // Cleanup any resources if needed
  }
}

// ============================================
// EXAMPLE USAGE AND DEMONSTRATION
// ============================================

async function demonstrateEnhancedMatrix() {
  const app = new ProductionApp();
  
  try {
    // Initialize the application
    await app.initialize();
    
    // Demonstrate features
    await app.demonstrateScopeFeatures();
    
    // Example private registry access
    if (process.env.FACTORY_WAGER_NPM_TOKEN) {
      try {
        await app.privateRegistryAccess('@factory-wager/core');
      } catch (error) {
        console.log('ℹ️ Private registry demo skipped (no token or network issue)');
      }
    }
    
    // Example R2 upload if feature is enabled
    if (app['currentScope']?.featureFlags.includes('R2_STORAGE')) {
      try {
        await app.uploadToR2('demo/test-file.json', { 
          message: 'Hello from Enhanced Matrix!',
          timestamp: new Date().toISOString()
        }, {
          contentType: 'application/json'
        });
      } catch (error) {
        console.log('ℹ️ R2 upload demo skipped (feature not available or no credentials)');
      }
    }
    
    console.log('\n🎉 Enhanced Matrix System demonstration completed successfully!');
    
  } catch (error) {
    console.error('❌ Demonstration failed:', error);
  } finally {
    await app.cleanup();
  }
}

// ============================================
// CLI FOR PRODUCTION DEMO
// ============================================

if (import.meta.main) {
  const command = process.argv[2];
  
  switch (command) {
    case 'demo':
      demonstrateEnhancedMatrix();
      break;
      
    case 'serve':
      // Start a simple server demonstrating the matrix system
      const server = Bun.serve({
        port: 3000,
        async fetch(req) {
          const url = new URL(req.url);
          
          if (url.pathname === '/health') {
            const manager = new MatrixConnectionManager();
            await manager.detectScope();
            const stats = manager.getScopeStats();
            
            return Response.json({
              status: 'healthy',
              scope: stats.scope,
              domain: stats.domain,
              platform: stats.platform,
              timestamp: new Date().toISOString()
            });
          }
          
          if (url.pathname === '/matrix') {
            const manager = new MatrixConnectionManager();
            await manager.detectScope();
            const docs = manager.generateScopeDocumentation();
            
            return new Response(docs, {
              headers: { 'Content-Type': 'text/plain' }
            });
          }
          
          return new Response('Enhanced Matrix System Demo Server', {
            headers: { 'Content-Type': 'text/plain' }
          });
        }
      });
      
      console.log(`🚀 Enhanced Matrix Demo Server running on http://localhost:${server.port}`);
      console.log('Endpoints:');
      console.log(`  GET /health - Show current scope and health`);
      console.log(`  GET /matrix - Show scope documentation`);
      break;
      
    default:
      console.log(`
🎯 Enhanced Matrix Production Demo

Usage:
  bun run enhanced-matrix-demo.ts demo     - Run full demonstration
  bun run enhanced-matrix-demo.ts serve    - Start demo server

Features:
✅ Automatic scope detection and configuration
✅ Connection pooling and cookie management
✅ Feature flag integration
✅ Real-time monitoring and health checks
✅ Private registry integration
✅ R2 storage support (when enabled)
✅ Batch processing capabilities
✅ Comprehensive documentation generation

Examples:
  bun run enhanced-matrix-demo.ts demo
  bun run enhanced-matrix-demo.ts serve
  curl http://localhost:3000/health
  curl http://localhost:3000/matrix
      `);
  }
}

export default ProductionApp;
