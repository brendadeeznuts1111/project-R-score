#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @updated Bun.argv · changed v0.6.10 · 2023-06-26 · https://bun.com/blog/bun-v0.6.10
// @verified Bun.argv · Bun v1.3.14 · 2026-08-18 · https://bun.com/reference/bun/argv
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @updated Bun.file · fixed v0.2.2 · 2022-10-27 · https://bun.com/blog/bun-v0.2.2
// @updated Bun.file · changed v0.6.0 · 2023-05-16 · https://bun.com/blog/bun-v0.6.0
// @updated Bun.file · fixed v0.6.5 · 2023-05-29 · https://bun.com/blog/bun-v0.6.5
// @updated Bun.file · changed v0.6.12 · 2023-06-30 · https://bun.com/blog/bun-v0.6.12
// @updated Bun.file · fixed v1.0.1 · 2023-09-12 · https://bun.com/blog/bun-v1.0.1
// @updated Bun.file · fixed v1.0.2 · 2023-09-15 · https://bun.com/blog/bun-v1.0.2
// @updated Bun.file · changed v1.0.16 · 2023-12-10 · https://bun.com/blog/bun-v1.0.16
// @updated Bun.file · changed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.file · fixed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.file · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated Bun.file · fixed v1.0.24 · 2024-01-20 · https://bun.com/blog/bun-v1.0.24
// @updated Bun.file · fixed v1.0.25 · 2024-01-21 · https://bun.com/blog/bun-v1.0.25
// @updated Bun.file · fixed v1.0.26 · 2024-02-03 · https://bun.com/blog/bun-v1.0.26
// @updated Bun.file · fixed v1.0.27 · 2024-02-17 · https://bun.com/blog/bun-v1.0.27
// @updated Bun.file · fixed v1.0.28 · 2024-02-19 · https://bun.com/blog/bun-v1.0.28
// @updated Bun.file · changed v1.0.36 · 2024-03-29 · https://bun.com/blog/bun-v1.0.36
// @updated Bun.file · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.file · fixed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.file · fixed v1.1.6 · 2024-04-28 · https://bun.com/blog/bun-v1.1.6
// @updated Bun.file · changed v1.1.9 · 2024-05-22 · https://bun.com/blog/bun-v1.1.9
// @updated Bun.file · fixed v1.1.11 · 2024-06-01 · https://bun.com/blog/bun-v1.1.11
// @updated Bun.file · fixed v1.1.22 · 2024-08-07 · https://bun.com/blog/bun-v1.1.22
// @updated Bun.file · fixed v1.1.27 · 2024-09-07 · https://bun.com/blog/bun-v1.1.27
// @updated Bun.file · fixed v1.1.28 · 2024-09-18 · https://bun.com/blog/bun-v1.1.28
// @updated Bun.file · fixed v1.1.37 · 2024-11-26 · https://bun.com/blog/bun-v1.1.37
// @updated Bun.file · changed v1.1.39 · 2024-12-17 · https://bun.com/blog/bun-v1.1.39
// @updated Bun.file · changed v1.1.43 · 2025-01-08 · https://bun.com/blog/bun-v1.1.43
// @updated Bun.file · changed v1.2.0 · 2025-01-22 · https://bun.com/blog/bun-v1.2
// @updated Bun.file · fixed v1.2.2 · 2025-02-01 · https://bun.com/blog/bun-v1.2.2
// @updated Bun.file · changed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.file · fixed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.file · changed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.file · fixed v1.2.19 · 2025-07-19 · https://bun.com/blog/bun-v1.2.19
// @updated Bun.file · fixed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated Bun.file · changed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.file · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.file · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.file · fixed v1.3.10 · 2026-02-26 · https://bun.com/blog/bun-v1.3.10
// @updated Bun.file · fixed v1.3.11 · 2026-03-18 · https://bun.com/blog/bun-v1.3.11
// @updated Bun.file · fixed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @updated Bun.file · changed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.file · fixed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @updated Bun.file · changed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @updated Bun.file · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified Bun.file · Bun v1.3.14 · 2026-08-18 · https://bun.com/docs/runtime/file-io
// @see https://bun.com/docs/runtime/image#output-formats — Bun.Image.png
// @released Bun.Image.png · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/image#resize — Bun.Image.resize
// @released Bun.Image.resize · released v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @see https://bun.com/docs/runtime/utils#bun-revision — Bun.revision
// @updated Bun.revision · fixed v0.2.0 · 2022-10-13 · https://bun.com/blog/bun-v0.2.0
// @verified Bun.revision · Bun v1.3.14 · 2026-08-18 · https://bun.com/docs/runtime/utils#bun-revision
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @updated Bun.version · fixed v0.2.0 · 2022-10-13 · https://bun.com/blog/bun-v0.2.0
// @verified Bun.version · Bun v1.3.14 · 2026-08-18 · https://bun.com/docs/runtime/utils#bun-version
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @updated Bun.write · fixed v0.4.0 · 2022-12-23 · https://bun.com/blog/bun-v0.4.0
// @updated Bun.write · fixed v0.6.10 · 2023-06-26 · https://bun.com/blog/bun-v0.6.10
// @updated Bun.write · fixed v0.7.2 · 2023-08-03 · https://bun.com/blog/bun-v0.7.2
// @updated Bun.write · fixed v1.0.7 · 2023-10-20 · https://bun.com/blog/bun-v1.0.7
// @updated Bun.write · changed v1.0.16 · 2023-12-10 · https://bun.com/blog/bun-v1.0.16
// @updated Bun.write · fixed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.write · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated Bun.write · fixed v1.0.24 · 2024-01-20 · https://bun.com/blog/bun-v1.0.24
// @updated Bun.write · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.write · fixed v1.1.6 · 2024-04-28 · https://bun.com/blog/bun-v1.1.6
// @updated Bun.write · fixed v1.1.21 · 2024-07-27 · https://bun.com/blog/bun-v1.1.21
// @updated Bun.write · changed v1.1.37 · 2024-11-26 · https://bun.com/blog/bun-v1.1.37
// @updated Bun.write · changed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.write · fixed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.write · fixed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated Bun.write · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.write · fixed v1.3.5 · 2025-12-17 · https://bun.com/blog/bun-v1.3.5
// @updated Bun.write · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.write · fixed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @verified Bun.write · Bun v1.3.14 · 2026-08-18 · https://bun.com/docs/runtime/file-io#writing-files-bun-write
// @see https://bun.com/docs/runtime/image#terminals — Bun.Image terminal methods
// @see https://bun.com/docs/runtime/image#metadata — Bun.Image.metadata
// @see https://bun.com/docs/runtime/image#placeholders — Bun.Image.placeholder
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/blog/bun-v1.4#other-behavior-changes — Other behavior inventory
/**
 * Snapshot-audit Bun 1.4.0 Other-behavior compliance with Bun.inspect + Bun.Image terminals.
 *
 *   bun tools/audit-bun-1.4-other-behavior-snapshot.ts
 *   bun tools/audit-bun-1.4-other-behavior-snapshot.ts --json
 *   bun tools/audit-bun-1.4-other-behavior-snapshot.ts --write
 *
 * --write emits (gitignored reports/):
 *   reports/bun-1.4-other-behavior-snapshot.json
 *   reports/bun-1.4-other-behavior-snapshot.png
 */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { inspectTable, logTable } from '../lib/console/index.ts';
