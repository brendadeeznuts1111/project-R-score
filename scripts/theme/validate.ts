// Validation: parity (dark vs light), alias lint (colors.* must be var(--...)), contrast (WCAG).
export function validateParity(theme: any): void {
  const darkKeys = Object.keys(theme.dark).filter((k: string) => k !== "neutral");
  const lightKeys = Object.keys(theme.light).filter((k: string) => k !== "neutral");
  for (const k of darkKeys) if (!lightKeys.includes(k)) throw new Error(`parity: light missing "${k}"`);
  for (const k of lightKeys) if (!darkKeys.includes(k)) throw new Error(`parity: dark missing "${k}"`);
}

export function validateAliases(theme: any): void {
  if (!theme.colors) return;
  for (const group of Object.values(theme.colors as Record<string, Record<string, string>>)) {
    for (const [k, v] of Object.entries(group)) {
      if (typeof v !== "string" || !/^var\(--/.test(v)) throw new Error(`alias lint: colors.*.${k} must be var(--...), got ${v}`);
    }
  }
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function luminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}
export function validateContrast(theme: any): void {
  const bg = hexToRgb(theme.dark.bg);
  const text = hexToRgb(theme.dark.text);
  if (bg && text) {
    const l1 = luminance(bg), l2 = luminance(text);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    if (ratio < 4.5) throw new Error(`contrast: bg/text ratio ${ratio.toFixed(2)} < 4.5`);
  }
}