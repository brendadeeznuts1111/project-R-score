#!/usr/bin/env bun

// @see https://bun.com/reference/bun/argv — Bun.argv
// @updated Bun.argv · changed v0.6.10 · 2023-06-26 · https://bun.com/blog/bun-v0.6.10
// @verified Bun.argv · Bun v1.4.0 · 2026-08-25 · https://bun.com/reference/bun/argv
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @updated Bun.CryptoHasher · changed v0.5.0 · 2023-01-18 · https://bun.com/blog/bun-v0.5.0
// @updated Bun.CryptoHasher · fixed v1.0.19 · 2023-12-22 · https://bun.com/blog/bun-v1.0.19
// @updated Bun.CryptoHasher · changed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.CryptoHasher · fixed v1.1.11 · 2024-06-01 · https://bun.com/blog/bun-v1.1.11
// @updated Bun.CryptoHasher · fixed v1.1.32 · 2024-10-21 · https://bun.com/blog/bun-v1.1.32
// @updated Bun.CryptoHasher · fixed v1.1.35 · 2024-11-19 · https://bun.com/blog/bun-v1.1.35
// @verified Bun.CryptoHasher · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/hashing#bun-cryptohasher
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @updated Bun.Glob · fixed v1.0.27 · 2024-02-17 · https://bun.com/blog/bun-v1.0.27
// @updated Bun.Glob · fixed v1.0.28 · 2024-02-19 · https://bun.com/blog/bun-v1.0.28
// @updated Bun.Glob · fixed v1.0.29 · 2024-02-23 · https://bun.com/blog/bun-v1.0.29
// @updated Bun.Glob · fixed v1.0.30 · 2024-03-04 · https://bun.com/blog/bun-v1.0.30
// @updated Bun.Glob · fixed v1.1.5 · 2024-04-26 · https://bun.com/blog/bun-v1.1.5
// @updated Bun.Glob · changed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.Glob · fixed v1.2.3 · 2025-02-22 · https://bun.com/blog/bun-v1.2.3
// @updated Bun.Glob · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.Glob · fixed v1.3.7 · 2026-01-27 · https://bun.com/blog/bun-v1.3.7
// @updated Bun.Glob · changed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @updated Bun.Glob · fixed v1.3.14 · 2026-05-13 · https://bun.com/blog/bun-v1.3.14
// @verified Bun.Glob · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/glob#quickstart
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @updated Bun.write · fixed v0.4.0 · 2022-12-23 · https://bun.com/blog/bun-v0.4.0
// @updated Bun.write · fixed v0.6.10 · 2023-06-26 · https://bun.com/blog/bun-v0.6.10
// @updated Bun.write · fixed v0.7.2 · 2023-08-03 · https://bun.com/blog/bun-v0.7.2
// @updated Bun.write · fixed v1.0.7 · 2023-10-20 · https://bun.com/blog/bun-v1.0.7
// @updated Bun.write · changed v1.0.16 · 2023-12-10 · https://bun.com/blog/bun-v1.0.16
// @updated Bun.write · fixed v1.0.21 · 2024-01-02 · https://bun.com/blog/bun-v1.0.21
// @updated Bun.write · fixed v1.0.23 · 2024-01-16 · https://bun.com/blog/bun-v1.0.23
// @updated Bun.write · fixed v1.0.24 · 2024-01-20 · https://bun.com/blog/bun-v1.0.24
// @updated Bun.write · changed v1.1.0 · 2024-04-01 · https://bun.com/blog/bun-v1.1
// @updated Bun.write · fixed v1.1.6 · 2024-04-28 · https://bun.com/blog/bun-v1.1.6
// @updated Bun.write · fixed v1.1.21 · 2024-07-27 · https://bun.com/blog/bun-v1.1.21
// @updated Bun.write · changed v1.1.37 · 2024-11-26 · https://bun.com/blog/bun-v1.1.37
// @updated Bun.write · changed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.write · fixed v1.2.8 · 2025-03-31 · https://bun.com/blog/bun-v1.2.8
// @updated Bun.write · fixed v1.2.20 · 2025-08-10 · https://bun.com/blog/bun-v1.2.20
// @updated Bun.write · fixed v1.3.0 · 2025-10-10 · https://bun.com/blog/bun-v1.3
// @updated Bun.write · fixed v1.3.5 · 2025-12-17 · https://bun.com/blog/bun-v1.3.5
// @updated Bun.write · fixed v1.3.6 · 2026-01-13 · https://bun.com/blog/bun-v1.3.6
// @updated Bun.write · fixed v1.3.12 · 2026-04-09 · https://bun.com/blog/bun-v1.3.12
// @verified Bun.write · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/file-io#writing-files-bun-write
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @verified Bun.file · Bun v1.4.0 · 2026-08-25 · https://bun.com/docs/runtime/file-io
import ts from 'typescript';
import { relativePath } from '../lib/path-bun.ts';
import { compareSubprocessInventory } from '../lib/security/subprocess-consumer-inventory.ts';

