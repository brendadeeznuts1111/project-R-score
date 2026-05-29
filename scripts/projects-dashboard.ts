#!/usr/bin/env bun
// projects-dashboard.ts — Bun-native project dashboard for projects/active/
// Zero npm deps. Bun.inspect.table, Bun.stringWidth, Bun.wrapAnsi, Bun.markdown.ansi, Bun.cron.
// Run: bun run scripts/projects-dashboard.ts [--cards] [--readme] [--watch N] [--sort ...] [--timing]

import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import {
  checkGitStatus,
  countFiles,
  dirSizeBytes,
  lastModified,
} from '../lib/projects-scan.ts';

const ROOT = process.cwd();
const ACTIVE = join(ROOT, 'projects', 'active');

const { values: flags } = parseArgs({
  args: Bun.argv,
  options: {
    sort: { type: 'string', default: 'name' },
    cards: { type: 'boolean', default: false },
    json: { type: 'boolean', default: false },
    color: { type: 'boolean', default: true },
    timing: { type: 'boolean', default: false },
    readme: { type: 'boolean', default: false },
    watch: { type: 'string' }, // seconds, e.g. --watch=30
  },
  strict: false,
  allowPositionals: true,
});
const watchSec = flags.watch ? parseInt(flags.watch, 10) || 30 : 0;

// ── Types ──────────────────────────────────────────────────────
interface ProjectMeta {
  dir: string;
  name: string;
  version: string;
  description: string;
  license: string;
  private: boolean;
  gitStatus: 'none' | 'clean' | 'dirty';
  hasReadme: boolean;
  hasLicense: boolean;
  fileCount: number;
  sizeKb: number;
  lastChanged: string;
}

// ── Helpers ────────────────────────────────────────────────────

