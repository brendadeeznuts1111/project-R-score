import { test, expect, jest, afterEach } from "bun:test";
import { createDynamicSpy, createCacheSpyManager, createArbSpyManager } from "../src/utils/spyFactory";

// Mock reset utility
afterEach(() => {
	jest.restoreAllMocks();
});

test("Database record mutations with dynamic IDs", () => {
	// Simulate database records with getter/setter methods
	const userDatabase: Record<string, any> = {
		"1001": { id: 1001, name: "Alice" },
		"1002": { id: 1002, name: "Bob" },
		"1003": { id: 1003, name: "Charlie" }
	};

	// Create a wrapper object with methods for spying
	const dbWrapper = {
		setUser: (userId: string, data: any) => {
			userDatabase[userId] = data;
		},
		getUser: (userId: string) => {
			return userDatabase[userId];
		}
	};

	// Dynamic spy creation based on user ID
	const createUserSpy = (userId: number) => {
		return jest.spyOn(dbWrapper, 'setUser');
	};

	// Create spies for specific users
	const aliceSpy = createUserSpy(1001);
	const bobSpy = createUserSpy(1002);

	// Update users using wrapper methods
	dbWrapper.setUser("1001", { id: 1001, name: "Alice Updated", role: "admin" });
	dbWrapper.setUser("1002", { id: 1002, name: "Bob Updated", role: "user" });

	expect(aliceSpy).toHaveBeenCalledWith(
		"1001",
		expect.objectContaining({
			id: 1001,
			name: "Alice Updated",
			role: "admin"
		})
	);

	expect(bobSpy).toHaveBeenCalledWith(
		"1002",
		expect.objectContaining({
			id: 1002,
			name: "Bob Updated",
			role: "user"
		})
	);

	// Verify database state
	expect(userDatabase["1001"]).toMatchObject({
		id: 1001,
		name: "Alice Updated",
		role: "admin"
	});

	expect(userDatabase["1002"]).toMatchObject({
		id: 1002,
		name: "Bob Updated",
		role: "user"
	});
});

test("Cache system with dynamic keys", () => {
	class Cache {
		private store: Map<string, any>;

		constructor() {
			this.store = new Map();
		}

		set(key: string, value: any) {
			this.store.set(key, value);
			return this;
		}

		get(key: string) {
			return this.store.get(key);
		}
	}

	const cache = new Cache();

	// Generate dynamic cache keys
	const getCacheKey = (userId: number, resource: string) => `${userId}:${resource}`;

	// Spy on cache.set method
	const setSpy = jest.spyOn(cache, 'set');

	// Simulate cache updates
	const userProfileKey = getCacheKey(123, "profile");
	const userOrdersKey = getCacheKey(123, "orders");

	cache.set(userProfileKey, { name: "John", email: "john@example.com" });
	cache.set(userOrdersKey, [{ id: 1, total: 99.99 }]);

	expect(setSpy).toHaveBeenCalledWith(
		userProfileKey,
		expect.objectContaining({ name: "John", email: "john@example.com" })
	);

	expect(setSpy).toHaveBeenCalledWith(
		userOrdersKey,
		expect.arrayContaining([
			expect.objectContaining({ id: 1, total: 99.99 })
		])
	);

	// Verify cache contents
	expect(cache.get(userProfileKey)).toMatchObject({
		name: "John",
		email: "john@example.com"
	});

	expect(cache.get(userOrdersKey)).toEqual(
		expect.arrayContaining([
			expect.objectContaining({ id: 1, total: 99.99 })
		])
	);
});

test("API response normalization", () => {
	// Simulate API response normalization with update method
	const normalized: Record<string, any> = {};
	
	const apiNormalizer = {
		updateEntity: (key: string, updates: any) => {
			if (normalized[key]) {
				normalized[key] = { ...normalized[key], ...updates };
			} else {
				normalized[key] = updates;
			}
		}
	};

	const apiResponse = [
		{ id: 1, type: "user", name: "Alice" },
		{ id: 2, type: "post", title: "Hello World" },
		{ id: 1, type: "comment", text: "Great post!" }
	];

	// Normalize response
	apiResponse.forEach(item => {
		const key = `entity_${item.type}_${item.id}`;
		normalized[key] = item;
	});

	// Spy on updateEntity method
	const updateSpy = jest.spyOn(apiNormalizer, 'updateEntity');

	// Update entities
	apiNormalizer.updateEntity("entity_user_1", { verified: true });
	apiNormalizer.updateEntity("entity_post_2", { published: true });

	expect(updateSpy).toHaveBeenCalledWith(
		"entity_user_1",
		expect.objectContaining({ verified: true })
	);

	expect(updateSpy).toHaveBeenCalledWith(
		"entity_post_2",
		expect.objectContaining({ published: true })
	);

	// Verify normalized data
	expect(normalized["entity_user_1"]).toMatchObject({
		id: 1,
		type: "user",
		name: "Alice",
		verified: true
	});

	expect(normalized["entity_post_2"]).toMatchObject({
		id: 2,
		type: "post",
		title: "Hello World",
		published: true
	});
});

