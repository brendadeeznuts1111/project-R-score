// examples/enterprise-wiki-platform.ts - Complete enterprise wiki platform demonstration

import { MultiThreadedWikiGenerator } from '../lib/mcp/multi-threaded-wiki-generator';
import { R2WikiStorage } from '../lib/mcp/r2-wiki-storage';
import { AdvancedCacheManager } from '../lib/utils/advanced-cache-manager';
import { RealtimeWikiCollaboration } from '../lib/mcp/realtime-wiki-collaboration';
import { MCPWikiGenerator, WikiTemplate, DocumentationProvider } from '../lib/mcp/wiki-generator-mcp';

/**
 * Enterprise Wiki Platform - Complete demonstration of all advanced features
 */
class EnterpriseWikiPlatform {
  private wikiGenerator: MultiThreadedWikiGenerator;
  private storage: R2WikiStorage;
  private cache: AdvancedCacheManager;
  private collaboration: RealtimeWikiCollaboration;

  constructor() {
    // Initialize multi-threaded wiki generator
    this.wikiGenerator = new MultiThreadedWikiGenerator({
      minWorkers: 2,
      maxWorkers: 8,
      taskTimeout: 30000,
      maxRetries: 3
    });

    // Initialize R2 storage with versioning and backups
    this.storage = new R2WikiStorage({
      bucket: 'enterprise-wiki',
      namespace: 'production',
      enableVersioning: true,
      enableBackups: true,
      backupInterval: 60 * 60 * 1000, // 1 hour
      maxVersions: 100,
      compressionEnabled: true,
      encryptionEnabled: true
    });

    // Initialize advanced cache with distributed support
    this.cache = new AdvancedCacheManager({
      maxSize: 5000,
      ttl: 60 * 60 * 1000, // 1 hour
      enableLRU: true,
      enableDistributed: false, // Enable with actual node URLs
      compressionThreshold: 2048,
      enableMetrics: true
    });

    // Initialize real-time collaboration
    this.collaboration = new RealtimeWikiCollaboration({
      port: 8080,
      enableAuthentication: true,
      maxConnections: 500,
      enablePresence: true,
      enableCursors: true,
      enableComments: true,
      enableVersionControl: true,
      conflictResolution: 'operational-transform'
    });

    this.setupEventHandlers();
  }

  /**
   * Start the enterprise platform
   */
  async start(): Promise<void> {
    try {
      console.log('🚀 Starting Enterprise Wiki Platform...');
      
      // Start collaboration server
      await this.collaboration.start();
      console.log('✅ Real-time collaboration server started');

      // Register some enterprise templates
      await this.registerEnterpriseTemplates();
      console.log('✅ Enterprise templates registered');

      // Set up monitoring
      this.setupMonitoring();
      console.log('✅ Monitoring system initialized');

      console.log('🎉 Enterprise Wiki Platform is ready!');
      console.log('\n📊 Platform Features:');
      console.log('  • Multi-threaded wiki generation (2-8 workers)');
      console.log('  • R2 storage with versioning & backups');
      console.log('  • Advanced caching with LRU & compression');
      console.log('  • Real-time collaboration with WebSockets');
      console.log('  • Operational transform conflict resolution');
      console.log('  • Enterprise-grade security & encryption');
      
      console.log('\n🔗 Available Services:');
      console.log('  • WebSocket Server: ws://localhost:8080');
      console.log('  • Wiki Generation API: Multi-threaded');
      console.log('  • Storage API: R2 with versioning');
      console.log('  • Cache API: Advanced distributed caching');
      
    } catch (error) {
      console.error('❌ Failed to start platform:', error);
      throw error;
    }
  }

  /**
   * Stop the enterprise platform
   */
  async stop(): Promise<void> {
    try {
      console.log('🛑 Stopping Enterprise Wiki Platform...');
      
      await this.collaboration.stop();
      await this.wikiGenerator.shutdown();
      await this.storage.cleanup();
      await this.cache.destroy();
      
      console.log('✅ Platform stopped successfully');
    } catch (error) {
      console.error('❌ Error stopping platform:', error);
      throw error;
    }
  }

