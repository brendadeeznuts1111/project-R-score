import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  parseSkillTelemetry,
  SkillRegistry,
} from '../.agents/skills/trace-behavior-research/scripts/skill-registry';

// @see https://bun.com/docs/test/index#run-tests

const registries: SkillRegistry[] = [];
afterEach(() => {
  for (const registry of registries.splice(0)) registry.close();
});

describe('trace skill registry', () => {
  test('stores aggregate metrics and ranks matching skills', async () => {
    const root = await mkdtemp(join(tmpdir(), 'trace-skill-registry-'));
    const registry = new SkillRegistry(join(root, 'skills.db'));
    registries.push(registry);
    registry.upsertSkill({
      actions: ['run focused proof'],
      confidence: 0.9,
      description: 'CI proof loop',
      evidenceHash: 'ci-proof',
      lastUsed: Date.parse('2026-08-18T00:00:00.000Z'),
      name: 'ci-and-proof-loop',
      status: 'active',
      triggers: ['CI failure'],
    });
    registry.recordMetric({
      errorCount: 0,
      interruptionCount: 0,
      sessionId: 'with-skill',
      skillName: 'ci-and-proof-loop',
      timestamp: Date.parse('2026-08-18T00:10:00.000Z'),
      turnsToResolution: 6,
    });
    registry.recordMetric({
      errorCount: 0,
      interruptionCount: 1,
      sessionId: 'baseline',
      skillName: null,
      timestamp: Date.parse('2026-08-18T00:20:00.000Z'),
      turnsToResolution: 10,
    });
    registry.recordTrigger(
      'ci-and-proof-loop',
      'with-skill',
      Date.parse('2026-08-18T00:00:00.000Z')
    );

    expect(registry.impactSummary()).toContainEqual(
      expect.objectContaining({
        averageTurns: 6,
        baselineTurnsDelta: -4,
        samples: 1,
        skillName: 'ci-and-proof-loop',
        successRate: 1,
      })
    );
    expect(
      registry.rankMatches('Investigate this CI failure', 3, Date.parse('2026-08-18T00:00:00Z'))
    ).toEqual([expect.objectContaining({ name: 'ci-and-proof-loop', priority: 0.9 })]);
  });

  test('parses only explicit aggregate telemetry events', () => {
    expect(
      parseSkillTelemetry({
        payload: { session_id: 'session-a', skill_name: 'ci-and-proof-loop' },
        timestamp: '2026-08-18T00:00:00.000Z',
        type: 'skill_triggered',
      }).triggers
    ).toEqual([
      {
        sessionId: 'session-a',
        skillName: 'ci-and-proof-loop',
        timestamp: Date.parse('2026-08-18T00:00:00.000Z'),
      },
    ]);
    expect(
      parseSkillTelemetry({
        payload: {
          error_count: 1,
          interruption_count: 0,
          session_id: 'session-a',
          skills: ['ci-and-proof-loop'],
          turns_to_resolution: 7,
        },
        type: 'session_summary',
      }).metrics
    ).toEqual([
      expect.objectContaining({
        errorCount: 1,
        interruptionCount: 0,
        sessionId: 'session-a',
        skillName: 'ci-and-proof-loop',
        turnsToResolution: 7,
      }),
    ]);
    expect(parseSkillTelemetry({ payload: { content: 'ordinary trace' } })).toEqual({
      metrics: [],
      triggers: [],
    });
  });
});
