// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Agent-learning NDJSON log for stripped Bun.Image metadata on processed DODs.
 */
import type { DodImageMetaStrip } from './enrich-entry.ts';

export const DEFAULT_DOD_META_NDJSON = 'data/dod_meta.ndjson';

export type DodMetaLogLine = {
  at: string;
  dodId: string; // brand-ok — DodId wire
  agentId: string; // brand-ok — TreeNodeId wire
  type: string;
  partnerCode?: string | null;
  telegramTopic?: string | null;
  s3Path?: string | null;
  meta: DodImageMetaStrip;
};

/** Append one JSON line (creates parent dir when missing). */
export async function appendDodMetaNdjson(
  line: DodMetaLogLine,
  path = Bun.env.DOD_META_NDJSON?.trim() || DEFAULT_DOD_META_NDJSON
): Promise<void> {
  if (Bun.env.DOD_META_LOG === '0') return;
  const slash = path.lastIndexOf('/');
  if (slash > 0) {
    const dir = path.slice(0, slash);
    await Bun.$`mkdir -p ${dir}`.quiet();
  }
  const file = Bun.file(path);
  const prev = (await file.exists()) ? await file.text() : '';
  await Bun.write(path, `${prev}${JSON.stringify(line)}\n`);
}
