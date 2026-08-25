// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  buildBunTestCommand,
  buildTestChangedPreview,
  parseShard,
  parseTestChangedArgs,
  runTestChanged,
  type TestChangedArgs,
} from '../scripts/bun-test-changed.ts';

function args(partial: Partial<TestChangedArgs> = {}): TestChangedArgs {
  return {
    ref: undefined,
    watch: false,
    dryRun: false,
    serial: false,
    isolate: false,
    timings: true,
    mainHead: false,
    excludeCiReserved: false,
    shard: undefined,
    flags: [],
    restPositionals: [],
    ...partial,
  };
}

describe('parseTestChangedArgs', () => {
  test('defaults: dirty-tree mode, parallel, not dry-run', () => {
    const parsed = parseTestChangedArgs([]);
    expect(parsed.ref).toBeUndefined();
    expect(parsed.watch).toBe(false);
    expect(parsed.dryRun).toBe(false);
    expect(parsed.serial).toBe(false);
    expect(parsed.timings).toBe(true);
    expect(parsed.mainHead).toBe(false);
    expect(parsed.flags).toEqual([]);
    expect(parsed.restPositionals).toEqual([]);
  });

  test('parses explicit ref and forwards extra positionals', () => {
    const parsed = parseTestChangedArgs(['HEAD~1', 'tests/foo.test.ts']);
    expect(parsed.ref).toBe('HEAD~1');
    expect(parsed.restPositionals).toEqual(['tests/foo.test.ts']);
  });

  test('--main-head defers ref resolution', () => {
    const parsed = parseTestChangedArgs(['--main-head']);
    expect(parsed.mainHead).toBe(true);
    expect(parsed.ref).toBeUndefined();
  });

  test('--exclude-ci-reserved is wrapper-owned and not forwarded as a Bun flag', () => {
    const parsed = parseTestChangedArgs(['--exclude-ci-reserved', '--bail=1']);
    expect(parsed.excludeCiReserved).toBe(true);
    expect(parsed.flags).toEqual(['--bail=1']);
  });

  test('--serial and BUN_TEST_SERIAL opt out of parallel', () => {
    expect(parseTestChangedArgs(['--serial']).serial).toBe(true);
    expect(parseTestChangedArgs([], { BUN_TEST_SERIAL: '1' }).serial).toBe(true);
    expect(parseTestChangedArgs([], { BUN_TEST_SERIAL: 'true' }).serial).toBe(true);
    expect(parseTestChangedArgs([], { BUN_TEST_SERIAL: '0' }).serial).toBe(false);
  });

  test('--dry-run is recognized and stripped from flags', () => {
    const parsed = parseTestChangedArgs(['--dry-run', '--bail=1']);
    expect(parsed.dryRun).toBe(true);
    expect(parsed.flags).toEqual(['--bail=1']);
  });

  test('--no-timings disables and strips the adaptive timing cache flag', () => {
    const parsed = parseTestChangedArgs(['--no-timings', '--bail=1']);
    expect(parsed.timings).toBe(false);
    expect(parsed.flags).toEqual(['--bail=1']);
  });

  test('forwards --watch and other bun test flags', () => {
    const parsed = parseTestChangedArgs(['--watch', '--timeout=30000']);
    expect(parsed.watch).toBe(true);
    expect(parsed.flags).toEqual(['--watch', '--timeout=30000']);
  });

  test('--serial and --main-head are stripped from forwarded flags', () => {
    const parsed = parseTestChangedArgs(['--main-head', '--serial', '--bail=1']);
    expect(parsed.mainHead).toBe(true);
    expect(parsed.serial).toBe(true);
    expect(parsed.flags).toEqual(['--bail=1']);
  });

  test('--isolate is recognized and kept in forwarded flags', () => {
    const parsed = parseTestChangedArgs(['--isolate', '--bail=1']);
    expect(parsed.isolate).toBe(true);
    expect(parsed.flags).toEqual(['--isolate', '--bail=1']);
  });

  test('--shard=M/N is parsed and removed from forwarded flags', () => {
    const parsed = parseTestChangedArgs(['--shard=2/4', '--bail=1']);
    expect(parsed.shard).toEqual({ index: 2, count: 4 });
    expect(parsed.flags).toEqual(['--bail=1']);
  });

  test('--shard without = is forwarded for bun test to parse', () => {
    const parsed = parseTestChangedArgs(['--shard', '2/4', '--bail=1']);
    expect(parsed.shard).toBeUndefined();
    expect(parsed.flags).toEqual(['--shard', '--bail=1']);
  });
});

