/**
 * Sharp Book Registry Types
 * Type definitions for sharp book tracking and line movement analysis
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-SHARP-BOOKS@0.1.0;instance-id=ORCA-SHARP-001;version=0.1.0}][PROPERTIES:{registry={value:"sharp-books";@root:"ROOT-ORCA";@chain:["BP-LINE-MOVEMENT","BP-SHARP-SIGNALS"];@version:"0.1.0"}}][CLASS:SharpBookTypes][#REF:v-0.1.0.BP.SHARP.BOOKS.1.0.A.1.1.ORCA.1.1]]
 */

/**
 * Sharp book tier classification
 * S+ = Highest tier (Circa, Pinnacle)
 * S = Sharp tier
 * A+ = Very sharp
 * A = Sharp
 * B+ = Above average
 */
export type SharpTier = "S+" | "S" | "A+" | "A" | "B+" | "B" | "C";

/**
 * Book connection status
 */
export type BookStatus = "connected" | "disconnected" | "error" | "maintenance";

/**
 * Line movement direction
 */
export type LineDirection = "up" | "down" | "sideways";

/**
 * Sharp signal type
 */
export type SharpSignalType =
	| "steam"
	| "line_move"
	| "reverse_line_move"
	| "contrarian";

/**
 * Endpoint parameter configuration for forensic logging
 */
export interface EndpointParameterProfile {
	/** Endpoint path (e.g., '/v2/events/:id/odds') */
	endpoint: string;
	/** Expected parameter count for this endpoint */
	expectedParamCount: number;
	/** Allowable variation threshold */
	variationThreshold?: number;
	/** Last profiled timestamp */
	lastProfiled?: number;
}

/**
 * Sharp book configuration
 */
export interface SharpBookConfig {
	/** Unique book identifier */
	id: string;
	/** Display name */
	name: string;
	/** Sharp tier classification */
	sharpTier: SharpTier;
	/** API endpoints */
	endpoints: {
		rest?: string;
		ws?: string;
		odds?: string;
	};
	/** Latency benchmark in milliseconds */
	latencyBenchmark: number;
	/** Weight factor (0-10, higher = sharper) */
	weight: number;
	/** Market tags this book covers */
	tags: string[];
	/** Current connection status */
	status: BookStatus;
	/** Rate limit (requests per minute) */
	rateLimit: number;
	/** Whether this book limits winners */
	limitsWinners: boolean;
	/** Whether crypto payments accepted */
	cryptoAccepted: boolean;
	/**
	 * Endpoint parameter profiles for forensic logging
	 * Maps endpoint paths to expected parameter counts
	 * Populated during bookmaker profiling phase
	 */
	endpointParameters?: EndpointParameterProfile[];
}

/**
 * Line movement record
 */
export interface LineMove {
	/** Book that moved the line */
	bookId: string;
	/** Market identifier */
	marketId: string;
	/** Timestamp of move (ms since epoch) */
	timestamp: number;
	/** Direction of move */
	direction: LineDirection;
	/** Magnitude of move (points/spread) */
	magnitude: number;
	/** Old line value */
	oldLine: number;
	/** New line value */
	newLine: number;
	/** Market type */
	marketType: string;
}

/**
 * Sharp signal (aggregated from multiple books)
 */
export interface SharpSignal {
	/** Unique signal ID */
	id: string;
	/** Book that initiated the signal */
	bookId: string;
	/** Market identifier */
	marketId: string;
	/** Signal timestamp */
	timestamp: number;
	/** Signal type */
	signalType: SharpSignalType;
	/** Confidence score (0-1) */
	confidence: number;
	/** Additional metadata */
	metadata: {
		booksInvolved: string[];
		avgMagnitude: number;
		totalWeight: number;
		direction: LineDirection;
	};
}
