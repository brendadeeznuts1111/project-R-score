// @see https://bun.com/docs/test/index#run-tests
import { describe, expect, test } from 'bun:test';
import {
  channelSuiteCanonicalSavePath,
  channelSuiteReportUrl,
  channelSuiteUpdatesCanonicalIndex,
  isChannelVerifySuite,
} from '../lib/verification/channel-suite.ts';
import {
  snapshotIdFromTags,
  verificationSnapshotFilename,
} from '../lib/verification/channels.ts';
import type { SemanticTags } from '../lib/verification/types.ts';

const tags = {
  channel: 'stable',
  targetVersion: '1.4.0',
  provenanceId: 'x',
  testedAt: 't',
  runtimeVersion: '1.4.0',
} as SemanticTags;

describe('lib/verification/channel-suite', () => {
  test('isChannelVerifySuite accepts known suites', () => {
    expect(isChannelVerifySuite('release')).toBe(true);
    expect(isChannelVerifySuite('bundler')).toBe(true);
    expect(isChannelVerifySuite('networking')).toBe(true);
    expect(isChannelVerifySuite('all')).toBe(true);
    expect(isChannelVerifySuite('test')).toBe(false);
  });

  test('non-release save paths do not clobber release-features.json', () => {
    expect(channelSuiteCanonicalSavePath('bundler')).toBe(
      'public/registry/bundler-loaders-proof.json'
    );
    expect(channelSuiteCanonicalSavePath('networking')).toBe(
      'public/registry/networking-channel-proof.json'
    );
    expect(channelSuiteCanonicalSavePath('release')).toBe(
      'public/registry/release-features.json'
    );
    expect(channelSuiteCanonicalSavePath('all')).toBe(
      'public/registry/release-features.json'
    );
    expect(channelSuiteCanonicalSavePath('bundler')).not.toBe(
      channelSuiteCanonicalSavePath('release')
    );
  });

  test('report URLs match suite artifacts', () => {
    expect(channelSuiteReportUrl('bundler')).toBe('/registry/bundler-loaders-proof.json');
    expect(channelSuiteReportUrl('networking')).toBe(
      '/registry/networking-channel-proof.json'
    );
    expect(channelSuiteReportUrl('release')).toBe('/registry/release-features.json');
    expect(channelSuiteReportUrl('all')).toBe('/registry/release-features.json');
  });

  test('only release/all update index.canonical', () => {
    expect(channelSuiteUpdatesCanonicalIndex('bundler')).toBe(false);
    expect(channelSuiteUpdatesCanonicalIndex('networking')).toBe(false);
    expect(channelSuiteUpdatesCanonicalIndex('release')).toBe(true);
    expect(channelSuiteUpdatesCanonicalIndex('all')).toBe(true);
  });

  test('snapshot filenames isolate bundler from release', () => {
    expect(verificationSnapshotFilename(tags, 'release')).toBe(
      'public/registry/verification-stable-1.4.0.json'
    );
    expect(verificationSnapshotFilename(tags, 'all')).toBe(
      'public/registry/verification-stable-1.4.0.json'
    );
    expect(verificationSnapshotFilename(tags, 'bundler')).toBe(
      'public/registry/verification-stable-1.4.0-bundler.json'
    );
  });

  test('snapshot ids isolate bundler', () => {
    expect(snapshotIdFromTags(tags, 'release')).toBe('stable@1.4.0');
    expect(snapshotIdFromTags(tags, 'all')).toBe('stable@1.4.0');
    expect(snapshotIdFromTags(tags, 'bundler')).toBe('stable@1.4.0+bundler');
  });
});
