/**
 * Bun.markdown helpers for factory CLI — Bun runtime only.
 *
 * @see https://bun.com/docs/runtime/markdown#bun-markdown-html
 * @see https://bun.com/docs/runtime/markdown#ansi-terminal-output
 */

import { describe, expect, test } from 'bun:test';
import { renderReadmeAnsi, renderReadmeHTML } from '../lib/factory/markdown.ts';

describe('factory markdown (Bun runtime)', () => {
  test('renderReadmeHTML produces heading HTML', () => {
    const html = renderReadmeHTML('# Hello\n\nWorld');
    expect(html).toContain('<h1');
    expect(html).toContain('Hello');
    expect(html).toContain('World');
  });

  test('renderReadmeAnsi returns terminal text without HTML tags', () => {
    const ansi = renderReadmeAnsi('# Title\n\nbody');
    expect(ansi).toContain('Title');
    expect(ansi).not.toContain('<h1');
  });
});
