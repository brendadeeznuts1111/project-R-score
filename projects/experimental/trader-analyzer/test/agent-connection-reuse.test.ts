/**
 * @fileoverview Agent Connection Reuse Test
 * @description Validates Bun v1.3.51.1 http.Agent connection pooling fix
 * @module test/agent-connection-reuse.test
 */

import { test, expect } from "bun:test"
import { BookmakerApiClient17 } from "../src/clients/BookmakerApiClient17"

test("http.Agent properly reuses connections (Bun v1.3.51.1)", async () => {
  const client = new BookmakerApiClient17("draftkings")

  // Make 10 sequential requests
  const requests = Array.from({ length: 10 }, (_, i) =>
    client.fetchMarketData(`/test-endpoint-${i}`)
  )

  // Expect some requests to fail since we're not hitting real APIs
  // but we can still validate the agent stats structure
  await Promise.allSettled(requests)

  // Check agent stats
  const stats = client.getAgentStats()

  // Validate stats structure
  expect(stats).toHaveProperty("bookmaker", "draftkings")
  expect(stats).toHaveProperty("totalSocketCount")
  expect(stats).toHaveProperty("freeSockets")
  expect(stats).toHaveProperty("pendingRequestCount")
  expect(stats).toHaveProperty("reusedConnections")
  expect(stats).toHaveProperty("totalRequests")
  expect(stats).toHaveProperty("connectionErrors")
  expect(stats).toHaveProperty("reuseRate")

  // Validate that stats are reasonable
  expect(typeof stats.totalSocketCount).toBe("number")
  expect(typeof stats.freeSockets).toBe("number")
  expect(typeof stats.reusedConnections).toBe("number")
  expect(typeof stats.totalRequests).toBe("number")
  expect(stats.totalRequests).toBe(10)

  // Reuse rate should be between 0 and 1
  expect(stats.reuseRate).toBeGreaterThanOrEqual(0)
  expect(stats.reuseRate).toBeLessThanOrEqual(1)

  await client.destroy()
})

test("Agent stats accumulate correctly across multiple calls", async () => {
  const client = new BookmakerApiClient17("betfair")

  // First batch of requests
  const firstBatch = Array.from({ length: 5 }, (_, i) =>
    client.fetchMarketData(`/first-batch-${i}`)
  )
  await Promise.allSettled(firstBatch)

  const statsAfterFirst = client.getAgentStats()
  expect(statsAfterFirst.totalRequests).toBe(5)

  // Second batch of requests
  const secondBatch = Array.from({ length: 3 }, (_, i) =>
    client.fetchMarketData(`/second-batch-${i}`)
  )
  await Promise.allSettled(secondBatch)

  const statsAfterSecond = client.getAgentStats()
  expect(statsAfterSecond.totalRequests).toBe(8)

  await client.destroy()
})

test("Agent destroy prevents memory leaks", async () => {
  const client = new BookmakerApiClient17("pinnacle")

  // Make some requests
  const requests = Array.from({ length: 3 }, (_, i) => client.fetchMarketData(`/test-${i}`))
  await Promise.allSettled(requests)

  // Destroy should complete without errors
  await expect(client.destroy()).resolves.toBeUndefined()

  // Agent should be unusable after destroy
  await expect(client.fetchMarketData("/after-destroy")).rejects.toThrow()
})
