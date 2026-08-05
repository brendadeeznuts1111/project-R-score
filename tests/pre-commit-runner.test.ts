import { describe, expect, it } from 'bun:test';
import {
  isConceptSsotPath,
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
