import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { BUN_ARCHIVE_CATALOG, type BunArchiveCatalog } from "./bun-archive-catalog.ts";
import { BUN_WORKSPACE_FILTER_CATALOG, type BunWorkspaceFilterCatalog } from "./bun-workspace-filter-catalog.ts";
import { BUN_TEST_API_CATALOG, type BunTestApiCatalog } from "./bun-test-api-catalog.ts";
import { EXPECT_SHAPE_CATALOG, type ExpectShapeSpec } from "./expect-shape-catalog.ts";

/** https://bun.com/docs/test/discovery — default file patterns */
export const BUN_TEST_FILE_PATTERNS = [
  "*.test.{js,jsx,ts,tsx}",
  "*_test.{js,jsx,ts,tsx}",
  "*.spec.{js,jsx,ts,tsx}",
  "*_spec.{js,jsx,ts,tsx}",
] as const;

/** Directories Bun test skips during discovery */
export const BUN_TEST_EXCLUDED_DIRS = ["node_modules"] as const;

export type TestSuiteKind = "unit" | "integration" | "concurrent";

export type BunTestDiscoveryRules = {
  doc: string;
  filePatterns: readonly string[];
  exclusions: readonly string[];
  positionFilters: string;
  exactPathPrefix: string;
  testNamePattern: string;
  executionOrder: string[];
};

/** https://bun.com/docs/test/dates-and-times */
export type BunTestTimeRules = {
  doc: string;
  defaultTimezone: string;
  apis: string[];
  jestCompat: string[];
  notes: string[];
};

/** bun:test expect — object / array / string matchers */
export type BunTestMatcherRules = {
  doc: string;
  object: string[];
  array: string[];
  string: string[];
};

export const BUN_TEST_MATCHERS: BunTestMatcherRules = {
  doc: BUN_TEST_API_CATALOG.ref,
  object: [
    "toContainKey(key) — object has key",
    "toContainKeys(keys) — object has all listed keys (subset ok)",
    "toContainAllKeys(keys) — exact key set only (no extras), order-independent",
    "toContainAnyKeys(keys) — at least one key present",
    "toContainValue(val) — deep value search in object",
    "toContainValues(vals) — object has all listed values (subset ok)",
    "toContainAllValues(vals) — exact value set only (no extras)",
    "toContainAnyValues(vals) — at least one value present",
  ],
  array: ["toContainEqual(item) — deep equality in array", "toEqual(expected) — deep equality"],
  string: ["toEndWith(suffix)", "toBe(val) — identity / primitives"],
};

export type PositionFilter = {
  id: string; // brand-ok — opaque ast-grep test filter key
  description: string;
  example: string;
  suites: TestSuiteKind[];
};

export type DomainPreset = {
  id: string; // brand-ok — opaque ast-grep test preset key
  description: string;
  profile: string;
  testNamePattern: string;
  filters: string[];
  files: string[];
  describeBlocks: string[];
};

export type TestFileEntry = {
  path: string;
  suite: TestSuiteKind;
  concurrent: boolean;
  discoveryPattern: string;
  domains: string[];
  describeBlocks: string[];
  testNames: string[];
  matchedFilters: string[];
};

export type TestProfileSpec = {
  description?: string;
  args?: string[];
  cwd?: string;
  filters?: string[];
  testNamePattern?: string;
  shard?: boolean;
  preflight?: string;
  /** Merged into subprocess env (e.g. TZ=Etc/UTC for deterministic CI). */
  env?: Record<string, string>;
};

export type BunfigTestConfig = {
  root: string;
  timeout: number;
  concurrentTestGlob: string[];
};

export type AssembledTestCommand = {
  profile: string;
  cwd: string;
  command: string[];
  filters: string[];
  testNamePattern?: string;
  env?: Record<string, string>;
  preflight?: { command: string[]; cwd: string; label: string };
};

export type TestDiscoveryIndex = {
  skillRoot: string;
  discovery: BunTestDiscoveryRules;
  api: BunTestApiCatalog;
  archive: BunArchiveCatalog;
  workspaceFilter: BunWorkspaceFilterCatalog;
  time: BunTestTimeRules;
  matchers: BunTestMatcherRules;
  shapes: ExpectShapeSpec[];
  bunfig: BunfigTestConfig;
  positionFilters: PositionFilter[];
  domainPresets: DomainPreset[];
  profiles: Record<string, TestProfileSpec>;
  files: TestFileEntry[];
  totals: { files: number; unit: number; integration: number; concurrent: number };
};

