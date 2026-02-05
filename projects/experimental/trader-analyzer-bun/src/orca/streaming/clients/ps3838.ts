/**
 * @fileoverview PS3838/Pinnacle API client
 * @description Sharp bookmaker API - canonical reference odds
 * @module orca/streaming/clients/ps3838
 *
 * API Reference: https://ps3838api.github.io/docs/?api=lines
 */

import type { OrcaBookmakerConfig, OrcaSport, Result } from "../../../types";
import { err, ok } from "../../../types";
import { BaseBookmakerClient, type RawOddsData } from "./base";

/**
 * PS3838 sport ID mapping
 */
const SPORT_IDS: Record<OrcaSport, number> = {
	NFL: 15, // American Football
	NBA: 4, // Basketball
	MLB: 3, // Baseball
	NHL: 19, // Hockey
	NCAAF: 15, // American Football (filtered by league)
	NCAAB: 4, // Basketball (filtered by league)
	EPL: 29, // Soccer
	LALIGA: 29,
	BUNDESLIGA: 29,
	SERIEA: 29,
	LIGUE1: 29,
	MLS: 29,
	UFC: 22, // MMA
	BOXING: 6, // Boxing
	TENNIS: 33, // Tennis
	GOLF: 13, // Golf
	ESPORTS: 12, // Esports
};

/**
 * PS3838 league ID mapping for filtering
 */
const LEAGUE_IDS: Partial<Record<OrcaSport, number[]>> = {
	NFL: [889],
	NBA: [487],
	MLB: [246],
	NHL: [1456],
	NCAAF: [880],
	NCAAB: [493],
	EPL: [1980],
	UFC: [4444],
};

/**
 * PS3838/Pinnacle API client
 *
 * Features:
 * - Sharpest odds in the industry
 * - High limits
 * - RESTful API with Basic auth
 */
export class PS3838Client extends BaseBookmakerClient {
	readonly bookmaker = "ps3838" as const;

	constructor(config?: Partial<OrcaBookmakerConfig>) {
		super({
			baseUrl: "https://api.ps3838.com/v3",
			auth: {
				type: "basic",
				username: process.env.ORCA_PS_USER || config?.auth?.username || "",
				password: process.env.ORCA_PS_PASS || config?.auth?.password || "",
			},
			rateLimit: 1, // 1 request per second
			pollInterval: 5000,
			...config,
		});
	}

	async connect(): Promise<Result<void>> {
		try {
			// Test connection with balance endpoint
			const response = await fetch(`${this.config.baseUrl}/client/balance`, {
				headers: this.buildAuthHeader(),
			});

			if (!response.ok) {
				if (response.status === 401) {
					return err(new Error("PS3838: Invalid credentials"));
				}
				return err(new Error(`PS3838: Connection failed (${response.status})`));
			}

			this.connected = true;
			return ok(undefined);
		} catch (error) {
			return err(
				error instanceof Error ? error : new Error("PS3838: Connection failed"),
			);
		}
	}

	async fetchOdds(sports?: OrcaSport[]): Promise<Result<RawOddsData[]>> {
		if (!this.connected) {
			const connectResult = await this.connect();
			if (!connectResult.ok) return connectResult as Result<RawOddsData[]>;
		}

		await this.rateLimitWait();

		const targetSports =
			sports ||
			this.config.sports ||
			(["NBA", "NFL", "MLB", "NHL"] as OrcaSport[]);
		const allOdds: RawOddsData[] = [];

		for (const sport of targetSports) {
			const sportId = SPORT_IDS[sport];
			if (!sportId) continue;

			try {
				// Fetch fixtures first
				const fixturesResponse = await fetch(
					`${this.config.baseUrl}/fixtures?sportId=${sportId}&isLive=0`,
					{ headers: this.buildAuthHeader() },
				);

				if (!fixturesResponse.ok) continue;
				const fixtures = await fixturesResponse.json();

				await this.rateLimitWait();

				// Fetch odds
				const oddsResponse = await fetch(
					`${this.config.baseUrl}/odds?sportId=${sportId}&oddsFormat=DECIMAL&isLive=0`,
					{ headers: this.buildAuthHeader() },
				);

				if (!oddsResponse.ok) continue;
				const oddsData = await oddsResponse.json();

				// Merge fixtures and odds
				const sportOdds = this.parseOdds(sport, fixtures, oddsData);
				allOdds.push(...sportOdds);

				await this.rateLimitWait();
			} catch (error) {
				console.error(`PS3838: Error fetching ${sport}:`, error);
			}
		}

		return ok(allOdds);
	}