describe('parseShard', () => {
  test('accepts valid 1-based shard specs', () => {
    expect(parseShard('1/4')).toEqual({ index: 1, count: 4 });
    expect(parseShard('4/4')).toEqual({ index: 4, count: 4 });
  });

  test('rejects non-numeric or malformed shard specs', () => {
    expect(() => parseShard('foo')).toThrow('must be M/N');
    expect(() => parseShard('1/4/5')).toThrow('must be M/N');
    expect(() => parseShard('0/4')).toThrow('positive integers');
    expect(() => parseShard('1/0')).toThrow('positive integers');
  });

  test('rejects out-of-range shard index', () => {
    expect(() => parseShard('5/4')).toThrow('exceeds count');
  });
});

describe('buildBunTestCommand', () => {
  test('adds --parallel by default', () => {
    const cmd = buildBunTestCommand(args(), undefined);
    expect(cmd).toEqual([
      'test',
      '--pass-with-no-tests',
      '--changed',
      '--timings=.cache/bun-test-timings.json',
      '--update-timings',
      '--parallel',
    ]);
  });

  test('uses --changed=<ref> when ref is resolved', () => {
    const cmd = buildBunTestCommand(args(), 'origin/main');
    expect(cmd).toEqual([
      'test',
      '--pass-with-no-tests',
      '--changed=origin/main',
      '--timings=.cache/bun-test-timings.json',
      '--update-timings',
      '--parallel',
    ]);
  });

  test('omits --parallel when serial is requested', () => {
    const cmd = buildBunTestCommand(args({ serial: true }), 'HEAD~1');
    expect(cmd).toEqual([
      'test',
      '--pass-with-no-tests',
      '--changed=HEAD~1',
      '--timings=.cache/bun-test-timings.json',
      '--update-timings',
    ]);
  });

  test('does not duplicate --parallel when already in flags', () => {
    const cmd = buildBunTestCommand(args({ flags: ['--parallel=4'] }), undefined);
    expect(cmd).toEqual([
      'test',
      '--pass-with-no-tests',
      '--changed',
      '--timings=.cache/bun-test-timings.json',
      '--update-timings',
      '--parallel=4',
    ]);
  });

  test('forwards flags and rest positionals after changed/parallel args', () => {
    const cmd = buildBunTestCommand(
      args({ flags: ['--bail=1'], restPositionals: ['tests/foo.test.ts'] }),
      'main'
    );
    expect(cmd).toEqual([
      'test',
      '--pass-with-no-tests',
      '--changed=main',
      '--timings=.cache/bun-test-timings.json',
      '--update-timings',
      '--parallel',
      '--bail=1',
      'tests/foo.test.ts',
    ]);
  });

  test('omits --parallel when isolate is requested', () => {
    const cmd = buildBunTestCommand(args({ isolate: true, flags: ['--isolate'] }), undefined);
    expect(cmd).toEqual([
      'test',
      '--pass-with-no-tests',
      '--changed',
      '--timings=.cache/bun-test-timings.json',
      '--update-timings',
      '--isolate',
    ]);
  });

  test('renders --shard before forwarded flags', () => {
    const cmd = buildBunTestCommand(
      args({ shard: { index: 2, count: 4 }, flags: ['--bail=1'] }),
      'main'
    );
    expect(cmd).toEqual([
      'test',
      '--pass-with-no-tests',
      '--changed=main',
      '--timings=.cache/bun-test-timings.json',
      '--update-timings',
      '--parallel',
      '--shard=2/4',
      '--bail=1',
    ]);
  });

  test('omits auto --parallel when --parallel=N is already in flags', () => {
    const cmd = buildBunTestCommand(
      args({ flags: ['--parallel=8'], restPositionals: ['tests/foo.test.ts'] }),
      'main'
    );
    expect(cmd).toEqual([
      'test',
      '--pass-with-no-tests',
      '--changed=main',
      '--timings=.cache/bun-test-timings.json',
      '--update-timings',
      '--parallel=8',
      'tests/foo.test.ts',
    ]);
  });

  test('does not duplicate explicitly supplied timing flags', () => {
    const cmd = buildBunTestCommand(
      args({ flags: ['--timings=custom.json', '--update-timings'] }),
      'main'
    );
    expect(cmd).toEqual([
      'test',
      '--pass-with-no-tests',
      '--changed=main',
      '--parallel',
      '--timings=custom.json',
      '--update-timings',
    ]);
  });

  test('omits adaptive timing flags when disabled', () => {
    const cmd = buildBunTestCommand(args({ timings: false }), undefined);
    expect(cmd).toEqual(['test', '--pass-with-no-tests', '--changed', '--parallel']);
  });

  test('adds root and reserved ignores only when CI ownership exclusion is requested', () => {
    const cmd = buildBunTestCommand(args({ excludeCiReserved: true }), 'main');
    expect(cmd).toContain('--path-ignore-patterns');
    expect(cmd).toContain('node_modules/**');
    expect(cmd).toContain('tests/fixtures/runtime-cli/**');
    expect(cmd).toContain('tests/harness-ci-deploy.test.ts');
  });
});

