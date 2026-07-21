import { describe, expect, test } from 'bun:test';
import {
  evaluatePrClaim,
  kindCellValid,
  WARN_UNTIL_ISO,
  WARN_UNTIL_MS,
  warnOnlyMode,
} from '../scripts/check-pr-claim';

const filled = `# Pull Request

## Claim → evidence

| Claim (one sentence) | Kind (\`unit\` / \`boundary\` / \`journey\` / \`deployed\`) | Evidence (command or path that exited 0) |
|----------------------|-----------------------------------------------------|------------------------------------------|
| Install layout healthy | journey | bun run proof:install |
`;

const empty = `# Pull Request

## Claim → evidence

| Claim (one sentence) | Kind (\`unit\` / \`boundary\` / \`journey\` / \`deployed\`) | Evidence (command or path that exited 0) |
|----------------------|-----------------------------------------------------|------------------------------------------|
| | | |
`;

const missing = `# Pull Request

## Summary

- something
`;

describe('evaluatePrClaim', () => {
  test('draft skips', () => {
    const r = evaluatePrClaim(empty, { draft: true, strict: true });
    expect(r.ok).toBe(true);
    expect(r.draft).toBe(true);
  });

  test('filled table passes strict', () => {
    const r = evaluatePrClaim(filled, { strict: true });
    expect(r.ok).toBe(true);
    expect(r.emptyClaimRow).toBe(false);
  });

  test('empty table fails strict', () => {
    const r = evaluatePrClaim(empty, { strict: true });
    expect(r.ok).toBe(false);
    expect(r.emptyClaimRow).toBe(true);
  });

  test('missing section fails strict', () => {
    const r = evaluatePrClaim(missing, { strict: true });
    expect(r.ok).toBe(false);
    expect(r.missingSection).toBe(true);
  });

  test('invalid kind fails strict', () => {
    const body = `# PR

## Claim → evidence

| Claim | Kind | Evidence |
|-------|------|----------|
| Something | asdf | bun test |
`;
    const r = evaluatePrClaim(body, { strict: true });
    expect(r.ok).toBe(false);
    expect(r.invalidKind).toBe(true);
  });

  test('compound kinds boundary+unit pass', () => {
    expect(kindCellValid('boundary + unit')).toBe(true);
    expect(kindCellValid('`journey`')).toBe(true);
    expect(kindCellValid('asdf')).toBe(false);
  });
});

describe('WARN_UNTIL_ISO UTC flip', () => {
  test('ISO is UTC Z and parses to finite ms', () => {
    expect(WARN_UNTIL_ISO.endsWith('Z')).toBe(true);
    expect(Number.isFinite(WARN_UNTIL_MS)).toBe(true);
    expect(WARN_UNTIL_MS).toBe(Date.parse(WARN_UNTIL_ISO));
  });

  test('warn-only before UTC midnight on flip day', () => {
    expect(warnOnlyMode(false, Date.parse('2026-07-27T23:59:59.999Z'))).toBe(true);
  });

  test('fail-closed at and after UTC midnight on flip day', () => {
    expect(warnOnlyMode(false, Date.parse('2026-07-28T00:00:00.000Z'))).toBe(false);
    expect(warnOnlyMode(false, Date.parse('2026-07-28T00:00:00.001Z'))).toBe(false);
  });

  test('strict disables warn-only regardless of clock', () => {
    expect(warnOnlyMode(true, Date.parse('2026-07-27T12:00:00.000Z'))).toBe(false);
  });

  test('empty table warn-only before flip; fails after when not strict via nowMs', () => {
    const before = evaluatePrClaim(empty, {
      strict: false,
      nowMs: Date.parse('2026-07-27T23:59:59.999Z'),
    });
    expect(before.ok).toBe(true);
    expect(before.warnOnly).toBe(true);

    const after = evaluatePrClaim(empty, {
      strict: false,
      nowMs: Date.parse('2026-07-28T00:00:00.000Z'),
    });
    expect(after.ok).toBe(false);
    expect(after.warnOnly).toBe(false);
  });
});
