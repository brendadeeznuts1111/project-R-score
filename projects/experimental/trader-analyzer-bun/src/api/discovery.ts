/**
 * @fileoverview API Discovery - List all available endpoints
 * @module [API][DISCOVERY][ENDPOINTS]
 * @description Provides endpoint discovery and listing functionality
 */

import { openApiSpec } from "./docs";

/**
 * Extract all endpoints from OpenAPI spec
 */
export function getAllEndpoints(): Array<{
	method: string;
	path: string;
	operationId: string;
	summary?: string;
}> {
	const endpoints: Array<{
		method: string;
		path: string;
		operationId: string;
		summary?: string;
	}> = [];

	for (const [path, pathItem] of Object.entries(openApiSpec.paths)) {
		for (const [method, operation] of Object.entries(pathItem)) {
			if (
				["get", "post", "put", "delete", "patch"].includes(method.toLowerCase())
			) {
				endpoints.push({
					method: method.toUpperCase(),
					path,
					operationId:
						operation.operationId || `${method}_${path.replace(/\//g, "_")}`,
					summary: operation.summary,
				});
			}
		}
	}

	return endpoints.sort((a, b) => {
		// Sort by path, then by method
		if (a.path !== b.path) {
			return a.path.localeCompare(b.path);
		}
		return a.method.localeCompare(b.method);
	});
}

/**
 * Get API discovery information
 */
export function getApiDiscovery() {
	const endpoints = getAllEndpoints();
	const groupedByPath = new Map<
		string,
		Array<{ method: string; operationId: string; summary?: string }>
	>();

	for (const endpoint of endpoints) {
		if (!groupedByPath.has(endpoint.path)) {
			groupedByPath.set(endpoint.path, []);
		}
		const pathMethods = groupedByPath.get(endpoint.path);
		if (pathMethods) {
			pathMethods.push({
				method: endpoint.method,
				operationId: endpoint.operationId,
				summary: endpoint.summary,
			});
		}
	}

	return {
		name: "Trader Analyzer API",
		version: openApiSpec.info.version,
		runtime: "Bun",
		totalEndpoints: endpoints.length,
		endpoints: Object.fromEntries(
			endpoints.map((e) => [e.operationId, `${e.method} ${e.path}`]),
		),
		grouped: Object.fromEntries(
			Array.from(groupedByPath.entries()).map(([path, methods]) => [
				path,
				methods.map((m) => `${m.method} ${m.operationId}`),
			]),
		),
		byMethod: {
			GET: endpoints.filter((e) => e.method === "GET").map((e) => e.path),
			POST: endpoints.filter((e) => e.method === "POST").map((e) => e.path),
			PUT: endpoints.filter((e) => e.method === "PUT").map((e) => e.path),
			DELETE: endpoints.filter((e) => e.method === "DELETE").map((e) => e.path),
			PATCH: endpoints.filter((e) => e.method === "PATCH").map((e) => e.path),
		},
	};
}
