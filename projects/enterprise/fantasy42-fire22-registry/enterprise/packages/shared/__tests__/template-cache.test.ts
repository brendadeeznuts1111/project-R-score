/**
 * Template Cache Tests
 * Domain-Driven Design Implementation
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { TemplateCache, TemplateCacheManager } from '../template-cache';
import { HTMLTemplate } from '../html-templates';

describe('Template Cache System', () => {
  let cache: TemplateCache;
  let mockTemplate: HTMLTemplate;

  beforeEach(() => {
    cache = new TemplateCache({
      maxSize: 1024 * 1024, // 1MB
      maxEntries: 10,
      ttl: 5000, // 5 seconds
      enablePrecompile: false,
    });

    mockTemplate = {
      name: 'test-template',
      html: '<html><body>{{content}}</body></html>',
      render: (data: any) => {
        return mockTemplate.html.replace('{{content}}', data.content || 'default');
      },
    };
  });

  test('should store and retrieve templates', () => {
    cache.put('test-key', mockTemplate);
    const retrieved = cache.get('test-key');

    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('test-template');
  });

  test('should return null for non-existent templates', () => {
    const result = cache.get('non-existent');
    expect(result).toBeNull();
  });

  test('should check if template exists', () => {
    cache.put('existing', mockTemplate);
    expect(cache.has('existing')).toBe(true);
    expect(cache.has('non-existing')).toBe(false);
  });

  test('should track cache statistics', () => {
    const stats = cache.getStats();

    expect(stats).toBeDefined();
    expect(typeof stats.hits).toBe('number');
    expect(typeof stats.misses).toBe('number');
    expect(typeof stats.hitRate).toBe('number');
    expect(stats.entries).toBe(0);
  });

  test('should handle cache hits and misses', () => {
    // First access - miss
    cache.get('test-key'); // miss
    let stats = cache.getStats();
    expect(stats.misses).toBe(1);

    // Store template
    cache.put('test-key', mockTemplate);

    // Second access - hit
    cache.get('test-key'); // hit
    stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.hitRate).toBe(50); // 1 hit out of 2 total requests
  });

  test('should evict templates when cache is full', () => {
    // Create a very small cache for testing
    const smallCache = new TemplateCache({
      maxSize: 100, // Very small cache
      maxEntries: 2,
      ttl: 0,
    });

    const template1 = { ...mockTemplate, name: 'template1' };
    const template2 = { ...mockTemplate, name: 'template2' };
    const template3 = { ...mockTemplate, name: 'template3' };

    smallCache.put('key1', template1);
    smallCache.put('key2', template2);
    smallCache.put('key3', template3); // This should evict key1 (LRU)

    expect(smallCache.has('key1')).toBe(false); // Evicted
    expect(smallCache.has('key2')).toBe(true);
    expect(smallCache.has('key3')).toBe(true);
  });

  test('should respect TTL (time to live)', async () => {
    const ttlCache = new TemplateCache({
      maxSize: 1024 * 1024,
      maxEntries: 10,
      ttl: 100, // 100ms TTL
      enablePrecompile: false,
    });

    ttlCache.put('ttl-test', mockTemplate);

    // Should exist immediately
    expect(ttlCache.has('ttl-test')).toBe(true);

    // Wait for TTL to expire
    await new Promise(resolve => setTimeout(resolve, 150));

    // Should be evicted due to TTL
    expect(ttlCache.has('ttl-test')).toBe(false);
  });

  test('should evict templates', () => {
    cache.put('test', mockTemplate);
    expect(cache.has('test')).toBe(true);

    cache.evict('test');
    expect(cache.has('test')).toBe(false);
  });

  test('should clear entire cache', () => {
    cache.put('key1', mockTemplate);
    cache.put('key2', mockTemplate);

    expect(cache.getStats().entries).toBe(2);

    cache.clear();

    expect(cache.getStats().entries).toBe(0);
    expect(cache.has('key1')).toBe(false);
    expect(cache.has('key2')).toBe(false);
  });

  test('should handle pre-compiled templates', () => {
    const precompileCache = new TemplateCache({
      maxSize: 1024 * 1024,
      maxEntries: 10,
      ttl: 0,
      enablePrecompile: true,
    });

    const data = { content: 'precompiled content' };
    precompileCache.put('precompile-test', mockTemplate, data);

    // The cache should have stored the pre-compiled version
    const entry = (precompileCache as any).cache.get('precompile-test');
    expect(entry).toBeDefined();
    expect(entry.compiled).toBe('<html><body>precompiled content</body></html>');
  });
});

describe('Template Cache Manager', () => {
  let cacheManager: TemplateCacheManager;

  beforeEach(() => {
    cacheManager = TemplateCacheManager.getInstance();
    cacheManager.clear(); // Clear cache before each test
  });

  test('should be a singleton', () => {
    const instance1 = TemplateCacheManager.getInstance();
    const instance2 = TemplateCacheManager.getInstance();

    expect(instance1).toBe(instance2);
  });

  test('should store and retrieve templates', () => {
    const mockTemplate: HTMLTemplate = {
      name: 'manager-test',
      html: '<div>{{message}}</div>',
      render: (data: any) => `<div>${data.message || 'default'}</div>`,
    };

    cacheManager.put('manager-test', mockTemplate);
    const retrieved = cacheManager.get('manager-test');

    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('manager-test');
  });

  test('should handle preload queue', async () => {
    const mockTemplate: HTMLTemplate = {
      name: 'preload-test',
      html: '<span>{{text}}</span>',
      render: (data: any) => `<span>${data.text || 'preload'}</span>`,
    };

    cacheManager.queueForPreload('preload-key', mockTemplate, {
      text: 'preloaded',
    });

    expect(cacheManager.has('preload-key')).toBe(false);

    await cacheManager.preload();

    expect(cacheManager.has('preload-key')).toBe(true);
  });

  test('should provide cache statistics', () => {
    const stats = cacheManager.getStats();

    expect(stats).toBeDefined();
    expect(typeof stats.hitRate).toBe('number');
    expect(typeof stats.entries).toBe('number');
  });

  test('should get most accessed templates', () => {
    const mostAccessed = cacheManager.getMostAccessed();
    expect(Array.isArray(mostAccessed)).toBe(true);
  });
});

describe('Template Cache Integration', () => {
  test('should integrate with HTMLTemplateManager cache stats', () => {
    const { htmlTemplateManager } = require('../html-templates');

    const stats = htmlTemplateManager.getCacheStats();
    expect(stats).toBeDefined();
    expect(typeof stats.hitRate).toBe('number');
  });

  test('should integrate with HTMLReportGenerator cache methods', () => {
    const { htmlReportGenerator } = require('../html-templates');

    const stats = htmlReportGenerator.getCacheStats();
    expect(stats).toBeDefined();

    const mostAccessed = htmlReportGenerator.getMostAccessedTemplates();
    expect(Array.isArray(mostAccessed)).toBe(true);
  });
});
