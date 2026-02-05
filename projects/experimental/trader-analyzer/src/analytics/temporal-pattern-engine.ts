// [DoD][DOMAIN:TemporalAnalysis][SCOPE:PatternRecognition][TYPE:TimeSeriesAnalytics][CLASS:MissionCritical]

import { Database } from "bun:sqlite";

export interface TemporalPattern {
	patternId: string;
	patternType: 'SEASONAL' | 'EVENT_DRIVEN' | 'CYCLICAL' | 'TREND';
	entity: string;
	market: string;
	confidence: number;
	strength: number;
	timeWindow: number;
	occurrences: number;
	lastDetected: number;
	metadata: {
		frequency?: number;
		amplitude?: number;
		phase?: number;
		triggerEvents?: string[];
		correlationHistory: Array<{timestamp: number, value: number}>;
	};
}

export interface SeasonalPattern extends TemporalPattern {
	patternType: 'SEASONAL';
	seasonalPeriod: number; // in milliseconds (daily, weekly, monthly, etc.)
	peakTimes: number[]; // hours of day when pattern peaks
	valleyTimes: number[]; // hours of day when pattern valleys
}

export interface EventDrivenPattern extends TemporalPattern {
	patternType: 'EVENT_DRIVEN';
	triggerEvents: string[];
	responseLag: number; // milliseconds between trigger and pattern response
	decayRate: number; // how quickly the pattern decays
}

export interface CyclicalPattern extends TemporalPattern {
	patternType: 'CYCLICAL';
	cycleLength: number; // length of cycle in milliseconds
	cyclePhase: number; // current phase in cycle (0-1)
	cycleStrength: number; // strength of cyclical behavior
}

export class TemporalPatternEngine {
	private db: Database;
	private readonly minDataPoints = 50;
	private readonly confidenceThreshold = 0.7;

	constructor(db: Database) {
		this.db = db;
		this.initializeTemporalSchema();
	}

	private initializeTemporalSchema() {
		this.db.run(`
			CREATE TABLE IF NOT EXISTS temporal_patterns (
				pattern_id TEXT PRIMARY KEY,
				pattern_type TEXT NOT NULL,
				entity TEXT NOT NULL,
				market TEXT NOT NULL,
				confidence REAL NOT NULL,
				strength REAL NOT NULL,
				time_window INTEGER NOT NULL,
				occurrences INTEGER NOT NULL,
				last_detected INTEGER NOT NULL,
				metadata TEXT NOT NULL, -- JSON
				INDEX idx_entity_market (entity, market),
				INDEX idx_type_confidence (pattern_type, confidence),
				INDEX idx_last_detected (last_detected)
			);

			CREATE TABLE IF NOT EXISTS time_series_data (
				id INTEGER PRIMARY KEY,
				entity TEXT NOT NULL,
				market TEXT NOT NULL,
				timestamp INTEGER NOT NULL,
				value REAL NOT NULL,
				volume REAL,
				metadata TEXT, -- JSON
				INDEX idx_entity_time (entity, timestamp),
				INDEX idx_market_time (market, timestamp)
			);
		`);
	}

	async analyzeTemporalPatterns(
		entity: string,
		market: string,
		timeWindow: number = 7 * 24 * 60 * 60 * 1000 // 7 days
	): Promise<TemporalPattern[]> {
		const patterns: TemporalPattern[] = [];

		// Get time series data
		const timeSeries = this.getTimeSeriesData(entity, market, timeWindow);
		if (timeSeries.length < this.minDataPoints) {
			return patterns; // Insufficient data
		}

		// Analyze different pattern types
		const seasonalPatterns = await this.detectSeasonalPatterns(timeSeries, entity, market);
		const eventPatterns = await this.detectEventDrivenPatterns(timeSeries, entity, market);
		const cyclicalPatterns = await this.detectCyclicalPatterns(timeSeries, entity, market);
		const trendPatterns = await this.detectTrendPatterns(timeSeries, entity, market);

		patterns.push(...seasonalPatterns, ...eventPatterns, ...cyclicalPatterns, ...trendPatterns);

		// Filter by confidence and persist
		const highConfidencePatterns = patterns.filter(p => p.confidence >= this.confidenceThreshold);
		await this.persistPatterns(highConfidencePatterns);

		return highConfidencePatterns;
	}