  /**
   * Register enterprise-grade templates
   */
  private async registerEnterpriseTemplates(): Promise<void> {
    const enterpriseTemplates: WikiTemplate[] = [
      {
        name: 'api-documentation',
        provider: DocumentationProvider.CONFLUENCE,
        format: 'markdown',
        content: `# API Documentation

## Overview
This template generates comprehensive API documentation with OpenAPI integration.

## Features
- Automatic endpoint discovery
- Request/response examples
- Authentication flows
- Rate limiting information

## Usage
\`\`\`typescript
const api = new APIClient({
  baseURL: 'https://api.example.com',
  version: 'v1'
});
\`\`\`

## Endpoints
{{#each endpoints}}
### {{method}} {{path}}
{{description}}

**Parameters:**
{{#each parameters}}
- \`{{name}}\` ({{type}}): {{description}}
{{/each}}

**Response:**
\`\`\`json
{{responseExample}}
\`\`\`
{{/each}}`,
        description: 'Enterprise API documentation template with OpenAPI support',
        category: 'technical',
        tags: ['api', 'documentation', 'enterprise'],
        metadata: {
          version: '2.1.0',
          author: 'Enterprise Team',
          lastUpdated: new Date().toISOString(),
          features: ['openapi', 'examples', 'authentication'],
          complexity: 'advanced'
        },
        performanceMetrics: {
          averageGenerationTime: 0,
          successRate: 0,
          totalGenerations: 0,
          successfulGenerations: 0,
          lastUsed: new Date().toISOString()
        },
        crossReferences: {
          rssFeedItems: [],
          gitCommits: [],
          relatedTemplates: ['rest-api', 'graphql-api']
        }
      },
      {
        name: 'security-compliance',
        provider: DocumentationProvider.GITHUB,
        format: 'markdown',
        content: `# Security & Compliance Documentation

## Security Overview
This document outlines the security measures and compliance standards for our platform.

## Compliance Standards
{{#each complianceStandards}}
### {{name}}
- **Status**: {{status}}
- **Last Audit**: {{lastAudit}}
- **Certification**: {{certification}}

**Requirements:**
{{#each requirements}}
- {{requirement}}
{{/each}}
{{/each}}

## Security Controls
{{#each securityControls}}
### {{category}}
{{#each controls}}
- **{{name}}**: {{description}}
  - Implementation: {{implementation}}
  - Status: {{status}}
{{/each}}
{{/each}}

## Risk Assessment
| Risk | Level | Mitigation |
|------|-------|------------|
{{#each risks}}
| {{name}} | {{level}} | {{mitigation}} |
{{/each}}

## Incident Response
{{incidentResponseProcedure}}`,
        description: 'Security and compliance documentation template',
        category: 'security',
        tags: ['security', 'compliance', 'enterprise'],
        metadata: {
          version: '1.5.0',
          author: 'Security Team',
          lastUpdated: new Date().toISOString(),
          features: ['compliance', 'risk-assessment', 'incident-response'],
          complexity: 'enterprise'
        },
        performanceMetrics: {
          averageGenerationTime: 0,
          successRate: 0,
          totalGenerations: 0,
          successfulGenerations: 0,
          lastUsed: new Date().toISOString()
        },
        crossReferences: {
          rssFeedItems: [],
          gitCommits: [],
          relatedTemplates: ['audit-report', 'risk-assessment']
        }
      },
      {
        name: 'enterprise-dashboard',
        provider: DocumentationProvider.CONFLUENCE,
        format: 'markdown',
        content: `# Enterprise Dashboard

## System Overview
Real-time monitoring and analytics for enterprise operations.

## Key Metrics
{{#each metrics}}
### {{category}}
- **Current**: {{current}}
- **Target**: {{target}}
- **Status**: {{status}}
{{/each}}

## Performance Analytics
{{#each performanceCharts}}
```chart
type: {{type}}
data: {{data}}
options: {{options}}
\`\`\`
{{/each}}

## Service Health
{{#each services}}
### {{name}}
- **Status**: {{health.status}}
- **Uptime**: {{health.uptime}}
- **Response Time**: {{health.responseTime}}ms
- **Error Rate**: {{health.errorRate}}%
{{/each}}

## Recent Alerts
{{#each alerts}}
- **[{{severity}}]** {{message}} ({{timestamp}})
{{/each}}

## Action Items
{{#each actionItems}}
- [ ] {{title}} ({{assignee}}) - {{dueDate}}
{{/each}}`,
        description: 'Enterprise dashboard template with real-time metrics',
        category: 'analytics',
        tags: ['dashboard', 'metrics', 'monitoring'],
        metadata: {
          version: '3.0.0',
          author: 'DevOps Team',
          lastUpdated: new Date().toISOString(),
          features: ['real-time', 'charts', 'alerts'],
          complexity: 'advanced'
        },
        performanceMetrics: {
          averageGenerationTime: 0,
          successRate: 0,
          totalGenerations: 0,
          successfulGenerations: 0,
          lastUsed: new Date().toISOString()
        },
        crossReferences: {
          rssFeedItems: [],
          gitCommits: [],
          relatedTemplates: ['kpi-report', 'service-health']
        }
      }
    ];

    // Register all templates
    for (const template of enterpriseTemplates) {
      MCPWikiGenerator.registerCustomTemplate(template);
    }
  }

