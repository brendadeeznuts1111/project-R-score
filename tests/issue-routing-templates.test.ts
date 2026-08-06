// @see https://bun.com/docs/test — bun:test
// Ensures issue templates keep Domain · Tracker · Concept human-queue fields.
import { describe, expect, test } from 'bun:test';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const DIR = '.github/ISSUE_TEMPLATE';

describe('issue routing templates', () => {
  test('ISSUE-ROUTING.md documents the three fields', async () => {
    const doc = await Bun.file('docs/harness/ISSUE-ROUTING.md').text();
    expect(doc).toContain('**Domain**');
    expect(doc).toContain('**Tracker**');
    expect(doc).toContain('**Concept**');
    expect(doc).toContain('not the concept or domain graph');
  });

  test('every markdown issue template includes Domain · Tracker · Concept', async () => {
    const files = (await readdir(DIR)).filter(f => f.endsWith('.md'));
    expect(files.length).toBeGreaterThanOrEqual(6);
    for (const f of files) {
      const text = await Bun.file(join(DIR, f)).text();
      expect(text, f).toContain('**Domain**');
      expect(text, f).toContain('**Tracker**');
      expect(text, f).toContain('**Concept**');
    }
  });

  test('PR templates expose routing fields', async () => {
    const main = await Bun.file('.github/pull_request_template.md').text();
    expect(main).toContain('**Domain**');
    expect(main).toContain('**Tracker**');
    expect(main).toContain('**Concept**');
    expect(main).toMatch(/##\s*Claim\s*→\s*evidence/i);

    const p0 = await Bun.file('.github/pull_request_template_p0.md').text();
    expect(p0).toContain('Domain');
    expect(p0).toContain('Tracker');
    expect(p0).toContain('Concept');
  });

  test('default PR template encodes local authority + claim table shape', async () => {
    const main = await Bun.file('.github/pull_request_template.md').text();
    // check-pr-claim.ts hard-depends on this exact heading + table headers
    expect(main).toContain('## Claim → evidence');
    expect(main).toContain('Claim (one sentence)');
    expect(main).toMatch(/unit.*boundary.*journey.*deployed/i);
    expect(main).toContain('Local merge proof');
    expect(main).toContain('bun run bun:ci');
    expect(main).toContain('GHA is not merge authority');
    // optional sections stay present for agents (fill with n/a)
    expect(main).toContain('## Portal / partner-domain');
    expect(main).toContain('## Harness / Bun tooling');
    expect(main).toContain('## Escape hatches used');
    expect(main).toContain('SKIP_WIRE_LINT');
    expect(main).toContain('check-pr-claim.ts');
  });

  test('P0 PR template keeps claim table + local authority', async () => {
    const p0 = await Bun.file('.github/pull_request_template_p0.md').text();
    expect(p0).toMatch(/##\s*Claim\s*→\s*evidence/i);
    expect(p0).toContain('Claim (one sentence)');
    expect(p0).toContain('Local merge proof');
    expect(p0).toContain('bun run bun:ci');
    expect(p0).toContain('pull_request_template.md');
  });
});
