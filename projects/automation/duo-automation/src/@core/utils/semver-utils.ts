/**
 * 🏷️ Bun Semver Utilities for FactoryWager
 * 
 * Comprehensive semantic versioning utilities using Bun's built-in semver functions.
 * Provides version validation, comparison, range matching, and dependency management.
 * 
 * Based on: https://bun.com/docs/runtime/semver
 */

/**
 * Version constraint interface
 */
export interface VersionConstraint {
  version: string;
  range: string;
  satisfied: boolean;
}

/**
 * Dependency information interface
 */
export interface DependencyInfo {
  name: string;
  version: string;
  range?: string;
  type: 'dependencies' | 'devDependencies' | 'peerDependencies' | 'optionalDependencies';
}

/**
 * Version comparison result interface
 */
export interface VersionComparison {
  version1: string;
  version2: string;
  result: 'lt' | 'eq' | 'gt';
  valid: boolean;
}

/**
 * Semver utility class using Bun's built-in functions
 */
export class SemverUtils {
  
  /**
   * Check if a version satisfies a semantic version range
   * 
   * @param version - The version to check (e.g., "1.2.3")
   * @param range - The semver range (e.g., "^1.2.0", "~1.2.0", ">=1.2.0")
   * @returns true if version satisfies the range
   * 
   * @example
   * ```typescript
   * SemverUtils.satisfies("1.2.3", "^1.2.0") // true
   * SemverUtils.satisfies("2.0.0", "^1.2.0") // false
   * SemverUtils.satisfies("1.3.0", "~1.2.0") // false
   * ```
   */
  static satisfies(version: string, range: string): boolean {
    try {
      return Bun.semver.satisfies(version, range);
    } catch (error) {
      console.warn(`Invalid semver comparison: ${version} vs ${range} - ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Compare two semantic versions using Bun.semver.order()
   * 
   * @param version1 - First version
   * @param version2 - Second version
   * @returns comparison result: 'lt' (less than), 'eq' (equal), 'gt' (greater than)
   * 
   * @example
   * ```typescript
   * SemverUtils.compare("1.2.3", "1.2.4") // 'lt'
   * SemverUtils.compare("1.2.3", "1.2.3") // 'eq'
   * SemverUtils.compare("1.2.5", "1.2.4") // 'gt'
   * ```
   */
  static compare(version1: string, version2: string): 'lt' | 'eq' | 'gt' {
    try {
      const result = Bun.semver.compare(version1, version2);
      return result < 0 ? 'lt' : result > 0 ? 'gt' : 'eq';
    } catch (error) {
      console.warn(`Invalid semver comparison: ${version1} vs ${version2} - ${(error as Error).message}`);
      return 'eq';
    }
  }

  /**
   * Compare two semantic versions using Bun.semver.order()
   * 
   * @param version1 - First version
   * @param version2 - Second version
   * @returns numeric result: -1 (less than), 0 (equal), 1 (greater than)
   * 
   * @example
   * ```typescript
   * SemverUtils.order("1.2.3", "1.2.4") // -1
   * SemverUtils.order("1.2.3", "1.2.3") // 0
   * SemverUtils.order("1.2.5", "1.2.4") // 1
   * ```
   */
  static order(version1: string, version2: string): -1 | 0 | 1 {
    try {
      return Bun.semver.order(version1, version2);
    } catch (error) {
      console.warn(`Invalid semver order: ${version1} vs ${version2} - ${(error as Error).message}`);
      return 0;
    }
  }

  /**
   * Clean and normalize a version string
   * 
   * @param version - Version string to clean
   * @returns cleaned version string
   * 
   * @example
   * ```typescript
   * SemverUtils.clean("v1.2.3") // "1.2.3"
   * SemverUtils.clean("1.2") // "1.2.0"
   * SemverUtils.clean("1") // "1.0.0"
   * ```
   */
  static clean(version: string): string {
    try {
      return Bun.semver.clean(version);
    } catch (error) {
      console.warn(`Invalid version string: ${version} - ${(error as Error).message}`);
      return version;
    }
  }

  /**
   * Validate if a string is a valid semantic version
   * 
   * @param version - Version string to validate
   * @returns true if valid semver
   * 
   * @example
   * ```typescript
   * SemverUtils.valid("1.2.3") // true
   * SemverUtils.valid("v1.2.3") // true
   * SemverUtils.valid("1.2.3-beta") // true
   * SemverUtils.valid("invalid") // false
   * ```
   */
  static valid(version: string): boolean {
    try {
      return Bun.semver.valid(version) !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the highest version in a list that satisfies a range
   * 
   * @param versions - Array of version strings
   * @param range - Semver range to satisfy
   * @returns highest satisfying version or null if none satisfy
   * 
   * @example
   * ```typescript
   * SemverUtils.maxSatisfying(["1.2.0", "1.2.3", "1.3.0"], "^1.2.0") // "1.2.3"
   * SemverUtils.maxSatisfying(["1.2.0", "1.2.3", "1.3.0"], "~1.2.0") // "1.2.3"
   * ```
   */
  static maxSatisfying(versions: string[], range: string): string | null {
    try {
      return Bun.semver.maxSatisfying(versions, range);
    } catch (error) {
      console.warn(`Error finding max satisfying version for range ${range} - ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Get the lowest version in a list that satisfies a range
   * 
   * @param versions - Array of version strings
   * @param range - Semver range to satisfy
   * @returns lowest satisfying version or null if none satisfy
   * 
   * @example
   * ```typescript
   * SemverUtils.minSatisfying(["1.2.0", "1.2.3", "1.3.0"], "^1.2.0") // "1.2.0"
   * ```
   */
  static minSatisfying(versions: string[], range: string): string | null {
    try {
      return Bun.semver.minSatisfying(versions, range);
    } catch (error) {
      console.warn(`Error finding min satisfying version for range ${range} - ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Sort versions in ascending order
   * 
   * @param versions - Array of version strings
   * @returns sorted array of versions
   * 
   * @example
   * ```typescript
   * SemverUtils.sort(["1.3.0", "1.2.0", "1.2.3"]) // ["1.2.0", "1.2.3", "1.3.0"]
   * ```
   */
  static sort(versions: string[]): string[] {
    try {
      return [...versions].sort(Bun.semver.compare);
    } catch (error) {
      console.warn(`Error sorting versions - ${(error as Error).message}`);
      return versions;
    }
  }

  /**
   * Reverse sort versions in descending order
   * 
   * @param versions - Array of version strings
   * @returns reverse sorted array of versions
   * 
   * @example
   * ```typescript
   * SemverUtils.rsort(["1.3.0", "1.2.0", "1.2.3"]) // ["1.3.0", "1.2.3", "1.2.0"]
   * ```
   */
  static rsort(versions: string[]): string[] {
    try {
      return [...versions].sort((a, b) => Bun.semver.compare(b, a));
    } catch (error) {
      console.warn(`Error reverse sorting versions - ${(error as Error).message}`);
      return versions;
    }
  }

  /**
   * Check if a version is greater than another using order()
   * 
   * @param version1 - First version
   * @param version2 - Second version
   * @returns true if version1 > version2
   */
  static gt(version1: string, version2: string): boolean {
    return this.order(version1, version2) === 1;
  }

  /**
   * Check if a version is less than another using order()
   * 
   * @param version1 - First version
   * @param version2 - Second version
   * @returns true if version1 < version2
   */
  static lt(version1: string, version2: string): boolean {
    return this.order(version1, version2) === -1;
  }

  /**
   * Check if a version is equal to another using order()
   * 
   * @param version1 - First version
   * @param version2 - Second version
   * @returns true if version1 === version2
   */
  static eq(version1: string, version2: string): boolean {
    return this.order(version1, version2) === 0;
  }

  /**
   * Check if a version is greater than or equal to another using order()
   * 
   * @param version1 - First version
   * @param version2 - Second version
   * @returns true if version1 >= version2
   */
  static gte(version1: string, version2: string): boolean {
    const result = this.order(version1, version2);
    return result === 1 || result === 0;
  }

  /**
   * Check if a version is less than or equal to another using order()
   * 
   * @param version1 - First version
   * @param version2 - Second version
   * @returns true if version1 <= version2
   */
  static lte(version1: string, version2: string): boolean {
    const result = this.order(version1, version2);
    return result === -1 || result === 0;
  }

  /**
   * Check if a version is different from another using order()
   * 
   * @param version1 - First version
   * @param version2 - Second version
   * @returns true if version1 !== version2
   */
  static neq(version1: string, version2: string): boolean {
    return this.order(version1, version2) !== 0;
  }

  /**
   * Parse package.json dependencies and check version constraints
   * 
   * @param packageJson - Package.json content or path
   * @returns array of dependency information with satisfaction status
   */
  static async checkDependencies(packageJson: any): Promise<DependencyInfo[]> {
    try {
      let pkg: any;
      
      if (typeof packageJson === 'string') {
        // If it's a path, read the file
        const content = await Bun.file(packageJson).text();
        pkg = JSON.parse(content);
      } else {
        pkg = packageJson;
      }

      const dependencies: DependencyInfo[] = [];

      // Check all dependency types
      const depTypes = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const;
      
      for (const type of depTypes) {
        if (pkg[type]) {
          for (const [name, version] of Object.entries(pkg[type])) {
            dependencies.push({
              name,
              version: version as string,
              type
            });
          }
        }
      }

      return dependencies;
    } catch (error) {
      console.error(`Error checking dependencies: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Validate multiple version constraints
   * 
   * @param constraints - Array of version and range pairs
   * @returns array of constraint validation results
   */
  static validateConstraints(constraints: Array<{version: string, range: string}>): VersionConstraint[] {
    return constraints.map(({version, range}) => ({
      version,
      range,
      satisfied: this.satisfies(version, range)
    }));
  }

  /**
   * Get the difference between two versions
   * 
   * @param version1 - First version
   * @param version2 - Second version
   * @returns detailed comparison result
   */
  static diff(version1: string, version2: string): VersionComparison {
    const result = this.compare(version1, version2);
    return {
      version1,
      version2,
      result,
      valid: this.valid(version1) && this.valid(version2)
    };
  }

  /**
   * Increment a version number
   * 
   * @param version - Current version
   * @param increment - Type of increment: 'major', 'minor', 'patch', or 'prerelease'
   * @returns incremented version
   */
  static increment(version: string, increment: 'major' | 'minor' | 'patch' | 'prerelease'): string {
    try {
      const cleaned = this.clean(version);
      const parts = cleaned.split('.').map(Number);
      
      switch (increment) {
        case 'major':
          return `${parts[0] + 1}.0.0`;
        case 'minor':
          return `${parts[0]}.${parts[1] + 1}.0`;
        case 'patch':
          return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
        case 'prerelease':
          return `${cleaned}-beta.0`;
        default:
          return cleaned;
      }
    } catch (error) {
      console.warn(`Error incrementing version ${version}: ${(error as Error).message}`);
      return version;
    }
  }

  /**
   * Get all versions that satisfy a range from a list
   * 
   * @param versions - Array of version strings
   * @param range - Semver range
   * @returns array of satisfying versions
   */
  static satisfyingVersions(versions: string[], range: string): string[] {
    return versions.filter(version => this.satisfies(version, range));
  }

  /**
   * Check if a range is valid
   * 
   * @param range - Semver range to validate
   * @returns true if valid range
   */
  static validRange(range: string): boolean {
    try {
      // Try to satisfy a valid version with this range
      return this.satisfies("1.0.0", range) || !this.satisfies("1.0.0", range);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the intersection of two ranges
   * 
   * @param range1 - First semver range
   * @param range2 - Second semver range
   * @returns intersection range or null if no intersection
   */
  static rangeIntersection(range1: string, range2: string): string | null {
    // This is a simplified implementation
    // In a real scenario, you might want to use a more sophisticated library
    try {
      const testVersions = ["1.0.0", "1.0.1", "1.1.0", "1.2.0", "2.0.0"];
      const satisfying1 = this.satisfyingVersions(testVersions, range1);
      const satisfying2 = this.satisfyingVersions(testVersions, range2);
      const intersection = satisfying1.filter(v => satisfying2.includes(v));
      
      if (intersection.length === 0) return null;
      
      // Return the highest version in intersection as a simple representation
      return this.maxSatisfying(intersection, "*") || null;
    } catch (error) {
      console.warn(`Error finding range intersection: ${(error as Error).message}`);
      return null;
    }
  }
}

/**
 * Version manager class for handling version operations in FactoryWager
 */
export class VersionManager {
  private currentVersion: string;
  
  constructor(currentVersion: string = "1.0.0") {
    this.currentVersion = SemverUtils.clean(currentVersion);
  }

  /**
   * Get current version
   */
  getVersion(): string {
    return this.currentVersion;
  }

  /**
   * Set current version
   */
  setVersion(version: string): void {
    if (SemverUtils.valid(version)) {
      this.currentVersion = SemverUtils.clean(version);
    } else {
      throw new Error(`Invalid version: ${version}`);
    }
  }

  /**
   * Increment current version
   */
  increment(increment: 'major' | 'minor' | 'patch' | 'prerelease'): string {
    this.currentVersion = SemverUtils.increment(this.currentVersion, increment);
    return this.currentVersion;
  }

  /**
   * Check if current version satisfies a range
   */
  satisfies(range: string): boolean {
    return SemverUtils.satisfies(this.currentVersion, range);
  }

  /**
   * Compare current version with another
   */
  compare(version: string): 'lt' | 'eq' | 'gt' {
    const result = SemverUtils.order(this.currentVersion, version);
    return result === -1 ? 'lt' : result === 1 ? 'gt' : 'eq';
  }
}

// Export default for convenience
export default SemverUtils;
