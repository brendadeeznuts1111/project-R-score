/**
 * Nebula-Flow™ Unified Version Management
 * Single source of truth for all version information
 */

// Main application version (semantic versioning: MAJOR.MINOR.PATCH)
export const NEBULA_VERSION = '3.5.0';

// Version metadata
export const VERSION_INFO = {
  version: NEBULA_VERSION,
  major: 3,
  minor: 5,
  patch: 0,
  codename: 'Nebula-Flow™',
  buildDate: new Date().toISOString(),
  releaseType: 'stable' as 'stable' | 'beta' | 'alpha' | 'dev',
  apiVersion: '1.3.0', // API compatibility version
  dashboardVersion: '1.3.0', // Dashboard export format version
  schemaVersion: '1.3.0' // Data schema version
};

// Version comparison utilities
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 < part2) return -1;
    if (part1 > part2) return 1;
  }
  
  return 0;
}

export function isVersionCompatible(required: string, current: string = NEBULA_VERSION): boolean {
  const [reqMajor, reqMinor] = required.split('.').map(Number);
  const [curMajor, curMinor] = current.split('.').map(Number);
  
  // Same major version, minor version >= required
  return reqMajor === curMajor && curMinor >= reqMinor;
}

export function getVersionString(): string {
  return `${VERSION_INFO.codename} v${VERSION_INFO.version} (${VERSION_INFO.releaseType})`;
}

export function getVersionInfo() {
  return {
    ...VERSION_INFO,
    versionString: getVersionString(),
    isCompatible: (required: string) => isVersionCompatible(required)
  };
}

// Export default version for convenience
export default NEBULA_VERSION;
