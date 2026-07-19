#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/markdown#bun-markdown-html — Bun.markdown
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/utils#bun-stripansi — Bun.stripANSI
// @see https://bun.com/docs/runtime/utils#bun-wrapansi — Bun.wrapAnsi
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect.table
// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
// projects-dashboard.ts — Bun-native project dashboard for projects/active/
// Run: bun run scripts/projects-dashboard.ts [--cards] [--readme] [--watch N] [--sort ...] [--timing]

import {
  checkGitStatus,
  countFiles,
  dirSizeBytes,
  fileExistsSync,
  joinPath,
  lastModified,
  listChildDirectoryNames,
  parseScanFlags,
  readPackageJson,
  readTextFileSync,
} from '../lib/projects-scan.ts';

const ROOT = process.cwd();
const ACTIVE = joinPath(ROOT, 'projects', 'active');

const flags = parseScanFlags(Bun.argv, {
  sort: { type: 'string', default: 'name' },
  cards: { type: 'boolean', default: false },
  json: { type: 'boolean', default: false },
  color: { type: 'boolean', default: true },
  timing: { type: 'boolean', default: false },
  readme: { type: 'boolean', default: false },
  watch: { type: 'string', default: '' },
});
const watchSec = flags.watch ? parseInt(String(flags.watch), 10) || 30 : 0;

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
async function discoverProjects(): Promise<ProjectMeta[]> {
  const projects: ProjectMeta[] = [];

  for (const entry of listChildDirectoryNames(ACTIVE)) {
    if (entry.startsWith('.')) continue;

    const dir = joinPath(ACTIVE, entry);
    if (!fileExistsSync(joinPath(dir, 'package.json'))) continue;

    const pkg = await readPackageJson(dir);
    const lastMod = lastModified(dir);

    projects.push({
      dir: entry,
      name: (pkg.name as string) || entry,
      version: (pkg.version as string) || '—',
      description: (pkg.description as string) || '—',
      license: (pkg.license as string) || '—',
      private: !!pkg.private,
      gitStatus: checkGitStatus(dir),
      hasReadme: fileExistsSync(joinPath(dir, 'README.md')),
      hasLicense: !!pkg.license || fileExistsSync(joinPath(dir, 'LICENSE')),
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

async function renderDashboard() {
  const t0 = flags.timing ? Bun.nanoseconds() : 0;
  const projects = await discoverProjects();
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
        const readmePath = joinPath(ACTIVE, p.dir, 'README.md');
        const md = readTextFileSync(readmePath);
        if (md) {
          const rendered = Bun.markdown.ansi(md, {
            colors: useColor,
            columns: termWidth - 4,
          });
          for (const line of rendered.split('\n')) {
            console.log(`│  ${line}`);
          }
        } else {
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
  await renderDashboard();
  setInterval(() => {
    console.clear();
    void renderDashboard();
  }, watchSec * 1000);
  await new Promise(() => {});
} else {
  await renderDashboard();
}
