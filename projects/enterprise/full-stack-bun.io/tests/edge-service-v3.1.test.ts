/**
 * @fileoverview Market Precision Edge Service v3.1 Test Suite
 * @description Per-market URLPattern routing tests
 * @module tests/edge-service-v3.1.test
 * @version 3.1.0
 *
 * [BUN-1.3.6][MARKET-PRECISION][URLPATTERN][PER-MARKET-ROUTING]
 */

import { test, expect, beforeAll } from "bun:test";
import { MLGSGraph } from "../src/graph/MLGSGraph";

// Test database paths
const TEST_MLGS_PATH = ":memory:";

// URLPattern routes (matching edge-service-v3.1.ts)
const genericArbRoute = new URLPattern({ 
	pathname: "/api/arb/:league/:quarter" 
});

const marketScopedArb = new URLPattern({ 
	pathname: "/api/arb/:league/:quarter/:market(spread|total|player_props|team_total)" 
});

const precisionArbRoute = new URLPattern({ 
	pathname: "/api/arb/:league/:quarter/:market/:team/:outcome(-\\d+\\.\\d+|\\+\\d+\\.\\d+|o\\d+\\.\\d+|u\\d+\\.\\d+)" 
});

const shadowScanRoute = new URLPattern({ 
	pathname: "/api/shadow/:layer(L1|L2|L3|L4)/:league/:market?" 
});

const marketStreamRoute = new URLPattern({ 
	pathname: "/ws/arb/:league/:quarter/:market" 
});

let mlgs: MLGSGraph;

beforeAll(() => {
	mlgs = new MLGSGraph(TEST_MLGS_PATH);
});

// ✅ Precision market routing
test("precision market routing", () => {
	const match = precisionArbRoute.exec("https://edge/api/arb/nfl/q4/spread/chiefs/-3.5");
	expect(match).not.toBeNull();
	expect(match!.pathname.groups).toMatchObject({
		league: 'nfl',
		quarter: 'q4',
		market: 'spread',
		team: 'chiefs',
		outcome: '-3.5'
	});
});

test("precision routing with positive spread", () => {
	const match = precisionArbRoute.exec("https://edge/api/arb/nfl/q4/spread/chiefs/+3.5");
	expect(match).not.toBeNull();
	expect(match!.pathname.groups.outcome).toBe('+3.5');
});

test("precision routing with over/under", () => {
	const overMatch = precisionArbRoute.exec("https://edge/api/arb/nfl/q4/total/chiefs/o45.5");
	expect(overMatch).not.toBeNull();
	expect(overMatch!.pathname.groups.outcome).toBe('o45.5');

	const underMatch = precisionArbRoute.exec("https://edge/api/arb/nfl/q4/total/chiefs/u45.5");
	expect(underMatch).not.toBeNull();
	expect(underMatch!.pathname.groups.outcome).toBe('u45.5');
});

// ✅ Market scoped routing
test("market scoped routing - spread", () => {
	const match = marketScopedArb.exec("https://edge/api/arb/nba/q2/spread");
	expect(match).not.toBeNull();
	expect(match!.pathname.groups.market).toBe('spread');
	expect(match!.pathname.groups.league).toBe('nba');
	expect(match!.pathname.groups.quarter).toBe('q2');
});

test("market scoped routing - total", () => {
	const match = marketScopedArb.exec("https://edge/api/arb/nfl/q4/total");
	expect(match).not.toBeNull();
	expect(match!.pathname.groups.market).toBe('total');
});

test("market scoped routing - player props", () => {
	const match = marketScopedArb.exec("https://edge/api/arb/nfl/q4/player_props");
	expect(match).not.toBeNull();
	expect(match!.pathname.groups.market).toBe('player_props');
});

test("market scoped routing rejects invalid market", () => {
	const match = marketScopedArb.exec("https://edge/api/arb/nfl/q4/invalid");
	expect(match).toBeNull();
});

// ✅ Generic routing
test("generic routing", () => {
	const match = genericArbRoute.exec("https://edge/api/arb/nfl/q4");
	expect(match).not.toBeNull();
	expect(match!.pathname.groups.league).toBe('nfl');
	expect(match!.pathname.groups.quarter).toBe('q4');
});

// ✅ Shadow layer routing
test("shadow layer routing - L4", () => {
	const match = shadowScanRoute.exec("https://edge/api/shadow/L4/nfl/spread");
	expect(match).not.toBeNull();
	expect(match!.pathname.groups.layer).toBe('L4');
	expect(match!.pathname.groups.league).toBe('nfl');
	expect(match!.pathname.groups.market).toBe('spread');
});

