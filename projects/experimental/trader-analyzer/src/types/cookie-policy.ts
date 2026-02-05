/**
 * @fileoverview 10.1.3.1.0.0.0: Cookie Policy Type Definitions - Secure Cookie Type Enforcement
 * @description TypeScript type definitions for enforcing secure cookie policies at compile-time.
 *              Provides `SecureCookieOptions` interface that enforces `httpOnly: true` to prevent
 *              accidental JavaScript access to sensitive cookies. Includes helper function for
 *              setting secure cookies with type safety.
 * @module src/types/cookie-policy
 *
 * [[AUTH][MODULE][INSTANCE][META:{blueprint=BP-TYPES-COOKIE-POLICY@10.1.3.1.0.0.0;instance-id=COOKIE-POLICY-TYPES-001;version=10.1.3.1.0.0.0}]
 * [PROPERTIES:{type={value:"SecureCookieOptions";@root:"ROOT-TYPES";@chain:["BP-TYPES","BP-AUTH","BP-COOKIE"];@version:"10.1.3.1.0.0.0"}}]
 * [INTERFACE:SecureCookieOptions][FUNCTION:setSecureCookie][#REF:v-10.1.3.1.0.0.0.BP.TYPES.COOKIE-POLICY.1.0.A.1.1.TYPE.1.1]
 *
 * Version: 10.1.3.1.0.0.0
 * Component: Cookie Policy Type Definitions
 * Ripgrep Pattern: 10\.1\.3\.1\.0\.0\.0|COOKIE-POLICY-TYPES-001|BP-TYPES-COOKIE-POLICY@10\.1\.3\.1\.0\.0\.0|SecureCookieOptions|setSecureCookie
 *
 * @see 10.1.3.2.0.0.0 for Cookie Security Policies
 * @see 10.1.3.3.0.0.0 for SameSite Policy Enforcement
 * @see 10.1.1.1.0.0.0 for Session Management Service
 * @see https://bun.com/docs/api/http-server Bun.serve() Cookie API Documentation
 *
 * // Ripgrep: 10.1.3.1.0.0.0
 * // Ripgrep: COOKIE-POLICY-TYPES-001
 * // Ripgrep: BP-TYPES-COOKIE-POLICY@10.1.3.1.0.0.0
 * // Ripgrep: SecureCookieOptions
 */

import type { CookieOptions } from 'bun';

/**
 * Secure cookie options that enforce httpOnly: true
 * 
 * TypeScript enforces httpOnly: true to prevent accidental exposure
 * of sensitive cookies to JavaScript.
 * 
 * @interface SecureCookieOptions
 * @version 10.1.3.1.1.0.0.0
 */
export interface SecureCookieOptions extends Omit<CookieOptions, 'httpOnly'> {
	/** Enforced: Cannot be false for secure cookies */
	httpOnly: true;
	
	/** Cookie name */
	name: string;
	
	/** Cookie value */
	value: string;
	
	/** Secure flag (HTTPS only) */
	secure: boolean;
	
	/** SameSite policy */
	sameSite: "strict" | "lax" | "none";
	
	/** Optional path */
	path?: string;
	
	/** Optional max age in seconds */
	maxAge?: number;
	
	/** Optional expiration date */
	expires?: Date;
	
	/** Optional domain */
	domain?: string;
}

/**
 * Set a secure cookie with enforced HttpOnly
 * 
 * @version 10.1.3.1.2.0.0.0
 * @param cookies CookieMap instance
 * @param options Secure cookie options (httpOnly: true enforced by type)
 * @example
 * ```typescript
 * setSecureCookie(request.cookies, {
 *   name: "session_token",
 *   value: token,
 *   httpOnly: true, // Required by type
 *   secure: true,
 *   sameSite: "strict"
 * });
 * ```
 */
export function setSecureCookie(
	cookies: Bun.CookieMap,
	options: SecureCookieOptions
): void {
	// TypeScript enforces httpOnly: true
	cookies.set(options);
}
