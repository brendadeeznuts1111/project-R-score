/**
 * Tests for Metadata Service
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { metadataService, TOPICS } from '../metadataService';

describe('MetadataService', () => {
  beforeEach(() => {
    // Clear service state before each test
    metadataService['metadata'].clear();
    metadataService['tags'].clear();
  });

  describe('Metadata CRUD', () => {
    it('should create metadata', () => {
      const meta = metadataService.createMetadata({
        title: 'Test Theme',
        description: 'A test theme',
        author: 'test@example.com',
        version: '1.0.0',
        published: false,
        topics: ['development'],
        tags: ['test'],
        categories: ['themes'],
        slug: 'test-theme',
        keywords: ['test', 'theme'],
        summary: 'Test summary',
        visibility: 'private',
        license: 'MIT',
        views: 0,
        downloads: 0,
        rating: 0,
        reviews: 0,
        relatedItems: [],
        dependencies: [],
      });

      expect(meta.id).toBeDefined();
      expect(meta.title).toBe('Test Theme');
      expect(meta.author).toBe('test@example.com');
      expect(meta.created).toBeDefined();
      expect(meta.updated).toBeDefined();
    });

    it('should retrieve metadata by id', () => {
      const meta = metadataService.createMetadata({
        title: 'Test',
        description: 'Test',
        author: 'test@example.com',
        version: '1.0.0',
        published: false,
        topics: [],
        tags: [],
        categories: [],
        slug: 'test',
        keywords: [],
        summary: 'Test',
        visibility: 'public',
        license: 'MIT',
        views: 0,
        downloads: 0,
        rating: 0,
        reviews: 0,
        relatedItems: [],
        dependencies: [],
      });

      const retrieved = metadataService.getMetadata(meta.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(meta.id);
      expect(retrieved?.title).toBe('Test');
    });

    it('should update metadata', async () => {
      const meta = metadataService.createMetadata({
        title: 'Original',
        description: 'Original',
        author: 'test@example.com',
        version: '1.0.0',
        published: false,
        topics: [],
        tags: [],
        categories: [],
        slug: 'original',
        keywords: [],
        summary: 'Original',
        visibility: 'public',
        license: 'MIT',
        views: 0,
        downloads: 0,
        rating: 0,
        reviews: 0,
        relatedItems: [],
        dependencies: [],
      });

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const updated = metadataService.updateMetadata(meta.id, {
        title: 'Updated',
        views: 10,
      });

      expect(updated?.title).toBe('Updated');
      expect(updated?.views).toBe(10);
      expect(updated?.updated).toBeGreaterThanOrEqual(meta.updated);
    });
  });

  describe('Search and Filter', () => {
    beforeEach(() => {
      metadataService.createMetadata({
        title: 'Lightning Network Guide',
        description: 'Guide to Lightning Network',
        author: 'test@example.com',
        version: '1.0.0',
        published: true,
        topics: ['lightning-network', 'bitcoin'],
        tags: ['guide', 'tutorial'],
        categories: ['docs'],
        slug: 'lightning-guide',
        keywords: ['lightning', 'bitcoin', 'guide'],
        summary: 'Lightning Network Guide',
        visibility: 'public',
        license: 'MIT',
        views: 100,
        downloads: 50,
        rating: 4.5,
        reviews: 10,
        relatedItems: [],
        dependencies: [],
      });

      metadataService.createMetadata({
        title: 'Security Best Practices',
        description: 'Security practices',
        author: 'test@example.com',
        version: '1.0.0',
        published: true,
        topics: ['security', 'authentication'],
        tags: ['security', 'best-practices'],
        categories: ['docs'],
        slug: 'security-practices',
        keywords: ['security', 'auth'],
        summary: 'Security practices',
        visibility: 'public',
        license: 'MIT',
        views: 200,
        downloads: 100,
        rating: 4.8,
        reviews: 20,
        relatedItems: [],
        dependencies: [],
      });
    });

    it('should search metadata by query', () => {
      const results = metadataService.searchMetadata('Lightning');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toContain('Lightning');
    });

    it('should filter by topic', () => {
      const results = metadataService.getByTopic('lightning-network');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].topics).toContain('lightning-network');
    });

    it('should filter by tag', () => {
      const results = metadataService.getByTag('security');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].tags).toContain('security');
    });
  });

  describe('Topics', () => {
    it('should have predefined topics', () => {
      expect(Object.keys(TOPICS).length).toBe(17);
      expect(TOPICS['lightning-network']).toBeDefined();
      expect(TOPICS['security']).toBeDefined();
    });

    it('should have topic metadata', () => {
      const topic = TOPICS['development'];
      expect(topic.icon).toBeDefined();
      expect(topic.color).toBeDefined();
      expect(topic.description).toBeDefined();
    });
  });

  describe('Tag Management', () => {
    it('should create tag', () => {
      const tag = metadataService.createTag({
        name: 'Dark Mode',
        slug: 'dark-mode',
        description: 'Dark theme support',
        color: '#1a1a1a',
        icon: '🌙',
        category: 'themes',
        relatedTags: [],
      });

      expect(tag.id).toBeDefined();
      expect(tag.name).toBe('Dark Mode');
      expect(tag.itemCount).toBe(0);
    });

    it('should increment tag count', () => {
      const tag = metadataService.createTag({
        name: 'Test Tag',
        slug: 'test-tag',
        description: 'Test',
        color: '#000',
        icon: '🏷️',
        category: 'test',
        relatedTags: [],
      });

      metadataService.incrementTagCount(tag.id);
      const updated = metadataService.getTags()[0];
      expect(updated.itemCount).toBe(1);
    });

    it('should search tags', () => {
      metadataService.createTag({
        name: 'Dark Mode',
        slug: 'dark-mode',
        description: 'Dark theme',
        color: '#000',
        icon: '🌙',
        category: 'themes',
        relatedTags: [],
      });

      const results = metadataService.searchTags('Dark');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('Dark');
    });
  });
});

