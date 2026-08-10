// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — CryptoHasher
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/glob — Bun.Glob
/**
 * Offline soft-pass for Tennis HQ `@tennis-hq/ssot`:
 * build → check → pack → bake `/registry/ssot-flow-soft.json`.
 *
 * No publish. Version bumps stay operator-controlled in the Tennis HQ checkout.
 *
 * @see docs/harness/tenants/tennis-hq-registry.md
 */
import { CryptoHasher, revision, version } from 'bun';
import { resolveBunExecutable } from '../bun-executable.ts';
import { joinPath, resolvePath } from '../path-bun.ts';
import {
  PUBLISH_SSOT_FLOW_SOFT_CONCEPT_ID,
  publishPlaneColorForConcept,
  publishPlaneModeConceptId,
  type PublishPlaneColorBlock,
} from './publish-plane-color.ts';

export const SSOT_FLOW_SOFT_SCHEMA = 'factorywager.ssot-flow-soft.v1' as const;
/** Stable machine id (slug) — not the human title. */
export const SSOT_FLOW_SOFT_ARTIFACT_ID = 'ssot-flow-soft' as const;
/** Human title — never used as a key. */
export const SSOT_FLOW_SOFT_ARTIFACT_NAME = 'SSOT soft-pass' as const;
export const SSOT_FLOW_SOFT_PLANE = 'publish' as const;
export const SSOT_FLOW_SOFT_PURPOSE = 'audit' as const;
export const SSOT_FLOW_SOFT_CLI = 'bun run ssot:flow:soft' as const;
export const SSOT_FLOW_SOFT_REL = 'public/registry/ssot-flow-soft.json' as const;
export const SSOT_FLOW_SOFT_REPORT_PATH = '/registry/ssot-flow-soft.json' as const;
export const SSOT_FLOW_SOFT_BOARD_PATH = '/portal/packages/' as const;
export const SSOT_FLOW_SOFT_WEAVE_PATH = '/registry/portal-weave.json' as const;
export const TENNIS_HQ_ROOT_ENV = 'TENNIS_HQ_ROOT';

const DEFAULT_TENNIS_HQ = 'king-zippy-umbra-acre';
const SSOT_PKG_REL = 'packages/tennis-hq-ssot';
const ARTIFACTS_REL = 'artifacts/publish';
export const SSOT_CONTRACT_MANIFEST_ENTRY = 'package/registry/contracts/v1/manifest.json' as const;
export const SSOT_CONTRACT_SET = 'tennis-hq/v1' as const;
export const SSOT_CONTRACT_DOMAINS = [
  'marketdata',
  'research',
  'trading',
  'partners',
  'accounting',
] as const;

export type SsotFlowStep = {
  name: string;
  ok: boolean;
  detail: string;
  exitCode?: number;
};

export type SsotFlowSoftProof = {
  schema: typeof SSOT_FLOW_SOFT_SCHEMA;
  /** Stable slug — keys weave / registry / CLI. */
  artifactId: typeof SSOT_FLOW_SOFT_ARTIFACT_ID;
  /** Human title — display only. */
  artifactName: typeof SSOT_FLOW_SOFT_ARTIFACT_NAME;
  /** Partner-ops color kernel concept id (`publish.*`). */
  conceptId: typeof PUBLISH_SSOT_FLOW_SOFT_CONCEPT_ID;
  /** Resolved palette wire (colorKey · token · hex · css). */
  color: PublishPlaneColorBlock;
  /** Mode chip concept + wire (`publish.mode.soft` / `.strict`). */
  modeColor: PublishPlaneColorBlock;
  plane: typeof SSOT_FLOW_SOFT_PLANE;
  purpose: typeof SSOT_FLOW_SOFT_PURPOSE;
  cli: typeof SSOT_FLOW_SOFT_CLI;
  mode: 'soft';
  ok: boolean;
  timestamp: string;
  bunVersion: string;
  bunRevision: string;
  reportPath: typeof SSOT_FLOW_SOFT_REPORT_PATH;
  links: {
    json: typeof SSOT_FLOW_SOFT_REPORT_PATH;
    board: typeof SSOT_FLOW_SOFT_BOARD_PATH;
    weave: typeof SSOT_FLOW_SOFT_WEAVE_PATH;
  };
  tennisHqRoot: string;
  package: { name: string; version: string };
  tarball: {
    path: string;
    fileCount: number;
    sha256: string;
  } | null;
  contracts: {
    manifestPath: typeof SSOT_CONTRACT_MANIFEST_ENTRY;
    contractSet: typeof SSOT_CONTRACT_SET;
    schemaVersion: 1;
    domains: (typeof SSOT_CONTRACT_DOMAINS)[number][];
  } | null;
  steps: SsotFlowStep[];
  summary: {
    passed: number;
    failed: number;
    total: number;
    status: 'pass' | 'fail';
  };
  gitSha: string | null;
};