test("Arbitrage opportunity tracking with dynamic spies", () => {
	// Simulate arbitrage opportunities database with update method
	const arbDatabase: Record<string, any> = {
		"nfl-q4-spread": { league: "nfl", market: "spread", profit_pct: 0.042 },
		"nba-q2-total": { league: "nba", market: "total", profit_pct: 0.058 }
	};

	const arbManager = {
		updateArb: (key: string, updates: any) => {
			if (arbDatabase[key]) {
				arbDatabase[key] = { ...arbDatabase[key], ...updates };
			} else {
				arbDatabase[key] = updates;
			}
		}
	};

	// Spy on update method
	const updateSpy = jest.spyOn(arbManager, 'updateArb');

	// Update arbitrage opportunities
	arbManager.updateArb("nfl-q4-spread", {
		value_usd: 50000,
		execute: true
	});

	arbManager.updateArb("nba-q2-total", {
		value_usd: 75000,
		execute: true
	});

	expect(updateSpy).toHaveBeenCalledWith(
		"nfl-q4-spread",
		expect.objectContaining({
			execute: true,
			value_usd: 50000
		})
	);

	expect(updateSpy).toHaveBeenCalledWith(
		"nba-q2-total",
		expect.objectContaining({
			execute: true,
			value_usd: 75000
		})
	);

	// Verify database state
	expect(arbDatabase["nfl-q4-spread"]).toMatchObject({
		league: "nfl",
		profit_pct: 0.042,
		execute: true,
		value_usd: 50000
	});
});

test("MLGS graph node updates with dynamic layer spies", () => {
	// Simulate MLGS graph layers with addNode method
	const mlgsLayers: Record<string, any> = {
		"L1_DIRECT": { layer: "L1", nodes: [] },
		"L2_MARKET": { layer: "L2", nodes: [] },
		"L3_CROSS": { layer: "L3", nodes: [] }
	};

	const mlgsManager = {
		addNode: (layerId: string, node: any) => {
			if (mlgsLayers[layerId]) {
				mlgsLayers[layerId].nodes.push(node);
			}
		}
	};

	// Spy on addNode method
	const addNodeSpy = jest.spyOn(mlgsManager, 'addNode');

	// Add nodes to layers
	mlgsManager.addNode("L1_DIRECT", { id: "pinnacle-nfl", odds: -105 });
	mlgsManager.addNode("L1_DIRECT", { id: "draftkings-nfl", odds: -110 });
	mlgsManager.addNode("L2_MARKET", { id: "betfair-nfl", odds: -108 });

	expect(addNodeSpy).toHaveBeenCalledWith(
		"L1_DIRECT",
		expect.objectContaining({ id: "pinnacle-nfl", odds: -105 })
	);

	expect(addNodeSpy).toHaveBeenCalledWith(
		"L2_MARKET",
		expect.objectContaining({ id: "betfair-nfl", odds: -108 })
	);

	// Verify layer state
	expect(mlgsLayers["L1_DIRECT"].nodes).toHaveLength(2);
	expect(mlgsLayers["L1_DIRECT"].nodes[0]).toMatchObject({
		id: "pinnacle-nfl",
		odds: -105
	});
});

test("Bookie odds updates with dynamic bookie spies", () => {
	// Simulate bookie odds storage with update method
	const bookieOdds: Record<string, any> = {
		"pinnacle": { bookie: "pinnacle", odds: -105 },
		"draftkings": { bookie: "draftkings", odds: -110 }
	};

	const oddsManager = {
		updateOdds: (bookieName: string, updates: any) => {
			if (bookieOdds[bookieName]) {
				bookieOdds[bookieName] = { ...bookieOdds[bookieName], ...updates };
			}
		}
	};

	// Spy on updateOdds method
	const updateSpy = jest.spyOn(oddsManager, 'updateOdds');

	// Update bookie odds
	const pinnacleUpdate = {
		updated_at: Date.now(),
		market: "nfl-q4"
	};
	const draftkingsUpdate = {
		updated_at: Date.now(),
		market: "nfl-q4"
	};

	oddsManager.updateOdds("pinnacle", pinnacleUpdate);
	oddsManager.updateOdds("draftkings", draftkingsUpdate);

	// Enhanced assertions with nth call verification
	expect(updateSpy).toHaveBeenNthCalledWith(1, "pinnacle", expect.objectContaining({
		market: "nfl-q4"
	}));

	expect(updateSpy).toHaveBeenNthCalledWith(2, "draftkings", expect.objectContaining({
		market: "nfl-q4"
	}));

	// Verify call count
	expect(updateSpy).toHaveBeenCalledTimes(2);

	// Verify odds state
	expect(bookieOdds["pinnacle"]).toMatchObject({
		bookie: "pinnacle",
		odds: -105,
		market: "nfl-q4"
	});
});

