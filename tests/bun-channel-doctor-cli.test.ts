import { describe, expect, test } from 'bun:test';
import { parseBunChannelDoctorCliArgs } from '../tools/bun-channel-doctor.ts';

describe('bun channel doctor CLI', () => {
  test('defaults to a read-only check', () => {
    const args = parseBunChannelDoctorCliArgs(['--check']);
    expect(args.save).toBe(false);
    expect(args.json).toBe(false);
    expect(args.root.endsWith('/')).toBe(false);
  });

  test('requires an explicit save flag before artifact writes', () => {
    expect(parseBunChannelDoctorCliArgs(['--save', '--json', '--root=/tmp/repo'])).toEqual({
      root: '/tmp/repo',
      save: true,
      json: true,
    });
  });

  test('rejects unknown mutation-shaped flags', () => {
    expect(() => parseBunChannelDoctorCliArgs(['--upgrade'])).toThrow(
      'Unknown Bun channel doctor option'
    );
  });
});
