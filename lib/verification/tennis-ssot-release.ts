// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — CryptoHasher
/**
 * Consumer-side release parity for the Tennis HQ SSOT package.
 *
 * The producer owns version bumps and the immutable tarball. FactoryWager owns
 * proving that its root registry, Tennis tenant slice, soft-pass artifact, and
 * operator runbook all describe the same published release.
 */
import { CryptoHasher } from 'bun';
import { factoryWagerRegistryUrlFromEnv } from '../../config/r2-env.ts';
import type { PackageInfo, RegistryIndex } from '../factory/artifact.ts';
import { joinPath } from '../path-bun.ts';
import { SSOT_CONTRACT_DOMAINS } from './ssot-flow-soft.ts';

export const TENNIS_SSOT_PACKAGE_NAME = '@tennis-hq/ssot' as const;

type TenantRegistryIndex = {
  packages?: Record<string, PackageInfo>;
};

type SsotFlowProjection = {
  package?: { name?: string; version?: string };
  tarball?: { path?: string; fileCount?: number; sha256?: string } | null;
  contracts?: { domains?: string[] } | null;
};

export type TennisSsotReleaseInputs = {
  root: RegistryIndex;
  tenant: TenantRegistryIndex;
  proof: SsotFlowProjection;
  runbook: string;
};

export type TennisSsotReleaseCheck = {
  name: string;
  ok: boolean;
  detail: string;
};

export type TennisSsotReleaseParity = {
  ok: boolean;
  packageName: typeof TENNIS_SSOT_PACKAGE_NAME;
  version: string;
  size: number;
  sha256: string;
  r2Key: string;
  checks: TennisSsotReleaseCheck[];
  live?: {
    url: string;
    status: number;
    size: number;
    sha256: string;
  };
};

function check(checks: TennisSsotReleaseCheck[], name: string, ok: boolean, detail: string): void {
  checks.push({ name, ok, detail });
}

/** Compare committed consumer projections without reading the producer source tree. */
export function verifyTennisSsotReleaseParity(
  input: TennisSsotReleaseInputs
): TennisSsotReleaseParity {
  const checks: TennisSsotReleaseCheck[] = [];
  const rootPackage = input.root.packages?.[TENNIS_SSOT_PACKAGE_NAME];
  const version = String(rootPackage?.['dist-tags']?.latest ?? '');
  const rootRelease = rootPackage?.releases?.[version];
  const storage = rootRelease?.storage;
  const size = storage?.size ?? 0;
  const sha256 = storage?.checksum ?? '';
  const r2Key = storage?.r2Key ?? '';
  const expectedR2Key = `${TENNIS_SSOT_PACKAGE_NAME}/${version}.tgz`;

  check(checks, 'root-package', Boolean(rootPackage), `${TENNIS_SSOT_PACKAGE_NAME} present`);
  check(checks, 'root-latest', Boolean(version), `latest=${version || 'missing'}`);
  check(
    checks,
    'root-release',
    Boolean(rootRelease) && rootRelease?.name === TENNIS_SSOT_PACKAGE_NAME,
    `${TENNIS_SSOT_PACKAGE_NAME}@${version || 'missing'}`
  );
  check(
    checks,
    'root-storage',
    size > 0 && /^[a-f0-9]{64}$/.test(sha256) && r2Key === expectedR2Key,
    `${size} bytes · ${r2Key || 'missing key'} · sha256=${sha256.slice(0, 12) || 'missing'}…`
  );

  const tenantPackage = input.tenant.packages?.[TENNIS_SSOT_PACKAGE_NAME];
  const tenantVersion = String(tenantPackage?.['dist-tags']?.latest ?? '');
  const tenantStorage = tenantPackage?.releases?.[tenantVersion]?.storage;
  check(
    checks,
    'tenant-release',
    tenantVersion === version &&
      tenantStorage?.r2Key === r2Key &&
      tenantStorage?.size === size &&
      tenantStorage?.checksum === sha256,
    `latest=${tenantVersion || 'missing'} · root=${version || 'missing'}`
  );

  const proofDomains = input.proof.contracts?.domains ?? [];
  check(
    checks,
    'soft-pass-release',
    input.proof.package?.name === TENNIS_SSOT_PACKAGE_NAME &&
      input.proof.package.version === version &&
      input.proof.tarball?.sha256 === sha256 &&
      (input.proof.tarball?.fileCount ?? 0) > 0,
    `package=${input.proof.package?.version ?? 'missing'} · sha256=${input.proof.tarball?.sha256?.slice(0, 12) ?? 'missing'}…`
  );
  check(
    checks,
    'contract-domains',
    proofDomains.length === SSOT_CONTRACT_DOMAINS.length &&
      proofDomains.every((domain, index) => domain === SSOT_CONTRACT_DOMAINS[index]),
    proofDomains.join(', ') || 'missing'
  );
  check(
    checks,
    'runbook-release',
    Boolean(version) &&
      input.runbook.includes(`@tennis-hq/ssot@${version}`) &&
      input.runbook.includes(`\`${size.toLocaleString('en-US')}\` bytes`) &&
      input.runbook.includes(`\`${sha256}\``),
    `version=${version || 'missing'} · size=${size} · checksum=${sha256.slice(0, 12) || 'missing'}…`
  );

  return {
    ok: checks.every(row => row.ok),
    packageName: TENNIS_SSOT_PACKAGE_NAME,
    version,
    size,
    sha256,
    r2Key,
    checks,
  };
}

export async function loadTennisSsotReleaseParity(
  rootDir: string
): Promise<TennisSsotReleaseParity> {
  const [root, tenant, proof, runbook] = await Promise.all([
    Bun.file(joinPath(rootDir, 'public/registry/registry.json')).json() as Promise<RegistryIndex>,
    Bun.file(
      joinPath(rootDir, 'public/registry/tennis/registry.json')
    ).json() as Promise<TenantRegistryIndex>,
    Bun.file(
      joinPath(rootDir, 'public/registry/ssot-flow-soft.json')
    ).json() as Promise<SsotFlowProjection>,
    Bun.file(joinPath(rootDir, 'docs/harness/tenants/tennis-hq-registry.md')).text(),
  ]);
  return verifyTennisSsotReleaseParity({ root, tenant, proof, runbook });
}

export async function verifyLiveTennisSsotRelease(
  parity: TennisSsotReleaseParity
): Promise<TennisSsotReleaseParity> {
  const base = factoryWagerRegistryUrlFromEnv().replace(/\/$/, '');
  const encodedKey = parity.r2Key
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
  const url = `${base}/api/registry/${encodedKey}`;
  const response = await fetch(url);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const hasher = new CryptoHasher('sha256');
  hasher.update(bytes);
  const sha256 = hasher.digest('hex');
  const live = { url, status: response.status, size: bytes.byteLength, sha256 };
  const liveOk = response.ok && bytes.byteLength === parity.size && sha256 === parity.sha256;
  return {
    ...parity,
    ok: parity.ok && liveOk,
    checks: [
      ...parity.checks,
      {
        name: 'live-tarball',
        ok: liveOk,
        detail: `${response.status} · ${bytes.byteLength} bytes · sha256=${sha256.slice(0, 12)}…`,
      },
    ],
    live,
  };
}
