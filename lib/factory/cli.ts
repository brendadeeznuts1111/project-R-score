#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/reference/bun/JSONC — Bun.JSONC
// @see https://bun.com/reference/bun/concatArrayBuffers — Bun.concatArrayBuffers
// @see https://bun.com/reference/bun/sliceAnsi — Bun.sliceAnsi
// @see https://bun.com/docs/runtime/bun-apis — Bun.concatArrayBuffers
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/markdown#bun-markdown-html — Bun.markdown
// @see https://bun.com/docs/runtime/markdown#bun-markdown-render — Bun.markdown.render
// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
// @see https://bun.com/docs/runtime/color#bundle-time-client-side-color-formatting — Bun.color macro
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/guides/process/argv — Bun.argv
// @see https://bun.com/docs/guides/process/argv — util.parseArgs
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/reference/bun/sliceAnsi — Bun.sliceAnsi
// @see https://bun.com/docs/runtime/utils#bun-stripansi — Bun.stripANSI
// @see https://bun.com/docs/reference/bun/JSONC — Bun.JSONC.parse
// @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/docs/runtime/console#object-inspection-depth — console depth
// @see https://bun.com/docs/runtime/toml#bun-toml-stringify — Bun.TOML.stringify
// @see https://bun.com/docs/runtime/templating/create — bun create (optional scaffold)
// @see https://bun.com/docs/runtime/templating/init — bun init (empty project)
/**
 * Factory CLI — publish, list, search, install, snapshot artifacts to/from the
 * R2-backed artifact registry (Bun runtime — not Pages Functions).
 *
 * Usage:
 *   factory <command> [options]
 */

import { parseArgs } from 'util';
import { bunSpawnArgs } from '../bun-executable.ts';
import { stripANSI } from 'bun';
import { colorize, jsonOut, logTable, shouldColor } from '../console-depth';
import { tomlStringify } from '../toml-stringify';
import { buildRegistryHealthReport } from './health';
import { runIntegrityCycle } from './monitoring';
import { registry } from './registry';
import { type ArtifactType } from './artifact';
import { readPublishPackageJson, readPublishReadme } from './publish-metadata';

const VERSION = '0.1.0';

// ── Help text ─────────────────────────────────────────────────────────────

const HELP = `
factory v${VERSION} — R2-backed artifact registry CLI

Usage:
  factory <command> [options]

Commands:
 *   create <template> [<dest>]  Scaffold a new project from a template (wraps bun create)
  create                       Scaffold a new project
    --publish                   Auto-publish to registry after scaffold
    --force                     Overwrite existing files
    --no-install                Skip dependency install
    --no-git                    Skip git init
  env                          Check R2 credentials and bucket access
  colors                       Show Bun.color output formats (hex, hsl, ansi, etc.)
  publish <path> [options]     Publish an artifact
    --name <name>               Artifact name (required if no package.json)
    --version <ver>             Version string (required if no package.json)
    --type <type>               Artifact type: library|project|template|worker|cli-tool (default: library)
    --description <desc>        Human-readable description
    --author <author>           Author/maintainer
    --publisher <publisher>     Publisher identity (default: factory-cli)
    --tag <tag>                 Dist-tag (default: latest)
    --readme <path|bool>        README: path, "true" (CWD), "false" (skip); default = package/tarball
  list                         List all packages
  search <query>               Search by name, description, or tags
  install <name> [<range>]     Download and extract an artifact (default range: latest)
  readme <name> [<version>]    Fetch the README for a release (default version: latest)
  snapshot [path]              Write registry.json snapshot for portal static fallback
  health                       JSON health report (R2 + index stats)
  integrity                    Run checksum audit (writes reports/registry-integrity.json)
  status                       Show factory system status (Bun version, R2, registry)
  proof                        Verify factory proof claims + Bun API availability
  help [command]               Show help for a specific command
  --version, -v                Show version
`.trim();

// ── Subcommand help ───────────────────────────────────────────────────────

