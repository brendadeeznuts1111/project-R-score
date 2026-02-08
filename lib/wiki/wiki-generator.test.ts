import { test, expect, describe } from 'bun:test';
import {
  generateWikiURLs,
  generateMarkdownWiki,
  generateHTMLWiki,
  generateJSONWiki,
} from './wiki-generator.ts';

describe('wiki-generator', () => {
  const wikiData = generateWikiURLs();

  test('generateWikiURLs returns shape with total, categories, wikiPages', () => {
    expect(wikiData).toHaveProperty('total');
    expect(wikiData).toHaveProperty('categories');
    expect(wikiData).toHaveProperty('wikiPages');
    expect(typeof wikiData.total).toBe('number');
    expect(Array.isArray(wikiData.wikiPages)).toBe(true);
  });

  test('generateWikiURLs total matches wikiPages array length', () => {
    expect(wikiData.total).toBe(wikiData.wikiPages.length);
  });

  test('generateWikiURLs page URLs contain baseUrl/workspace', () => {
    for (const page of wikiData.wikiPages) {
      expect(page.url).toContain('wiki.company.com');
      expect(page.url).toContain('bun-utilities');
    }
  });

  test('generateMarkdownWiki contains "Bun Utilities Internal Wiki" header', () => {
    const md = generateMarkdownWiki(wikiData);
    expect(md).toContain('# Bun Utilities Internal Wiki');
  });

  test('generateMarkdownWiki contains category table headers', () => {
    const md = generateMarkdownWiki(wikiData);
    expect(md).toContain('| Utility |');
    expect(md).toContain('Internal Wiki');
    expect(md).toContain('Official Documentation');
  });

  test('generateHTMLWiki contains DOCTYPE and html tags', () => {
    const html = generateHTMLWiki(wikiData);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
  });

  test('generateHTMLWiki contains utility-table class', () => {
    const html = generateHTMLWiki(wikiData);
    expect(html).toContain('utility-table');
  });

  test('generateJSONWiki is parseable and contains metadata.total', () => {
    const jsonStr = generateJSONWiki(wikiData);
    const parsed = JSON.parse(jsonStr);
    expect(parsed).toHaveProperty('metadata');
    expect(parsed.metadata).toHaveProperty('total');
    expect(parsed.metadata.total).toBe(wikiData.total);
  });
});
