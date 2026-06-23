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

const DEFAULT_DOMAIN = 'docs.factory-wager.com';
const PUBLIC_DIR = resolve('public');
const SITEMAP_INDEX_PATH = resolve(PUBLIC_DIR, 'sitemap.xml');
const SITEMAP_PAGES_PATH = resolve(PUBLIC_DIR, 'sitemap-pages.xml');

const DASHBOARDS = 'public/dashboards';

const PAGES: SitemapPage[] = [
  {
    path: '/dashboards/dns-status-dashboard.html',
    localFile: `${DASHBOARDS}/dns-status-dashboard.html`,
    changefreq: 'daily',
    priority: '1.0',
  },
  {
    path: '/dashboards/wiki-index.html',
    localFile: `${DASHBOARDS}/wiki-index.html`,
    changefreq: 'daily',
    priority: '0.9',
  },
  {
    path: '/dashboards/app-index.html',
    localFile: `${DASHBOARDS}/app-index.html`,
    changefreq: 'weekly',
    priority: '0.7',
  },
  {
    path: '/dashboards/api-index.html',
    localFile: `${DASHBOARDS}/api-index.html`,
    changefreq: 'weekly',
    priority: '0.7',
  },
  {
    path: '/dashboards/dashboard-index.html',
    localFile: `${DASHBOARDS}/dashboard-index.html`,
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    path: '/dashboards/registry-index.html',
    localFile: `${DASHBOARDS}/registry-index.html`,
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    path: '/dashboards/rss-index.html',
    localFile: `${DASHBOARDS}/rss-index.html`,
    changefreq: 'daily',
    priority: '0.6',
  },
  {
    path: '/dashboards/admin-index.html',
    localFile: `${DASHBOARDS}/admin-index.html`,
    changefreq: 'weekly',
    priority: '0.5',
  },
  {
    path: '/dashboards/storage-index.html',
    localFile: `${DASHBOARDS}/storage-index.html`,
    changefreq: 'weekly',
    priority: '0.5',
  },
  {
    path: '/dashboards/staging-index.html',
    localFile: `${DASHBOARDS}/staging-index.html`,
    changefreq: 'weekly',
    priority: '0.4',
  },
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
  const envDomain = String(Bun.env.SITEMAP_DOMAIN || '')
    .trim()
    .toLowerCase();
  if (envDomain) return envDomain;

  const cnamePath = resolve('CNAME');
  if (existsSync(cnamePath)) {
    const cname = String(await readFile(cnamePath, 'utf8'))
      .trim()
      .toLowerCase();
    if (cname) return cname;
  }
  return DEFAULT_DOMAIN;
}

async function gitLastmod(filePath: string): Promise<string> {
  const rel = filePath.replace(`${process.cwd()}/`, '');
  const proc = Bun.spawn(['git', 'log', '-1', '--format=%cI', '--', rel], {
    cwd: process.cwd(),
    stdout: 'pipe',
    stderr: 'ignore',
  });
  const out = new TextDecoder().decode(await new Response(proc.stdout).arrayBuffer()).trim();
  const exitCode = await proc.exited;
  if (exitCode === 0 && out) return out;
  return new Date().toISOString();
}

async function buildSitemapPagesXml(domain: string): Promise<string> {
  const rows = await Promise.all(
    PAGES.map(async page => {
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

  console.info(`[sitemap-refresh] domain=${domain}`);
  console.info(`[sitemap-refresh] wrote ${SITEMAP_PAGES_PATH}`);
  console.info(`[sitemap-refresh] wrote ${SITEMAP_INDEX_PATH}`);
}

if (import.meta.main) {
  main().catch(error => {
    console.error(`[sitemap-refresh] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
