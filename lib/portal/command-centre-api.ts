// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
/**
 * Portal command centre API — aggregate baked JSON + local snapshot index.
 * Used by serve-public /api/portal/dashboard and /api/portal/action (loopback only).
 */
import { aggregateCommandCentre, BAKE_SOURCES } from '../../public/portal/command-centre-core.js';
import { readSnapshotIndex } from '../../tools/snapshot-core.ts';

/** Loopback-only spawn allowlist — ids must match QUICK_ACTIONS in command-centre-core.js */
export const PORTAL_ACTIONS: Record<string, string[]> = {
  'snapshot-portal': ['bun', 'tools/portal-cli.ts', 'snapshot', 'run', '--scope', 'portal'],
  'snapshot-prediction': ['bun', 'tools/portal-cli.ts', 'snapshot', 'run', '--scope', 'prediction'],
  'health-bake': ['bun', 'run', 'monorepo:health:bake'],
  'failures-bake': ['bun', 'run', 'failures:bake'],
  'doctor-run': ['bun', 'run', 'bake:doctor'],
  'ops-snapshot': ['bun', 'run', 'ops:snapshot', '--no-routing'],
  'packages-rebake': ['bun', 'run', 'audit:packages', '--', '--bake'],
  'vault-health': ['bun', 'run', 'portal-cli', 'vault', 'health'],
  'secret-map': ['bun', 'run', 'portal-cli', 'secret', 'map'],
};

async function readRegistryJson(name: string): Promise<unknown | null> {
  const file = Bun.file(`public/registry/${name}`);
  if (!(await file.exists())) return null;
  try {
    return await file.json();
  } catch {
    return null;
  }
}

async function readBakePayloads(): Promise<Record<string, unknown | null>> {
  const entries = await Promise.all(
    BAKE_SOURCES.map(async src => {
      const fileName = src.href.replace(/^\/registry\//, '');
      return [src.id, await readRegistryJson(fileName)] as const; // brand-ok — bake source tile key, not a domain entity id
    })
  );
  return Object.fromEntries(entries);
}

export async function buildPortalDashboardPayload(): Promise<
  ReturnType<typeof aggregateCommandCentre>
> {
  const [
    monorepoHealth,
    failures,
    packagesGraph,
    monitoring,
    capabilityMap,
    catalogSnapshot,
    opsSummary,
    snapshotIndex,
    vaultHealth,
    doctorState,
    bakePayloads,
  ] = await Promise.all([
    readRegistryJson('monorepo-health.json'),
    readRegistryJson('failures.json'),
    readRegistryJson('packages-graph-map.json'),
    readRegistryJson('monitoring.json'),
    readRegistryJson('capability-map-subset.json'),
    readRegistryJson('catalog-snapshot.json'),
    readRegistryJson('ops-summary.json'),
    readSnapshotIndex().catch(() => []),
    readRegistryJson('vault-health.json'),
    readRegistryJson('doctor-state.json'),
    readBakePayloads(),
  ]);

  return aggregateCommandCentre({
    monorepoHealth,
    failures,
    packagesGraph,
    monitoring,
    capabilityMap,
    catalogSnapshot,
    opsSummary,
    snapshotIndex,
    vaultHealth,
    doctorState,
    bakePayloads,
  });
}

export function isLoopbackRequest(
  req: Request,
  server?: { requestIP?: (req: Request) => { address?: string } | null }
): boolean {
  const ip = server?.requestIP?.(req);
  const addr = ip?.address ?? '';
  if (addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1') {
    return true;
  }
  if (ip) return false;
  const host = new URL(req.url).hostname;
  return host === '127.0.0.1' || host === 'localhost' || host === '::1';
}

export async function runPortalAction(
  action: string,
  req: Request,
  server?: { requestIP?: (req: Request) => { address?: string } | null }
): Promise<Response> {
  if (!isLoopbackRequest(req, server)) {
    return Response.json(
      {
        error: 'portal actions are loopback-only',
        hint: 'Copy the CLI command on Pages or run serve-public locally',
      },
      { status: 403 }
    );
  }
  const cmd = PORTAL_ACTIONS[action];
  if (!cmd) {
    return Response.json(
      { error: `Unknown action "${action}"`, known: Object.keys(PORTAL_ACTIONS).sort() },
      { status: 400 }
    );
  }
  const proc = Bun.spawn(cmd, {
    cwd: process.cwd(),
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...Bun.env },
  });
  const code = await proc.exited;
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  if (code !== 0) {
    return Response.json(
      {
        ok: false,
        action,
        exitCode: code,
        stderr: stderr.slice(0, 2000),
        stdout: stdout.slice(0, 1000),
      },
      { status: 500 }
    );
  }
  return Response.json({
    ok: true,
    action,
    generatedAt: new Date().toISOString(),
    stdout: stdout.slice(0, 1000),
  });
}

export async function portalDashboardResponse(): Promise<Response> {
  const payload = await buildPortalDashboardPayload();
  return Response.json(payload, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function portalActionResponse(
  req: Request,
  server?: { requestIP?: (req: Request) => { address?: string } | null }
): Promise<Response> {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed — use POST' }, { status: 405 });
  }
  let body: { action?: string };
  try {
    body = (await req.json()) as { action?: string };
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const action = body.action?.trim();
  if (!action) {
    return Response.json({ error: 'Missing action field' }, { status: 400 });
  }
  return runPortalAction(action, req, server);
}
