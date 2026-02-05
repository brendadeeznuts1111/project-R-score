/**
 * @fileoverview 1.1.1.1.2.4.0: Temporal Pattern Recognition Engine
 * @description Analyzes temporal patterns in hidden steam and market movements
 * @module arbitrage/shadow-graph/temporal-pattern-engine
 */

import { Database } from "bun:sqlite";

/**
 * Temporal pattern analysis result
 */
export interface TemporalPatternResult {
	highRiskWindows: Array<{
		start: number;
		end: number;
		probability: number;
		reason: string;
	}>;
	circadianFactor: number; // 1.1.1.1.2.4.6: Circadian Rhythm Adjustor
	timeOfDayProbability: number; // 1.1.1.1.2.4.2: Time-of-Day Steam Probability
	dayOfWeekFactor: number; // 1.1.1.1.2.4.3: Day-of-Week Pattern Matrix
	preGameCountdown: {
		hoursUntilGame: number;
		riskLevel: "low" | "medium" | "high";
		probability: number;
	}; // 1.1.1.1.2.4.4: Pre-Game Countdown Analysis
	halftimeCluster: boolean; // 1.1.1.1.2.4.5: Halftime Steam Cluster
	patternDeviation: number; // 1.1.1.1.2.4.7: Pattern Deviation Alert
}

/**
 * 1.1.1.1.2.4.1: Temporal-Pattern Recognition Engine
 *
 * Analyzes when hidden steam is most likely to occur based on:
 * - Time of day
 * - Day of week
 * - Pre-game countdown
 * - Halftime patterns
 */
export class TemporalPatternEngine {
	constructor(private db: Database) {}

	/**
	 * Analyze temporal patterns for an event
	 */
	async analyzeTemporalPatterns(
		eventId: string,
	): Promise<TemporalPatternResult> {
		const now = Date.now();
		const gameStart = await this.getGameStartTime(eventId);
		const timeToGame = gameStart - now;

		const hourOfDay = new Date(now).getHours();
		const dayOfWeek = new Date(now).getDay();

		// Get sport for pattern matching
		const sport = await this.getEventSport(eventId);

		// 1.1.1.1.2.4.2: Time-of-Day Steam Probability
		const timeOfDayProbability = await this.calculateTimeOfDayProbability(
			sport,
			hourOfDay,
		);

		// 1.1.1.1.2.4.3: Day-of-Week Pattern Matrix
		const dayOfWeekFactor = await this.calculateDayOfWeekFactor(
			sport,
			dayOfWeek,
		);

		// 1.1.1.1.2.4.4: Pre-Game Countdown Analysis
		const preGameCountdown = this.analyzePreGameCountdown(timeToGame);

		// 1.1.1.1.2.4.5: Halftime Steam Cluster
		const halftimeCluster = await this.detectHalftimeCluster(
			eventId,
			gameStart,
			now,
		);

		// 1.1.1.1.2.4.6: Circadian Rhythm Adjustor
		const circadianFactor = this.calculateCircadianFactor(hourOfDay);

		// Find high-risk windows
		const highRiskWindows = await this.findHighRiskWindows(
			sport,
			timeToGame,
			hourOfDay,
			dayOfWeek,
		);

		// 1.1.1.1.2.4.7: Pattern Deviation Alert
		const patternDeviation = await this.calculatePatternDeviation(
			eventId,
			timeOfDayProbability,
			dayOfWeekFactor,
		);

		return {
			highRiskWindows,
			circadianFactor,
			timeOfDayProbability,
			dayOfWeekFactor,
			preGameCountdown,
			halftimeCluster,
			patternDeviation,
		};
	}

	/**
	 * Adjust detection threshold based on temporal context
	 */
	adjustDetectionThreshold(
		baseThreshold: number,
		patterns: TemporalPatternResult,
	): number {
		// Increase sensitivity during high-risk windows
		let multiplier = 1.0;

		if (patterns.highRiskWindows.length > 0) {
			const maxRisk = Math.max(
				...patterns.highRiskWindows.map((w) => w.probability),
			);
			multiplier += maxRisk * 0.3;
		}

		// Adjust for circadian rhythm
		multiplier += patterns.circadianFactor * 0.2;

		// Adjust for pre-game countdown
		if (patterns.preGameCountdown.riskLevel === "high") {
			multiplier += 0.2;
		}

		return baseThreshold * multiplier;
	}

