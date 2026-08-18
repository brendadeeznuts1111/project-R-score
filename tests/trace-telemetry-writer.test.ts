import { describe, expect, test } from 'bun:test';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseSkillTelemetry } from '../.agents/skills/trace-behavior-research/scripts/skill-registry';
import { recordSessionSummary, recordSkillTriggered } from '../.agents/skills/trace-behavior-research/scripts/event-writer';

// @see https://bun.com/docs/test/index#run-tests
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file

describe('trace telemetry writer', () => {
  test('writes only validated aggregate events', async () => {
    const root = await mkdtemp(join(tmpdir(), 'trace-telemetry-'));
    const path = join(root, 'session.jsonl');
    await recordSkillTriggered(path, 'ci-and-proof-loop', 'session-1', '2026-08-18T00:00:00Z');
    await recordSessionSummary(path, {
      errorCount: 0,
      interruptionCount: 1,
      sessionId: 'session-1',
      skills: ['ci-and-proof-loop'],
      turnsToResolution: 6,
      timestamp: '2026-08-18T00:10:00Z',
    });
    const events = (await Bun.file(path).text()).trim().split('\n').map(line => JSON.parse(line));
    expect(parseSkillTelemetry(events[0]).triggers).toHaveLength(1);
    expect(parseSkillTelemetry(events[1]).metrics).toContainEqual(
      expect.objectContaining({ interruptionCount: 1, turnsToResolution: 6 })
    );
  });

  test('rejects unsafe identifiers and invalid counts', async () => {
    const root = await mkdtemp(join(tmpdir(), 'trace-telemetry-'));
    const path = join(root, 'session.jsonl');
    await expect(recordSkillTriggered(path, 'skill with spaces', 'session-1')).rejects.toThrow();
    await expect(
      recordSessionSummary(path, {
        errorCount: -1,
        interruptionCount: 0,
        sessionId: 'session-1',
        skills: [],
        turnsToResolution: 1,
      })
    ).rejects.toThrow();
  });
});
