// @see https://bun.com/docs/guides/process/argv — Parse command-line arguments / Bun.argv
/**
 * Thin Bun.argv helpers for scripts/CLIs (no node:util parseArgs).
 */

/** Full argv including `bun` + entry (same shape as process.argv under Bun). */
export function argv(): string[] {
  return Bun.argv;
}

/** Args after the entry script (drops `bun` + script path). */
export function positionalArgs(): string[] {
  return Bun.argv.slice(2);
}

/** `--name=value` or `--name value`; empty string when absent. */
export function flagValue(name: string, fallback = ''): string {
  const prefix = `--${name}=`;
  const exact = Bun.argv.find(arg => arg.startsWith(prefix));
  if (exact) return exact.slice(prefix.length).trim();
  const idx = Bun.argv.findIndex(arg => arg === `--${name}`);
  if (idx >= 0) return String(Bun.argv[idx + 1] || '').trim();
  return fallback;
}

export function hasFlag(name: string): boolean {
  return Bun.argv.includes(`--${name}`);
}
