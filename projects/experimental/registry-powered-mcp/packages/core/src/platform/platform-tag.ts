/**
 * PlatformTag - Validates and parses platform distribution tags
 *
 * Format: <os>-<arch>[-<abi>]
 * Examples: linux-x64-gnu, darwin-arm64, win32-x64-msvc
 */

export const VALID_OS = ["linux", "darwin", "win32"] as const;
export const VALID_ARCH = ["x64", "arm64"] as const;
export const VALID_ABI = ["gnu", "musl", "msvc"] as const;

export type ValidOS = (typeof VALID_OS)[number];
export type ValidArch = (typeof VALID_ARCH)[number];
export type ValidABI = (typeof VALID_ABI)[number];

export interface PlatformTagParsed {
  os: ValidOS;
  arch: ValidArch;
  abi?: ValidABI;
  raw: string;
}

export class PlatformTagError extends Error {
  constructor(
    message: string,
    public readonly tag: string
  ) {
    super(message);
    this.name = "PlatformTagError";
  }
}

/**
 * PlatformTag parser and validator
 *
 * @example
 * ```ts
 * const tag = PlatformTag.parse("linux-x64-gnu");
 * // { os: "linux", arch: "x64", abi: "gnu", raw: "linux-x64-gnu" }
 *
 * PlatformTag.parse("darwin-arm64");
 * // { os: "darwin", arch: "arm64", abi: undefined, raw: "darwin-arm64" }
 * ```
 */
export const PlatformTag = {
  /**
   * Parse and validate a platform tag string
   * @throws {PlatformTagError} if the tag is invalid
   */
  parse(tag: string): PlatformTagParsed {
    if (!tag || typeof tag !== "string") {
      throw new PlatformTagError("Platform tag must be a non-empty string", tag);
    }

    const parts = tag.split("-");
    if (parts.length < 2 || parts.length > 3) {
      throw new PlatformTagError(
        `Invalid platform tag format: expected "<os>-<arch>" or "<os>-<arch>-<abi>", got "${tag}"`,
        tag
      );
    }

    const [os, arch, abi] = parts;

    if (!VALID_OS.includes(os as ValidOS)) {
      throw new PlatformTagError(
        `Invalid OS "${os}": expected one of ${VALID_OS.join(", ")}`,
        tag
      );
    }

    if (!VALID_ARCH.includes(arch as ValidArch)) {
      throw new PlatformTagError(
        `Invalid arch "${arch}": expected one of ${VALID_ARCH.join(", ")}`,
        tag
      );
    }

    if (abi !== undefined && !VALID_ABI.includes(abi as ValidABI)) {
      throw new PlatformTagError(
        `Invalid ABI "${abi}": expected one of ${VALID_ABI.join(", ")}`,
        tag
      );
    }

    return {
      os: os as ValidOS,
      arch: arch as ValidArch,
      abi: abi as ValidABI | undefined,
      raw: tag,
    };
  },

  /**
   * Check if a tag is valid without throwing
   */
  isValid(tag: string): boolean {
    try {
      PlatformTag.parse(tag);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Safe parse that returns null instead of throwing
   */
  safeParse(tag: string): PlatformTagParsed | null {
    try {
      return PlatformTag.parse(tag);
    } catch {
      return null;
    }
  },

  /**
   * Create a platform tag string from components
   */
  create(os: ValidOS, arch: ValidArch, abi?: ValidABI): string {
    return abi ? `${os}-${arch}-${abi}` : `${os}-${arch}`;
  },

  /**
   * Get all valid platform combinations
   */
  allCombinations(): string[] {
    const combinations: string[] = [];

    for (const os of VALID_OS) {
      for (const arch of VALID_ARCH) {
        combinations.push(`${os}-${arch}`);
        for (const abi of VALID_ABI) {
          combinations.push(`${os}-${arch}-${abi}`);
        }
      }
    }

    return combinations;
  },

  /**
   * Get current platform tag based on runtime
   */
  current(): string {
    const os = process.platform === "win32" ? "win32" : process.platform === "darwin" ? "darwin" : "linux";
    const arch = process.arch === "arm64" ? "arm64" : "x64";
    return `${os}-${arch}`;
  },
} as const;
