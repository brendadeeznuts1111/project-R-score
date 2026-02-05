/**
 * @fileoverview Betfair Exchange API client
 * @description European betting exchange - true market odds
 * @module orca/streaming/clients/betfair
 *
 * API Reference: https://docs.developer.betfair.com/display/1smk3cen4v3lu3yomq5qye0ni/Betting+API
 */

import type { OrcaBookmakerConfig, OrcaSport, Result } from "../../../types";
import { err, ok } from "../../../types";
import { BaseBookmakerClient, type RawOddsData } from "./base";

/**
 * Betfair event type IDs
 */
const EVENT_TYPE_IDS: Partial<Record<OrcaSport, string>> = {
	NFL: "6423", // American Football
	NBA: "7522", // Basketball
	MLB: "7511", // Baseball
	NHL: "7524", // Ice Hockey
	EPL: "1", // Soccer
	LALIGA: "1",
	BUNDESLIGA: "1",
	SERIEA: "1",
	LIGUE1: "1",
	MLS: "1",
	UFC: "26420", // MMA (Mixed Martial Arts)
	BOXING: "6", // Boxing
	TENNIS: "2", // Tennis
	GOLF: "3", // Golf
};

/**
 * Betfair Exchange API client
 *
 * Features:
 * - True market odds (exchange model)
 * - Back and lay prices
 * - Requires session token (login first)
 */
export class BetfairClient extends BaseBookmakerClient {
	readonly bookmaker = "betfair" as const;
	private sessionToken: string | null = null;

	constructor(config?: Partial<OrcaBookmakerConfig>) {
		super({
			baseUrl: "https://api.betfair.com/exchange/betting/rest/v1.0",
			auth: {
				type: "session",
				apiKey: process.env.ORCA_BF_APPKEY || config?.auth?.apiKey || "",
				sessionToken:
					process.env.ORCA_BF_SESSION || config?.auth?.sessionToken || "",
			},
			rateLimit: 5, // 5 requests per second
			pollInterval: 5000,
			...config,
		});
	}

