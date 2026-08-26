// @see https://bun.com/docs/runtime/color#output-formats — Bun.color
// @see https://bun.com/docs/runtime/markdown#bun-markdown-render — Bun.markdown.render
import portalTheme from '../../public/portal/theme.jsonc';
import { createTrustedAccentHeadingCallback } from '../markdown/accent-headings.ts';

export const PALETTE_CLIP_FORMATS = ['hex', 'rgb', 'hsl', 'lab', 'number', '[rgba]'] as const;
export const PALETTE_CLIP_FRAME_COUNT = 60;
export const PALETTE_CLIP_FPS = 20;

export type PaletteClipFrame = {
  index: number;
  hue: number;
  label: (typeof PALETTE_CLIP_FORMATS)[number];
  source: string;
  background: string;
  value: string;
};

type PaletteColorValue = string | number | number[] | Record<string, number>;

function displayColorValue(value: PaletteColorValue): string {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : JSON.stringify(value);
}

export function buildPaletteClipFrames(frameCount = PALETTE_CLIP_FRAME_COUNT): PaletteClipFrame[] {
  if (!Number.isSafeInteger(frameCount) || frameCount < PALETTE_CLIP_FORMATS.length) {
    throw new TypeError(
      `Palette clip frame count must be an integer >= ${PALETTE_CLIP_FORMATS.length}`
    );
  }
  return Array.from({ length: frameCount }, (_, index) => {
    const hue = Math.round((index / frameCount) * 360) % 360;
    const source = `hsl(${hue} 80% 50%)`;
    const background = Bun.color(source, 'hex');
    const formatIndex = Math.min(
      PALETTE_CLIP_FORMATS.length - 1,
      Math.floor((index * PALETTE_CLIP_FORMATS.length) / frameCount)
    );
    const label = PALETTE_CLIP_FORMATS[formatIndex]!;
    const value = Bun.color(source, label);
    if (typeof background !== 'string' || value == null) {
      throw new Error(`Bun.color failed for frame ${index} (${source}, ${label})`);
    }
    return { index, hue, label, source, background, value: displayColorValue(value) };
  });
}

export function paletteClipHtml(): string {
  const palette = [
    portalTheme.dark.accent,
    portalTheme.dark.green,
    portalTheme.dark.yellow,
    portalTheme.dark.orange,
    portalTheme.dark.maroon,
  ];
  const title = Bun.markdown.render('# Bun.color palette proof', {
    heading: createTrustedAccentHeadingCallback(palette),
  });
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;width:100vw;height:100vh;display:grid;place-items:center;background:${portalTheme.dark.bg};color:${portalTheme.dark.text};font-family:system-ui,sans-serif}.card{width:min(86vw,760px);padding:42px;border:1px solid ${portalTheme.dark.border};border-radius:24px;background:${portalTheme.dark.surface};display:grid;grid-template-columns:190px 1fr;gap:32px;align-items:center}.swatch{width:190px;aspect-ratio:1;border-radius:50%;border:2px solid ${portalTheme.dark.border}}h1{margin:0 0 18px;font-size:32px}.label{font:700 22px ui-monospace,monospace}.value,.source{overflow-wrap:anywhere;font:16px/1.5 ui-monospace,monospace}.source{color:${portalTheme.dark.textDim}}
  </style></head><body><main class="card"><div id="swatch" class="swatch"></div><div>${title}<p id="label" class="label"></p><p id="value" class="value"></p><p id="source" class="source"></p></div></main></body></html>`;
}

export function frameEvaluationExpression(frame: PaletteClipFrame): string {
  const payload = JSON.stringify(frame);
  return `(() => { const frame = ${payload}; document.body.style.backgroundColor = frame.background; document.getElementById('swatch').style.backgroundColor = frame.background; document.getElementById('label').textContent = frame.label; document.getElementById('value').textContent = frame.value; document.getElementById('source').textContent = frame.source; return frame.index; })()`;
}