	private getTimeSeriesData(
		entity: string,
		market: string,
		timeWindow: number
	): Array<{timestamp: number, value: number, volume?: number}> {
		const cutoffTime = Date.now() - timeWindow;
		const query = this.db.prepare(`
			SELECT timestamp, value, volume FROM time_series_data
			WHERE entity = ? AND market = ? AND timestamp > ?
			ORDER BY timestamp ASC
		`);

		return query.all(entity, market, cutoffTime) as Array<{timestamp: number, value: number, volume?: number}>;
	}

	private async detectSeasonalPatterns(
		timeSeries: Array<{timestamp: number, value: number}>,
		entity: string,
		market: string
	): Promise<SeasonalPattern[]> {
		const patterns: SeasonalPattern[] = [];

		// Analyze daily patterns
		const dailyPattern = this.analyzeDailySeasonality(timeSeries);
		if (dailyPattern.confidence >= this.confidenceThreshold) {
			patterns.push({
				...dailyPattern,
				patternId: `seasonal_${entity}_${market}_daily_${Date.now()}`,
				entity,
				market,
				timeWindow: 24 * 60 * 60 * 1000, // 24 hours
				occurrences: 1,
				lastDetected: Date.now(),
			});
		}

		// Analyze weekly patterns
		const weeklyPattern = this.analyzeWeeklySeasonality(timeSeries);
		if (weeklyPattern.confidence >= this.confidenceThreshold) {
			patterns.push({
				...weeklyPattern,
				patternId: `seasonal_${entity}_${market}_weekly_${Date.now()}`,
				entity,
				market,
				timeWindow: 7 * 24 * 60 * 60 * 1000, // 7 days
				occurrences: 1,
				lastDetected: Date.now(),
			});
		}

		return patterns;
	}

	private analyzeDailySeasonality(
		timeSeries: Array<{timestamp: number, value: number}>
	): Omit<SeasonalPattern, 'patternId' | 'entity' | 'market' | 'timeWindow' | 'occurrences' | 'lastDetected'> {
		const hourlyBuckets: number[][] = Array.from({length: 24}, () => []);

		// Group data by hour of day
		for (const point of timeSeries) {
			const hour = new Date(point.timestamp).getHours();
			hourlyBuckets[hour].push(point.value);
		}

		// Calculate hourly averages and standard deviations
		const hourlyStats = hourlyBuckets.map(values => {
			if (values.length === 0) return { mean: 0, std: 0 };
			const mean = values.reduce((a, b) => a + b, 0) / values.length;
			const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
			return { mean, std: Math.sqrt(variance) };
		});

		// Find peak and valley hours
		const peakTimes: number[] = [];
		const valleyTimes: number[] = [];
		const threshold = 0.1; // 10% above/below average

		const overallMean = hourlyStats.reduce((sum, stat) => sum + stat.mean, 0) / 24;

		for (let hour = 0; hour < 24; hour++) {
			const deviation = (hourlyStats[hour].mean - overallMean) / overallMean;
			if (deviation > threshold) peakTimes.push(hour);
			if (deviation < -threshold) valleyTimes.push(hour);
		}

		// Calculate pattern strength and confidence
		const maxDeviation = Math.max(...hourlyStats.map(stat =>
			Math.abs(stat.mean - overallMean) / overallMean
		));
		const avgStd = hourlyStats.reduce((sum, stat) => sum + stat.std, 0) / 24;
		const signalToNoise = maxDeviation / (avgStd / overallMean);

		const strength = Math.min(maxDeviation * 2, 1);
		const confidence = Math.min(signalToNoise / 5, 1); // Normalize confidence

		return {
			patternType: 'SEASONAL',
			seasonalPeriod: 24 * 60 * 60 * 1000,
			peakTimes,
			valleyTimes,
			confidence,
			strength,
			metadata: {
				frequency: 1 / (24 * 60 * 60 * 1000), // daily frequency
				amplitude: maxDeviation,
				correlationHistory: timeSeries.slice(-100) // Last 100 points
			}
		};
	}

