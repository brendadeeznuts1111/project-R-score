// infrastructure/nodejs-compat-patch.ts
import { feature } from "bun:bundle";

// UV_ENOEXEC/EFTYPE, INSPECT_MAX_BYTES, Response.json
export class NodeJSCompatPatch {
  // Zero-cost when NODEJS_COMPAT_PATCH is disabled
  static patchGlobals(): void {
    if (!feature("NODEJS_COMPAT_PATCH")) return;

    // Fix #84a: INSPECT_MAX_BYTES plain number (not accessor)
    if (typeof Buffer.INSPECT_MAX_BYTES === 'object') {
      Object.defineProperty(Buffer, "INSPECT_MAX_BYTES", {
        value: 200, // Node.js default
        writable: true,
        enumerable: false,
        configurable: true
      });
    }

    // Fix #84b: Response.json() BigInt error
    this.patchResponseJson();

    // Fix #84c: Worker thread N-API safety (Component #74)
    globalThis.__bun_worker_napi_safe = true;

    // Log patch application (Component #11 audit)
    this.logPatchApplied();
  }

  private static patchResponseJson(): void {
    const originalJson = Response.prototype.json;

    Response.prototype.json = async function() {
      const text = await this.text();

      try {
        return JSON.parse(text);
      } catch (error) {
        // Check for BigInt
        if (text.includes("n")) {
          throw new TypeError("Do not know how to serialize a BigInt");
        }

        // Check for non-serializable values
        if (/Symbol|Function|undefined/.test(text)) {
          throw new TypeError("Value is not JSON serializable");
        }

        throw error;
      }
    };
  }

  // Fix libuv error codes on Windows
  static getLibuvError(code: string): string {
    if (!feature("NODEJS_COMPAT_PATCH")) return code;

    const libuvErrors: Record<string, string> = {
      "UV_ENOEXEC": "ENOENT",
      "UV_EFTYPE": "EINVAL"
    };

    return libuvErrors[code] || code;
  }

  private static logPatchApplied(): void {
    if (!feature("INFRASTRUCTURE_HEALTH_CHECKS")) return;

    fetch("https://api.buncatalog.com/v1/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: 84,
        action: "nodejs_compat_patches_applied",
        timestamp: Date.now()
      })
    }).catch(() => {});
  }
}

// Zero-cost export
export const { patchGlobals, getLibuvError } = feature("NODEJS_COMPAT_PATCH")
  ? NodeJSCompatPatch
  : {
      patchGlobals: () => {},
      getLibuvError: (c: string) => c
    };