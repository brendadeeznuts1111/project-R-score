/**
 * @fileoverview SRI module unit tests
 * @module test/sri
 */

import { test, expect, describe } from 'bun:test';
import { SRIGenerator, generateSRI, verifySRI, hashFile } from '../src/security/sri';
import { tempDir } from './harness';

describe('SRIGenerator', () => {
  describe('generateHash', () => {
    test('generates sha384 hash by default', async () => {
      await using dir = await tempDir('sri-hash', {
        'test.js': 'console.log("test");',
      });

      const generator = new SRIGenerator({ files: [] });
      const entry = await generator.generateHash(dir.file('test.js'));

      expect(entry.integrity).toMatch(/^sha384-/);
      expect(entry.algorithm).toBe('sha384');
      expect(entry.file).toBe(dir.file('test.js'));
      expect(entry.size).toBeGreaterThan(0);
      expect(entry.lastModified).toBeGreaterThan(0);
    });

    test('generates sha256 hash when specified', async () => {
      await using dir = await tempDir('sri-256', {
        'test.js': 'const x = 1;',
      });

      const generator = new SRIGenerator({ files: [], algorithm: 'sha256' });
      const entry = await generator.generateHash(dir.file('test.js'));

      expect(entry.integrity).toMatch(/^sha256-/);
      expect(entry.algorithm).toBe('sha256');
    });

    test('generates sha512 hash when specified', async () => {
      await using dir = await tempDir('sri-512', {
        'test.js': 'const x = 1;',
      });

      const generator = new SRIGenerator({ files: [], algorithm: 'sha512' });
      const entry = await generator.generateHash(dir.file('test.js'));

      expect(entry.integrity).toMatch(/^sha512-/);
      expect(entry.algorithm).toBe('sha512');
    });

    test('throws for non-existent file', async () => {
      const generator = new SRIGenerator({ files: [] });

      expect(generator.generateHash('/nonexistent/file.js')).rejects.toThrow('File not found');
    });

    test('produces consistent hashes for same content', async () => {
      await using dir = await tempDir('sri-consistent', {
        'a.js': 'const same = true;',
        'b.js': 'const same = true;',
      });

      const generator = new SRIGenerator({ files: [] });
      const hashA = await generator.generateHash(dir.file('a.js'));
      const hashB = await generator.generateHash(dir.file('b.js'));

      expect(hashA.integrity).toBe(hashB.integrity);
    });

    test('produces different hashes for different content', async () => {
      await using dir = await tempDir('sri-different', {
        'a.js': 'const a = 1;',
        'b.js': 'const b = 2;',
      });

      const generator = new SRIGenerator({ files: [] });
      const hashA = await generator.generateHash(dir.file('a.js'));
      const hashB = await generator.generateHash(dir.file('b.js'));

      expect(hashA.integrity).not.toBe(hashB.integrity);
    });
  });

  describe('generate', () => {
    test('generates hashes for glob patterns', async () => {
      await using dir = await tempDir('sri-glob', {
        'app.js': 'const app = {};',
        'util.js': 'export const util = {};',
        'style.css': 'body {}',
        'readme.md': '# Readme',
      });

      const generator = new SRIGenerator({
        files: [`${dir}/*.js`],
      });

      const report = await generator.generate();

      expect(report.entries.length).toBe(2);
      expect(report.algorithm).toBe('sha384');
      expect(report.entries.every(e => e.file.endsWith('.js'))).toBe(true);
    });

    test('generates hashes for multiple patterns', async () => {
      await using dir = await tempDir('sri-multi', {
        'app.js': 'const app = {};',
        'style.css': 'body {}',
        'other.txt': 'text',
      });

      const generator = new SRIGenerator({
        files: [`${dir}/*.js`, `${dir}/*.css`],
      });

      const report = await generator.generate();

      expect(report.entries.length).toBe(2);
      const extensions = report.entries.map(e => e.file.split('.').pop());
      expect(extensions).toContain('js');
      expect(extensions).toContain('css');
    });

    test('saves manifest to file', async () => {
      await using dir = await tempDir('sri-manifest', {
        'app.js': 'const app = {};',
      });

      const manifestPath = dir.file('manifest.json');
      const generator = new SRIGenerator({
        files: [`${dir}/*.js`],
        outputFile: manifestPath,
      });

      await generator.generate();

      expect(await dir.exists('manifest.json')).toBe(true);

      const manifest = JSON.parse(await dir.readFile('manifest.json'));
      expect(manifest).toHaveProperty('generated');
      expect(manifest).toHaveProperty('algorithm', 'sha384');
      expect(manifest).toHaveProperty('files');
    });

    test('returns empty for no matching files', async () => {
      await using dir = await tempDir('sri-nomatch', {
        'readme.txt': 'no js files here',
      });

      const generator = new SRIGenerator({
        files: [`${dir}/*.js`], // No .js files exist
      });

      const report = await generator.generate();

      expect(report.entries.length).toBe(0);
    });
  });

  describe('verify', () => {
    test('verifies unchanged files', async () => {
      await using dir = await tempDir('sri-verify-ok', {
        'app.js': 'const app = {};',
      });

      const manifestPath = dir.file('manifest.json');
      const generator = new SRIGenerator({
        files: [`${dir}/*.js`],
        outputFile: manifestPath,
      });

      await generator.generate();
      const result = await generator.verify(manifestPath);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('detects modified files', async () => {
      await using dir = await tempDir('sri-verify-fail', {
        'app.js': 'const app = {};',
      });

      const manifestPath = dir.file('manifest.json');
      const generator = new SRIGenerator({
        files: [`${dir}/*.js`],
        outputFile: manifestPath,
      });

      await generator.generate();

      // Modify file
      await dir.writeFiles({ 'app.js': 'const app = { modified: true };' });

      const result = await generator.verify(manifestPath);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toContain('integrity mismatch');
    });

    test('reports missing files', async () => {
      await using dir = await tempDir('sri-verify-missing', {
        'app.js': 'const app = {};',
      });

      const manifestPath = dir.file('manifest.json');
      const generator = new SRIGenerator({
        files: [`${dir}/*.js`],
        outputFile: manifestPath,
      });

      await generator.generate();

      // Delete file
      await Bun.write(dir.file('app.js'), '').then(() =>
        require('fs/promises').rm(dir.file('app.js'))
      );

      const result = await generator.verify(manifestPath);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
    });
  });

  describe('getHtmlSnippet', () => {
    test('generates script tag for JS files', async () => {
      await using dir = await tempDir('sri-snippet-js', {
        'app.js': 'const app = {};',
      });

      const generator = new SRIGenerator({
        files: [`${dir}/*.js`],
      });

      await generator.generate();
      const snippet = generator.getHtmlSnippet(dir.file('app.js'));

      expect(snippet).toContain('<script');
      expect(snippet).toContain('integrity="sha384-');
      expect(snippet).toContain('crossorigin="anonymous"');
      expect(snippet).toContain('</script>');
    });

    test('generates link tag for CSS files', async () => {
      await using dir = await tempDir('sri-snippet-css', {
        'style.css': 'body { margin: 0; }',
      });

      const generator = new SRIGenerator({
        files: [`${dir}/*.css`],
      });

      await generator.generate();
      const snippet = generator.getHtmlSnippet(dir.file('style.css'));

      expect(snippet).toContain('<link');
      expect(snippet).toContain('rel="stylesheet"');
      expect(snippet).toContain('integrity="sha384-');
      expect(snippet).toContain('crossorigin="anonymous"');
    });

    test('returns null for unknown file', async () => {
      const generator = new SRIGenerator({ files: [] });
      const snippet = generator.getHtmlSnippet('/unknown/file.js');

      expect(snippet).toBeNull();
    });
  });

  describe('updateHtmlFiles', () => {
    test('adds integrity to script tags', async () => {
      await using dir = await tempDir('sri-html-script', {
        'app.js': 'const app = {};',
        'index.html': '<html><body><script src="app.js"></script></body></html>',
      });

      const generator = new SRIGenerator({
        files: [`${dir}/*.js`],
        htmlFiles: [`${dir}/*.html`],
        autoUpdate: true,
      });

      const report = await generator.generate();

      expect(report.htmlFilesUpdated).toContain(dir.file('index.html'));

      const html = await dir.readFile('index.html');
      expect(html).toContain('integrity="sha384-');
      expect(html).toContain('crossorigin="anonymous"');
    });

    test('adds integrity to link tags', async () => {
      await using dir = await tempDir('sri-html-link', {
        'style.css': 'body { margin: 0; }',
        'index.html': '<html><head><link rel="stylesheet" href="style.css"></head></html>',
      });

      const generator = new SRIGenerator({
        files: [`${dir}/*.css`],
        htmlFiles: [`${dir}/*.html`],
        autoUpdate: true,
      });

      const report = await generator.generate();

      expect(report.htmlFilesUpdated).toContain(dir.file('index.html'));

      const html = await dir.readFile('index.html');
      expect(html).toContain('integrity="sha384-');
    });

    test('updates existing integrity attributes', async () => {
      await using dir = await tempDir('sri-html-update', {
        'app.js': 'const app = {};',
        'index.html': '<html><body><script src="app.js" integrity="sha384-OLD" crossorigin="anonymous"></script></body></html>',
      });

      const generator = new SRIGenerator({
        files: [`${dir}/*.js`],
        htmlFiles: [`${dir}/*.html`],
        autoUpdate: true,
      });

      await generator.generate();

      const html = await dir.readFile('index.html');
      expect(html).not.toContain('sha384-OLD');
      expect(html).toContain('integrity="sha384-');
    });
  });
});

describe('Convenience Functions', () => {
  describe('hashFile', () => {
    test('returns integrity string', async () => {
      await using dir = await tempDir('sri-hashfile', {
        'test.js': 'const x = 1;',
      });

      const hash = await hashFile(dir.file('test.js'));

      expect(hash).toMatch(/^sha384-[A-Za-z0-9+/]+=*$/);
    });

    test('accepts algorithm parameter', async () => {
      await using dir = await tempDir('sri-hashfile-algo', {
        'test.js': 'const x = 1;',
      });

      const hash = await hashFile(dir.file('test.js'), 'sha512');

      expect(hash).toMatch(/^sha512-/);
    });
  });

  describe('generateSRI', () => {
    test('generates report', async () => {
      await using dir = await tempDir('sri-generate', {
        'app.js': 'const app = {};',
      });

      const report = await generateSRI({
        files: [`${dir}/*.js`],
      });

      expect(report.entries.length).toBe(1);
      expect(report.algorithm).toBe('sha384');
    });
  });

  describe('verifySRI', () => {
    test('verifies manifest', async () => {
      await using dir = await tempDir('sri-verifysri', {
        'app.js': 'const app = {};',
      });

      await generateSRI({
        files: [`${dir}/*.js`],
        outputFile: dir.file('manifest.json'),
      });

      const result = await verifySRI(dir.file('manifest.json'));

      expect(result.valid).toBe(true);
    });
  });
});

describe('Edge Cases', () => {
  test('handles empty files', async () => {
    await using dir = await tempDir('sri-empty', {
      'empty.js': '',
    });

    const generator = new SRIGenerator({ files: [`${dir}/*.js`] });
    const entry = await generator.generateHash(dir.file('empty.js'));

    expect(entry.integrity).toMatch(/^sha384-/);
    expect(entry.size).toBe(0);
  });

  test('handles binary files', async () => {
    await using dir = await tempDir('sri-binary', {});

    // Write binary data
    const binary = new Uint8Array([0x00, 0x01, 0x02, 0xff, 0xfe]);
    await Bun.write(dir.file('data.bin'), binary);

    const generator = new SRIGenerator({ files: [`${dir}/*.bin`] });
    const entry = await generator.generateHash(dir.file('data.bin'));

    expect(entry.integrity).toMatch(/^sha384-/);
    expect(entry.size).toBe(5);
  });

  test('handles large files', async () => {
    await using dir = await tempDir('sri-large', {});

    // Create 1MB file
    const large = 'x'.repeat(1024 * 1024);
    await Bun.write(dir.file('large.js'), large);

    const generator = new SRIGenerator({ files: [`${dir}/*.js`] });
    const entry = await generator.generateHash(dir.file('large.js'));

    expect(entry.integrity).toMatch(/^sha384-/);
    expect(entry.size).toBe(1024 * 1024);
  });

  test('handles unicode content', async () => {
    await using dir = await tempDir('sri-unicode', {
      'unicode.js': 'const emoji = "🚀🎉"; const chinese = "中文";',
    });

    const generator = new SRIGenerator({ files: [`${dir}/*.js`] });
    const entry = await generator.generateHash(dir.file('unicode.js'));

    expect(entry.integrity).toMatch(/^sha384-/);
  });

  test('deduplicates files from overlapping globs', async () => {
    await using dir = await tempDir('sri-dedupe', {
      'app.js': 'const app = {};',
    });

    const generator = new SRIGenerator({
      files: [`${dir}/*.js`, `${dir}/app.js`],
    });

    const report = await generator.generate();

    // Should only have 1 entry, not 2
    expect(report.entries.length).toBe(1);
  });
});
