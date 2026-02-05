/**
 * @fileoverview 9.1.1.2.0.0: Trading UI Telegram Mini App bootstrapper
 * @description Entry point for Telegram's iframe context with HTMLRewriter integration
 * @module telegram/mini-app
 *
 * This is the ENTRY POINT for Telegram's iframe context.
 * MUST be served through route that applies UIContextRewriter (see 6.1.1.2.2.1.1.1).
 *
 * Cross-Reference Hub:
 * - @see 6.1.1.2.2.2.1.0 for HTMLRewriter context injection
 * - @see 9.1.1.2.1.4 for Telegram context merge
 * - @see 9.1.1.3.1.0 for bookmaker routing
 */

// 9.1.1.2.1.4: Inject Telegram-specific context BEFORE any app logic
import { injectTelegramContext } from "./mini-app-context";
import { BookmakerRouter } from "./bookmaker-router";
import type { HyperBunUIContext } from "../services/ui-context-rewriter";

/**
 * 9.1.1.2.0.1: DOMContentLoaded guarantee (HTMLRewriter has completed 6.1.1.2.2.2.1.0)
 *
 * This ensures that the base UIContext has been injected by HTMLRewriter before
 * we attempt to merge Telegram-specific context.
 */
if (typeof document !== "undefined") {
	document.addEventListener("DOMContentLoaded", () => {
		try {
			// This assumes HTMLRewriter has already injected base context (6.1.1.2.2.1.2.0)
			const baseContext = (window as any)
				.HYPERBUN_UI_CONTEXT as HyperBunUIContext;

			if (!baseContext) {
				throw new Error(
					"9.1.1.2.0.2: Base UIContext not found. Ensure HTMLRewriter injection (6.1.1.2.2.2.1.0)",
				);
			}

			// 9.1.1.2.1.0: Layer Telegram context on top
			injectTelegramContext(baseContext);

			// 9.1.1.3.1.0: Initialize bookmaker routing
			const router = new BookmakerRouter();

			// 9.1.1.6.1.1: Runtime verification
			console.log("9.1.1.2.0.2: Mini App initialized", {
				hasContext: !!(window as any).HYPERBUN_UI_CONTEXT,
				apiBaseUrl: baseContext.apiBaseUrl,
				telegramUserId: (window as any).HYPERBUN_UI_CONTEXT?.telegramUserId,
				bookmaker: router.getBookmakerName(),
			});
		} catch (error) {
			// 9.1.1.2.1.5: Graceful failure reporting
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.error(
				"9.1.1.2.0.3: Mini App initialization failed",
				errorMessage,
			);

			// Show alert in Telegram WebApp if available
			if (typeof window !== "undefined" && (window as any).Telegram?.WebApp) {
				(window as any).Telegram.WebApp.showAlert(
					`Init failed: ${errorMessage}`,
				);
			}
		}
	});
}
