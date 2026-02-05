/**
 * RSSGenerator Unit Tests
 * Infrastructure ID: 22 (RSS-Feed-Compiler)
 * Validates RSS/XML feed generation with proper escaping
 */

import { describe, test, expect } from "harness";
import { RSSGenerator } from "../../../blog/rss-generator";
import { blogConfig } from "../../../blog/config";
import type { BlogPost, BlogConfig } from "../../../blog/types";

describe('RSSGenerator', () => {
  let generator: RSSGenerator;
  let testConfig: BlogConfig;

  const createPost = (overrides: Partial<BlogPost> = {}): BlogPost => ({
    slug: 'test-post',
    title: 'Test Post',
    category: 'releases',
    excerpt: 'Test excerpt',
    content: '<p>Test content</p>',
    publishedAt: new Date('2024-12-19T12:00:00Z'),
    author: 'Test Author',
    tags: ['test', 'unit'],
    rssPriority: 5,
    ...overrides,
  });

  beforeEach(() => {
    testConfig = {
      ...blogConfig,
      title: 'Test Blog',
      description: 'Test Description',
      url: 'https://test.example.com',
      rss: { filename: 'rss.xml', itemCount: 10 }
    };
    generator = new RSSGenerator(testConfig);
  });

  describe('generate()', () => {
    test('should generate valid RSS XML structure', async () => {
      const posts = [createPost()];
      const rss = await generator.generate(posts);

      expect(rss).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(rss).toContain('<rss version="2.0"');
      expect(rss).toContain('xmlns:atom="http://www.w3.org/2005/Atom"');
      expect(rss).toContain('<channel>');
      expect(rss).toContain('</channel>');
      expect(rss).toContain('</rss>');
    });

    test('should include channel metadata', () => {
      const posts = [createPost()];
      const rss = generator.generate(posts);

      expect(rss).toContain(`<title>${testConfig.title}</title>`);
      expect(rss).toContain(`<description>${testConfig.description}</description>`);
      expect(rss).toContain(`<link>${testConfig.url}</link>`);
      expect(rss).toContain('<language>en-us</language>');
      expect(rss).toContain('<generator>Registry-Powered-MCP Blog Generator</generator>');
      expect(rss).toContain('<ttl>60</ttl>');
    });

    test('should include atom self-link', () => {
      const posts = [createPost()];
      const rss = generator.generate(posts);

      expect(rss).toContain(
        `<atom:link href="${testConfig.url}/${testConfig.rss.filename}" rel="self" type="application/rss+xml"/>`
      );
    });

    test('should generate item for each post', () => {
      const posts = [
        createPost({ slug: 'post-1', title: 'Post 1' }),
        createPost({ slug: 'post-2', title: 'Post 2' }),
        createPost({ slug: 'post-3', title: 'Post 3' }),
      ];

      const rss = generator.generate(posts);

      expect(rss).toContain('<title>Post 1</title>');
      expect(rss).toContain('<title>Post 2</title>');
      expect(rss).toContain('<title>Post 3</title>');
      expect((rss.match(/<item>/g) || []).length).toBe(3);
    });

    test('should limit posts to itemCount', () => {
      const posts = Array.from({ length: 25 }, (_, i) =>
        createPost({ slug: `post-${i}`, title: `Post ${i}` })
      );

      const rss = generator.generate(posts);

      // itemCount is 10, so only 10 items should be included
      expect((rss.match(/<item>/g) || []).length).toBe(10);
    });

    test('should sort by rssPriority then publishedAt', () => {
      const posts = [
        createPost({ slug: 'low-priority', title: 'Low Priority', rssPriority: 1, publishedAt: new Date('2024-12-19') }),
        createPost({ slug: 'high-priority', title: 'High Priority', rssPriority: 10, publishedAt: new Date('2024-12-18') }),
        createPost({ slug: 'medium-priority', title: 'Medium Priority', rssPriority: 5, publishedAt: new Date('2024-12-20') }),
      ];

      const rss = generator.generate(posts);

      const highIndex = rss.indexOf('High Priority');
      const mediumIndex = rss.indexOf('Medium Priority');
      const lowIndex = rss.indexOf('Low Priority');

      expect(highIndex).toBeLessThan(mediumIndex);
      expect(mediumIndex).toBeLessThan(lowIndex);
    });

    test('should filter out future posts', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const posts = [
        createPost({ slug: 'published', title: 'Published Post', publishedAt: new Date('2024-12-19') }),
        createPost({ slug: 'future', title: 'Future Post', publishedAt: futureDate }),
      ];

      const rss = generator.generate(posts);

      expect(rss).toContain('Published Post');
      expect(rss).not.toContain('Future Post');
    });

    test('should include post URL with canonical fallback', () => {
      const posts = [createPost({ slug: 'test-slug', category: 'performance' })];
      const rss = generator.generate(posts);

      expect(rss).toContain(`<link>${testConfig.url}/blog/performance/test-slug</link>`);
      expect(rss).toContain(`<guid isPermaLink="true">${testConfig.url}/blog/performance/test-slug</guid>`);
    });

    test('should use canonicalUrl when provided', () => {
      const canonicalUrl = 'https://canonical.example.com/post';
      const posts = [createPost({ canonicalUrl })];
      const rss = generator.generate(posts);

      expect(rss).toContain(`<link>${canonicalUrl}</link>`);
      expect(rss).toContain(`<guid isPermaLink="true">${canonicalUrl}</guid>`);
    });

    test('should include pubDate in RFC 822 format', () => {
      const posts = [createPost({ publishedAt: new Date('2024-12-19T12:00:00Z') })];
      const rss = generator.generate(posts);

      expect(rss).toContain('<pubDate>Thu, 19 Dec 2024 12:00:00 GMT</pubDate>');
    });

    test('should include author information', () => {
      const posts = [createPost({ author: 'Jane Developer' })];
      const rss = generator.generate(posts);

      expect(rss).toContain(`Jane Developer (${testConfig.author})`);
    });

    test('should include category and tags', () => {
      const posts = [createPost({
        category: 'security',
        tags: ['vulnerability', 'patch', 'critical']
      })];
      const rss = generator.generate(posts);

      expect(rss).toContain('<category>security</category>');
      expect(rss).toContain('<category>vulnerability</category>');
      expect(rss).toContain('<category>patch</category>');
      expect(rss).toContain('<category>critical</category>');
    });

    test('should include priority element', () => {
      const posts = [createPost({ rssPriority: 8 })];
      const rss = generator.generate(posts);

      expect(rss).toContain('<priority>8</priority>');
    });
  });

  describe('Performance metrics in description', () => {
    test('should append performance metrics to description', () => {
      const posts = [createPost({
        excerpt: 'Base excerpt',
        performanceMetrics: {
          optimization: '175x faster',
          bundleSize: 9.64
        }
      })];

      const rss = generator.generate(posts);

      expect(rss).toContain('Base excerpt');
      expect(rss).toContain('Performance Impact: 175x faster');
    });

    test('should use default message for missing optimization', () => {
      const posts = [createPost({
        excerpt: 'Base excerpt',
        performanceMetrics: { bundleSize: 9.64 }
      })];

      const rss = generator.generate(posts);

      expect(rss).toContain('Performance Impact: See full post for details');
    });
  });

  describe('Security impact in description', () => {
    test('should append security impact to description', () => {
      const posts = [createPost({
        excerpt: 'Security update',
        securityImpact: {
          severity: 'high',
          mitigation: 'Update to v2.4.1'
        }
      })];

      const rss = generator.generate(posts);

      expect(rss).toContain('Security Impact: HIGH - Update to v2.4.1');
    });

    test('should uppercase severity level', () => {
      const posts = [createPost({
        securityImpact: {
          severity: 'critical',
          mitigation: 'Patch immediately'
        }
      })];

      const rss = generator.generate(posts);

      expect(rss).toContain('CRITICAL');
    });

    test('should use default mitigation message when not provided', () => {
      const posts = [createPost({
        securityImpact: { severity: 'low' }
      })];

      const rss = generator.generate(posts);

      expect(rss).toContain('Security Impact: LOW - See full post for details');
    });
  });

  describe('XML escaping', () => {
    test('should escape < and > in title', () => {
      const posts = [createPost({ title: 'Fix <script> injection' })];
      const rss = generator.generate(posts);

      expect(rss).toContain('&lt;script&gt;');
      expect(rss).not.toContain('<script>');
    });

    test('should escape & in content', () => {
      const posts = [createPost({ excerpt: 'A & B & C' })];
      const rss = generator.generate(posts);

      // Description content gets double-escaped (XML entity encoding)
      expect(rss).toContain('&amp;');
    });

    test('should escape quotes', () => {
      const posts = [createPost({ title: 'He said "hello"' })];
      const rss = generator.generate(posts);

      expect(rss).toContain('&quot;hello&quot;');
    });

    test('should escape single quotes', () => {
      const posts = [createPost({ title: "It's working" })];
      const rss = generator.generate(posts);

      expect(rss).toContain('&#39;s');
    });

    test('should handle multiple special characters', () => {
      const posts = [createPost({
        title: '<test> & "more" \'stuff\'',
        excerpt: 'A < B > C & D'
      })];

      const rss = generator.generate(posts);

      // Title gets escaped once
      expect(rss).toContain('&lt;test&gt;');
      expect(rss).toContain('&amp;');
      expect(rss).toContain('&quot;more&quot;');
      // Description gets double-escaped due to escapeXml being called twice
      expect(rss).toContain('&amp;lt;'); // < becomes &lt; then &amp;lt;
    });
  });

  describe('Empty and edge cases', () => {
    test('should generate valid RSS with no posts', () => {
      const rss = generator.generate([]);

      expect(rss).toContain('<channel>');
      expect(rss).toContain('</channel>');
      expect(rss).not.toContain('<item>');
    });

    test('should handle post with empty tags array', () => {
      const posts = [createPost({ tags: [] })];
      const rss = generator.generate(posts);

      expect(rss).toContain('<item>');
      // Should still have category from post.category
      expect(rss).toContain('<category>releases</category>');
    });

    test('should handle post with no optional fields', () => {
      const minimalPost: BlogPost = {
        slug: 'minimal',
        title: 'Minimal Post',
        category: 'releases',
        excerpt: 'Minimal excerpt',
        content: '<p>Content</p>',
        publishedAt: new Date('2024-12-19'),
        author: 'Author',
        tags: [],
        rssPriority: 5,
      };

      const rss = generator.generate([minimalPost]);

      expect(rss).toContain('<title>Minimal Post</title>');
      expect(rss).not.toContain('Performance Impact');
      expect(rss).not.toContain('Security Impact');
    });
  });
});
