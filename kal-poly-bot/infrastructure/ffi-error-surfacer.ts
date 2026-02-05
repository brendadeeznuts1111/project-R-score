import { feature } from "bun:bundle";
import "./types.d.ts";

// Actionable dlopen errors with library paths
export class FFIErrorSurfac {
  // Zero-cost when FFI_ERROR_SURFACE is disabled
  static dlopen(
    libraryPath: string,
    options: Record<string, unknown> = {}
  ): unknown {
    if (!feature("FFI_ERROR_SURFACE") || !globalThis.Bun?.dlopen) {
      // Legacy: generic error messages
      return {};
    }

    try {
      return globalThis.Bun.dlopen(libraryPath, options);
    } catch (_error) {
      // Component #82: Enhance error with actionable info
      const osError = this.getOSError(libraryPath);
      const enhancedError = new Error(
        `FFI Error: Failed to open library "${libraryPath}"\n` +
          `OS Error: ${osError}\n` +
          `Suggestions: Check file exists, permissions, architecture compatibility`
      );

      // Log to Component #11 audit
      this.logFFIError(libraryPath, osError);

      // Component #12: Threat detection for suspicious library loads
      this.detectSuspiciousLibrary(libraryPath);

      throw enhancedError;
    }
  }

  private static getOSError(libraryPath: string): string {
    try {
      // Try to stat the file to get specific error
      if (globalThis.Bun?.statSync) {
        globalThis.Bun.statSync(libraryPath);
        return "File exists but cannot be loaded (invalid ELF/mach-o header or architecture mismatch)";
      }
      return "Unable to check file status";
    } catch (statError: unknown) {
      const error = statError as { code?: string; message?: string };
      return error.code || error.message || "Unknown error";
    }
  }

  static linkSymbols(definitions: FFISymbolDefinition[]): unknown {
    if (!feature("FFI_ERROR_SURFACE") || !globalThis.Bun?.FFI?.linkSymbols) {
      return {};
    }

    // Validate all definitions have ptr field
    for (const def of definitions) {
      if (!def.ptr) {
        throw new Error(
          `FFI Error: Symbol ${def.name} missing required 'ptr' field ` +
            `(expected function pointer or native pointer)`
        );
      }
    }

    try {
      return globalThis.Bun.FFI.linkSymbols(definitions);
    } catch (error: unknown) {
      // Enhance error propagation
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `FFI linkSymbols failed: ${errorMessage}\n` +
          `Symbols: ${definitions.map((d) => d.name).join(", ")}`
      );
    }
  }

  private static logFFIError(libraryPath: string, osError: string): void {
    if (!feature("INFRASTRUCTURE_HEALTH_CHECKS")) return;

    fetch("https://api.buncatalog.com/v1/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 82,
        action: "ffi_dlopen_failed",
        library: libraryPath,
        osError,
        severity: "medium",
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }

  private static detectSuspiciousLibrary(libraryPath: string): void {
    if (!feature("THREAT_INTEL")) return;

    const suspiciousPatterns = [/libcrypto\.so/, /libssl\.so/, /libc\.so/];

    if (suspiciousPatterns.some((p) => p.test(libraryPath))) {
      fetch("https://api.buncatalog.com/v1/threat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          component: 82,
          threatType: "sensitive_library_load_attempt",
          library: libraryPath,
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    }
  }
}

// Zero-cost export
export const { dlopen, linkSymbols } = feature("FFI_ERROR_SURFACE")
  ? FFIErrorSurfac
  : {
      dlopen: (_p: string, _o?: Record<string, unknown>): unknown => {
        if (globalThis.Bun?.dlopen) {
          return globalThis.Bun.dlopen(_p, _o);
        }
        return {};
      },
      linkSymbols: (d: FFISymbolDefinition[]): unknown => {
        if (globalThis.Bun?.FFI?.linkSymbols) {
          return globalThis.Bun.FFI.linkSymbols(d);
        }
        return {};
      },
    };