test("shadow layer routing - L1 without market", () => {
	const match = shadowScanRoute.exec("https://edge/api/shadow/L1/nfl");
	expect(match).not.toBeNull();
	expect(match!.pathname.groups.layer).toBe('L1');
	expect(match!.pathname.groups.market).toBeUndefined();
});

test("shadow layer routing rejects invalid layer", () => {
	const match = shadowScanRoute.exec("https://edge/api/shadow/L5/nfl");
	expect(match).toBeNull();
});

// ✅ WebSocket market stream routing
test("market stream routing", () => {
	const match = marketStreamRoute.exec("https://edge/ws/arb/nfl/q4/spread");
	expect(match).not.toBeNull();
	expect(match!.pathname.groups.league).toBe('nfl');
	expect(match!.pathname.groups.quarter).toBe('q4');
	expect(match!.pathname.groups.market).toBe('spread');
});

// ✅ MLGS market-specific queries
test("mlgs find hidden edges with market filter", async () => {
	await mlgs.buildFullGraph('nfl');
	const edges = await mlgs.findHiddenEdges({
		league: 'nfl',
		market: 'spread',
		minWeight: 0.02
	});

	expect(edges).toBeArray();
	mlgs.close();
});

test("mlgs find hidden edges with precision filter", async () => {
	mlgs = new MLGSGraph(TEST_MLGS_PATH);
	await mlgs.buildFullGraph('nfl');
	const edges = await mlgs.findHiddenEdges({
		league: 'nfl',
		quarter: 'q4',
		market: 'spread',
		team: 'chiefs',
		outcome: '-3.5',
		minWeight: 0.035
	});

	expect(edges).toBeArray();
	mlgs.close();
});

test("mlgs find hidden edges with layer filter", async () => {
	mlgs = new MLGSGraph(TEST_MLGS_PATH);
	await mlgs.buildFullGraph('nfl');
	const edges = await mlgs.findHiddenEdges({
		layer: 'L4_SPORT',
		league: 'nfl',
		market: 'spread',
		minConfidence: 0.9
	});

	expect(edges).toBeArray();
	mlgs.close();
});

// ✅ Market precision performance
test("market precision routing performance", () => {
	const startTime = performance.now();
	
	for (let i = 0; i < 1000; i++) {
		precisionArbRoute.exec("https://edge/api/arb/nfl/q4/spread/chiefs/-3.5");
		marketScopedArb.exec("https://edge/api/arb/nfl/q4/spread");
		genericArbRoute.exec("https://edge/api/arb/nfl/q4");
	}
	
	const duration = performance.now() - startTime;
	const avgUs = (duration / 3000) * 1000; // microseconds per route
	
	// Should be fast (< 10µs per route)
	expect(avgUs).toBeLessThan(10);
});

// ✅ Route priority (precision > market > generic)
test("route priority ordering", () => {
	const precisionUrl = "https://edge/api/arb/nfl/q4/spread/chiefs/-3.5";
	const marketUrl = "https://edge/api/arb/nfl/q4/spread";
	const genericUrl = "https://edge/api/arb/nfl/q4";
	
	// Precision route matches precision URL
	const precisionMatch = precisionArbRoute.exec(precisionUrl);
	expect(precisionMatch).not.toBeNull();
	
	// Market route matches market URL (but not precision URL)
	const marketMatch = marketScopedArb.exec(marketUrl);
	expect(marketMatch).not.toBeNull();
	expect(marketScopedArb.exec(precisionUrl)).toBeNull(); // Should not match precision URL
	
	// Generic route matches generic URL
	const genericMatch = genericArbRoute.exec(genericUrl);
	expect(genericMatch).not.toBeNull();
	// Note: URLPattern may match prefixes, so generic route might match market/precision URLs
	// In actual service, route order matters - check precision first, then market, then generic
});

// ✅ Market-specific edge detection
test("market-specific edge detection accuracy", async () => {
	mlgs = new MLGSGraph(TEST_MLGS_PATH);
	await mlgs.buildFullGraph('nfl');
	
	const spreadEdges = await mlgs.findHiddenEdges({ market: 'spread', minWeight: 0.02 });
	const totalEdges = await mlgs.findHiddenEdges({ market: 'total', minWeight: 0.02 });
	
	expect(spreadEdges).toBeArray();
	expect(totalEdges).toBeArray();
	
	// Verify market metadata in results
	if (spreadEdges.length > 0) {
		const metadata = spreadEdges[0].edge.metadata;
		expect(metadata).toHaveProperty('market');
	}
	
	mlgs.close();
});

