import { describe, expect, it } from 'bun:test';
import {
  checkBunPin,
  isConceptSsotPath,
  isPartnerDashboardPlanPath,
  isPartnerDomainInventorySsotPath,
  isPartnerDomainLintPath,
  isPartnerWireInventorySsotPath,
  isPartnerWireLintPath,
  isSkillValidationPath,
  isTestSourcePath,
  partnerDomainLintCommand,
  partnerWireLintCommand,
  readPrecommitEnvironment,
} from '../scripts/pre-commit.ts';
import { STAGED_TEST_PARALLELISM } from '../scripts/bun-test-changed-staged.ts';

const REVIEWED_BUN_VERSION = (
  await Bun.file(new URL('../.bun-version', import.meta.url)).text()
).trim();

function nextPatchVersion(version: string): string {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) throw new Error(`Expected a stable semantic version, received ${version}`);
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}

describe('pre-commit path gates', () => {
  it('bounds staged test worker pressure', () => {
    expect(STAGED_TEST_PARALLELISM).toBe(6);
  });

  it('selects skill validation paths', () => {
    expect(isSkillValidationPath('.agents/skills/demo/SKILL.md')).toBe(true);
    expect(isSkillValidationPath('lib/agent-skills-paths.ts')).toBe(true);
    expect(isSkillValidationPath('scripts/validate-agent-skills.ts')).toBe(true);
    expect(isSkillValidationPath('tests/agent-skills-validation.test.ts')).toBe(true);
    expect(isSkillValidationPath('docs/README.md')).toBe(false);
  });

  it('selects staged TypeScript and JavaScript sources', () => {
    expect(isTestSourcePath('scripts/example.ts')).toBe(true);
    expect(isTestSourcePath('src/example.mts')).toBe(true);
    expect(isTestSourcePath('public/example.js')).toBe(true);
    expect(isTestSourcePath('docs/example.md')).toBe(false);
  });

  it('selects concept SSOT paths', () => {
    expect(isConceptSsotPath('lib/portal/concept-graph.ts')).toBe(true);
    expect(isConceptSsotPath('scripts/concept-audit.ts')).toBe(true);
    expect(isConceptSsotPath('public/registry/domain-glossary.json')).toBe(true);
    expect(isConceptSsotPath('docs/DOMAIN_CONCEPT_SHAPE.md')).toBe(true);
    expect(isConceptSsotPath('public/portal/concepts/index.html')).toBe(true);
    expect(isConceptSsotPath('public/registry/concepts-state.json')).toBe(true);
    expect(isConceptSsotPath('lib/http/skills-catalog.ts')).toBe(false);
  });

  it('selects partner wire-lint paths', () => {
    expect(isPartnerWireLintPath('lib/foo.ts')).toBe(true);
    expect(isPartnerWireLintPath('x.tsx')).toBe(true);
    expect(isPartnerWireLintPath('public/registry/partner-surface-inventory.json')).toBe(true);
    expect(isPartnerWireLintPath('docs/design/partner-surface-inventory.md')).toBe(true);
    expect(isPartnerWireLintPath('docs/README.md')).toBe(false);
    expect(isPartnerWireInventorySsotPath('lib/docs/partner-surface-inventory.ts')).toBe(true);
    expect(isPartnerWireInventorySsotPath('lib/docs/partner-surface-wire-lint.ts')).toBe(false);
    expect(isPartnerWireInventorySsotPath('lib/foo.ts')).toBe(false);
  });

  it('selects partner domain-lint paths', () => {
    expect(isPartnerDomainLintPath('lib/foo.ts')).toBe(true);
    expect(isPartnerDomainLintPath('x.tsx')).toBe(true);
    expect(isPartnerDomainLintPath('public/registry/partner-surface-inventory.json')).toBe(true);
    expect(isPartnerDomainLintPath('docs/design/partner-surface-inventory.md')).toBe(true);
    expect(isPartnerDomainLintPath('docs/design/partner-surface-inventory.generated.md')).toBe(
      true
    );
    expect(isPartnerDomainLintPath('docs/README.md')).toBe(false);
    expect(isPartnerDomainInventorySsotPath('lib/docs/partner-surface-domain-lint.ts')).toBe(false);
    expect(isPartnerDomainInventorySsotPath('scripts/validate-partner-domain-isolation.ts')).toBe(
      false
    );
    expect(isPartnerDomainInventorySsotPath('lib/foo.ts')).toBe(false);
  });

  it('scopes ordinary partner gates to staged files and keeps SSOT proofs full', () => {
    expect(partnerWireLintCommand(['lib/foo.ts'])).toEqual([
      'bun',
      'scripts/validate-wire-traps.ts',
      '--scan',
      '--staged',
    ]);
    expect(partnerWireLintCommand(['lib/docs/partner-surface-inventory.ts'])).toEqual([
      'bun',
      'scripts/validate-wire-traps.ts',
      '--scan',
      '--strict-globs',
    ]);
    expect(partnerWireLintCommand(['lib/docs/partner-surface-wire-lint.ts'])).toEqual([
      'bun',
      'scripts/validate-wire-traps.ts',
      '--scan',
    ]);
    expect(partnerDomainLintCommand(['lib/foo.ts'])).toEqual([
      'bun',
      'scripts/validate-partner-domain-isolation.ts',
      '--scan',
      '--staged',
    ]);
    expect(partnerDomainLintCommand(['lib/docs/partner-surface-inventory.ts'])).toEqual([
      'bun',
      'scripts/validate-partner-domain-isolation.ts',
      '--scan',
      '--strict',
    ]);
    expect(partnerDomainLintCommand(['lib/docs/partner-surface-domain-lint.ts'])).toEqual([
      'bun',
      'scripts/validate-partner-domain-isolation.ts',
      '--scan',
    ]);
  });

  it('selects partner dashboard semantic plan paths', () => {
    expect(isPartnerDashboardPlanPath('docs/design/partner-dashboard-mvp.toml')).toBe(true);
    expect(isPartnerDashboardPlanPath('docs/design/partner-dashboard-semantic-map.md')).toBe(true);
    expect(isPartnerDashboardPlanPath('scripts/validate-partner-dashboard-plan.ts')).toBe(true);
    expect(isPartnerDashboardPlanPath('tests/validate-partner-dashboard-plan.test.ts')).toBe(true);
    expect(isPartnerDashboardPlanPath('docs/design/partner-dashboard-mvp.md')).toBe(true);
    expect(isPartnerDashboardPlanPath('lib/partner-profile/schema.ts')).toBe(true);
    expect(isPartnerDashboardPlanPath('packages/partners/src/dashboard-plan.ts')).toBe(true);
    expect(isPartnerDashboardPlanPath('public/registry/partner-profiles.json')).toBe(true);
    expect(isPartnerDashboardPlanPath('lib/portal/partner-routes.ts')).toBe(true);
    expect(isPartnerDashboardPlanPath('lib/portal/theme.ts')).toBe(true);
    expect(isPartnerDashboardPlanPath('public/portal/theme.jsonc')).toBe(true);
    expect(isPartnerDashboardPlanPath('public/portal/partners/index.html')).toBe(true);
    expect(isPartnerDashboardPlanPath('public/registry/domain-glossary.json')).toBe(true);
    expect(isPartnerDashboardPlanPath('docs/design/partner-code-consolidation.md')).toBe(false);
  });
});

