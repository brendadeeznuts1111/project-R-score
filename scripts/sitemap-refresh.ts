#!/usr/bin/env bun

import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type SitemapPage = {
  path: string;
  localFile: string;
  changefreq: 'daily' | 'weekly' | 'monthly';
  priority: string;
};

const DEFAULT_DOMAIN = 'wiki.factory-wager.com';
const PUBLIC_DIR = resolve('public');
const SITEMAP_INDEX_PATH = resolve(PUBLIC_DIR, 'sitemap.xml');
const SITEMAP_PAGES_PATH = resolve(PUBLIC_DIR, 'sitemap-pages.xml');

const PAGES: SitemapPage[] = [
  { path: '/', localFile: 'index.html', changefreq: 'daily', priority: '1.0' },
  { path: '/wiki-index.html', localFile: 'wiki-index.html', changefreq: 'daily', priority: '0.9' },
  { path: '/app-index.html', localFile: 'app-index.html', changefreq: 'weekly', priority: '0.7' },
  { path: '/api-index.html', localFile: 'api-index.html', changefreq: 'weekly', priority: '0.7' },
  { path: '/dashboard-index.html', localFile: 'dashboard-index.html', changefreq: 'weekly', priority: '0.8' },
  { path: '/registry-index.html', localFile: 'registry-index.html', changefreq: 'weekly', priority: '0.8' },
  { path: '/rss-index.html', localFile: 'rss-index.html', changefreq: 'daily', priority: '0.6' },
  { path: '/admin-index.html', localFile: 'admin-index.html', changefreq: 'weekly', priority: '0.5' },
  { path: '/storage-index.html', localFile: 'storage-index.html', changefreq: 'weekly', priority: '0.5' },
  { path: '/staging-index.html', localFile: 'staging-index.html', changefreq: 'weekly', priority: '0.4' },
];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function detectDomain(): Promise<string> {
  const envDomain = String(Bun.env.SITEMAP_DOMAIN || '').trim().toLowerCase();
  if (envDomain) return envDomain;

  const cnamePath = resolve('CNAME');
  if (existsSync(cnamePath)) {
    const cname = String(await readFile(cnamePath, 'utf8')).trim().toLowerCase();
    if (cname) return cname;
  }
  return DEFAULT_DOMAIN;
}

async function gitLastmod(filePath: string): Promise<string> {
  const rel = filePath.replace(`${process.cwd()}/`, '');
  const proc = Bun.spawnSync(['git', 'log', '-1', '--format=%cI', '--', rel], {
    cwd: process.cwd(),
    stdout: 'pipe',
    stderr: 'ignore',
  });
  const out = new TextDecoder().decode(proc.stdout || new Uint8Array()).trim();
  if (proc.exitCode === 0 && out) return out;
  return new Date().toISOString();
}

async function buildSitemapPagesXml(domain: string): Promise<string> {
  const rows = await Promise.all(
    PAGES.map(async (page) => {
      const local = resolve(page.localFile);
      const lastmod = existsSync(local) ? await gitLastmod(local) : new Date().toISOString();
      const loc = `https://${domain}${page.path}`;
      return [
        '  <url>',
        `    <loc>${escapeXml(loc)}</loc>`,
        `    <lastmod>${escapeXml(lastmod)}</lastmod>`,
        `    <changefreq>${page.changefreq}</changefreq>`,
        `    <priority>${page.priority}</priority>`,
        '  </url>',
      ].join('\n');
    })
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    rows.join('\n'),
    '</urlset>',
    '',
  ].join('\n');
}

async function buildSitemapIndexXml(domain: string): Promise<string> {
  const lastmod = await gitLastmod(SITEMAP_PAGES_PATH);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <sitemap>',
    `    <loc>https://${escapeXml(domain)}/sitemap-pages.xml</loc>`,
    `    <lastmod>${escapeXml(lastmod)}</lastmod>`,
    '  </sitemap>',
    '</sitemapindex>',
    '',
  ].join('\n');
}

async function main(): Promise<void> {
  const domain = await detectDomain();
  const pagesXml = await buildSitemapPagesXml(domain);
  await writeFile(SITEMAP_PAGES_PATH, pagesXml, 'utf8');

  const indexXml = await buildSitemapIndexXml(domain);
  await writeFile(SITEMAP_INDEX_PATH, indexXml, 'utf8');

  console.log(`[sitemap-refresh] domain=${domain}`);
  console.log(`[sitemap-refresh] wrote ${SITEMAP_PAGES_PATH}`);
  console.log(`[sitemap-refresh] wrote ${SITEMAP_INDEX_PATH}`);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(`[sitemap-refresh] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
