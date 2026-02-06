/**
 * 🔧 bun:ffi Environment Variable Support - Bun v1.3.7+ v1.4
 *
 * Documents C_INCLUDE_PATH and LIBRARY_PATH support for non-FHS systems
 * like NixOS, Guix, and custom environments.
 *
 * @version 4.5
 * @see https://bun.sh/docs/api/ffi
 */

/**
 * FFI Build Configuration
 *
 * Environment variables now respected by bun:ffi cc():
 * - C_INCLUDE_PATH: Additional header search paths
 * - LIBRARY_PATH: Additional library search paths (ld -L equivalent)
 *
 * This enables clean builds on:
 * - NixOS (no /usr/include or /usr/lib)
 * - Guix System
 * - Custom toolchain installations
 * - Containerized build environments
 */
export interface FFIEnvConfig {
  /** Colon-separated paths for #include resolution */
  C_INCLUDE_PATH?: string;
  /** Colon-separated paths for -l library resolution */
  LIBRARY_PATH?: string;
  /** Additional compiler flags */
  CFLAGS?: string;
  /** Additional linker flags */
  LDFLAGS?: string;
}

/**
 * Example: NixOS FFI Build
 *
 * ```bash
 * export C_INCLUDE_PATH="/nix/store/...-zlib-1.3/include"
 * export LIBRARY_PATH="/nix/store/...-zlib-1.3/lib"
 * bun run build-ffi.ts
 * ```
 */
export const FFI_EXAMPLES = {
  NIXOS: `export C_INCLUDE_PATH="/nix/store/\$(nix-build '<nixpkgs>' -A zlib)/include"
export LIBRARY_PATH="/nix/store/\$(nix-build '<nixpkgs>' -A zlib)/lib"
bun run build-ffi.ts`,

  GUIX: `export C_INCLUDE_PATH="/gnu/store/...-zlib-1.3/include"
export LIBRARY_PATH="/gnu/store/...-zlib-1.3/lib"
bun run build-ffi.ts`,

  CUSTOM_TOOLCHAIN: `export C_INCLUDE_PATH="/opt/custom-toolchain/include:/usr/local/include"
export LIBRARY_PATH="/opt/custom-toolchain/lib:/usr/local/lib"
CFLAGS="-O3 -march=native" bun run build-ffi.ts`,
} as const;

/**
 * Build FFI bindings with proper environment
 */
export function buildFFIBindings(config: {
  source: string;
  includes?: string[];
  libraries?: string[];
  symbols: Record<
    string,
    {
      args: string[];
      returns: string;
    }
  >;
}): void {
  const env = process.env as FFIEnvConfig;

  console.log('🔧 FFI Build Environment:');
  console.log(`   C_INCLUDE_PATH: ${env.C_INCLUDE_PATH || '(system default)'}`);
  console.log(`   LIBRARY_PATH: ${env.LIBRARY_PATH || '(system default)'}`);
  console.log(`   CFLAGS: ${env.CFLAGS || '(none)'}`);
  console.log(`   Source: ${config.source}`);
  console.log(`   Libraries: ${config.libraries?.join(', ') || '(none)'}`);
}

/**
 * Verify FFI environment is properly configured
 */
export function verifyFFIEnvironment(): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const env = process.env;

  if (process.platform === 'linux' && !env.LIBRARY_PATH) {
    // Check if we're on a non-FHS system
    try {
      const fs = require('fs');
      if (!fs.existsSync('/usr/include/stdio.h')) {
        issues.push('Non-FHS system detected but LIBRARY_PATH not set');
        issues.push('NixOS/Guix require C_INCLUDE_PATH and LIBRARY_PATH');
      }
    } catch {}
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
