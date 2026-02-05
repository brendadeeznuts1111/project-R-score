// src/predictive-dns.ts - Predictive DNS prefetching for hot domains
import { dns } from "bun";

export class PredictiveDNS {
	private frequentHosts = new Map<string, number>();
	private prefetchThreshold = 3; // Prefetch after 3 requests
	private prefetchedHosts = new Set<string>();

	recordRequest(url: string) {
		const hostname = new URL(url).hostname;
		const count = (this.frequentHosts.get(hostname) || 0) + 1;
		this.frequentHosts.set(hostname, count);

		// Auto-prefetch hot domains
		if (
			count === this.prefetchThreshold &&
			!this.prefetchedHosts.has(hostname)
		) {
			console.log(`🔥 Hot domain detected: ${hostname}, prefetching...`);
			dns.prefetch(hostname, 443);
			this.prefetchedHosts.add(hostname);
		}
	}

	getHotDomains() {
		return [...this.frequentHosts.entries()]
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10);
	}

	getStats() {
		return {
			uniqueHosts: this.frequentHosts.size,
			prefetchedHosts: this.prefetchedHosts.size,
			topDomains: this.getHotDomains(),
		};
	}

	// Reset for testing
	reset() {
		this.frequentHosts.clear();
		this.prefetchedHosts.clear();
	}
}

// Singleton instance
export const predictiveDNS = new PredictiveDNS();

export default { PredictiveDNS, predictiveDNS };
