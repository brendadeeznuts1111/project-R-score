import { describe, expect, test } from 'bun:test';
import { parse } from 'yaml';
import { llmsTxtBody } from '../lib/http/llms-txt';

describe('AI discovery surface', () => {
  test('publishes explicit crawler policy without exposing private paths', async () => {
    const robots = await Bun.file('public/robots.txt').text();
    for (const bot of ['OAI-SearchBot', 'GPTBot', 'ClaudeBot', 'PerplexityBot']) {
      expect(robots).toContain(`User-agent: ${bot}`);
    }
    expect(robots).toContain('Disallow: /private/');
    expect(robots).toContain('https://score.factory-wager.com/sitemap-portal.xml');
  });

  test('keeps llms.txt v2 discovery links and generated mirror aligned', async () => {
    const body = llmsTxtBody();
    expect(await Bun.file('public/llms.txt').text()).toBe(body);
    expect(body).toContain('[OpenAPI specification](openapi.yaml)');
    expect(body).toContain('[MCP catalog](.well-known/mcp.json)');
    expect(body).toContain('## Optional');
  });

  test('publishes a read-only OpenAPI contract for every llms API link', async () => {
    const document = parse(await Bun.file('public/openapi.yaml').text()) as {
      openapi: string;
      paths: Record<string, Record<string, unknown>>;
    };
    expect(document.openapi).toBe('3.1.0');
    for (const path of ['/health', '/api/monitoring', '/api/operations/summary', '/api/toc', '/api/registry', '/api/env']) {
      expect(document.paths[path]?.get).toBeDefined();
      expect(document.paths[path]?.post).toBeUndefined();
    }
  });

  test('advertises llms discovery and structured identity on the HTML root', async () => {
    const html = await Bun.file('public/index.html').text();
    expect(html).toContain('rel="describedby" href="/llms.txt"');
    expect(html).toContain('property="og:title"');
    expect(html).toContain('type="application/ld+json"');
    expect(html).toContain('"@type": "WebSite"');
  });

  test('gives every score portal sitemap URL a lastmod', async () => {
    const sitemap = await Bun.file('public/sitemap-portal.xml').text();
    const urls = sitemap.match(/<url>.*?<\/url>/gs) ?? [];
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.every(entry => entry.includes('<lastmod>'))).toBe(true);
  });
});
