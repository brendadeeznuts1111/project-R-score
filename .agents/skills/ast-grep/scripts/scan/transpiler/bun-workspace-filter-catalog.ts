/** Runtime — https://bun.com/docs/runtime#filtering | PM — https://bun.com/docs/pm/filter */

export const BUN_RUNTIME_FILTER_DOC = "https://bun.com/docs/runtime#filtering";
export const BUN_PM_FILTER_DOC = "https://bun.com/docs/pm/filter";
export const BUN_PM_WORKSPACES_DOC = "https://bun.com/docs/pm/workspaces";

export type WorkspaceFilterRule = {
  id: string;
  pattern: string;
  command: string;
  summary: string;
  doc: string;
};

export type WorkspaceRunFlag = {
  flag: string;
  alias?: string;
  summary: string;
  doc: string;
};

export type BunWorkspaceFilterCatalog = {
  runtimeDoc: string;
  pmDoc: string;
  summary: string;
  matching: {
    name: string;
    path: string;
    negation: string;
  };
  commands: string[];
  runFlags: WorkspaceRunFlag[];
  filterRules: WorkspaceFilterRule[];
  skillUsage: string[];
};

export const WORKSPACE_RUN_FLAGS: WorkspaceRunFlag[] = [
  { flag: "--filter", alias: "-F", summary: "Match workspace packages by name or ./path glob", doc: BUN_PM_FILTER_DOC },
  { flag: "--workspaces", summary: "Run in all workspace packages from package.json workspaces", doc: BUN_RUNTIME_FILTER_DOC },
  { flag: "--parallel", summary: "Run matched scripts concurrently with prefixed output", doc: BUN_PM_FILTER_DOC },
  { flag: "--sequential", summary: "Run matched scripts one after another", doc: BUN_PM_FILTER_DOC },
  { flag: "--if-present", summary: "Skip packages missing the script instead of erroring", doc: BUN_RUNTIME_FILTER_DOC },
  { flag: "--no-exit-on-error", summary: "With --parallel/--sequential, continue when one script fails", doc: BUN_RUNTIME_FILTER_DOC },
  { flag: "--elide-lines", summary: "Lines of output per script with --filter (0 = show all)", doc: BUN_RUNTIME_FILTER_DOC },
];

export const WORKSPACE_FILTER_RULES: WorkspaceFilterRule[] = [
  {
    id: "all-packages",
    pattern: "*",
    command: "bun run --filter '*' test",
    summary: "Run test in every workspace package",
    doc: BUN_RUNTIME_FILTER_DOC,
  },
  {
    id: "name-prefix",
    pattern: "ba*",
    command: "bun run --filter 'ba*' build",
    summary: "Name glob — matches bar and baz, not foo",
    doc: BUN_RUNTIME_FILTER_DOC,
  },
  {
    id: "path-packages",
    pattern: "./packages/*",
    command: "bun install --filter './packages/*'",
    summary: "Path glob — packages under ./packages/",
    doc: BUN_PM_FILTER_DOC,
  },
  {
    id: "path-agents-skills",
    pattern: "./.agents/skills/*",
    command: "bun run --parallel --filter './.agents/skills/*' test",
    summary: "Path filter for agent skill workspaces",
    doc: BUN_PM_FILTER_DOC,
  },
  {
    id: "exclude-package",
    pattern: "!pkg-c",
    command: "bun install --filter '!pkg-c'",
    summary: "Negation — install all workspaces except pkg-c",
    doc: BUN_PM_FILTER_DOC,
  },
  {
    id: "exclude-root",
    pattern: "!./",
    command: "bun install --filter '!./' --filter './packages/*'",
    summary: "Exclude root package.json; target ./packages/* only",
    doc: BUN_PM_FILTER_DOC,
  },
  {
    id: "parallel-dev",
    pattern: "*",
    command: "bun --filter '*' dev",
    summary: "Shorthand — filter before script (pm/filter style)",
    doc: BUN_PM_FILTER_DOC,
  },
  {
    id: "sequential-workspaces-build",
    pattern: "",
    command: "bun run --sequential --workspaces build",
    summary: "All workspaces, dependency order respected",
    doc: BUN_PM_FILTER_DOC,
  },
];

export const BUN_WORKSPACE_FILTER_CATALOG: BunWorkspaceFilterCatalog = {
  runtimeDoc: BUN_RUNTIME_FILTER_DOC,
  pmDoc: BUN_PM_FILTER_DOC,
  summary: "Monorepo workspace selection via bun run/install/outdated --filter",
  matching: {
    name: "package.json name — e.g. pkg*, @scope/*, exact name",
    path: "./<glob> — directory paths from workspace root, e.g. ./packages/**",
    negation: "!pattern — exclude matches (combine with positive filters for install)",
  },
  commands: ["bun run --filter <pattern> <script>", "bun --filter <pattern> <script>", "bun install --filter <pattern>", "bun outdated --filter <pattern>"],
  runFlags: WORKSPACE_RUN_FLAGS,
  filterRules: WORKSPACE_FILTER_RULES,
  skillUsage: [
    "test:matrix — bun run --parallel --filter './.agents/skills/*' test",
    "skill-loop — filter registry skills that have package.json workspaces",
    "supply-chain packages — bun install --filter './packages/*' in CI",
    "root package.json workspaces:build / workspaces:test scripts",
  ],
};

