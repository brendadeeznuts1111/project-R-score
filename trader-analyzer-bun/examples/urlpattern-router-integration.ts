#!/usr/bin/env bun
/**
 * @fileoverview URLPattern Router Integration Example
 * @description Shows how to integrate URLPattern router with existing Bun.serve application
 * @version 17.16.0.0.0.0.0-routing
 * 
 * This example demonstrates:
 * - Integrating URLPattern router with Bun.serve
 * - Parallel router usage (URLPattern + existing router)
 * - Gradual migration strategy
 * - Error handling and fallback
 * 
 * Run: bun run examples/urlpattern-router-integration.ts
 * Then test: curl http://localhost:3001/api/v2/users/123
 */

import { URLPatternRouter } from '../src/api/routers/urlpattern-router';

// Simulate existing router (e.g., Hono)
class LegacyRouter {
	async handle(request: Request): Promise<Response | null> {
		const url = new URL(request.url);
		
		// Legacy routes
		if (url.pathname === '/api/v1/users' && request.method === 'GET') {
			return Response.json({ version: 'v1', users: ['legacy-user'] });
		}
		
		return null; // Not handled
	}
}

async function main() {
	console.log('🚀 URLPattern Router Integration Demo\n');

	// Create both routers
	const legacyRouter = new LegacyRouter();
	const urlPatternRouter = new URLPatternRouter({
		enableCaching: true,
		enableSecurity: true,
	});

	// Register new routes on URLPattern router
	console.log('📝 Registering URLPattern routes...');
	
	urlPatternRouter.get('/api/v2/users', () => {
		return Response.json({ version: 'v2', users: ['alice', 'bob'] });
	});

	urlPatternRouter.get('/api/v2/users/:id', (req, ctx, groups) => {
		return Response.json({ 
			version: 'v2', 
			userId: groups.id,
			message: `User ${groups.id} from URLPattern router`
		});
	});

	urlPatternRouter.get('/api/v2/posts/:postId', (req, ctx, groups) => {
		return Response.json({ 
			version: 'v2', 
			postId: groups.postId,
			message: `Post ${groups.postId} from URLPattern router`
		});
	});

	console.log(`✅ Registered ${urlPatternRouter.getRoutes().length} URLPattern routes\n`);

	// Unified request handler
	async function handleRequest(request: Request): Promise<Response> {
		const url = new URL(request.url);
		
		// Try URLPattern router first (for new routes)
		try {
			const response = await urlPatternRouter.handle(request);
			if (response.status !== 404) {
				return response;
			}
		} catch (error) {
			console.error('URLPattern router error:', error);
		}

		// Fallback to legacy router
		const legacyResponse = await legacyRouter.handle(request);
		if (legacyResponse) {
			return legacyResponse;
		}

		// 404 for unmatched routes
		return new Response('Not Found', { status: 404 });
	}

	// Start server
	const port = 3001;
	const server = Bun.serve({
		port,
		async fetch(request) {
			return handleRequest(request);
		},
	});

	console.log(`✅ Server running on http://localhost:${port}`);
	console.log('\n📝 Test endpoints:');
	console.log(`   GET http://localhost:${port}/api/v1/users      (legacy router)`);
	console.log(`   GET http://localhost:${port}/api/v2/users      (URLPattern router)`);
	console.log(`   GET http://localhost:${port}/api/v2/users/123  (URLPattern router)`);
	console.log(`   GET http://localhost:${port}/api/v2/posts/456 (URLPattern router)`);
	console.log('\n💡 Press Ctrl+C to stop\n');

	// Graceful shutdown
	process.on('SIGINT', () => {
		console.log('\n🛑 Shutting down...');
		server.stop();
		process.exit(0);
	});
}

main().catch(console.error);
