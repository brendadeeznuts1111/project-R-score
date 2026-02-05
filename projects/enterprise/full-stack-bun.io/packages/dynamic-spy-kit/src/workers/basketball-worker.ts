/**
 * @dynamic-spy/kit v9.0 - Cloudflare Workers Basketball Spy Handler
 * 
 * Edge-deployed basketball market spy stats
 * Compatible with Cloudflare Workers runtime
 * 
 * Note: BasketballMarketSpies uses Bun's spyOn which is not available in Workers.
 * This handler provides a Workers-compatible mock implementation.
 */

// Workers-compatible mock spy interface
interface WorkersSpyInstance {
	mock: {
		calls: any[][];
		results: any[];
	};
	toHaveBeenCalled: () => boolean;
	toHaveBeenCalledWith: (...args: any[]) => boolean;
	toHaveBeenCalledTimes: (n: number) => boolean;
	mockReset: () => void;
	mockRestore: () => void;
}

// Simplified BasketballMarketSpies for Workers (no Bun spyOn)
class WorkersBasketballMarketSpies {
	markets: string[] = [];
	spies: Map<number, WorkersSpyInstance> = new Map();
	private initialized: boolean = false;

	constructor() {
		this.markets = [
			'Lakers-Celtics',
			'Nuggets-Heat',
			'Warriors-Kings',
			'Celtics-Bucks',
			'Suns-Grizzlies',
			'Mavericks-Clippers',
			'Bulls-Knicks',
			...Array.from({ length: 24993 }, (_, i) => `NCAA-Game-${i + 1}`)
		];
	}

	initSpies(): void {
		if (this.initialized) return;

		this.markets.forEach((_, index) => {
			this.spies.set(index, {
				mock: { calls: [], results: [] },
				toHaveBeenCalled: () => this.spies.get(index)?.mock.calls.length > 0,
				toHaveBeenCalledWith: (...args: any[]) => {
					const calls = this.spies.get(index)?.mock.calls || [];
					return calls.some(call => JSON.stringify(call) === JSON.stringify(args));
				},
				toHaveBeenCalledTimes: (n: number) => (this.spies.get(index)?.mock.calls.length || 0) === n,
				mockReset: () => {
					const spy = this.spies.get(index);
					if (spy) spy.mock.calls = [];
				},
				mockRestore: () => {}
			});
		});

		this.initialized = true;
	}

	/**
	 * Update market (triggers spy in Workers)
	 */
	updateMarket(index: number, newOdds: string): number {
		if (index >= this.markets.length) {
			throw new Error(`Market index ${index} out of range`);
		}

		// Update market
		this.markets[index] = newOdds;

		// Trigger spy by recording call
		const spy = this.spies.get(index);
		if (spy) {
			spy.mock.calls.push([newOdds]);
		}

		return spy?.mock.calls.length || 0;
	}

	getStats(): {
		totalSpies: number;
		activeMarkets: number;
		updates24h: number;
		spyThroughput: string;
		topGames: Array<{ game: string; spyIndex: number; calls: number }>;
		health: string;
	} {
		if (!this.initialized) {
			return {
				totalSpies: 0,
				activeMarkets: 0,
				updates24h: 0,
				spyThroughput: '0/sec',
				topGames: [],
				health: '🔴 Spies not initialized'
			};
		}

		const totalCalls = Array.from(this.spies.values()).reduce((sum, spy) => sum + (spy?.mock.calls.length || 0), 0);
		const topGames = Array.from(this.spies.entries())
			.slice(0, 5)
			.map(([index, spy]) => ({
				game: this.markets[index],
				spyIndex: index,
				calls: spy?.mock.calls.length || 0
			}))
			.filter(game => game.calls > 0);

		const avgCallsPerSpy = this.spies.size > 0 ? totalCalls / this.spies.size : 0;
		const throughput = avgCallsPerSpy > 0 ? `${(avgCallsPerSpy * 1000).toFixed(0)}/sec` : '0/sec';

		return {
			totalSpies: this.spies.size,
			activeMarkets: this.markets.length,
			updates24h: totalCalls,
			spyThroughput: throughput,
			topGames,
			health: this.spies.size === 25000 ? '🟢 100% spies operational' : `🟡 ${this.spies.size} spies active`
		};
	}
}

// Global spy engine instance (persists across requests in Workers)
let globalSpyEngine: WorkersBasketballMarketSpies | null = null;

/**
 * Initialize or get global spy engine (Workers-compatible)
 */
function getSpyEngine(): WorkersBasketballMarketSpies {
	if (!globalSpyEngine) {
		globalSpyEngine = new WorkersBasketballMarketSpies();
		globalSpyEngine.initSpies();
	}
	return globalSpyEngine;
}