export const BUN_TEST_DEFAULT_TZ = "Etc/UTC";

export const BUN_TEST_TIME: BunTestTimeRules = {
  doc: "https://bun.com/docs/test/dates-and-times",
  defaultTimezone: BUN_TEST_DEFAULT_TZ,
  apis: [
    "setSystemTime(date) — mock Date.now, new Date(), Intl.DateTimeFormat",
    "setSystemTime() — reset to real time",
    "jest.useFakeTimers() / jest.useRealTimers() — Jest compat (Date constructor unchanged in Bun)",
    "jest.setSystemTime(date) / jest.now() — read mocked timestamp",
  ],
  jestCompat: [
    "In Bun, Date constructor stays the same when useFakeTimers runs (unlike Jest)",
    "TZ at launch (TZ=... bun test or profile env.TZ) — bun test runner pins UTC during tests",
  ],
  notes: [
    "bun test defaults to TZ=Etc/UTC unless overridden",
    "Timers (setTimeout etc.) are not mocked yet — roadmap item",
    "CI: BUN_TEST_TZ env or profile env.TZ for deterministic snapshots",
  ],
};

export const BUN_TEST_DISCOVERY: BunTestDiscoveryRules = {
  doc: "https://bun.com/docs/test/discovery",
  filePatterns: BUN_TEST_FILE_PATTERNS,
  exclusions: [...BUN_TEST_EXCLUDED_DIRS, "hidden directories (.*)"],
  positionFilters: "substring match on file path — bun test <filter> <filter> ...",
  exactPathPrefix: "./ or / only — bun test ./tests/foo.test.ts",
  testNamePattern: "-t/--test-name-pattern regex against joined describe labels + test name",
  executionOrder: [
    "files run sequentially by default",
    "tests within a file run sequentially by definition order",
    "concurrentTestGlob enables in-file parallelism for matching paths",
    "--parallel runs test files across worker processes",
  ],
};

const POSITION_FILTERS: PositionFilter[] = [
  {
    id: "unit",
    description: "Substring filter — paths containing `unit` (e.g. tests/unit/)",
    example: "bun test unit",
    suites: ["unit"],
  },
  {
    id: "integration",
    description: "Substring filter — paths containing `integration`",
    example: "bun test integration",
    suites: ["integration"],
  },
  {
    id: "concurrent",
    description: "Substring filter — paths containing `concurrent` (+ concurrentTestGlob in-file parallel)",
    example: "bun test concurrent",
    suites: ["concurrent", "integration"],
  },
];

const TEST_FILE_RE = /\.(test|spec)\.(js|jsx|ts|tsx)$|_(test|spec)\.(js|jsx|ts|tsx)$/;

export function isBunTestFile(fileName: string): boolean {
  return TEST_FILE_RE.test(fileName);
}

export function classifyDiscoveryPattern(fileName: string): string {
  if (/\.test\.(js|jsx|ts|tsx)$/.test(fileName)) return "*.test.{js,jsx,ts,tsx}";
  if (/_test\.(js|jsx|ts|tsx)$/.test(fileName)) return "*_test.{js,jsx,ts,tsx}";
  if (/\.spec\.(js|jsx|ts|tsx)$/.test(fileName)) return "*.spec.{js,jsx,ts,tsx}";
  if (/_spec\.(js|jsx|ts|tsx)$/.test(fileName)) return "*_spec.{js,jsx,ts,tsx}";
  return "unknown";
}

/** Bun docs: exact paths require ./ or / prefix (not globs, not bare filenames). */
export function isExactTestPath(path: string): boolean {
  return path.startsWith("./") || path.startsWith("/");
}

/** Position filter — substring match on discovered file path. */
export function matchesPositionFilter(filePath: string, filter: string): boolean {
  return filePath.includes(filter);
}

/** -t/--test-name-pattern label: joined describe blocks + test name (space-separated). */
export function buildTestNameLabel(describeBlocks: string[], testName: string): string {
  return [...describeBlocks, testName].join(" ");
}

