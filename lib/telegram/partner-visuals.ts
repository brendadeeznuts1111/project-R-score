// @see https://bun.com/docs/runtime/color — Bun.color formats
// lib/telegram/partner-visuals.ts — deterministic per-partner visual identity.
//
// Partner color = deterministic HSL from the partner CODE (FNV-ish hash → hue),
// then Bun.color converts to hex / rgb / rgba / ansi-16m for terminals. Used by
// CLI tools so tables match the Mermaid diagrams and Telegram avatars.

/** Deterministic hue (0–359) from a partner code — stable across runs/machines. */
export function partnerHue(code: string): number {
  let h = 0;
  const s = code.toUpperCase().trim();
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

export type PartnerVisual = {
  hsl: string;
  hex: string;
  rgbObj: { r: number; g: number; b: number };
  rgbaObj: { r: number; g: number; b: number; a: number };
  rgbaArr: [number, number, number, number];
  textColor: string; // '#000000' | '#ffffff' by relative luminance
  initials: string;
  ansi: string; // truecolor ansi-16m escape for terminals
};

/** Relative luminance in the 0–255 scale (0.299/0.587/0.114). */
export function partnerContrastTextColor(hex: string): string {
  const { r, g, b } = Bun.color(hex, '{rgb}');
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 128 ? '#000000' : '#ffffff';
}

/** Full visual identity for a partner code — all formats derived from one HSL. */
export function getPartnerVisual(code: string): PartnerVisual {
  const hsl = `hsl(${partnerHue(code)}, 75%, 60%)`;
  const hex = Bun.color(hsl, 'hex');
  const rgbObj = Bun.color(hex, '{rgb}');
  const rgbaObj = Bun.color(hex, '{rgba}');
  const rgbaArr = Bun.color(hex, '[rgba]');
  return {
    hsl,
    hex,
    rgbObj,
    rgbaObj,
    rgbaArr,
    textColor: partnerContrastTextColor(hex),
    initials: code.slice(0, 2).toUpperCase(),
    ansi: Bun.color(hex, 'ansi-16m'),
  };
}
