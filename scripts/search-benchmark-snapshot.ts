#!/usr/bin/env bun

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { S3Client } from 'bun';

type RankedProfile = {
  profile: string;
  label: string;
  avgSignalPct: number;
  avgSlopPct: number;
  avgDuplicatePct: number;
  avgUniqueFamilyPct: number;
  avgMirrorsPerHit: number;
  qualityScore: number;
};

type BenchmarkPayload = {
  path: string;
  limit: number;
  queries: string[];
  rankedProfiles: RankedProfile[];
};

type SnapshotIndexEntry = {
  id: string;
  createdAt: string;
  topProfile: string;
  topScore: number;
  localJson: string;
  localMd: string;
  r2JsonKey?: string;
  r2MdKey?: string;
  r2ManifestKey?: string;
};

type SnapshotIndex = {
  updatedAt: string;
  snapshots: SnapshotIndexEntry[];
};

type CliOptions = {
  path: string;
  limit: number;
  queries?: string;
  outputDir: string;
  id?: string;
  upload: boolean;
  bucket?: string;
  prefix: string;
  publicBase?: string;
  gzip: boolean;
  uploadRetries: number;
};

type R2Config = {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  prefix: string;
  publicBase?: string;
};

function escapeXml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function toRfc822(dateIso: string): string {
  return new Date(dateIso).toUTCString();
}

function buildRssFeed(
  index: SnapshotIndex,
  opts: {
    bucket?: string;
    prefix: string;
    publicBase?: string;
  }
): string {
  const channelTitle = 'Search Benchmark Snapshots';
  const channelLink = opts.publicBase
    ? `${opts.publicBase.replace(/\/+$/g, '')}/index.json`
    : `r2://${opts.bucket || 'unknown'}/${opts.prefix}/index.json`;
  const channelDescription = 'Snapshot updates for search benchmark quality profiles.';
  const lastBuildDate = toRfc822(index.updatedAt);

  const items = index.snapshots.slice(0, 50).map((snap) => {
    const jsonKey = snap.r2JsonKey || `${opts.prefix}/${snap.id}/snapshot.json`;
    const summaryKey = snap.r2MdKey || `${opts.prefix}/${snap.id}/summary.md`;
    const itemLink = opts.publicBase
      ? `${opts.publicBase.replace(/\/+$/g, '')}/${snap.id}/snapshot.json`
      : `r2://${opts.bucket || 'unknown'}/${jsonKey}`;
    const summaryRef = opts.publicBase
      ? `${opts.publicBase.replace(/\/+$/g, '')}/${snap.id}/summary.md`
      : `r2://${opts.bucket || 'unknown'}/${summaryKey}`;
    const title = `${snap.id} · ${snap.topProfile} · ${snap.topScore.toFixed(2)}`;
    const description = `Top profile: ${snap.topProfile}. Top score: ${snap.topScore.toFixed(2)}. Summary: ${summaryRef}`;

    return [
      '    <item>',
      `      <title>${escapeXml(title)}</title>`,
      `      <link>${escapeXml(itemLink)}</link>`,
      `      <guid isPermaLink="false">${escapeXml(snap.id)}</guid>`,
      `      <pubDate>${escapeXml(toRfc822(snap.createdAt))}</pubDate>`,
      `      <description>${escapeXml(description)}</description>`,
      '    </item>',
    ].join('\n');
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '  <channel>',
    `    <title>${escapeXml(channelTitle)}</title>`,
    `    <link>${escapeXml(channelLink)}</link>`,
    `    <description>${escapeXml(channelDescription)}</description>`,
    `    <lastBuildDate>${escapeXml(lastBuildDate)}</lastBuildDate>`,
    ...items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}

function parseArgs(argv: string[]): CliOptions {
  const out: CliOptions = {
    path: './lib',
    limit: 40,
    outputDir: './reports/search-benchmark',
    upload: true,
    prefix: Bun.env.R2_BENCH_PREFIX || 'reports/search-bench',
    gzip: true,
    uploadRetries: Number.parseInt(Bun.env.R2_UPLOAD_RETRIES || '3', 10) || 3,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--path') {
      out.path = argv[i + 1] || out.path;
      i += 1;
      continue;
    }
    if (arg === '--limit') {
      const n = Number.parseInt(argv[i + 1] || '', 10);
      if (Number.isFinite(n) && n > 0) out.limit = n;
      i += 1;
      continue;
    }
    if (arg === '--queries') {
      out.queries = argv[i + 1] || '';
      i += 1;
      continue;
    }
    if (arg === '--output') {
      out.outputDir = argv[i + 1] || out.outputDir;
      i += 1;
      continue;
    }
    if (arg === '--id') {
      out.id = argv[i + 1] || out.id;
      i += 1;
      continue;
    }
    if (arg === '--no-upload') {
      out.upload = false;
      continue;
    }
    if (arg === '--bucket') {
      out.bucket = argv[i + 1] || out.bucket;
      i += 1;
      continue;
    }
    if (arg === '--prefix') {
      out.prefix = argv[i + 1] || out.prefix;
      i += 1;
      continue;
    }
    if (arg === '--public-base') {
      out.publicBase = argv[i + 1] || out.publicBase;
      i += 1;
      continue;
    }
    if (arg === '--no-gzip') {
      out.gzip = false;
      continue;
    }
    if (arg === '--upload-retries') {
      const n = Number.parseInt(argv[i + 1] || '', 10);
      if (Number.isFinite(n) && n >= 0) out.uploadRetries = n;
      i += 1;
      continue;
    }
  }

  return out;
}

function timestampId(now = new Date()): string {
  return now.toISOString().replace(/[:.]/g, '-');
}

function parseJsonFromStdout(text: string): BenchmarkPayload {
  const idx = text.indexOf('{');
  if (idx < 0) throw new Error('search benchmark output did not contain JSON payload');
  return JSON.parse(text.slice(idx));
}

async function runBenchmark(options: CliOptions): Promise<BenchmarkPayload> {
  const args = [
    'bun',
    'run',
    'scripts/search-benchmark.ts',
    '--path',
    options.path,
    '--limit',
    String(options.limit),
  ];
  if (options.queries && options.queries.trim().length > 0) {
    args.push('--queries', options.queries);
  }

  const proc = Bun.spawn(args, { stdout: 'pipe', stderr: 'pipe' });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`benchmark failed (${code}): ${stderr || stdout}`);
  }
  return parseJsonFromStdout(stdout);
}

