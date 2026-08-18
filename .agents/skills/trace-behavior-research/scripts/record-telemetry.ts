#!/usr/bin/env bun

import { recordSessionSummary, recordSkillTriggered } from './event-writer';

// @see https://bun.com/reference/bun/argv

const args = Bun.argv.slice(2);
const valueOf = (name: string): string | undefined => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
if (args.includes('--help') || args.includes('-h')) {
  console.log(
    `Record validated trace telemetry\n\nExamples:\n  bun run trace:telemetry -- --file ./session.jsonl --type skill-triggered --session session-1 --skill ci-and-proof-loop\n  bun run trace:telemetry -- --file ./session.jsonl --type session-summary --session session-1 --turns 6 --errors 0 --interruptions 0 --skills ci-and-proof-loop`
  );
  process.exit(0);
}
const file = valueOf('--file');
const type = valueOf('--type');
const sessionId = valueOf('--session');
if (!file || !type || !sessionId) throw new Error('--file, --type, and --session are required');
if (type === 'skill-triggered') {
  const skill = valueOf('--skill');
  if (!skill) throw new Error('--skill is required for skill-triggered');
  await recordSkillTriggered(file, skill, sessionId, valueOf('--timestamp'));
} else if (type === 'session-summary') {
  const integer = (name: string): number => {
    const value = Number(valueOf(name));
    if (!Number.isInteger(value) || value < 0)
      throw new Error(`${name} must be a non-negative integer`);
    return value;
  };
  const skills = (valueOf('--skills') ?? '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  await recordSessionSummary(file, {
    errorCount: integer('--errors'),
    interruptionCount: integer('--interruptions'),
    sessionId,
    skills,
    turnsToResolution: integer('--turns'),
    timestamp: valueOf('--timestamp'),
  });
} else {
  throw new Error('--type must be skill-triggered or session-summary');
}
console.log(`Recorded ${type} telemetry for ${sessionId}`);
