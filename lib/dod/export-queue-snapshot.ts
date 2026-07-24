// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Export DOD review queue for Pages static snapshot + portal embed.
 */
import { DODVerifier } from './verifier.ts';

export type DodQueueSnapshot = {
  generatedAt: string;
  source: 'snapshot';
  /** Pages serves read-only; approve/reject need serve-public. */
  readOnly: true;
  byStatus: Record<string, number>;
  pendingCount: number;
  entries: Record<string, unknown>[];
};

export function exportDodQueueSnapshot(): DodQueueSnapshot {
  using verifier = new DODVerifier();
  const entries = verifier.list('all') as Record<string, unknown>[];
  const byStatus: Record<string, number> = {};
  for (const row of entries) {
    const st = String(row.status ?? 'unknown');
    byStatus[st] = (byStatus[st] ?? 0) + 1;
  }
  return {
    generatedAt: new Date().toISOString(),
    source: 'snapshot',
    readOnly: true,
    byStatus,
    pendingCount: byStatus.pending ?? 0,
    entries,
  };
}