  /**
   * Set up event handlers for monitoring
   */
  private setupEventHandlers(): void {
    // Wiki generator events
    this.wikiGenerator.on('taskCompleted', (event) => {
      console.log(`✅ Wiki generation completed: ${event.task.id} (${event.processingTime}ms)`);
    });

    this.wikiGenerator.on('taskFailed', (event) => {
      console.error(`❌ Wiki generation failed: ${event.task.id} - ${event.error.message}`);
    });

    // Storage events
    this.storage.on('backup', (backup) => {
      console.log(`💾 Backup created: ${backup.id} for document ${backup.documentId}`);
    });

    // Cache events
    this.cache.on('evict', (key, item) => {
      console.log(`🗑️ Cache evicted: ${key} (${item.size} bytes)`);
    });

    // Collaboration events
    this.collaboration.on('user-joined', (user) => {
      console.log(`👤 User joined: ${user.name} (${user.id})`);
    });

    this.collaboration.on('document-changed', (user, documentId, operation) => {
      console.log(`📝 Document changed: ${documentId} by ${user.name}`);
    });
  }

  /**
   * Set up monitoring and metrics
   */
  private setupMonitoring(): void {
    // Monitor worker performance
    setInterval(() => {
      const stats = this.wikiGenerator.getStats();
      console.log('\n📊 Worker Stats:', {
        total: stats.totalWorkers,
        active: stats.activeWorkers,
        queued: stats.queuedTasks,
        throughput: `${stats.throughputPerSecond.toFixed(2)}/s`,
        avgTime: `${stats.averageProcessingTime.toFixed(2)}ms`
      });
    }, 30000); // Every 30 seconds

    // Monitor storage usage
    setInterval(async () => {
      const storageStats = await this.storage.getStorageStats();
      console.log('\n💾 Storage Stats:', {
        documents: storageStats.totalDocuments,
        versions: storageStats.totalVersions,
        backups: storageStats.totalBackups,
        usage: `${(storageStats.storageUsed / 1024 / 1024).toFixed(2)}MB`,
        avgSize: `${(storageStats.averageDocumentSize / 1024).toFixed(2)}KB`
      });
    }, 60000); // Every minute

    // Monitor cache performance
    setInterval(() => {
      const cacheStats = this.cache.getStats();
      console.log('\n🗄️ Cache Stats:', {
        items: cacheStats.metrics.itemCount,
        hitRate: `${(cacheStats.metrics.hitRate * 100).toFixed(1)}%`,
        memory: `${(cacheStats.metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`,
        avgAccess: `${cacheStats.metrics.averageAccessTime.toFixed(2)}ms`
      });
    }, 30000); // Every 30 seconds

    // Monitor collaboration
    setInterval(() => {
      const collabStats = this.collaboration.getStats();
      console.log('\n🤝 Collaboration Stats:', {
        users: collabStats.activeUsers,
        connections: collabStats.activeConnections,
        documents: collabStats.activeDocuments
      });
    }, 30000); // Every 30 seconds
  }

