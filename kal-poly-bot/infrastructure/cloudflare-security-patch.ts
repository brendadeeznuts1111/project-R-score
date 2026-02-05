import { feature } from "bun:bundle";
import "./types.d.ts";

// Buffer OOB, UTF-16 title, ReadableStream exception (CVE-level)
export class CloudflareSecurityPatch {
  // Zero-cost when CLOUDFLARE_SEC_PATCH is disabled
  static applySecurityPatches(): void {
    if (!feature("CLOUDFLARE_SEC_PATCH")) return;

    // Fix #85a: Buffer OOB write in writeBigInt64{LE,BE}
    this.patchBufferBigIntMethods();

    // Fix #85b: process.title UTF-16 assertion failure
    this.patchProcessTitle();

    // Fix #85c: ReadableStream exception handling
    this.patchReadableStream();

    // Log security patch application (Component #11 audit)
    this.logSecurityPatch();
  }

  private static patchBufferBigIntMethods(): void {
    const methods = [
      "writeBigInt64LE",
      "writeBigInt64BE",
      "writeBigUInt64LE",
      "writeBigUInt64BE",
    ];

    for (const method of methods) {
      const original = (
        Buffer.prototype as Record<
          string,
          (value: bigint, offset?: number) => number
        >
      )[method];

      (
        Buffer.prototype as Record<
          string,
          (value: bigint, offset?: number) => number
        >
      )[method] = function (value: bigint, offset: number = 0): number {
        // Validate bounds before writing
        if (offset < 0 || offset + 8 > this.length) {
          throw new RangeError("Offset is outside the bounds of the Buffer");
        }

        // Validate value range
        const max = method.includes("UInt")
          ? BigInt("0xFFFFFFFFFFFFFFFF")
          : BigInt("0x7FFFFFFFFFFFFFFF");
        const min = method.includes("UInt")
          ? BigInt(0)
          : BigInt("-0x8000000000000000");

        if (value < min || value > max) {
          throw new RangeError(`Value out of range for ${method}`);
        }

        return original.call(this, value, offset);
      };
    }
  }

  private static patchProcessTitle(): void {
    const originalSetter = Object.getOwnPropertyDescriptor(
      process,
      "title"
    )?.set;

    if (originalSetter) {
      Object.defineProperty(process, "title", {
        set: function (value: string) {
          // Validate UTF-16 before setting
          if (Buffer.from(value, "utf16le").length > 1024) {
            throw new RangeError("process.title exceeds maximum length");
          }

          // Check for unpaired surrogates
          for (let i = 0; i < value.length; i++) {
            const code = value.charCodeAt(i);
            if (code >= 0xd800 && code <= 0xdfff) {
              // Check if this is a valid surrogate pair
              if (code <= 0xdbff) {
                if (
                  i + 1 >= value.length ||
                  value.charCodeAt(i + 1) < 0xdcff ||
                  value.charCodeAt(i + 1) > 0xdfff
                ) {
                  throw new Error(
                    "Invalid UTF-16 surrogate pair in process.title"
                  );
                }
                i++; // Skip low surrogate
              }
            }
          }

          originalSetter.call(process, value);
        },
        get: Object.getOwnPropertyDescriptor(process, "title")?.get,
        enumerable: true,
        configurable: true,
      });
    }
  }

  private static patchReadableStream(): void {
    const ReadableStreamConstructor = globalThis.ReadableStream;

    if (ReadableStreamConstructor) {
      const originalConstructor =
        ReadableStreamConstructor.prototype.constructor;

      (ReadableStreamConstructor as any).prototype.constructor = function (
        underlyingSource: unknown,
        strategy?: unknown
      ) {
        try {
          return new (originalConstructor as new (
            ...args: unknown[]
          ) => ReadableStream)(underlyingSource, strategy);
        } catch (error: unknown) {
          // Proper exception handling
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          if (errorMessage.includes("Response.prototype.body")) {
            throw new TypeError(
              "ReadableStream initialization failed for Response.body"
            );
          }
          throw error;
        }
      };
    }
  }

  private static logSecurityPatch(): void {
    if (!feature("INFRASTRUCTURE_HEALTH_CHECKS")) return;

    fetch("https://api.buncatalog.com/v1/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 85,
        action: "cloudflare_security_patches_applied",
        severity: "critical",
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }
}

// Zero-cost export
export const { applySecurityPatches } = feature("CLOUDFLARE_SEC_PATCH")
  ? CloudflareSecurityPatch
  : { applySecurityPatches: (): void => {} };
