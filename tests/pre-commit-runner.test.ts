import { describe, expect, it } from 'bun:test';
import {
  checkBunPin,
  isConceptSsotPath,
  isPartnerDashboardPlanPath,
  isSkillValidationPath,
  isTestSourcePath,
  readPrecommitEnvironment,
} from '../scripts/pre-commit.ts';

describe('pre-commit path gates', () => {
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
      })
    ).toEqual({
      skipGitleaks: true,
      skipQualityConcept: false,
      skipTestChanged: true,
    });
  });
});

describe('pre-commit bun pin', () => {
  it('accepts runtime that satisfies engines.bun (>=1.3.14)', async () => {
    const pin = await checkBunPin('1.3.14');
    expect(pin.ok).toBe(true);
    expect(pin.enginesBun).toBe('>=1.3.14');
    expect(pin.bunVersionFile).toBe('1.3.14');
    expect(pin.packageManager).toBe('bun@1.3.14');
  });

  it('rejects runtime below engines.bun', async () => {
    const pin = await checkBunPin('1.3.13');
    expect(pin.ok).toBe(false);
    expect(pin.message).toContain('does not satisfy');
  });
});
