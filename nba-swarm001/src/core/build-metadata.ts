/**
 * Build metadata module
 * 
 * Use macros to generate build-time constants
 * 
 * Note: This file should be built with `bun build` to execute macros
 */

import { getGitCommitHash, getBuildTimestamp } from "../macros/build.js" with {
  type: "macro",
};
import { getBuildVersion } from "../macros/build.js" with { type: "macro" };
import { getBuildConstants } from "../macros/build.js" with { type: "macro" };
import { getEdgeConfigMacro } from "../macros/config.js" with {
  type: "macro",
};
import { hashGovernanceRulesMacro } from "../macros/integrity.js" with {
  type: "macro",
};

/**
 * Build metadata embedded at bundle time
 * All values are computed at build time and inlined into the bundle
 */
const version = await getBuildVersion();
const constants = await getBuildConstants();
const edgeConfig = await getEdgeConfigMacro();
const governanceHash = await hashGovernanceRulesMacro();

export const BUILD_METADATA = {
  gitHash: getGitCommitHash(),
  buildTime: getBuildTimestamp(),
  version,
  constants,
  edgeConfig,
  governanceHash,
};

/**
 * Get build info as string
 */
export function getBuildInfo(): string {
  const hash = BUILD_METADATA.gitHash ? BUILD_METADATA.gitHash.substring(0, 8) : "dev";
  return `NBA Swarm v${BUILD_METADATA.version} (${hash})`;
}

