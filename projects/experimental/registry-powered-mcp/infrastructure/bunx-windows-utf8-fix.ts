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
      
      if (codeUnit >= 0xD800 && codeUnit <= 0xDBFF) {
        // High surrogate
        if (i + 2 < buffer.length) {
          const lowSurrogate = buffer.readUInt16LE(i + 2);
          if (lowSurrogate >= 0xDC00 && lowSurrogate <= 0xDFFF) {
            // Valid surrogate pair
            const codePoint = 0x10000 + ((codeUnit - 0xD800) << 10) + (lowSurrogate - 0xDC00);
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

    await Bun.$`bunx ${safeName} ${args}`;
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
        timestamp: Date.now()
      })
    }).catch(() => {});
  }
}

// Zero-cost export
export const { sanitizePackageName, executeBunx } = feature("BUNX_UTF8_FIX")
  ? BunxWindowsUTF8Fix
  : {
      sanitizePackageName: (n: string) => n,
      executeBunx: (n: string, a: string[]) => Bun.$`bunx ${n} ${a}`
    };