function renderSummaryMarkdown(id: string, createdAt: string, payload: BenchmarkPayload): string {
  const lines: string[] = [];
  lines.push(`# Search Benchmark Snapshot`);
  lines.push('');
  lines.push(`- Snapshot: \`${id}\``);
  lines.push(`- Created: \`${createdAt}\``);
  lines.push(`- Path: \`${payload.path}\``);
  lines.push(`- Limit: \`${payload.limit}\``);
  lines.push(`- Queries: \`${payload.queries.join(', ')}\``);
  lines.push('');
  lines.push(`## Ranked Profiles`);
  lines.push('');
  lines.push(`| Rank | Profile | Quality | Signal% | Unique Family% | Slop% | Duplicate% |`);
  lines.push(`|---:|---|---:|---:|---:|---:|---:|`);

  payload.rankedProfiles.forEach((p, idx) => {
    lines.push(
      `| ${idx + 1} | ${p.profile} | ${p.qualityScore.toFixed(2)} | ${p.avgSignalPct.toFixed(2)} | ${p.avgUniqueFamilyPct.toFixed(2)} | ${p.avgSlopPct.toFixed(2)} | ${p.avgDuplicatePct.toFixed(2)} |`
    );
  });

  return `${lines.join('\n')}\n`;
}

async function readIndex(indexPath: string): Promise<SnapshotIndex> {
  if (!existsSync(indexPath)) {
    return { updatedAt: new Date().toISOString(), snapshots: [] };
  }
  try {
    const raw = await readFile(indexPath, 'utf8');
    const parsed = JSON.parse(raw) as SnapshotIndex;
    if (!Array.isArray(parsed.snapshots)) {
      return { updatedAt: new Date().toISOString(), snapshots: [] };
    }
    return parsed;
  } catch {
    return { updatedAt: new Date().toISOString(), snapshots: [] };
  }
}

