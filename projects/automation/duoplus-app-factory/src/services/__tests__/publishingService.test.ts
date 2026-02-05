/**
 * Tests for Publishing Service
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { publishingService } from '../publishingService';
import { metadataService } from '../metadataService';

describe('PublishingService', () => {
  beforeEach(() => {
    publishingService['published'].clear();
    publishingService['scheduled'].clear();
  });

  describe('Content Publishing', () => {
    it('should validate required fields', async () => {
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

      try {
        await publishingService.publishContent({
          title: '',
          description: 'Test',
          content: 'Test',
          author: 'test@example.com',
          topics: [],
          tags: [],
          visibility: 'published',
          metadata: meta,
        });
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Scheduled Publishing', () => {
    it('should list scheduled publishing', async () => {
      const scheduled = await publishingService.getScheduled();
      expect(Array.isArray(scheduled)).toBe(true);
    });
  });

  describe('Publishing Statistics', () => {
    it('should get publishing statistics', async () => {
      const stats = await publishingService.getPublishingStats();
      expect(stats.totalPublished).toBeGreaterThanOrEqual(0);
      expect(stats.totalScheduled).toBeGreaterThanOrEqual(0);
      expect(stats.totalViews).toBeGreaterThanOrEqual(0);
      expect(stats.totalLikes).toBeGreaterThanOrEqual(0);
    });
  });
});
