import { describe, expect, test } from 'bun:test';
import { joinPath } from '../lib/path-bun.ts';
import { bakeJsonEmbed } from '../lib/http/portal-embed-bake.ts';

const SCRATCH = joinPath(import.meta.dir, '../.tmp/portal-embed-bake-test');

describe('bakeJsonEmbed', () => {
  test('replaces existing embed and collapses duplicates', async () => {
    await Bun.write(
      `${SCRATCH}/page.html`,
      `<!DOCTYPE html><html><head>
  <script type="application/json" id="dod-embed">{"a":1}</script>
  <script type="application/json" id="dod-embed">{"a":2}</script>
</head><body></body></html>`
    );

    await bakeJsonEmbed(`${SCRATCH}/page.html`, 'dod-embed', { a: 3, entries: [] });
    const html = await Bun.file(`${SCRATCH}/page.html`).text();
    const matches = html.match(/id="dod-embed"/g) ?? [];
    expect(matches).toHaveLength(1);
    expect(html).toContain('"a":3');
    expect(html).not.toContain('"a":1');
    expect(html).not.toContain('"a":2');
  });
});
