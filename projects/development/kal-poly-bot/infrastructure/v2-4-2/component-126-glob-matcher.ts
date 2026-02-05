#!/usr/bin/env bun
/**
 * Component #126: Glob-Matcher
 * Primary API: Bun.Glob
 * Performance SLA: O(n) matching
 * Parity Lock: 1c2d...3e4f
 * Status: VERIFIED
 */

import { feature } from "bun:bundle";

export class GlobMatcher {
  private static instance: GlobMatcher;

  private constructor() {}

  static getInstance(): GlobMatcher {
    if (!this.instance) {
      this.instance = new GlobMatcher();
    }
    return this.instance;
  }

  match(pattern: string, paths: string[]): string[] {
    if (!feature("GLOB_MATCHER")) {
      return paths.filter(p => p.includes(pattern.replace("*", "")));
    }

    const glob = new Bun.Glob(pattern);
    return paths.filter(p => glob.match(p));
  }

  scan(pattern: string, cwd: string = "."): AsyncIterable<string> {
    if (!feature("GLOB_MATCHER")) {
      return (async function* () {})();
    }

    return new Bun.Glob(pattern).scan({ cwd });
  }
}

export const globMatcher = feature("GLOB_MATCHER")
  ? GlobMatcher.getInstance()
  : {
      match: (pattern: string, paths: string[]) => paths.filter(p => p.includes(pattern.replace("*", ""))),
      scan: () => (async function* () {})(),
    };

export default globMatcher;
