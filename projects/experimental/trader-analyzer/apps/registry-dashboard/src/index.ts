#!/usr/bin/env bun
/**
 * @fileoverview Registry Dashboard Server
 * @description Main entry point for registry dashboard application
 * @module apps/registry-dashboard/src/index
 */

import { submitRFC } from '@graph/telegram/rfc';
import { Elysia } from 'elysia';
import { readFile } from 'fs/promises';
import { join } from 'path';
import packageRoutes from './pages/package/[name].ts';
import packagesRoute from './pages/packages.ts';
import rfcDetailRoute from './pages/rfcs/[id].ts';
import rfcNewRoute from './pages/rfcs/new.ts';

const PORT = process.env.REGISTRY_DASHBOARD_PORT || 4000;

const app = new Elysia()
	.use(packageRoutes)
	.use(packagesRoute)
	.use(rfcNewRoute)
	.use(rfcDetailRoute)
	// RFC API endpoint
	.post('/api/rfcs/submit', async ({ body }) => {
		try {
			const { package: packageName, title, author, description, proposedChanges } = body as {
				package: string;
				title: string;
				author: string;
				description: string;
				proposedChanges?: { code: string };
			};

			if (!packageName || !title || !author || !description) {
				return {
					success: false,
					error: 'Missing required fields: package, title, author, description',
				};
			}

			const rfcId = await submitRFC(packageName, {
				title,
				author,
				description,
				proposedChanges,
			});

			return {
				success: true,
				rfcId,
				message: 'RFC submitted successfully',
			};
		} catch (error) {
			console.error('RFC submission error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	})
	// Serve team-filter component as JavaScript module
	.get('/components/team-filter.js', async () => {
		const componentPath = join(import.meta.dir, 'components', 'team-filter.ts');
		const code = await readFile(componentPath, 'utf-8');
		// Convert TypeScript to JavaScript (basic conversion for browser)
		// In production, you'd use a bundler
		const jsCode = code
			.replace(/import\s+.*?from\s+['"]@graph\/telegram\/topics['"];?/g, '')
			.replace(/TELEGRAM_SUPERGROUP_ID/g, '-1001234567890') // Replace with actual value
			.replace(/export\s+/g, '')
			.replace(/type\s+\w+\s*=.*?;/g, '')
			.replace(/as const/g, '');
		
		return new Response(jsCode, {
			headers: { 'Content-Type': 'application/javascript' },
		});
	})
	.get('/', () => {
		return `
			<html>
				<head><title>Registry Dashboard</title></head>
				<body>
					<h1>📦 Registry Dashboard</h1>
					<p><a href="/packages">View All Packages</a></p>
					<p>Package detail pages:</p>
					<ul>
						<li><a href="/package/@graph/layer4">@graph/layer4</a></li>
						<li><a href="/package/@graph/layer3">@graph/layer3</a></li>
						<li><a href="/package/@graph/layer2">@graph/layer2</a></li>
						<li><a href="/package/@graph/layer1">@graph/layer1</a></li>
						<li><a href="/package/@graph/algorithms">@graph/algorithms</a></li>
						<li><a href="/package/@graph/storage">@graph/storage</a></li>
						<li><a href="/package/@graph/streaming">@graph/streaming</a></li>
						<li><a href="/package/@graph/utils">@graph/utils</a></li>
						<li><a href="/package/@bench/layer4">@bench/layer4</a></li>
						<li><a href="/package/@bench/layer3">@bench/layer3</a></li>
						<li><a href="/package/@bench/layer2">@bench/layer2</a></li>
						<li><a href="/package/@bench/layer1">@bench/layer1</a></li>
						<li><a href="/package/@bench/property">@bench/property</a></li>
						<li><a href="/package/@bench/stress">@bench/stress</a></li>
					</ul>
				</body>
			</html>
		`;
	})
	.listen(PORT);

console.log(`🚀 Registry Dashboard running on http://localhost:${PORT}`);

export default app;
