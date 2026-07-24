/**
 * Channel verify suite → save paths (orthogonal to release channel).
 *
 * Prevents non-release suites from clobbering the release dashboard proof.
 *
 * @see tools/verify-channel.ts
 * @see lib/verification/types.ts — proof report path constants
 */
import {
  BUNDLER_PROOF_REPORT_PATH,
  NETWORKING_CHANNEL_PROOF_REPORT_PATH,
  RELEASE_PROOF_REPORT_PATH,
} from './types.ts';

export const CHANNEL_VERIFY_SUITES = ['release', 'bundler', 'networking', 'all'] as const;
export type ChannelVerifySuite = (typeof CHANNEL_VERIFY_SUITES)[number];

export function isChannelVerifySuite(value: string): value is ChannelVerifySuite {
  return (CHANNEL_VERIFY_SUITES as readonly string[]).includes(value);
}

/** Repo-relative path written on `--save`. */
export function channelSuiteCanonicalSavePath(suite: ChannelVerifySuite): string {
  switch (suite) {
    case 'bundler':
      return `public${BUNDLER_PROOF_REPORT_PATH}`;
    case 'networking':
      return `public${NETWORKING_CHANNEL_PROOF_REPORT_PATH}`;
    case 'release':
    case 'all':
      // Meta-proof (`all`) is the canonical ops dashboard artifact.
      return `public${RELEASE_PROOF_REPORT_PATH}`;
  }
}

/** HTTP path for `_links.report` / dashboard fetch. */
export function channelSuiteReportUrl(suite: ChannelVerifySuite): string {
  switch (suite) {
    case 'bundler':
      return BUNDLER_PROOF_REPORT_PATH;
    case 'networking':
      return NETWORKING_CHANNEL_PROOF_REPORT_PATH;
    case 'release':
    case 'all':
      return RELEASE_PROOF_REPORT_PATH;
  }
}

/** Whether this suite may update `verification-index.json` `canonical`. */
export function channelSuiteUpdatesCanonicalIndex(suite: ChannelVerifySuite): boolean {
  return suite === 'release' || suite === 'all';
}