function daysAgo(date: string): string {
  if (date === '—') return date;
  const ms = Date.now() - new Date(date).getTime();
  const days = Math.floor(ms / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function fmtGit(status: 'none' | 'clean' | 'dirty'): string {
  if (status === 'none') return '○';
  if (status === 'dirty') return '●';
  return '⬡';
}

function iconBool(has: boolean): string {
  return has ? '✓' : '✗';
}

// ── ANSI-safe description helpers ──────────────────────────────
function truncateDesc(text: string, maxWidth: number): string {
  const plain = Bun.stripANSI(text);
  if (Bun.stringWidth(plain) <= maxWidth) return text;

  let visible = 0,
    idx = 0;
  for (const char of plain) {
    const w = Bun.stringWidth(char);
    if (visible + w > maxWidth - 1) break;
    visible += w;
    idx += char.length;
  }
  return plain.slice(0, idx) + '…';
}

function wrapDesc(text: string, width: number): string[] {
  return Bun.wrapAnsi(text, width, {
    hard: false,
    wordWrap: true,
    trim: true,
  }).split('\n');
}

// ── Scan ───────────────────────────────────────────────────────
function discoverProjects(): ProjectMeta[] {
  const projects: ProjectMeta[] = [];

  for (const entry of readdirSync(ACTIVE, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.')) continue;

    const dir = join(ACTIVE, entry.name);
    const pkgPath = join(dir, 'package.json');
    if (!existsSync(pkgPath)) continue;

    let pkg: Record<string, any> = {};
    try {
      pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    } catch {}

    const lastMod = lastModified(dir);

    projects.push({
      dir: entry.name,
      name: pkg.name || entry.name,
      version: pkg.version || '—',
      description: pkg.description || '—',
      license: pkg.license || '—',
      private: !!pkg.private,
      gitStatus: checkGitStatus(dir),
      hasReadme: existsSync(join(dir, 'README.md')),
      hasLicense: !!pkg.license || existsSync(join(dir, 'LICENSE')),
      fileCount: countFiles(dir),
      sizeKb: Math.round(dirSizeBytes(dir) / 1024),
      lastChanged: lastMod ? lastMod.toISOString().slice(0, 10) : '—',
    });
  }

  return projects;
}

// ── Render ─────────────────────────────────────────────────────
const useColor = flags.color as boolean;
const C = useColor
  ? { cyan: '\x1b[36m', bold: '\x1b[1m', muted: '\x1b[2m', dim: '\x1b[2m', reset: '\x1b[0m' }
  : { cyan: '', bold: '', muted: '', dim: '', reset: '' };

function renderDashboard() {
  const t0 = flags.timing ? Bun.nanoseconds() : 0;
  const projects = discoverProjects();
  const scanNs = flags.timing ? Bun.nanoseconds() - t0 : 0;

  const sortKey = flags.sort as string;
  if (sortKey === 'size') projects.sort((a, b) => b.sizeKb - a.sizeKb);
  else if (sortKey === 'changed') projects.sort((a, b) => (b.lastChanged > a.lastChanged ? 1 : -1));
  else projects.sort((a, b) => a.name.localeCompare(b.name));

  if (flags.json) {
    console.log(JSON.stringify(projects, null, 2));
    return;
  }

  // Header
  const header = `${C.bold}${C.cyan}Projects/Active Dashboard${C.reset}  —  ${projects.length} projects  ${C.muted}bun ${Bun.version}${C.reset}`;
  console.log(`\n${header}\n${'─'.repeat(Bun.stringWidth(Bun.stripANSI(header)))}\n`);

  if (flags.cards) {
    const termWidth = process.stdout.columns || 100;
    const descWidth = termWidth - 4;

    for (const p of projects) {
      const vis = p.private ? '🔒' : '🌐';
      const git = fmtGit(p.gitStatus);
      const age = daysAgo(p.lastChanged);

      console.log(`┌─ ${C.bold}${p.name}  ${vis}${C.reset} ${C.muted}v${p.version}${C.reset}`);

      if (p.description !== '—') {
        const plain = Bun.stripANSI(p.description);
        if (Bun.stringWidth(plain) <= descWidth) {
          console.log(`│  ${C.dim}${p.description}${C.reset}`);
        } else {
          for (const line of wrapDesc(p.description, descWidth)) {
            console.log(`│  ${C.dim}${line}${C.reset}`);
          }
        }
      }

      const dirtyNote = p.gitStatus === 'dirty' ? ` ${C.muted}(uncommitted)${C.reset}` : '';
      console.log(
        `│  ${git} git${dirtyNote}  ${iconBool(p.hasReadme)} readme  ${iconBool(p.hasLicense)} license  ${p.license}`
      );
      console.log(
        `│  ${p.fileCount.toLocaleString()} files  ${p.sizeKb.toLocaleString()} KB  updated ${age}`
      );

      // ── README preview ────────────────────────────────────────
      if (flags.readme && p.hasReadme) {
        const readmePath = join(ACTIVE, p.dir, 'README.md');
        try {
          const md = readFileSync(readmePath, 'utf-8');
          const rendered = Bun.markdown.ansi(md, {
            colors: useColor,
            columns: termWidth - 4,
          });
          for (const line of rendered.split('\n')) {
            console.log(`│  ${line}`);
          }
        } catch {
          console.log(`│  ${C.muted}(README.md unreadable)${C.reset}`);
        }
      }

      console.log(`${'─'.repeat(Math.min(termWidth - 2, 72))}\n`);
    }
  } else {
    console.log(
      Bun.inspect.table(
        projects.map(p => ({
          Project: p.name,
          Version: p.version,
          Vis: p.private ? '🔒' : '🌐',
          Git: fmtGit(p.gitStatus),
          R: iconBool(p.hasReadme),
          L: iconBool(p.hasLicense),
          Lic: p.license,
          '#': p.fileCount.toLocaleString(),
          KB: p.sizeKb.toLocaleString(),
          Updated: daysAgo(p.lastChanged),
        })),
        undefined,
        { colors: useColor }
      )
    );
  }

  // Footer
  let footer = `${C.muted}⬡ clean  ● dirty  R=README  L=LICENSE  🔒 private  🌐 public${C.reset}`;
  if (flags.timing && scanNs > 0) {
    footer += `  ${C.muted}${(scanNs / 1_000_000).toFixed(1)}ms${C.reset}`;
  }
  if (watchSec > 0) {
    footer += `  ${C.muted}⟳ ${watchSec}s${C.reset}`;
  }
  console.log(footer + '\n');
}

// ── Run ────────────────────────────────────────────────────────
if (watchSec > 0) {
  console.clear();
  renderDashboard();
  setInterval(() => {
    console.clear();
    renderDashboard();
  }, watchSec * 1000);
  // Keep alive
  await new Promise(() => {});
} else {
  renderDashboard();
}
