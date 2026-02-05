#!/usr/bin/env bun
/**
 * @fileoverview URLPattern Router Demo
 * @description Comprehensive examples demonstrating URLPattern router usage
 * @version 17.16.0.0.0.0.0-routing
 * 
 * This demo showcases:
 * - Basic route registration
 * - Parameter extraction
 * - Middleware usage
 * - Error handling
 * - Performance metrics
 * - Security features
 * 
 * Run: bun run examples/urlpattern-router-demo.ts
 */

import { URLPatternRouter } from '../src/api/routers/urlpattern-router';

async function main() {
	console.log('🚀 URLPattern Router Demo\n');

	// Create router instance
	const router = new URLPatternRouter({
		enableCaching: true,
		enableSecurity: true,
	});

	// ============================================
	// Example 1: Basic Route Registration
	// ============================================
	console.log('📝 Example 1: Basic Route Registration');
	
	router.get('/api/users', () => {
		return Response.json({ users: ['alice', 'bob', 'charlie'] });
	});

	router.get('/api/users/:id', (req, ctx, groups) => {
		return Response.json({ userId: groups.id, message: `User ${groups.id} found` });
	});

	router.post('/api/users', async (req) => {
		const body = await req.json();
		return Response.json({ created: true, user: body }, { status: 201 });
	});

	console.log('✅ Registered 3 routes\n');

	// ============================================
	// Example 2: Parameter Extraction
	// ============================================
	console.log('📝 Example 2: Parameter Extraction');
	
	router.get('/api/users/:userId/posts/:postId', (req, ctx, groups) => {
		return Response.json({
			userId: groups.userId,
			postId: groups.postId,
			message: `Post ${groups.postId} by user ${groups.userId}`,
		});
	});

	router.get('/api/files/:path+', (req, ctx, groups) => {
		const segments = groups.path.split('/');
		return Response.json({
			path: groups.path,
			segments,
			count: segments.length,
		});
	});

	console.log('✅ Registered parameter extraction routes\n');

	// ============================================
	// Example 3: Middleware
	// ============================================
	console.log('📝 Example 3: Middleware');
	
	// Global middleware
	router.use(async (req) => {
		console.log(`  📊 ${req.method} ${req.url}`);
	});

	// Route-specific middleware
	const authMiddleware = async (req: Request) => {
		const auth = req.headers.get('authorization');
		if (!auth) {
			return new Response('Unauthorized', { status: 401 });
		}
	};

	router.get('/api/admin/:action', (req, ctx, groups) => {
		return Response.json({ action: groups.action, status: 'authorized' });
	}, {
		middleware: [authMiddleware],
		name: 'admin-action',
	});

	console.log('✅ Registered middleware routes\n');

	// ============================================
	// Example 4: Error Handling
	// ============================================
	console.log('📝 Example 4: Error Handling');
	
	router.get('/api/data/:id', async (req, ctx, groups) => {
		const id = parseInt(groups.id);
		if (isNaN(id) || id <= 0) {
			return new Response('Invalid ID', { status: 400 });
		}
		
		try {
			// Simulate data fetch
			const data = { id, name: `Item ${id}` };
			return Response.json(data);
		} catch (error) {
			console.error('Data fetch failed:', error);
			return new Response('Internal Error', { status: 500 });
		}
	});

	console.log('✅ Registered error handling routes\n');

	// ============================================
	// Example 5: Testing Routes
	// ============================================
	console.log('📝 Example 5: Testing Routes');
	
	const testCases = [
		{ method: 'GET', url: 'http://localhost/api/users', expected: 200 },
		{ method: 'GET', url: 'http://localhost/api/users/123', expected: 200 },
		{ method: 'GET', url: 'http://localhost/api/users/123/posts/456', expected: 200 },
		{ method: 'GET', url: 'http://localhost/api/files/docs/readme.txt', expected: 200 },
		{ method: 'GET', url: 'http://localhost/api/data/42', expected: 200 },
		{ method: 'GET', url: 'http://localhost/api/data/invalid', expected: 400 },
		{ method: 'GET', url: 'http://localhost/api/not-found', expected: 404 },
	];

	for (const testCase of testCases) {
		const request = new Request(testCase.url, { method: testCase.method });
		const response = await router.handle(request);
		const status = response.status === testCase.expected ? '✅' : '❌';
		console.log(`  ${status} ${testCase.method} ${testCase.url} → ${response.status} (expected ${testCase.expected})`);
	}

	console.log();

	// ============================================
	// Example 6: Performance Metrics
	// ============================================
	console.log('📝 Example 6: Performance Metrics');
	
	const metrics = router.getMetrics();
	console.log('  📊 Router Metrics:');
	console.log(`     Total Routes: ${metrics.totalRoutes}`);
	console.log(`     Total Requests: ${metrics.totalRequests}`);
	console.log(`     Average Response Time: ${metrics.averageResponseTime.toFixed(2)}ms`);
	console.log(`     Cache Hit Rate: ${metrics.cacheHitRate.toFixed(1)}%`);
	console.log(`     Error Rate: ${metrics.errorRate.toFixed(2)}%`);
	console.log(`     Throughput: ${metrics.throughput.toFixed(0)} req/sec`);
	console.log();

	// ============================================
	// Example 7: Route Inspection
	// ============================================
	console.log('📝 Example 7: Route Inspection');
	
	const routes = router.getRoutes();
	console.log(`  📋 Registered Routes (${routes.length}):`);
	routes.forEach((route) => {
		console.log(`     ${route.method} ${route.metadata.path}${route.metadata.name ? ` (${route.metadata.name})` : ''}`);
	});
	console.log();

	// ============================================
	// Example 8: REST API Pattern
	// ============================================
	console.log('📝 Example 8: REST API Pattern');
	
	const restRouter = new URLPatternRouter();
	
	// Resource routes
	restRouter.get('/api/products', () => Response.json({ products: [] }));
	restRouter.get('/api/products/:id', (req, ctx, groups) => 
		Response.json({ id: groups.id, name: `Product ${groups.id}` })
	);
	restRouter.post('/api/products', () => Response.json({ created: true }, { status: 201 }));
	restRouter.put('/api/products/:id', (req, ctx, groups) => 
		Response.json({ id: groups.id, updated: true })
	);
	restRouter.delete('/api/products/:id', (req, ctx, groups) => 
		Response.json({ id: groups.id, deleted: true })
	);

	console.log('✅ Registered REST API routes');
	console.log(`   Routes: ${restRouter.getRoutes().length}`);
	console.log();

	console.log('✅ Demo complete!');
	console.log('\n📚 See docs/operators/url-pattern-quickref.md for more examples');
}

main().catch(console.error);
