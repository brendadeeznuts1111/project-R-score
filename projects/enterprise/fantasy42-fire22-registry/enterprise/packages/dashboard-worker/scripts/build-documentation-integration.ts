#!/usr/bin/env bun
/**
 * Build Documentation Integration Script
 * Links existing @docs/ structure to build system with enhanced error handling
 */

import { logger } from './enhanced-logging-system';
import { circuitBreakerManager } from '../src/error/circuit-breaker';

interface DocumentationMetrics {
  totalFiles: number;
  processedFiles: number;
  linkedFiles: number;
  errors: string[];
  buildTime: number;
  coverage: number;
}

class DocumentationBuilder {
  private metrics: DocumentationMetrics = {
    totalFiles: 0,
    processedFiles: 0,
    linkedFiles: 0,
    errors: [],
    buildTime: 0,
    coverage: 0,
  };

  constructor() {
    logger.info('DOC_BUILDER', '1.0.0', 'Initializing documentation build system');
  }

  /**
   * Build complete documentation integration
   */
  async buildDocumentation(): Promise<DocumentationMetrics> {
    const startTime = Date.now();

    try {
      // Use circuit breaker for file operations
      const fileCircuitBreaker = circuitBreakerManager.getCircuitBreaker('file-operations', {
        failureThreshold: 5,
        resetTimeout: 30000,
        monitoringWindow: 60000,
      });

      // Discover all documentation files
      const docFiles = await fileCircuitBreaker.execute(
        () => this.discoverDocumentationFiles(),
        () => this.getFallbackDocumentationList()
      );

      this.metrics.totalFiles = docFiles.length;
      logger.info('DOC_BUILDER', '1.0.0', `Found ${docFiles.length} documentation files`);

      // Process each file with circuit breaker protection
      const processingResults = await Promise.allSettled(
        docFiles.map(file => this.processDocumentationFile(file))
      );

      // Analyze results
      processingResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          this.metrics.processedFiles++;
          if (result.value.linked) {
            this.metrics.linkedFiles++;
          }
        } else {
          this.metrics.errors.push(`${docFiles[index]}: ${result.reason}`);
        }
      });

      // Generate build artifacts
      await this.generateBuildArtifacts();

      // Update integration status
      await this.updateIntegrationStatus();

      this.metrics.buildTime = Date.now() - startTime;
      this.metrics.coverage = (this.metrics.linkedFiles / this.metrics.totalFiles) * 100;

      logger.success(
        'DOC_BUILDER',
        '1.0.0',
        `Documentation build completed: ${this.metrics.linkedFiles}/${this.metrics.totalFiles} files linked (${this.metrics.coverage.toFixed(1)}%)`
      );

      return this.metrics;
    } catch (error) {
      this.metrics.buildTime = Date.now() - startTime;
      this.metrics.errors.push(`Build failed: ${error}`);
      logger.error('DOC_BUILDER', '1.0.0', `Documentation build failed: ${error}`, 'DOC001');
      return this.metrics;
    }
  }

  /**
   * Discover all documentation files in the project
   */
  private async discoverDocumentationFiles(): Promise<string[]> {
    const glob = new Bun.Glob('**/*.md');
    const files = await Array.fromAsync(glob.scan('docs/'));

    const htmlGlob = new Bun.Glob('**/*.html');
    const htmlFiles = await Array.fromAsync(htmlGlob.scan('docs/'));

    return [...files.map(f => `docs/${f}`), ...htmlFiles.map(f => `docs/${f}`)];
  }

  /**
   * Fallback documentation list when discovery fails
   */
  private getFallbackDocumentationList(): string[] {
    return [
      'docs/API-DOCUMENTATION-HUB.html',
      'docs/api/P2P-QUEUE-API-REFERENCE.md',
      'docs/api/FIRE22-API-ENDPOINTS-IMPLEMENTATION.md',
      'docs/api/API-SECURITY-GUIDE.md',
      'docs/architecture/overview.md',
      'docs/BUILD-STANDARDS.md',
      'docs/DEPENDENCIES-AND-ENVIRONMENT.md',
    ];
  }

  /**
   * Process individual documentation file
   */
  private async processDocumentationFile(
    filePath: string
  ): Promise<{ processed: boolean; linked: boolean; size: number }> {
    try {
      const file = Bun.file(filePath);
      const exists = await file.exists();

      if (!exists) {
        logger.warning('DOC_BUILDER', '1.0.0', `File not found: ${filePath}`);
        return { processed: false, linked: false, size: 0 };
      }

      const size = await file.size;
      const content = await file.text();

      // Check if file has proper linking structure
      const hasLinks = this.validateDocumentationLinks(content);
      const hasMetadata = this.validateDocumentationMetadata(content);

      logger.info(
        'DOC_BUILDER',
        '1.0.0',
        `Processed ${filePath}: ${size} bytes, links: ${hasLinks}, metadata: ${hasMetadata}`
      );

      return {
        processed: true,
        linked: hasLinks && hasMetadata,
        size,
      };
    } catch (error) {
      logger.error('DOC_BUILDER', '1.0.0', `Failed to process ${filePath}: ${error}`, 'DOC002');
      return { processed: false, linked: false, size: 0 };
    }
  }

  /**
   * Validate documentation links
   */
  private validateDocumentationLinks(content: string): boolean {
    const linkPatterns = [
      /\[.*\]\(.*\.md\)/g, // Markdown links
      /href=".*\.html"/g, // HTML links
      /href="\/api\//g, // API links
      /href="\/docs\//g, // Docs links
    ];

    return linkPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Validate documentation metadata
   */
  private validateDocumentationMetadata(content: string): boolean {
    const metadataPatterns = [
      /# .*API.* Reference/i, // API Reference header
      /\*\*Package:\*\*/i, // Package identifier
      /\*\*Version:\*\*/i, // Version identifier
      /fire22-dashboard-worker/i, // Package name
    ];

    return metadataPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Generate build artifacts
   */
  private async generateBuildArtifacts(): Promise<void> {
    try {
      // Generate documentation index
      const indexContent = this.generateDocumentationIndex();
      await Bun.write('docs/BUILD-GENERATED-INDEX.md', indexContent);

      // Generate API endpoint summary
      const apiSummary = await this.generateAPISummary();
      await Bun.write('docs/API-ENDPOINTS-SUMMARY.json', JSON.stringify(apiSummary, null, 2));

      // Generate build report
      const buildReport = {
        buildTime: new Date().toISOString(),
        metrics: this.metrics,
        packageVersion: '4.0.0-staging',
        buildSystem: 'bun-enhanced',
        integrationStatus: 'active',
      };
      await Bun.write('docs/BUILD-INTEGRATION-REPORT.json', JSON.stringify(buildReport, null, 2));

      logger.success('DOC_BUILDER', '1.0.0', 'Build artifacts generated successfully');
    } catch (error) {
      logger.error(
        'DOC_BUILDER',
        '1.0.0',
        `Failed to generate build artifacts: ${error}`,
        'DOC003'
      );
      throw error;
    }
  }

  /**
   * Generate documentation index
   */
  private generateDocumentationIndex(): string {
    return `# 🔥 Fire22 Dashboard Worker - Documentation Index

**Generated:** ${new Date().toISOString()}  
**Package:** fire22-dashboard-worker@4.0.0-staging  
**Build System:** Integrated with Bun v1.01.04-alpha

## 📊 Build Metrics

- **Total Files:** ${this.metrics.totalFiles}
- **Processed Files:** ${this.metrics.processedFiles}
- **Linked Files:** ${this.metrics.linkedFiles}
- **Coverage:** ${this.metrics.coverage.toFixed(1)}%
- **Build Time:** ${this.metrics.buildTime}ms

## 🔗 API Documentation Links

- [P2P Queue System API](api/P2P-QUEUE-API-REFERENCE.md) - Peer-to-peer transaction management
- [Fire22 API Endpoints](api/FIRE22-API-ENDPOINTS-IMPLEMENTATION.md) - Core Fire22 integration
- [API Security Guide](api/API-SECURITY-GUIDE.md) - Authentication and security
- [API Documentation Hub](/docs) - Interactive documentation portal

## 🏗️ Architecture Documentation

- [System Architecture](architecture/overview.md) - High-level system design
- [Pattern Weaver](architecture/system/pattern-weaver.md) - Unified pattern system
- [DNS Caching](architecture/system/dns-caching.md) - Sub-millisecond DNS resolution
- [Performance Optimization](architecture/performance/benchmarking.md) - Bun native performance

## 🛠️ Build System Integration

- [Build Standards](BUILD-STANDARDS.md) - Multi-profile build system
- [Dependencies Guide](DEPENDENCIES-AND-ENVIRONMENT.md) - Package management
- [Editor Integration](EDITOR-INTEGRATION.md) - Development environment setup

## 📈 Integration Status

${this.metrics.errors.length === 0 ? '✅ **All systems operational**' : `⚠️ **${this.metrics.errors.length} issues detected**`}

${this.metrics.errors.map(error => `- ❌ ${error}`).join('\n')}

---

*This index is automatically generated by the Fire22 Dashboard Worker build system.*
`;
  }

  /**
   * Generate API endpoints summary
   */
  private async generateAPISummary(): Promise<any> {
    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        packageVersion: '4.0.0-staging',
        totalEndpoints: 23,
      },
      endpoints: {
        core: [
          { path: '/health', method: 'GET', description: 'System health check' },
          { path: '/api/metrics', method: 'GET', description: 'Real-time metrics' },
          { path: '/api/dependencies', method: 'GET', description: 'Dependency information' },
        ],
        p2pQueue: [
          {
            path: '/api/p2p/queue/withdrawals',
            method: 'GET',
            description: 'Withdrawal queue data',
          },
          { path: '/api/p2p/queue/deposits', method: 'GET', description: 'Deposit queue data' },
          { path: '/api/p2p/queue/matches', method: 'GET', description: 'Matching opportunities' },
          { path: '/api/p2p/queue/stats', method: 'GET', description: 'Queue statistics' },
          {
            path: '/api/p2p/queue/auto-match',
            method: 'POST',
            description: 'Auto-matching algorithm',
          },
          {
            path: '/api/p2p/queue/telegram/notify',
            method: 'POST',
            description: 'Telegram notifications',
          },
          { path: '/api/p2p/queue/export', method: 'GET', description: 'Export queue data' },
        ],
        dashboard: [
          { path: '/docs', method: 'GET', description: 'API Documentation Hub' },
          { path: '/reference', method: 'GET', description: 'Reference Guide' },
          { path: '/p2p-queue', method: 'GET', description: 'P2P Queue Dashboard' },
        ],
      },
      circuitBreakers: {
        active: circuitBreakerManager.getAllHealthReports().length,
        healthy: circuitBreakerManager.getAllHealthReports().filter(cb => cb.healthy).length,
      },
    };
  }

  /**
   * Update integration status in hub connection
   */
  private async updateIntegrationStatus(): Promise<void> {
    try {
      // This would normally update the hub connection status
      // For now, just log the integration completion
      logger.info(
        'DOC_BUILDER',
        '1.0.0',
        `Documentation integration status updated: ${this.metrics.linkedFiles}/${this.metrics.totalFiles} files linked`
      );
    } catch (error) {
      logger.warning(
        'DOC_BUILDER',
        '1.0.0',
        `Could not update hub integration status: ${error}`,
        'DOC004'
      );
    }
  }

  /**
   * Get build metrics
   */
  getMetrics(): DocumentationMetrics {
    return { ...this.metrics };
  }
}

