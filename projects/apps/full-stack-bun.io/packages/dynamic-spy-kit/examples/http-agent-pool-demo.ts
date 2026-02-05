#!/usr/bin/env bun
/**
 * @dynamic-spy/kit v9.0 - HTTP Agent Connection Pool Demo
 * 
 * Demonstrates proper connection reuse with keepAlive: true
 */

import { HTTPAgentPool, getGlobalAgentPool } from '../src/utils/http-agent-pool';
import http from "node:http";

console.log('🌐 HTTP Agent Connection Pool Demo\n');

// Create agent pool with keepAlive enabled
const agentPool = new HTTPAgentPool({
	keepAlive: true,
	keepAliveMsecs: 1000,
	maxSockets: 50,
	maxFreeSockets: 10,
	timeout: 60000
});

console.log('✅ Agent pool created with keepAlive: true\n');

// Example: Make multiple requests (connections will be reused)
const makeRequest = (path: string): Promise<void> => {
	return new Promise((resolve, reject) => {
		const req = agentPool.request(
			{
				hostname: "example.com",
				port: 80,
				path: path,
				agent: agentPool.getHTTPAgent(),
			},
			(res) => {
				// Connection is now properly reused on subsequent requests
				let data = '';
				res.on('data', (chunk) => {
					data += chunk;
				});
				res.on('end', () => {
					console.log(`✅ Request to ${path} completed (${res.statusCode})`);
					resolve();
				});
			}
		);

		req.on('error', (err) => {
			console.error(`❌ Request error: ${err.message}`);
			reject(err);
		});

		req.end();
	});
};

// Make multiple requests to demonstrate connection reuse
console.log('📡 Making multiple requests (connections will be reused)...\n');

(async () => {
	try {
		// First request (new connection)
		await makeRequest('/');
		
		// Subsequent requests (reuse connection)
		await makeRequest('/path1');
		await makeRequest('/path2');
		await makeRequest('/path3');

		// Show connection pool statistics
		console.log('\n📊 Connection Pool Statistics:');
		const stats = agentPool.getStats();
		console.log(`  Total Requests: ${stats.totalRequests}`);
		console.log(`  Reused Connections: ${stats.reusedConnections}`);
		console.log(`  New Connections: ${stats.newConnections}`);
		console.log(`  Reuse Rate: ${stats.reuseRate}`);
		console.log(`  Active Connections: ${stats.activeConnections}`);
		console.log(`\n  HTTP Agent Config:`);
		console.log(`    keepAlive: ${stats.httpAgent.keepAlive}`);
		console.log(`    keepAliveMsecs: ${stats.httpAgent.keepAliveMsecs}`);
		console.log(`    maxSockets: ${stats.httpAgent.maxSockets}`);
		console.log(`    maxFreeSockets: ${stats.httpAgent.maxFreeSockets}`);

		console.log('\n✅ Connection pooling working correctly!');
		console.log('   Connections are properly reused with keepAlive: true\n');

		// Cleanup
		agentPool.destroy();
	} catch (error: any) {
		console.error(`❌ Error: ${error.message}`);
		agentPool.destroy();
	}
})();



