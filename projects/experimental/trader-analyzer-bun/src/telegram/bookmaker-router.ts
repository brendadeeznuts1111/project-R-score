/**
 * @fileoverview 9.1.1.3.1.0: Bookmaker Router for Telegram Mini App
 * @description Routes Mini App requests to bookmaker-specific endpoints using UIContext
 * @module telegram/bookmaker-router
 *
 * Cross-Reference Hub:
 * - @see 6.1.1.2.2.1.2.1 for apiBaseUrl usage pattern
 * - @see 9.1.1.2.1.3 for startParam definition
 * - @see 9.1.1.2.1.4 for context injection
 */

import type { TelegramMiniAppContext } from "./mini-app-context";
import { StructuredLogger } from "../logging/structured-logger";

/**
 * 9.1.1.3.1.0: Routes Mini App requests to bookmaker-specific endpoints using UIContext.
 * Reads `startParam` (e.g., "bookmaker:bet365") to determine API route suffix.
 *
 * This class provides a type-safe way to construct bookmaker-specific API endpoints
 * using the UIContext injected by HTMLRewriter and enhanced by Telegram context.
 *
 * @see 6.1.1.2.2.1.2.1 for apiBaseUrl usage pattern
 * @see 9.1.1.2.1.3 for startParam definition
 *
 * @example 9.1.1.3.1.0.1: Basic Bookmaker Routing
 * // Test Formula:
 * // 1. Initialize router with context containing startParam="bookmaker:bet365"
 * // 2. Call getOddsEndpoint()
 * // 3. Verify endpoint matches expected format
 * // Expected Result: "https://api.hyperbun.com/v1/bookmakers/bet365/odds"
 */
export class BookmakerRouter {
	private readonly context: TelegramMiniAppContext;

	/**
	 * Constructs a BookmakerRouter instance.
	 * Reads UIContext from window.HYPERBUN_UI_CONTEXT (injected by 9.1.1.2.1.4)
	 *
	 * @throws {Error} If UIContext is not injected (see 6.1.1.2.2.2.1.0)
	 */
	constructor() {
		const logger = new StructuredLogger();
		
		if (typeof window === "undefined") {
			const error = new Error(
				"9.1.1.3.1.1: BookmakerRouter must be instantiated in browser context",
			);
			logger.log("BOOKMAKER_ROUTER_ERROR", {
				error: error.message,
				context: "constructor",
				hasWindow: typeof window !== "undefined"
			});
			throw error;
		}

		const context = (window as any)
			.HYPERBUN_UI_CONTEXT as TelegramMiniAppContext;
		if (!context) {
			const error = new Error(
				"9.1.1.3.1.1: UIContext not injected (see 6.1.1.2.2.2.1.0)",
			);
			logger.log("BOOKMAKER_ROUTER_ERROR", {
				error: error.message,
				context: "constructor",
				hasUIContext: !!context
			});
			throw error;
		}

		this.context = context;
	}

	/**
	 * 9.1.1.3.1.2: Constructs bookmaker-specific API endpoint for odds data.
	 *
	 * Extracts bookmaker name from startParam and combines with apiBaseUrl
	 * to create a fully-qualified endpoint URL.
	 *
	 * @returns Fully-qualified API endpoint URL
	 * @throws {Error} If startParam does not contain bookmaker information
	 *
	 * @example
	 * // Given apiBaseUrl="https://api.hyperbun.com" and startParam="bookmaker:bet365"
	 * // Returns: "https://api.hyperbun.com/v1/bookmakers/bet365/odds"
	 */
	getOddsEndpoint(): string {
		const logger = new StructuredLogger();
		const bookmaker = this.context.startParam?.replace("bookmaker:", "");
		if (!bookmaker) {
			const error = new Error("9.1.1.3.1.3: No bookmaker in start_param");
			logger.log("BOOKMAKER_ROUTER_ERROR", {
				error: error.message,
				method: "getOddsEndpoint",
				startParam: this.context.startParam
			});
			throw error;
		}
		// Note: Using v1 route for bookmakers (v17 routes not yet available for bookmaker endpoints)
		// This endpoint flows data correctly and is compatible with the current API structure
		return `${this.context.apiBaseUrl}/v1/bookmakers/${bookmaker}/odds`;
	}

	/**
	 * 9.1.1.3.1.4: Constructs bookmaker-specific API endpoint for balance data.
	 *
	 * @returns Fully-qualified balance endpoint URL
	 * @throws {Error} If startParam does not contain bookmaker information
	 */
	getBalanceEndpoint(): string {
		const logger = new StructuredLogger();
		const bookmaker = this.context.startParam?.replace("bookmaker:", "");
		if (!bookmaker) {
			const error = new Error("9.1.1.3.1.3: No bookmaker in start_param");
			logger.log("BOOKMAKER_ROUTER_ERROR", {
				error: error.message,
				method: "getBalanceEndpoint",
				startParam: this.context.startParam
			});
			throw error;
		}
		// Note: Using v1 route for bookmakers (v17 routes not yet available for bookmaker endpoints)
		// This endpoint flows data correctly and is compatible with the current API structure
		return `${this.context.apiBaseUrl}/v1/bookmakers/${bookmaker}/balance`;
	}

	/**
	 * 9.1.1.3.1.5: Extracts bookmaker name from startParam.
	 *
	 * @returns Bookmaker name or undefined if not present
	 */
	getBookmakerName(): string | undefined {
		return this.context.startParam?.replace("bookmaker:", "");
	}
}
