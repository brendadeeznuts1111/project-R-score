/**
 * @fileoverview 9.1.1.4.1.0: GitHub Webhook Handler with HTMLRewriter
 * @description Generates Telegram-formatted deployment notifications using HTMLRewriter
 * @module telegram/github-webhook-handler
 *
 * Cross-Reference Hub:
 * - @see 6.1.1.2.2.2.4.0 for timestamp formatting pattern
 * - @see 9.1.1.9.2.0.0 for Telegram message formatting
 */

/**
 * 9.1.1.4.1.0: Generates Telegram-formatted deployment notifications using HTMLRewriter.
 * Reuses 6.1.1.2.2.2.4.0 timestamp implantation logic for consistent formatting.
 *
 * This function demonstrates how HTMLRewriter can be used to format Telegram messages
 * with server-side timestamp injection, ensuring consistent time display across systems.
 *
 * @param commitSha - Git commit SHA to include in deployment message
 * @returns Formatted Telegram HTML message string
 *
 * @see 6.1.1.2.2.2.4.0 for timestamp formatting pattern
 * @see 9.1.1.9.2.0.0 for Telegram HTML formatting guidelines
 *
 * @example 9.1.1.4.1.0.1: Deployment Message Generation
 * // Test Formula:
 * // 1. Call generateDeployMessage("abc123def456")
 * // 2. Verify message contains commit SHA and timestamp
 * // Expected Result: HTML-formatted message with both fields
 */
export async function generateDeployMessage(
	commitSha: string,
): Promise<string> {
	// Use HTMLRewriter to parse and format GitHub's HTML payload
	// This mirrors the pattern used in 6.1.1.2.2.2.4.0 for timestamp injection
	const rewriter = new HTMLRewriter().on("[data-server-timestamp]", {
		element: (el) => {
			// Mirrors 6.1.1.2.2.2.4.0: Server-timestamp implantation
			el.setInnerContent(new Date().toISOString());
		},
	});

	const html =
		`<b>Deploying commit:</b> <code>${commitSha}</code>\n` +
		`<i>Server time:</i> <span data-server-timestamp></span>`;

	const formatted = await rewriter.transform(new Response(html)).text();
	return formatted;
}

/**
 * 9.1.1.4.1.1: Generates Telegram-formatted pull request notification.
 *
 * @param prNumber - Pull request number
 * @param prTitle - Pull request title
 * @param author - PR author username
 * @returns Formatted Telegram HTML message string
 */
export async function generatePRMessage(
	prNumber: number,
	prTitle: string,
	author: string,
): Promise<string> {
	const rewriter = new HTMLRewriter().on("[data-server-timestamp]", {
		element: (el) => {
			el.setInnerContent(new Date().toISOString());
		},
	});

	const html =
		`<b>Pull Request #${prNumber}</b>\n` +
		`<b>Title:</b> ${prTitle}\n` +
		`<b>Author:</b> @${author}\n` +
		`<i>Server time:</i> <span data-server-timestamp></span>`;

	const formatted = await rewriter.transform(new Response(html)).text();
	return formatted;
}
