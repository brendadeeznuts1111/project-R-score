#!/usr/bin/env bun
/**
 * Component #127: Cookie-Manager
 * Primary API: Bun.CookieMap (primary)
 * Secondary API: Bun.Cookie (secondary)
 * Performance SLA: <2MB heap (Isolated)
 * Parity Lock: 5g6h...7i8j
 * Status: HARDENED
 */

import { feature } from "bun:bundle";

export class CookieManager {
  private static instance: CookieManager;

  private constructor() {}

  static getInstance(): CookieManager {
    if (!this.instance) {
      this.instance = new CookieManager();
    }
    return this.instance;
  }

  parse(cookieHeader: string): Map<string, string> {
    if (!feature("COOKIE_MANAGER")) {
      return new Map();
    }

    const cookieMap = new Bun.CookieMap(cookieHeader);
    const result = new Map<string, string>();

    for (const [key, value] of cookieMap.entries()) {
      result.set(key, value);
    }

    return result;
  }

  serialize(cookies: Record<string, string>): string {
    if (!feature("COOKIE_MANAGER")) {
      return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ");
    }

    const cookieMap = new Bun.CookieMap();
    for (const [key, value] of Object.entries(cookies)) {
      cookieMap.set(key, value);
    }
    return cookieMap.toString();
  }
}

export const cookieManager = feature("COOKIE_MANAGER")
  ? CookieManager.getInstance()
  : {
      parse: () => new Map(),
      serialize: (cookies: Record<string, string>) => 
        Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; "),
    };

export default cookieManager;
