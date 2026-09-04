#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @updated Bun.argv · changed v0.6.10 · 2023-06-26 · https://bun.com/blog/bun-v0.6.10
// @verified Bun.argv · Bun v1.4.0 · 2026-08-18 · https://bun.com/reference/bun/argv
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
// @verified Bun.file · Bun v1.4.0 · 2026-08-18 · https://bun.com/docs/runtime/file-io
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @updated Bun.Glob · fixed v1.0.27 · 2024-02-17 · https://bun.com/blog/bun-v1.0.27
// @updated Bun.Glob · fixed v1.0.28 · 2024-02-19 · https://bun.com/blog/bun-v1.0.28
// @updated Bun.Glob · fixed v1.0.29 · 2024-02-23 · https://bun.com/blog/bun-v1.0.29
// @updated Bun.Glob · fixed v1.0.30 · 2024-03-04 · https://bun.com/blog/bun-v1.0.30
// @updated Bun.Glob · fixed v1.1.5 · 2024-04-26 · https://bun.com/blog/bun-v1.1.5
// @updated Bun.Glob · changed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.Glob · fixed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.Glob · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.Glob · fixed v1.3.7 · 2026-01-27 · https://bun.com/blog/bun-v1.3.7
// @updated Bun.Glob · changed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @updated Bun.Glob · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified Bun.Glob · Bun v1.4.0 · 2026-08-18 · https://bun.com/docs/runtime/glob#quickstart
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
// @verified Bun.write · Bun v1.4.0 · 2026-08-18 · https://bun.com/docs/runtime/file-io#writing-files-bun-write
import {
  buildProjectRSSChannelRegistry,
  parseProjectRSSChannelRegistry,
  projectRSSAliasRedirects,
  type ProjectRSSChannelRegistry,
} from '../lib/rss/project-channel-registry.ts';
import { discoverProjectLeaves } from './projects-root-check.ts';

export const PROJECT_RSS_REGISTRY_PATH = 'public/registry/project-rss-channels.json';
export const PAGES_REDIRECTS_PATH = 'public/_redirects';
export const PAGES_HEADERS_PATH = 'public/_headers';

function serializedRegistry(value: ProjectRSSChannelRegistry): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function verifyPagesRedirects(): Promise<void> {
  const redirects = await Bun.file(PAGES_REDIRECTS_PATH).text();
  const expected = [...projectRSSAliasRedirects()].map(
    ([alias, canonical]) => `${alias} ${canonical} 301`
  );
  const actual = redirects
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('/feeds/v1/projects/'))
    .map(line => line.split(/\s+/).join(' '));
  if (actual.join('\0') !== expected.join('\0')) {
    throw new Error(`Project RSS aliases in ${PAGES_REDIRECTS_PATH} do not match the registry`);
  }
  // unregistered-no-fallback contract: unknown /feeds/v1/* paths must 404
  // (a mistyped feed URL must never serve SPA HTML labeled application/rss+xml).
  if (!/\/feeds\/v1\/\*\s+\/404\.html\s+404/.test(redirects)) {
    throw new Error(
      `feed 404 catch missing in ${PAGES_REDIRECTS_PATH} — add '/feeds/v1/*  /404.html  404'`
    );
  }
  if (!(await Bun.file('public/404.html').exists())) {
    throw new Error(
      'public/404.html missing — the feed 404 catch must resolve to a committed page'
    );
  }
}

async function verifyPagesHeaders(): Promise<void> {
  const lines = (await Bun.file(PAGES_HEADERS_PATH).text()).replaceAll('\r\n', '\n').split('\n');
  const blockStarts = lines
    .map((line, index) => (line.trim() === '/feeds/v1/projects/*' ? index : -1))
    .filter(index => index >= 0);
  if (blockStarts.length !== 1) {
    throw new Error(`Project RSS header policy must occur once in ${PAGES_HEADERS_PATH}`);
  }
  const start = blockStarts[0]!;
  const block = lines.slice(start, start + 3).map(line => line.trim());
  const expected = [
    '/feeds/v1/projects/*',
    'Access-Control-Allow-Origin: *',
    'Cache-Control: public, max-age=60, must-revalidate',
  ];
  if (block.join('\0') !== expected.join('\0')) {
    throw new Error(`Project RSS header policy is invalid in ${PAGES_HEADERS_PATH}`);
  }
}

async function verifyNoDuplicateFeedFiles(): Promise<void> {
  const duplicates = await Array.fromAsync(
    new Bun.Glob('projects/**/*.xml').scan({ cwd: 'public/feeds/v1', onlyFiles: true })
  );
  if (duplicates.length > 0) {
    throw new Error(`Project RSS aliases must not duplicate XML files: ${duplicates.join(', ')}`);
  }
}

export async function syncProjectRSSChannelRegistry(check: boolean): Promise<void> {
  const discovered = await discoverProjectLeaves();
  if (discovered.issues.length > 0) {
    throw new Error(`Project discovery has ${discovered.issues.length} structural issue(s)`);
  }
  const active = discovered.leaves.filter(
    (leaf): leaf is { tier: 'active'; path: string } => leaf.tier === 'active'
  );
  const expected = serializedRegistry(buildProjectRSSChannelRegistry(active));
  await Promise.all([verifyPagesRedirects(), verifyPagesHeaders(), verifyNoDuplicateFeedFiles()]);
  if (check) {
    const output = Bun.file(PROJECT_RSS_REGISTRY_PATH);
    if (!(await output.exists())) {
      throw new Error(`Project RSS channel registry missing: ${PROJECT_RSS_REGISTRY_PATH}`);
    }
    const actualText = await output.text();
    parseProjectRSSChannelRegistry(JSON.parse(actualText));
    if (actualText !== expected) {
      throw new Error(`Project RSS channel registry drift: ${PROJECT_RSS_REGISTRY_PATH}`);
    }
    return;
  }
  await Bun.write(PROJECT_RSS_REGISTRY_PATH, expected);
}

async function main(): Promise<void> {
  const args = new Set(Bun.argv.slice(2));
  if (args.has('--help') || args.has('-h')) {
    console.info('Usage: bun tools/project-rss-channels.ts [--check]');
    return;
  }
  for (const arg of args) {
    if (arg !== '--check') throw new Error(`unknown option: ${arg}`);
  }
  const check = args.has('--check');
  await syncProjectRSSChannelRegistry(check);
  console.info(
    `project RSS channels: ${check ? 'verified' : 'wrote'} ${PROJECT_RSS_REGISTRY_PATH}`
  );
}

if (import.meta.main) {
  await main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
