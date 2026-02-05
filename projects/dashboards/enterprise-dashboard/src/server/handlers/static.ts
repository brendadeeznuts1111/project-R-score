/**
 * Static Asset Handler
 * 
 * Handles serving static assets: CSS, JS, themes.
 */

import { getConfigIntegrity } from "../../client/config";
import type { ApiResponse } from "../../types";

export interface StaticHandlerContext {
  config: {
    DEVELOPMENT: boolean;
  };
}

/**
 * Serve styles.css (built or dev version)
 */
export async function handleStylesCss(context: StaticHandlerContext): Promise<Response> {
  // Try built version first (production)
  const builtFile = Bun.file("./dist/free/public/styles.css");
  if (await builtFile.exists()) {
    return new Response(builtFile, {
      headers: {
        "Content-Type": "text/css; charset=utf-8",
        "Cache-Control": "public, max-age=31536000, immutable"
      },
    });
  }
  // Fallback to development version
  const devFile = Bun.file("./src/client/styles.css");
  if (await devFile.exists()) {
    return new Response(devFile, {
      headers: { "Content-Type": "text/css; charset=utf-8" },
    });
  }
  return new Response("Not found", { status: 404 });
}

/**
 * Serve themes.css with integrity-based ETag
 */
export async function handleThemesCss(context: StaticHandlerContext): Promise<Response> {
  const file = Bun.file("./public/themes.css");
  if (!(await file.exists())) return new Response("Not found", { status: 404 });
  const integrity = getConfigIntegrity().combined;
  const cacheControl = context.config.DEVELOPMENT
    ? "public, max-age=60"
    : "public, max-age=31536000, immutable";
  return new Response(file, {
    headers: {
      "Content-Type": "text/css; charset=utf-8",
      "Cache-Control": cacheControl,
      ETag: `"${integrity}"`,
    },
  });
}

/**
 * Serve index.js (built or dev version)
 */
export async function handleIndexJs(context: StaticHandlerContext): Promise<Response> {
  // Try built version first (production)
  const builtFile = Bun.file("./dist/free/public/index.js");
  if (await builtFile.exists()) {
    return new Response(builtFile, {
      headers: {
        "Content-Type": "text/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=31536000, immutable"
      },
    });
  }
  // Fallback: return 404 in production if not built
  if (!context.config.DEVELOPMENT) {
    return new Response("Not found", { status: 404 });
  }
  // In dev, return empty response (HMR will handle it)
  return new Response("", { status: 200 });
}
