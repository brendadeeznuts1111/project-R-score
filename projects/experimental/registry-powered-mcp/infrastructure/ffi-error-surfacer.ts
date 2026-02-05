// infrastructure/ffi-error-surfacer.ts
import { feature } from "bun:bundle";

// Actionable dlopen errors with library paths
export class FFIErrorSurfac {
  // Zero-cost when FFI_ERROR_SURFACE is disabled
  static dlopen(libraryPath: string, options?: any): any {
    if (!feature("FFI_ERROR_SURFACE")) {
      // Legacy: generic error messages
      return Bun.dlopen(libraryPath, options || {});
    }

    try {
      return Bun.dlopen(libraryPath, options || {});
    } catch (error: any) {
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
      Bun.statSync(libraryPath);
      return "File exists but cannot be loaded (invalid ELF/mach-o header or architecture mismatch)";
    } catch (statError: any) {
      return statError.code || statError.message;
    }
  }

  static linkSymbols(definitions: any[]): any {
    if (!feature("FFI_ERROR_SURFACE")) {
      return Bun.FFI.linkSymbols(definitions);
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
      return Bun.FFI.linkSymbols(definitions);
    } catch (error: any) {
      // Enhance error propagation
      throw new Error(`FFI linkSymbols failed: ${error.message}\n` +
                     `Symbols: ${definitions.map(d => d.name).join(', ')}`);
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
        timestamp: Date.now()
      })
    }).catch(() => {});
  }

  private static detectSuspiciousLibrary(libraryPath: string): void {
    if (!feature("THREAT_INTEL")) return;

    const suspiciousPatterns = [
      /libcrypto\.so/,
      /libssl\.so/,
      /libc\.so/
    ];

    if (suspiciousPatterns.some(p => p.test(libraryPath))) {
      fetch("https://api.buncatalog.com/v1/threat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          component: 82,
          threatType: "sensitive_library_load_attempt",
          library: libraryPath,
          timestamp: Date.now()
        })
      }).catch(() => {});
    }
  }
}

// Zero-cost export
export const { dlopen, linkSymbols } = feature("FFI_ERROR_SURFACE")
  ? FFIErrorSurfac
  : {
      dlopen: (p: string, o?: any) => Bun.dlopen(p, o || {}),
      linkSymbols: (d: any[]) => Bun.FFI.linkSymbols(d)
    };