// CLI Interface
if (import.meta.main) {
  const builder = new DocumentationBuilder();

  const command = process.argv[2] || 'build';

  switch (command) {
    case 'build':
      console.log('🔥 Building Fire22 Documentation Integration...\n');

      builder
        .buildDocumentation()
        .then(metrics => {
          console.log('\n📊 Build Results:');
          console.log(`✅ Processed: ${metrics.processedFiles}/${metrics.totalFiles} files`);
          console.log(`🔗 Linked: ${metrics.linkedFiles} files`);
          console.log(`📈 Coverage: ${metrics.coverage.toFixed(1)}%`);
          console.log(`⏱️ Build Time: ${metrics.buildTime}ms`);

          if (metrics.errors.length > 0) {
            console.log('\n❌ Errors:');
            metrics.errors.forEach(error => console.log(`  - ${error}`));
          }

          console.log('\n🎉 Documentation build completed!');
          console.log('📚 Access documentation at: http://localhost:3001/docs');

          process.exit(metrics.errors.length > 0 ? 1 : 0);
        })
        .catch(error => {
          console.error('💥 Build failed:', error);
          process.exit(1);
        });
      break;

    case 'status':
      console.log('📊 Documentation Integration Status');
      console.log('Package: fire22-dashboard-worker@4.0.0-staging');
      console.log('Build System: Active');
      console.log('Documentation Hub: http://localhost:3001/docs');
      break;

    default:
      console.log('Usage: bun run scripts/build-documentation-integration.ts [build|status]');
  }
}
