#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Inject brand fonts + topbar nav + shared footer into portal HTML shells.
 * Uses lib/portal/chrome-catalog.ts SSOT. Idempotent.
 *
 *   bun tools/portal-apply-chrome.ts
 *   bun tools/portal-apply-chrome.ts --only=glossary
 *   bun run portal:chrome:bake && bun tools/portal-apply-chrome.ts
 */
import { joinPath } from '../lib/path-bun.ts';
import { PORTAL_WIKI_DROPDOWN_HREF } from '../lib/http/wiki-nav.ts';
import {
  renderFooterHtml,
  renderPriorityNavHtml,
  type PortalChromeNavItem,
} from '../lib/portal/chrome-catalog.ts';

const PORTAL = joinPath(import.meta.dir, '../public/portal');

const FONT_BLOCK = `<link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  `;

const BRAND_HEAD_LINES = [
  '<meta name="theme-color" content="#0d1117" />',
  '<meta name="application-name" content="FactoryWager" />',
  '<link rel="icon" type="image/svg+xml" href="/icons/factory/mark.svg" />',
  '<link rel="apple-touch-icon" href="/icons/factory/mark.png" />',
  '<link rel="manifest" href="/site.webmanifest" />',
] as const;

type PageKey =
  | 'home'
  | 'registry'
  | 'ops'
  | 'catalog'
  | 'dod'
  | 'health'
  | 'env'
  | 'vault'
  | 'tools'
  | 'failures'
  | 'bunfig'
  | 'dashboard'
  | 'skills'
  | 'packages'
  | 'glossary'
  | 'toc'
  | 'compliance'
  | 'limits'
  | 'partners'
  | 'account'
  | 'partner-history'
  | 'doctor'
  | 'install-hygiene'
  | 'tennis'
  | 'template';

const PAGES: { file: string; active: PageKey; pageLabel: string; brandBadge?: string }[] = [
  { file: 'index.html', active: 'registry', pageLabel: 'Registry', brandBadge: 'ops' },
  { file: 'ops/index.html', active: 'ops', pageLabel: 'Ops', brandBadge: 'ops' },
  { file: 'catalog/index.html', active: 'catalog', pageLabel: 'Catalog', brandBadge: 'ops' },
  { file: 'dod/index.html', active: 'dod', pageLabel: 'DOD', brandBadge: 'ops' },
  { file: 'health/index.html', active: 'health', pageLabel: 'Health', brandBadge: 'ops' },
  { file: 'env/index.html', active: 'env', pageLabel: 'Env', brandBadge: 'ops' },
  { file: 'vault/index.html', active: 'vault', pageLabel: 'Vault', brandBadge: 'ops' },
  { file: 'tools/index.html', active: 'tools', pageLabel: 'CLI Tools', brandBadge: 'ops' },
  { file: 'failures/index.html', active: 'failures', pageLabel: 'Failures', brandBadge: 'ops' },
  { file: 'bunfig/index.html', active: 'bunfig', pageLabel: 'Bunfig', brandBadge: 'ops' },
  { file: 'dashboard/index.html', active: 'dashboard', pageLabel: 'Dashboard', brandBadge: 'ops' },
  { file: 'skills/index.html', active: 'skills', pageLabel: 'Skills', brandBadge: 'ops' },
  { file: 'packages/index.html', active: 'packages', pageLabel: 'Packages', brandBadge: 'ops' },
  {
    file: 'glossary/index.html',
    active: 'glossary',
    pageLabel: 'Glossary',
    brandBadge: 'domain',
  },
  { file: 'toc/index.html', active: 'toc', pageLabel: 'TOC', brandBadge: 'ops' },
  {
    file: 'compliance/index.html',
    active: 'compliance',
    pageLabel: 'Compliance',
    brandBadge: 'ops',
  },
  { file: 'limits/index.html', active: 'limits', pageLabel: 'Limits', brandBadge: 'ops' },
  {
    file: 'partners/index.html',
    active: 'partners',
    pageLabel: 'Partners',
    brandBadge: 'ops',
  },
  {
    file: 'account/index.html',
    active: 'account',
    pageLabel: 'Account',
    brandBadge: 'ops',
  },
  {
    file: 'partner-history/index.html',
    active: 'partner-history',
    pageLabel: 'Partner history',
    brandBadge: 'ops',
  },
  { file: 'doctor/index.html', active: 'doctor', pageLabel: 'Doctor', brandBadge: 'ops' },
  {
    file: 'install-hygiene/index.html',
    active: 'install-hygiene',
    pageLabel: 'Install hygiene',
    brandBadge: 'ops',
  },
  { file: 'tennis/index.html', active: 'tennis', pageLabel: 'Tennis', brandBadge: 'tenant' },
  { file: '_page-template.html', active: 'template', pageLabel: 'New Page', brandBadge: 'ops' },
];

