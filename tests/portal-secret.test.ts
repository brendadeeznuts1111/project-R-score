// @see https://bun.com/docs/test — bun:test
import { describe, expect, test } from 'bun:test';
import {
  envNameFromTitle,
  itemTitlesFromListJson,
  viewArgsFromTarget,
} from '../tools/portal-secret.ts';

describe('portal-secret helpers', () => {
  test('viewArgsFromTarget parses pass:// URI', () => {
    const args = viewArgsFromTarget('pass://factorywager/Cloudflare API Token/password');
    expect(args[0]).toBe('item');
    expect(args[1]).toBe('view');
    expect(args).toContain('pass://factorywager/Cloudflare API Token/password');
  });

  test('viewArgsFromTarget parses vault/title/field', () => {
    const args = viewArgsFromTarget('factorywager/Cloudflare API Token/password');
    expect(args).toContain('--vault-name');
    expect(args).toContain('factorywager');
    expect(args).toContain('--item-title');
    expect(args).toContain('Cloudflare API Token');
    expect(args).toContain('--field');
    expect(args).toContain('password');
  });

  test('viewArgsFromTarget defaults field to password', () => {
    const args = viewArgsFromTarget('factorywager/My Secret');
    expect(args).toContain('--field');
    expect(args[args.indexOf('--field') + 1]).toBe('password');
  });

  test('viewArgsFromTarget rejects bare name', () => {
    expect(() => viewArgsFromTarget('only-one')).toThrow(/pass:\/\//);
  });

  test('viewArgsFromTarget keeps multi-segment titles', () => {
    const args = viewArgsFromTarget('factorywager/Telegram: factorywager_bot/password');
    expect(args[args.indexOf('--item-title') + 1]).toBe('Telegram: factorywager_bot');
    expect(args[args.indexOf('--field') + 1]).toBe('password');
  });

  test('envNameFromTitle sanitizes', () => {
    expect(envNameFromTitle('Cloudflare API Token')).toBe('CLOUDFLARE_API_TOKEN');
    expect(envNameFromTitle('  db.password ')).toBe('DB_PASSWORD');
  });

  test('itemTitlesFromListJson array shape', () => {
    const titles = itemTitlesFromListJson(
      JSON.stringify([{ title: 'A' }, { title: 'B' }, { name: 'C' }])
    );
    expect(titles).toEqual(['A', 'B', 'C']);
  });

  test('itemTitlesFromListJson nested items + metadata.name', () => {
    const titles = itemTitlesFromListJson(
      JSON.stringify({
        items: [
          { title: 'Login One' },
          { data: { metadata: { name: 'Nested Name' } } },
        ],
      })
    );
    expect(titles).toEqual(['Login One', 'Nested Name']);
  });

  test('itemTitlesFromListJson rejects bad JSON', () => {
    expect(() => itemTitlesFromListJson('not-json{')).toThrow(/parse/);
  });
});