import { emitJson, setExitCode, wantsJson } from '../lib/harness/bun-cli.ts';
import { extractImageEvidenceMeta } from '../lib/image-metadata.ts';
import { joinPath } from '../lib/path-bun.ts';

const ROOT = joinPath(import.meta.dir, '..');
const INVENTORY = joinPath(ROOT, 'packages/bun-release-contracts/contracts/bun-v1.4.0.json');
const OUT_JSON = joinPath(ROOT, 'reports/bun-1.4-other-behavior-snapshot.json');
const OUT_PNG = joinPath(ROOT, 'reports/bun-1.4-other-behavior-snapshot.png');
const PROBE_PNG = joinPath(ROOT, 'reports/.bun-1.4-image-probe.png');

/** 1×1 red PNG — same fixture as verify-bun-release Image terminals probe. */
const PNG_1x1_RED = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

export type ImageTerminalAudit = {
  ok: boolean;
  metadata: Bun.Image.Metadata;
  evidence: Awaited<ReturnType<typeof extractImageEvidenceMeta>>;
  terminals: {
    bytes: number;
    buffer: number;
    blob: number;
    toBase64: number;
    dataurl: number;
    placeholder: number;
    write: number;
    inspect: string;
  };
};

export type OtherBehaviorSnapshot = {
  ok: boolean;
  bun: { version: string; revision: string };
  otherBehavior: {
    claim: 'inventory-routing-not-test-results';
    total: number;
    covered: number;
    planned: number;
    pct: number;
  };
  byTestPath: Array<{ testPath: string; count: number }>;
  image: ImageTerminalAudit;
  inspectTable: string;
  written?: { json: string; png: string };
};