  /**
   * Demonstrate platform capabilities
   */
  async demonstrate(): Promise<void> {
    console.log('\n🎯 Demonstrating Enterprise Platform Capabilities...\n');

    // 1. Multi-threaded wiki generation
    console.log('1️⃣ Testing Multi-threaded Wiki Generation...');
    const template = MCPWikiGenerator.getTemplateByName('api-documentation');
    if (template) {
      const startTime = Date.now();
      const results = await this.wikiGenerator.generateBatch([template, template, template], {
        format: 'markdown',
        sections: ['overview', 'endpoints'],
        options: { includeExamples: true }
      }, { concurrency: 3 });
      
      console.log(`   ✅ Generated ${results.length} documents in ${Date.now() - startTime}ms`);
    }

    // 2. Storage with versioning
    console.log('\n2️⃣ Testing Storage with Versioning...');
    const documentId = `demo-${Date.now()}`;
    await this.storage.storeDocument(
      documentId,
      'api-documentation',
      '# Test Document\n\nThis is a test document for the enterprise platform.',
      {
        title: 'Test Document',
        author: 'Demo User',
        tags: ['demo', 'test']
      },
      'Initial version'
    );

    // Create a second version
    await this.storage.storeDocument(
      documentId,
      'api-documentation',
      '# Test Document v2\n\nThis is the second version with more content.\n\n## New Section\nAdded content here.',
      {
        title: 'Test Document',
        author: 'Demo User',
        tags: ['demo', 'test', 'v2']
      },
      'Added new section'
    );

    const storedDoc = await this.storage.getDocument(documentId);
    console.log(`   ✅ Stored document with ${storedDoc?.versions.length} versions`);

    // 3. Advanced caching
    console.log('\n3️⃣ Testing Advanced Caching...');
    await this.cache.set('demo-key', { data: 'test value', timestamp: Date.now() });
    const cached = await this.cache.get('demo-key');
    console.log(`   ✅ Cache ${cached ? 'HIT' : 'MISS'} - Hit rate: ${(this.cache.getStats().metrics.hitRate * 100).toFixed(1)}%`);

    // 4. Performance metrics
    console.log('\n4️⃣ Platform Performance Summary:');
    const workerStats = this.wikiGenerator.getStats();
    const storageStats = await this.storage.getStorageStats();
    const cacheStatsFinal = this.cache.getStats();
    const collabStats = this.collaboration.getStats();

    console.log('\n📈 Final Performance Metrics:');
    console.log('   Workers:', `${workerStats.activeWorkers}/${workerStats.totalWorkers} active`);
    console.log('   Throughput:', `${workerStats.throughputPerSecond.toFixed(2)} tasks/sec`);
    console.log('   Storage:', `${storageStats.totalDocuments} docs, ${storageStats.totalVersions} versions`);
    console.log('   Cache:', `${(cacheStatsFinal.metrics.hitRate * 100).toFixed(1)}% hit rate`);
    console.log('   Collaboration:', `${collabStats.activeUsers} users online`);

    console.log('\n🎉 Enterprise Platform Demonstration Complete!');
  }
}

// Main execution
async function main() {
  const platform = new EnterpriseWikiPlatform();
  
  try {
    await platform.start();
    await platform.demonstrate();
    
    // Keep running for demonstration
    console.log('\n⏳ Platform running... Press Ctrl+C to stop');
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down platform...');
      await platform.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('\n🛑 Shutting down platform...');
      await platform.stop();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Platform error:', error);
    await platform.stop();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export default EnterpriseWikiPlatform;