const ROOT = new URL('../', import.meta.url).pathname;
const MANIFEST_PATH = `${ROOT}scripts/subprocess-authority-inventory.json`;
const OWNERSHIP_MANIFEST_PATH = `${ROOT}config/subprocess-consumer-ownership.json`;
const SCAN_ROOTS = ['lib', 'packages', 'scripts', 'tools'] as const;

type AuthorityClass =
  | 'guarded-authority-primitive'
  | 'guarded-process-consumer'
  | 'guarded-registry-consumer'
  | 'intentional-native-probe'
  | 'typed-registry-planner'
  | 'raw-bun-package-manager-probe'
  | 'raw-bun-runtime-tooling'
  | 'non-bun-utility'
  | 'dynamic-process-boundary';

type InventoryEntry = {
  readonly id: string; // brand-ok — opaque, deterministic inventory identity
  readonly file: string;
  readonly callee:
    | 'Bun.spawn'
    | 'Bun.spawnSync'
    | 'spawnGuardedBunChild'
    | 'spawnGuardedBunChildSync'
    | 'spawnRegistryCommandPlan'
    | 'spawnRegistryCommandPlanSync';
  readonly authority: AuthorityClass;
  readonly expressionHash: string;
  readonly controlSpellings: readonly string[];
  readonly exception?: { readonly owner: string; readonly reason: string };
  readonly review?: {
    readonly owner: string;
    readonly executable: string;
    readonly args: string;
    readonly cwd: string;
    readonly environment: string;
    readonly stdio: string;
    readonly network: string;
    readonly offline: string;
    readonly flagPassthrough: string;
    readonly defaultDeny: true;
    readonly reason: string;
  };
};

const INVENTORIED_CONTROL_SPELLINGS = [
  '--registry',
  '--connect',
  '-O',
  '-R',
  '--experimental-http2-fetch',
  '--experimental-http3-fetch',
  '-r',
  '--preload',
  '--require',
  '--import',
] as const;

type InventoryManifest = {
  readonly schema: 'factorywager.subprocess-authority-inventory.v1';
  readonly entries: readonly InventoryEntry[];
};

type OwnershipProfile = {
  readonly executable: string;
  readonly args: string;
  readonly cwd: string;
  readonly environment: string;
  readonly stdio: string;
  readonly network: string;
  readonly offline: string;
  readonly flagPassthrough: string;
  readonly defaultDeny: boolean;
  readonly enforcement: 'guarded' | 'unowned';
};

type OwnershipManifest = {
  readonly schema: 'factorywager.subprocess-consumer-ownership.v1';
  readonly scopePrefixes: readonly string[];
  readonly profiles: Readonly<Record<string, OwnershipProfile>>;
  readonly entries: ReadonlyArray<{
    readonly id: string; // brand-ok — opaque structural inventory identity
    readonly owner: string;
    readonly profile: string;
  }>;
};

function sha256(value: string): string {
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(value);
  return hasher.digest('hex');
}

