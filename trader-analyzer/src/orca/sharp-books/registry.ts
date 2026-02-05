/**
 * Sharp Book Registry
 * Live sharp book configurations for ORCA ecosystem
 * [#REF:SHARP-BOOKS-REGISTRY]
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-SHARP-BOOKS@0.1.0;instance-id=ORCA-SHARP-001;version=0.1.0}][PROPERTIES:{registry={value:"sharp-books";@root:"ROOT-ORCA";@chain:["BP-LINE-MOVEMENT","BP-SHARP-SIGNALS"];@version:"0.1.0"}}][CLASS:SharpBookRegistry][#REF:v-0.1.0.BP.SHARP.BOOKS.1.0.A.1.1.ORCA.1.1]]
 */

import type {
	BookStatus,
	LineMove,
	SharpBookConfig,
	SharpSignal,
	SharpTier,
} from "./types";

/**
 * Sharp book configurations - Live as of Dec 5, 2025
 */
export const SHARP_BOOKS: Record<string, SharpBookConfig> = {
	circa: {
		id: "circa",
		name: "Circa Sports",
		sharpTier: "S+",
		endpoints: {
			rest: "https://api.circasports.com/v1",
			ws: "wss://circa-live.pusher.com/app/circa-odds",
			odds: "https://api.circasports.com/v1/odds",
		},
		latencyBenchmark: 180,
		weight: 9.8,
		tags: ["sports", "nba", "nfl", "ncaab", "ncaaf", "mlb"],
		status: "connected",
		rateLimit: 60,
		limitsWinners: false,
		cryptoAccepted: false,
	},
	pinnacle: {
		id: "pinnacle",
		name: "Pinnacle",
		sharpTier: "S",
		endpoints: {
			rest: "https://api.pinnacle.com/v3",
			ws: "wss://api.pinnacle.com/v1/stream",
			odds: "https://api.pinnacle.com/v3/odds",
		},
		latencyBenchmark: 90,
		weight: 9.5,
		tags: ["sports", "nba", "nfl", "soccer", "epl", "mma", "ufc"],
		status: "connected",
		rateLimit: 100,
		limitsWinners: false,
		cryptoAccepted: true,
	},
	crisp: {
		id: "crisp",
		name: "Crisp",
		sharpTier: "A+",
		endpoints: {
			rest: "https://api.crisp.bet/v2",
			ws: "wss://stream.crisp.bet/odds",
		},
		latencyBenchmark: 120,
		weight: 8.5,
		tags: ["crypto", "sports", "prediction", "major", "memecoin"],
		status: "connected",
		rateLimit: 120,
		limitsWinners: true,
		cryptoAccepted: true,
	},
	betcris: {
		id: "betcris",
		name: "BetCRIS",
		sharpTier: "A",
		endpoints: {
			rest: "https://api.betcris.com/v1",
			odds: "https://api.betcris.com/v1/lines",
		},
		latencyBenchmark: 400,
		weight: 7.5,
		tags: ["sports", "nba", "nfl", "mlb", "ncaab"],
		status: "connected",
		rateLimit: 30,
		limitsWinners: true,
		cryptoAccepted: false,
	},
	bookmaker: {
		id: "bookmaker",
		name: "Bookmaker.eu",
		sharpTier: "A",
		endpoints: {
			rest: "https://api.bookmaker.eu/v2",
			odds: "https://lines.bookmaker.eu/api/odds",
		},
		latencyBenchmark: 600,
		weight: 7.0,
		tags: ["sports", "nba", "nfl", "ncaab", "ncaaf", "mma"],
		status: "connected",
		rateLimit: 20,
		limitsWinners: false, // Never limits winners
		cryptoAccepted: true,
	},
	jazz: {
		id: "jazz",
		name: "Jazz Sports",
		sharpTier: "B+",
		endpoints: {
			rest: "https://api.jazzsports.ag/v1",
			odds: "https://api.jazzsports.ag/v1/odds",
		},
		latencyBenchmark: 1100,
		weight: 6.0,
		tags: ["sports", "nba", "nfl", "prediction"],
		status: "connected",
		rateLimit: 15,
		limitsWinners: true,
		cryptoAccepted: true,
	},
} as const;

