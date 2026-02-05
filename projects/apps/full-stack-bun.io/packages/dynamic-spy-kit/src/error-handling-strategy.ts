/**
 * @dynamic-spy/kit v9.0 - Error Handling Strategy
 * 
 * Advanced fallback chain with metrics & logging + distributed alerting
 */

import { HyperCoreArbRouter } from './hyper-core-arb-router';
import { HyperCoreURLPatternSpyFactory } from './hyper-core-urlpattern-spy';
import type { RouteResult } from './quantum-arb-router';

export class ErrorHandlingStrategy {
	private static readonly fallbackMetrics = new Map<string, number>();

	/**
	 * Handle routing failure with advanced fallback chain
	 */
	static async handleRoutingFailure(
		url: string,
		router: HyperCoreArbRouter,
		originalError: Error
	): Promise<any> {
		this.recordFailure(url);
		console.error(
			`Primary routing failed for ${url} in region ${router.currentEnvironment}:`,
			originalError.message,
			{ stack: originalError.stack }
		);

		// 9.1.0.0 Strategy 1: Retry with 'global-hyper-ranked' if not already attempted
		// Use the router's internal `allActivePatterns` to ensure accurate global check
		if (!router['regionSpies']?.has('global-hyper-ranked') || 
			HyperCoreURLPatternSpyFactory.createMulti({} as any, 'temp', router.allActivePatterns).test(url)) {
			console.log(`Attempting fallback to 'global-hyper-ranked' for ${url}.`);
			try {
				const result = await router.routeRequest(url, 'global-hyper-ranked');
				// If fallback succeeded, log it as a successful recovery
				console.log(`Fallback successful to 'global-hyper-ranked' for ${url}. Matched pattern: ${result.matchedPattern}`);
				return result;
			} catch (e: any) {
				console.warn(`Global Hyper-Ranked fallback also failed for ${url}:`, e.message);
			}
		}

		// 9.2.0.0 Strategy 2: Use generic wildcard if all else fails
		console.log(`Final attempt: generic wildcard match for ${url}.`);
		const genericFallback = HyperCoreURLPatternSpyFactory.createMulti(
			{} as any,
			'genericFallbackHandler',
			[
				{ pathname: '**', search: '**', hostname: '**', protocol: '**', port: '**' }
			]
		);
		const fallbackMatch = genericFallback.exec(url);

		if (fallbackMatch) {
			this.recordFallbackSuccess('generic-wildcard');
			console.warn(`Generic wildcard matched for ${url}. Minimal confidence.`);
			return {
				bookie: router.extractBookie(url),
				confidence: 0.05,
				priority: 0,
				patternId: 'GENERIC_FALLBACK',
				groups: fallbackMatch.bestMatch.result!.pathname.groups,
				matchedPattern: fallbackMatch.bestMatch.pattern.pathname.value,
				regionUsed: 'generic-fallback',
				ffiUsed: false,
				patternType: 'static',
				processingTime: 'N/A', // Cannot measure directly through this path
				rank: router.allActivePatterns.length + 1, // Lowest rank
				allMatches: [fallbackMatch.bestMatch]
			};
		}

		// 9.3.0.0 Critical failure (no pattern matched anywhere), trigger distributed alert
		this.recordFallbackFailure('no-match-at-all');
		console.error(`CRITICAL: Absolutely no pattern matched for URL: ${url}. This needs immediate human intervention.`);
		
		await this.sendCriticalAlert(url, router);

		throw new Error(`CRITICAL: Unroutable URL: ${url}`);
	}

	/**
	 * Send critical alert to external service (Bun-native HTTP/Fetch)
	 */
	private static async sendCriticalAlert(url: string, router: HyperCoreArbRouter): Promise<void> {
		try {
			// Use Bun-native fetch for alerting
			await fetch('https://alert.internal.company.com/critical', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					level: 'CRITICAL',
					message: `Unroutable URL detected: ${url}`,
					service: '@dynamic-spy/kit',
					timestamp: new Date().toISOString(),
					details: {
						url,
						environment: router.currentEnvironment,
						patternsActive: router.allActivePatterns.length
					}
				}),
			});
		} catch (e) {
			console.error('Failed to send critical alert:', e);
		}
	}

	// 9.4.0.0 Internal metric recording functions
	private static recordFailure(url: string): void {
		const key = 'routing_failures';
		const current = ErrorHandlingStrategy.fallbackMetrics.get(key) || 0;
		ErrorHandlingStrategy.fallbackMetrics.set(key, current + 1);
	}

	private static recordFallbackSuccess(type: string): void {
		const key = `fallback_success_${type}`;
		const current = ErrorHandlingStrategy.fallbackMetrics.get(key) || 0;
		ErrorHandlingStrategy.fallbackMetrics.set(key, current + 1);
	}

	private static recordFallbackFailure(type: string): void {
		const key = `fallback_failure_${type}`;
		const current = ErrorHandlingStrategy.fallbackMetrics.get(key) || 0;
		ErrorHandlingStrategy.fallbackMetrics.set(key, current + 1);
	}

	/**
	 * Get metrics for Prometheus/Grafana
	 */
	static getMetrics(): Map<string, number> {
		return new Map(ErrorHandlingStrategy.fallbackMetrics);
	}

	/**
	 * Get Prometheus-compatible metrics
	 */
	static getPrometheusMetrics(): string {
		let metrics = '';
		ErrorHandlingStrategy.fallbackMetrics.forEach((value, key) => {
			metrics += `# HELP ${key} ${key}\n# TYPE ${key} counter\n${key} ${value}\n`;
		});
		return metrics;
	}
}
