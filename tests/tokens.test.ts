/**
 * Portal theme token CLI — end-to-end via `bun run tokens` (tools/portal-tokens.ts).
 * Resolves dotted theme.jsonc paths and prints Bun.color formats.
 *
 * @see https://bun.com/docs/runtime/shell
 * @see tools/portal-tokens.ts
 */
import { expect, test } from 'bun:test';
import { $ } from 'bun';

test('token CLI returns hex for sharp', async () => {
  const { stdout } = await $`bun run tokens --token semantic.pattern.bettor.sharp --format hex`;
  expect(stdout.toString().trim()).toBe('#f38ba8');
});

test('token CLI emits every Bun 1.4 format for a namespaced role', async () => {
  const { stdout } =
    await $`bun run tokens --token namespaces.bun14.accentSoft --all-formats`;
  const report = JSON.parse(stdout.toString()) as {
    token: string;
    sourceColor: string;
    formatCount: number;
    formats: Array<{ format: string; value: unknown; status: string }>;
  };

  expect(report.token).toBe('namespaces.bun14.accentSoft');
  expect(report.sourceColor).toBe('rgba(88, 166, 255, 0.15)');
  expect(report.formatCount).toBe(16);
  expect(report.formats.map(row => row.format)).toEqual([
    'ansi',
    'ansi-16',
    'ansi-256',
    'ansi-16m',
    'css',
    'rgb',
    'rgba',
    'hsl',
    'lab',
    'hex',
    'HEX',
    '{rgb}',
    '{rgba}',
    '[rgb]',
    '[rgba]',
    'number',
  ]);
  expect(report.formats.find(row => row.format === '{rgba}')?.value).toMatchObject({
    r: 88,
    g: 166,
    b: 255,
  });
});

test('token CLI rejects ambiguous single/all format requests', async () => {
  const result = await $`bun run tokens --token namespaces.bun14.accent --format hex --all-formats`
    .nothrow()
    .quiet();
  expect(result.exitCode).toBe(2);
  expect(result.stderr.toString()).toContain('--format and --all-formats are mutually exclusive');
});
