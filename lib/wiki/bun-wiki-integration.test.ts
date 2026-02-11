import { test, expect, describe } from 'bun:test';

import { CacheManager } from '../core/cache-manager.ts';

import { BunWikiIntegration } from './bun-wiki-integration.ts';

// Minimal mock for BunDocumentationIntegration
const mockDocIntegration = {
  initialize: async () => {
    await Promise.resolve();
  },
  getDocumentationIndex: () => ({
    categories: [
      {
        name: 'Runtime',
        description: 'Bun runtime APIs',
        pages: [
          {
            title: 'Bun.serve',
            description: 'HTTP server API',
            category: 'runtime',
            path: '/docs/api/http',
            url: 'https://bun.sh/docs/api/http',
            lastModified: '2025-01-01T00:00:00Z',
            examples: [
              {
                title: 'Basic server',
                description: 'A basic HTTP server',
                code: 'Bun.serve({ fetch() { return new Response("hi") } })',
                language: 'typescript',
                runnable: true,
              },
            ],
          },
        ],
      },
    ],
  }),
} as any;

describe('BunWikiIntegration', () => {
  test('constructor sets default config values (baseUrl, autoSync, syncInterval)', () => {
    const wiki = new BunWikiIntegration(mockDocIntegration);
    // @ts-expect-error — accessing private for test
    const config = wiki.config;
    expect(config.baseUrl).toBe('https://wiki.factorywager.com');
    expect(config.autoSync).toBe(true);
    expect(config.syncInterval).toBe(30);
  });

  test('CacheManager is used (not raw Map)', () => {
    const wiki = new BunWikiIntegration(mockDocIntegration);
    // @ts-expect-error — accessing private for test
    expect(wiki.wikiCache).toBeInstanceOf(CacheManager);
  });

  test('pageIds set is initialized empty', () => {
    const wiki = new BunWikiIntegration(mockDocIntegration);
    // @ts-expect-error — accessing private for test
    expect(wiki.pageIds).toBeInstanceOf(Set);
    // @ts-expect-error — accessing private for test
    expect(wiki.pageIds.size).toBe(0);
  });

  test('generateWikiId sanitizes special chars and collapses dashes', () => {
    const wiki = new BunWikiIntegration(mockDocIntegration);
    // @ts-expect-error — accessing private for test
    const id = wiki.generateWikiId('/docs/api/http');
    expect(id).toBe('docs-api-http');
    // Should not have leading/trailing dashes
    expect(id).not.toMatch(/^-|-$/);
    // Should not have consecutive dashes
    expect(id).not.toMatch(/--/);
  });

  test('extractTags extracts category, language, keyword tags', () => {
    const wiki = new BunWikiIntegration(mockDocIntegration);
    const docPage = {
      title: 'Bun Runtime Server',
      description: 'Runtime server for Bun',
      category: 'runtime',
      path: '/docs/api/http',
      examples: [{ language: 'typescript', title: 'ex', description: 'd', code: 'c', runnable: true }],
    };
    // @ts-expect-error — accessing private for test
    const tags = wiki.extractTags(docPage);
    expect(tags).toContain('runtime');
    expect(tags).toContain('typescript');
    expect(tags).toContain('bun');
  });

  test('generateWikiContent produces markdown with title/description/metadata', async () => {
    const wiki = new BunWikiIntegration(mockDocIntegration);
    const docPage = {
      title: 'Test Page',
      description: 'A test description',
      category: 'runtime',
      path: '/docs/test',
      url: 'https://bun.sh/docs/test',
      examples: [],
    };
    // @ts-expect-error — accessing private for test
    const content = await wiki.generateWikiContent(docPage);
    expect(content).toContain('# Test Page');
    expect(content).toContain('A test description');
    expect(content).toContain('Category: runtime');
  });

  test('searchWiki returns empty for no matches', async () => {
    const wiki = new BunWikiIntegration(mockDocIntegration, { autoSync: false });
    const results = await wiki.searchWiki('nonexistent-xyz-query');
    expect(results).toEqual([]);
  });

  test('getWikiPage returns null for missing ID', async () => {
    const wiki = new BunWikiIntegration(mockDocIntegration, { autoSync: false });
    const page = await wiki.getWikiPage('does-not-exist');
    expect(page).toBeNull();
  });

  test('getWikiStats returns correct shape', async () => {
    const wiki = new BunWikiIntegration(mockDocIntegration, { autoSync: false });
    const stats = await wiki.getWikiStats();
    expect(stats).toHaveProperty('totalCategories');
    expect(stats).toHaveProperty('totalPages');
    expect(stats).toHaveProperty('totalExamples');
    expect(stats).toHaveProperty('lastSync');
    expect(typeof stats.totalCategories).toBe('number');
    expect(typeof stats.totalPages).toBe('number');
    expect(typeof stats.totalExamples).toBe('number');
    expect(typeof stats.lastSync).toBe('string');
  });

  test('exportWiki("json") returns valid JSON', async () => {
    const wiki = new BunWikiIntegration(mockDocIntegration, { autoSync: false });
    const jsonStr = await wiki.exportWiki('json');
    const parsed = JSON.parse(jsonStr);
    expect(Array.isArray(parsed)).toBe(true);
  });
});
