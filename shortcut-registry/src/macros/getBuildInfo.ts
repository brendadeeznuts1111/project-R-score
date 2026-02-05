/**
 * Bun Macro: Get build information at bundle-time
 * 
 * This macro collects various build-time information and inlines it
 * into your bundle.
 * 
 * Macros can be async, so if you need async operations, you can return
 * a Promise and Bun will await it automatically.
 * 
 * @example
 * ```ts
 * import { getBuildInfo } from './macros/getBuildInfo.ts' with { type: 'macro' };
 * 
 * const buildInfo = getBuildInfo();
 * console.log(`Version: ${buildInfo.version}`);
 * console.log(`Built: ${buildInfo.buildTime}`);
 * ```
 */

import { getGitCommitHash, getShortCommitHash } from './getGitCommitHash';

// Note: Macros can be async - Bun automatically awaits Promises

export interface BuildInfo {
  version: string;
  buildTime: string;
  gitCommit: string;
  shortCommit: string;
  nodeEnv: string;
  platform: string;
}

/**
 * Get comprehensive build information at bundle-time
 * 
 * Note: This macro can be async - Bun will await the Promise automatically
 */
export async function getBuildInfo(): Promise<BuildInfo> {
  const gitCommit = getGitCommitHash();
  const shortCommit = getShortCommitHash();
  
  // Try to read version from package.json
  let version = '0.0.0';
  try {
    // Use Bun's file API - macros can use async/await
    const file = Bun.file('package.json');
    if (file.size > 0) {
      const pkgText = await file.text();
      const pkg = JSON.parse(pkgText);
      version = pkg.version || '0.0.0';
    }
  } catch {
    // If we can't read package.json, use default
  }

  return {
    version,
    buildTime: new Date().toISOString(),
    gitCommit,
    shortCommit,
    nodeEnv: process.env.NODE_ENV || 'development',
    platform: process.platform,
  };
}

/**
 * Get a simple build version string
 */
export async function getBuildVersion(): Promise<string> {
  const info = await getBuildInfo();
  return `${info.version}-${info.shortCommit}`;
}
