// @see https://bun.com/docs/runtime/utils#bun-escapehtml — Bun.escapeHTML
// @updated Bun.escapeHTML · fixed v1.0.36 · 2024-03-29 · https://bun.com/blog/bun-v1.0.36
// @updated Bun.escapeHTML · fixed v1.1.5 · 2024-04-26 · https://bun.com/blog/bun-v1.1.5
// @updated Bun.escapeHTML · fixed v1.1.18 · 2024-07-03 · https://bun.com/blog/bun-v1.1.18
// @updated Bun.escapeHTML · fixed v1.1.19 · 2024-07-12 · https://bun.com/blog/bun-v1.1.19
// @updated Bun.escapeHTML · fixed v1.1.21 · 2024-07-27 · https://bun.com/blog/bun-v1.1.21
// @updated Bun.escapeHTML · fixed v1.1.27 · 2024-09-07 · https://bun.com/blog/bun-v1.1.27
// @verified Bun.escapeHTML · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/utils#bun-escapehtml
// @see https://bun.com/reference/bun/markdown#bun.markdown.RenderCallbacks — Bun.markdown.RenderCallbacks
// @released Bun.markdown.RenderCallbacks · released v1.3.8 · 2026-01-29 · https://bun.com/blog/bun-v1.3.8
// @see https://bun.com/docs/runtime/markdown#bun-markdown-render — Bun.markdown.render
// @see https://bun.com/docs/runtime/color#output-formats — Bun.color [rgb]

export type TrustedAccentHeadingCallback = NonNullable<Bun.markdown.RenderCallbacks['heading']>;

function canonicalRgb(input: string, index: number): readonly [number, number, number] {
  if (typeof input !== 'string' || /[;{}<>]/.test(input)) {
    throw new TypeError(`Invalid accent palette color at index ${index}: ${JSON.stringify(input)}`);
  }
  const value = Bun.color(input, '[rgb]');
  if (
    !Array.isArray(value) ||
    value.length !== 3 ||
    !value.every(channel => Number.isInteger(channel) && channel >= 0 && channel <= 255)
  ) {
    throw new TypeError(`Invalid accent palette color at index ${index}: ${JSON.stringify(input)}`);
  }
  return [value[0]!, value[1]!, value[2]!];
}

/**
 * Build the heading callback for trusted, repository-generated Markdown.
 *
 * `Bun.markdown.render()` does not sanitize callback children. Do not use this
 * callback for user or registry Markdown without a complete safe render map.
 */
export function createTrustedAccentHeadingCallback(
  palette: readonly string[]
): TrustedAccentHeadingCallback {
  if (palette.length === 0) throw new TypeError('Accent heading palette must not be empty');
  const colors = palette.map(canonicalRgb);

  return (children, meta) => {
    const level = meta.level;
    if (!Number.isInteger(level) || level < 1 || level > 6) {
      throw new TypeError(`Invalid Markdown heading level: ${JSON.stringify(level)}`);
    }
    const [r, g, b] = colors[(level - 1) % colors.length]!;
    const id = meta.id ? ` id="${Bun.escapeHTML(meta.id)}"` : '';
    const color = `rgb(${r} ${g} ${b})`;
    return `<h${level}${id} style="color:${color};border-block-end:2px solid ${color}">${children}</h${level}>`;
  };
}