	async connect(): Promise<Result<void>> {
		try {
			// If we have a session token, validate it
			if (this.config.auth.sessionToken) {
				this.sessionToken = this.config.auth.sessionToken;

				// Test with a simple call
				const response = await fetch(`${this.config.baseUrl}/listEventTypes/`, {
					method: "POST",
					headers: {
						...this.buildAuthHeader(),
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ filter: {} }),
				});

				if (response.ok) {
					this.connected = true;
					return ok(undefined);
				}

				// Session token invalid, try to login
				this.sessionToken = null;
			}

			// Login flow would go here (requires username/password)
			// For now, require session token
			return err(
				new Error(
					"Betfair: Session token required. Login at https://identitysso.betfair.com",
				),
			);
		} catch (error) {
			return err(
				error instanceof Error
					? error
					: new Error("Betfair: Connection failed"),
			);
		}
	}

	protected buildAuthHeader(): Record<string, string> {
		return {
			"X-Application": this.config.auth.apiKey || "",
			"X-Authentication": this.sessionToken || "",
		};
	}

	async fetchOdds(sports?: OrcaSport[]): Promise<Result<RawOddsData[]>> {
		if (!this.connected) {
			const connectResult = await this.connect();
			if (!connectResult.ok) return connectResult as Result<RawOddsData[]>;
		}

		await this.rateLimitWait();

		const targetSports =
			sports || this.config.sports || (["NBA", "NFL", "EPL"] as OrcaSport[]);
		const allOdds: RawOddsData[] = [];

		for (const sport of targetSports) {
			const eventTypeId = EVENT_TYPE_IDS[sport];
			if (!eventTypeId) continue;

			try {
				// Get upcoming events
				const eventsResponse = await fetch(
					`${this.config.baseUrl}/listEvents/`,
					{
						method: "POST",
						headers: {
							...this.buildAuthHeader(),
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							filter: {
								eventTypeIds: [eventTypeId],
								marketStartTime: {
									from: new Date().toISOString(),
									to: new Date(
										Date.now() + 7 * 24 * 60 * 60 * 1000,
									).toISOString(),
								},
							},
							maxResults: 100,
						}),
					},
				);

				if (!eventsResponse.ok) continue;
				const events = await eventsResponse.json();

				await this.rateLimitWait();

				// Get markets for each event
				for (const eventResult of events || []) {
					const event = eventResult.event;

					// Get market catalogue
					const marketsResponse = await fetch(
						`${this.config.baseUrl}/listMarketCatalogue/`,
						{
							method: "POST",
							headers: {
								...this.buildAuthHeader(),
								"Content-Type": "application/json",
							},
							body: JSON.stringify({
								filter: {
									eventIds: [event.id],
									marketTypeCodes: [
										"MATCH_ODDS",
										"OVER_UNDER_25",
										"ASIAN_HANDICAP",
									],
								},
								maxResults: 10,
								marketProjection: [
									"RUNNER_DESCRIPTION",
									"EVENT",
									"COMPETITION",
								],
							}),
						},
					);

					if (!marketsResponse.ok) continue;
					const markets = await marketsResponse.json();

					await this.rateLimitWait();

					// Get prices for each market
					const marketIds = markets.map((m: any) => m.marketId);
					if (marketIds.length === 0) continue;

					const pricesResponse = await fetch(
						`${this.config.baseUrl}/listMarketBook/`,
						{
							method: "POST",
							headers: {
								...this.buildAuthHeader(),
								"Content-Type": "application/json",
							},
							body: JSON.stringify({
								marketIds,
								priceProjection: {
									priceData: ["EX_BEST_OFFERS"],
								},
							}),
						},
					);

					if (!pricesResponse.ok) continue;
					const prices = await pricesResponse.json();

					// Parse into RawOddsData
					const sportOdds = this.parseOdds(sport, markets, prices, event);
					allOdds.push(...sportOdds);

					await this.rateLimitWait();
				}
			} catch (error) {
				console.error(`Betfair: Error fetching ${sport}:`, error);
			}
		}

		return ok(allOdds);
	}

	/**
	 * Parse Betfair API response into RawOddsData format
	 */
	private parseOdds(
		sport: OrcaSport,
		markets: any[],
		prices: any[],
		event: any,
	): RawOddsData[] {
		const results: RawOddsData[] = [];

		// Create market lookup
		const marketMap = new Map<string, any>();
		for (const market of markets) {
			marketMap.set(market.marketId, market);
		}

		// Parse event name to extract teams
		const eventName = event.name || "";
		const teams = this.parseTeams(eventName, sport);

		for (const priceData of prices) {
			const market = marketMap.get(priceData.marketId);
			if (!market) continue;

			const marketType = this.mapMarketType(market.marketType);
			const competition = market.competition?.name || sport;

			for (const runner of priceData.runners || []) {
				const runnerInfo = market.runners?.find(
					(r: any) => r.selectionId === runner.selectionId,
				);
				const runnerName =
					runnerInfo?.runnerName || `Selection ${runner.selectionId}`;

				// Get best back price
				const bestBack = runner.ex?.availableToBack?.[0];
				if (!bestBack) continue;

				results.push({
					sport: sport,
					league: competition,
					homeTeam: teams.home,
					awayTeam: teams.away,
					startTime: event.openDate || new Date().toISOString(),
					marketType,
					period: "full",
					selection: runnerName,
					odds: bestBack.price,
					isOpen: priceData.status === "OPEN",
					maxStake: bestBack.size,
				});
			}
		}

		return results;
	}

	/**
	 * Parse event name to extract team names
	 */
	private parseTeams(
		eventName: string,
		sport: OrcaSport,
	): { home: string; away: string } {
		// Common patterns: "Team A v Team B", "Team A @ Team B", "Team A vs Team B"
		const patterns = [/ v /i, / vs /i, / @ /i, / - /];

		for (const pattern of patterns) {
			const parts = eventName.split(pattern);
			if (parts.length === 2) {
				return {
					home: parts[0].trim(),
					away: parts[1].trim(),
				};
			}
		}

		return { home: eventName, away: "Unknown" };
	}

	/**
	 * Map Betfair market type to ORCA market type
	 */
	private mapMarketType(betfairType: string): string {
		const mapping: Record<string, string> = {
			MATCH_ODDS: "moneyline",
			OVER_UNDER_25: "total",
			OVER_UNDER_35: "total",
			ASIAN_HANDICAP: "spread",
			CORRECT_SCORE: "prop",
			FIRST_GOAL_SCORER: "prop",
		};

		return mapping[betfairType] || "other";
	}
}
