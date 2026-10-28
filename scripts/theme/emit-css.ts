// Emit CSS tokens from theme. Uses light-dark() friendly output (dark :root + light override).
export function emitCss(theme: any): string {
  const lines: string[] = [":root {", "  color-scheme: dark;"];
  for (const [k, v] of Object.entries(theme.dark as Record<string, unknown>)) {
    if (k === "neutral") {
      for (const [nk, nv] of Object.entries(v as Record<string, string>)) lines.push(`  --neutral-${nk}: ${nv};`);
    } else {
      const cssKey = k.replace(/([A-Z])/g, "-$1").toLowerCase();
      lines.push(`  --${cssKey}: ${v};`);
    }
  }
  lines.push("}");
  // light override
  lines.push("", "html[data-theme='light'] {", "  color-scheme: light;");
  for (const [k, v] of Object.entries(theme.light as Record<string, unknown>)) {
    if (k === "neutral") {
      for (const [nk, nv] of Object.entries(v as Record<string, string>)) lines.push(`  --neutral-${nk}: ${nv};`);
    } else {
      const cssKey = k.replace(/([A-Z])/g, "-$1").toLowerCase();
      lines.push(`  --${cssKey}: ${v};`);
    }
  }
  lines.push("}");
  return lines.join("\n") + "\n";
}