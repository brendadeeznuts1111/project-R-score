/**
 * @fileoverview 9.1.1.2.1.0: Telegram Mini App Context Integration
 * @description Extends HyperBunUIContext with Telegram-specific authentication and routing
 * @module telegram/mini-app-context
 *
 * Cross-Reference Hub:
 * - @see 6.1.1.2.2.1.2.0 for base HyperBunUIContext interface
 * - @see 6.1.1.2.2.2.1.0 for HTMLRewriter injection mechanism
 * - @see 9.1.1.2.1.4 for context merge function
 */

import type { HyperBunUIContext } from "../services/ui-context-rewriter";

/**
 * 9.1.1.2.1.0: Telegram-specific extension of HyperBunUIContext.
 * Inherits all properties from 6.1.1.2.2.1.2.0 and adds Telegram auth metadata.
 *
 * @see 6.1.1.2.2.1.2.0 for base context interface
 */
export interface TelegramMiniAppContext extends HyperBunUIContext {
	/**
	 * 9.1.1.2.1.1: Telegram authentication hash for request signing
	 * Used to verify requests originate from Telegram WebApp
	 */
	telegramAuthHash: string;

	/**
	 * 9.1.1.2.1.2: User's Telegram ID for RBAC federation
	 * Maps Telegram user to internal role system (see 6.1.1.2.2.1.2.3)
	 */
	telegramUserId: number;

	/**
	 * 9.1.1.2.1.3: Start parameter for deep-linked scenarios
	 * Format: "action:target:params" (e.g., "bookmaker:bet365:odds/live")
	 * Used for bookmaker-specific routing (see 9.1.1.3.1.0)
	 */
	startParam?: string;
}

/**
 * 9.1.1.2.1.6: Derives user role from Telegram user ID
 * Maps Telegram authentication to internal RBAC system
 *
 * @param telegramUserId - Telegram user ID from initDataUnsafe
 * @returns User role for RBAC (see 6.1.1.2.2.1.2.3)
 *
 * @example 9.1.1.2.1.6.1: Role Derivation
 * // Test Formula:
 * // 1. Call deriveRoleFromTelegram(123456789)
 * // 2. Verify returned role matches expected mapping
 * // Expected Result: Role string matching user's permissions
 */
function deriveRoleFromTelegram(
	telegramUserId?: number,
): "analyst" | "admin" | "guest" | "developer" | undefined {
	if (!telegramUserId) {
		return undefined; // Guest fallback
	}

	// TODO: Implement actual role mapping logic
	// This should query your user database or RBAC system
	// For now, return admin for testing
	// In production, this would be:
	// const user = await getUserByTelegramId(telegramUserId);
	// return user?.role;
	return "admin"; // Placeholder
}

/**
 * 9.1.1.2.1.4: Injects combined Hyper-Bun + Telegram context into Mini App window.
 * Must be called AFTER HTMLRewriter's 6.1.1.2.2.2.1.0 injection and BEFORE Mini App initialization.
 *
 * This function merges the base UIContext (injected by HTMLRewriter) with Telegram-specific
 * authentication data from the Telegram WebApp SDK.
 *
 * @param baseContext - Base HyperBunUIContext injected by HTMLRewriter (6.1.1.2.2.2.1.0)
 * @throws {Error} If Telegram WebApp SDK is not available
 *
 * @example 9.1.1.2.2.0.0: Cross-System Context Merge Verification
 * // Test Formula:
 * // 1. Open Mini App with start_param="bookmaker:bet365"
 * // 2. Execute in Telegram WebApp console: `window.HYPERBUN_UI_CONTEXT.startParam === "bookmaker:bet365"`
 * // 3. Expected Result: `true` (context merged correctly)
 *
 * @see 6.1.1.2.2.2.1.0 for base context injection
 * @see 9.1.1.2.1.0 for TelegramMiniAppContext interface
 */
export function injectTelegramContext(baseContext: HyperBunUIContext): void {
	// Type guard for browser environment
	if (typeof window === "undefined") {
		throw new Error(
			"9.1.1.2.1.5: injectTelegramContext must be called in browser context",
		);
	}

	// Access Telegram WebApp SDK
	const telegramData = (window as any).Telegram?.WebApp?.initDataUnsafe;
	if (!telegramData) {
		throw new Error("9.1.1.2.1.5: Telegram WebApp not available");
	}

	// 9.1.1.2.1.4: Merge base context with Telegram-specific data
	const combinedContext: TelegramMiniAppContext = {
		...baseContext,
		telegramAuthHash: telegramData.hash || "",
		telegramUserId: telegramData.user?.id || 0,
		startParam: telegramData.start_param,
		// Override userRole based on Telegram authentication (see 6.1.1.2.2.1.2.3)
		userRole: deriveRoleFromTelegram(telegramData.user?.id),
	};

	// 9.1.1.2.2.0.1: Atomic context replacement (HTMLRewriter's injection is base)
	Object.defineProperty(window, "HYPERBUN_UI_CONTEXT", {
		value: Object.freeze(combinedContext),
		writable: false,
		configurable: false,
	});
}