export function filtersMatchingPath(filePath: string, filters: PositionFilter[]): string[] {
  return filters.filter((f) => matchesPositionFilter(filePath, f.id)).map((f) => f.id);
}

const DOMAIN_FILE_MAP: Record<string, string[]> = {
  network: ["concurrent-platform-network.test.ts"],
  snapshot: ["concurrent-snapshot-network.test.ts"],
  pillars: ["concurrent-pillars-three.test.ts"],
  "supply-chain": [
    "concurrent-supply-chain-transpiler.test.ts",
    "concurrent-supply-chain-profiles.test.ts",
  ],
  color: ["color-api.test.ts", "color-terminal.test.ts"],
  semver: ["semver-api.test.ts", "semver-policy-runtime.test.ts"],
  markdown: ["markdown-api.test.ts"],
  watch: ["watch-autofix.test.ts"],
  "mock-clock": ["mock-clock.test.ts"],
  matchers: ["object-matchers.test.ts"],
  shapes: ["expect-shapes.test.ts", "concurrent-expect-shapes.test.ts"],
  api: ["bun-test-api.test.ts"],
};

const DOMAIN_DESCRIBE_HINTS: Record<string, string[]> = {
  network: ["PlatformMatcher", "NetworkMatcher", "EndpointCatalog", "platform + network"],
  snapshot: ["snapshot network integration"],
  pillars: ["three pillars"],
  "supply-chain": ["supply-chain Layer 4.5", "supply-chain profiles"],
  color: ["ColorMatcher", "Bun.color", "terminal + reporter color"],
  semver: ["Bun.semver", "SemverMatcher policy runtime"],
  markdown: ["Bun.markdown", "supply-chain markdown reporter"],
  watch: ["supply-chain watch + autofix"],
  "mock-clock": ["setSystemTime", "jest.now", "mocked capturedAt"],
  matchers: ["toContainAllKeys", "toContainValue", "toContainEqual"],
  shapes: ["expectBundleScanReport", "expectDoctorSnapshot", "expectDiscoveryIndex"],
  api: ["expect.objectContaining", "expect.arrayContaining", "bun:test exports"],
};

function classifySuite(relPath: string): TestSuiteKind {
  if (relPath.includes("/integration/") || relPath.startsWith("integration/")) {
    return relPath.includes("concurrent-") ? "concurrent" : "integration";
  }
  return "unit";
}

function domainsForFile(fileName: string): string[] {
  const domains: string[] = [];
  for (const [domain, files] of Object.entries(DOMAIN_FILE_MAP)) {
    if (files.some((f) => fileName === f || fileName.endsWith(f))) domains.push(domain);
  }
  return domains;
}

function shouldSkipDir(name: string): boolean {
  if (name.startsWith(".")) return true;
  return (BUN_TEST_EXCLUDED_DIRS as readonly string[]).includes(name);
}

async function walkTestFiles(dir: string, base: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const ent of entries) {
    const full = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (shouldSkipDir(ent.name)) continue;
      out.push(...await walkTestFiles(full, base));
    } else if (ent.isFile() && isBunTestFile(ent.name)) {
      out.push(relative(base, full));
    }
  }
  return out.sort();
}

