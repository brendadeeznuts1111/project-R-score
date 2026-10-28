// eslint-disable-next-line no-restricted-imports -- Bun 1.3 lacks atomic rename and exclusive mkdir APIs.
import { mkdir, rename, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { utf8TextDigests } from './canonical-json.ts';
import {
  renderQualityReportHtml,
  renderQualityReportJson,
  renderQualityReportMarkdown,
  type QualityReport,
} from './report.ts';

export type QualityReportPaths = {
  historyDirectory: string;
  latestDirectory: string;
  historyHtml: string;
  latestHtml: string;
};

const SAFE_SEGMENT_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/;

async function atomicWrite(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}-${crypto.randomUUID()}`;
  try {
    await Bun.write(temporary, content);
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
}

async function withReportLock<T>(root: string, operation: () => Promise<T>): Promise<T> {
  const lock = join(root, '.quality-report.lock');
  await mkdir(root, { recursive: true });
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      await mkdir(lock);
      try {
        return await operation();
      } finally {
        await rm(lock, { recursive: true, force: true });
      }
    } catch (error) {
      if ((error as { code?: string }).code !== 'EEXIST') throw error;
      await Bun.sleep(25);
    }
  }
  throw new Error(`timed out acquiring quality report lock: ${lock}`);
}

function assertContained(root: string, target: string): void {
  const normalizedRoot = `${resolve(root)}/`;
  const normalizedTarget = resolve(target);
  if (!`${normalizedTarget}/`.startsWith(normalizedRoot)) {
    throw new TypeError(`quality report path escapes root: ${normalizedTarget}`);
  }
}

export async function writeQualityReport(
  report: QualityReport,
  rootDirectory: string
): Promise<QualityReportPaths> {
  if (!rootDirectory.trim()) throw new TypeError('quality report root must be non-empty');
  if (!SAFE_SEGMENT_RE.test(report.runId) || !SAFE_SEGMENT_RE.test(report.scope)) {
    throw new TypeError('quality report contains an unsafe run or scope id');
  }
  const date = report.generatedAt.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new TypeError('invalid report date');
  const root = resolve(rootDirectory);
  const historyDirectory = join(root, date, report.runId);
  const latestDirectory = join(root, 'latest');
  assertContained(root, historyDirectory);
  assertContained(root, latestDirectory);

  const json = renderQualityReportJson(report);
  const markdown = renderQualityReportMarkdown(report);
  const html = renderQualityReportHtml(report);
  const artifactManifest = {
    schemaVersion: 1,
    runId: report.runId,
    scope: report.scope,
    generatedAt: report.generatedAt,
    reportIntegrity: report.integrity,
    artifacts: {
      json: utf8TextDigests(json),
      markdown: utf8TextDigests(markdown),
      html: utf8TextDigests(html),
    },
  };
  const files = new Map([
    ['index.html', html],
    ['report.json', json],
    ['report.md', markdown],
    ['manifest.json', `${JSON.stringify(artifactManifest, null, 2)}\n`],
  ]);

  await withReportLock(root, async () => {
    for (const directory of [historyDirectory, latestDirectory]) {
      for (const [name, content] of files) {
        await atomicWrite(join(directory, name), content);
      }
    }
  });

  return {
    historyDirectory,
    latestDirectory,
    historyHtml: join(historyDirectory, 'index.html'),
    latestHtml: join(latestDirectory, 'index.html'),
  };
}
