import { describe, expect, test } from 'bun:test';
import {
  colorKernelEvidenceFilled,
  shouldWarnColorKernelEvidence,
} from '../lib/portal/color-kernel-paths.ts';
import {
  evaluatePrClaim,
  kindCellValid,
  mentionedProofIdsMissingFreshRerun,
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

  test('soft: mentioned proof id without freshRerun command is listed', () => {
    const softBody = `${filled}

Mentioned \`branded-ids\` without its freshRerun command.
`;
    expect(mentionedProofIdsMissingFreshRerun(softBody)).toContain('branded-ids');
    const withPaste = `${softBody}\nbun run check:brands:types\n`;
    expect(mentionedProofIdsMissingFreshRerun(withPaste)).not.toContain('branded-ids');
    const r = evaluatePrClaim(softBody, { strict: true });
    expect(r.ok).toBe(true);
    expect(r.missingFreshRerun).toContain('branded-ids');
  });

  test('soft: color-kernel paths without Evidence paste warns but stays ok', () => {
    const templateBody = `${filled}

### Color Kernel Evidence

\`\`\`text
# paste: bun run validate:colors
\`\`\`
`;
    expect(colorKernelEvidenceFilled(templateBody)).toBe(false);
    expect(
      shouldWarnColorKernelEvidence(templateBody, ['lib/portal/color-kernel-align.ts'])
    ).toBe(true);
    const r = evaluatePrClaim(templateBody, {
      strict: true,
      changedFiles: ['lib/portal/color-kernel-align.ts'],
    });
    expect(r.ok).toBe(true);
    expect(r.missingColorKernelEvidence).toBe(true);
    expect(r.failingColorKernelEvidence).toBe(false);

    const pasted = `${filled}

Claim: Color kernel theme-dark aliases are complete and conflict-free (theme v1.1.0).

Evidence:
  ✓ Portal chrome: theme v1.1.0 · 22 dark tokens (SSOT theme.jsonc)
  ✓ Glossary chips: 5 theme aliases · 7 palette keys · 12 categories
`;
    expect(colorKernelEvidenceFilled(pasted)).toBe(true);
    const r2 = evaluatePrClaim(pasted, {
      strict: true,
      changedFiles: ['public/portal/theme.jsonc'],
    });
    expect(r2.missingColorKernelEvidence).toBe(false);
    expect(r2.failingColorKernelEvidence).toBe(false);
  });

  test('soft: failing validate:colors Claim in body warns but stays ok', () => {
    const failBody = `${filled}

Claim: Color kernel theme-dark aliases are inconsistent (theme v1.1.0, 2 mismatch(es), floors ok).
`;
    expect(colorKernelEvidenceFilled(failBody)).toBe(false);
    expect(shouldWarnColorKernelEvidence(failBody, [])).toBe(true);
    const r = evaluatePrClaim(failBody, { strict: true, changedFiles: [] });
    expect(r.ok).toBe(true);
    expect(r.failingColorKernelEvidence).toBe(true);
    expect(r.missingColorKernelEvidence).toBe(false);
  });

  test('soft: color-kernel missing-paste skipped when changedFiles omitted', () => {
    const r = evaluatePrClaim(filled, { strict: true });
    expect(r.missingColorKernelEvidence).toBe(false);
    expect(r.failingColorKernelEvidence).toBe(false);
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