	private analyzeWeeklySeasonality(
		timeSeries: Array<{timestamp: number, value: number}>
	): Omit<SeasonalPattern, 'patternId' | 'entity' | 'market' | 'timeWindow' | 'occurrences' | 'lastDetected'> {
		const dailyBuckets: number[][] = Array.from({length: 7}, () => []);

		// Group data by day of week
		for (const point of timeSeries) {
			const dayOfWeek = new Date(point.timestamp).getDay(); // 0 = Sunday
			dailyBuckets[dayOfWeek].push(point.value);
		}

		// Calculate daily averages
		const dailyAverages = dailyBuckets.map(values =>
			values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
		);

		const overallMean = dailyAverages.reduce((a, b) => a + b, 0) / 7;
		const maxDeviation = Math.max(...dailyAverages.map(avg =>
			Math.abs(avg - overallMean) / overallMean
		));

		// Find peak and valley days
		const peakTimes: number[] = [];
		const valleyTimes: number[] = [];
		const threshold = 0.08; // 8% threshold for weekly patterns

		for (let day = 0; day < 7; day++) {
			const deviation = (dailyAverages[day] - overallMean) / overallMean;
			if (deviation > threshold) peakTimes.push(day);
			if (deviation < -threshold) valleyTimes.push(day);
		}

		const strength = Math.min(maxDeviation * 2, 1);
		const confidence = Math.min(maxDeviation / 0.15, 1); // Weekly patterns are harder to detect

		return {
			patternType: 'SEASONAL',
			seasonalPeriod: 7 * 24 * 60 * 60 * 1000,
			peakTimes,
			valleyTimes,
			confidence,
			strength,
			metadata: {
				frequency: 1 / (7 * 24 * 60 * 60 * 1000),
				amplitude: maxDeviation,
				correlationHistory: timeSeries.slice(-100)
			}
		};
	}

	private async detectEventDrivenPatterns(
		timeSeries: Array<{timestamp: number, value: number}>,
		entity: string,
		market: string
	): Promise<EventDrivenPattern[]> {
		const patterns: EventDrivenPattern[] = [];

		// Get recent events that might trigger patterns
		const recentEvents = await this.getRecentMarketEvents(market, Date.now() - 7 * 24 * 60 * 60 * 1000);

		for (const event of recentEvents) {
			const pattern = this.analyzeEventResponse(timeSeries, event, entity);
			if (pattern.confidence >= this.confidenceThreshold) {
				patterns.push({
					...pattern,
					patternId: `event_${entity}_${market}_${event.id}_${Date.now()}`,
					entity,
					market,
					timeWindow: 24 * 60 * 60 * 1000, // 24 hours
					occurrences: 1,
					lastDetected: Date.now(),
				});
			}
		}

		return patterns;
	}

	private analyzeEventResponse(
		timeSeries: Array<{timestamp: number, value: number}>,
		event: {id: string, timestamp: number, type: string},
		entity: string
	): Omit<EventDrivenPattern, 'patternId' | 'entity' | 'market' | 'timeWindow' | 'occurrences' | 'lastDetected'> {
		// Look for patterns in the 24 hours after the event
		const eventTime = event.timestamp;
		const analysisWindow = 24 * 60 * 60 * 1000; // 24 hours

		const preEventData = timeSeries.filter(p =>
			p.timestamp >= eventTime - analysisWindow && p.timestamp < eventTime
		);
		const postEventData = timeSeries.filter(p =>
			p.timestamp >= eventTime && p.timestamp < eventTime + analysisWindow
		);

		if (preEventData.length < 10 || postEventData.length < 10) {
			return {
				patternType: 'EVENT_DRIVEN',
				triggerEvents: [event.type],
				responseLag: 0,
				decayRate: 0,
				confidence: 0,
				strength: 0,
				metadata: { correlationHistory: [] }
			};
		}

		// Calculate average values before and after
		const preAvg = preEventData.reduce((sum, p) => sum + p.value, 0) / preEventData.length;
		const postAvg = postEventData.reduce((sum, p) => sum + p.value, 0) / postEventData.length;

		const change = (postAvg - preAvg) / preAvg;
		const strength = Math.min(Math.abs(change), 1);

		// Find response lag (time to peak response)
		let maxChange = 0;
		let responseLag = 0;
		for (let i = 0; i < postEventData.length; i++) {
			const timeDiff = postEventData[i].timestamp - eventTime;
			const valueChange = (postEventData[i].value - preAvg) / preAvg;
			if (Math.abs(valueChange) > Math.abs(maxChange)) {
				maxChange = valueChange;
				responseLag = timeDiff;
			}
		}

		// Calculate decay rate (how quickly it returns to baseline)
		const decayPoints = postEventData.slice(-10); // Last 10 points
		const finalAvg = decayPoints.reduce((sum, p) => sum + p.value, 0) / decayPoints.length;
		const decayRate = Math.abs(finalAvg - postAvg) / Math.abs(maxChange);

		// Confidence based on statistical significance
		const preStd = this.calculateStdDev(preEventData.map(p => p.value));
		const postStd = this.calculateStdDev(postEventData.map(p => p.value));
		const tStatistic = Math.abs(change) / Math.sqrt(preStd * preStd / preEventData.length + postStd * postStd / postEventData.length);
		const confidence = Math.min(tStatistic / 3, 1); // t-stat > 3 is significant

		return {
			patternType: 'EVENT_DRIVEN',
			triggerEvents: [event.type],
			responseLag,
			decayRate,
			confidence,
			strength,
			metadata: {
				triggerEvents: [event.type],
				correlationHistory: postEventData
			}
		};
	}