function spawnCallee(node: ts.CallExpression): InventoryEntry['callee'] | undefined {
  if (ts.isIdentifier(node.expression)) {
    if (node.expression.text === 'spawnGuardedBunChild') return 'spawnGuardedBunChild';
    if (node.expression.text === 'spawnGuardedBunChildSync') return 'spawnGuardedBunChildSync';
    if (node.expression.text === 'spawnRegistryCommandPlan') return 'spawnRegistryCommandPlan';
    if (node.expression.text === 'spawnRegistryCommandPlanSync') {
      return 'spawnRegistryCommandPlanSync';
    }
  }
  if (!ts.isPropertyAccessExpression(node.expression)) return undefined;
  if (!ts.isIdentifier(node.expression.expression) || node.expression.expression.text !== 'Bun') {
    return undefined;
  }
  if (node.expression.name.text === 'spawn') return 'Bun.spawn';
  if (node.expression.name.text === 'spawnSync') return 'Bun.spawnSync';
  return undefined;
}

function firstLiteralCommand(node: ts.CallExpression): string | undefined {
  const first = node.arguments[0];
  if (!first || !ts.isArrayLiteralExpression(first)) return undefined;
  const command = first.elements[0];
  return command && ts.isStringLiteralLike(command) ? command.text : undefined;
}

function classifyCall(
  file: string,
  node: ts.CallExpression,
  source: ts.SourceFile,
  printed: string
): AuthorityClass {
  const sourceWithComments = source.text.slice(node.getFullStart(), node.end);
  if (
    ts.isIdentifier(node.expression) &&
    (node.expression.text === 'spawnRegistryCommandPlan' ||
      node.expression.text === 'spawnRegistryCommandPlanSync')
  ) {
    return 'guarded-registry-consumer';
  }
  if (
    ts.isIdentifier(node.expression) &&
    (node.expression.text === 'spawnGuardedBunChild' ||
      node.expression.text === 'spawnGuardedBunChildSync')
  ) {
    return 'guarded-process-consumer';
  }
  if (file === 'lib/security/guarded-bun-process.ts') return 'guarded-authority-primitive';
  if (sourceWithComments.includes('subprocess-native-probe-reviewed')) {
    return 'intentional-native-probe';
  }
  if (sourceWithComments.includes('registry-command-plan-reviewed'))
    return 'typed-registry-planner';
  const command = firstLiteralCommand(node);
  const bunLaunch =
    command === 'bun' ||
    printed.includes('bunSpawnArgs(') ||
    printed.includes('process.execPath') ||
    /\b(?:bunPath|bunBin|bunExecutable|bunArgs)\b/.test(printed);
  if (bunLaunch && /['"](?:install|info|publish)['"]/.test(printed)) {
    return 'raw-bun-package-manager-probe';
  }
  if (command && command !== 'bun') return 'non-bun-utility';
  if (bunLaunch) {
    return 'raw-bun-runtime-tooling';
  }
  return 'dynamic-process-boundary';
}

function nativeProbeException(sourceWithComments: string): InventoryEntry['exception'] | undefined {
  const match = sourceWithComments.match(
    /subprocess-native-probe-reviewed\s+owner=([^\s]+)\s+reason="([^"]+)"/
  );
  return match?.[1] && match[2] ? { owner: match[1], reason: match[2] } : undefined;
}

function guardedConsumerReview(sourceWithComments: string): InventoryEntry['review'] | undefined {
  const match = sourceWithComments.match(
    /guarded-process-consumer-reviewed\s+owner=([^\s]+)\s+executable=([^\s]+)\s+args=([^\s]+)\s+cwd=([^\s]+)\s+env=([^\s]+)\s+stdio=([^\s]+)\s+network=([^\s]+)\s+offline=([^\s]+)\s+flags=([^\s]+)\s+defaultDeny=true\s+reason="([^"]+)"/
  );
  if (!match?.[1] || !match[10]) return undefined;
  return {
    owner: match[1],
    executable: match[2]!,
    args: match[3]!,
    cwd: match[4]!,
    environment: match[5]!,
    stdio: match[6]!,
    network: match[7]!,
    offline: match[8]!,
    flagPassthrough: match[9]!,
    defaultDeny: true,
    reason: match[10],
  };
}

