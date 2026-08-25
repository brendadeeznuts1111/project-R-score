/**
 * Canonical ownership inventory for tests that CI runs independently of
 * `bun test --changed`. This is deliberately descriptive first: execution
 * moves to these groups only after the overlap report has been reviewed.
 */
import { TEST_SNAPSHOT_SUITES } from '../portal/bun-test-snapshots.ts';

export type CiTestGroupId =
  | 'runtime-boundary'
  | 'channel-contract'
  | 'harness-contract'
  | 'snapshot-contract'
  | 'portal-registry';

export type CiTestGroup = {
  id: CiTestGroupId;
  owner: string;
  repair: string;
  paths: readonly string[];
};

const RUNTIME_BOUNDARY_PATHS = [
  'tests/fixtures/runtime-cli/',
  'tests/fixtures/bun-shell/',
  'tests/fixtures/security-hash/',
  'tests/fixtures/social-metadata/',
  'tests/fixtures/blog-extraction/',
  'tests/fixtures/fetch-page/',
  'tests/fetch-proxy-keepalive.test.ts',
  'tests/bun-urlpattern.test.ts',
  'tests/bun-site-url.test.ts',
  'tests/factory-production.test.ts',
  'tests/portal-url-planes.test.ts',
  'tests/bun-docs-catalog.test.ts',
  'tests/fs-bun.test.ts',
  'tests/bun-glob-scan.test.ts',
] as const;

const CHANNEL_CONTRACT_PATHS = [
  'tests/channel-suite.test.ts',
  'tests/verification-subsystem.test.ts',
  'tests/bundler-loader-probes.test.ts',
  'tests/networking-channel.test.ts',
  'tests/verification-proof-taxonomy.test.ts',
  'tests/channel-meta-refresh.test.ts',
  'tests/verification-proof-consistency.test.ts',
] as const;

const HARNESS_CONTRACT_PATHS = [
  'tests/harness-ci-deploy.test.ts',
  'tests/harness-code-quality.test.ts',
  'tests/harness-fresh-rerun-contract.test.ts',
] as const;

const PORTAL_REGISTRY_PATHS = [
  'tests/compliance-portal-bake.test.ts',
  'tests/harness-utilities.test.ts',
  'tests/ops-snapshot-cron.test.ts',
  'tests/portal-weave.test.ts',
  'tests/registry-contracts.test.ts',
] as const;

export const CI_RESERVED_TEST_GROUPS: readonly CiTestGroup[] = [
  {
    id: 'runtime-boundary',
    owner: 'runtime-cli · bun-shell · Bun runtime boundary ProofPaths',
    repair: `bun test ${RUNTIME_BOUNDARY_PATHS.join(' ')}`,
    paths: RUNTIME_BOUNDARY_PATHS,
  },
  {
    id: 'channel-contract',
    owner: 'channel-meta-verification-v1 ProofPath',
    repair: `bun test ${CHANNEL_CONTRACT_PATHS.join(' ')}`,
    paths: CHANNEL_CONTRACT_PATHS,
  },
  {
    id: 'harness-contract',
    owner: 'CI/deploy · code-quality · fresh-rerun ProofPaths',
    repair: `bun test ${HARNESS_CONTRACT_PATHS.join(' ')}`,
    paths: HARNESS_CONTRACT_PATHS,
  },
  {
    id: 'snapshot-contract',
    owner: 'lib/portal/bun-test-snapshots.ts',
    repair: 'bun run test:snapshots',
    paths: TEST_SNAPSHOT_SUITES.map(suite => suite.testRel),
  },
  {
    id: 'portal-registry',
    owner: 'docs/portal-foundation.md · public registry contracts',
    repair: `bun test --timeout=60000 ${PORTAL_REGISTRY_PATHS.join(' ')}`,
    paths: PORTAL_REGISTRY_PATHS,
  },
] as const;

export type TestGroupAudit = {
  groupCount: number;
  pathCount: number;
  missingOwners: CiTestGroupId[];
  missingRepairs: CiTestGroupId[];
  duplicatePaths: Array<{ path: string; groups: CiTestGroupId[] }>;
};

/** Report-only audit used to establish the current execution baseline. */
export function auditReservedTestGroups(
  groups: readonly CiTestGroup[] = CI_RESERVED_TEST_GROUPS
): TestGroupAudit {
  const paths = new Map<string, CiTestGroupId[]>();
  const missingOwners: CiTestGroupId[] = [];
  const missingRepairs: CiTestGroupId[] = [];

  for (const group of groups) {
    if (!group.owner.trim()) missingOwners.push(group.id);
    if (!group.repair.trim()) missingRepairs.push(group.id);
    for (const path of group.paths) {
      const owners = paths.get(path) ?? [];
      owners.push(group.id);
      paths.set(path, owners);
    }
  }

  return {
    groupCount: groups.length,
    pathCount: paths.size,
    missingOwners,
    missingRepairs,
    duplicatePaths: [...paths.entries()]
      .filter(([, owners]) => owners.length > 1)
      .map(([path, groups]) => ({ path, groups })),
  };
}
