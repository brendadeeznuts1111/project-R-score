// @see https://bun.com/docs/project/benchmarking#cpu-profiling — --cpu-prof
// @released --cpu-prof · released v1.3.2 · 2025-11-08 · https://bun.com/blog/bun-v1.3.2
// @updated --cpu-prof · changed v1.3.2 · 2025-11-08 · https://bun.com/blog/bun-v1.3.2
// @updated --cpu-prof · fixed v1.3.7 · 2026-01-27 · https://bun.com/blog/bun-v1.3.7
// @updated --cpu-prof · fixed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @see https://bun.com/docs/project/benchmarking#markdown-output — --cpu-prof-md
// @released --cpu-prof-md · released v1.4.0 · 2026-08-20 · https://bun.com/blog/bun-v1.4
// @see https://bun.com/docs/project/benchmarking#heap-profiling — --heap-prof
// @released --heap-prof · released v1.4.0 · 2026-08-20 · https://bun.com/blog/bun-v1.4
// @see https://bun.com/docs/project/benchmarking#markdown-output-1 — --heap-prof-md
// @released --heap-prof-md · released v1.4.0 · 2026-08-20 · https://bun.com/blog/bun-v1.4
// @see https://bun.com/blog/bun-v1.3.14#no-orphans-exit-when-the-parent-process-dies — --no-orphans
// @see https://bun.com/docs/bundler/index#features — bun:bundle
// @see https://bun.com/docs/runtime/s3 — Bun.s3
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/webview — Bun.WebView
// @see https://bun.com/docs/runtime/markdown — Bun.markdown / Bun.markdown.ansi
// @see https://bun.com/docs/runtime/cron — Bun.cron
// @see https://bun.com/docs/runtime/image — Bun.Image
// @see https://bun.com/docs/runtime/http/server — Bun.serve / http3
// @see https://bun.com/docs/runtime/secrets — Bun.secrets
// @see https://bun.com/docs/runtime/networking/udp — Bun.udpSocket
// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
// @see https://bun.com/docs/runtime/csrf#bun-csrf-generate — Bun.CSRF / Bun.CSRF.generate / Bun.CSRF.verify
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
// @see https://bun.com/docs/runtime/child-process#terminal-pty-support — Bun.Terminal
// @see https://bun.com/docs/runtime/nodejs-compat#fetch — fetch
// @see https://bun.com/docs/runtime/file-io — fs.watch
// @see https://bun.com/docs/runtime/bunfig — noOrphans / --no-orphans
// @see https://bun.com/docs/runtime/node-api — process.execve
/**
 * bun-docs-changelog.ts — curated token ↔ release overlay.
 *
 * Not a blog scraper. Humans (or release-note review) record:
 *   token · kind · version · note · optional commit SHA · optional blog anchor
 *
 * Consumed by bun-docs-catalog.ts at build time to stamp:
 *   releasedIn / fixedIn / changeNote / changeCommit / commitUrl / blogUrl#anchor
 *
 * Seed sources:
 *   1. Explicit CHANGELOG_EVENTS below (features + notable fixes)
 *   2. CURATED_ENTRIES.minVersion → implicit feature events (if no explicit feature)
 *
 * Add a row when you care about upgrade impact for a token. Prefer short SHAs
 * from GitHub when known; leave commit blank rather than inventing one.
 *
 * List:  import { CHANGELOG_EVENTS, changelogFor } from './bun-docs-changelog.ts'
 * Build: applied automatically inside bun-docs-catalog.ts buildCatalog()
 */

import { CURATED_ENTRIES } from './bun-docs-curated.ts';

export type ChangelogKind = 'feature' | 'fix' | 'change' | 'deprecate';

export type ChangelogEvent = {
  /** Catalog token name (Bun.serve, process.env, --console-depth, …) */
  name: string;
  kind: ChangelogKind;
  /** Bun semver that introduced / fixed / changed the surface */
  version: string;
  /** One-line human note (what shipped or what broke) */
  note: string;
  /** Optional git SHA (full or short) when known from release notes / PR */
  commit?: string;
  /** Optional fragment on bun.com/blog/bun-v{version} */
  blogAnchor?: string;
  /** Alternate names that should receive the same stamp */
  aliases?: string[];
};

