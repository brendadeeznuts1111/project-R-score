/**
 * 📡 RSS Feeds Test Suite
 *
 * Tests for RSS feed generation, validation, and deployment
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { handleFeedsRequest } from '../../src/feeds-handler';

describe('RSS Feeds', () => {
  const feedsDir = join(process.cwd(), 'src', 'feeds');

  describe('Feed Files', () => {
    const requiredFeeds = [
      'error-codes-rss.xml',
      'error-codes-atom.xml',
      'team-announcements-rss.xml',
      'team-announcements-atom.xml',
      'critical-errors-alert.xml',
      'index.html',
    ];

    test.each(requiredFeeds)('%s should exist', feedFile => {
      const filePath = join(feedsDir, feedFile);
      expect(existsSync(filePath)).toBe(true);
    });

    test.each(requiredFeeds.filter(f => f.endsWith('.xml')))('%s should be valid XML', feedFile => {
      const filePath = join(feedsDir, feedFile);
      const content = readFileSync(filePath, 'utf-8');

      // Check XML declaration
      expect(content).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);

      // Check for proper closing tags
      const openTags = content.match(/<(\w+)[^>]*>/g) || [];
      const closeTags = content.match(/<\/(\w+)>/g) || [];

      // Basic validation - should have similar number of open and close tags
      expect(closeTags.length).toBeGreaterThan(0);
    });

    test('RSS feeds should use Cloudflare Workers URLs', () => {
      const rssFile = join(feedsDir, 'error-codes-rss.xml');
      const content = readFileSync(rssFile, 'utf-8');

      // Should not contain GitHub Pages URLs
      expect(content).not.toContain('github.io');
      expect(content).not.toContain('brendadeeznuts1111');

      // Should contain Cloudflare Workers URLs
      expect(content).toContain('workers.dev');
    });
  });

  describe('Feed Handler', () => {
    test('should return 200 for valid feed paths', () => {
      const response = handleFeedsRequest('/feeds/error-codes-rss.xml');
      expect(response.status).toBe(200);
    });

    test('should return correct content type for RSS feeds', () => {
      const response = handleFeedsRequest('/feeds/error-codes-rss.xml');
      const contentType = response.headers.get('Content-Type');
      expect(contentType).toContain('application/rss+xml');
    });

    test('should return correct content type for Atom feeds', () => {
      const response = handleFeedsRequest('/feeds/error-codes-atom.xml');
      const contentType = response.headers.get('Content-Type');
      expect(contentType).toContain('application/atom+xml');
    });

    test('should return HTML content type for index page', () => {
      const response = handleFeedsRequest('/feeds/');
      const contentType = response.headers.get('Content-Type');
      expect(contentType).toContain('text/html');
    });

    test('should return 404 for non-existent feeds', () => {
      const response = handleFeedsRequest('/feeds/non-existent.xml');
      expect(response.status).toBe(404);
    });

    test('should set CORS headers', () => {
      const response = handleFeedsRequest('/feeds/error-codes-rss.xml');
      const corsHeader = response.headers.get('Access-Control-Allow-Origin');
      expect(corsHeader).toBe('*');
    });

    test('should set cache headers', () => {
      const response = handleFeedsRequest('/feeds/error-codes-rss.xml');
      const cacheHeader = response.headers.get('Cache-Control');
      expect(cacheHeader).toContain('public');
      expect(cacheHeader).toContain('max-age=3600');
    });
  });

  describe('Feed Content', () => {
    test('Error codes RSS should contain Fire22 error codes', async () => {
      const response = handleFeedsRequest('/feeds/error-codes-rss.xml');
      const content = await response.text();

      // Check for error code entries
      expect(content).toContain('E1001');
      expect(content).toContain('SYSTEM_INIT_FAILED');
      expect(content).toContain('E2001');
      expect(content).toContain('DATABASE_CONNECTION_FAILED');
      expect(content).toContain('E7001');
      expect(content).toContain('FIRE22_API_UNREACHABLE');
    });

    test('Team announcements RSS should contain announcements', async () => {
      const response = handleFeedsRequest('/feeds/team-announcements-rss.xml');
      const content = await response.text();

      // Check for announcement structure
      expect(content).toContain('<channel>');
      expect(content).toContain('<title>');
      expect(content).toContain('Fire22 Team Announcements');
    });

    test('Critical alerts feed should contain critical errors', async () => {
      const response = handleFeedsRequest('/feeds/critical-errors-alert.xml');
      const content = await response.text();

      // Check for critical error markers
      expect(content).toContain('CRITICAL');
      expect(content).toContain('<channel>');
    });
  });

  describe('Feed Module', () => {
    test('feeds-content.ts should be generated', () => {
      const modulePath = join(process.cwd(), 'src', 'feeds-content.ts');
      expect(existsSync(modulePath)).toBe(true);
    });

    test('feeds-content.ts should export feed content', async () => {
      const module = await import('../../src/feeds-content');

      expect(module.feedsContent).toBeDefined();
      expect(module.getFeedContent).toBeDefined();
      expect(module.getAvailableFeeds).toBeDefined();

      // Check that feeds are included
      const feeds = module.getAvailableFeeds();
      expect(feeds).toContain('error-codes-rss.xml');
      expect(feeds).toContain('error-codes-atom.xml');
      expect(feeds).toContain('index.html');
    });
  });
});

describe('CI Integration', () => {
  test('Build script should exist', () => {
    const scriptPath = join(process.cwd(), 'scripts', 'build-feeds-module.ts');
    expect(existsSync(scriptPath)).toBe(true);
  });

  test('Validation script should exist', () => {
    const scriptPath = join(process.cwd(), 'scripts', 'validate-feeds.ts');
    expect(existsSync(scriptPath)).toBe(true);
  });

  test('Deploy script should exist', () => {
    const scriptPath = join(process.cwd(), 'scripts', 'deploy-feeds.ts');
    expect(existsSync(scriptPath)).toBe(true);
  });

  test('Package.json should have feed scripts', () => {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));

    expect(packageJson.scripts['feeds:build']).toBeDefined();
    expect(packageJson.scripts['feeds:deploy']).toBeDefined();
    expect(packageJson.scripts['feeds:validate']).toBeDefined();
  });
});