	private async detectCyclicalPatterns(
		timeSeries: Array<{timestamp: number, value: number}>,
		entity: string,
		market: string
	): Promise<CyclicalPattern[]> {
		const patterns: CyclicalPattern[] = [];

		// Use autocorrelation to detect cycles
		const cycles = this.detectCyclesViaAutocorrelation(timeSeries);

		for (const cycle of cycles) {
			if (cycle.confidence >= this.confidenceThreshold) {
				patterns.push({
					...cycle,
					patternId: `cycle_${entity}_${market}_${cycle.cycleLength}_${Date.now()}`,
					entity,
					market,
					timeWindow: cycle.cycleLength * 2, // At least 2 cycles
					occurrences: 1,
					lastDetected: Date.now(),
				});
			}
		}

		return patterns;
	}

	private detectCyclesViaAutocorrelation(
		timeSeries: Array<{timestamp: number, value: number}>
	): Array<Omit<CyclicalPattern, 'patternId' | 'entity' | 'market' | 'timeWindow' | 'occurrences' | 'lastDetected'>> {
		const values = timeSeries.map(p => p.value);
		const n = values.length;

		if (n < 100) return []; // Need sufficient data

		// Calculate autocorrelation for different lags
		const maxLag = Math.min(n / 4, 100); // Up to 100 lags or 1/4 of data
		const autocorrelations: Array<{lag: number, correlation: number}> = [];

		for (let lag = 1; lag <= maxLag; lag++) {
			let sum = 0;
			let count = 0;

			for (let i = lag; i < n; i++) {
				sum += values[i] * values[i - lag];
				count++;
			}

			const correlation = sum / count;
			autocorrelations.push({ lag, correlation });
		}

		// Find peaks in autocorrelation (potential cycle lengths)
		const cycles: Array<{cycleLength: number, cycleStrength: number, confidence: number, cyclePhase: number}> = [];

		for (let i = 1; i < autocorrelations.length - 1; i++) {
			const current = autocorrelations[i];
			const prev = autocorrelations[i - 1];
			const next = autocorrelations[i + 1];

			// Local maximum
			if (current.correlation > prev.correlation && current.correlation > next.correlation) {
				const cycleLength = current.lag * this.estimateTimeInterval(timeSeries);
				const cycleStrength = current.correlation;
				const confidence = Math.min(cycleStrength / 0.5, 1); // Strong correlation = high confidence

				// Calculate current phase
				const cyclePhase = (timeSeries.length % current.lag) / current.lag;

				cycles.push({
					cycleLength,
					cycleStrength,
					confidence,
					cyclePhase
				});
			}
		}

		return cycles.map(cycle => ({
			patternType: 'CYCLICAL' as const,
			strength: cycle.cycleStrength,
			confidence: cycle.confidence,
			metadata: {
				correlationHistory: timeSeries.slice(-50)
			},
			cycleLength: cycle.cycleLength,
			cyclePhase: cycle.cyclePhase,
			cycleStrength: cycle.cycleStrength
		}));
	}