function extractDescribeBlocks(source: string): string[] {
  const blocks: string[] = [];
  const re = /describe\s*\(\s*["'`]([^"'`]+)["'`]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) blocks.push(m[1]);
  return blocks;
}

function extractTestNames(source: string): string[] {
  const names: string[] = [];
  const re = /\b(?:test|it)\s*\(\s*["'`]([^"'`]+)["'`]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) names.push(m[1]);
  return names;
}

export async function parseBunfigTest(skillRoot: string): Promise<BunfigTestConfig> {
  const text = await readFile(join(skillRoot, "bunfig.toml"), "utf8");
  const root = text.match(/^\s*root\s*=\s*["']([^"']+)["']/m)?.[1] ?? "tests";
  const timeout = Number(text.match(/^\s*timeout\s*=\s*(\d+)/m)?.[1] ?? 30000);
  const globBlock = text.match(/concurrentTestGlob\s*=\s*\[([\s\S]*?)\]/);
  const concurrentTestGlob: string[] = [];
  if (globBlock) {
    const itemRe = /["']([^"']+)["']/g;
    let m: RegExpExecArray | null;
    while ((m = itemRe.exec(globBlock[1])) !== null) concurrentTestGlob.push(m[1]);
  }
  return { root, timeout, concurrentTestGlob };
}

export async function loadTestProfiles(skillRoot: string): Promise<{
  version?: number;
  min_bun?: string;
  profiles: Record<string, TestProfileSpec>;
}> {
  const raw = JSON.parse(await readFile(join(skillRoot, "bun-test-profiles.json"), "utf8")) as {
    version?: number;
    min_bun?: string;
    profiles?: Record<string, TestProfileSpec>;
  };
  return {
    version: raw.version,
    min_bun: raw.min_bun,
    profiles: raw.profiles ?? {},
  };
}

export function listPositionFilters(): PositionFilter[] {
  return POSITION_FILTERS;
}

export function listDomainPresets(skillRoot: string, files: TestFileEntry[]): DomainPreset[] {
  return Object.keys(DOMAIN_FILE_MAP).map((id) => {
    const mappedFiles = DOMAIN_FILE_MAP[id];
    const matched = files.filter((f) => mappedFiles.some((m) => f.path.endsWith(m)));
    const describeBlocks = [
      ...new Set([
        ...(DOMAIN_DESCRIBE_HINTS[id] ?? []),
        ...matched.flatMap((f) => f.describeBlocks),
      ]),
    ];
    const integration = id !== "color" && id !== "semver" && id !== "markdown" && id !== "watch"
      && id !== "mock-clock" && id !== "matchers" && id !== "shapes" && id !== "api";
    const pattern = describeBlocks
      .map((d) => d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");
    return {
      id,
      description: `${id} domain tests`,
      profile: id,
      testNamePattern: pattern,
      filters: integration ? ["integration"] : ["unit"],
      files: mappedFiles,
      describeBlocks,
    };
  });
}

export async function discoverTestFiles(skillRoot: string): Promise<TestFileEntry[]> {
  const bunfig = await parseBunfigTest(skillRoot);
  const testsRoot = join(skillRoot, bunfig.root);
  const paths = await walkTestFiles(testsRoot, testsRoot);
  const entries: TestFileEntry[] = [];
  for (const rel of paths) {
    const source = await readFile(join(testsRoot, rel), "utf8");
    const fileName = rel.split("/").pop() ?? rel;
    const suite = classifySuite(rel);
    entries.push({
      path: rel,
      suite,
      concurrent: fileName.startsWith("concurrent-"),
      discoveryPattern: classifyDiscoveryPattern(fileName),
      domains: domainsForFile(fileName),
      describeBlocks: extractDescribeBlocks(source),
      testNames: extractTestNames(source),
      matchedFilters: filtersMatchingPath(rel, POSITION_FILTERS),
    });
  }
  return entries;
}

export async function buildTestIndex(skillRoot: string): Promise<TestDiscoveryIndex> {
  const resolved = resolve(skillRoot);
  const [bunfig, profileDoc, files] = await Promise.all([
    parseBunfigTest(resolved),
    loadTestProfiles(resolved),
    discoverTestFiles(resolved),
  ]);
  const domainPresets = listDomainPresets(resolved, files);
  return {
    skillRoot: resolved,
    discovery: BUN_TEST_DISCOVERY,
    api: BUN_TEST_API_CATALOG,
    archive: BUN_ARCHIVE_CATALOG,
    workspaceFilter: BUN_WORKSPACE_FILTER_CATALOG,
    time: BUN_TEST_TIME,
    matchers: BUN_TEST_MATCHERS,
    shapes: EXPECT_SHAPE_CATALOG,
    bunfig,
    positionFilters: listPositionFilters(),
    domainPresets,
    profiles: profileDoc.profiles,
    files,
    totals: {
      files: files.length,
      unit: files.filter((f) => f.suite === "unit").length,
      integration: files.filter((f) => f.suite === "integration" || f.suite === "concurrent").length,
      concurrent: files.filter((f) => f.concurrent).length,
    },
  };
}

export type AssembleOptions = {
  skillRoot: string;
  repoRoot: string;
  profile: string;
  cliFilters?: string[];
  testPath?: string;
  testNamePattern?: string;
  shard?: string;
  changed?: string;
};

function resolveCwd(repoRoot: string, profileCwd?: string): string {
  if (!profileCwd) return repoRoot;
  return resolve(repoRoot, profileCwd);
}

export function resolveTestEnv(spec: TestProfileSpec): Record<string, string> | undefined {
  const env: Record<string, string> = { ...(spec.env ?? {}) };
  const tz = process.env.BUN_TEST_TZ;
  if (tz) env.TZ = tz;
  return Object.keys(env).length ? env : undefined;
}

export function assembleTestCommand(
  profiles: Record<string, TestProfileSpec>,
  opts: AssembleOptions,
): AssembledTestCommand {
  const spec = profiles[opts.profile];
  if (!spec) {
    const names = Object.keys(profiles).sort().join(", ");
    throw new Error(`unknown test profile '${opts.profile}' — choose: ${names}`);
  }

  const cwd = resolveCwd(opts.repoRoot, spec.cwd);
  const profileFilters = [...(spec.filters ?? [])];
  const cliFilters = [...(opts.cliFilters ?? [])];
  const filters = [...profileFilters, ...cliFilters];
  const positional: string[] = [];

  if (opts.testPath) {
    const tp = opts.testPath;
    if (isExactTestPath(tp)) {
      if (spec.cwd && !tp.startsWith("/")) {
        try {
          positional.push(relative(cwd, resolve(cwd, tp)));
        } catch {
          positional.push(tp);
        }
      } else {
        positional.push(tp);
      }
    } else if (tp !== "." && tp !== "tests") {
      filters.push(tp);
    } else if (!spec.cwd) {
      positional.push(resolve(opts.repoRoot, tp));
    }
  }

  const namePattern = opts.testNamePattern ?? spec.testNamePattern;
  const cmd = ["bun", "test", ...(spec.args ?? [])];
  if (namePattern) cmd.push("-t", namePattern);
  if (opts.shard || spec.shard) {
    const shardVal = opts.shard ?? process.env.BUN_TEST_SHARD;
    if (!shardVal) throw new Error("profile requires --shard M/N or BUN_TEST_SHARD env");
    cmd.push(`--shard=${shardVal}`);
  }
  if (opts.changed) {
    cmd.push(opts.changed === "1" ? "--changed" : `--changed=${opts.changed}`);
  }
  cmd.push(...positional, ...filters);

  let preflight: AssembledTestCommand["preflight"];
  if (spec.preflight === "snapshot-validate") {
    const snapshotPath = process.env.AST_GREP_SNAPSHOT_PATH
      ?? join(opts.skillRoot, "baselines/sports-terminal-os/snapshot.json");
    preflight = {
      label: "snapshot-validate",
      cwd: opts.repoRoot,
      command: [
        "bun",
        join(opts.skillRoot, "scripts/snapshot-cli.ts"),
        "validate",
        snapshotPath,
      ],
    };
  }

  return {
    profile: opts.profile,
    cwd,
    command: cmd,
    filters,
    testNamePattern: namePattern,
    env: resolveTestEnv(spec),
    preflight,
  };
}

export function resolveFilesForFilters(
  files: TestFileEntry[],
  filters: string[],
): TestFileEntry[] {
  if (!filters.length) return files;
  return files.filter((f) => filters.some((filter) => matchesPositionFilter(f.path, filter)));
}

export function formatTestListMarkdown(index: TestDiscoveryIndex): string {
  const lines = [
    "# ast-grep test discovery",
    "",
    `doc: ${index.discovery.doc}`,
    `files: ${index.totals.files} (unit ${index.totals.unit}, integration ${index.totals.integration}, concurrent ${index.totals.concurrent})`,
    "",
    "## Bun discovery patterns",
  ];
  for (const p of index.discovery.filePatterns) lines.push(`- \`${p}\``);
  lines.push("", "## Exclusions", "");
  for (const x of index.discovery.exclusions) lines.push(`- ${x}`);
  lines.push("", "## Execution order", "");
  for (const step of index.discovery.executionOrder) lines.push(`1. ${step}`);
  lines.push("", "## Position filters (substring match)", "");
  lines.push(index.discovery.positionFilters);
  lines.push(index.discovery.exactPathPrefix);
  lines.push(index.discovery.testNamePattern);
  for (const f of index.positionFilters) {
    lines.push(`- **${f.id}**: ${f.description} — \`${f.example}\``);
  }
  lines.push("", "## bun run --filter (workspace)", "");
  lines.push(`runtime: ${index.workspaceFilter.runtimeDoc}`);
  lines.push(`pm: ${index.workspaceFilter.pmDoc}`);
  for (const r of index.workspaceFilter.filterRules.slice(0, 6)) {
    lines.push(`- **${r.id}**: \`${r.command}\``);
  }
  lines.push("", "## Bun.Archive (glob filter)", "");
  lines.push(`doc: ${index.archive.doc}`);
  lines.push(`glob: ${index.archive.globDoc}`);
  for (const r of index.archive.globRules) {
    const pat = Array.isArray(r.pattern) ? JSON.stringify(r.pattern) : r.pattern;
    lines.push(`- **${r.id}**: \`${pat}\``);
  }
  lines.push("", "## bun:test API reference", "");
  lines.push(`ref: ${index.api.ref}`);
  lines.push(`summary: ${index.api.summary}`);
  lines.push("exports: " + index.api.exports.map((e) => e.name).join(", "));
  lines.push("hooks: " + index.api.hooks.map((e) => e.name).join(", "));
  for (const [group, entries] of Object.entries(index.api.matcherGroups)) {
    lines.push(`matchers.${group}: ${entries.map((e) => e.name).join(", ")}`);
  }
  lines.push("", "## Expect shapes (domain types)", "");
  for (const s of index.shapes) {
    lines.push(`- **${s.id}**: ${s.description}`);
    lines.push(`  keys: ${s.requiredKeys.join(", ")}`);
    lines.push(`  ${s.assert}`);
  }
  lines.push("", "## Expect matchers (object)", "");
  lines.push(`doc: ${index.matchers.doc}`);
  for (const m of index.matchers.object) lines.push(`- ${m}`);
  lines.push("", "## Dates and times", "");
  lines.push(`doc: ${index.time.doc}`);
  lines.push(`default TZ: ${index.time.defaultTimezone}`);
  for (const api of index.time.apis) lines.push(`- ${api}`);
  for (const note of index.time.notes) lines.push(`- ${note}`);
  lines.push("", "## bunfig.toml", "");
  lines.push(`- root: \`${index.bunfig.root}\``);
  lines.push(`- timeout: ${index.bunfig.timeout}ms`);
  lines.push("- concurrentTestGlob:");
  for (const g of index.bunfig.concurrentTestGlob) lines.push(`  - \`${g}\``);
  lines.push("", "## Domain presets", "");
  for (const d of index.domainPresets) {
    lines.push(`- **${d.id}** (profile \`${d.profile}\`): \`-t "${d.testNamePattern}"\` filters=[${d.filters.join(", ")}]`);
  }
  lines.push("", "## Profiles", "");
  for (const [name, spec] of Object.entries(index.profiles)) {
    const bits = [
      spec.description ?? "",
      `args: ${(spec.args ?? []).join(" ") || "(none)"}`,
      spec.filters?.length ? `filters: ${spec.filters.join(", ")}` : "",
      spec.testNamePattern ? `-t: ${spec.testNamePattern}` : "",
      spec.preflight ? `preflight: ${spec.preflight}` : "",
      spec.env?.TZ ? `TZ: ${spec.env.TZ}` : "",
    ].filter(Boolean);
    lines.push(`- **${name}**: ${bits.join(" | ")}`);
  }
  lines.push("", "## Files", "");
  for (const f of index.files) {
    const tags = [f.discoveryPattern, f.suite, ...(f.concurrent ? ["concurrent"] : []), ...f.domains].join(", ");
    const filt = f.matchedFilters.length ? ` filters=[${f.matchedFilters.join(", ")}]` : "";
    lines.push(`- \`${f.path}\` (${tags})${filt}`);
    for (const d of f.describeBlocks) lines.push(`  - describe: ${d}`);
  }
  return lines.join("\n");
}
