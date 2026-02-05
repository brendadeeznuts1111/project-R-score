/**
 * @fileoverview Property Registrations
 * @description Property definitions for existing data sources
 * @module properties/registrations
 */

import type { PropertyRegistry } from "./registry";
import type { PropertyDefinition } from "./schema";

/**
 * Register properties for CCXT/crypto exchange providers
 */
export function registerCCXTProperties(registry: PropertyRegistry): void {
	const properties: PropertyDefinition[] = [
		{
			id: "price",
			namespace: "@nexus/providers/exchange",
			version: "1.0.0",
			type: "number",
			schema: {
				type: "number",
				minimum: 0,
				description: "Trade execution price",
			},
			metadata: {
				description: "Trade execution price in quote currency",
				unit: "USD",
				source: "ccxt",
				lineage: [],
				tags: ["financial", "real-time", "trade"],
			},
			accessControl: {
				roles: ["admin", "trader", "analyst", "readonly"],
				featureFlags: [],
			},
		},
		{
			id: "amount",
			namespace: "@nexus/providers/exchange",
			version: "1.0.0",
			type: "number",
			schema: {
				type: "number",
				minimum: 0,
				description: "Trade quantity",
			},
			metadata: {
				description: "Trade quantity in base currency",
				unit: "BTC",
				source: "ccxt",
				lineage: [],
				tags: ["financial", "real-time", "trade"],
			},
			accessControl: {
				roles: ["admin", "trader", "analyst", "readonly"],
				featureFlags: [],
			},
		},
		{
			id: "cost",
			namespace: "@nexus/providers/exchange",
			version: "1.0.0",
			type: "number",
			schema: {
				type: "number",
				minimum: 0,
				description: "Total trade cost",
			},
			metadata: {
				description: "Total trade cost (price * amount)",
				unit: "USD",
				source: "ccxt",
				lineage: [
					{
						sourceProperty: "price",
						transformation: "multiply",
						timestamp: Date.now(),
						version: "1.0.0",
					},
					{
						sourceProperty: "amount",
						transformation: "multiply",
						timestamp: Date.now(),
						version: "1.0.0",
					},
				],
				tags: ["financial", "derived", "trade"],
			},
			accessControl: {
				roles: ["admin", "trader", "analyst", "readonly"],
				featureFlags: [],
			},
		},
		{
			id: "fee",
			namespace: "@nexus/providers/exchange",
			version: "1.0.0",
			type: "number",
			schema: {
				type: "number",
				minimum: 0,
				description: "Trading fee",
			},
			metadata: {
				description: "Trading fee paid for the trade",
				unit: "USD",
				source: "ccxt",
				lineage: [],
				tags: ["financial", "real-time", "trade"],
			},
			accessControl: {
				roles: ["admin", "trader", "analyst", "readonly"],
				featureFlags: [],
			},
		},
		{
			id: "symbol",
			namespace: "@nexus/providers/exchange",
			version: "1.0.0",
			type: "string",
			schema: {
				type: "string",
				pattern: "^[A-Z]+/[A-Z]+$",
				description: "Trading pair symbol",
			},
			metadata: {
				description: "Trading pair symbol (e.g., BTC/USDT)",
				source: "ccxt",
				lineage: [],
				tags: ["identifier", "trade"],
			},
			accessControl: {
				roles: ["admin", "trader", "analyst", "readonly"],
				featureFlags: [],
			},
		},
		{
			id: "side",
			namespace: "@nexus/providers/exchange",
			version: "1.0.0",
			type: "string",
			schema: {
				type: "string",
				enum: ["buy", "sell"],
				description: "Trade side",
			},
			metadata: {
				description: "Trade side (buy or sell)",
				source: "ccxt",
				lineage: [],
				tags: ["metadata", "trade"],
			},
			accessControl: {
				roles: ["admin", "trader", "analyst", "readonly"],
				featureFlags: [],
			},
		},
		{
			id: "timestamp",
			namespace: "@nexus/providers/exchange",
			version: "1.0.0",
			type: "number",
			schema: {
				type: "number",
				minimum: 0,
				description: "Trade timestamp",
			},
			metadata: {
				description: "Trade execution timestamp in milliseconds",
				unit: "ms",
				source: "ccxt",
				lineage: [],
				tags: ["temporal", "real-time", "trade"],
			},
			accessControl: {
				roles: ["admin", "trader", "analyst", "readonly"],
				featureFlags: [],
			},
		},
	];

	for (const property of properties) {
		registry.register(property);
	}
}

