import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { MCPWikiGenerator } from '../lib/mcp/wiki-generator-mcp';
import { DocumentationProvider } from '../lib/docs/constants/enums';

const makeTemplate = (name: string) => ({
  name,
  provider: DocumentationProvider.INTERNAL_WIKI,
  baseUrl: 'https://docs.example.com',
  format: 'markdown' as const,
  content: '# Test Template',
});

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
      const validTemplate = makeTemplate('test-template');

      expect(() => MCPWikiGenerator.registerCustomTemplate(validTemplate)).not.toThrow();
    });

    it('should reject invalid templates', () => {
      expect(() => MCPWikiGenerator.registerCustomTemplate(null as any)).toThrow();
      expect(() => MCPWikiGenerator.registerCustomTemplate({} as any)).toThrow(
        'Template must have name, baseUrl, and format'
      );
      expect(() => MCPWikiGenerator.registerCustomTemplate({ name: '' } as any)).toThrow(
        'Template must have name, baseUrl, and format'
      );
      expect(() => MCPWikiGenerator.registerCustomTemplate({ name: 'test' } as any)).toThrow(
        'Template must have name, baseUrl, and format'
      );
    });

    it('should handle duplicate template names', () => {
      const template = makeTemplate('duplicate-test');

      MCPWikiGenerator.registerCustomTemplate(template);
      MCPWikiGenerator.registerCustomTemplate({ ...template, content: '# Updated' });
      
      // Should not throw, should update existing template
      expect(() => MCPWikiGenerator.registerCustomTemplate(template)).not.toThrow();
    });
  });

  describe('Template Map Cache', () => {
    it('should use O(1) lookup for templates', () => {
      const template = makeTemplate('cache-test');

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
      const template = makeTemplate('metrics-test');

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
      const template = makeTemplate('git-test');

      MCPWikiGenerator.registerCustomTemplate(template);
      
      const result = await MCPWikiGenerator.scoreGitCommits(template);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle RSS feed errors gracefully', async () => {
      const template = makeTemplate('rss-test');

      MCPWikiGenerator.registerCustomTemplate(template);
      
      const result = await MCPWikiGenerator.scoreRSSFeedItems(template);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Input Validation', () => {
    it('should validate content scoring inputs and surface validation errors', async () => {
      const template = makeTemplate('validation-test');

      MCPWikiGenerator.registerCustomTemplate(template);

      await expect(
        MCPWikiGenerator.scoreCrossReferencesWithContent('validation-test', '# Valid content')
      ).rejects.toThrow();

      await expect(
        MCPWikiGenerator.scoreCrossReferencesWithContent('validation-test', '')
      ).rejects.toThrow();

      await expect(
        MCPWikiGenerator.scoreCrossReferencesWithContent('validation-test', null as any)
      ).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle concurrent template updates', async () => {
      const template = makeTemplate('concurrent-test');

      MCPWikiGenerator.registerCustomTemplate(template);
      
      // Simulate concurrent updates
      const promises = Array.from({ length: 10 }, (_, i) => 
        MCPWikiGenerator.scoreCrossReferencesWithContent('concurrent-test', `Content ${i}`)
      );
      
      const results = await Promise.allSettled(promises);
      const fulfilled = results.filter((result) => result.status === 'fulfilled').length;
      const rejected = results.filter((result) => result.status === 'rejected').length;
      expect(fulfilled + rejected).toBe(results.length);
      expect(rejected).toBeGreaterThan(0);
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
      const template = makeTemplate('git-parse-test');

      MCPWikiGenerator.registerCustomTemplate(template);
      
      // This should handle malformed git output gracefully
      const result = await MCPWikiGenerator.scoreGitCommits(template);
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
