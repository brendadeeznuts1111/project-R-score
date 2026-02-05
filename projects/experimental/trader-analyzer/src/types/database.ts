/**
 * @fileoverview Common Database Type Definitions
 * @description Type definitions for database query results used across the codebase
 * @module types/database
 *
 * These types are used with Bun.SQL for type-safe database queries.
 * See docs/BUN-1.3-SQLITE-REVIEW.md for migration guide.
 */

/**
 * Cache entry row from database
 */
export interface CacheRow {
	key: string;
	value: Buffer | Uint8Array;
	hits: number;
	expires_at: number;
	created_at: number;
	compressed: number;
	original_size: number;
	stored_size: number;
}

/**
 * Cache statistics query result
 */
export interface CacheStatsRow {
	count: number;
	hits: number | null;
	compressed: number;
	original: number | null;
	stored: number | null;
	oldest: number | null;
	newest: number | null;
}

/**
 * User row from database
 */
export interface UserRow {
	id: string;
	username: string;
	email: string | null;
	role_id: string;
	feature_flags: string;
	created_at: number;
}

/**
 * Role row from database
 */
export interface RoleRow {
	id: string;
	name: string;
	permissions_json: string;
	data_scopes_json: string;
	feature_flags: string;
}

/**
 * User with role information (JOIN result)
 */
export interface UserWithRole {
	id: string;
	username: string;
	email: string | null;
	role_id: string;
	role_name: string;
	created_at: number;
}

/**
 * Tick row from database
 */
export interface TickRow {
	venue: string;
	instrument_id: string;
	timestamp: number;
	bid: number;
	ask: number;
	mid: number;
	spread_bps: number;
	latency_ms: number;
	seq_num: number;
}

/**
 * Movement row from database
 */
export interface MovementRow {
	id: number;
	venue: string;
	instrument_id: string;
	timestamp: number;
	previous_mid: number;
	current_mid: number;
	delta: number;
	delta_bps: number;
	direction: string;
	velocity: number;
	acceleration: number;
	created_at: number;
}

/**
 * Velocity window row from database
 */
export interface VelocityRow {
	id: number;
	venue: string;
	instrument_id: string;
	window_start: number;
	window_end: number;
	ticks: number;
	open_mid: number;
	close_mid: number;
	high_mid: number;
	low_mid: number;
	velocity: number;
	acceleration: number;
	volatility: number;
	direction: string;
	created_at: number;
}

/**
 * Latency statistics row from database
 */
export interface LatencyStatsRow {
	id: number;
	venue: string;
	instrument_id: string | null;
	timestamp: number;
	window_ms: number;
	sample_count: number;
	min_ms: number;
	max_ms: number;
	mean_ms: number;
	p50_ms: number;
	p90_ms: number;
	p95_ms: number;
	p99_ms: number;
	std_dev: number;
	jitter: number;
	created_at: number;
}

/**
 * Odds history row from database
 */
export interface OddsHistoryRow {
	id: number;
	event_id: string;
	market_id: string;
	selection_id: string;
	bookmaker: string;
	odds: number;
	line: number | null;
	timestamp: number;
	is_open: number;
	max_stake: number | null;
	created_at: string;
}

/**
 * Team alias row from database
 */
export interface TeamAliasRow {
	id: number;
	bookmaker: string;
	alias: string;
	canonical: string;
	sport: string;
	league: string;
	confidence: number;
	created_at: string;
}

/**
 * Sport alias row from database
 */
export interface SportAliasRow {
	id: number;
	bookmaker: string;
	alias: string;
	canonical: string;
	created_at: string;
}

/**
 * Event row from database
 */
export interface EventRow {
	id: string;
	sport: string;
	league: string | null;
	home_team: string;
	away_team: string;
	start_time: string;
	status: string;
	created_at: string;
	updated_at: string;
}

/**
 * Multi-layer correlation row from database
 */
export interface CorrelationRow {
	layer: string;
	event_id: string;
	source_node: string;
	target_node: string;
	correlation_type: string;
	correlation_score: number;
	latency_ms: number;
	expected_propagation: number;
	detected_at: number;
	confidence: number;
}

/**
 * Shadow node row from database
 */
export interface ShadowNodeRow {
	node_id: string;
	event_id: string;
	market_id: string;
	bookmaker: string;
	visibility: string;
	displayed_liquidity: number;
	hidden_liquidity: number;
	last_odds: number | null;
}
