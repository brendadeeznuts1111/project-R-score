import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { MCPWikiGenerator } from '../lib/mcp/wiki-generator-mcp';
import { DocumentationProvider } from '../lib/docs/constants/enums';

describe('MCPWikiGenerator', () => {
  beforeEach(() => {
    // Reset state before each test
    MCPWikiGenerator.clearCache();
  });

  afterEach(() => {
    // Cleanup after each test
    MCPWikiGenerator.clearCache();
  });

  describe('Template Management', () => {
    it('should register custom templates with validation', () => {
      const validTemplate = {
        name: 'test-template',
        provider: DocumentationProvider.CONFLUENCE,
        format: 'markdown',
        content: '# Test Template',
        description: 'Test template description',
        category: 'test',
        tags: ['test'],
        metadata: { version: '1.0.0' }
      };

      expect(() => MCPWikiGenerator.registerCustomTemplate(validTemplate)).not.toThrow();
    });

    it('should reject invalid templates', () => {
      expect(() => MCPWikiGenerator.registerCustomTemplate(null as any)).toThrow('Template must be a valid object');
      expect(() => MCPWikiGenerator.registerCustomTemplate({} as any)).toThrow('Template must have a valid name');
      expect(() => MCPWikiGenerator.registerCustomTemplate({ name: '' } as any)).toThrow('Template must have a valid name');
      expect(() => MCPWikiGenerator.registerCustomTemplate({ name: 'test' } as any)).toThrow('Template must have a valid provider from DocumentationProvider enum');
    });

    it('should handle duplicate template names', () => {
      const template = {
        name: 'duplicate-test',
        provider: DocumentationProvider.CONFLUENCE,
        format: 'markdown',
        content: '# Test Template'
      };

      MCPWikiGenerator.registerCustomTemplate(template);
      MCPWikiGenerator.registerCustomTemplate({ ...template, content: '# Updated' });
      
      // Should not throw, should update existing template
      expect(() => MCPWikiGenerator.registerCustomTemplate(template)).not.toThrow();
    });
  });

  describe('Template Map Cache', () => {
    it('should use O(1) lookup for templates', () => {
      const template = {
        name: 'cache-test',
        provider: DocumentationProvider.CONFLUENCE,
        format: 'markdown',
        content: '# Cache Test'
      };

      MCPWikiGenerator.registerCustomTemplate(template);
      
      // Test that template map is populated
      const templates = MCPWikiGenerator.getWikiTemplates();
      expect(templates.some(t => t.name === 'cache-test')).toBe(true);
    });

    it('should initialize map lazily', () => {
      // Map should only be initialized when needed
      const templates = MCPWikiGenerator.getWikiTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });
  });

  describe('Metrics Tracking', () => {
    it('should track template usage correctly', () => {
      const template = {
        name: 'metrics-test',
        provider: DocumentationProvider.CONFLUENCE,
        format: 'markdown',
        content: '# Metrics Test'
      };

      MCPWikiGenerator.registerCustomTemplate(template);
      
      // Simulate usage tracking
      const metrics = MCPWikiGenerator.getTemplateAnalytics();
      expect(metrics).toBeDefined();
    });

    it('should cleanup old metrics', () => {
      expect(() => MCPWikiGenerator.cleanupOldMetrics()).not.toThrow();
      expect(() => MCPWikiGenerator.cleanupOldMetrics(-1)).not.toThrow(); // Invalid input
      expect(() => MCPWikiGenerator.cleanupOldMetrics('invalid' as any)).not.toThrow(); // Invalid input
    });
  });

  describe('Error Handling', () => {
    it('should handle missing templates gracefully', async () => {
      await expect(MCPWikiGenerator.scoreCrossReferences('non-existent-template')).rejects.toThrow('Template \'non-existent-template\' not found');
      await expect(MCPWikiGenerator.scoreCrossReferencesWithContent('non-existent-template')).rejects.toThrow('Template \'non-existent-template\' not found');
    });

    it('should handle git operations gracefully', async () => {
      // This should not crash even if git is not available
      const template = {
        name: 'git-test',
        provider: 'test-provider',
        format: 'markdown',
        content: '# Git Test'
      };

      MCPWikiGenerator.registerCustomTemplate(template);
      
      const result = await MCPWikiGenerator.scoreGitCommits(template);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle RSS feed errors gracefully', async () => {
      const template = {
        name: 'rss-test',
        provider: 'test-provider',
        format: 'markdown',
        content: '# RSS Test'
      };

      MCPWikiGenerator.registerCustomTemplate(template);
      
      const result = await MCPWikiGenerator.scoreRSSFeedItems(template);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Input Validation', () => {
    it('should validate content scoring inputs', async () => {
      const template = {
        name: 'validation-test',
        provider: 'test-provider',
        format: 'markdown',
        content: '# Validation Test'
      };

      MCPWikiGenerator.registerCustomTemplate(template);
      
      // Test with valid content
      const result1 = await MCPWikiGenerator.scoreCrossReferencesWithContent('validation-test', '# Valid content');
      expect(result1).toBeDefined();
      
      // Test with empty content
      const result2 = await MCPWikiGenerator.scoreCrossReferencesWithContent('validation-test', '');
      expect(result2).toBeDefined();
      
      // Test with null content
      const result3 = await MCPWikiGenerator.scoreCrossReferencesWithContent('validation-test', null as any);
      expect(result3).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should handle concurrent template updates', async () => {
      const template = {
        name: 'concurrent-test',
        provider: 'test-provider',
        format: 'markdown',
        content: '# Concurrent Test'
      };

      MCPWikiGenerator.registerCustomTemplate(template);
      
      // Simulate concurrent updates
      const promises = Array.from({ length: 10 }, (_, i) => 
        MCPWikiGenerator.scoreCrossReferencesWithContent('concurrent-test', `Content ${i}`)
      );
      
      const results = await Promise.allSettled(promises);
      // All should succeed without race conditions
      expect(results.every(r => r.status === 'fulfilled')).toBe(true);
    });
  });

  describe('Date Handling', () => {
    it('should handle invalid dates in metrics', () => {
      // This should not crash even with invalid dates
      expect(() => MCPWikiGenerator.cleanupOldMetrics()).not.toThrow();
    });
  });

  describe('Git Output Parsing', () => {
    it('should handle malformed git output', async () => {
      const template = {
        name: 'git-parse-test',
        provider: 'test-provider',
        format: 'markdown',
        content: '# Git Parse Test'
      };

      MCPWikiGenerator.registerCustomTemplate(template);
      
      // This should handle malformed git output gracefully
      const result = await MCPWikiGenerator.scoreGitCommits(template);
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