function resolveR2Config(options: CliOptions): R2Config | null {
  const accountId = Bun.env.R2_ACCOUNT_ID || '';
  const endpoint =
    Bun.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');
  const bucket = options.bucket || Bun.env.R2_BENCH_BUCKET || Bun.env.R2_BUCKET || Bun.env.R2_BUCKET_NAME || '';
  const accessKeyId = Bun.env.R2_ACCESS_KEY_ID || '';
  const secretAccessKey = Bun.env.R2_SECRET_ACCESS_KEY || '';
  const prefix = options.prefix.replace(/^\/+|\/+$/g, '');
  const publicBase = options.publicBase || Bun.env.SEARCH_BENCH_R2_PUBLIC_BASE;

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }
  return { endpoint, bucket, accessKeyId, secretAccessKey, prefix, publicBase };
}

async function uploadText(r2: R2Config, key: string, data: string, type: string): Promise<void> {
  await S3Client.write(key, data, {
    bucket: r2.bucket,
    endpoint: r2.endpoint,
    accessKeyId: r2.accessKeyId,
    secretAccessKey: r2.secretAccessKey,
    type,
  });
}

async function uploadTextEncoded(
  r2: R2Config,
  key: string,
  data: string | Uint8Array,
  type: string,
  contentEncoding: string
): Promise<void> {
  await S3Client.write(key, data, {
    bucket: r2.bucket,
    endpoint: r2.endpoint,
    accessKeyId: r2.accessKeyId,
    secretAccessKey: r2.secretAccessKey,
    type,
    contentEncoding,
  } as any);
}

async function uploadBytes(
  r2: R2Config,
  key: string,
  data: Uint8Array,
  type: string
): Promise<void> {
  await S3Client.write(key, data, {
    bucket: r2.bucket,
    endpoint: r2.endpoint,
    accessKeyId: r2.accessKeyId,
    secretAccessKey: r2.secretAccessKey,
    type,
  });
}

