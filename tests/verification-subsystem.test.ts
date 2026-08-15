// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  canonicalSourceFromUrl,
  subsystemFromCanonicalUrl,
  subsystemFromDocSection,
  subsystemFromProbeName,
  summarizeBySubsystem,
  withSubsystem,
} from '../lib/verification/subsystem.ts';
import type { VerificationResult } from '../lib/verification/types.ts';

describe('lib/verification/subsystem', () => {
  test('maps DocSection to subsystem', () => {
    expect(subsystemFromDocSection('runtime')).toBe('runtime');
    expect(subsystemFromDocSection('pm')).toBe('package-manager');
    expect(subsystemFromDocSection('bundler')).toBe('bundler');
    expect(subsystemFromDocSection('test')).toBe('test');
    expect(subsystemFromDocSection('guides')).toBe('other');
  });

  test('infers subsystem from docs URLs', () => {
    expect(subsystemFromCanonicalUrl('https://bun.com/docs/runtime/utils')).toBe('runtime');
    expect(subsystemFromCanonicalUrl('https://bun.com/docs/pm/cli/install')).toBe(
      'package-manager'
    );
    expect(subsystemFromCanonicalUrl('https://bun.com/docs/bundler/loaders#css')).toBe('bundler');
    expect(
      subsystemFromCanonicalUrl('https://bun.com/docs/runtime/networking/fetch')
    ).toBe('networking');
  });

  test('blog ship notes: default runtime; pm/bundler by anchor topic', () => {
    expect(
      subsystemFromCanonicalUrl('https://bun.com/blog/bun-v1.3.14#bun-image-built-in-image-processing')
    ).toBe('runtime');
    expect(
      subsystemFromCanonicalUrl(
        'https://bun.com/blog/bun-v1.3.14#global-virtual-store'
      )
    ).toBe('package-manager');
    expect(
      subsystemFromCanonicalUrl(
        'https://bun.com/blog/bun-v1.3.5#compile-time-feature-flags-for-dead-code-elimination'
      )
    ).toBe('bundler');
  });

  test('canonicalSource distinguishes docs vs blog', () => {
    expect(canonicalSourceFromUrl('https://bun.com/docs/bundler/loaders')).toBe('docs');
    expect(canonicalSourceFromUrl('https://bun.com/blog/bun-v1.3.14#http-3-quic-support-in-bun-serve')).toBe('blog');
  });

  test('probe name heuristics', () => {
    expect(subsystemFromProbeName('install platform: linker')).toBe('package-manager');
    expect(subsystemFromProbeName('bundler:loader.css')).toBe('bundler');
    expect(subsystemFromProbeName('runtime-nits:inspect.sorted')).toBe('runtime');
  });

  test('withSubsystem is idempotent and summarizes', () => {
    const rows: VerificationResult[] = [
      withSubsystem({
        name: 'bundler:loader.css.explicit',
        expected: 'ok',
        actual: 'ok',
        passed: true,
        canonical: 'https://bun.com/docs/bundler/loaders#css',
      }),
      withSubsystem({
        name: 'install platform: cache',
        expected: 'ok',
        actual: 'fail',
        passed: false,
        canonical: 'https://bun.com/docs/pm/cli/install',
      }),
    ];
    expect(rows[0]!.subsystem).toBe('bundler');
    expect(rows[0]!.canonicalSource).toBe('docs');
    expect(rows[1]!.subsystem).toBe('package-manager');
    const summary = summarizeBySubsystem(rows);
    expect(summary.bundler).toEqual({ passed: 1, total: 1 });
    expect(summary['package-manager']).toEqual({ passed: 0, total: 1 });
  });
});
