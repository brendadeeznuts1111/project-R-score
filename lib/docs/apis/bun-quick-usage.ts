// lib/docs/apis/bun-quick-usage.ts — Bun quick usage patterns

export const QuickUsagePatterns = {
  tableWithColoredStatus: `console.log(Bun.inspect.table(data, columns, { colors: true }));`,
  safeHTMLExport: `await Bun.write("report.html", \`<div>\${Bun.escapeHTML(content)}</div>\`);`,
  widthAwarePadding: `const padded = text.padEnd(Bun.stringWidth(text) + 10);`,
  hslColorPerProfile: `const ansi = Bun.color(\`hsl(\${hue}, 100%, 50%)\`, "ansi");`,
  openFileOnError: `Bun.openInEditor(import.meta.url, { line: 123 });`,
  scanProjects: `for await (const p of new Bun.Glob("projects/*").scan(".")) { /* ... */ }`,
} as const;