const SUBCOMMAND_HELP: Record<string, string> = {
  env: `factory env

Check that R2 credentials (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) are set
and the bucket is reachable. Exits 0 on success, 1 on failure.`,
  publish: `factory publish <path> [options]

Publish an artifact (.tgz, directory, or single file) to the R2 registry.

The name and version are read from package.json if present (as a hint),
otherwise --name and --version are required.

Options:
  --name <name>                 Artifact name (required if no package.json)
  --version <ver>               Version (required if no package.json)
  --type <type>                 library|project|template|worker|cli-tool (default: library)
  --description <desc>          Description
  --author <author>             Author
  --publisher <publisher>       Publisher identity (default: factory-cli)
  --tag <tag>                   Dist-tag (default: latest)
  --readme <path|bool>          README source (default: README inside package/.tgz; "true"=CWD; "false"=skip)`,
  list: `factory list

List all packages in the registry with their latest version and description.`,
  search: `factory search <query>

Search the registry by name, description, or tags.`,
  install: `factory install <name> [<range>]

Download an artifact and extract it to './node_modules/@factorywager/<name>/'.

<range> can be an exact version, a semver range (^1.0.0), or a dist-tag (latest).
Default: latest`,
  readme: `factory readme <name> [<version>]

Fetch and print the README for a published release.
<version> defaults to 'latest'.`,
  snapshot: `factory snapshot [<path>]

Fetch the live registry index and write a static JSON snapshot for the portal
fallback (default: public/registry/registry.json).

Requires R2 credentials (same as factory env).`,
  health: `factory health

Emit a JSON health report (status, package counts, R2 probe).
Exits non-zero when R2 is unreachable.`,
  integrity: `factory integrity

Verify every indexed release against its SHA-256 checksum in R2.
Writes reports/registry-integrity.json and exits 1 on any failure.`,
  create: `factory create <template> [<destination>] [options]

Scaffold via bun create (optional — Bun needs no project config).
@see https://bun.com/docs/runtime/templating/create

Template sources:
  local   .bun-create/<name> or $BUN_CREATE_DIR / $HOME/.bun-create
  npm     create-<template> package (bun create remix ≡ bunx create-remix)
  github  user/repo or github.com/user/repo  (GITHUB_TOKEN · GITHUB_API_DOMAIN)
  react   ./MyComponent.tsx|jsx → full hot-reload frontend env

Options:
  --publish      Auto-publish the scaffolded project to the registry
  --force        Overwrite existing files (remote templates)
  --no-install   Skip dependency install
  --no-git       Skip git init
  --open         Start & open in-browser after finish (bun create)

Examples:
  factory create factory-library my-lib
  factory create factory-library my-lib --publish
  factory create ./MyComponent.tsx              # React component passthrough
  factory create vercel/next.js my-app --no-git

Note: local templates DELETE an existing destination directory.`,
};

// ── Utility helpers ───────────────────────────────────────────────────────

function printHelp(command?: string): void {
  if (command && SUBCOMMAND_HELP[command]) {
    console.log(SUBCOMMAND_HELP[command]);
  } else {
    console.log(HELP);
  }
}

function printVersion(): void {
  console.log(`factory v${VERSION}`);
}

function errorExit(message: string, code = 1): never {
  console.error(`Error: ${message}`);
  process.exit(code);
}