/**
 * Register properties for Deribit options provider
 */
export function registerDeribitProperties(registry: PropertyRegistry): void {
	const properties: PropertyDefinition[] = [
		{
			id: "underlyingPrice",
			namespace: "@nexus/providers/deribit",
			version: "1.0.0",
			type: "number",
			schema: {
				type: "number",
				minimum: 0,
				description: "Underlying asset price",
			},
			metadata: {
				description: "Current price of the underlying asset",
				unit: "USD",
				source: "deribit",
				lineage: [],
				tags: ["financial", "real-time", "options"],
			},
			accessControl: {
				roles: ["admin", "trader", "analyst", "readonly"],
				featureFlags: [],
			},
		},
		{
			id: "markPrice",
			namespace: "@nexus/providers/deribit",
			version: "1.0.0",
			type: "number",
			schema: {
				type: "number",
				minimum: 0,
				description: "Option mark price",
			},
			metadata: {
				description: "Current mark price of the option",
				unit: "USD",
				source: "deribit",
				lineage: [],
				tags: ["financial", "real-time", "options"],
			},
			accessControl: {
				roles: ["admin", "trader", "analyst", "readonly"],
				featureFlags: [],
			},
		},
		{
			id: "markIV",
			namespace: "@nexus/providers/deribit",
			version: "1.0.0",
			type: "number",
			schema: {
				type: "number",
				minimum: 0,
				maximum: 10,
				description: "Mark implied volatility",
			},
			metadata: {
				description: "Mark implied volatility (0-10 range)",
				unit: "percentage",
				source: "deribit",
				lineage: [],
				tags: ["analytics", "derived", "options"],
			},
			accessControl: {
				roles: ["admin", "trader", "analyst"],
				featureFlags: [],
			},
		},
		{
			id: "delta",
			namespace: "@nexus/providers/deribit",
			version: "1.0.0",
			type: "number",
			schema: {
				type: "number",
				minimum: -1,
				maximum: 1,
				description: "Option delta",
			},
			metadata: {
				description: "Option delta (price sensitivity)",
				source: "deribit",
				lineage: [],
				tags: ["analytics", "derived", "options", "greeks"],
			},
			accessControl: {
				roles: ["admin", "trader", "analyst"],
				featureFlags: [],
			},
		},
		{
			id: "gamma",
			namespace: "@nexus/providers/deribit",
			version: "1.0.0",
			type: "number",
			schema: {
				type: "number",
				description: "Option gamma",
			},
			metadata: {
				description: "Option gamma (delta sensitivity)",
				source: "deribit",
				lineage: [],
				tags: ["analytics", "derived", "options", "greeks"],
			},
			accessControl: {
				roles: ["admin", "trader", "analyst"],
				featureFlags: [],
			},
		},
		{
			id: "theta",
			namespace: "@nexus/providers/deribit",
			version: "1.0.0",
			type: "number",
			schema: {
				type: "number",
				description: "Option theta",
			},
			metadata: {
				description: "Option theta (time decay)",
				unit: "USD/day",
				source: "deribit",
				lineage: [],
				tags: ["analytics", "derived", "options", "greeks"],
			},
			accessControl: {
				roles: ["admin", "trader", "analyst"],
				featureFlags: [],
			},
		},
		{
			id: "vega",
			namespace: "@nexus/providers/deribit",
			version: "1.0.0",
			type: "number",
			schema: {
				type: "number",
				description: "Option vega",
			},
			metadata: {
				description: "Option vega (volatility sensitivity)",
				source: "deribit",
				lineage: [],
				tags: ["analytics", "derived", "options", "greeks"],
			},
			accessControl: {
				roles: ["admin", "trader", "analyst"],
				featureFlags: [],
			},
		},
		{
			id: "strike",
			namespace: "@nexus/providers/deribit",
			version: "1.0.0",
			type: "number",
			schema: {
				type: "number",
				minimum: 0,
				description: "Option strike price",
			},
			metadata: {
				description: "Option strike price",
				unit: "USD",
				source: "deribit",
				lineage: [],
				tags: ["financial", "options"],
			},
			accessControl: {
				roles: ["admin", "trader", "analyst", "readonly"],
				featureFlags: [],
			},
		},
		{
			id: "expiration",
			namespace: "@nexus/providers/deribit",
			version: "1.0.0",
			type: "number",
			schema: {
				type: "number",
				minimum: 0,
				description: "Option expiration timestamp",
			},
			metadata: {
				description: "Option expiration timestamp in milliseconds",
				unit: "ms",
				source: "deribit",
				lineage: [],
				tags: ["temporal", "options"],
			},
			accessControl: {
				roles: ["admin", "trader", "analyst", "readonly"],
				featureFlags: [],
			},
		},
	];

	for (const property of properties) {
		registry.register(property);
	}
}

