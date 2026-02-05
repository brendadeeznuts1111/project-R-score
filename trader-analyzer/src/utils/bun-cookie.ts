/**
 * @fileoverview Bun CookieMap Utilities
 * @description Cookie handling using Bun.CookieMap
 * @module utils/bun-cookie
 *
 * Bun.CookieMap provides a native cookie parser and setter
 * Reference: Bun's CookieMap implementation
 */

import type { Headers } from "bun";

/**
 * Cookie utilities using Bun.CookieMap
 *
 * Bun.CookieMap provides:
 * - Automatic parsing from Cookie header
 * - Type-safe cookie access
 * - Cookie setting with options
 */
export class BunCookieUtils {
	/**
	 * Create CookieMap from headers
	 *
	 * @example
	 * ```ts
	 * const cookies = BunCookieUtils.fromHeaders(req.headers);
	 * const sessionId = cookies.get("sessionId");
	 * ```
	 */
	static fromHeaders(headers: Headers): Bun.CookieMap {
		const cookieHeader = headers.get("cookie") || "";
		return new Bun.CookieMap(cookieHeader);
	}

	/**
	 * Create CookieMap from cookie string
	 *
	 * @example
	 * ```ts
	 * const cookies = BunCookieUtils.fromString("sessionId=abc123; theme=dark");
	 * ```
	 */
	static fromString(cookieString: string): Bun.CookieMap {
		return new Bun.CookieMap(cookieString);
	}

	/**
	 * Get cookie value
	 *
	 * @example
	 * ```ts
	 * const cookies = BunCookieUtils.fromHeaders(req.headers);
	 * const theme = BunCookieUtils.get(cookies, "theme", "light");
	 * ```
	 */
	static get(
		cookies: Bun.CookieMap,
		name: string,
		defaultValue?: string,
	): string | undefined {
		return cookies.get(name) || defaultValue;
	}

	/**
	 * Set cookie with options
	 *
	 * @example
	 * ```ts
	 * BunCookieUtils.set(cookies, "theme", "dark", {
	 *   maxAge: 86400,
	 *   httpOnly: true,
	 *   secure: true,
	 *   sameSite: "strict"
	 * });
	 * ```
	 */
	static set(
		cookies: Bun.CookieMap,
		name: string,
		value: string,
		options?: {
			maxAge?: number;
			expires?: Date;
			domain?: string;
			path?: string;
			httpOnly?: boolean;
			secure?: boolean;
			sameSite?: "strict" | "lax" | "none";
		},
	): void {
		cookies.set(name, value, options);
	}

	/**
	 * Delete cookie
	 *
	 * @example
	 * ```ts
	 * BunCookieUtils.delete(cookies, "sessionId");
	 * ```
	 */
	static delete(cookies: Bun.CookieMap, name: string): void {
		cookies.delete(name);
	}

	/**
	 * Check if cookie exists
	 */
	static has(cookies: Bun.CookieMap, name: string): boolean {
		return cookies.has(name);
	}

	/**
	 * Get all cookie names
	 */
	static keys(cookies: Bun.CookieMap): string[] {
		return Array.from(cookies.keys());
	}

	/**
	 * Get all cookies as object
	 *
	 * @example
	 * ```ts
	 * const allCookies = BunCookieUtils.toObject(cookies);
	 * // { sessionId: "abc123", theme: "dark" }
	 * ```
	 */
	static toObject(cookies: Bun.CookieMap): Record<string, string> {
		const obj: Record<string, string> = {};
		for (const [key, value] of cookies) {
			obj[key] = value;
		}
		return obj;
	}

	/**
	 * Convert CookieMap to Set-Cookie header string
	 *
	 * @example
	 * ```ts
	 * const cookieHeader = BunCookieUtils.toHeaderString(cookies);
	 * response.headers.set("Set-Cookie", cookieHeader);
	 * ```
	 */
	static toHeaderString(cookies: Bun.CookieMap): string {
		// Bun.CookieMap handles this automatically when used with response
		// This is a helper for manual header construction
		const parts: string[] = [];
		for (const [name, value] of cookies) {
			parts.push(`${name}=${value}`);
		}
		return parts.join("; ");
	}
}

/**
 * Export singleton utilities
 */
export const cookieUtils = BunCookieUtils;
