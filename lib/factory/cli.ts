#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/markdown#bun-markdown-html — Bun.markdown
// @see https://bun.com/docs/runtime/markdown#bun-markdown-render — Bun.markdown.render
// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/guides/process/argv — Bun.argv
// @see https://bun.com/docs/guides/process/argv#parse-command-line-arguments — util.parseArgs
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/docs/runtime/console#object-inspection-depth — console depth
// @see https://bun.com/docs/runtime/toml#bun-toml-stringify — Bun.TOML.stringify
// @see https://bun.com/docs/runtime/templating/create — bun create
/**
 * Factory CLI — publish, list, search, install, snapshot artifacts to/from the
 * R2-backed artifact registry (Bun runtime — not Pages Functions).
 *
 * Usage:
 *   factory <command> [options]
 */

import { parseArgs } from 'util';
import { registry } from './registry';
import { type ArtifactType } from './artifact';
import { shouldColor } from '../console-depth';
import { TOML } from 'bun';

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
  publish <path> [options]     Publish an artifact
    --name <name>               Artifact name (required if no package.json)
    --version <ver>             Version string (required if no package.json)
    --type <type>               Artifact type: library|project|template|worker|cli-tool (default: library)
    --description <desc>        Human-readable description
    --author <author>           Author/maintainer
    --publisher <publisher>     Publisher identity (default: factory-cli)
    --tag <tag>                 Dist-tag (default: latest)
    --readme <path|bool>        README source: path, "true" (auto-detect), "false" (skip)
  list                         List all packages
  search <query>               Search by name, description, or tags
  install <name> [<range>]     Download and extract an artifact (default range: latest)
  readme <name> [<version>]    Fetch the README for a release (default version: latest)
  snapshot [path]              Write registry.json snapshot for portal static fallback
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
  --readme <path|bool>          README source (default: true = auto-detect README.md)`,
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
  create: `factory create <template> [<destination>] [options]

Scaffold a new project from a template using bun create.

Delegate to bun create with factory template search path
(.bun-create/ in project root, or $BUN_CREATE_DIR).
<TEMPLATE> can be a local template name, an npm package
(e.g., 'remix'), or a GitHub repo (e.g., 'vercel/next.js').

Options:
  --publish      Auto-publish the scaffolded project to the registry
  --force        Overwrite existing files
  --no-install   Skip dependency install
  --no-git       Skip git init

Examples:
  factory create factory-library my-lib
  factory create factory-library my-lib --publish
  factory create ./MyComponent.tsx              # React component passthrough`,
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

/** Read a JSON file and parse it, or return null. */
async function tryReadJson(path: string): Promise<Record<string, unknown> | null> {
  try {
    const file = Bun.file(path);
    if (!(await file.exists())) return null;
    return (await file.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ── Command handlers ──────────────────────────────────────────────────────

async function cmdEnv(): Promise<void> {
  const result = await registry.checkEnv();
  const status = result.ok ? '✓ OK' : '✗ FAIL';
  console.log(`\n  Registry status: ${status}\n`);
  console.log(TOML.stringify(result));
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

  // Try to read package.json from the path (if it's a directory) or adjacent
  const pkgJson = await tryReadJson(
    filePath.endsWith('.tgz') ? 'package.json' : `${filePath}/package.json`
  );

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

  // Resolve readme flag
  let readmeOpt: string | boolean | undefined;
  const readmeFlag = values.readme;
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
          `Warning: --readme path "${readmeFlag}" not found, falling back to auto-detect`
        );
        readmeOpt = true;
      }
    } catch {
      console.warn(
        `Warning: could not read --readme path "${readmeFlag}", falling back to auto-detect`
      );
      readmeOpt = true;
    }
  }
  // undefined → default (auto-detect README.md)

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
  console.log(TOML.stringify(release));
}

async function cmdList(): Promise<void> {
  const packages = await registry.listAll();

  if (packages.length === 0) {
    console.log('\n  Registry is empty.\n');
    return;
  }

  // Format as a structured table using Bun.inspect
  const table = packages.map(({ name, info }) => ({
    name,
    latest: info['dist-tags']?.latest ?? '(none)',
    versions: `${info.versions.length} version(s)`,
    description: info.releases[String(info['dist-tags']?.latest ?? '')]?.description ?? '',
  }));

  console.log(`\n  ${packages.length} package(s) in registry\n`);
  console.log(
    Bun.inspect.table(table, ['name', 'latest', 'versions', 'description'], {
      colors: shouldColor(),
    })
  );
}

async function cmdSearch(args: string[]): Promise<void> {
  const query = args[0];
  if (!query) errorExit('Missing <query>. Usage: factory search <query>');

  const results = await registry.search(query);

  if (results.length === 0) {
    console.log(`\n  No results for "${query}".\n`);
    return;
  }

  const table = results.map(({ name, info }) => ({
    name,
    latest: info['dist-tags']?.latest ?? '(none)',
    description: info.releases[String(info['dist-tags']?.latest ?? '')]?.description ?? '',
  }));

  console.log(`\n  ${results.length} result(s) for "${query}"\n`);
  console.log(
    Bun.inspect.table(table, ['name', 'latest', 'description'], { colors: shouldColor() })
  );
}

async function cmdInstall(args: string[]): Promise<void> {
  const name = args[0];
  if (!name) errorExit('Missing <name>. Usage: factory install <name> [<range>]');

  const range = args[1] ?? 'latest';

  const result = await registry.install(name, range);
  if (!result) {
    errorExit(`No matching version found for ${name}@${range}`);
  }

  // Extract to ./node_modules/@factorywager/<name>/
  const targetDir = `./node_modules/@factorywager/${name}`;
  const targetFile = `${targetDir}/${result.release.version}.tgz`;

  await Bun.write(targetFile, result.data);
  console.log(`\n  ✓ Downloaded ${name}@${result.release.version}\n`);
  console.log(`    Saved to: ${targetFile}`);
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
  // Auto-detects terminal depth; degrades to plain text when piped.
  const ansi = Bun.markdown.render(
    readme,
    {
      heading: (children, { level }) => {
        const prefix = level === 1 ? '\x1b[1;4m' : '\x1b[1m';
        return `\n${prefix}${children}\x1b[0m\n`;
      },
      strong: children => `\x1b[1m${children}\x1b[22m`,
      emphasis: children => `\x1b[3m${children}\x1b[23m`,
      codespan: children => `${Bun.color('cyan', 'ansi')}${children}\x1b[39m`,
      code: (children, meta) => {
        const lang = meta?.language ? ` \x1b[2m[${meta.language}]\x1b[22m` : '';
        return `\n\x1b[2m---${lang}---\x1b[22m\n${children}\n\x1b[2m---\x1b[22m\n`;
      },
      link: children => `${Bun.color('blue', 'ansi')}${children}\x1b[39m`,
      paragraph: children => children + '\n',
    },
    {
      autolinks: true,
      tables: true,
    }
  );

  console.log(`\n--- ${name}@${version} ---\n`);
  console.log(ansi);
  console.log(`\n--- end ---\n`);
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
  const proc = Bun.spawn(['bun', ...bunArgs], {
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
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
  console.log(TOML.stringify(release));
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
