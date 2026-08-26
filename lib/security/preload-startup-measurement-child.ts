// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
// @verified Bun.nanoseconds · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/utils#bun-nanoseconds
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @updated Bun.which · fixed v0.2.0 · 2022-10-13 · https://bun.com/blog/bun-v0.2.0
// @updated Bun.which · fixed v0.3.0 · 2022-12-07 · https://bun.com/blog/bun-v0.3.0
// @updated Bun.which · fixed v0.5.0 · 2023-01-18 · https://bun.com/blog/bun-v0.5.0
// @updated Bun.which · changed v1.1.4 · 2024-04-16 · https://bun.com/blog/bun-v1.1.4
// @updated Bun.which · fixed v1.1.9 · 2024-05-22 · https://bun.com/blog/bun-v1.1.9
// @updated Bun.which · fixed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.which · fixed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated Bun.which · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @verified Bun.which · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/utils
import { resolvePath } from '../path-bun.ts';
import { spawnGuardedBunChild, type BunChildAuthority } from './guarded-bun-process.ts';

export type StartupSample = { startupMs: number; firstRequestMs: number };

function requireBunExecutable(): string {
  const value = Bun.which('bun');
  if (!value) throw new Error('Bun executable not found');
  return value;
}

export async function measureStartupChild(
  root: string,
  origin: string,
  preconnect: boolean
): Promise<StartupSample> {
  const executable = requireBunExecutable();
  const entrypoint = resolvePath(root, 'tests/fixtures/preload-startup-entrypoint.ts');
  const target = `${origin}/first`;
  const argv = preconnect
    ? [`--fetch-preconnect=${origin}`, entrypoint, target]
    : [entrypoint, target];
  const authority: BunChildAuthority = {
    executable,
    argv,
    cwd: root,
    environment: {},
    profile: 'development',
    command: 'runtime',
    controlGrants: preconnect
      ? [{ control: 'fetch-preconnect', values: [origin], reason: 'hermetic loopback measurement' }]
      : [],
    reason: 'measure checked-in first-request fixture without ambient child authority',
  };
  const started = Bun.nanoseconds();
  const child = spawnGuardedBunChild(
    // guarded-process-consumer-reviewed owner=runtime-tooling executable=verified-bun args=measurement-exact cwd=repository-bound env=empty stdio=pipe network=loopback-only offline=denied flags=control-policy defaultDeny=true reason="The measurement harness binds Bun, argv, cwd, empty environment, and one ephemeral loopback origin before spawn."
    { authority, executable, argv, cwd: root },
    { stdout: 'pipe', stderr: 'pipe' }
  );
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (exitCode !== 0) throw new Error(`measurement child failed (${exitCode}): ${stderr}`);
  const result = JSON.parse(stdout) as { firstRequestMs: number };
  return {
    startupMs: Number(Bun.nanoseconds() - started) / 1_000_000,
    firstRequestMs: result.firstRequestMs,
  };
}
