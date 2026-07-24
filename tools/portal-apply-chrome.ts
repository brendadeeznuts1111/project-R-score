#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * One-shot: inject brand font links + trimmed topbar nav into portal HTML shells.
 * Idempotent — safe to re-run.
 *
 *   bun tools/portal-apply-chrome.ts
 */
import { joinPath } from '../lib/path-bun.ts';

const PORTAL = joinPath(import.meta.dir, '../public/portal');

const FONT_BLOCK = `<link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  `;

type PageKey =
  | 'home'
  | 'registry'
  | 'ops'
  | 'catalog'
  | 'dod'
  | 'health'
  | 'env'
  | 'dashboard'
  | 'skills'
  | 'template';

const PAGES: { file: string; active: PageKey; pageLabel: string; brandBadge?: string }[] = [
  { file: 'index.html', active: 'registry', pageLabel: 'Registry', brandBadge: 'ops' },
  { file: 'ops/index.html', active: 'ops', pageLabel: 'Ops', brandBadge: 'ops' },
  { file: 'catalog/index.html', active: 'catalog', pageLabel: 'Catalog', brandBadge: 'ops' },
  { file: 'dod/index.html', active: 'dod', pageLabel: 'DOD', brandBadge: 'ops' },
  { file: 'health/index.html', active: 'health', pageLabel: 'Health', brandBadge: 'ops' },
  { file: 'env/index.html', active: 'env', pageLabel: 'Env', brandBadge: 'ops' },
  { file: 'dashboard/index.html', active: 'dashboard', pageLabel: 'Dashboard', brandBadge: 'ops' },
  { file: 'skills/index.html', active: 'skills', pageLabel: 'Skills', brandBadge: 'ops' },
  { file: '_page-template.html', active: 'template', pageLabel: 'New Page', brandBadge: 'ops' },
];

function cls(active: PageKey, key: PageKey): string {
  return active === key ? 'nav-link active' : 'nav-link';
}

function renderNav(active: PageKey): string {
  return `<nav class="topbar-nav" aria-label="Primary">
        <a href="/" class="${cls(active, 'home')}">Home</a>
        <a href="/portal/ops" class="${cls(active, 'ops')}">Ops</a>
        <a href="/portal/" class="${cls(active, 'registry')}">Registry</a>
        <a href="/portal/health" class="${cls(active, 'health')}">Health</a>
        <a href="/portal/dod" class="${cls(active, 'dod')}">DOD</a>
        <div class="nav-overflow">
          <button type="button" class="nav-more" aria-label="More navigation" aria-expanded="false" aria-haspopup="true">⋯</button>
          <div class="nav-dropdown" role="menu">
            <a href="/portal/catalog" class="${cls(active, 'catalog')}" role="menuitem">Catalog</a>
            <a href="/portal/skills" class="${cls(active, 'skills')}" role="menuitem">Skills</a>
            <a href="/portal/env" class="${cls(active, 'env')}" role="menuitem">Env</a>
            <a href="/portal/dashboard" class="${cls(active, 'dashboard')}" role="menuitem">Dashboard</a>
            <a href="/monitoring" class="nav-link" role="menuitem">Monitoring</a>
            <a href="https://wiki.factory-wager.com" class="nav-link" target="_blank" rel="noopener noreferrer" role="menuitem">Wiki</a>
          </div>
        </div>
      </nav>`;
}

function renderLogo(pageLabel: string, brandBadge?: string): string {
  const badge = brandBadge ? `\n        <span class="brand-badge">${brandBadge}</span>` : '';
  return `<h1 class="logo">
        <span class="logo-icon">■</span>
        <span class="brand-wordmark">FactoryWager</span>${badge}
        <span class="logo-page">${pageLabel}</span>
      </h1>`;
}

const NAV_RE = /<nav class="topbar-nav"[^>]*>[\s\S]*?<\/nav>/;
const LOGO_RE = /<h1 class="logo">[\s\S]*?<\/h1>/;

async function patchFile(entry: (typeof PAGES)[number]): Promise<void> {
  const path = joinPath(PORTAL, entry.file);
  let html = await Bun.file(path).text();
  let changed = false;

  if (!html.includes('fonts.googleapis.com')) {
    if (html.includes('<link rel="stylesheet" href="/portal/style.css" />')) {
      html = html.replace(
        '<link rel="stylesheet" href="/portal/style.css" />',
        `${FONT_BLOCK}<link rel="stylesheet" href="/portal/style.css" />`
      );
      changed = true;
    } else if (html.includes('<link rel="stylesheet" href="style.css" />')) {
      html = html.replace(
        '<link rel="stylesheet" href="style.css" />',
        `${FONT_BLOCK}<link rel="stylesheet" href="style.css" />`
      );
      changed = true;
    }
  }

  if (NAV_RE.test(html)) {
    const next = renderNav(entry.active);
    const prev = html.match(NAV_RE)?.[0] ?? '';
    if (prev !== next) {
      html = html.replace(NAV_RE, next);
      changed = true;
    }
  }

  if (LOGO_RE.test(html)) {
    const next = renderLogo(entry.pageLabel, entry.brandBadge);
    const prev = html.match(LOGO_RE)?.[0] ?? '';
    if (prev !== next) {
      html = html.replace(LOGO_RE, next);
      changed = true;
    }
  }

  if (changed) {
    await Bun.write(path, html);
    console.log(`updated ${entry.file}`);
  } else {
    console.log(`ok ${entry.file}`);
  }
}

for (const page of PAGES) {
  await patchFile(page);
}