/**
 * Hand-curated high-signal events. Keep this list intentional and small;
 * bulk token discovery stays in the docs generator.
 */
export const CHANGELOG_EVENTS: ChangelogEvent[] = [
  // ── Features (hot path; also mirrored from curated minVersion) ───────────
  {
    name: 'Bun.WebView',
    kind: 'feature',
    version: '1.3.12',
    note: 'Headless browser automation via native WebView',
  },
  {
    name: 'Bun.markdown.ansi',
    kind: 'feature',
    version: '1.3.12',
    note: 'Markdown → ANSI terminal rendering',
  },
  {
    name: 'Bun.cron',
    kind: 'feature',
    version: '1.3.12',
    note: 'In-process cron scheduling (UTC, no-overlap)',
  },
  {
    name: 'Bun.Image',
    kind: 'feature',
    version: '1.3.14',
    note: 'Built-in image decode/resize/encode pipeline',
  },
  {
    name: 'http3',
    kind: 'feature',
    version: '1.3.14',
    note: 'Experimental HTTP/3 (QUIC) in Bun.serve',
    aliases: ['HTTP/3'],
  },
  {
    name: 'globalStore',
    kind: 'feature',
    version: '1.3.14',
    note: 'Shared global virtual store for isolated installs',
  },
  {
    name: 'process.execve',
    kind: 'feature',
    version: '1.3.14',
    note: 'Replace process image in-place (posix execve)',
  },
  {
    name: 'noOrphans',
    kind: 'feature',
    version: '1.3.14',
    note: 'Exit when parent dies (--no-orphans / bunfig)',
    aliases: ['--no-orphans'],
  },
  {
    name: 'Bun.markdown',
    kind: 'feature',
    version: '1.3.8',
    note: 'Native Markdown rendering (html/ansi/render/react)',
  },
  {
    name: 'Bun.color',
    kind: 'feature',
    version: '1.1.30',
    note: 'Native CSS/ANSI color parsing and conversion',
  },
  {
    name: 'Bun.CSRF',
    kind: 'feature',
    version: '1.2.5',
    note: 'Built-in CSRF token generation and verification',
    aliases: ['Bun.CSRF.generate', 'Bun.CSRF.verify'],
  },
  {
    name: 'Bun.secrets',
    kind: 'feature',
    version: '1.3.0',
    note: 'OS keychain-backed secrets API',
  },
  {
    name: 'Bun.udpSocket',
    kind: 'feature',
    version: '1.1.6',
    note: 'UDP sockets with ICMP/truncation handling',
  },
  // https://bun.com/blog/bun-v1.3.5#bun-terminal-api-for-pseudo-terminal-pty-support
  {
    name: 'Bun.Terminal',
    kind: 'feature',
    version: '1.3.5',
    note: 'Built-in PTY API (new Bun.Terminal + Bun.spawn terminal option); POSIX only at ship',
    blogAnchor: 'bun-terminal-api-for-pseudo-terminal-pty-support',
    aliases: ['Terminal', 'Bun.spawn terminal (PTY)'],
  },
  {
    name: 'feature',
    kind: 'feature',
    version: '1.3.5',
    note: 'Compile-time feature flags via import { feature } from "bun:bundle"',
    blogAnchor: 'compile-time-feature-flags-for-dead-code-elimination',
    aliases: ['bun:bundle', 'feature()'],
  },
  {
    name: 'Bun.stringWidth',
    kind: 'change',
    version: '1.3.5',
    note: 'Improved terminal display width (Unicode, ANSI, emoji graphemes)',
    blogAnchor: 'improved-bun-stringwidth-accuracy',
  },
  {
    name: 'Bun.s3',
    kind: 'change',
    version: '1.3.5',
    note: 'contentDisposition option for S3 uploads',
    blogAnchor: 'content-disposition-support-for-s3-uploads',
  },

  // ── Bun 1.4.0 Observability (versioned blog anchors) ─────────────────────
  // https://bun.com/blog/bun-v1.4#cpu-prof-md · #heap-prof-md · #heap-prof
  {
    name: '--cpu-prof',
    kind: 'feature',
    version: '1.3.2',
    note: 'CPU profiling to Chrome DevTools .cpuprofile',
    blogAnchor: 'cpu-profiling-with-cpu-prof',
  },
  {
    name: '--cpu-prof-md',
    kind: 'feature',
    version: '1.4.0',
    note: 'Markdown CPU profile for SSH / bug reports / LLMs (Observability)',
    blogAnchor: 'cpu-prof-md',
  },
  {
    name: '--heap-prof',
    kind: 'feature',
    version: '1.4.0',
    note: 'V8-compatible heap profile on exit (.heapprofile)',
    blogAnchor: 'heap-prof',
  },
  {
    name: '--heap-prof-md',
    kind: 'feature',
    version: '1.4.0',
    note: 'Markdown heap profile for CLI analysis (Observability)',
    blogAnchor: 'heap-prof-md',
  },

  // ── Notable fixes (upgrade impact) ───────────────────────────────────────
  {
    name: 'process.env',
    kind: 'fix',
    version: '1.3.12',
    note: 'Fixed process.env empty when cwd is unreadable',
    blogAnchor: 'bugfixes',
    // Contributor-linked in blog; SHA left blank until pinned from git history
  },
  {
    name: 'fs.watch',
    kind: 'change',
    version: '1.3.14',
    note: 'File watcher rewritten backend',
    blogAnchor: 'bugfixes',
  },
  {
    name: 'Bun.Terminal',
    kind: 'change',
    version: '1.3.14',
    note: 'Windows ConPTY support for spawned PTYs (feature shipped 1.3.5 POSIX-only)',
  },
  {
    name: 'bun:sqlite',
    kind: 'change',
    version: '1.3.14',
    note: 'SQLite engine bumped (v3.53.0 in 1.3.14 notes)',
  },
  {
    name: 'fetch',
    kind: 'feature',
    version: '1.3.14',
    note: 'HTTP/2 and HTTP/3 options on fetch() client',
  },
  {
    name: 'FormData',
    kind: 'fix',
    version: '1.3.14',
    note: 'Multipart boundaries now use the WebKit-compatible shape',
    blogAnchor: 'web-apis',
  },
  {
    name: 'Blob',
    kind: 'fix',
    version: '1.3.14',
    note: 'Empty Blob inspection and duplicated content-type lifetime were repaired',
    blogAnchor: 'web-apis',
  },
  {
    name: 'ReadableStream',
    kind: 'fix',
    version: '1.3.14',
    note: 'Small Bun.file streams no longer close their controller twice',
    blogAnchor: 'web-apis',
  },
  {
    name: 'WebSocket',
    kind: 'fix',
    version: '1.3.14',
    note: 'CONNECTING close cleanup and perMessageDeflate opt-out behavior were repaired',
    blogAnchor: 'websocket-permessagedeflate-false-now-respected-in-upgrade-requests',
  },
];

