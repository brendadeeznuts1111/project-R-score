import { describe, expect, test } from 'bun:test';
import {
  blogUrlForVersion,
  categoryForHeading,
  extractReleaseItems,
  normalizeVersion,
  renderReleaseInventory,
} from '../packages/bun-release-contracts/src/generator';

const FIXTURE = `<!doctype html>
<html><body>
  <nav><ul><li>Navigation item must be ignored</li></ul></nav>
  <article>
    <h2>Bun.Image — Built-in <code>Image</code> Processing</h2>
    <ul><li>Accepts <code>Blob</code> and typed array inputs.</li></ul>
    <h2>Bugfixes</h2>
    <ul><li>FormData boundary format <strong>matches WebKit</strong>.</li></ul>
    <h3>Node.js compatibility fixes</h3>
    <ol><li>Fixed quoted &amp; normalized text.</li></ol>
  </article>
</body></html>`;

describe('Bun release inventory generator', () => {
  test('normalizes versions and builds the official release URL', () => {
    expect(normalizeVersion('v1.3.14')).toBe('1.3.14');
    expect(blogUrlForVersion('1.3.14')).toBe('https://bun.com/blog/bun-v1.3.14');
    expect(() => normalizeVersion('latest')).toThrow('expected vMAJOR.MINOR.PATCH');
  });

  test('uses stable category aliases and a generic fallback', () => {
    expect(categoryForHeading('Bun.Image — Built-in Image Processing')).toBe('image');
    expect(categoryForHeading('Brand New Runtime Feature')).toBe('brand-new-runtime-feature');
  });

  test('extracts only semantic article announcements in document order', async () => {
    expect(await extractReleaseItems(FIXTURE)).toEqual([
      {
        category: 'image',
        section: 'Bun.Image — Built-in Image Processing',
        announcement: 'Accepts Blob and typed array inputs.',
      },
      {
        category: 'bugfixes',
        section: 'Bugfixes',
        announcement: 'FormData boundary format matches WebKit.',
      },
      {
        category: 'node-js-compatibility-fixes',
        section: 'Node.js compatibility fixes',
        announcement: 'Fixed quoted & normalized text.',
      },
    ]);
  });

  test('renders deterministic planned inventory without executable test stubs', async () => {
    const items = await extractReleaseItems(FIXTURE);
    const first = renderReleaseInventory('1.3.14', items);
    expect(first).toBe(renderReleaseInventory('v1.3.14', items));
    const parsed = JSON.parse(first);
    expect(parsed.counts).toEqual({ planned: 3, executable: 0 });
    expect(parsed.items.every((item: { status: string }) => item.status === 'planned')).toBe(true);
    expect(first).not.toContain('test.todo');
    expect(first).not.toContain('Navigation item');
  });

  test('rejects pages without semantic article markup', async () => {
    await expect(extractReleaseItems('<main><h2>Bugfixes</h2></main>')).rejects.toThrow(
      'did not contain an <article>'
    );
  });
});