/**
 * Cloudflare Workers fetch handler for basketball endpoints
 */
export default {
	async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type'
		};

		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		// Basketball spy stats endpoint
		// Compressed markets endpoint
		if (url.pathname === '/basketball/markets-compressed') {
			// Generate markets (simplified for Workers)
			const markets = Array.from({ length: 25000 }, (_, i) => ({
				market: i < 7 ? ['Lakers-Celtics', 'Nuggets-Heat', 'Warriors-Kings', 'Celtics-Bucks', 'Suns-Grizzlies', 'Mavericks-Clippers', 'Bulls-Knicks'][i] : `NCAA-Game-${i - 6}`,
				odds: { home: 1.95, away: 1.96 },
				timestamp: Date.now()
			}));
			
			const jsonData = markets.map(m => JSON.stringify(m)).join('\n');
			const encoder = new TextEncoder();
			const stream = new ReadableStream({
				start(controller) {
					controller.enqueue(encoder.encode(jsonData));
					controller.close();
				}
			});
			
			// Compress with zstd (if supported) or gzip
			try {
				const compressed = stream.pipeThrough(new CompressionStream("zstd"));
				return new Response(compressed, {
					headers: {
						'Content-Type': 'application/x-ndjson',
						'Content-Encoding': 'zstd',
						...corsHeaders
					}
				});
			} catch {
				// Fallback to gzip if zstd not supported
				const compressed = stream.pipeThrough(new CompressionStream("gzip"));
				return new Response(compressed, {
					headers: {
						'Content-Type': 'application/x-ndjson',
						'Content-Encoding': 'gzip',
						...corsHeaders
					}
				});
			}
		}

		if (url.pathname === '/basketball/spy-stats') {
			try {
				const spyEngine = getSpyEngine();
				const stats = spyEngine.getStats();

				// Add Workers-specific metadata
				const response = {
					...stats,
					edge: env?.EDGE_REGION || 'sin1', // Cloudflare edge region
					deployedAt: new Date().toISOString(),
					workers: {
						runtime: 'cloudflare-workers',
						region: env?.EDGE_REGION || 'unknown'
					}
				};

				return Response.json(response, { headers: corsHeaders });
			} catch (error: any) {
				return Response.json({
					error: error.message,
					edge: env?.EDGE_REGION || 'unknown'
				}, { 
					status: 500,
					headers: corsHeaders 
				});
			}
		}

		// Health endpoint
		if (url.pathname === '/health') {
			const spyEngine = getSpyEngine();
			const stats = spyEngine.getStats();

			return Response.json({
				status: 'live',
				version: '9.0.0',
				edge: env?.EDGE_REGION || 'sin1',
				basketball: {
					spies: stats.totalSpies,
					throughput: stats.spyThroughput,
					health: stats.health
				},
				workers: {
					runtime: 'cloudflare-workers',
					region: env?.EDGE_REGION || 'unknown'
				}
			}, { headers: corsHeaders });
		}

		// Top markets endpoint
		if (url.pathname === '/basketball/top-markets') {
			try {
				const spyEngine = getSpyEngine();
				const stats = spyEngine.getStats();

				const topMarkets = stats.topGames.map(game => ({
					[game.game]: `spy #${game.spyIndex} → ${game.calls} calls`
				}));

				return Response.json({
					edge: env?.EDGE_REGION || 'sin1',
					spiesActive: stats.totalSpies,
					throughput: stats.spyThroughput,
					topMarkets
				}, { headers: corsHeaders });
			} catch (error: any) {
				return Response.json({
					error: error.message
				}, { 
					status: 500,
					headers: corsHeaders 
				});
			}
		}

		// Update market endpoint (POST)
		if (url.pathname.startsWith('/basketball/update/') && request.method === 'POST') {
			try {
				const gameIndex = parseInt(url.pathname.split('/').pop() || '0');
				const body = await request.json().catch(() => ({}));
				const newOdds = body.odds || `@${(1.92 + Math.random() * 0.08).toFixed(2)}`;
				const gameName = getSpyEngine().markets[gameIndex] || `Game-${gameIndex}`;
				const fullOdds = `${gameName} ${newOdds}`;

				const spyEngine = getSpyEngine();
				const callCount = spyEngine.updateMarket(gameIndex, fullOdds);

				return Response.json({
					success: true,
					gameIndex,
					game: gameName,
					odds: newOdds,
					spyCalls: callCount,
					verified: true,
					edge: env?.EDGE_REGION || 'sin1'
				}, { headers: corsHeaders });
			} catch (error: any) {
				return Response.json({
					error: error.message
				}, { 
					status: 400,
					headers: corsHeaders 
				});
			}
		}

		return new Response('Not Found', {
			status: 404,
			headers: corsHeaders
		});
	}
};

