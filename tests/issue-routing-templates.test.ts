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
});