	/**
	 * Parse PS3838 API response into RawOddsData format
	 */
	private parseOdds(
		sport: OrcaSport,
		fixtures: any,
		oddsData: any,
	): RawOddsData[] {
		const results: RawOddsData[] = [];

		if (!fixtures.league || !oddsData.leagues) return results;

		// Build event lookup map
		const eventMap = new Map<number, any>();
		for (const league of fixtures.league) {
			for (const event of league.events || []) {
				eventMap.set(event.id, { ...event, leagueName: league.name });
			}
		}

		// Process odds
		for (const league of oddsData.leagues || []) {
			for (const event of league.events || []) {
				const fixture = eventMap.get(event.id);
				if (!fixture) continue;

				// Process each period
				for (const period of event.periods || []) {
					const periodName = period.number === 0 ? "full" : `p${period.number}`;

					// Moneyline
					if (period.moneyline) {
						if (period.moneyline.home) {
							results.push({
								sport: sport,
								league: fixture.leagueName,
								homeTeam: fixture.home,
								awayTeam: fixture.away,
								startTime: new Date(fixture.starts).toISOString(),
								marketType: "moneyline",
								period: periodName,
								selection: fixture.home,
								odds: period.moneyline.home,
								isOpen: period.status === 1,
							});
						}
						if (period.moneyline.away) {
							results.push({
								sport: sport,
								league: fixture.leagueName,
								homeTeam: fixture.home,
								awayTeam: fixture.away,
								startTime: new Date(fixture.starts).toISOString(),
								marketType: "moneyline",
								period: periodName,
								selection: fixture.away,
								odds: period.moneyline.away,
								isOpen: period.status === 1,
							});
						}
						if (period.moneyline.draw) {
							results.push({
								sport: sport,
								league: fixture.leagueName,
								homeTeam: fixture.home,
								awayTeam: fixture.away,
								startTime: new Date(fixture.starts).toISOString(),
								marketType: "moneyline",
								period: periodName,
								selection: "Draw",
								odds: period.moneyline.draw,
								isOpen: period.status === 1,
							});
						}
					}

					// Spreads
					for (const spread of period.spreads || []) {
						results.push({
							sport: sport,
							league: fixture.leagueName,
							homeTeam: fixture.home,
							awayTeam: fixture.away,
							startTime: new Date(fixture.starts).toISOString(),
							marketType: "spread",
							period: periodName,
							line: spread.hdp,
							selection: fixture.home,
							odds: spread.home,
							isOpen: period.status === 1,
							maxStake: spread.max,
						});
						results.push({
							sport: sport,
							league: fixture.leagueName,
							homeTeam: fixture.home,
							awayTeam: fixture.away,
							startTime: new Date(fixture.starts).toISOString(),
							marketType: "spread",
							period: periodName,
							line: -spread.hdp,
							selection: fixture.away,
							odds: spread.away,
							isOpen: period.status === 1,
							maxStake: spread.max,
						});
					}

					// Totals
					for (const total of period.totals || []) {
						results.push({
							sport: sport,
							league: fixture.leagueName,
							homeTeam: fixture.home,
							awayTeam: fixture.away,
							startTime: new Date(fixture.starts).toISOString(),
							marketType: "total",
							period: periodName,
							line: total.points,
							selection: "Over",
							odds: total.over,
							isOpen: period.status === 1,
							maxStake: total.max,
						});
						results.push({
							sport: sport,
							league: fixture.leagueName,
							homeTeam: fixture.home,
							awayTeam: fixture.away,
							startTime: new Date(fixture.starts).toISOString(),
							marketType: "total",
							period: periodName,
							line: total.points,
							selection: "Under",
							odds: total.under,
							isOpen: period.status === 1,
							maxStake: total.max,
						});
					}
				}
			}
		}

		return results;
	}
}