function controlSpellings(node: ts.CallExpression, authority: AuthorityClass): readonly string[] {
  if (authority === 'non-bun-utility') return [];
  if (
    ts.isIdentifier(node.expression) &&
    (node.expression.text === 'spawnRegistryCommandPlan' ||
      node.expression.text === 'spawnRegistryCommandPlanSync')
  ) {
    return ['--registry'];
  }
  const discovered = new Set<string>();
  const visit = (child: ts.Node): void => {
    if (ts.isStringLiteralLike(child) || ts.isNoSubstitutionTemplateLiteral(child)) {
      for (const spelling of INVENTORIED_CONTROL_SPELLINGS) {
        if (child.text === spelling || child.text.startsWith(`${spelling}=`)) {
          discovered.add(spelling);
        }
      }
    }
    if (ts.isTemplateExpression(child)) {
      for (const spelling of INVENTORIED_CONTROL_SPELLINGS) {
        if (child.head.text === spelling || child.head.text.startsWith(`${spelling}=`)) {
          discovered.add(spelling);
        }
      }
    }
    ts.forEachChild(child, visit);
  };
  visit(node);
  return INVENTORIED_CONTROL_SPELLINGS.filter(spelling => discovered.has(spelling));
}

async function currentInventory(): Promise<readonly InventoryEntry[]> {
  const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });
  const entries: InventoryEntry[] = [];
  const duplicateCount = new Map<string, number>();
  for (const scanRoot of SCAN_ROOTS) {
    const glob = new Bun.Glob('**/*.ts');
    const files: string[] = [];
    for await (const absolutePath of glob.scan({ cwd: `${ROOT}${scanRoot}`, absolute: true })) {
      files.push(absolutePath);
    }
    for (const absolutePath of files.sort()) {
      const file = relativePath(ROOT, absolutePath);
      const text = await Bun.file(absolutePath).text();
      const source = ts.createSourceFile(
        file,
        text,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS
      );
      const visit = (node: ts.Node): void => {
        if (ts.isCallExpression(node)) {
          const callee = spawnCallee(node);
          if (callee) {
            const sourceWithComments = source.text.slice(node.getFullStart(), node.end);
            const printed = printer.printNode(ts.EmitHint.Expression, node, source);
            const expressionHash = sha256(printed);
            const duplicateKey = `${file}\0${callee}\0${expressionHash}`;
            const ordinal = (duplicateCount.get(duplicateKey) ?? 0) + 1;
            duplicateCount.set(duplicateKey, ordinal);
            const authority = classifyCall(file, node, source, printed);
            const exception = nativeProbeException(sourceWithComments);
            const review = guardedConsumerReview(sourceWithComments);
            if (authority === 'intentional-native-probe' && !exception) {
              throw new TypeError(
                `${file} native probe requires exact owner and quoted reason on its reviewed marker`
              );
            }
            if (authority === 'guarded-process-consumer' && !review) {
              throw new TypeError(
                `${file} guarded process consumer requires an exact guarded-process-consumer-reviewed marker`
              );
            }
            entries.push({
              id: `${file}#${callee}#${expressionHash.slice(0, 16)}#${ordinal}`,
              file,
              callee,
              authority,
              expressionHash,
              controlSpellings: controlSpellings(node, authority),
              ...(exception ? { exception } : {}),
              ...(review ? { review } : {}),
            });
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
  }
  return entries.sort((left, right) => left.id.localeCompare(right.id));
}

function summarize(entries: readonly InventoryEntry[]): string {
  const counts = new Map<AuthorityClass, number>();
  for (const entry of entries) counts.set(entry.authority, (counts.get(entry.authority) ?? 0) + 1);
  const classes = [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([authority, count]) => `${authority}=${count}`)
    .join(', ');
  const unowned = entries.filter(entry =>
    [
      'dynamic-process-boundary',
      'raw-bun-package-manager-probe',
      'raw-bun-runtime-tooling',
      'typed-registry-planner',
    ].includes(entry.authority)
  ).length;
  const controls = Object.entries(
    Object.groupBy(
      entries.flatMap(entry => entry.controlSpellings),
      spelling => spelling
    )
  )
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([spelling, values]) => `${spelling}=${values?.length ?? 0}`)
    .join(', ');
  return `${classes}, unowned=${unowned}, controls=[${controls || 'none'}]`;
}

async function assertReviewedOwnership(entries: readonly InventoryEntry[]): Promise<void> {
  const ownership = (await Bun.file(OWNERSHIP_MANIFEST_PATH).json()) as OwnershipManifest;
  if (ownership.schema !== 'factorywager.subprocess-consumer-ownership.v1') {
    throw new TypeError(`Unsupported subprocess consumer ownership schema: ${ownership.schema}`);
  }
  const scoped = entries.filter(entry =>
    ownership.scopePrefixes.some(prefix => entry.file.startsWith(prefix))
  );
  const reviewedById = new Map(ownership.entries.map(entry => [entry.id, entry]));
  if (reviewedById.size !== ownership.entries.length) {
    throw new TypeError('Subprocess consumer ownership manifest has duplicate entries');
  }
  const discoveredIds = new Set(scoped.map(entry => entry.id));
  const issues = [
    ...scoped.filter(entry => !reviewedById.has(entry.id)).map(entry => `unreviewed: ${entry.id}`),
    ...ownership.entries
      .filter(entry => !discoveredIds.has(entry.id))
      .map(entry => `stale: ${entry.id}`),
  ];
  for (const entry of ownership.entries) {
    const profile = ownership.profiles[entry.profile];
    if (!entry.owner.trim()) issues.push(`owner missing: ${entry.id}`);
    if (!profile) {
      issues.push(`profile missing: ${entry.id} -> ${entry.profile}`);
      continue;
    }
    const strings = [
      profile.executable,
      profile.args,
      profile.cwd,
      profile.environment,
      profile.stdio,
      profile.network,
      profile.offline,
      profile.flagPassthrough,
    ];
    if (strings.some(value => !value.trim())) issues.push(`authority field missing: ${entry.id}`);
    const discovered = scoped.find(candidate => candidate.id === entry.id);
    if (!discovered) continue;
    if (profile.enforcement === 'guarded') {
      if (discovered.authority !== 'guarded-process-consumer' || !profile.defaultDeny) {
        issues.push(`guarded posture mismatch: ${entry.id}`);
      }
      if (discovered.review?.owner !== entry.owner)
        issues.push(`guarded owner mismatch: ${entry.id}`);
    } else {
      if (profile.defaultDeny)
        issues.push(`unowned posture cannot claim default deny: ${entry.id}`);
      if (
        ![
          'dynamic-process-boundary',
          'raw-bun-package-manager-probe',
          'raw-bun-runtime-tooling',
          'typed-registry-planner',
        ].includes(discovered.authority)
      ) {
        issues.push(`unowned classification mismatch: ${entry.id}`);
      }
    }
  }
  if (issues.length > 0) {
    throw new TypeError(`Subprocess consumer ownership drift:\n${issues.join('\n')}`);
  }
}

const entries = await currentInventory();
await assertReviewedOwnership(entries);
const manifest: InventoryManifest = {
  schema: 'factorywager.subprocess-authority-inventory.v1',
  entries,
};

if (Bun.argv.includes('--write')) {
  await Bun.write(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.info(`subprocess authority inventory: wrote ${entries.length} exact calls`);
  console.info(summarize(entries));
  process.exit(0);
}

const expected = (await Bun.file(MANIFEST_PATH).json()) as InventoryManifest;
const comparison = compareSubprocessInventory(entries, expected.entries);
const metadataDrift = entries.filter(entry => {
  const prior = expected.entries.find(candidate => candidate.id === entry.id);
  return prior && JSON.stringify(prior) !== JSON.stringify(entry);
});
if (
  expected.schema !== manifest.schema ||
  comparison.additions.length ||
  comparison.removals.length ||
  comparison.classificationChanges.length ||
  metadataDrift.length
) {
  throw new Error(
    [
      'Subprocess authority inventory drifted; additions and removals require explicit review.',
      ...comparison.additions.map(id => `+ ${id}`),
      ...comparison.removals.map(id => `- ${id}`),
      ...comparison.classificationChanges.map(change => `~ ${change}`),
      ...metadataDrift.map(entry => `~ ${entry.id} [metadata]`),
      'After review: bun scripts/check-subprocess-policy.ts --write',
    ].join('\n')
  );
}

if (Bun.argv.includes('--list')) {
  for (const entry of entries) console.info(`${entry.authority}\t${entry.id}`);
}
console.info(
  `subprocess authority inventory: ok (${entries.length} exact calls; ${summarize(entries)})`
);
