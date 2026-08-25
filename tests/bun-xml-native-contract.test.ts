// @see https://bun.com/docs/runtime/xml — Bun.XML compact and ordered shapes
// @see https://bun.com/reference/bun/XML/parse — Bun.XML.parse
// @see https://bun.com/reference/bun/XML/stringify — Bun.XML.stringify
// @released Bun.XML · released v1.4.0 · 2026-08-20 · https://bun.com/blog/bun-v1.4#bunxml

import { describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CANONICAL_REFS, CANONICAL_XML_REFS } from '../tools/bun-doc-refs.ts';
import { CURATED_ENTRIES } from '../tools/bun-docs-curated.ts';
import './bun-xml-value-contract.ts';

describe('Bun.XML 1.4 native contract', () => {
  test('loads .xml modules as compact default and named-root exports', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'bun-xml-contract-'));
    const xmlFile = join(directory, 'feed.xml');
    try {
      await Bun.write(
        xmlFile,
        '<rss version="2.0"><channel><title>Factory</title></channel></rss>'
      );
      const module = await import(xmlFile);
      const expected = {
        rss: {
          '@version': '2.0',
          channel: { title: 'Factory' },
        },
      };
      expect(module.default).toEqual(expected);
      expect(module.rss).toEqual(expected.rss);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test('parses XML during bundling and fails the build for malformed XML', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'bun-xml-build-contract-'));
    const entryFile = join(directory, 'entry.ts');
    const xmlFile = join(directory, 'feed.xml');
    try {
      await Bun.write(
        entryFile,
        'import doc from "./feed.xml"; console.log(doc.rss.channel.title);'
      );
      await Bun.write(xmlFile, '<rss><channel><title>Factory</title></channel></rss>');

      const result = await Bun.build({
        entrypoints: [entryFile],
        target: 'bun',
        write: false,
      });
      expect(result.success).toBe(true);
      expect(result.logs).toHaveLength(0);
      const output = await result.outputs[0]!.text();
      expect(output).toContain('title: "Factory"');
      expect(output).not.toContain('<rss>');

      await Bun.write(xmlFile, '<rss>');
      await expect(
        Bun.build({ entrypoints: [entryFile], target: 'bun', write: false })
      ).rejects.toThrow();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test('fails closed for malformed XML', () => {
    expect(() => Bun.XML.parse('<rss><channel></rss>')).toThrow(SyntaxError);
    expect(() => Bun.XML.parse('<rss id="1" id="2"/>')).toThrow(SyntaxError);
    expect(() => Bun.XML.parse('<rss/><feed/>')).toThrow(SyntaxError);
    expect(() => Bun.XML.parse('<?xml version="2.0"?><rss/>')).toThrow(SyntaxError);
  });

  test('fails with RangeError for pathologically deep nesting', () => {
    const depth = 32_768;
    const xml = `${'<x>'.repeat(depth)}value${'</x>'.repeat(depth)}`;
    expect(() => Bun.XML.parse(xml)).toThrow(RangeError);
  });

  test('keeps global canonical and curated references aligned', () => {
    expect(CANONICAL_REFS['Bun.XML']).toBe('https://bun.com/docs/runtime/xml');
    expect(CANONICAL_REFS['Bun.XML.parse']).toBe(
      'https://bun.com/reference/bun/XML/parse'
    );
    expect(CANONICAL_REFS['Bun.XML.stringify']).toBe(
      'https://bun.com/reference/bun/XML/stringify'
    );
    expect(Object.keys(CANONICAL_XML_REFS)).toEqual([
      'Bun.XML',
      'Bun.XML.parse',
      'Bun.XML.stringify',
      'Bun.XML.Comment',
      'Bun.XML.Document',
      'Bun.XML.Element',
      'Bun.XML.Node',
      'Bun.XML.NodeInput',
      'Bun.XML.ParseOptions',
      'Bun.XML.ProcessingInstruction',
      'Bun.XML.Scalar',
      'Bun.XML.Value',
    ]);

    const curated = new Set(CURATED_ENTRIES.map(entry => entry.term));
    for (const term of Object.keys(CANONICAL_XML_REFS)) expect(curated.has(term)).toBe(true);
  });
});