/** Normalize name for map keys (matches catalog normalizeName spirit). */
export function changelogKey(name: string): string {
  return name
    .trim()
    .replace(/^bun\./i, 'Bun.')
    .toLowerCase();
}

export function commitUrlFor(commit: string): string {
  const sha = commit.replace(/[^0-9a-fA-F]/g, '');
  if (sha.length < 7) return `https://github.com/oven-sh/bun/commit/${commit}`;
  return `https://github.com/oven-sh/bun/commit/${sha}`;
}

/**
 * Implicit feature events from curated minVersion when no explicit feature
 * event already covers that token.
 */
export function curatedAsFeatureEvents(): ChangelogEvent[] {
  const explicitFeatures = new Set(
    CHANGELOG_EVENTS.filter(e => e.kind === 'feature').map(e => changelogKey(e.name))
  );
  const out: ChangelogEvent[] = [];
  for (const c of CURATED_ENTRIES) {
    if (!c.minVersion) continue;
    const key = changelogKey(c.term);
    if (explicitFeatures.has(key)) continue;
    out.push({
      name: c.term,
      kind: 'feature',
      version: c.minVersion,
      note: c.description,
    });
  }
  return out;
}

export function allChangelogEvents(): ChangelogEvent[] {
  return [...CHANGELOG_EVENTS, ...curatedAsFeatureEvents()];
}

