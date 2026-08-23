// @see https://bun.com/docs/runtime/markdown#ansi-terminal-output — Bun.markdown.ansi
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/blog/bun-v1.4 — Bun 1.4 CLI surfaces (markdown · spawn · inspect)
/**
 * Bun 1.4 CLI kernel for harness tools.
 *
 * Owns the repeated seams every small CLI should share:
 *   - markdown ANSI help (`Bun.markdown.ansi`)
 *   - gate · why · fix failures (`printGateFailure`)
 *   - machine `--json` (`jsonOut`)
 *   - blocking spawn text (`Bun.spawnSync`)
 *   - exit codes via `process.exitCode` (`Bun.exit` is undefined on some 1.4.0 builds)
 *
 * Policy: lib/console-depth.md · gate-fail.ts · docs/harness/tenants/maintain-workspace.md
 */
import { jsonOut } from '../console/index.ts';
import { printGateFailure, type GateFailureInput } from './gate-fail.ts';

export type SpawnTextResult = {
  code: number;
  stdout: string;
  stderr: string;
};

/** Render markdown help to stdout (ANSI when available). */
export function printMarkdownHelp(md: string): void {
  try {
    Bun.write(Bun.stdout, Bun.markdown.ansi(md));
  } catch {
    console.log(md);
  }
}

/** Structured hard-fail UX; returns 1 for `process.exitCode`. */
export function failCli(input: GateFailureInput): number {
  printGateFailure(input);
  return 1;
}

/** Machine-readable stdout (agents / scripts). */
export function emitJson<T>(value: T): void {
  jsonOut(value);
}

/**
 * Blocking argv spawn → trimmed stdout/stderr.
 * Prefer this over `Bun.$` when args are a list (no glob surprises).
 */
export function spawnText(
  cmd: string[],
  opts: { cwd?: string; allowFail?: boolean } = {}
): SpawnTextResult {
  const proc = Bun.spawnSync(cmd, {
    cwd: opts.cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const stdout = proc.stdout.toString().trim();
  const stderr = proc.stderr.toString().trim();
  const code = proc.exitCode ?? 1;
  if (code !== 0 && !opts.allowFail) {
    throw new Error(`${cmd.join(' ')} failed (${code}): ${stderr || stdout}`);
  }
  return { code, stdout, stderr };
}

/**
 * Set process exit code without calling `Bun.exit`.
 * On this pin `Bun.exit` may be undefined — do not call it.
 */
export function setExitCode(code: number): void {
  process.exitCode = code;
}

/** True when argv requests help (`--help` / `-h`). */
export function wantsHelp(argv: readonly string[]): boolean {
  return argv.includes('--help') || argv.includes('-h');
}

/** True when argv requests JSON (`--json`). */
export function wantsJson(argv: readonly string[]): boolean {
  return argv.includes('--json');
}
