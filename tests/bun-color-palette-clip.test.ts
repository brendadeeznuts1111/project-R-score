// @see https://bun.com/docs/runtime/color#output-formats — Bun.color
import { describe, expect, test } from 'bun:test';
import {
  PALETTE_CLIP_FORMATS,
  PALETTE_CLIP_FRAME_COUNT,
  buildPaletteClipFrames,
  frameEvaluationExpression,
  paletteClipHtml,
} from '../lib/portal/bun-1.4-palette-clip.ts';

describe('Bun 1.4 palette clip model', () => {
  test('covers every declared output format deterministically', () => {
    const frames = buildPaletteClipFrames();
    expect(frames).toHaveLength(PALETTE_CLIP_FRAME_COUNT);
    expect([...new Set(frames.map(frame => frame.label))]).toEqual(PALETTE_CLIP_FORMATS);
    expect(frames.every(frame => /^#[0-9a-f]{6}$/i.test(frame.background))).toBe(true);
  });

  test('keeps Bun APIs host-side and page updates text-only', () => {
    const html = paletteClipHtml();
    const expression = frameEvaluationExpression(buildPaletteClipFrames(6)[0]!);
    expect(html).not.toContain('Bun.color(');
    expect(html).not.toContain('<script');
    expect(expression).toContain('.textContent =');
    expect(expression).not.toContain('innerHTML');
    expect(expression).not.toContain('data-value');
  });

  test('rejects frame counts that cannot cover every format', () => {
    expect(() => buildPaletteClipFrames(5)).toThrow(/integer >= 6/);
  });
});
