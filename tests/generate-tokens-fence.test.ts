/**
 * Fence extraction in generate-tokens-from-docs — code body must not include trailing prose.
 */
import { describe, expect, test } from 'bun:test';
import { parsePage } from '../tools/generate-tokens-from-docs.ts';

describe('parsePage fence extraction', () => {
  test('stops at closing fence — no trailing markdown prose in example body', () => {
    const markdown = `# Cron

## Bun.cron

Run a callback on a schedule:

\`\`\`ts
const job = Bun.cron("*/5 * * * *", async () => {
  await syncToDatabase();
});
\`\`\`

In-process scheduling is the lightweight option for long-running servers.

| Col | Val |
| --- | --- |
| A   | B   |
`;
    const entries = parsePage(
      markdown,
      'Cron',
      'https://bun.com/docs/runtime/cron.md'
    );
    const cron = entries.find(e => e.name === 'Bun.cron');
    expect(cron?.examples?.[0]?.body).toBe(
      'const job = Bun.cron("*/5 * * * *", async () => {\n  await syncToDatabase();\n});'
    );
    expect(cron?.examples?.[0]?.body).not.toContain('In-process scheduling');
    expect(cron?.examples?.[0]?.body).not.toContain('```');
  });
});