async function uploadWithRetry(
  fn: () => Promise<void>,
  retries: number
): Promise<{ attempts: number; elapsedMs: number }> {
  let attempt = 0;
  const started = performance.now();
  while (true) {
    attempt += 1;
    try {
      await fn();
      return { attempts: attempt, elapsedMs: Number((performance.now() - started).toFixed(2)) };
    } catch (error) {
      if (attempt > retries) {
        throw error;
      }
      const delayMs = Math.min(5000, 250 * (2 ** (attempt - 1)));
      await Bun.sleep(delayMs);
    }
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const id = options.id || timestampId();
  const createdAt = new Date().toISOString();

  const payload = await runBenchmark(options);
  const summaryMd = renderSummaryMarkdown(id, createdAt, payload);

  const outDir = resolve(options.outputDir);
  const snapshotDir = resolve(outDir, id);
  await mkdir(snapshotDir, { recursive: true });

  const snapshotData = {
    id,
    createdAt,
    ...payload,
  };

  const snapshotJsonPath = resolve(snapshotDir, 'snapshot.json');
  const summaryMdPath = resolve(snapshotDir, 'summary.md');
  const latestJsonPath = resolve(outDir, 'latest.json');
  const latestMdPath = resolve(outDir, 'latest.md');
  const indexPath = resolve(outDir, 'index.json');
  const rssPath = resolve(outDir, 'rss.xml');
  const manifestPath = resolve(snapshotDir, 'publish-manifest.json');

  const snapshotJsonText = JSON.stringify(snapshotData, null, 2);
  await writeFile(snapshotJsonPath, snapshotJsonText);
  await writeFile(summaryMdPath, summaryMd);
  await writeFile(latestJsonPath, snapshotJsonText);
  await writeFile(latestMdPath, summaryMd);

  const index = await readIndex(indexPath);
  const top = payload.rankedProfiles[0];
  const nextEntry: SnapshotIndexEntry = {
    id,
    createdAt,
    topProfile: top?.profile || 'n/a',
    topScore: top?.qualityScore || 0,
    localJson: snapshotJsonPath,
    localMd: summaryMdPath,
  };
  const snapshots = [nextEntry, ...index.snapshots.filter(s => s.id !== id)].slice(0, 100);
  const nextIndex: SnapshotIndex = {
    updatedAt: createdAt,
    snapshots,
  };
  await writeFile(indexPath, JSON.stringify(nextIndex, null, 2));
  const localRssText = buildRssFeed(nextIndex, {
    prefix: options.prefix.replace(/^\/+|\/+$/g, ''),
  });
  await writeFile(rssPath, localRssText);

  console.log(`[search-bench:snapshot] wrote ${snapshotJsonPath}`);
  console.log(`[search-bench:snapshot] wrote ${summaryMdPath}`);
  console.log(`[search-bench:snapshot] wrote ${latestJsonPath}`);
  console.log(`[search-bench:snapshot] wrote ${indexPath}`);
  console.log(`[search-bench:snapshot] wrote ${rssPath}`);

  if (!options.upload) {
    console.log('[search-bench:snapshot] upload disabled (--no-upload)');
    return;
  }

  const r2 = resolveR2Config(options);
  if (!r2) {
    console.log('[search-bench:snapshot] R2 config missing; skipped upload');
    console.log('[search-bench:snapshot] required: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET_NAME (or R2_BUCKET), plus R2_ACCOUNT_ID or R2_ENDPOINT');
    return;
  }

  const base = `${r2.prefix}/${id}`;
  const snapshotKey = `${base}/snapshot.json`;
  const summaryKey = `${base}/summary.md`;
  const latestJsonKey = `${r2.prefix}/latest.json`;
  const latestMdKey = `${r2.prefix}/latest.md`;
  const indexKey = `${r2.prefix}/index.json`;
  const manifestKey = `${base}/publish-manifest.json`;
  const rssKey = `${r2.prefix}/rss.xml`;

  const encoder = new TextEncoder();
  const snapshotJsonGz = Bun.gzipSync(encoder.encode(snapshotJsonText));
  const summaryMdGz = Bun.gzipSync(encoder.encode(summaryMd));

  type UploadStat = { key: string; attempts: number; elapsedMs: number };
  const uploadStats: UploadStat[] = [];

  const pushStat = (key: string, stat: { attempts: number; elapsedMs: number }): void => {
    uploadStats.push({ key, attempts: stat.attempts, elapsedMs: stat.elapsedMs });
  };

  const uploadJobs: Array<Promise<void>> = [
    (async () => {
      const stat = await uploadWithRetry(
        () => uploadBytes(r2, snapshotKey, encoder.encode(snapshotJsonText), 'application/json'),
        options.uploadRetries
      );
      pushStat(snapshotKey, stat);
    })(),
    (async () => {
      const stat = await uploadWithRetry(
        () => uploadText(r2, summaryKey, summaryMd, 'text/markdown'),
        options.uploadRetries
      );
      pushStat(summaryKey, stat);
    })(),
    (async () => {
      const stat = await uploadWithRetry(
        () => uploadText(r2, latestJsonKey, snapshotJsonText, 'application/json'),
        options.uploadRetries
      );
      pushStat(latestJsonKey, stat);
    })(),
    (async () => {
      const stat = await uploadWithRetry(
        () => uploadText(r2, latestMdKey, summaryMd, 'text/markdown'),
        options.uploadRetries
      );
      pushStat(latestMdKey, stat);
    })(),
  ];

  if (options.gzip) {
    uploadJobs.push(
      (async () => {
        const key = `${snapshotKey}.gz`;
        const stat = await uploadWithRetry(
          () => uploadTextEncoded(r2, key, snapshotJsonGz, 'application/json', 'gzip'),
          options.uploadRetries
        );
        pushStat(key, stat);
      })(),
      (async () => {
        const key = `${summaryKey}.gz`;
        const stat = await uploadWithRetry(
          () => uploadTextEncoded(r2, key, summaryMdGz, 'text/markdown', 'gzip'),
          options.uploadRetries
        );
        pushStat(key, stat);
      })(),
      (async () => {
        const key = `${latestJsonKey}.gz`;
        const stat = await uploadWithRetry(
          () => uploadTextEncoded(r2, key, snapshotJsonGz, 'application/json', 'gzip'),
          options.uploadRetries
        );
        pushStat(key, stat);
      })(),
      (async () => {
        const key = `${latestMdKey}.gz`;
        const stat = await uploadWithRetry(
          () => uploadTextEncoded(r2, key, summaryMdGz, 'text/markdown', 'gzip'),
          options.uploadRetries
        );
        pushStat(key, stat);
      })()
    );
  }

  await Promise.all(uploadJobs);

  const indexWithR2: SnapshotIndex = {
    ...nextIndex,
    snapshots: nextIndex.snapshots.map(s =>
      s.id === id
        ? {
            ...s,
            r2JsonKey: snapshotKey,
            r2MdKey: summaryKey,
            r2ManifestKey: manifestKey,
          }
        : s
    ),
  };
  const indexJsonText = JSON.stringify(indexWithR2, null, 2);
  const rssText = buildRssFeed(indexWithR2, {
    bucket: r2.bucket,
    prefix: r2.prefix,
    publicBase: r2.publicBase,
  });
  const indexStat = await uploadWithRetry(
    () => uploadText(r2, indexKey, indexJsonText, 'application/json'),
    options.uploadRetries
  );
  pushStat(indexKey, indexStat);
  await writeFile(rssPath, rssText);
  const rssStat = await uploadWithRetry(
    () => uploadText(r2, rssKey, rssText, 'application/rss+xml'),
    options.uploadRetries
  );
  pushStat(rssKey, rssStat);
  if (options.gzip) {
    const key = `${indexKey}.gz`;
    const stat = await uploadWithRetry(
      () => uploadTextEncoded(r2, key, Bun.gzipSync(encoder.encode(indexJsonText)), 'application/json', 'gzip'),
      options.uploadRetries
    );
    pushStat(key, stat);
    const rssGzKey = `${rssKey}.gz`;
    const rssGzStat = await uploadWithRetry(
      () => uploadTextEncoded(r2, rssGzKey, Bun.gzipSync(encoder.encode(rssText)), 'application/rss+xml', 'gzip'),
      options.uploadRetries
    );
    pushStat(rssGzKey, rssGzStat);
  }
  await writeFile(indexPath, JSON.stringify(indexWithR2, null, 2));

  const manifest = {
    id,
    createdAt,
    bucket: r2.bucket,
    prefix: r2.prefix,
    gzip: options.gzip,
    uploadRetries: options.uploadRetries,
    uploadedObjects: uploadStats.length,
    uploads: uploadStats.sort((a, b) => a.key.localeCompare(b.key)),
    rssKey,
  };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`[search-bench:snapshot] wrote ${manifestPath}`);

  const manifestText = JSON.stringify(manifest, null, 2);
  const manifestStat = await uploadWithRetry(
    () => uploadText(r2, manifestKey, manifestText, 'application/json'),
    options.uploadRetries
  );
  pushStat(manifestKey, manifestStat);
  if (options.gzip) {
    const key = `${manifestKey}.gz`;
    const stat = await uploadWithRetry(
      () => uploadTextEncoded(r2, key, Bun.gzipSync(encoder.encode(manifestText)), 'application/json', 'gzip'),
      options.uploadRetries
    );
    pushStat(key, stat);
  }

  if (r2.publicBase) {
    const pub = r2.publicBase.replace(/\/+$/g, '');
    console.log(`[search-bench:snapshot] uploaded ${pub}/${id}/snapshot.json`);
    console.log(`[search-bench:snapshot] uploaded ${pub}/${id}/summary.md`);
    console.log(`[search-bench:snapshot] latest ${pub}/latest.json`);
    console.log(`[search-bench:snapshot] index ${pub}/index.json`);
  } else {
    console.log(`[search-bench:snapshot] uploaded bucket=${r2.bucket}`);
    console.log(`[search-bench:snapshot] snapshot key=${snapshotKey}`);
    console.log(`[search-bench:snapshot] summary key=${summaryKey}`);
    console.log(`[search-bench:snapshot] latest key=${latestJsonKey}`);
    console.log(`[search-bench:snapshot] index key=${indexKey}`);
    if (options.gzip) {
      console.log(`[search-bench:snapshot] gzip variants enabled (.gz)`);
    }
  }
}

await main();