/**
 * Get books by tier
 */
export function getBooksByTier(tier: SharpTier): SharpBookConfig[] {
	return Object.values(SHARP_BOOKS).filter((book) => book.sharpTier === tier);
}

/**
 * Get books by tag
 */
export function getBooksByTag(tag: string): SharpBookConfig[] {
	return Object.values(SHARP_BOOKS).filter((book) =>
		book.tags.includes(tag as any),
	);
}

/**
 * Get connected books only
 */
export function getConnectedBooks(): SharpBookConfig[] {
	return Object.values(SHARP_BOOKS).filter(
		(book) => book.status === "connected",
	);
}

/**
 * Get books sorted by weight (sharpest first)
 */
export function getBooksByWeight(): SharpBookConfig[] {
	return Object.values(SHARP_BOOKS).sort((a, b) => b.weight - a.weight);
}

/**
 * Calculate composite sharp signal from multiple books
 */
export function calculateSharpSignal(moves: LineMove[]): SharpSignal | null {
	if (moves.length === 0) return null;

	const firstMove = moves[0];
	const books = moves
		.map((m) => SHARP_BOOKS[m.bookId])
		.filter((b): b is SharpBookConfig => Boolean(b));

	// Weight by book sharpness
	const totalWeight = books.reduce((sum, b) => sum + b.weight, 0);
	const avgMagnitude =
		moves.reduce((sum, m) => sum + m.magnitude, 0) / moves.length;

	// Confidence based on # of sharp books agreeing + magnitude
	const confidence = Math.min(
		0.99,
		(books.length / 6) * 0.5 +
			(avgMagnitude / 10) * 0.3 +
			(totalWeight / 60) * 0.2,
	);

	return {
		id: `sharp-${firstMove.marketId}-${Date.now()}`,
		bookId: firstMove.bookId,
		marketId: firstMove.marketId,
		timestamp: Date.now(),
		signalType: moves.length >= 3 ? "steam" : "line_move",
		confidence,
		metadata: {
			booksInvolved: books.map((b) => b.id),
			avgMagnitude,
			totalWeight,
			direction: firstMove.direction,
		},
	};
}

/**
 * Book registry singleton
 */
class SharpBookRegistry {
	private lineMoves = new Map<string, LineMove[]>();
	private signals = new Map<string, SharpSignal[]>();

	/**
	 * Record a line move from a book
	 */
	recordLineMove(move: LineMove): void {
		const key = move.marketId;
		const existing = this.lineMoves.get(key) || [];
		existing.push(move);

		// Keep only last 100 moves per market
		if (existing.length > 100) {
			existing.shift();
		}

		this.lineMoves.set(key, existing);
	}

	/**
	 * Get recent moves for a market
	 */
	getRecentMoves(marketId: string, windowMs = 300000): LineMove[] {
		const moves = this.lineMoves.get(marketId) || [];
		const cutoff = Date.now() - windowMs;
		return moves.filter((m) => m.timestamp > cutoff);
	}

	/**
	 * Check if Circa moved first (strong indicator)
	 */
	circaMovedFirst(marketId: string, windowMs = 300000): boolean {
		const moves = this.getRecentMoves(marketId, windowMs);
		if (moves.length === 0) return false;

		const sorted = [...moves].sort((a, b) => a.timestamp - b.timestamp);
		return sorted[0].bookId === "circa";
	}

	/**
	 * Get book status summary
	 */
	getStatusSummary(): Record<string, { status: BookStatus; latency: number }> {
		const summary: Record<string, { status: BookStatus; latency: number }> = {};

		for (const [id, book] of Object.entries(SHARP_BOOKS)) {
			summary[id] = {
				status: book.status,
				latency: book.latencyBenchmark,
			};
		}

		return summary;
	}

	/**
	 * Get all configured books
	 */
	getAllBooks(): SharpBookConfig[] {
		return Object.values(SHARP_BOOKS);
	}

	/**
	 * Get book by ID
	 */
	getBook(id: string): SharpBookConfig | undefined {
		return SHARP_BOOKS[id];
	}
}

export const sharpBookRegistry = new SharpBookRegistry();
export default sharpBookRegistry;
