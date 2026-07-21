import { describe, expect, test } from 'bun:test';
import { evaluatePrClaim } from '../scripts/check-pr-claim';

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
});