export async function auditImageTerminals(pngPath?: string): Promise<ImageTerminalAudit> {
  const img = new Bun.Image(PNG_1x1_RED);
  const metadata = await img.metadata();
  // Fresh format chains per terminal (same pattern as verify-bun-release).
  const resized = img.resize(8, 8);
  const bytes = await resized.png().bytes();
  const buffer = await resized.png().buffer();
  const blob = await resized.png().blob();
  const toBase64 = await resized.png().toBase64();
  const dataurl = await resized.png().dataurl();
  const placeholder = await img.placeholder();
  const writeDest = pngPath ?? PROBE_PNG;
  const written = await resized.png().write(writeDest);
  const evidence = await extractImageEvidenceMeta(bytes);
  const inspect = Bun.inspect(
    {
      metadata,
      evidence: {
        format: evidence.format,
        width: evidence.width,
        height: evidence.height,
        size: evidence.size,
        digest: evidence.digest,
      },
      terminals: {
        bytes: bytes.byteLength,
        buffer: buffer.byteLength,
        blob: blob.size,
        toBase64: toBase64.length,
        dataurl: `${dataurl.slice(0, 48)}…`,
        placeholder: `${placeholder.slice(0, 48)}…`,
        write: written,
      },
    },
    { colors: false, depth: 4 }
  );
  const ok =
    metadata.format === 'png' &&
    bytes.byteLength > 0 &&
    buffer.byteLength > 0 &&
    blob.size > 0 &&
    toBase64.length > 0 &&
    dataurl.startsWith('data:image/') &&
    placeholder.startsWith('data:image/') &&
    written > 0;

  return {
    ok,
    metadata,
    evidence,
    terminals: {
      bytes: bytes.byteLength,
      buffer: buffer.byteLength,
      blob: blob.size,
      toBase64: toBase64.length,
      dataurl: dataurl.length,
      placeholder: placeholder.length,
      write: written,
      inspect,
    },
  };
}

export async function buildOtherBehaviorSnapshot(
  opts: {
    write?: boolean;
  } = {}
): Promise<OtherBehaviorSnapshot> {
  const inv = (await Bun.file(INVENTORY).json()) as {
    items: Array<{
      section: string;
      status: string;
      testPath: string | null;
      announcement: string;
    }>;
  };
  const other = inv.items.filter(i => /Other behavior changes/i.test(i.section));
  const covered = other.filter(i => i.status === 'covered');
  const planned = other.filter(i => i.status === 'planned');
  const byPath = new Map<string, number>();
  for (const row of covered) {
    const p = row.testPath ?? '(null)';
    byPath.set(p, (byPath.get(p) ?? 0) + 1);
  }
  const byTestPath = [...byPath.entries()]
    .map(([testPath, count]) => ({ testPath, count }))
    .sort((a, b) => b.count - a.count);

  const image = await auditImageTerminals(opts.write ? OUT_PNG : undefined);
  if (!opts.write) {
    try {
      await Bun.file(PROBE_PNG).delete();
    } catch {
      /* ignore */
    }
  }

  const rows = byTestPath.map(r => ({
    testPath: r.testPath.replace(/^tests\//, ''),
    covered: r.count,
  }));
  const table = inspectTable(rows, ['testPath', 'covered'] as const, { colors: false });

  const pct = other.length === 0 ? 0 : Math.round((100 * covered.length) / other.length);
  const snapshot: OtherBehaviorSnapshot = {
    ok: covered.length + planned.length === other.length && image.ok,
    bun: { version: Bun.version, revision: Bun.revision },
    otherBehavior: {
      claim: 'inventory-routing-not-test-results',
      total: other.length,
      covered: covered.length,
      planned: planned.length,
      pct,
    },
    byTestPath,
    image,
    inspectTable: table,
  };

  if (opts.write) {
    await Bun.write(OUT_JSON, `${JSON.stringify(snapshot, null, 2)}\n`);
    snapshot.written = { json: OUT_JSON, png: OUT_PNG };
  }
  return snapshot;
}

if (isModuleEntrypoint(import.meta)) {
  const argv = Bun.argv.slice(2);
  const json = wantsJson(argv);
  const write = argv.includes('--write');
  const snap = await buildOtherBehaviorSnapshot({ write });
  if (json) {
    emitJson(snap);
  } else {
    console.info(`Bun ${snap.bun.version} (${snap.bun.revision.slice(0, 12)})`);
    console.info(
      `Other-behavior inventory: ${snap.otherBehavior.covered}/${snap.otherBehavior.total} routed to executable contracts (${snap.otherBehavior.pct}%); ${snap.otherBehavior.planned} planned`
    );
    logTable(
      snap.byTestPath.map(r => ({
        testPath: r.testPath.replace(/^tests\//, ''),
        covered: r.count,
      })),
      ['testPath', 'covered'] as const,
      { colors: false }
    );
    console.info('Bun.Image terminals (Bun.inspect):');
    console.info(snap.image.terminals.inspect);
    if (snap.written) {
      console.info(`wrote ${snap.written.json}`);
      console.info(`wrote ${snap.written.png}`);
    }
    console.info(snap.ok ? 'audit: OK' : 'audit: FAIL');
  }
  setExitCode(snap.ok ? 0 : 1);
}
