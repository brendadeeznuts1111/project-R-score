#!/usr/bin/env bun
/**
 * Timeout Scraper Protection
 * 
 * Prevents hangs with automatic timeout handling
 * 0 hangs guaranteed!
 */

interface ScrapeOptions {
	timeoutMs?: number;
	retries?: number;
	retryDelayMs?: number;
}

interface ScrapeResult<T> {
	success: boolean;
	data?: T;
	error?: string;
	duration: number;
	timedOut: boolean;
}

// ==================== SAFE SCRAPER ====================
class SafeScraper {
	private defaultTimeout = 5000; // 5 seconds
	private defaultRetries = 3;
	private defaultRetryDelay = 1000; // 1 second
	
	/**
	 * Safe fetch with timeout protection
	 */
	async scrape<T>(
		url: string,
		options: ScrapeOptions = {}
	): Promise<ScrapeResult<T>> {
		const timeoutMs = options.timeoutMs ?? this.defaultTimeout;
		const retries = options.retries ?? this.defaultRetries;
		const retryDelayMs = options.retryDelayMs ?? this.defaultRetryDelay;
		
		let lastError: Error | null = null;
		
		for (let attempt = 0; attempt <= retries; attempt++) {
			const startTime = performance.now();
			
			try {
				// Create timeout signal
				const timeoutSignal = AbortSignal.timeout(timeoutMs);
				
				// Fetch with timeout
				const response = await fetch(url, {
					signal: timeoutSignal,
					headers: {
						'User-Agent': 'Mozilla/5.0 (compatible; SafeScraper/1.0)',
					}
				});
				
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}
				
				const data = await response.json() as T;
				const duration = performance.now() - startTime;
				
				return {
					success: true,
					data,
					duration,
					timedOut: false
				};
			} catch (error) {
				const duration = performance.now() - startTime;
				const isTimeout = error instanceof Error && 
					(error.name === 'AbortError' || error.message.includes('timeout'));
				
				lastError = error instanceof Error ? error : new Error(String(error));
				
				// If timeout and we have retries left, wait and retry
				if (isTimeout && attempt < retries) {
					console.warn(`⏱️  Timeout on attempt ${attempt + 1}/${retries + 1}, retrying in ${retryDelayMs}ms...`);
					await Bun.sleep(retryDelayMs);
					continue;
				}
				
				// Return error result
				return {
					success: false,
					error: lastError.message,
					duration,
					timedOut: isTimeout
				};
			}
		}
		
		// Should never reach here, but TypeScript needs it
		return {
			success: false,
			error: lastError?.message ?? 'Unknown error',
			duration: 0,
			timedOut: true
		};
	}
	
	/**
	 * Batch scrape with concurrency limit
	 */
	async scrapeBatch<T>(
		urls: string[],
		options: ScrapeOptions & { concurrency?: number } = {}
	): Promise<ScrapeResult<T>[]> {
		const concurrency = options.concurrency ?? 10;
		const results: ScrapeResult<T>[] = [];
		const queue = [...urls];
		
		// Process in parallel batches
		while (queue.length > 0) {
			const batch = queue.splice(0, concurrency);
			const batchResults = await Promise.all(
				batch.map(url => this.scrape<T>(url, options))
			);
			results.push(...batchResults);
		}
		
		return results;
	}
}

// ==================== MAIN ====================
async function main() {
	console.log('🛡️  Safe Scraper - Timeout Protection\n');
	
	const scraper = new SafeScraper();
	
	// Test 1: Successful scrape
	console.log('Test 1: Successful scrape');
	const result1 = await scraper.scrape('https://httpbin.org/json', { timeoutMs: 3000 });
	console.log(`   Success: ${result1.success}`);
	console.log(`   Duration: ${result1.duration.toFixed(2)}ms`);
	console.log(`   Timed out: ${result1.timedOut}`);
	
	// Test 2: Timeout protection
	console.log('\nTest 2: Timeout protection (short timeout)');
	const result2 = await scraper.scrape('https://httpbin.org/delay/10', { 
		timeoutMs: 1000,
		retries: 2
	});
	console.log(`   Success: ${result2.success}`);
	console.log(`   Duration: ${result2.duration.toFixed(2)}ms`);
	console.log(`   Timed out: ${result2.timedOut}`);
	console.log(`   Error: ${result2.error ?? 'none'}`);
	
	// Test 3: Batch scraping
	console.log('\nTest 3: Batch scraping (5 URLs)');
	const urls = [
		'https://httpbin.org/json',
		'https://httpbin.org/uuid',
		'https://httpbin.org/base64/SFRUUEJJTiBpcyBhd2Vzb21l',
		'https://httpbin.org/json',
		'https://httpbin.org/uuid',
	];
	
	const startTime = performance.now();
	const batchResults = await scraper.scrapeBatch(urls, {
		timeoutMs: 3000,
		concurrency: 3
	});
	const batchDuration = performance.now() - startTime;
	
	const successful = batchResults.filter(r => r.success).length;
	const timedOut = batchResults.filter(r => r.timedOut).length;
	
	console.log(`   Total: ${batchResults.length}`);
	console.log(`   Successful: ${successful}`);
	console.log(`   Timed out: ${timedOut}`);
	console.log(`   Duration: ${batchDuration.toFixed(2)}ms`);
	
	console.log('\n✅ Safe scraper tests complete!');
	console.log('🛡️  0 hangs guaranteed with timeout protection!');
}

if (import.meta.main) {
	main().catch(console.error);
}

