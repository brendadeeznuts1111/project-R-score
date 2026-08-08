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
