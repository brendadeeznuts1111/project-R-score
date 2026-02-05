#!/usr/bin/env bun

export {}; // Make this file a module to allow top-level await

console.log("[DEBUG] Test runner CWD:", process.cwd());
console.log("[DEBUG] import.meta.dir (file dir):", import.meta.dir);
console.log("[DEBUG] import.meta.path (full file):", import.meta.path);
console.log("[DEBUG] Bun.which('omega'):", Bun.which("omega") || "not found");
console.log("[DEBUG] Bun.which('kimi-shell'):", Bun.which("kimi-shell") || "not found");
console.log("[DEBUG] Bun.which('omega-tui'):", Bun.which("omega-tui") || "not found");
console.log("[DEBUG] Exists .claude/bin/omega:", await Bun.file(".claude/bin/omega").exists());
console.log("[DEBUG] Exists bin/omega (symlink):", await Bun.file("bin/omega").exists());

// Test import
try {
  const { COLORS, THEME } = await import("./.claude/lib/cli.ts");
  console.log("[DEBUG] COLORS import: SUCCESS");
  console.log("[DEBUG] THEME.primary:", THEME?.primary || "undefined");
} catch (err) {
  console.log("[DEBUG] COLORS import: FAILED -", err instanceof Error ? err.message : String(err));
}
