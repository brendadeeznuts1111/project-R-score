import { resolvePath } from '../path-bun.ts';
import {
  type FrictionEvent,
  type KnownFriction,
  frictionFingerprint,
  readFrictionRegistry,
  safeRepoPath,
  validateFrictionValue,
} from './agent-path-contract.ts';

function safeDetail(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const detail = value.trim();
  if (detail.length > 240) throw new TypeError('friction detail exceeds 240 characters');
  if (/(?:authorization|password|secret|token|api[_-]?key)\s*[:=]/i.test(detail)) {
    throw new TypeError('friction detail appears to contain a credential');
  }
  return detail || undefined;
}

export async function recordAgentFriction(
  repoRoot: string,
  input: { tool: string; code: string; path?: string; detail?: string }
): Promise<FrictionEvent> {
  const tool = validateFrictionValue(input.tool, 'tool');
  const code = validateFrictionValue(input.code, 'code');
  const path = input.path ? safeRepoPath(repoRoot, input.path) : undefined;
  const detail = safeDetail(input.detail);
  const fingerprint = frictionFingerprint(tool, code, path);
  const id = Bun.randomUUIDv7();
  const event: FrictionEvent = {
    schemaVersion: 1,
    id,
    observedAt: new Date().toISOString(),
    fingerprint,
    tool,
    code,
    ...(path ? { path } : {}),
    ...(detail ? { detail } : {}),
  };
  await Bun.write(
    resolvePath(repoRoot, `.cache/ai-friction/events/${id}.json`),
    `${JSON.stringify(event, null, 2)}\n`
  );
  return event;
}

type FrictionSummary = {
  schemaVersion: 1;
  promotionThreshold: number;
  observationWindowDays: number;
  known: Array<KnownFriction & { observations: number; reopen: boolean }>;
  observations: number;
  expiredObservations: number;
  fingerprints: Array<{
    fingerprint: string;
    count: number;
    tool: string;
    code: string;
    path?: string;
    promote: boolean;
  }>;
};

function parseEvent(raw: unknown, file: string, repoRoot: string): FrictionEvent {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new TypeError(`invalid friction event: ${file}`);
  }
  const event = raw as FrictionEvent;
  const expected = [
    'schemaVersion',
    'id',
    'observedAt',
    'fingerprint',
    'tool',
    'code',
    ...(event.path ? ['path'] : []),
    ...(event.detail ? ['detail'] : []),
  ];
  if (Object.keys(event).sort().join('\0') !== expected.sort().join('\0')) {
    throw new TypeError(`friction event keys do not match contract: ${file}`);
  }
  const observedAt = Date.parse(event.observedAt);
  if (
    event.schemaVersion !== 1 ||
    !/^[0-9a-f-]{36}$/i.test(event.id) ||
    !Number.isFinite(observedAt) ||
    observedAt > Date.now() + 5 * 60_000
  ) {
    throw new TypeError(`invalid friction event identity or timestamp: ${file}`);
  }
  const tool = validateFrictionValue(event.tool, 'event tool');
  const code = validateFrictionValue(event.code, 'event code');
  const path = event.path ? safeRepoPath(repoRoot, event.path) : undefined;
  safeDetail(event.detail);
  if (event.fingerprint !== frictionFingerprint(tool, code, path)) {
    throw new TypeError(`friction event fingerprint mismatch: ${file}`);
  }
  return event;
}

async function loadEvents(
  repoRoot: string,
  now: Date,
  observationWindowDays: number
): Promise<{
  recent: Array<{ file: string; event: FrictionEvent }>;
  expired: Array<{ file: string; event: FrictionEvent }>;
}> {
  const recent: Array<{ file: string; event: FrictionEvent }> = [];
  const expired: Array<{ file: string; event: FrictionEvent }> = [];
  const eventsRoot = resolvePath(repoRoot, '.cache/ai-friction/events');
  const cutoff = now.getTime() - observationWindowDays * 86_400_000;
  try {
    for await (const file of new Bun.Glob('*.json').scan({ cwd: eventsRoot, onlyFiles: true })) {
      const event = parseEvent(
        await Bun.file(resolvePath(eventsRoot, file)).json(),
        file,
        repoRoot
      );
      (Date.parse(event.observedAt) >= cutoff ? recent : expired).push({ file, event });
    }
  } catch (error) {
    if ((error as { code?: string }).code !== 'ENOENT') throw error;
  }
  return { recent, expired };
}

export async function reportAgentFriction(
  repoRoot: string,
  now = new Date()
): Promise<FrictionSummary> {
  const registry = await readFrictionRegistry(repoRoot);
  const grouped = new Map<string, { count: number; event: FrictionEvent }>();
  const events = await loadEvents(repoRoot, now, registry.observationWindowDays);
  for (const { event } of events.recent) {
    const current = grouped.get(event.fingerprint);
    grouped.set(event.fingerprint, { count: (current?.count ?? 0) + 1, event });
  }
  const fingerprints = [...grouped.entries()]
    .map(([fingerprint, value]) => ({
      fingerprint,
      count: value.count,
      tool: value.event.tool,
      code: value.event.code,
      ...(value.event.path ? { path: value.event.path } : {}),
      promote: value.count >= registry.promotionThreshold,
    }))
    .sort(
      (left, right) => right.count - left.count || left.fingerprint.localeCompare(right.fingerprint)
    );
  const known = registry.issues.map(issue => {
    const observations = [...grouped.values()]
      .filter(
        ({ event }) =>
          event.tool === issue.match.tool &&
          event.code === issue.match.code &&
          (!issue.match.path || event.path === issue.match.path)
      )
      .reduce((sum, entry) => sum + entry.count, 0);
    return {
      ...issue,
      observations,
      reopen: issue.status === 'resolved' && observations >= registry.promotionThreshold,
    };
  });
  return {
    schemaVersion: 1,
    promotionThreshold: registry.promotionThreshold,
    observationWindowDays: registry.observationWindowDays,
    known,
    observations: fingerprints.reduce((sum, entry) => sum + entry.count, 0),
    expiredObservations: events.expired.length,
    fingerprints,
  };
}

export async function pruneAgentFriction(
  repoRoot: string,
  now = new Date()
): Promise<{ schemaVersion: 1; retentionDays: number; deleted: number }> {
  const registry = await readFrictionRegistry(repoRoot);
  const events = await loadEvents(repoRoot, now, registry.retentionDays);
  const eventsRoot = resolvePath(repoRoot, '.cache/ai-friction/events');
  for (const { file } of events.expired) await Bun.file(resolvePath(eventsRoot, file)).delete();
  return {
    schemaVersion: 1,
    retentionDays: registry.retentionDays,
    deleted: events.expired.length,
  };
}