function renderNav(active: PageKey): string {
  // Map page key to chrome id (registry page uses registry id)
  const activeId = active === 'template' ? undefined : active;
  return renderPriorityNavHtml(activeId);
}

function renderLogo(pageLabel: string, brandBadge?: string): string {
  const badge = brandBadge ? `\n        <span class="brand-badge">${brandBadge}</span>` : '';
  return `<h1 class="logo">
        <span class="logo-icon" aria-hidden="true"></span>
        <span class="brand-wordmark">FactoryWager</span>${badge}
        <span class="logo-page">${pageLabel}</span>
      </h1>`;
}

const NAV_RE = /<nav class="topbar-nav"[^>]*>[\s\S]*?<\/nav>/;
const LOGO_RE = /<h1 class="logo">[\s\S]*?<\/h1>/;
const FOOTER_RE = /<footer class="footer"[^>]*>[\s\S]*?<\/footer>/;
const FOOTER_SCRIPT = '<script type="module" src="/portal/components/footer.js"></script>';

async function patchFile(entry: (typeof PAGES)[number]): Promise<void> {
  const path = joinPath(PORTAL, entry.file);
  if (!(await Bun.file(path).exists())) {
    console.log(`skip missing ${entry.file}`);
    return;
  }
  let html = await Bun.file(path).text();
  let changed = false;

  const titleLine = html.match(/^([ \t]*)<title>.*<\/title>[ \t]*$/m);
  if (!html.includes('/site.webmanifest') && titleLine) {
    const indent = titleLine[1] ?? '';
    const brandHead = BRAND_HEAD_LINES.map(line => `${indent}${line}`).join('\n');
    html = html.replace(titleLine[0], `${titleLine[0]}\n${brandHead}`);
    changed = true;
  }

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

  const footerHtml = renderFooterHtml();
  if (FOOTER_RE.test(html)) {
    const prev = html.match(FOOTER_RE)?.[0] ?? '';
    if (prev !== footerHtml) {
      html = html.replace(FOOTER_RE, footerHtml);
      changed = true;
    }
  } else if (html.includes('</body>')) {
    html = html.replace('</body>', `  ${footerHtml}\n</body>`);
    changed = true;
  }

  if (!html.includes('/portal/components/footer.js') && html.includes('</body>')) {
    html = html.replace('</body>', `  ${FOOTER_SCRIPT}\n</body>`);
    changed = true;
  }

  if (changed) {
    await Bun.write(path, html);
    console.log(`updated ${entry.file}`);
  } else {
    console.log(`ok ${entry.file}`);
  }
}

const onlyArg = Bun.argv.find(arg => arg.startsWith('--only='));
const only = onlyArg?.slice('--only='.length);
const selectedPages = only
  ? PAGES.filter(page => page.active === only || page.file === only)
  : PAGES;
if (only && selectedPages.length === 0) {
  throw new Error(`Unknown portal chrome page: ${only}`);
}

for (const page of selectedPages) {
  await patchFile(page);
}

/** Normalize wiki dropdown on shells not fully covered. */
const WIKI_NAV_RE =
  /<a href="https:\/\/wiki\.factory-wager\.com(?:\/wiki-index\.html)?" class="nav-link" target="_blank" rel="noopener noreferrer" role="menuitem"[^>]*>Wiki<\/a>/g;
const WIKI_NAV_ANCHOR = `<a href="${PORTAL_WIKI_DROPDOWN_HREF}" class="nav-link" target="_blank" rel="noopener noreferrer" role="menuitem" title="Portal · registry · tenants · proof loop">Wiki</a>`;

async function sweepWikiNav(rel: string): Promise<void> {
  const path = joinPath(import.meta.dir, '..', rel);
  if (!(await Bun.file(path).exists())) return;
  let html = await Bun.file(path).text();
  const next = html.replace(WIKI_NAV_RE, WIKI_NAV_ANCHOR);
  if (next !== html) {
    await Bun.write(path, next);
    console.log(`wiki-nav ${rel}`);
  }
}

for (const rel of [
  'public/monitoring/index.html',
  'public/portal/science/index.html',
  'public/portal/tennis/index.html',
  'public/portal/factory/index.html',
  'public/portal/account/index.html',
  'public/portal/partner-history/index.html',
]) {
  await sweepWikiNav(rel);
}

// Suppress unused import lint for type-only if needed
void (0 as unknown as PortalChromeNavItem);