async function pathHasPackageJson(dir: string): Promise<boolean> {
  return Bun.file(joinPath(dir, 'package.json')).exists();
}

/**
 * Locate Tennis HQ checkout (gitignored sibling).
 * Order: TENNIS_HQ_ROOT → factoryRoot/king-zippy-umbra-acre →
 * primary checkout root + sibling of that root (via git common-dir) →
 * worktree ../../king-zippy-umbra-acre.
 */
export async function resolveTennisHqRoot(factoryRoot: string): Promise<string> {
  const tried: string[] = [];
  const candidates: string[] = [];

  const fromEnv = Bun.env[TENNIS_HQ_ROOT_ENV]?.trim();
  if (fromEnv) candidates.push(fromEnv);
  candidates.push(joinPath(factoryRoot, DEFAULT_TENNIS_HQ));

  try {
    const proc = Bun.spawn(
      [
        'git',
        '-C',
        factoryRoot,
        'rev-parse',
        '--path-format=absolute',
        '--show-toplevel',
        '--git-common-dir',
      ],
      { stdout: 'pipe', stderr: 'pipe', env: { ...Bun.env } }
    );
    const [stdout, exitCode] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
    if (exitCode === 0) {
      const [gitRoot = '', commonDir = ''] = stdout.trim().split(/\r?\n/);
      const gitCommon = commonDir.replace(/[/\\]+$/, '');
      // rev-parse searches parent directories. Only use common-dir discovery
      // when the caller supplied the checkout root itself, not an arbitrary
      // descendant such as an isolated test fixture.
      if (gitCommon && resolvePath(gitRoot) === resolvePath(factoryRoot)) {
        // common-dir is usually `<primary>/.git` — strip that leaf for the primary root.
        const primaryRoot = /(?:^|[/\\])\.git$/i.test(gitCommon)
          ? joinPath(gitCommon, '..')
          : gitCommon;
        candidates.push(joinPath(primaryRoot, DEFAULT_TENNIS_HQ));
        // Operator layout: Tennis HQ sits next to the primary checkout (not inside it).
        candidates.push(joinPath(primaryRoot, '..', DEFAULT_TENNIS_HQ));
      }
    }
  } catch {
    // git optional
  }

  candidates.push(joinPath(factoryRoot, '..', '..', DEFAULT_TENNIS_HQ));

  for (const candidate of candidates) {
    tried.push(candidate);
    if (await pathHasPackageJson(candidate)) {
      const ssotPkg = joinPath(candidate, SSOT_PKG_REL, 'package.json');
      if (await Bun.file(ssotPkg).exists()) return candidate;
    }
  }

  throw new Error(
    `Tennis HQ checkout not found for ssot:flow:soft. Set ${TENNIS_HQ_ROOT_ENV}. Tried: ${tried.join(' · ')}`
  );
}

async function runStep(name: string, args: string[], cwd: string): Promise<SsotFlowStep> {
  const bun = resolveBunExecutable();
  const proc = Bun.spawn([bun, ...args], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...Bun.env },
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  const ok = exitCode === 0;
  const raw = (ok ? stdout : stderr || stdout).trim().split('\n').slice(-3).join(' · ');
  // Drop absolute checkout prefixes so registry bakes stay portable.
  const scrubbed = raw
    .split(cwd)
    .join(DEFAULT_TENNIS_HQ)
    .replace(/\/Users\/[^/\s]+\/Projects\/king-zippy-umbra-acre/g, DEFAULT_TENNIS_HQ)
    .replace(/[A-Za-z]:\\Users\\[^\\\s]+\\Projects\\king-zippy-umbra-acre/g, DEFAULT_TENNIS_HQ);
  return {
    name,
    ok,
    exitCode,
    detail: ok ? scrubbed.slice(0, 200) || 'ok' : scrubbed.slice(0, 240) || `exit ${exitCode}`,
  };
}

async function readSsotPackage(tennisHqRoot: string): Promise<{ name: string; version: string }> {
  const pkg = (await Bun.file(joinPath(tennisHqRoot, SSOT_PKG_REL, 'package.json')).json()) as {
    name?: string;
    version?: string;
  };
  return {
    name: typeof pkg.name === 'string' ? pkg.name : '@tennis-hq/ssot',
    version: typeof pkg.version === 'string' ? pkg.version : '0.0.0',
  };
}

