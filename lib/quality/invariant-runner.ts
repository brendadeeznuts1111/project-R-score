// @see https://bun.com/docs/runtime/utils#bun-nanoseconds
import { bunSpawnArgs } from '../bun-executable.ts';
import type { QualityLayer, SnapshotApproval } from './result.ts';

export type InvariantLane = {
  id: string;
  owner: string;
  file: string;
  layer: QualityLayer;
  snapshotApproval: SnapshotApproval;
};

export type InvariantLaneResult = InvariantLane & {
  command: string;
  exitCode: number;
  durationNs: number;
};

export const INVARIANT_LANES: readonly InvariantLane[] = [
  {
    id: 'technical.quality-primitives',
    owner: 'lib/quality/',
    file: './tests/quality-primitives.test.ts',
    layer: 'technical',
    snapshotApproval: 'eligible',
  },
  {
    id: 'technical.quality-report',
    owner: 'lib/quality/',
    file: './tests/quality-report.test.ts',
    layer: 'technical',
    snapshotApproval: 'eligible',
  },
  {
    id: 'domain.partner-ledger',
    owner: 'lib/partner-profile/',
    file: './tests/partner-ledger-properties.test.ts',
    layer: 'domain',
    snapshotApproval: 'manual-only',
  },
  {
    id: 'technical.data-formats',
    owner: 'lib/data-format-operation-proof.ts',
    file: './tests/data-format-properties.test.ts',
    layer: 'technical',
    snapshotApproval: 'eligible',
  },
  {
    id: 'technical.portal-landmarks',
    owner: 'public/portal/',
    file: './tests/portal-semantic-landmarks.test.ts',
    layer: 'technical',
    snapshotApproval: 'eligible',
  },
] as const;

export async function runInvariantLanes(options: {
  cwd: string;
  inheritOutput?: boolean;
}): Promise<InvariantLaneResult[]> {
  const ids = new Set<string>();
  const results: InvariantLaneResult[] = [];
  for (const lane of INVARIANT_LANES) {
    if (ids.has(lane.id)) throw new TypeError(`duplicate invariant lane id: ${lane.id}`);
    ids.add(lane.id);
    const command = `bun test ${lane.file}`;
    const startedNs = Bun.nanoseconds();
    const child = Bun.spawn(bunSpawnArgs(['test', lane.file]), {
      cwd: options.cwd,
      env: { ...Bun.env },
      stdin: options.inheritOutput ? 'inherit' : 'ignore',
      stdout: options.inheritOutput ? 'inherit' : 'ignore',
      stderr: options.inheritOutput ? 'inherit' : 'ignore',
    });
    const exitCode = (await child.exited) ?? 1;
    results.push({
      ...lane,
      command,
      exitCode,
      durationNs: Math.floor(Bun.nanoseconds() - startedNs),
    });
  }
  return results;
}

export function invariantExitCode(results: readonly InvariantLaneResult[]): number {
  return results.find(result => result.exitCode !== 0)?.exitCode ?? 0;
}