/**
 * Register properties for Polymarket prediction market provider
 */
export function registerPolymarketProperties(registry: PropertyRegistry): void {
	const properties: PropertyDefinition[] = [
		{
			id: "question",
			namespace: "@nexus/providers/polymarket",
			version: "1.0.0",
			type: "string",
			schema: {
				type: "string",
				description: "Market question",
			},
			metadata: {
				description: "Prediction market question",
				source: "polymarket",
				lineage: [],
				tags: ["metadata", "prediction"],
			},
			accessControl: {
				roles: ["admin", "trader", "analyst", "readonly"],
				featureFlags: [],
			},
		},
		{
			id: "outcomePrice",
			namespace: "@nexus/providers/polymarket",
			version: "1.0.0",
			type: "number",
			schema: {
				type: "number",
				minimum: 0,
				maximum: 1,
				description: "Outcome price/probability",
			},
			metadata: {
				description: "Outcome price (0-1 probability)",
				source: "polymarket",
				lineage: [],
				tags: ["financial", "real-time", "prediction"],
			},
			accessControl: {
				roles: ["admin", "trader", "analyst", "readonly"],
				featureFlags: [],
			},
		},
		{
			id: "volume",
			namespace: "@nexus/providers/polymarket",
			version: "1.0.0",
			type: "number",
			schema: {
				type: "number",
				minimum: 0,
				description: "Market volume",
			},
			metadata: {
				description: "Total volume traded on the market",
				unit: "USD",
				source: "polymarket",
				lineage: [],
				tags: ["financial", "prediction"],
			},
			accessControl: {
				roles: ["admin", "trader", "analyst", "readonly"],
				featureFlags: [],
			},
		},
		{
			id: "liquidity",
			namespace: "@nexus/providers/polymarket",
			version: "1.0.0",
			type: "number",
			schema: {
				type: "number",
				minimum: 0,
				description: "Market liquidity",
			},
			metadata: {
				description: "Current market liquidity",
				unit: "USD",
				source: "polymarket",
				lineage: [],
				tags: ["financial", "prediction"],
			},
			accessControl: {
				roles: ["admin", "trader", "analyst"],
				featureFlags: [],
			},
		},
	];

	for (const property of properties) {
		registry.register(property);
	}
}

/**
 * Register properties for Kalshi prediction market provider
 */
export function registerKalshiProperties(registry: PropertyRegistry): void {
	const properties: PropertyDefinition[] = [
		{
			id: "yesBid",
			namespace: "@nexus/providers/kalshi",
			version: "1.0.0",
			type: "number",
			schema: {
				type: "number",
				minimum: 0,
				maximum: 100,
				description: "Yes bid price in cents",
			},
			metadata: {
				description: "Yes bid price (0-100 cents)",
				unit: "cents",
				source: "kalshi",
				lineage: [],
				tags: ["financial", "real-time", "prediction"],
			},
			accessControl: {
				roles: ["admin", "trader", "analyst", "readonly"],
				featureFlags: [],
			},
		},
		{
			id: "yesAsk",
			namespace: "@nexus/providers/kalshi",
			version: "1.0.0",
			type: "number",
			schema: {
				type: "number",
				minimum: 0,
				maximum: 100,
				description: "Yes ask price in cents",
			},
			metadata: {
				description: "Yes ask price (0-100 cents)",
				unit: "cents",
				source: "kalshi",
				lineage: [],
				tags: ["financial", "real-time", "prediction"],
			},
			accessControl: {
				roles: ["admin", "trader", "analyst", "readonly"],
				featureFlags: [],
			},
		},
		{
			id: "noBid",
			namespace: "@nexus/providers/kalshi",
			version: "1.0.0",
			type: "number",
			schema: {
				type: "number",
				minimum: 0,
				maximum: 100,
				description: "No bid price in cents",
			},
			metadata: {
				description: "No bid price (0-100 cents)",
				unit: "cents",
				source: "kalshi",
				lineage: [],
				tags: ["financial", "real-time", "prediction"],
			},
			accessControl: {
				roles: ["admin", "trader", "analyst", "readonly"],
				featureFlags: [],
			},
		},
		{
			id: "noAsk",
			namespace: "@nexus/providers/kalshi",
			version: "1.0.0",
			type: "number",
			schema: {
				type: "number",
				minimum: 0,
				maximum: 100,
				description: "No ask price in cents",
			},
			metadata: {
				description: "No ask price (0-100 cents)",
				unit: "cents",
				source: "kalshi",
				lineage: [],
				tags: ["financial", "real-time", "prediction"],
			},
			accessControl: {
				roles: ["admin", "trader", "analyst", "readonly"],
				featureFlags: [],
			},
		},
	];

	for (const property of properties) {
		registry.register(property);
	}
}

