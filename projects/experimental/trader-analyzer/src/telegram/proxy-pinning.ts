/**
 * Proxy Pinning Manager
 * Pin messages selectively based on URL patterns in content
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-TELEGRAM-PROXY-PINNING@1.3.4;instance-id=TELEGRAM-PROXY-PINNING-001;version=1.3.4}][PROPERTIES:{proxy_pinning={value:"telegram-proxy-pinning";@root:"20.0.0.0.0.0.0";@chain:["BP-TELEGRAM-CLIENT","BP-URL-PATTERN"];@version:"1.3.4"}}][CLASS:ProxyPinningManager][#REF:v-1.3.4.BP.TELEGRAM.PROXY.PINNING.1.0.A.1.1.DOC.1.1]]
 */

import { URLPattern } from 'bun';
import { EnhancedTelegramClient, getTelegramClient, type TelegramMessage } from './client.js';

interface PinningPattern {
	pattern: URLPattern;
	condition: (message: TelegramMessage) => boolean;
}

/**
 * Pin messages selectively based on URL patterns in content
 */
export class ProxyPinningManager {
	private pinningPatterns: PinningPattern[];
	private telegram: EnhancedTelegramClient;

	constructor() {
		this.telegram = getTelegramClient();
		this.pinningPatterns = [
			// Pin critical incidents with specific URL patterns
			{
				pattern: new URLPattern({ pathname: '/incidents/:incidentId' }),
				condition: (msg) =>
					msg.text.includes('critical') || msg.text.includes('🚨'),
			},

			// Pin benchmark results with performance URLs
			{
				pattern: new URLPattern({ pathname: '/benchmarks/:package/:version' }),
				condition: (msg) =>
					msg.text.includes('avgDuration') && msg.text.includes('ms'),
			},

			// Pin RFC updates with review URLs
			{
				pattern: new URLPattern({ pathname: '/rfc/:rfcId' }),
				condition: (msg) =>
					msg.text.includes('RFC') && msg.text.includes('approved'),
			},

			// Pin security advisories
			{
				pattern: new URLPattern({ pathname: '/security/:advisoryId' }),
				condition: () => true, // Always pin security alerts
			},
		];
	}

	/**
	 * Check if message should be pinned based on content patterns
	 */
	shouldPin(message: TelegramMessage): boolean {
		// Extract URLs from message text
		const urls = this.extractUrls(message.text);

		for (const url of urls) {
			for (const { pattern, condition } of this.pinningPatterns) {
				try {
					const match = pattern.exec(url);
					if (match && condition(message)) {
						return true;
					}
				} catch {
					// Pattern match failed, continue
				}
			}
		}

		// Also check for direct severity keywords
		return this.checkSeverityKeywords(message.text);
	}

	/**
	 * Extract URLs from message text
	 */
	private extractUrls(text: string): string[] {
		const urlRegex = /\bhttps?:\/\/[^\s\]]+/g;
		return text.match(urlRegex) || [];
	}

	/**
	 * Check for severity keywords that warrant pinning
	 */
	private checkSeverityKeywords(text: string): boolean {
		const criticalPatterns = [
			/critical\s+severity/i,
			/🚨/,
			/circuit\s+breaker\s+tripped/i,
			/benchmark\s+regression/i,
			/security\s+advisory/i,
		];

		return criticalPatterns.some((pattern) => pattern.test(text));
	}

	/**
	 * Pin message and return pin status
	 */
	async pinMessageIfNeeded(
		message: TelegramMessage,
		chatId: string | number,
		threadId?: number,
	): Promise<boolean> {
		if (!this.shouldPin(message)) {
			return false;
		}

		try {
			// Send message first
			const sentMessage = await this.telegram.sendMessage({
				...message,
				chatId,
				threadId,
			});

			// Pin the message (if sendMessage returns message_id)
			if (sentMessage && 'message_id' in sentMessage) {
				await this.telegram.pinMessage({
					chatId,
					messageId: (sentMessage as any).message_id,
					threadId,
				});

				console.log('Message pinned', {
					chatId,
					threadId,
					reason: 'URL pattern match or severity keyword',
				});

				return true;
			}

			return false;
		} catch (error) {
			console.error('Failed to pin message', { error, chatId, threadId });
			return false;
		}
	}
}



