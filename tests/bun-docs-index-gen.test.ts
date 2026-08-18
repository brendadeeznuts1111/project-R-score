import { describe, expect, test } from 'bun:test';

import { extractAnchors, markdownFetchCandidates } from '../tools/bun-docs-index-gen';

describe('Bun docs Markdown fetch candidates', () => {
  test('falls back from llms.txt section index URLs to current flattened endpoints', () => {
    expect(markdownFetchCandidates('https://bun.com/docs/runtime/index.md')).toEqual([
      'https://bun.com/docs/runtime/index.md',
      'https://bun.com/docs/runtime.md',
    ]);
  });

  test('keeps ordinary official Markdown URLs exact', () => {
    expect(markdownFetchCandidates('https://bun.com/docs/runtime/file-io.md')).toEqual([
      'https://bun.com/docs/runtime/file-io.md',
    ]);
  });

  test('decodes Mintlify heading entities before matching live anchors', () => {
    expect(extractAnchors('### Transpilation &amp; Language Features')).toEqual([
      'transpilation-language-features',
    ]);
  });
});