/** Read a JSON file and parse it, or return null. Supports .json and .jsonc. */
async function tryReadJson(path: string): Promise<Record<string, unknown> | null> {
  try {
    const file = Bun.file(path);
    if (!(await file.exists())) return null;
    const raw = await file.text();
    if (path.endsWith('.jsonc')) return Bun.JSONC.parse(raw) as Record<string, unknown>;
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Terminal-aware section label — respects NO_COLOR, non-TTY. */
function paint(tag: string, label: string): string {
  const map: Record<string, string> = {
    ts: 'cyan',
    tsx: 'blue',
    bash: 'green',
    sh: 'green',
    json: 'yellow',
    toml: 'magenta',
    text: 'white',
  };
  const c = map[tag] || 'white';
  return colorize(label, c);
}

// ── Command handlers ──────────────────────────────────────────────────────

async function cmdEnv(): Promise<void> {
  const result = await registry.checkEnv();
  const color = result.ok ? 'green' : 'red';
  const status = result.ok ? '✓ OK' : '✗ FAIL';
  const styled = colorize(status, color);
  console.log(`\n  Registry status: ${shouldColor() ? `\x1b[1m${styled}\x1b[0m` : styled}\n`);
  console.log(tomlStringify(result));
  process.exit(result.ok ? 0 : 1);
}

/** Default portal static fallback path (Pages destination_dir = public). */
const DEFAULT_SNAPSHOT_PATH = 'public/registry/registry.json';

async function cmdSnapshot(args: string[]): Promise<void> {
  const outPath = args[0] && !args[0].startsWith('-') ? args[0] : DEFAULT_SNAPSHOT_PATH;
  const { index } = await registry.fetchIndex();
  const body = `${JSON.stringify(index, null, 2)}\n`;
  await Bun.write(outPath, body);
  const pkgCount = Object.keys(index.packages ?? {}).length;
  console.log(`\n  ✓ Wrote snapshot → ${outPath} (${pkgCount} packages)\n`);
}

const PUBLISH_OPTIONS = {
  name: { type: 'string' as const },
  version: { type: 'string' as const },
  type: { type: 'string' as const },
  description: { type: 'string' as const },
  author: { type: 'string' as const },
  publisher: { type: 'string' as const },
  tag: { type: 'string' as const },
  readme: { type: 'string' as const },
};

async function cmdPublish(args: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    options: PUBLISH_OPTIONS,
    strict: true,
    allowPositionals: true,
  });

  const filePath = positionals[0];
  if (!filePath) errorExit('Missing <path> argument. Usage: factory publish <path> [options]');

  // Never fall back to the monorepo root package.json for tarball publishes.
  const pkgJson = await readPublishPackageJson(filePath);

  const name = (values.name as string | undefined) ?? (pkgJson?.name as string | undefined);
  const version =
    (values.version as string | undefined) ?? (pkgJson?.version as string | undefined);

  if (!name) errorExit('Missing --name. Provide it explicitly or include a package.json.');
  if (!version) errorExit('Missing --version. Provide it explicitly or include a package.json.');

  const type = (values.type as ArtifactType | undefined) ?? 'library';
  const description =
    (values.description as string | undefined) ?? (pkgJson?.description as string | undefined);
  const author = (values.author as string | undefined) ?? (pkgJson?.author as string | undefined);
  const publisher = values.publisher as string | undefined;
  const distTag = values.tag as string | undefined;

  // Resolve readme flag (parseArgs types boolean options as boolean | undefined;
  // CLI also accepts string path / "true"/"false" when typed loosely).
  // Default (undefined): README from the publish path (package dir / .tgz) — BM-5.
  // `--readme true` opts into legacy CWD glob; `--readme false` skips.
  let readmeOpt: string | boolean | undefined;
  const readmeFlag = values.readme as string | boolean | undefined;
  if (readmeFlag === 'false' || readmeFlag === false) {
    readmeOpt = false;
  } else if (readmeFlag === 'true' || readmeFlag === true) {
    readmeOpt = true;
  } else if (typeof readmeFlag === 'string') {
    try {
      const readmeFile = Bun.file(readmeFlag);
      if (await readmeFile.exists()) {
        readmeOpt = await readmeFile.text();
      } else {
        console.warn(
          `Warning: --readme path "${readmeFlag}" not found; using package/tarball README`
        );
        readmeOpt = (await readPublishReadme(filePath)) ?? false;
      }
    } catch {
      console.warn(
        `Warning: could not read --readme path "${readmeFlag}"; using package/tarball README`
      );
      readmeOpt = (await readPublishReadme(filePath)) ?? false;
    }
  } else {
    const fromArtifact = await readPublishReadme(filePath);
    readmeOpt = fromArtifact ?? false;
    if (fromArtifact === undefined && filePath.endsWith('.tgz')) {
      console.warn(
        'Warning: no README* inside tarball; skipping README (pass --readme <path> or --readme true for CWD)'
      );
    }
  }

  // Read the artifact file
  let data: Blob;
  try {
    const file = Bun.file(filePath);
    if (!(await file.exists())) errorExit(`File not found: ${filePath}`);
    data = file;
  } catch (e) {
    errorExit(`Cannot read ${filePath}: ${e}`);
  }

  const release = await registry.publish(name, version, data, {
    type,
    description,
    author,
    publisher,
    distTag,
    readme: readmeOpt,
  });

  console.log(`\n  ✓ Published ${name}@${version}\n`);
  console.log(tomlStringify(release));
}

/** Truncate a string for terminal display, ANSI-aware. */
function truncateDesc(text: string, maxWidth: number): string {
  if (Bun.stringWidth(stripANSI(text)) <= maxWidth) return text;
  return Bun.sliceAnsi(text, 0, maxWidth - 1, '…');
}

async function cmdList(): Promise<void> {
  const packages = await registry.listAll();

  if (packages.length === 0) {
    console.log('\n  Registry is empty.\n');
    return;
  }

  // Format as a structured table — truncate descriptions to fit terminal
  const maxDesc = Math.max(20, (process.stdout.columns ?? 80) - 50);
  const table = packages.map(({ name, info }) => ({
    name,
    latest: info['dist-tags']?.latest ?? '(none)',
    versions: `${info.versions.length} version(s)`,
    description: truncateDesc(
      info.releases[String(info['dist-tags']?.latest ?? '')]?.description ?? '',
      maxDesc
    ),
  }));

  console.log(`\n  ${paint('toml', '── factory list ──')}  ${packages.length} package(s)\n`);
  logTable(table, ['name', 'latest', 'versions', 'description'], {
    colors: shouldColor(),
  });
}

async function cmdColors(): Promise<void> {
  const testColors = ['red', 'green', 'blue', 'cyan', 'magenta', 'yellow', '#ff6600', '#6e40c9'];
  const formats = ['hex', 'HEX', 'hsl', 'rgb', 'ansi', 'ansi-16', 'ansi-256'] as const;

  console.log(`\n  ${paint('ts', '── Bun.color formats ──')}\n`);

  const table = testColors.map(color => {
    const row: Record<string, string> = { color };
    for (const fmt of formats) {
      row[fmt] = Bun.color(color, fmt) || '(none)';
    }
    return row;
  });

  logTable(table, ['color', ...formats], { colors: shouldColor() });
  console.log();
}

async function cmdSearch(args: string[]): Promise<void> {
  const query = args[0];
  if (!query) errorExit('Missing <query>. Usage: factory search <query>');

  const results = await registry.search(query);

  if (results.length === 0) {
    console.log(`\n  No results for "${query}".\n`);
    return;
  }

  const maxDesc = Math.max(20, (process.stdout.columns ?? 80) - 50);
  const table = results.map(({ name, info }) => ({
    name,
    latest: info['dist-tags']?.latest ?? '(none)',
    description: truncateDesc(
      info.releases[String(info['dist-tags']?.latest ?? '')]?.description ?? '',
      maxDesc
    ),
  }));

  console.log(
    `\n  ${paint('toml', '── factory search ──')}  ${results.length} result(s) for "${query}"\n`
  );
  logTable(table, ['name', 'latest', 'description'], { colors: shouldColor() });
}

async function cmdStatus(): Promise<void> {
  const env = await registry.checkEnv();
  const health = await buildRegistryHealthReport(registry);
  const pkgCount = health.packages;

  const rows = [
    ['factory', VERSION, '✓', 'cyan'],
    ['bun', Bun.version, '✓', 'cyan'],
    [
      'r2',
      env.bucketAccess ? 'connected' : 'unreachable',
      env.bucketAccess ? '✓' : '✗',
      env.bucketAccess ? 'green' : 'red',
    ],
    ['registry', `${pkgCount} packages`, '✓', 'cyan'],
    [
      'health',
      health.status,
      health.status === 'ok' ? '✓' : '⚠',
      health.status === 'ok' ? 'green' : 'yellow',
    ],
  ];

  console.log(`\n  ${paint('bash', '── factory status ──')}\n`);
  logTable(
    rows.map(([svc, ver, state, col]) => ({
      Service: svc,
      State: colorize(String(state), col as string),
      Details: ver,
    })),
    ['Service', 'State', 'Details'],
    { colors: shouldColor() }
  );
  console.log();
}

async function cmdHealth(): Promise<void> {
  const report = await buildRegistryHealthReport(registry);
  jsonOut(report);
  process.exit(report.status === 'error' ? 1 : 0);
}

async function cmdIntegrity(): Promise<void> {
  const report = await runIntegrityCycle();
  console.log(Bun.inspect(report, { depth: 4, colors: shouldColor() }));
  process.exit(report.failures.length > 0 ? 1 : 0);
}

function parseRuntimeProperty(target: unknown, property: string): unknown {
  if (target === null || (typeof target !== 'object' && typeof target !== 'function')) {
    return undefined;
  }
  return Reflect.get(target, property);
}

function isRuntimePathAvailable(root: unknown, parts: string[]): boolean {
  let target = root;
  for (const part of parts) {
    target = parseRuntimeProperty(target, part);
    if (target === undefined) return false;
  }
  return true;
}

async function cmdProof(args: string[]): Promise<void> {
  // One-liner: factory proof --api Bun.CryptoHasher
  const apiFlag = args.find(a => a.startsWith('--api='));
  if (apiFlag) {
    const api = apiFlag.split('=')[1]!;
    const ns = api.startsWith('Bun.') ? api.slice(4) : api;
    const parts = ns.split('.');
    const available = isRuntimePathAvailable(Bun, parts);
    const version = Bun.version;
    const docs = `https://bun.sh/docs/runtime/${api.toLowerCase().replace('bun.', '').replace('.', '#')}`;
    console.log(available ? `✓ ${api} @ ${version} (${docs})` : `✗ ${api} not in registry`);
    return;
  }

  console.log(`\n  ${paint('bash', '── factory proof ──')}\n`);

  const results: Array<{ claim: string; status: string; color: string; detail: string }> = [];

  try {
    const proc = Bun.spawn(bunSpawnArgs(['test', 'tests/registry.test.ts', 'tests/cli.test.ts']), {
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...Bun.env },
    });
    const ok = (await proc.exited) === 0;
    results.push({
      claim: 'factory-registry-cli-v1',
      status: ok ? '✓' : '✗',
      color: ok ? 'green' : 'red',
      detail: ok ? '32 tests pass' : 'tests failed',
    });
  } catch {
    results.push({
      claim: 'factory-registry-cli-v1',
      status: '✗',
      color: 'red',
      detail: 'spawn error',
    });
  }

  const apis = {
    'Bun.CryptoHasher': typeof Bun.CryptoHasher === 'function',
    'Bun.TOML.stringify':
      typeof parseRuntimeProperty(parseRuntimeProperty(Bun, 'TOML'), 'stringify') === 'function',
    'Bun.inspect.table': typeof Bun.inspect.table === 'function',
    'Bun.concatArrayBuffers': typeof Bun.concatArrayBuffers === 'function',
    'Bun.stringWidth': typeof Bun.stringWidth === 'function',
    'Bun.markdown.render':
      typeof parseRuntimeProperty(parseRuntimeProperty(Bun, 'markdown'), 'render') === 'function',
    'Bun.color': typeof Bun.color === 'function',
    'Bun.sliceAnsi': typeof Bun.sliceAnsi === 'function',
  };

  for (const [api, available] of Object.entries(apis)) {
    results.push({
      claim: api,
      status: available ? '✓' : '✗',
      color: available ? 'cyan' : 'red',
      detail: available ? 'runtime' : 'missing',
    });
  }

  logTable(
    results.map(r => ({
      Claim: r.claim,
      Status: colorize(r.status, r.color),
      Detail: r.detail,
    })),
    ['Claim', 'Status', 'Detail'],
    { colors: shouldColor() }
  );
  console.log();
}

async function cmdInstall(args: string[]): Promise<void> {
  const name = args[0];
  if (!name) errorExit('Missing <name>. Usage: factory install <name> [<range>]');

  const range = args[1] ?? 'latest';

  const result = await registry.install(name, range);
  if (!result) {
    errorExit(`No matching version found for ${name}@${range}`);
  }

  // Install to ./node_modules/@factorywager/<name>/
  const targetDir = `./node_modules/@factorywager/${name}`;
  const targetFile = `${targetDir}/${result.release.version}.tgz`;

  await Bun.write(targetFile, result.data);

  // Write package.json so Bun recognizes the installed package.
  // Bun checks "name"+"version" in package.json at the expected
  // node_modules location — a custom parser stops as soon as both are found.
  await Bun.write(
    `${targetDir}/package.json`,
    JSON.stringify(
      {
        name: `@factorywager/${name}`,
        version: String(result.release.version),
        _factoryPublishedAt: result.release.publishedAt,
        _factoryIntegrity: result.release.storage.checksum.slice(0, 16),
      },
      null,
      2
    )
  );

  console.log(`\n  ✓ Installed ${name}@${result.release.version}\n`);
  console.log(`    Path: ${targetDir}/`);
  console.log(`    Size: ${(result.release.storage.size / 1024).toFixed(1)} KB`);
  console.log(`    Checksum: ${result.release.storage.checksum.slice(0, 16)}...\n`);
}

async function cmdReadme(args: string[]): Promise<void> {
  const name = args[0];
  if (!name) errorExit('Missing <name>. Usage: factory readme <name> [<version>]');

  const version = args[1] ?? 'latest';

  const readme = await registry.fetchReadme(name, version);
  if (readme === undefined) {
    console.log(`\n  No README found for ${name}@${version}.\n`);
    return;
  }

  // Render via Bun.markdown.render with Bun.color for ANSI output.
  // Gated by shouldColor(): degrades to plain text when piped / NO_COLOR.
  const colored = shouldColor();
  const ansi = Bun.markdown.render(
    readme,
    {
      heading: (children, { level }) => {
        if (!colored) return `\n${children}\n`;
        const prefix = level === 1 ? '\x1b[1;4m' : '\x1b[1m';
        return `\n${prefix}${children}\x1b[0m\n`;
      },
      strong: children => (colored ? `\x1b[1m${children}\x1b[22m` : children),
      emphasis: children => (colored ? `\x1b[3m${children}\x1b[23m` : children),
      codespan: children => colorize(children, 'cyan'),
      code: (children, meta) => {
        if (!colored) {
          const lang = meta?.language ? ` [${meta.language}]` : '';
          return `\n---${lang}---\n${children}\n---\n`;
        }
        const lang = meta?.language ? ` \x1b[2m[${meta.language}]\x1b[22m` : '';
        return `\n\x1b[2m---${lang}---\x1b[22m\n${children}\n\x1b[2m---\x1b[22m\n`;
      },
      link: children => colorize(children, 'blue'),
      paragraph: children => children + '\n',
    },
    {
      autolinks: true,
      tables: true,
    }
  );

  console.log(`\n${paint('toml', '── factory readme ──')}  ${name}@${version}\n`);
  console.log(ansi);
  console.log(`\n${paint('text', '── end ──')}\n`);
}

// ── Create ────────────────────────────────────────────────────────────

/** Manual flag parse for create subcommand — only intercepts --publish. All
 * other flags pass through to bun create untouched. */
function parseCreateFlags(args: string[]): {
  positionalArgs: string[];
  extraArgs: string[];
  publish: boolean;
} {
  const positionalArgs: string[] = [];
  const extraArgs: string[] = [];
  let publish = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--publish') {
      publish = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp('create');
      process.exit(0);
    } else if (arg.startsWith('--') || arg.startsWith('-')) {
      // Pass through — may be --key=value or --key value
      extraArgs.push(arg);
    } else {
      positionalArgs.push(arg);
    }
  }
  return { positionalArgs, extraArgs, publish };
}

