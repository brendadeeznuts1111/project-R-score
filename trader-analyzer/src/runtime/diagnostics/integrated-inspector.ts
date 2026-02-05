/**
 * @fileoverview 7.4.1.0.0.0.0: Unified Diagnostic Logger
 * @description Combined diagnostic pipeline for terminal and Telegram output
 * @module runtime/diagnostics/integrated-inspector
 *
 * Cross-Reference Hub:
 * - @see 6.1.1.2.2.1.2.0 for UIContext structure
 * - @see 9.1.1.4.1.0 for Telegram message formatting
 * - @see 7.1.1.0.0.0.0 for table generation
 * - @see 7.2.1.0.0.0.0 for event correlation
 * - @see 7.3.1.0.0.0.0 for string formatting
 */

import type { HyperBunUIContext } from "../../services/ui-context-rewriter";
import { inspectMarketData } from "./bun-inspect-integration";
import { generateEventId } from "./uuid-generator";
import { calculateTelegramPadding } from "./string-formatter";

/**
 * 7.4.1.0.0.0.0: Unified diagnostic logger that feeds into both terminal and Telegram.
 * Demonstrates composition of all Bun utils for Hyper-Bun operations.
 *
 * @see 6.1.1.2.2.1.2.0 for UIContext structure
 * @see 9.1.1.4.1.0 for Telegram message formatting
 * @see 7.1.1.0.0.0.0 for table generation
 * @see 7.2.1.0.0.0.0 for event correlation
 * @see 7.3.1.0.0.0.0 for string formatting
 */
export class HyperBunDiagnostics {
	private readonly sessionId: string;

	constructor() {
		// 7.4.1.1.0: Initialize session with time-ordered UUID
		this.sessionId = generateEventId();
	}

	/**
	 * 7.4.1.2.0: Logs UIContext state to terminal and Telegram monitoring channel.
	 * @param context - The UIContext from HTMLRewriter (6.1.1.2.2.1.2.0)
	 * @param severity - Log level (info, warn, error)
	 *
	 * @example 7.4.1.2.1: Full Diagnostic Snapshot
	 * // Test Formula:
	 * // 1. In /registry.html handler: `diagnostics.logContext(uiContext, 'info')`
	 * // 2. Expected Terminal Output: Colorized table with apiBaseUrl, userRole, featureFlags
	 * // 3. Expected Telegram: Monospace block with aligned columns, prefixed by session UUID
	 *
	 * // Ripgrep Verification:
	 * // rg "7\.4\.1\.2\.0" src/ src/telegram/ --type-add 'log:*.{ts,txt}' -g '!*.log'
	 */
	logContext(
		context: HyperBunUIContext,
		severity: "info" | "warn" | "error",
	): void {
		// 7.4.1.3.0: Terminal output using Bun.inspect.table
		console.log(`[${severity.toUpperCase()}] Session: ${this.sessionId}`);
		console.log(
			inspectMarketData([context], ["userRole", "apiBaseUrl", "featureFlags"]),
		);

		// 7.4.1.4.0: Telegram output using stringWidth for alignment
		if (severity === "error") {
			const alertId = generateEventId();
			const lines = [
				`🚨 Alert #${alertId}`,
				`Session: ${this.sessionId}`,
				`Role: ${calculateTelegramPadding(context.userRole || "guest", 10)} | Debug: ${context.debugMode}`,
			];
			// Send to Telegram monitoring (see 9.1.1.4.1.0)
			// This would integrate with Telegram sender:
			// await sendTelegramMessage('```\n' + lines.join('\n') + '\n```');
			console.log("Telegram Alert (would send):");
			console.log("```");
			console.log(lines.join("\n"));
			console.log("```");
		}
	}

	/**
	 * 7.4.1.5.0: Gets the current session ID.
	 * @returns Session UUID
	 */
	getSessionId(): string {
		return this.sessionId;
	}
}
