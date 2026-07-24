// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const BAD = /\bbun run\s+--(watch|hot)\b/;

describe('tools/verify-script-flags', () => {
  test('root package.json dev uses bun --watch not bun run --watch', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
    const dev = pkg.scripts?.dev as string;
    expect(dev).toBe('bun --watch server/server-enhanced.ts');
    expect(BAD.test(dev)).toBe(false);
  });

  test('serve:public:hot embeds --hot immediately after bun', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
    expect(pkg.scripts?.['serve:public:hot']).toBe('bun --hot scripts/serve-public.ts');
    expect(pkg.scripts?.['serve:public:watch']).toBe('bun --watch scripts/serve-public.ts');
  });
});