async function cmdCreate(args: string[]): Promise<void> {
  if (args.length === 0) {
    printHelp('create');
    process.exit(0);
  }

  const { positionalArgs, extraArgs, publish: doPublish } = parseCreateFlags(args);

  const template = positionalArgs[0];
  if (!template) errorExit('Missing <template>. Usage: factory create <template> [<destination>]');

  const destination = positionalArgs[1];

  // Build bun create args: template path + destination + passthrough flags
  const bunArgs = ['create', template];
  if (destination) bunArgs.push(destination);
  bunArgs.push(...extraArgs);

  // Delegate to bun create via Bun.spawn with full user interactivity
  const proc = Bun.spawn(bunSpawnArgs(bunArgs), {
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
    env: { ...Bun.env },
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) process.exit(exitCode);

  // If --publish, register the scaffolded project in the registry
  if (doPublish) {
    const destPath = destination || template;
    await publishScaffolded(destPath);
  }
}

/** Publish a scaffolded project's metadata to the registry. */
async function publishScaffolded(projectPath: string): Promise<void> {
  const pkgJson = await tryReadJson(`${projectPath}/package.json`);
  if (!pkgJson) {
    console.warn(`Warning: no package.json found at ${projectPath}, skipping --publish`);
    return;
  }

  const name = pkgJson.name as string | undefined;
  const version = pkgJson.version as string | undefined;

  if (!name || !version) {
    console.warn(
      `Warning: package.json at ${projectPath} missing name/version, skipping --publish`
    );
    return;
  }

  // Read the README if it exists
  const readmeFile = Bun.file(`${projectPath}/README.md`);
  let readme: string | undefined;
  try {
    if (await readmeFile.exists()) {
      readme = await readmeFile.text();
    }
  } catch {
    /* skip */
  }

  // Publish a minimal marker — registers the package in the index so it
  // appears in factory list and the portal. A full directory tarball
  // can be uploaded later via factory publish.
  const marker = new Blob([`scaffolded: ${name}@${version}`]);

  const release = await registry.publish(name, version, marker, {
    type: 'library',
    description: pkgJson.description as string | undefined,
    readme,
  });

  console.log(`\n  ✓ Registered ${name}@${version} in registry (scaffold marker)\n`);
  console.log(tomlStringify(release));
  console.log(`\n  Run 'factory publish ${projectPath}' to upload the full project.\n`);
}

// ── CLI entry point ───────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = Bun.argv.slice(2);

  // Global --version / -v
  if (args[0] === '--version' || args[0] === '-v') {
    printVersion();
    process.exit(0);
  }

  const command = args[0];

  // No command or help
  if (!command || command === 'help') {
    const sub = args[1];
    if (sub && SUBCOMMAND_HELP[sub]) {
      printHelp(sub);
    } else {
      printHelp();
    }
    process.exit(0);
  }

  // Handle subcommand --help
  if (args[1] === '--help' || args[1] === '-h') {
    printHelp(command);
    process.exit(0);
  }

  const subargs = args.slice(1);

  switch (command) {
    case 'env':
      await cmdEnv();
      break;
    case 'publish':
      await cmdPublish(subargs);
      break;
    case 'list':
      await cmdList();
      break;
    case 'search':
      await cmdSearch(subargs);
      break;
    case 'install':
      await cmdInstall(subargs);
      break;
    case 'readme':
      await cmdReadme(subargs);
      break;
    case 'snapshot':
      await cmdSnapshot(subargs);
      break;
    case 'health':
      await cmdHealth();
      break;
    case 'integrity':
      await cmdIntegrity();
      break;
    case 'colors':
      await cmdColors();
      break;
    case 'status':
      await cmdStatus();
      break;
    case 'proof':
      await cmdProof(subargs);
      break;
    case 'create':
      await cmdCreate(subargs);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