	/**
	 * Calculate time-of-day probability
	 */
	private async calculateTimeOfDayProbability(
		sport: string,
		hourOfDay: number,
	): Promise<number> {
		// Query historical patterns
		const patterns = this.db
			.query<{ hour_of_day: number; event_count: number }, [string]>(
				`SELECT 
					CAST(strftime('%H', datetime(timestamp/1000, 'unixepoch')) AS INTEGER) as hour_of_day,
					COUNT(*) as event_count
				 FROM hidden_steam_events
				 WHERE sport = ?1
				 GROUP BY hour_of_day`,
			)
			.all(sport);

		if (patterns.length === 0) {
			// Default: higher probability during business hours (9 AM - 5 PM)
			return hourOfDay >= 9 && hourOfDay <= 17 ? 0.6 : 0.3;
		}

		const currentHourPattern = patterns.find(
			(p) => p.hour_of_day === hourOfDay,
		);
		const maxEvents = Math.max(...patterns.map((p) => p.event_count));

		return currentHourPattern
			? currentHourPattern.event_count / maxEvents
			: 0.3;
	}

	/**
	 * Calculate day-of-week factor
	 */
	private async calculateDayOfWeekFactor(
		sport: string,
		dayOfWeek: number,
	): Promise<number> {
		// Query historical patterns
		const patterns = this.db
			.query<{ day_of_week: number; event_count: number }, [string]>(
				`SELECT 
					CAST(strftime('%w', datetime(timestamp/1000, 'unixepoch')) AS INTEGER) as day_of_week,
					COUNT(*) as event_count
				 FROM hidden_steam_events
				 WHERE sport = ?1
				 GROUP BY day_of_week`,
			)
			.all(sport);

		if (patterns.length === 0) {
			// Default: higher on weekends (0 = Sunday, 6 = Saturday)
			return dayOfWeek === 0 || dayOfWeek === 6 ? 1.2 : 1.0;
		}

		const currentDayPattern = patterns.find((p) => p.day_of_week === dayOfWeek);
		const avgEvents =
			patterns.reduce((sum, p) => sum + p.event_count, 0) / patterns.length;

		return currentDayPattern ? currentDayPattern.event_count / avgEvents : 1.0;
	}

	/**
	 * Analyze pre-game countdown
	 */
	private analyzePreGameCountdown(timeToGame: number): {
		hoursUntilGame: number;
		riskLevel: "low" | "medium" | "high";
		probability: number;
	} {
		const hoursUntilGame = timeToGame / (60 * 60 * 1000);

		let riskLevel: "low" | "medium" | "high" = "low";
		let probability = 0.3;

		if (hoursUntilGame < 1) {
			// Last hour before game: highest risk
			riskLevel = "high";
			probability = 0.8;
		} else if (hoursUntilGame < 6) {
			// 1-6 hours: medium-high risk
			riskLevel = "high";
			probability = 0.6;
		} else if (hoursUntilGame < 24) {
			// 6-24 hours: medium risk
			riskLevel = "medium";
			probability = 0.4;
		} else {
			// >24 hours: lower risk
			riskLevel = "low";
			probability = 0.2;
		}

		return { hoursUntilGame, riskLevel, probability };
	}

	/**
	 * Detect halftime steam cluster
	 */
	private async detectHalftimeCluster(
		eventId: string,
		gameStart: number,
		currentTime: number,
	): Promise<boolean> {
		// Halftime typically occurs ~2 hours after game start
		const halftimeWindow = gameStart + 2 * 60 * 60 * 1000;
		const windowStart = halftimeWindow - 30 * 60 * 1000; // 30 min before
		const windowEnd = halftimeWindow + 30 * 60 * 1000; // 30 min after

		if (currentTime < windowStart || currentTime > windowEnd) {
			return false;
		}

		// Check for increased activity during halftime window
		const halftimeMovements = this.db
			.query<{ count: number }, [string, number, number]>(
				`SELECT COUNT(*) as count
				 FROM line_movements lm
				 JOIN shadow_nodes sn ON lm.node_id = sn.node_id
				 WHERE sn.event_id = ?1
				   AND lm.timestamp >= ?2
				   AND lm.timestamp <= ?3`,
			)
			.get(eventId, windowStart, windowEnd);

		const normalMovements = this.db
			.query<{ count: number }, [string, number, number]>(
				`SELECT COUNT(*) as count
				 FROM line_movements lm
				 JOIN shadow_nodes sn ON lm.node_id = sn.node_id
				 WHERE sn.event_id = ?1
				   AND lm.timestamp >= ?2
				   AND lm.timestamp <= ?3`,
			)
			.get(eventId, windowStart - 60 * 60 * 1000, windowStart);

		// Halftime cluster if 2x normal activity
		return (
			halftimeMovements &&
			normalMovements &&
			halftimeMovements.count > normalMovements.count * 2
		);
	}