export type AssembledWorkspaceRunCommand = {
  command: string[];
  filter?: string;
  script: string;
  mode?: "parallel" | "sequential";
};

export function normalizeWorkspacePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
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

export function isPathFilterPattern(pattern: string): boolean {
  return pattern.startsWith("./");
}

export function matchPackageNameFilter(pattern: string, packageName: string): boolean {
  if (pattern.startsWith("!")) return !matchPackageNameFilter(pattern.slice(1), packageName);
  if (isPathFilterPattern(pattern)) return false;
  if (pattern === "*") return true;
  return globToRegExp(pattern).test(packageName);
}

export function matchPackagePathFilter(pattern: string, packagePath: string): boolean {
  if (pattern.startsWith("!")) return !matchPackagePathFilter(pattern.slice(1), packagePath);
  if (!isPathFilterPattern(pattern)) return false;
  const norm = normalizeWorkspacePath(packagePath);
  const pat = normalizeWorkspacePath(pattern);
  return globToRegExp(pat).test(norm);
}

export function matchWorkspacePackage(input: {
  pattern: string;
  name?: string;
  path?: string;
}): boolean {
  const { pattern, name, path } = input;
  if (isPathFilterPattern(pattern)) {
    return path ? matchPackagePathFilter(pattern, path) : false;
  }
  return name ? matchPackageNameFilter(pattern, name) : false;
}

export function filterWorkspacePackages<T extends { name?: string; path: string }>(
  packages: readonly T[],
  patterns: string | readonly string[],
): T[] {
  const list = typeof patterns === "string" ? [patterns] : [...patterns];
  const positive = list.filter((p) => !p.startsWith("!"));
  const negative = list.filter((p) => p.startsWith("!")).map((p) => p.slice(1));

  return packages.filter((pkg) => {
    const included = positive.length
      ? positive.some((p) => matchWorkspacePackage({ pattern: p, name: pkg.name, path: pkg.path }))
      : true;
    if (!included) return false;
    return !negative.some((p) => matchWorkspacePackage({ pattern: p, name: pkg.name, path: pkg.path }));
  });
}

export function assembleWorkspaceRunCommand(opts: {
  script: string;
  filter?: string;
  parallel?: boolean;
  sequential?: boolean;
  workspaces?: boolean;
  ifPresent?: boolean;
  noExitOnError?: boolean;
  elideLines?: number;
  shorthand?: boolean;
}): AssembledWorkspaceRunCommand {
  const cmd: string[] = ["bun"];
  if (opts.shorthand && opts.filter) {
    cmd.push("--filter", opts.filter, opts.script);
    return { command: cmd, filter: opts.filter, script: opts.script, mode: opts.parallel ? "parallel" : opts.sequential ? "sequential" : undefined };
  }

  if (opts.parallel) cmd.push("--parallel");
  if (opts.sequential) cmd.push("--sequential");
  if (opts.noExitOnError) cmd.push("--no-exit-on-error");
  if (opts.elideLines !== undefined) cmd.push(`--elide-lines=${opts.elideLines}`);
  cmd.push("run");
  if (opts.ifPresent) cmd.push("--if-present");
  if (opts.workspaces) cmd.push("--workspaces");
  if (opts.filter) cmd.push("--filter", opts.filter);
  cmd.push(opts.script);
  return {
    command: cmd,
    filter: opts.filter,
    script: opts.script,
    mode: opts.parallel ? "parallel" : opts.sequential ? "sequential" : undefined,
  };
}

export function formatWorkspaceFilterMarkdown(): string {
  const c = BUN_WORKSPACE_FILTER_CATALOG;
  const lines = [
    "# bun run --filter (workspace)",
    "",
    `runtime: ${c.runtimeDoc}`,
    `pm: ${c.pmDoc}`,
    "",
    "## Matching",
    `- name: ${c.matching.name}`,
    `- path: ${c.matching.path}`,
    `- negation: ${c.matching.negation}`,
    "",
    "## Commands",
  ];
  for (const cmd of c.commands) lines.push(`- \`${cmd}\``);
  lines.push("", "## Run flags", "");
  for (const f of c.runFlags) {
    const alias = f.alias ? ` (${f.alias})` : "";
    lines.push(`- \`${f.flag}\`${alias}: ${f.summary}`);
  }
  lines.push("", "## Cataloged recipes", "");
  for (const r of c.filterRules) {
    lines.push(`- **${r.id}**: \`${r.command}\` — ${r.summary}`);
  }
  return lines.join("\n");
}