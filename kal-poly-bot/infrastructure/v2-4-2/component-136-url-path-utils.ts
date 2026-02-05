#!/usr/bin/env bun
/**
 * Component #136: URL-Path-Utils
 * Primary API: Bun.fileURLToPath
 * Secondary API: Bun.pathToFileURL
 * Performance SLA: <0.1ms
 * Parity Lock: 1q2r...3s4t
 * Status: ACTIVE
 */

import { feature } from "bun:bundle";

export class URLPathUtils {
  private static instance: URLPathUtils;

  private constructor() {}

  static getInstance(): URLPathUtils {
    if (!this.instance) {
      this.instance = new URLPathUtils();
    }
    return this.instance;
  }

  fileURLToPath(url: string | URL): string {
    if (!feature("URL_PATH_UTILS")) {
      return String(url).replace("file://", "");
    }

    const startTime = performance.now();
    const result = Bun.fileURLToPath(url);
    const duration = performance.now() - startTime;

    if (duration > 0.1) {
      console.warn(`⚠️  URL to path SLA breach: ${duration.toFixed(3)}ms > 0.1ms`);
    }

    return result;
  }

  pathToFileURL(path: string): string {
    if (!feature("URL_PATH_UTILS")) {
      return `file://${path}`;
    }

    return Bun.pathToFileURL(path).toString();
  }

  normalize(path: string): string {
    return path.replace(/\\/g, "/").replace(/\/+/g, "/");
  }
}

export const urlPathUtils = feature("URL_PATH_UTILS")
  ? URLPathUtils.getInstance()
  : {
      fileURLToPath: (url: string | URL) => String(url).replace("file://", ""),
      pathToFileURL: (path: string) => `file://${path}`,
      normalize: (path: string) => path.replace(/\\/g, "/").replace(/\/+/g, "/"),
    };

export default urlPathUtils;