describe('buildTestChangedPreview', () => {
  test('code-like changes produce a runnable command and no skip reason', () => {
    const preview = buildTestChangedPreview(args(), undefined, ['lib/foo.ts']);
    expect(preview.codeLike).toBe(true);
    expect(preview.skipReason).toBeUndefined();
    expect(preview.command).toBe(
      'bun test --pass-with-no-tests --changed --timings=.cache/bun-test-timings.json --update-timings --parallel'
    );
  });

  test('non-code files report skip reason', () => {
    const preview = buildTestChangedPreview(args(), 'HEAD~1', ['README.md']);
    expect(preview.codeLike).toBe(false);
    expect(preview.skipReason).toBe('no code-like files in change set');
    expect(preview.command).toBe('(none — would skip)');
  });

  test('empty change set reports empty skip reason', () => {
    const preview = buildTestChangedPreview(args(), undefined, []);
    expect(preview.codeLike).toBe(false);
    expect(preview.skipReason).toBe('empty change set');
  });

  test('respects serial mode in preview command', () => {
    const preview = buildTestChangedPreview(args({ serial: true }), undefined, ['lib/foo.ts']);
    expect(preview.command).toBe(
      'bun test --pass-with-no-tests --changed --timings=.cache/bun-test-timings.json --update-timings'
    );
  });

  test('respects isolate mode in preview command', () => {
    const preview = buildTestChangedPreview(
      args({ isolate: true, flags: ['--isolate'] }),
      undefined,
      ['lib/foo.ts']
    );
    expect(preview.command).toBe(
      'bun test --pass-with-no-tests --changed --timings=.cache/bun-test-timings.json --update-timings --isolate'
    );
  });

  test('includes shard in preview command', () => {
    const preview = buildTestChangedPreview(
      args({ shard: { index: 1, count: 4 } }),
      undefined,
      ['lib/foo.ts']
    );
    expect(preview.command).toBe(
      'bun test --pass-with-no-tests --changed --timings=.cache/bun-test-timings.json --update-timings --parallel --shard=1/4'
    );
  });
});

describe('runTestChanged dry-run mode', () => {
  test('prints preview and exits 0 for code-like changes', async () => {
    const logs: string[] = [];
    const code = await runTestChanged({
      argv: ['--dry-run'],
      listChangedFiles: async () => ['lib/foo.ts'],
      hasCodeLikeChange: () => true,
    });
    expect(code).toBe(0);
  });

  test('prints skip preview when no code-like changes exist', async () => {
    const logs: string[] = [];
    const code = await runTestChanged({
      argv: ['--dry-run'],
      listChangedFiles: async () => ['README.md'],
      hasCodeLikeChange: () => false,
    });
    expect(code).toBe(0);
  });

  test('watch mode prints command without listing changed files', async () => {
    const code = await runTestChanged({
      argv: ['--dry-run', '--watch'],
      listChangedFiles: async () => {
        throw new Error('should not be called in watch dry-run');
      },
    });
    expect(code).toBe(0);
  });
});

describe('runTestChanged normal mode short-circuit', () => {
  test('skips when no code-like changes exist', async () => {
    const code = await runTestChanged({
      argv: [],
      listChangedFiles: async () => ['README.md'],
      hasCodeLikeChange: () => false,
    });
    expect(code).toBe(0);
  });
});