/**
 * Register properties for ORCA/sportsbook providers
 */
export function registerORCAProperties(registry: PropertyRegistry): void {
	const properties: PropertyDefinition[] = [
		{
			id: "odds",
			namespace: "@nexus/providers/orca",
			version: "1.0.0",
			type: "number",
			schema: {
				type: "number",
				minimum: 1,
				description: "Decimal odds",
			},
			metadata: {
				description: "Decimal odds (e.g., 2.5 = +150 American)",
				source: "orca",
				lineage: [],
				tags: ["financial", "real-time", "sportsbook"],
			},
			accessControl: {
				roles: ["admin", "trader", "analyst", "readonly"],
				featureFlags: [],
			},
		},
		{
			id: "line",
			namespace: "@nexus/providers/orca",
			version: "1.0.0",
			type: "number",
			schema: {
				type: "number",
				description: "Market line",
			},
			metadata: {
				description: "Market line (spread, total, etc.)",
				source: "orca",
				lineage: [],
				tags: ["financial", "sportsbook"],
			},
			accessControl: {
				roles: ["admin", "trader", "analyst", "readonly"],
				featureFlags: [],
			},
		},
		{
			id: "bookmaker",
			namespace: "@nexus/providers/orca",
			version: "1.0.0",
			type: "string",
			schema: {
				type: "string",
				enum: [
					"pinnacle",
					"draftkings",
					"fanduel",
					"betmgm",
					"circa",
					"betfair",
					"ps3838",
				],
				description: "Bookmaker identifier",
			},
			metadata: {
				description: "Source bookmaker",
				source: "orca",
				lineage: [],
				tags: ["identifier", "sportsbook"],
			},
			accessControl: {
				roles: ["admin", "trader", "analyst", "readonly"],
				featureFlags: [],
			},
		},
		{
			id: "marketType",
			namespace: "@nexus/providers/orca",
			version: "1.0.0",
			type: "string",
			schema: {
				type: "string",
				enum: ["moneyline", "spread", "total", "prop", "future"],
				description: "Market type",
			},
			metadata: {
				description: "Sports betting market type",
				source: "orca",
				lineage: [],
				tags: ["metadata", "sportsbook"],
			},
			accessControl: {
				roles: ["admin", "trader", "analyst", "readonly"],
				featureFlags: [],
			},
		},
		{
			id: "eventId",
			namespace: "@nexus/providers/orca",
			version: "1.0.0",
			type: "string",
			schema: {
				type: "string",
				pattern:
					"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
				description: "Canonical event ID (UUIDv5)",
			},
			metadata: {
				description: "Canonical event identifier (UUIDv5)",
				source: "orca",
				lineage: [],
				tags: ["identifier", "canonical", "sportsbook"],
			},
			accessControl: {
				roles: ["admin", "trader", "analyst", "readonly"],
				featureFlags: [],
			},
		},
		{
			id: "marketId",
			namespace: "@nexus/providers/orca",
			version: "1.0.0",
			type: "string",
			schema: {
				type: "string",
				pattern:
					"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
				description: "Canonical market ID (UUIDv5)",
			},
			metadata: {
				description: "Canonical market identifier (UUIDv5)",
				source: "orca",
				lineage: [],
				tags: ["identifier", "canonical", "sportsbook"],
			},
			accessControl: {
				roles: ["admin", "trader", "analyst", "readonly"],
				featureFlags: [],
			},
		},
	];

	for (const property of properties) {
		registry.register(property);
	}
}

/**
 * Register all properties for all providers
 */
export function registerAllProperties(registry: PropertyRegistry): void {
	registerCCXTProperties(registry);
	registerDeribitProperties(registry);
	registerPolymarketProperties(registry);
	registerKalshiProperties(registry);
	registerORCAProperties(registry);
}