describe('pre-commit environment', () => {
  it('reads opt-out flags through the Bun environment contract', () => {
    expect(
      readPrecommitEnvironment({
        SKIP_GITLEAKS: '1',
        SKIP_QUALITY_CONCEPT: '0',
        SKIP_TEST_CHANGED: '1',
        SKIP_WIRE_LINT: '1',
        SKIP_DOMAIN_LINT: '1',
      })
    ).toEqual({
      skipGitleaks: true,
      skipQualityConcept: false,
      skipTestChanged: true,
      skipWireLint: true,
      skipDomainLint: true,
    });
  });
});

describe('pre-commit Bun 1.4 profiler contract', () => {
  it('uses the boolean markdown flag plus separate output directory and name', async () => {
    const source = await Bun.file(new URL('../scripts/pre-commit.ts', import.meta.url)).text();
    expect(source).toContain("'--cpu-prof-md'");
    expect(source).toContain('`--cpu-prof-dir=${profileDir}`');
    expect(source).toContain('`--cpu-prof-name=${profileName}`');
    expect(source).not.toContain('`--cpu-prof-md=${profilePath}`');
  });
});

describe('pre-commit Bun stable pin', () => {
  it('accepts the exact reviewed stable runtime', async () => {
    const pin = await checkBunPin(REVIEWED_BUN_VERSION);
    expect(pin.ok).toBe(true);
    expect(pin.issues).toEqual([]);
    expect(pin.bunVersionFile).toBe(REVIEWED_BUN_VERSION);
    expect(pin.packageManager).toBe(`bun@${REVIEWED_BUN_VERSION}`);
  });

  it('rejects a runtime older than the reviewed pin', async () => {
    const pin = await checkBunPin('0.0.0');
    expect(pin.ok).toBe(false);
    expect(pin.message).toContain('does not equal reviewed pin');
  });

  it('rejects a newer runtime even when it satisfies the engine floor', async () => {
    const newerVersion = nextPatchVersion(REVIEWED_BUN_VERSION);
    const pin = await checkBunPin(newerVersion);
    expect(Bun.semver.satisfies(newerVersion, pin.enginesBun!)).toBe(true);
    expect(pin.ok).toBe(false);
    expect(pin.message).toContain(
      `runtime ${newerVersion} does not equal reviewed pin ${REVIEWED_BUN_VERSION}`
    );
  });
});
