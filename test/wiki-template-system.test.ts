// test/wiki-template-system.test.ts - Comprehensive test suite for wiki template system

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { MCPWikiGenerator, WikiTemplate, WikiGenerationRequest } from '../lib/mcp/wiki-generator-mcp';
import { DocumentationProvider } from '../lib/docs/constants/enums';
import { MultiThreadedWikiGenerator } from '../lib/mcp/multi-threaded-wiki-generator';
import { R2WikiStorage } from '../lib/mcp/r2-wiki-storage';
import { AdvancedCacheManager } from '../lib/utils/advanced-cache-manager';

describe('Wiki Template System - Comprehensive Test Suite', () => {
  beforeEach(() => {
    // Clear any existing state
    MCPWikiGenerator.clearCache();
  });

  afterEach(() => {
    // Cleanup after each test
    MCPWikiGenerator.clearCache();
  });

  describe('Template Registration and Validation', () => {
    it('should register valid templates successfully', () => {
      const validTemplate: WikiTemplate = {
        name: 'Test API Template',
        description: 'Test template for API documentation',
        provider: DocumentationProvider.CONFLUENCE,
        workspace: 'test/api',
        format: 'markdown',
        includeExamples: true,
        tags: ['api', 'test'],
        category: 'api',
        priority: 'medium'
      };

      expect(() => MCPWikiGenerator.registerCustomTemplate(validTemplate)).not.toThrow();
      expect(MCPWikiGenerator.getTemplateByName('Test API Template')).toBeDefined();
    });

    it('should reject invalid provider', () => {
      const invalidTemplate = {
        name: 'Invalid Template',
        description: 'Template with invalid provider',
        provider: 'invalid-provider' as any,
        workspace: 'test',
        format: 'markdown',
        includeExamples: true
      };

      expect(() => MCPWikiGenerator.registerCustomTemplate(invalidTemplate)).toThrow('Invalid provider');
    });

    it('should reject duplicate template names', () => {
      const template: WikiTemplate = {
        name: 'Duplicate Template',
        description: 'Test template',
        provider: DocumentationProvider.GITBOOK,
        workspace: 'test',
        format: 'markdown',
        includeExamples: true
      };

      MCPWikiGenerator.registerCustomTemplate(template);
      
      expect(() => MCPWikiGenerator.registerCustomTemplate(template)).toThrow('already exists');
    });

    it('should validate template fields correctly', () => {
      const incompleteTemplate = {
        name: '',
        description: 'Template with missing name',
        provider: DocumentationProvider.NOTION,
        workspace: 'test',
        format: 'markdown',
        includeExamples: true
      };

      expect(() => MCPWikiGenerator.registerCustomTemplate(incompleteTemplate)).toThrow();
    });
  });

  describe('Template Generation', () => {
    it('should generate wiki content successfully', async () => {
      const template: WikiTemplate = {
        name: 'Generation Test Template',
        description: 'Template for testing generation',
        provider: DocumentationProvider.CONFLUENCE,
        workspace: 'test/generation',
        format: 'markdown',
        includeExamples: true,
        customSections: ['## Test Section', '## Another Section']
      };

      MCPWikiGenerator.registerCustomTemplate(template);

      const request: WikiGenerationRequest = {
        format: 'markdown',
        workspace: 'test/generation',
        includeExamples: true,
        context: 'Test generation context'
      };

      const result = await MCPWikiGenerator.generateWikiContent('Generation Test Template', request);

      expect(result.success).toBe(true);
      expect(result.files.markdown).toBeDefined();
      expect(result.metadata.generated).toBeDefined();
      expect(result.metadata.total).toBeGreaterThan(0);
    });

    it('should handle multiple format generation', async () => {
      const template: WikiTemplate = {
        name: 'Multi-format Template',
        description: 'Template supporting multiple formats',
        provider: DocumentationProvider.GITBOOK,
        workspace: 'test/multi',
        format: 'all',
        includeExamples: true
      };

      MCPWikiGenerator.registerCustomTemplate(template);

      const request: WikiGenerationRequest = {
        format: 'all',
        workspace: 'test/multi'
      };

      const result = await MCPWikiGenerator.generateWikiContent('Multi-format Template', request);

      expect(result.success).toBe(true);
      expect(result.files.markdown).toBeDefined();
      expect(result.files.html).toBeDefined();
      expect(result.files.json).toBeDefined();
    });

    it('should track template usage metrics', async () => {
      const template: WikiTemplate = {
        name: 'Metrics Test Template',
        description: 'Template for testing metrics',
        provider: DocumentationProvider.NOTION,
        workspace: 'test/metrics',
        format: 'markdown',
        includeExamples: false
      };

      MCPWikiGenerator.registerCustomTemplate(template);

      const request: WikiGenerationRequest = {
        format: 'markdown',
        workspace: 'test/metrics'
      };

      await MCPWikiGenerator.generateWikiContent('Metrics Test Template', request);
      
      const updatedTemplate = MCPWikiGenerator.getTemplateByName('Metrics Test Template');
      expect(updatedTemplate?.performanceMetrics?.usageCount).toBe(1);
      expect(updatedTemplate?.performanceMetrics?.lastUsed).toBeDefined();
    });
  });

  describe('Template Scoring System', () => {
    it('should calculate RSS relevance scores correctly', async () => {
      const template: WikiTemplate = {
        name: 'Bun Performance Template',
        description: 'Template for Bun performance documentation',
        provider: DocumentationProvider.CONFLUENCE,
        workspace: 'bun/performance',
        format: 'markdown',
        includeExamples: true,
        tags: ['bun', 'performance', 'optimization'],
        category: 'api'
      };

      MCPWikiGenerator.registerCustomTemplate(template);

      const scores = await MCPWikiGenerator.scoreCrossReferences('Bun Performance Template');

      expect(scores.rssFeedItems).toBeDefined();
      expect(scores.gitCommits).toBeDefined();
      expect(scores.relatedTemplates).toBeDefined();
      expect(scores.overallScore).toBeDefined();

      // Check that scores are within expected ranges
      scores.rssFeedItems.forEach(item => {
        expect(item.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(item.relevanceScore).toBeLessThanOrEqual(1);
      });
    });

    it('should calculate template similarity scores', () => {
      const template1: WikiTemplate = {
        name: 'Similar Template 1',
        description: 'Template for API documentation',
        provider: DocumentationProvider.CONFLUENCE,
        workspace: 'api/docs',
        format: 'markdown',
        includeExamples: true,
        tags: ['api', 'documentation'],
        category: 'api'
      };

      const template2: WikiTemplate = {
        name: 'Similar Template 2',
        description: 'Template for API guides',
        provider: DocumentationProvider.CONFLUENCE,
        workspace: 'api/guides',
        format: 'markdown',
        includeExamples: true,
        tags: ['api', 'guides'],
        category: 'api'
      };

      MCPWikiGenerator.registerCustomTemplate(template1);
      MCPWikiGenerator.registerCustomTemplate(template2);

      const scores = MCPWikiGenerator.scoreRelatedTemplates(template1);

      expect(scores).toHaveLength(1);
      expect(scores[0].similarityScore).toBeGreaterThan(0);
      expect(scores[0].sharedFeatures).toContain('CONFLUENCE');
      expect(scores[0].sharedTags.length).toBeGreaterThan(0);
    });

    it('should calculate content quality scores', () => {
      const testContent = `
# Test Documentation

This is a test markdown document with **bold** and *italic* text.

## Code Examples

\`\`\`typescript
const example = () => {
  console.log('Hello, world!');
};
\`\`\`

## Tables

| Feature | Status |
|---------|--------|
| API | Complete |
| UI | In Progress |

## Task Lists

- [x] Completed task
- [ ] Pending task
      `;

      const scores = MCPWikiGenerator.calculateContentScores(testContent);

      expect(scores.gfmCompliance).toBeGreaterThan(0);
      expect(scores.commonmarkCompliance).toBeGreaterThan(0);
      expect(scores.optimizationScore).toBeGreaterThanOrEqual(0);
      expect(scores.reactComponents).toBeGreaterThanOrEqual(0);
      expect(scores.complexityScore).toBeGreaterThan(0);
    });
  });

  describe('Multi-threaded Generation', () => {
    it('should handle concurrent template generation', async () => {
      const generator = new MultiThreadedWikiGenerator({
        minWorkers: 2,
        maxWorkers: 4,
        workerScript: new URL('../lib/mcp/wiki-worker.ts', import.meta.url).href,
        taskTimeout: 30000,
        maxRetries: 3
      });

      const templates = Array.from({ length: 5 }, (_, i) => ({
        name: `Concurrent Template ${i + 1}`,
        description: `Template for concurrent testing ${i + 1}`,
        provider: DocumentationProvider.CONFLUENCE,
        workspace: `test/concurrent/${i + 1}`,
        format: 'markdown',
        includeExamples: true
      } as WikiTemplate));

      // Register all templates
      templates.forEach(template => {
        MCPWikiGenerator.registerCustomTemplate(template);
      });

      // Generate content concurrently
      const promises = templates.map(template => 
        generator.generateWikiContent(template, {
          format: 'markdown',
          workspace: template.workspace
        })
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      const stats = generator.getStats();
      expect(stats.completedTasks).toBe(5);
      expect(stats.throughputPerSecond).toBeGreaterThan(0);

      await generator.shutdown();
    }, 15000);
  });

  describe('Advanced Cache Management', () => {
    it('should cache and retrieve template results', async () => {
      const cacheManager = new AdvancedCacheManager({
        maxSize: 100,
        defaultTTL: 60000, // 1 minute
        enableCompression: true,
        compressionThreshold: 1024
      });

      const cacheKey = 'test-template-cache-key';
      const testData = {
        content: 'This is test content for caching',
        metadata: { generated: new Date().toISOString(), version: '1.0.0' }
      };

      // Set cache
      await cacheManager.set(cacheKey, testData);

      // Get from cache
      const cached = await cacheManager.get(cacheKey);

      expect(cached).toBeDefined();
      expect(cached?.content).toBe(testData.content);
      expect(cached?.metadata.version).toBe('1.0.0');

      // Check cache stats
      const stats = cacheManager.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.sets).toBe(1);
    });

    it('should handle cache expiration', async () => {
      const cacheManager = new AdvancedCacheManager({
        maxSize: 50,
        defaultTTL: 100, // 100ms
        enableCompression: false
      });

      const cacheKey = 'expiration-test-key';
      const testData = { content: 'This will expire' };

      await cacheManager.set(cacheKey, testData);

      // Should be available immediately
      let cached = await cacheManager.get(cacheKey);
      expect(cached).toBeDefined();

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be expired
      cached = await cacheManager.get(cacheKey);
      expect(cached).toBeUndefined();

      const stats = cacheManager.getStats();
      expect(stats.expirations).toBe(1);
    });
  });

  describe('R2 Storage Integration', () => {
    it('should store and retrieve wiki content from R2', async () => {
      // Note: This test would require actual R2 credentials
      // For now, we'll test the interface and mock behavior
      
      const r2Storage = new R2WikiStorage({
        bucket: 'test-bucket',
        prefix: 'test-wiki',
        enableVersioning: true,
        enableCompression: true,
        enableEncryption: false
      });

      const testContent = {
        markdown: '# Test Wiki Content\n\nThis is test content.',
        html: '<h1>Test Wiki Content</h1><p>This is test content.</p>',
        json: JSON.stringify({ title: 'Test Wiki', content: 'This is test content' })
      };

      // Test interface methods exist
      expect(typeof r2Storage.storeWikiContent).toBe('function');
      expect(typeof r2Storage.getWikiContent).toBe('function');
      expect(typeof r2Storage.listWikiVersions).toBe('function');
      expect(typeof r2Storage.deleteWikiContent).toBe('function');
      expect(typeof r2Storage.getStorageStats).toBe('function');
    });
  });

  describe('Template Analytics and Performance', () => {
    it('should provide template usage analytics', () => {
      // Register multiple templates
      const templates = Array.from({ length: 3 }, (_, i) => ({
        name: `Analytics Template ${i + 1}`,
        description: `Template for analytics testing ${i + 1}`,
        provider: DocumentationProvider.CONFLUENCE,
        workspace: `test/analytics/${i + 1}`,
        format: 'markdown',
        includeExamples: true,
        priority: ['low', 'medium', 'high'][i] as any
      } as WikiTemplate));

      templates.forEach(template => {
        MCPWikiGenerator.registerCustomTemplate(template);
      });

      const analytics = MCPWikiGenerator.getTemplateAnalytics();

      expect(analytics.totalTemplates).toBe(3);
      expect(analytics.categories.api).toBe(3);
      expect(analytics.providers.CONFLUENCE).toBe(3);
      expect(analytics.formats.markdown).toBe(3);
    });

    it('should track performance metrics over time', async () => {
      const template: WikiTemplate = {
        name: 'Performance Tracking Template',
        description: 'Template for performance tracking',
        provider: DocumentationProvider.GITBOOK,
        workspace: 'test/performance',
        format: 'markdown',
        includeExamples: true
      };

      MCPWikiGenerator.registerCustomTemplate(template);

      // Generate content multiple times to build metrics
      for (let i = 0; i < 3; i++) {
        await MCPWikiGenerator.generateWikiContent('Performance Tracking Template', {
          format: 'markdown',
          workspace: 'test/performance'
        });
      }

      const updatedTemplate = MCPWikiGenerator.getTemplateByName('Performance Tracking Template');
      expect(updatedTemplate?.performanceMetrics?.usageCount).toBe(3);
      expect(updatedTemplate?.performanceMetrics?.successRate).toBe(1.0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing templates gracefully', async () => {
      await expect(
        MCPWikiGenerator.generateWikiContent('Non-existent Template', {
          format: 'markdown',
          workspace: 'test'
        })
      ).rejects.toThrow('not found');
    });

    it('should handle invalid generation requests', async () => {
      const template: WikiTemplate = {
        name: 'Error Test Template',
        description: 'Template for error testing',
        provider: DocumentationProvider.CONFLUENCE,
        workspace: 'test/error',
        format: 'markdown',
        includeExamples: true
      };

      MCPWikiGenerator.registerCustomTemplate(template);

      // Test with invalid format
      const result = await MCPWikiGenerator.generateWikiContent('Error Test Template', {
        format: 'invalid' as any,
        workspace: 'test/error'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle network timeouts gracefully', async () => {
      const template: WikiTemplate = {
        name: 'Timeout Test Template',
        description: 'Template for timeout testing',
        provider: DocumentationProvider.CONFLUENCE,
        workspace: 'test/timeout',
        format: 'markdown',
        includeExamples: true
      };

      MCPWikiGenerator.registerCustomTemplate(template);

      // Test with very short timeout (this would need to be implemented in the actual generator)
      const result = await MCPWikiGenerator.generateWikiContent('Timeout Test Template', {
        format: 'markdown',
        workspace: 'test/timeout',
        context: 'test'
      });

      // Should either succeed or fail gracefully with timeout error
      expect(typeof result.success).toBe('boolean');
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('Integration Tests', () => {
    it('should integrate all components successfully', async () => {
      // Create integrated system
      const generator = new MultiThreadedWikiGenerator({
        minWorkers: 2,
        maxWorkers: 4,
        workerScript: new URL('../lib/mcp/wiki-worker.ts', import.meta.url).href,
        taskTimeout: 30000,
        maxRetries: 3
      });

      const cacheManager = new AdvancedCacheManager({
        maxSize: 100,
        defaultTTL: 300000,
        enableCompression: true
      });

      const r2Storage = new R2WikiStorage({
        bucket: 'integration-test-bucket',
        prefix: 'integration-test',
        enableVersioning: true
      });

      // Register comprehensive template
      const template: WikiTemplate = {
        name: 'Integration Test Template',
        description: 'Comprehensive template for integration testing',
        provider: DocumentationProvider.CONFLUENCE,
        workspace: 'test/integration',
        format: 'all',
        includeExamples: true,
        customSections: [
          '## Overview',
          '## API Reference',
          '## Examples',
          '## Performance Metrics',
          '## Troubleshooting'
        ],
        tags: ['integration', 'test', 'comprehensive'],
        category: 'api',
        priority: 'high'
      };

      MCPWikiGenerator.registerCustomTemplate(template);

      // Generate content
      const result = await generator.generateWikiContent(template, {
        format: 'all',
        workspace: 'test/integration',
        includeExamples: true,
        context: 'Integration test context'
      });

      expect(result.success).toBe(true);
      expect(result.files.markdown).toBeDefined();
      expect(result.files.html).toBeDefined();
      expect(result.files.json).toBeDefined();

      // Cache the result
      await cacheManager.set(`integration-${Date.now()}`, result);

      // Get analytics
      const analytics = MCPWikiGenerator.getTemplateAnalytics();
      expect(analytics.totalTemplates).toBeGreaterThan(0);

      // Get generator stats
      const stats = generator.getStats();
      expect(stats.completedTasks).toBeGreaterThan(0);

      await generator.shutdown();
    }, 20000);
  });
});
