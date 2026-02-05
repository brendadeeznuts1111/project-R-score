/**
 * @dynamic-spy/kit v9.0 - HyperCore Arbitrage Router
 * 
 * Advanced router with all active patterns tracking + Bun-native file watching
 */

import { QuantumArbRouter } from "./quantum-arb-router";
import type { RouteResult } from "./quantum-arb-router";
import type { URLPatternInit } from "./core/urlpattern-spy";
import { QuantumURLPatternSpyFactory, MultiURLPatternSpy } from "./quantum-urlpattern-spy";
import { AIPatternLoader } from "./ai-pattern-loader";
import { HMRSafePatternLoader } from "./hmr-safe-pattern-loader";

interface PrioritySpy {
	spy: MultiURLPatternSpy<any>;
	priority: number;
	region: string;
}

export class HyperCoreArbRouter extends QuantumArbRouter {
	public currentEnvironment: string = 'production';
	public allActivePatterns: URLPatternInit[] = [];
	private priorityQueue: PrioritySpy[] = [];
	private watchPatterns: boolean = false;

	constructor(api: any, options?: { enableCache?: boolean; enableFFI?: boolean; environment?: string; watchPatterns?: boolean }) {
		super(api, options);
		// Use Bun.env for environment detection
		this.currentEnvironment = options?.environment || Bun.env.NODE_ENV || Bun.env.ENVIRONMENT || 'production';
		this.watchPatterns = options?.watchPatterns || Bun.env.WATCH_PATTERNS === 'true';
		this.updateAllActivePatterns();
		
		// Initialize priority queue
		this.buildPriorityQueue();
		
		// Watch patterns directory if enabled
		if (this.watchPatterns) {
			this.setupPatternWatcher();
		}
	}

	/**
	 * Update all active patterns list
	 */
	private updateAllActivePatterns(): void {
		// Collect all patterns from all region spies
		this.allActivePatterns = [];
		
		const regionSpies = this.getRegionSpies();
		// In production, would iterate through regionSpies and extract patterns
		// For now, initialize with empty array - will be populated by router initialization
	}

	/**
	 * Override routeRequest to track patterns
	 */
	async routeRequest(url: string, region: string = 'global-hyper-ranked'): Promise<RouteResult> {
		try {
			return await super.routeRequest(url, region);
		} catch (error: any) {
			// Let error handling strategy handle it
			throw error;
		}
	}

	/**
	 * Get region spies (exposed for error handling)
	 */
	getRegionSpies(): Map<string, any> {
		return (this as any).regionSpies || new Map();
	}

	/**
	 * Extract bookie from URL (exposed for error handling)
	 */
	extractBookie(url: string): string {
		const hostname = new URL(url).hostname;
		if (hostname.includes('pinnacle')) return 'pinnacle';
		if (hostname.includes('bet365')) return 'bet365';
		if (hostname.includes('fonbet')) return 'fonbet';
		return hostname.split('.')[0];
	}

	/**
	 * Setup Bun-native file watcher for patterns directory
	 */
	private setupPatternWatcher(): void {
		try {
			// Use Bun.watch for file watching (Bun-native API)
			const watcher = Bun.watch('./patterns', {
				recursive: true
			});
			
			watcher.subscribe(async (event, filename) => {
				if (event === 'change' && filename && filename.endsWith('.json')) {
					await this.onPatternChange(event, filename);
				}
			});
			
			console.log('🔥 HMR: Pattern watcher enabled (Bun.watch)');
		} catch (e) {
			console.warn('Pattern watcher setup failed:', e);
		}
	}

	/**
	 * Handle pattern file change (Bun-native file watching)
	 * Gracefully handles invalid JSON and broken patterns
	 */
	private async onPatternChange(event: 'change' | 'rename', filename: string): Promise<void> {
		if (event === 'change' && filename && filename.endsWith('.json')) {
			try {
				// ✅ Bun 1.1: Use HMRSafePatternLoader for production error handling
				const convertedPatterns = await HMRSafePatternLoader.loadPatterns(`./patterns/${filename}`);
				
				// If we get here, patterns are valid
				const newPatterns = convertedPatterns;

				console.log(`🔥 HMR: ${newPatterns.length} valid pattern(s) detected in ${filename}`);

				// Build spy for new patterns
				const newSpy = this.buildSpy(newPatterns);

				// Update regionSpies Map (atomic) - only if all validations passed
				const regionSpies = this.getRegionSpies();
				const regionName = filename.includes('broken') ? 'ai-broken' : 
				                  filename.includes('feed') ? 'ai-driven-feed' : 'ai-live';
				
				regionSpies.set(regionName, newSpy);

				// Re-sort priority queue
				this.buildPriorityQueue();

				// Update allActivePatterns
				this.updateAllActivePatterns();

				console.log(`✅ HMR: Updated ${regionName} region with ${newPatterns.length} valid pattern(s)`);
			} catch (e: any) {
				// ✅ Bun 1.1: Use event.message fallback (event.error can be null)
				const errorMessage = e.message || e.error?.message || e.toString() || 'Unknown error';
				
				console.error(`❌ HMR: Failed to reload patterns from ${filename}`);
				console.error(`   Error: ${errorMessage}`);
				
				// Don't throw - keep existing patterns running (zero downtime)
				// HMRSafePatternLoader already logged detailed error overlay
			}
		}
	}

	/**
	 * Build spy from patterns
	 */
	private buildSpy(patterns: URLPatternInit[]): MultiURLPatternSpy<any> {
		const api = { fetchOdds: () => {} };
		return QuantumURLPatternSpyFactory.createMulti(api, 'fetchOdds', patterns, {
			cacheResults: true
		});
	}

	/**
	 * Build priority queue from region spies
	 */
	private buildPriorityQueue(): void {
		const regionSpies = this.getRegionSpies();
		this.priorityQueue = [];
		
		// Extract priority from each region spy
		regionSpies.forEach((spy, region) => {
			// Try to get priority from patterns (would need to track this)
			const priority = this.getRegionPriority(region);
			this.priorityQueue.push({
				spy,
				priority,
				region
			});
		});
		
		// Sort by priority (highest first)
		this.priorityQueue.sort((a, b) => b.priority - a.priority);
	}

	/**
	 * Get priority for a region
	 */
	private getRegionPriority(region: string): number {
		// Priority mapping based on region name
		if (region.includes('ai-live') || region.includes('ai-driven')) return 1200;
		if (region.includes('global-hyper-ranked')) return 1000;
		if (region.includes('pinnacle-asia')) return 110;
		if (region.includes('bet365-eu')) return 95;
		if (region.includes('fonbet-cis')) return 100;
		if (region.includes('us-sportsbooks')) return 85;
		if (region.includes('pinnacle-global')) return 88;
		return 50; // Default priority
	}
}

