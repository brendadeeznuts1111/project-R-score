import { verificationScriptGitHubRawUrl } from '../http/verification-scripts.ts';
import { RELEASE_PROOF_REPORT_PATH } from './types.ts';

const RELEASE_SOURCE_PATH = 'tools/verify-bun-release.ts';

export type BuildVerificationLinksOptions = {
  reportPath?: string;
  sourcePath?: string;
};

export function buildVerificationLinks(
  canonical?: string,
  options: BuildVerificationLinksOptions = {}
): {
  docs: string;
  source: string;
  report: string;
} {
  return {
    docs: canonical ?? 'https://bun.com/docs',
    source: verificationScriptGitHubRawUrl(options.sourcePath ?? RELEASE_SOURCE_PATH),
    report: options.reportPath ?? RELEASE_PROOF_REPORT_PATH,
  };
}
