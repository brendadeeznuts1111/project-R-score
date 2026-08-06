// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write createPath
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
/**
 * Probe / scratch temp dirs without node:fs or node:os.
 *
 * Product code should prefer durable paths under the repo or data/; use this
 * only for short-lived contract probes and tests that need an empty workspace.
 */
import { joinPath } from './path-bun.ts';

/** System temp directory (TMPDIR / TMP / TEMP / /tmp). */
export function systemTempDir(): string {
  return Bun.env.TMPDIR?.trim() || Bun.env.TMP?.trim() || Bun.env.TEMP?.trim() || '/tmp';
}

/**
 * Create a unique empty directory under the system temp dir.
 * `prefix` is a label only (sanitized); uniqueness comes from UUID v7.
 */
export async function makeTempDir(prefix = 'fw-'): Promise<string> {
  const safe = prefix.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+$/g, '') || 'fw';
  const dir = joinPath(systemTempDir(), `${safe}-${Bun.randomUUIDv7()}`);
  await Bun.write(joinPath(dir, '.bun-keep'), '');
  return dir;
}

/** Best-effort recursive remove for probe cleanup. */
export async function removeTempDir(dir: string): Promise<void> {
  if (!dir || dir === '/' || dir === '.' || dir === '') return;
  // Guard against accidental wipe of home / root-ish paths
  const temp = systemTempDir().replace(/\/$/, '');
  if (!dir.startsWith(temp + '/') && dir !== temp) {
    throw new Error(`removeTempDir: refuse path outside system temp: ${dir}`);
  }
  const proc = Bun.spawn(['rm', '-rf', '--', dir], {
    stdout: 'ignore',
    stderr: 'ignore',
  });
  await proc.exited;
}
