#!/usr/bin/env bun

// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
// @see https://bun.com/docs/pm/cli/update#latest — --latest
// @see https://bun.com/docs/runtime/file-io — Bun.file
import { jsonOut } from '../lib/console-depth';
import { fileExists, readJson, readText, resolvePath } from './lib/fs-bun';
import { normalizeWarningCode } from './lib/search-status-contract';

type ContractInput = {
  latestJsonPath: string;
  loopStatusPath: string;
  rssPath: string;
};

type ContractResult = {
  ok: boolean;
  checks: Array<{
    id: string;
    ok: boolean;
    detail: string;
    status?: 'ok' | 'fail';
  }>;
  summary: {
    latestId: string | null;
    loopStatusSnapshotId: string | null;
    rssFirstGuid: string | null;
  };
};

function parseFirstRssGuid(xml: string): string | null {
  const match = xml.match(/<guid[^>]*>([^<]+)<\/guid>/i);
  if (match && match[1]) return match[1].trim();
  const linkMatch = xml.match(/<item>[\s\S]*?<link>([^<]+)<\/link>/i);
  if (linkMatch && linkMatch[1]) return linkMatch[1].trim();
  return null;
}

export async function runSearchStatusContract(input: ContractInput): Promise<ContractResult> {
  const checks: ContractResult['checks'] = [];
  const latestPath = resolvePath(input.latestJsonPath);
  const loopPath = resolvePath(input.loopStatusPath);
  const rssPath = resolvePath(input.rssPath);

  if (!(await fileExists(latestPath))) {
    checks.push({
      id: 'latest_exists',
      ok: false,
      detail: `missing ${latestPath}`,
      status: 'fail',
    });
  } else {
    checks.push({ id: 'latest_exists', ok: true, detail: latestPath, status: 'ok' });
  }
  if (!(await fileExists(loopPath))) {
    checks.push({ id: 'loop_exists', ok: false, detail: `missing ${loopPath}`, status: 'fail' });
  } else {
    checks.push({ id: 'loop_exists', ok: true, detail: loopPath, status: 'ok' });
  }
  if (!(await fileExists(rssPath))) {
    checks.push({ id: 'rss_exists', ok: false, detail: `missing ${rssPath}`, status: 'fail' });
  } else {
    checks.push({ id: 'rss_exists', ok: true, detail: rssPath, status: 'ok' });
  }
  if (checks.some(c => !c.ok)) {
    return {
      ok: false,
      checks,
      summary: { latestId: null, loopStatusSnapshotId: null, rssFirstGuid: null },
    };
  }

  const latest = await readJson<Record<string, any>>(latestPath);
  const loop = await readJson<Record<string, any>>(loopPath);
  const rssXml = await readText(rssPath);

  const latestId = latest?.id ? String(latest.id) : null;
  const loopStatusSnapshotId = loop?.latestSnapshotId ? String(loop.latestSnapshotId) : null;
  const rssFirstGuid = parseFirstRssGuid(rssXml);

  checks.push({
    id: 'latest_loop_id_alignment',
    ok: Boolean(latestId && loopStatusSnapshotId && latestId === loopStatusSnapshotId),
    detail: `latest=${latestId || 'n/a'} loop=${loopStatusSnapshotId || 'n/a'}`,
    status: latestId && loopStatusSnapshotId && latestId === loopStatusSnapshotId ? 'ok' : 'fail',
  });

  const latestWarnings = Array.isArray(latest?.warnings)
    ? [...latest.warnings].map(code => normalizeWarningCode(code)).sort()
    : [];
  const loopWarnings = Array.isArray(loop?.warnings)
    ? [...loop.warnings].map(code => normalizeWarningCode(code)).sort()
    : [];
  checks.push({
    id: 'latest_loop_warning_alignment',
    ok: Bun.deepEquals(latestWarnings, loopWarnings),
    detail: `latest=[${latestWarnings.join(',')}] loop=[${loopWarnings.join(',')}]`,
    status: Bun.deepEquals(latestWarnings, loopWarnings) ? 'ok' : 'fail',
  });

  const latestCoverageLines = Number(latest?.coverage?.lines || 0);
  const loopCoverageLines = Number(loop?.coverage?.lines || 0);
  checks.push({
    id: 'latest_loop_coverage_alignment',
    ok: latestCoverageLines > 0 && latestCoverageLines === loopCoverageLines,
    detail: `latest=${latestCoverageLines} loop=${loopCoverageLines}`,
    status: latestCoverageLines > 0 && latestCoverageLines === loopCoverageLines ? 'ok' : 'fail',
  });

  checks.push({
    id: 'rss_latest_guid_alignment',
    ok: Boolean(latestId && rssFirstGuid && latestId === rssFirstGuid),
    detail: `latest=${latestId || 'n/a'} rssGuid=${rssFirstGuid || 'n/a'}`,
    status: latestId && rssFirstGuid && latestId === rssFirstGuid ? 'ok' : 'fail',
  });

  const ok = checks.every(c => c.ok);
  return {
    ok,
    checks,
    summary: {
      latestId,
      loopStatusSnapshotId,
      rssFirstGuid,
    },
  };
}

function parseArgs(argv: string[]): ContractInput {
  const out: ContractInput = {
    latestJsonPath: 'reports/search-benchmark/latest.json',
    loopStatusPath: 'reports/search-loop-status-latest.json',
    rssPath: 'reports/search-benchmark/rss.xml',
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--latest') {
      out.latestJsonPath = argv[i + 1] || out.latestJsonPath;
      i += 1;
      continue;
    }
    if (arg === '--loop') {
      out.loopStatusPath = argv[i + 1] || out.loopStatusPath;
      i += 1;
      continue;
    }
    if (arg === '--rss') {
      out.rssPath = argv[i + 1] || out.rssPath;
      i += 1;
      continue;
    }
  }
  return out;
}

if (import.meta.main) {
  const input = parseArgs(Bun.argv.slice(2));
  const result = await runSearchStatusContract(input);
  jsonOut(result);
  process.exit(result.ok ? 0 : 1);
}
