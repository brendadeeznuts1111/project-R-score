/** Official docs — https://bun.com/docs/runtime/archive */

export const BUN_ARCHIVE_DOC = "https://bun.com/docs/runtime/archive";
export const BUN_ARCHIVE_GLOB_DOC = `${BUN_ARCHIVE_DOC}#filtering-with-glob-patterns`;
export const BUN_GLOB_DOC = "https://bun.com/docs/runtime/glob";

export type ArchiveGlobRule = {
  id: string;
  pattern: string | readonly string[];
  summary: string;
  doc: string;
};

export type ArchiveMethodEntry = {
  name: string;
  ref: string;
  summary: string;
  glob?: boolean;
};

export type BunArchiveCatalog = {
  doc: string;
  globDoc: string;
  globSyntaxDoc: string;
  summary: string;
  methods: ArchiveMethodEntry[];
  globRules: ArchiveGlobRule[];
  globTokens: string[];
  securityNotes: string[];
  skillUsage: string[];
};

export const ARCHIVE_GLOB_TOKENS = [
  "* — any chars except /",
  "** — any chars including /",
  "? — single char",
  "[abc] — character set",
  "{a,b} — alternatives",
  "!pattern — exclude (must pair with positive pattern per docs)",
] as const;

export const ARCHIVE_GLOB_RULES: ArchiveGlobRule[] = [
  {
    id: "typescript-only",
    pattern: "**/*.ts",
    summary: "files() or extract() — TypeScript files recursively",
    doc: BUN_ARCHIVE_GLOB_DOC,
  },
  {
    id: "multi-dir",
    pattern: ["src/**", "lib/**"],
    summary: "extract — include multiple directory trees",
    doc: BUN_ARCHIVE_GLOB_DOC,
  },
  {
    id: "exclude-node-modules",
    pattern: ["**", "!node_modules/**"],
    summary: "extract — all entries except node_modules (positive ** required)",
    doc: BUN_ARCHIVE_GLOB_DOC,
  },
  {
    id: "exclude-tests",
    pattern: ["src/**", "!**/*.test.ts", "!**/__tests__/**"],
    summary: "extract — source tree without test files",
    doc: BUN_ARCHIVE_GLOB_DOC,
  },
  {
    id: "negation-only-empty",
    pattern: ["!node_modules/**"],
    summary: "docs: negative-only patterns match nothing — prefer ['**', '!node_modules/**']",
    doc: BUN_ARCHIVE_GLOB_DOC,
  },
];

export const BUN_ARCHIVE_CATALOG: BunArchiveCatalog = {
  doc: BUN_ARCHIVE_DOC,
  globDoc: BUN_ARCHIVE_GLOB_DOC,
  globSyntaxDoc: BUN_GLOB_DOC,
  summary: "Native tar/tar.gz create, extract, and in-memory read via Bun.Archive",
  methods: [
    { name: "constructor", ref: BUN_ARCHIVE_DOC, summary: "new Bun.Archive(files) or new Bun.Archive(tarBytes)" },
    { name: "extract", ref: BUN_ARCHIVE_DOC, summary: "Write entries to disk; optional glob filter", glob: true },
    { name: "files", ref: BUN_ARCHIVE_GLOB_DOC, summary: "Map<path, File> without extraction; optional glob", glob: true },
    { name: "bytes", ref: BUN_ARCHIVE_DOC, summary: "Uint8Array tarball bytes" },
    { name: "blob", ref: BUN_ARCHIVE_DOC, summary: "Blob tarball" },
  ],
  globRules: ARCHIVE_GLOB_RULES,
  globTokens: [...ARCHIVE_GLOB_TOKENS],
  securityNotes: [
    "extract rejects absolute paths (POSIX /, Windows drive letters, UNC)",
    "path traversal (..) normalized away during extract",
    "Windows: symlinks in archives skipped on extract",
    "files() loads contents into memory — prefer extract for large archives",
  ],
  skillUsage: [
    "supply-chain: inspect npm tarball with archive.files('package/package.json')",
    "bundle-threat: extract dist/**/*.js from cached tarball without node_modules",
    "skill-loop snapshot: optional archive baseline packaging",
  ],
};

export function formatArchiveCatalogMarkdown(): string {
  const c = BUN_ARCHIVE_CATALOG;
  const lines = [
    "# Bun.Archive API",
    "",
    `doc: ${c.doc}`,
    `glob: ${c.globDoc}`,
    "",
    "## Methods",
  ];
  for (const m of c.methods) {
    const g = m.glob ? " (glob filter)" : "";
    lines.push(`- **${m.name}**${g}: ${m.summary}`);
  }
  lines.push("", "## Glob tokens (subset of Bun.Glob)", "");
  for (const t of c.globTokens) lines.push(`- ${t}`);
  lines.push("", "## Cataloged glob recipes", "");
  for (const r of c.globRules) {
    const pat = Array.isArray(r.pattern) ? JSON.stringify(r.pattern) : r.pattern;
    lines.push(`- **${r.id}**: \`${pat}\` — ${r.summary}`);
  }
  lines.push("", "## Security", "");
  for (const n of c.securityNotes) lines.push(`- ${n}`);
  return lines.join("\n");
}

/** Normalize archive entry paths to forward slashes (per docs). */
export function normalizeArchivePath(path: string): string {
  return path.replaceAll("\\", "/");
}

/**
 * Document-aligned glob filter for archive entry paths (forward-slash normalized).
 * Positive patterns include; negative (!) patterns exclude after positives match.
 */
export function matchArchiveGlob(path: string, globs: string | readonly string[]): boolean {
  const normalized = normalizeArchivePath(path);
  const patterns = typeof globs === "string" ? [globs] : [...globs];
  const positive = patterns.filter((p) => !p.startsWith("!"));
  const negative = patterns.filter((p) => p.startsWith("!")).map((p) => p.slice(1));

  if (!positive.length) return false;

  const matchesPattern = (pat: string, target: string): boolean => {
    const re = globToRegExp(pat);
    return re.test(target);
  };

  const included = positive.some((p) => matchesPattern(p, normalized));
  if (!included) return false;
  return !negative.some((p) => matchesPattern(p, normalized));
}

function globToRegExp(glob: string): RegExp {
  let re = "^";
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i];
    if (ch === "*") {
      if (glob[i + 1] === "*") {
        re += ".*";
        i++;
        if (glob[i + 1] === "/") {
          re += "(?:.*/)?";
          i++;
        }
      } else {
        re += "[^/]*";
      }
    } else if (ch === "?") {
      re += "[^/]";
    } else if ("\\+^$.()|{}[]".includes(ch)) {
      re += `\\${ch}`;
    } else {
      re += ch;
    }
  }
  re += "$";
  return new RegExp(re);
}

export function filterArchivePaths(
  paths: readonly string[],
  globs: string | readonly string[],
): string[] {
  return paths
    .map(normalizeArchivePath)
    .filter((p) => matchArchiveGlob(p, globs));
}