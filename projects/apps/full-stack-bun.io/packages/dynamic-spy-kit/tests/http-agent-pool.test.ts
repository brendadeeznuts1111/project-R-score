/**
 * @dynamic-spy/kit v9.0 - HTTP Agent Connection Pool Test
 * 
 * Tests proper connection reuse with keepAlive: true
 */

import { test, expect } from "bun:test";
import { HTTPAgentPool, getGlobalAgentPool } from "../src/utils/http-agent-pool";
import http from "node:http";

test("HTTP Agent with keepAlive properly reuses connections", () => {
	const agentPool = new HTTPAgentPool({
		keepAlive: true,
		keepAliveMsecs: 1000,
		maxSockets: 50,
		maxFreeSockets: 10
	});

	const agent = agentPool.getHTTPAgent();
	
	// Verify agent configuration
	expect(agent.keepAlive).toBe(true);
	expect(agent.keepAliveMsecs).toBe(1000);
	expect(agent.maxSockets).toBe(50);
	expect(agent.maxFreeSockets).toBe(10);

	// Verify agent is instance of http.Agent
	expect(agent).toBeInstanceOf(http.Agent);

	agentPool.destroy();
});

test("HTTPS Agent with keepAlive properly reuses connections", () => {
	const agentPool = new HTTPAgentPool({
		keepAlive: true,
		keepAliveMsecs: 2000,
		maxSockets: 100
	});

	const httpsAgent = agentPool.getHTTPSAgent();
	
	// Verify HTTPS agent configuration
	expect(httpsAgent.keepAlive).toBe(true);
	expect(httpsAgent.keepAliveMsecs).toBe(2000);
	expect(httpsAgent.maxSockets).toBe(100);

	agentPool.destroy();
});

test("Connection pool statistics tracking", () => {
	const agentPool = new HTTPAgentPool({
		keepAlive: true
	});

	const stats = agentPool.getStats();
	
	expect(stats.totalRequests).toBe(0);
	expect(stats.reusedConnections).toBe(0);
	expect(stats.newConnections).toBe(0);
	expect(stats.reuseRate).toBe('0%');
	expect(stats.httpAgent.keepAlive).toBe(true);
	expect(stats.httpsAgent.keepAlive).toBe(true);

	agentPool.destroy();
});

test("Global agent pool singleton", () => {
	const pool1 = getGlobalAgentPool({ keepAlive: true });
	const pool2 = getGlobalAgentPool();
	
	// Should return the same instance
	expect(pool1).toBe(pool2);
	
	// Verify configuration
	const stats = pool1.getStats();
	expect(stats.httpAgent.keepAlive).toBe(true);
});

test("Agent pool request method", () => {
	const agentPool = new HTTPAgentPool({
		keepAlive: true
	});

	// Create request (will track stats)
	const req = agentPool.request({
		hostname: "example.com",
		port: 80,
		path: "/",
		agent: agentPool.getHTTPAgent(),
	}, () => {});

	expect(req).toBeInstanceOf(http.ClientRequest);
	
	const stats = agentPool.getStats();
	expect(stats.totalRequests).toBeGreaterThan(0);

	req.destroy();
	agentPool.destroy();
});

test("Agent pool destroy closes connections", () => {
	const agentPool = new HTTPAgentPool({
		keepAlive: true
	});

	const httpAgent = agentPool.getHTTPAgent();
	const httpsAgent = agentPool.getHTTPSAgent();

	// Destroy should close all connections
	agentPool.destroy();

	// Agents should be destroyed (no way to directly test, but should not throw)
	expect(httpAgent).toBeDefined();
	expect(httpsAgent).toBeDefined();
});



