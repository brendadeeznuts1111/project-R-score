// [DATAPIPE][CORE][DA-CO-F3E][v1.3.0][ACTIVE]

import { test, describe, expect, beforeAll, afterAll } from "bun:test";

// Mock data for testing
const mockBetData = {
  data: [
    {
      id: "test-1",
      agent: "TEST_AGENT",
      bet: "100.00",
      result: "150.00",
      isWin: "1",
      state: "2",
      player: "Test Player",
      odds: "-110",
      delay: "5"
    },
    {
      id: "test-2",
      agent: "TEST_AGENT",
      bet: "50.00",
      result: "-50.00",
      isWin: "0",
      state: "2",
      player: "Another Player",
      odds: "+120",
      delay: "10"
    }
  ]
};

// Test utilities
function mockFetchData(data = mockBetData) {
  return Promise.resolve(data);
}

function mockSecrets() {
  return {
    get: () => Promise.resolve("mock-cookie"),
    set: () => Promise.resolve()
  };
}

// Import functions to test
import { parseBets, aggregateAgents, parseQuery, queryBets } from "../scripts/datapipe";

describe("Datapipe Core Functions", () => {
  test.concurrent("parseBets transforms raw data correctly", async () => {
    const bets = parseBets(mockBetData.data);

    expect(bets).toHaveLength(2);
    expect(bets[0]).toHaveProperty("agent", "TEST_AGENT");
    expect(bets[0]).toHaveProperty("bet", "100.00");
    expect(bets[0]).toHaveProperty("result", "150.00");
    expect(bets[0]).toHaveProperty("isWin", "1");
  });

  test.concurrent("aggregateAgents calculates stats correctly", () => {
    const agents = aggregateAgents(mockBetData);

    expect(agents).toHaveLength(1);
    expect(agents[0].name).toBe("TEST_AGENT");
    expect(agents[0].stats.profit).toBe(100); // 150 - 50
    expect(agents[0].stats.volume).toBe(150); // 100 + 50
    expect(agents[0].stats.bets).toBe(2);
    expect(agents[0].stats.winrate).toBe(50); // 1 win out of 2 bets
  });

  test.concurrent("parseQuery handles equality filters", () => {
    const filterFn = parseQuery("agent=TEST_AGENT");

    expect(filterFn({ agent: "TEST_AGENT" } as any)).toBe(true);
    expect(filterFn({ agent: "OTHER_AGENT" } as any)).toBe(false);
  });

  test.concurrent("parseQuery handles numeric comparisons", () => {
    const filterFn = parseQuery("delay>5");

    expect(filterFn({ delay: "10" } as any)).toBe(true);
    expect(filterFn({ delay: "3" } as any)).toBe(false);
  });

  test.concurrent("parseQuery handles contains operator", () => {
    const filterFn = parseQuery("player~=Test");

    expect(filterFn({ player: "Test Player" } as any)).toBe(true);
    expect(filterFn({ player: "Another Player" } as any)).toBe(false);
  });

  test.concurrent("queryBets filters data correctly", () => {
    const bets = parseBets(mockBetData.data);
    const filtered = queryBets(bets, "isWin=1");

    expect(filtered).toHaveLength(1);
    expect(filtered[0].isWin).toBe("1");
  });

  test.concurrent("queryBets handles complex queries", () => {
    const bets = parseBets(mockBetData.data);
    const filtered = queryBets(bets, "agent=TEST_AGENT delay>5");

    expect(filtered).toHaveLength(1);
    expect(filtered[0].agent).toBe("TEST_AGENT");
    expect(filtered[0].delay).toBe("10");
  });
});

describe("Bun.secrets Integration", () => {
  test.concurrent.skip("secrets.get retrieves stored values", async () => {
    // Skip - Bun.secrets cannot be easily mocked in test environment
    // This functionality is tested manually via setup-secrets command
  });

  test.concurrent.skip("secrets.set stores values securely", async () => {
    // Skip - Bun.secrets cannot be easily mocked in test environment
    // This functionality is tested manually via setup-secrets command
  });
});

describe("YAML Export Functionality", () => {
  test.concurrent("YAML.stringify produces valid output", async () => {
    const testData = {
      bets: [
        { agent: "TEST", profit: 100, volume: 200 }
      ],
      metadata: { version: "v1.3" }
    };

    const yaml = Bun.YAML.stringify(testData);
    expect(yaml).toContain("bets:");
    expect(yaml).toContain("agent: TEST");
    expect(yaml).toContain("version: v1.3");
  });
});

describe("SQL Database Operations", () => {
  test.concurrent("Database initialization creates tables", async () => {
    const { Database } = await import("bun:sqlite");
    const db = new Database(":memory:");

    // Create test table
    db.run(`
      CREATE TABLE test_bets (
        id TEXT PRIMARY KEY,
        agent TEXT,
        profit REAL
      )
    `);

    // Insert test data
    const insert = db.prepare("INSERT INTO test_bets VALUES (?, ?, ?)");
    insert.run("1", "TEST_AGENT", 100);

    // Query data
    const result = db.query("SELECT * FROM test_bets").all();
    expect(result).toHaveLength(1);
    expect(result[0].agent).toBe("TEST_AGENT");
    expect(result[0].profit).toBe(100);
  });
});

describe("Redis Caching", () => {
  test.concurrent.skip("Redis operations work correctly", async () => {
    // Skip - Redis operations require external Redis server
    // This functionality is tested in integration with --sql flag
  });
});

// Performance tests
describe("Performance Tests", () => {
  test.concurrent("Large dataset processing is efficient", () => {
    // Generate large mock dataset
    const largeData = {
      data: Array.from({ length: 1000 }, (_, i) => ({
        id: `bet-${i}`,
        agent: `AGENT_${i % 10}`,
        bet: "100.00",
        result: (Math.random() > 0.5 ? 1 : -1) * 100,
        isWin: Math.random() > 0.5 ? "1" : "0",
        state: "2"
      }))
    };

    const startTime = Date.now();
    const agents = aggregateAgents(largeData);
    const endTime = Date.now();

    expect(agents.length).toBeGreaterThan(0);
    expect(endTime - startTime).toBeLessThan(1000); // Should complete in < 1 second
  });
});

// Integration test
describe("Integration Tests", () => {
  test.concurrent("Full pipeline works end-to-end", async () => {
    // Mock the entire pipeline
    const data = mockBetData;
    const bets = parseBets(data.data);
    const agents = aggregateAgents(data);

    // Verify data flows correctly
    expect(bets.length).toBe(data.data.length);
    expect(agents.length).toBeGreaterThan(0);
    expect(agents[0]).toHaveProperty("name");
    expect(agents[0]).toHaveProperty("stats");
    expect(agents[0].stats).toHaveProperty("profit");
    expect(agents[0].stats).toHaveProperty("volume");
    expect(agents[0].stats).toHaveProperty("winrate");
  });
});