	/**
	 * Calculate circadian rhythm factor
	 */
	private calculateCircadianFactor(hourOfDay: number): number {
		// Sinusoidal pattern: peak around 10 AM, trough around 2 AM
		// Normalized to 0-1 range
		const normalizedHour = (hourOfDay - 6) / 12; // Shift to start at 6 AM
		return Math.max(
			0,
			Math.min(1, Math.sin(normalizedHour * Math.PI) * 0.5 + 0.5),
		);
	}

	/**
	 * Find high-risk time windows
	 */
	private async findHighRiskWindows(
		sport: string,
		timeToGame: number,
		hourOfDay: number,
		dayOfWeek: number,
	): Promise<
		Array<{ start: number; end: number; probability: number; reason: string }>
	> {
		const windows: Array<{
			start: number;
			end: number;
			probability: number;
			reason: string;
		}> = [];

		// Window 1: Last hour before game
		if (timeToGame < 60 * 60 * 1000 && timeToGame > 0) {
			windows.push({
				start: Date.now(),
				end: Date.now() + timeToGame,
				probability: 0.8,
				reason: "Pre-game countdown",
			});
		}

		// Window 2: Morning hours (9 AM - 11 AM) - sharp money active
		if (hourOfDay >= 9 && hourOfDay < 11) {
			windows.push({
				start: Date.now(),
				end: Date.now() + 2 * 60 * 60 * 1000,
				probability: 0.6,
				reason: "Morning sharp activity",
			});
		}

		// Window 3: Weekend afternoons
		if (
			(dayOfWeek === 0 || dayOfWeek === 6) &&
			hourOfDay >= 13 &&
			hourOfDay < 17
		) {
			windows.push({
				start: Date.now(),
				end: Date.now() + 4 * 60 * 60 * 1000,
				probability: 0.7,
				reason: "Weekend afternoon peak",
			});
		}

		return windows;
	}

	/**
	 * Calculate pattern deviation
	 */
	private async calculatePatternDeviation(
		eventId: string,
		expectedTimeProb: number,
		expectedDayFactor: number,
	): Promise<number> {
		// Get actual recent activity
		const recentActivity = this.db
			.query<{ count: number }, [string, number]>(
				`SELECT COUNT(*) as count
				 FROM line_movements lm
				 JOIN shadow_nodes sn ON lm.node_id = sn.node_id
				 WHERE sn.event_id = ?1
				   AND lm.timestamp > ?2`,
			)
			.get(eventId, Date.now() - 60 * 60 * 1000);

		// Expected activity based on patterns
		const expectedActivity = expectedTimeProb * expectedDayFactor * 10; // Baseline

		if (!recentActivity || expectedActivity === 0) {
			return 0;
		}

		// Deviation = |actual - expected| / expected
		return Math.abs(recentActivity.count - expectedActivity) / expectedActivity;
	}

	/**
	 * Get game start time
	 */
	private async getGameStartTime(eventId: string): Promise<number> {
		const event = this.db
			.query<{ start_time: number }, [string]>(
				`SELECT start_time FROM events WHERE id = ?1`,
			)
			.get(eventId);

		return event?.start_time || Date.now() + 24 * 60 * 60 * 1000; // Default: 24h from now
	}

	/**
	 * Get event sport
	 */
	private async getEventSport(eventId: string): Promise<string> {
		const event = this.db
			.query<{ sport: string }, [string]>(
				`SELECT sport FROM events WHERE id = ?1`,
			)
			.get(eventId);

		return event?.sport || "unknown";
	}
}