export type TokenChangelog = {
  /** Earliest feature version if known */
  releasedIn?: string;
  /** Latest fix version if known */
  fixedIn?: string;
  /** Latest non-feature change/deprecate version */
  changedIn?: string;
  /** Best single note for display (prefer fix > change > feature) */
  changeNote?: string;
  /** Best commit SHA for display (if any event has one) */
  changeCommit?: string;
  commitUrl?: string;
  /** Preferred blog version + optional anchor for this token */
  blogVersion?: string;
  blogAnchor?: string;
  events: ChangelogEvent[];
};

/** Aggregate all events for one token name (including alias hits). */
export function changelogFor(name: string, events = allChangelogEvents()): TokenChangelog {
  const key = changelogKey(name);
  const hits = events.filter(
    e => changelogKey(e.name) === key || e.aliases?.some(a => changelogKey(a) === key)
  );
  if (hits.length === 0) return { events: [] };

  let releasedIn: string | undefined;
  let fixedIn: string | undefined;
  let changedIn: string | undefined;
  let changeNote: string | undefined;
  let changeCommit: string | undefined;
  let blogVersion: string | undefined;
  let blogAnchor: string | undefined;

  // Notes prefer latest upgrade impact (fix > change > feature).
  // Blog deep-links prefer the ship post (feature with anchor), then fix, then change.
  const notePriority: Record<ChangelogKind, number> = {
    fix: 3,
    change: 2,
    deprecate: 2,
    feature: 1,
  };
  const blogPriority: Record<ChangelogKind, number> = {
    feature: 3,
    fix: 2,
    change: 1,
    deprecate: 1,
  };
  let bestNotePri = -1;
  let bestBlogPri = -1;

  for (const e of hits) {
    if (e.kind === 'feature') {
      if (!releasedIn || compareSemverLoose(e.version, releasedIn) < 0) {
        releasedIn = e.version;
      }
    }
    if (e.kind === 'fix') {
      if (!fixedIn || compareSemverLoose(e.version, fixedIn) > 0) {
        fixedIn = e.version;
      }
    }
    if (e.kind === 'change' || e.kind === 'deprecate') {
      if (!changedIn || compareSemverLoose(e.version, changedIn) > 0) {
        changedIn = e.version;
      }
    }

    const pri = notePriority[e.kind];
    if (pri > bestNotePri) {
      bestNotePri = pri;
      changeNote = e.note;
      changeCommit = e.commit;
    } else if (pri === bestNotePri && e.commit && !changeCommit) {
      changeCommit = e.commit;
    }

    if (e.blogAnchor) {
      const bPri = blogPriority[e.kind];
      if (bPri > bestBlogPri) {
        bestBlogPri = bPri;
        blogVersion = e.version;
        blogAnchor = e.blogAnchor;
      }
    }
  }

  // Fall back: blog post for releasedIn / fixedIn without a section anchor
  if (!blogVersion) {
    blogVersion = releasedIn ?? fixedIn ?? changedIn;
  }

  return {
    releasedIn,
    fixedIn,
    changedIn,
    changeNote,
    changeCommit,
    commitUrl: changeCommit ? commitUrlFor(changeCommit) : undefined,
    blogVersion,
    blogAnchor,
    events: hits,
  };
}

/** Map of changelogKey → TokenChangelog for catalog apply. */
export function changelogIndex(events = allChangelogEvents()): Map<string, TokenChangelog> {
  const names = new Set<string>();
  for (const e of events) {
    names.add(e.name);
    for (const a of e.aliases ?? []) names.add(a);
  }
  const map = new Map<string, TokenChangelog>();
  for (const name of names) {
    map.set(changelogKey(name), changelogFor(name, events));
  }
  return map;
}

function compareSemverLoose(a: string, b: string): number {
  const pa = a
    .replace(/^v/, '')
    .split('.')
    .map(n => parseInt(n, 10) || 0);
  const pb = b
    .replace(/^v/, '')
    .split('.')
    .map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}
