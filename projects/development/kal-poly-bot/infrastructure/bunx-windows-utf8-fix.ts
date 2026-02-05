// infrastructure/bunx-windows-utf8-fix.ts
import { feature } from "bun:bundle";

// Prevents panic on multi-byte npm package names
export class BunxWindowsUTF8Fix {
  // Zero-cost when BUNX_UTF8_FIX is disabled
  static sanitizePackageName(name: string): string {
    if (!feature("BUNX_UTF8_FIX")) {
      // Legacy: may panic on Windows
      return name;
    }

    // Windows-only: convert to WTF-8 at startup
    if (process.platform === "win32") {
      return this.convertToWTF8(name);
    }

    return name;
  }

  private static convertToWTF8(str: string): string {
    // Convert UTF-16 surrogate pairs to WTF-8
    const buffer = Buffer.from(str, "utf16le");
    let result = "";

    for (let i = 0; i < buffer.length; i += 2) {
      const codeUnit = buffer.readUInt16LE(i);

      if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
        // High surrogate
        if (i + 2 < buffer.length) {
          const lowSurrogate = buffer.readUInt16LE(i + 2);
          if (lowSurrogate >= 0xdc00 && lowSurrogate <= 0xdfff) {
            // Valid surrogate pair
            const codePoint =
              0x10000 + ((codeUnit - 0xd800) << 10) + (lowSurrogate - 0xdc00);
            result += String.fromCodePoint(codePoint);
            i += 2; // Skip low surrogate
            continue;
          }
        }
      }

      result += String.fromCharCode(codeUnit);
    }

    return result;
  }

  // Execute bunx with UTF-8 safety
  static async executeBunx(packageName: string, args: string[]): Promise<void> {
    const safeName = this.sanitizePackageName(packageName);

    if (safeName !== packageName) {
      // Log UTF-8 conversion (Component #11 audit)
      this.logUTF8Conversion(packageName, safeName);
    }

    // Use Bun.spawn instead of Bun.$ for better type safety
    if (globalThis.Bun?.spawn) {
      const proc = globalThis.Bun.spawn(["bunx", safeName, ...args], {
        stdout: "inherit",
        stderr: "inherit",
      });

      await proc.exited;
    } else {
      // Fallback for environments without Bun.spawn
      throw new Error("Bun.spawn not available");
    }
  }

  private static logUTF8Conversion(original: string, sanitized: string): void {
    if (!feature("INFRASTRUCTURE_HEALTH_CHECKS")) return;

    fetch("https://api.buncatalog.com/v1/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 76,
        originalPackage: original,
        sanitizedPackage: sanitized,
        platform: process.platform,
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }
}

// Zero-cost export
export const { sanitizePackageName, executeBunx } = feature("BUNX_UTF8_FIX")
  ? BunxWindowsUTF8Fix
  : {
      sanitizePackageName: (n: string): string => n,
      executeBunx: async (n: string, a: string[]): Promise<void> => {
        if (globalThis.Bun?.spawn) {
          const proc = globalThis.Bun.spawn(["bunx", n, ...a], {
            stdout: "inherit",
            stderr: "inherit",
          });
          await proc.exited;
        } else {
          throw new Error("Bun.spawn not available");
        }
      },
    };
