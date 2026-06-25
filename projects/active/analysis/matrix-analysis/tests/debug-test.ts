#!/usr/bin/env bun

export {}; // Make this file a module to allow top-level await

console.info("[DEBUG] Test runner CWD:", process.cwd());
console.info("[DEBUG] import.meta.dir (file dir):", import.meta.dir);
console.info("[DEBUG] import.meta.path (full file):", import.meta.path);
console.info("[DEBUG] Bun.which('omega'):", Bun.which("omega") || "not found");
console.info("[DEBUG] Bun.which('kimi-shell'):", Bun.which("kimi-shell") || "not found");
console.info("[DEBUG] Bun.which('omega-tui'):", Bun.which("omega-tui") || "not found");
console.info("[DEBUG] Exists .claude/bin/omega:", await Bun.file(".claude/bin/omega").exists());
console.info("[DEBUG] Exists bin/omega (symlink):", await Bun.file("bin/omega").exists());

// Test import
try {
  const { COLORS, THEME } = await import("./.claude/lib/cli.ts");
  console.info("[DEBUG] COLORS import: SUCCESS");
  console.info("[DEBUG] THEME.primary:", THEME?.primary || "undefined");
} catch (err) {
  console.info("[DEBUG] COLORS import: FAILED -", err instanceof Error ? err.message : String(err));
}