test("Generic spy factory for cache operations", () => {
	class Cache {
		private store: Map<string, any> = new Map();

		set(key: string, value: any) {
			this.store.set(key, value);
			return this;
		}

		get(key: string) {
			return this.store.get(key);
		}
	}

	const cache = new Cache();
	const spyManager = createCacheSpyManager(cache);

	// Create spies for specific keys
	const user123Spy = spyManager.spyOnKey("user:123");
	const arb456Spy = spyManager.spyOnKey("arb:456");

	// Perform operations
	cache.set("user:123", { balance: 1000 });
	cache.set("arb:456", { profit: 150 });

	// Verify calls using factory methods
	const user123SpyFromFactory = spyManager.getSpy("user:123");
	const arb456SpyFromFactory = spyManager.getSpy("arb:456");
	
	expect(user123SpyFromFactory).toHaveBeenCalledWith("user:123", { balance: 1000 });
	expect(arb456SpyFromFactory).toHaveBeenCalledWith("arb:456", { profit: 150 });

	// Verify direct spy access
	expect(user123Spy).toHaveBeenCalledWith("user:123", { balance: 1000 });
	expect(arb456Spy).toHaveBeenCalledWith("arb:456", { profit: 150 });
});

test("Generic spy factory for arbitrage tracking", () => {
	const arbManager = {
		updateArb: (key: string, updates: any) => {
			// Simulate update logic
		}
	};

	const spyManager = createArbSpyManager(arbManager);

	// Create spies for multiple arbitrage opportunities
	const nflSpy = spyManager.spyOnKey("nfl-q4-spread");
	const nbaSpy = spyManager.spyOnKey("nba-q2-total");

	// Update arbs
	arbManager.updateArb("nfl-q4-spread", { profit_pct: 0.042, execute: true });
	arbManager.updateArb("nba-q2-total", { profit_pct: 0.058, execute: true });

	// Verify using factory
	const nflSpyFromFactory = spyManager.getSpy("nfl-q4-spread");
	const nbaSpyFromFactory = spyManager.getSpy("nba-q2-total");
	
	expect(nflSpyFromFactory).toHaveBeenCalledWith("nfl-q4-spread", expect.objectContaining({ profit_pct: 0.042 }));
	expect(nbaSpyFromFactory).toHaveBeenCalledWith("nba-q2-total", expect.objectContaining({ profit_pct: 0.058 }));

	// Verify all spies were created
	expect(spyManager.getAllSpies()).toHaveLength(2);
});

test("scales to 1000+ dynamic keys", () => {
	class Cache {
		private store: Map<string, any> = new Map();

		set(key: string, value: any) {
			this.store.set(key, value);
			return this;
		}

		get(key: string) {
			return this.store.get(key);
		}
	}

	const cache = new Cache();
	const setSpy = jest.spyOn(cache, 'set');

	// Generate 1000+ keys
	const keys = Array.from({ length: 1000 }, (_, i) => `user:${i}`);
	const startTime = Bun.nanoseconds();

	// Perform operations
	keys.forEach((key, index) => {
		cache.set(key, { data: `test-${index}`, timestamp: Date.now() });
	});

	const endTime = Bun.nanoseconds();
	const durationMs = (endTime - startTime) / 1_000_000;

	// Verify all calls were made
	expect(setSpy).toHaveBeenCalledTimes(1000);

	// Verify specific calls
	expect(setSpy).toHaveBeenNthCalledWith(1, "user:0", expect.objectContaining({ data: "test-0" }));
	expect(setSpy).toHaveBeenNthCalledWith(500, "user:499", expect.objectContaining({ data: "test-499" }));
	expect(setSpy).toHaveBeenNthCalledWith(1000, "user:999", expect.objectContaining({ data: "test-999" }));

	// Verify cache state
	expect(cache.get("user:0")).toMatchObject({ data: "test-0" });
	expect(cache.get("user:999")).toMatchObject({ data: "test-999" });

	// Performance assertion (should complete in reasonable time)
	expect(durationMs).toBeLessThan(100); // Should complete in < 100ms

	console.log(`✅ 1000+ dynamic keys processed in ${durationMs.toFixed(2)}ms`);
});

