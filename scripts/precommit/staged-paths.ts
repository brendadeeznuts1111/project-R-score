import { isHarnessFormatPath, isHarnessLintPath } from '../../config/eslint/harness/rollout.ts';
import { isColorKernelPath } from '../../lib/portal/color-kernel-paths.ts';

export { isColorKernelPath, isHarnessFormatPath, isHarnessLintPath };

const DOC_MAP_SSOT = new Set([
  'AGENTS.md',
  'CONTRIBUTING.md',
  'README.md',
  'STRUCTURE.md',
  '.custom-instructions.md',
  'docs/AGENTS.md',
  'docs/README.md',
  'docs/UNIFIED.md',
  'docs/WIRE_BOUNDARY.md',
  'docs/BUN_NATIVE_CAPABILITIES.md',
  'docs/markdown/API_REFERENCE.md',
  'docs/markdown/CONTRIBUTING_MARKDOWN.md',
  'docs/IMPORT_BOUNDARIES.md',
  'docs/harness/README.md',
  'docs/harness/PROOF.md',
  'docs/harness/FRESH-RERUN.md',
  'docs/harness/FEEDBACK.md',
  'docs/harness/AUTHORITY.md',
  'docs/organization/VELOCITY_BASELINE.md',
  'docs/organization/BLOAT_SPEED_PASS.md',
  'lib/README.md',
  'lib/types/branded/README.md',
  'lib/docs/repo-docs.ts',
  'tools/doc-map-check.ts',
]);

const NATIVE_CAPABILITIES_SYNC_PATHS = new Set([
  'docs/BUN_NATIVE_CAPABILITIES.md',
  'lib/docs/bun-native-capabilities-sync.ts',
  'tools/bun-native-capabilities-sync.ts',
  'tests/bun-native-capabilities-sync.test.ts',
  '.agents/skills/ast-grep/bun-patterns.json',
]);

const normalize = (file: string): string => file.replace(/^\.\//, '');

export function isDocMapPath(file: string): boolean {
  return DOC_MAP_SSOT.has(normalize(file));
}

export function isNativeCapabilitiesSyncPath(file: string): boolean {
  return NATIVE_CAPABILITIES_SYNC_PATHS.has(normalize(file));
}

/** Pages static plane — portal/registry/monitoring shells. */
export function isPublicPlanePath(file: string): boolean {
  const n = normalize(file);
  return (
    n.startsWith('public/portal/') ||
    n.startsWith('public/registry/') ||
    n.startsWith('public/monitoring/') ||
    n === 'public/index.html' ||
    n === 'public/_redirects' ||
    n === 'public/_headers'
  );
}

/** Glossary section mounts — offline HTMLRewriter probe when bake/boards change. */
export function isGlossaryVerifyPath(file: string): boolean {
  const n = normalize(file);
  return (
    n === 'public/registry/domain-glossary.json' ||
    n === 'lib/portal/page-glossary.ts' ||
    n === 'tools/glossary-verify.ts' ||
    n === 'tests/glossary-verify.test.ts' ||
    /^public\/portal\/(account|limits|partners|partner-history)\//.test(n)
  );
}

/** Machine/project bunfig policy surface — fast offline doctor --group bunfig only. */
export function isDoctorBunfigPath(file: string): boolean {
  const n = normalize(file);
  return (
    n === 'bunfig.toml' ||
    n === 'config/machine.bunfig.toml.template' ||
    n === 'scripts/ensure-machine-bunfig.ts' ||
    n === 'scripts/lib/machine-bunfig.ts' ||
    n === 'tools/lib/portal-cli-doctor-bunfig.ts'
  );
}

/** Doctor-state bake surface — portable fingerprint only (no full doctor suite). */
export function isDoctorStatePath(file: string): boolean {
  const n = normalize(file);
  return n === 'public/registry/doctor-state.json' || n === 'tools/bake-doctor.ts';
}

/** TypeScript 6+ types discovery — monorepo-owned tsconfigs / audit tool. */
export function isTsconfigTypesPath(file: string): boolean {
  const n = normalize(file);
  return (
    n === 'tools/tsconfig-types-audit.ts' ||
    n === 'tsconfig.base.json' ||
    n === 'tsconfig.bun.json' ||
    n === 'tsconfig.check.json' ||
    n === 'tsconfig.lint.json' ||
    n === 'tools/tsconfig.json' ||
    (n.startsWith('packages/') && n.endsWith('/tsconfig.json')) ||
    (n.startsWith('tests/tsconfig.') && n.endsWith('.json'))
  );
}

/** Audit findings/concepts SSOT — verify even when no harness .ts is staged. */
export function isAuditSsotPath(file: string): boolean {
  const n = normalize(file);
  return (
    n.startsWith('tools/audit-findings/') ||
    n.startsWith('tools/audit-concepts/') ||
    n.startsWith('tools/audit-evidence/') ||
    n.startsWith('lib/audit/') ||
    n.startsWith('docs/audit/') ||
    n === 'tools/audit-catalog.ts' ||
    n === 'tools/audit-catalog.json' ||
    n === 'tools/audit-emit-stub.ts' ||
    n === 'tools/audit-migrate-to-sha3.ts' ||
    n === 'tests/audit-catalog.test.ts' ||
    n === 'lib/types/branded/audit.ts' ||
    n === 'tools/bun-doc-refs.ts' ||
    n === 'tools/bun-docs-curated.ts'
  );
}
