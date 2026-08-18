import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { parseSkillTelemetry } from './skill-registry';

// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file

const opaque = (value: string): boolean => /^[A-Za-z0-9._:-]{1,128}$/.test(value);
const isoTimestamp = (value?: string): string => {
  const timestamp = value ? Date.parse(value) : Date.now();
  if (Number.isNaN(timestamp)) throw new Error('timestamp must be an ISO date');
  return new Date(timestamp).toISOString();
};
const writeEvent = async (path: string, event: unknown): Promise<void> => {
  const line = `${JSON.stringify(event)}\n`;
  const parsed = parseSkillTelemetry(event);
  if (!parsed.metrics.length && !parsed.triggers.length) {
    throw new Error('event failed the telemetry contract');
  }
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, line, 'utf8');
};

export async function recordSkillTriggered(
  path: string,
  skillName: string,
  sessionId: string,
  timestamp?: string
): Promise<void> {
  if (!opaque(skillName) || !opaque(sessionId))
    throw new Error('skill and session IDs must be opaque identifiers');
  await writeEvent(path, {
    payload: { session_id: sessionId, skill_name: skillName },
    timestamp: isoTimestamp(timestamp),
    type: 'skill_triggered',
  });
}

export async function recordSessionSummary(
  path: string,
  summary: {
    errorCount: number;
    interruptionCount: number;
    sessionId: string;
    skills: string[];
    turnsToResolution: number;
    timestamp?: string;
  }
): Promise<void> {
  if (!opaque(summary.sessionId) || summary.skills.some(skill => !opaque(skill))) {
    throw new Error('skill and session IDs must be opaque identifiers');
  }
  if (
    ![summary.errorCount, summary.interruptionCount, summary.turnsToResolution].every(
      Number.isInteger
    ) ||
    [summary.errorCount, summary.interruptionCount, summary.turnsToResolution].some(
      value => value < 0
    )
  ) {
    throw new Error('telemetry counts must be non-negative integers');
  }
  await writeEvent(path, {
    payload: {
      error_count: summary.errorCount,
      interruption_count: summary.interruptionCount,
      session_id: summary.sessionId,
      skills: summary.skills,
      turns_to_resolution: summary.turnsToResolution,
    },
    timestamp: isoTimestamp(summary.timestamp),
    type: 'session_summary',
  });
}