	private async detectTrendPatterns(
		timeSeries: Array<{timestamp: number, value: number}>,
		entity: string,
		market: string
	): Promise<TemporalPattern[]> {
		// Simple trend detection using linear regression
		const n = timeSeries.length;
		if (n < 20) return [];

		// Normalize timestamps to 0-based
		const startTime = timeSeries[0].timestamp;
		const normalizedData = timeSeries.map(p => ({
			x: (p.timestamp - startTime) / (1000 * 60 * 60), // hours
			y: p.value
		}));

		// Linear regression
		const sumX = normalizedData.reduce((sum, p) => sum + p.x, 0);
		const sumY = normalizedData.reduce((sum, p) => sum + p.y, 0);
		const sumXY = normalizedData.reduce((sum, p) => sum + p.x * p.y, 0);
		const sumXX = normalizedData.reduce((sum, p) => sum + p.x * p.x, 0);

		const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
		const intercept = (sumY - slope * sumX) / n;

		// Calculate R-squared
		const yMean = sumY / n;
		const ssRes = normalizedData.reduce((sum, p) => {
			const predicted = slope * p.x + intercept;
			return sum + Math.pow(p.y - predicted, 2);
		}, 0);
		const ssTot = normalizedData.reduce((sum, p) => sum + Math.pow(p.y - yMean, 2), 0);
		const rSquared = 1 - (ssRes / ssTot);

		const strength = Math.abs(slope) / (normalizedData[n-1].x - normalizedData[0].x); // Normalized slope
		const confidence = Math.min(rSquared, 1);

		if (confidence < this.confidenceThreshold) return [];

		const pattern: TemporalPattern = {
			patternId: `trend_${entity}_${market}_${Date.now()}`,
			patternType: 'TREND',
			entity,
			market,
			confidence,
			strength: Math.min(strength, 1),
			timeWindow: timeSeries[n-1].timestamp - timeSeries[0].timestamp,
			occurrences: 1,
			lastDetected: Date.now(),
			metadata: {
				correlationHistory: timeSeries,
				trendSlope: slope,
				trendIntercept: intercept,
				rSquared
			} as any
		};

		return [pattern];
	}

	private estimateTimeInterval(timeSeries: Array<{timestamp: number, value: number}>): number {
		if (timeSeries.length < 2) return 60 * 60 * 1000; // Default 1 hour

		const intervals: number[] = [];
		for (let i = 1; i < timeSeries.length; i++) {
			intervals.push(timeSeries[i].timestamp - timeSeries[i-1].timestamp);
		}

		// Use median interval
		intervals.sort((a, b) => a - b);
		return intervals[Math.floor(intervals.length / 2)];
	}

	private calculateStdDev(values: number[]): number {
		const mean = values.reduce((a, b) => a + b, 0) / values.length;
		const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
		return Math.sqrt(variance);
	}

	private async getRecentMarketEvents(market: string, since: number): Promise<Array<{id: string, timestamp: number, type: string}>> {
		// This would integrate with external event sources
		// For now, return mock events
		const events = [
			{ id: 'earnings_q4', timestamp: Date.now() - 2 * 60 * 60 * 1000, type: 'EARNINGS_REPORT' },
			{ id: 'fed_meeting', timestamp: Date.now() - 4 * 60 * 60 * 1000, type: 'CENTRAL_BANK_MEETING' },
			{ id: 'major_news', timestamp: Date.now() - 6 * 60 * 60 * 1000, type: 'BREAKING_NEWS' }
		];

		return events.filter(e => e.timestamp > since);
	}

	private async persistPatterns(patterns: TemporalPattern[]): Promise<void> {
		const stmt = this.db.prepare(`
			INSERT OR REPLACE INTO temporal_patterns
			(pattern_id, pattern_type, entity, market, confidence, strength, time_window,
			 occurrences, last_detected, metadata)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`);

		for (const pattern of patterns) {
			stmt.run(
				pattern.patternId,
				pattern.patternType,
				pattern.entity,
				pattern.market,
				pattern.confidence,
				pattern.strength,
				pattern.timeWindow,
				pattern.occurrences,
				pattern.lastDetected,
				JSON.stringify(pattern.metadata)
			);
		}
	}

	async addTimeSeriesData(
		entity: string,
		market: string,
		timestamp: number,
		value: number,
		volume?: number,
		metadata?: any
	): Promise<void> {
		const stmt = this.db.prepare(`
			INSERT INTO time_series_data (entity, market, timestamp, value, volume, metadata)
			VALUES (?, ?, ?, ?, ?, ?)
		`);

		stmt.run(entity, market, timestamp, value, volume || null, JSON.stringify(metadata || {}));
	}

	async getPatternsForEntity(
		entity: string,
		market: string,
		minConfidence: number = 0.7
	): Promise<TemporalPattern[]> {
		const query = this.db.prepare(`
			SELECT * FROM temporal_patterns
			WHERE entity = ? AND market = ? AND confidence >= ?
			ORDER BY confidence DESC
		`);

		const rows = query.all(entity, market, minConfidence) as any[];

		return rows.map(row => ({
			patternId: row.pattern_id,
			patternType: row.pattern_type,
			entity: row.entity,
			market: row.market,
			confidence: row.confidence,
			strength: row.strength,
			timeWindow: row.time_window,
			occurrences: row.occurrences,
			lastDetected: row.last_detected,
			metadata: JSON.parse(row.metadata)
		}));
	}
}