/**
 * console-depth.ts — project-wide SSOT for object-inspection verbosity.
 *
 * Why: Bun's `--console-depth` flag and `Bun.inspect({ depth })` are the only
 * levers that actually work in Bun 1.4 — `util.inspect.defaultOptions.depth`
 * does NOT affect console.log, and the runtime does not read BUN_CONSOLE_DEPTH
 * itself. So depth control must be applied explicitly; this module is the
 * single place that does it.
 *
 * Control plane (highest wins):
 *   1. explicit `depth` argument
 *   2. `--console-depth=N` in process args
 *   3. `BUN_CONSOLE_DEPTH` env (set it in the project root .env)
 *   4. DEFAULT_DEPTH (4)
 */

const DEFAULT_DEPTH = 4;

function parseDepth(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function argDepth(): number | null {
  const idx = Bun.argv.findIndex(a => a === '--console-depth');
  if (idx !== -1) return parseDepth(Bun.argv[idx + 1]);
  const eq = Bun.argv.find(a => a.startsWith('--console-depth='));
  return eq ? parseDepth(eq.split('=')[1]) : null;
}

/** Effective console depth for this process. */
export function getConsoleDepth(): number {
  return argDepth() ?? parseDepth(Bun.env.BUN_CONSOLE_DEPTH) ?? DEFAULT_DEPTH;
}

/** Bun.inspect with the project depth applied (pass depth to override). */
export function inspect(value: unknown, options: { depth?: number; colors?: boolean } = {}): string {
  return Bun.inspect(value, { depth: options.depth ?? getConsoleDepth(), colors: options.colors });
}

/** console.log replacement that respects the project depth. */
export function logDepth(value: unknown, options: { depth?: number } = {}): void {
  console.info(inspect(value, { ...options, colors: true }));
}

/** CLI args to forward the effective depth to a child `bun` process. */
export function depthArgs(): string[] {
  return [`--console-depth=${getConsoleDepth()}`];
}

/** Env overlay to forward the effective depth to a child process. */
export function withConsoleDepth<T extends Record<string, string | undefined>>(env: T): T & { BUN_CONSOLE_DEPTH: string } {
  return { ...env, BUN_CONSOLE_DEPTH: String(getConsoleDepth()) };
}