async function resolveTarball(
  tennisHqRoot: string,
  version: string
): Promise<{ absPath: string; relPath: string; fileCount: number; sha256: string } | null> {
  const preferred = joinPath(tennisHqRoot, ARTIFACTS_REL, `tennis-hq-ssot-${version}.tgz`);
  let abs = preferred;
  if (!(await Bun.file(abs).exists())) {
    const glob = new Bun.Glob('*.tgz');
    const found: string[] = [];
    const dir = joinPath(tennisHqRoot, ARTIFACTS_REL);
    try {
      for await (const f of glob.scan({ cwd: dir })) found.push(f);
    } catch {
      return null;
    }
    if (!found.length) return null;
    abs = joinPath(dir, found[0]!);
  }
  const bytes = await Bun.file(abs).arrayBuffer();
  const hasher = new CryptoHasher('sha256');
  hasher.update(new Uint8Array(bytes));
  const sha256 = hasher.digest('hex');

  const list = Bun.spawnSync({
    cmd: ['tar', '-tzf', abs],
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const fileCount =
    list.exitCode === 0 ? list.stdout.toString().trim().split('\n').filter(Boolean).length : 0;

  const relPath = abs.startsWith(tennisHqRoot)
    ? abs.slice(tennisHqRoot.length).replace(/^\//, '')
    : abs;
  return { absPath: abs, relPath, fileCount, sha256 };
}

export async function inspectSsotContractTarball(
  tarballPath: string,
  packageVersion: string
): Promise<
  | {
      ok: true;
      contracts: NonNullable<SsotFlowSoftProof['contracts']>;
      detail: string;
    }
  | { ok: false; detail: string }
> {
  const extract = Bun.spawnSync({
    cmd: ['tar', '-xOzf', tarballPath, SSOT_CONTRACT_MANIFEST_ENTRY],
    stdout: 'pipe',
    stderr: 'pipe',
  });
  if (extract.exitCode !== 0) {
    return { ok: false, detail: `missing ${SSOT_CONTRACT_MANIFEST_ENTRY}` };
  }
  try {
    const manifest = JSON.parse(extract.stdout.toString()) as {
      schemaVersion?: number;
      contractSet?: string;
      package?: { name?: string; version?: string };
      domains?: Record<string, unknown>;
    };
    const domains = Object.keys(manifest.domains ?? {});
    if (manifest.schemaVersion !== 1 || manifest.contractSet !== SSOT_CONTRACT_SET) {
      return { ok: false, detail: 'contract manifest schemaVersion/contractSet mismatch' };
    }
    if (
      manifest.package?.name !== '@tennis-hq/ssot' ||
      manifest.package.version !== packageVersion
    ) {
      return { ok: false, detail: 'contract manifest package identity/version mismatch' };
    }
    if (
      domains.length !== SSOT_CONTRACT_DOMAINS.length ||
      domains.some((domain, index) => domain !== SSOT_CONTRACT_DOMAINS[index])
    ) {
      return {
        ok: false,
        detail: `contract domains must be ${SSOT_CONTRACT_DOMAINS.join(', ')}`,
      };
    }
    return {
      ok: true,
      contracts: {
        manifestPath: SSOT_CONTRACT_MANIFEST_ENTRY,
        contractSet: SSOT_CONTRACT_SET,
        schemaVersion: 1,
        domains: [...SSOT_CONTRACT_DOMAINS],
      },
      detail: `${SSOT_CONTRACT_SET} · ${domains.length} domains · package ${packageVersion}`,
    };
  } catch {
    return { ok: false, detail: 'contract manifest is not valid JSON' };
  }
}

async function gitSha(cwd: string): Promise<string | null> {
  try {
    const proc = Bun.spawn(['git', '-C', cwd, 'rev-parse', '--short', 'HEAD'], {
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...Bun.env },
    });
    const [stdout, exitCode] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
    if (exitCode !== 0) return null;
    const sha = stdout.trim();
    return sha || null;
  } catch {
    return null;
  }
}

export function canonicalTennisHqCheckoutLabel(tennisHqRoot: string): string {
  const checkoutName =
    tennisHqRoot
      .replace(/[/\\]+$/, '')
      .split(/[/\\]/)
      .at(-1) || DEFAULT_TENNIS_HQ;
  return checkoutName === DEFAULT_TENNIS_HQ || checkoutName.startsWith(`${DEFAULT_TENNIS_HQ}-`)
    ? DEFAULT_TENNIS_HQ
    : checkoutName;
}

/** Run offline soft-pass and return proof (does not write). */
export async function runSsotFlowSoft(opts?: {
  factoryRoot?: string;
  tennisHqRoot?: string;
}): Promise<SsotFlowSoftProof> {
  const factoryRoot = opts?.factoryRoot ?? joinPath(import.meta.dir, '../..');
  const tennisHqRoot = opts?.tennisHqRoot ?? (await resolveTennisHqRoot(factoryRoot));
  const steps: SsotFlowStep[] = [];

  steps.push(await runStep('ssot:build', ['run', 'ssot:build'], tennisHqRoot));
  if (!steps.at(-1)!.ok) {
    return finalizeProof({ tennisHqRoot, steps, pkg: await readSsotPackage(tennisHqRoot) });
  }

  steps.push(await runStep('ssot:check', ['run', 'ssot:check'], tennisHqRoot));
  if (!steps.at(-1)!.ok) {
    return finalizeProof({ tennisHqRoot, steps, pkg: await readSsotPackage(tennisHqRoot) });
  }

  steps.push(await runStep('ssot:pack', ['run', 'ssot:pack'], tennisHqRoot));
  const pkg = await readSsotPackage(tennisHqRoot);
  return finalizeProof({ tennisHqRoot, steps, pkg });
}

async function finalizeProof(input: {
  tennisHqRoot: string;
  steps: SsotFlowStep[];
  pkg: { name: string; version: string };
}): Promise<SsotFlowSoftProof> {
  const stepsOk = input.steps.every(s => s.ok);
  const tarball = stepsOk ? await resolveTarball(input.tennisHqRoot, input.pkg.version) : null;
  let contracts: SsotFlowSoftProof['contracts'] = null;
  if (stepsOk && !tarball) {
    input.steps.push({
      name: 'tarball',
      ok: false,
      detail: `missing ${ARTIFACTS_REL}/tennis-hq-ssot-${input.pkg.version}.tgz`,
    });
  } else if (tarball) {
    input.steps.push({
      name: 'tarball',
      ok: true,
      detail: `${tarball.relPath} · ${tarball.fileCount} files · sha256=${tarball.sha256.slice(0, 12)}…`,
    });
    const contractInspection = await inspectSsotContractTarball(tarball.absPath, input.pkg.version);
    if (contractInspection.ok) contracts = contractInspection.contracts;
    input.steps.push({
      name: 'contracts:v1',
      ok: contractInspection.ok,
      detail: contractInspection.detail,
    });
  }

  // Commit-safe: never bake absolute machine paths into registry JSON.
  const tennisHqLabel = canonicalTennisHqCheckoutLabel(input.tennisHqRoot);

  const ok = input.steps.every(s => s.ok);
  const passed = input.steps.filter(s => s.ok).length;
  const failed = input.steps.length - passed;

  const color = publishPlaneColorForConcept(PUBLISH_SSOT_FLOW_SOFT_CONCEPT_ID);
  const modeColor = publishPlaneColorForConcept(publishPlaneModeConceptId('soft'));

  return {
    schema: SSOT_FLOW_SOFT_SCHEMA,
    artifactId: SSOT_FLOW_SOFT_ARTIFACT_ID,
    artifactName: SSOT_FLOW_SOFT_ARTIFACT_NAME,
    conceptId: PUBLISH_SSOT_FLOW_SOFT_CONCEPT_ID,
    color,
    modeColor,
    plane: SSOT_FLOW_SOFT_PLANE,
    purpose: SSOT_FLOW_SOFT_PURPOSE,
    cli: SSOT_FLOW_SOFT_CLI,
    mode: 'soft',
    ok,
    timestamp: new Date().toISOString(),
    bunVersion: version,
    bunRevision: (revision || '').slice(0, 12) || 'unknown',
    reportPath: SSOT_FLOW_SOFT_REPORT_PATH,
    links: {
      json: SSOT_FLOW_SOFT_REPORT_PATH,
      board: SSOT_FLOW_SOFT_BOARD_PATH,
      weave: SSOT_FLOW_SOFT_WEAVE_PATH,
    },
    tennisHqRoot: tennisHqLabel,
    package: input.pkg,
    tarball: tarball
      ? { path: tarball.relPath, fileCount: tarball.fileCount, sha256: tarball.sha256 }
      : null,
    contracts,
    steps: input.steps,
    summary: {
      passed,
      failed,
      total: input.steps.length,
      status: ok ? 'pass' : 'fail',
    },
    gitSha: await gitSha(input.tennisHqRoot),
  };
}

export async function writeSsotFlowSoftProof(
  proof: SsotFlowSoftProof,
  factoryRoot: string
): Promise<string> {
  const out = joinPath(factoryRoot, SSOT_FLOW_SOFT_REL);
  await Bun.write(out, `${JSON.stringify(proof, null, 2)}\n`);
  return out;
}
