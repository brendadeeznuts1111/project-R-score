/**
 * @fileoverview Usage Tracking Middleware
 * @description Hono middleware for tracking API usage and property access
 * @module api/usage-middleware
 */

import { MiddlewareHandler } from "hono";
import { getUsageTracker } from "../analytics/usage";
import { getCurrentUser } from "../auth/middleware";
import type { PipelineUser } from "../pipeline/types";

/**
 * Usage tracking middleware options
 */
export interface UsageTrackingOptions {
	/** Track API calls */
	trackApiCalls?: boolean;
	/** Track property access */
	trackPropertyAccess?: boolean;
	/** Custom resource identifier */
	resource?: string;
	/** Additional metadata */
	metadata?: Record<string, unknown>;
}

/**
 * Middleware to track API usage
 */
export function usageTrackingMiddleware(
	options: UsageTrackingOptions = {},
): MiddlewareHandler {
	const {
		trackApiCalls = true,
		trackPropertyAccess = false,
		resource,
		metadata = {},
	} = options;

	return async (c, next) => {
		const startTime = Date.now();
		const usageTracker = getUsageTracker();
		const user = getCurrentUser(c) || {
			id: "anonymous",
			username: "anonymous",
			role: "guest",
			featureFlags: [],
		};

		let success = true;
		let error: string | undefined;

		try {
			await next();
		} catch (err) {
			success = false;
			error = err instanceof Error ? err.message : String(err);
			throw err; // Re-throw to maintain error handling
		} finally {
			const responseTime = Date.now() - startTime;

			// Track API call
			if (trackApiCalls) {
				const method = c.req.method;
				const path = c.req.path;
				const resourceId = resource || `${method} ${path}`;

				await usageTracker.trackApiCall(
					user,
					resourceId,
					method,
					responseTime,
					success,
					error,
				);
			}

			// Track property access if specified
			if (trackPropertyAccess && resource) {
				await usageTracker.trackPropertyAccess(
					user,
					resource,
					(metadata.namespace as string) || "unknown",
					{
						...metadata,
						method: c.req.method,
						path: c.req.path,
						responseTime,
					},
					responseTime,
					success,
					error,
				);
			}
		}
	};
}

/**
 * Track property access in route handlers
 */
export async function trackPropertyAccess(
	user: PipelineUser,
	propertyId: string,
	namespace: string,
	metadata?: Record<string, unknown>,
	responseTime?: number,
	success = true,
	error?: string,
): Promise<void> {
	const usageTracker = getUsageTracker();
	await usageTracker.trackPropertyAccess(
		user,
		propertyId,
		namespace,
		metadata,
		responseTime,
		success,
		error,
	);
}

/**
 * Track pipeline processing
 */
export async function trackPipelineProcessing(
	user: PipelineUser,
	sourceId: string,
	stage: string,
	responseTime?: number,
	success = true,
	error?: string,
): Promise<void> {
	const usageTracker = getUsageTracker();
	await usageTracker.trackPipelineProcessing(
		user,
		sourceId,
		stage,
		responseTime,
		success,
		error,
	);
}

/**
 * Get usage statistics
 */
export async function getUsageStats(
	startTime: number,
	endTime: number,
	userId?: string,
) {
	const usageTracker = getUsageTracker();
	return usageTracker.getUsageStats(startTime, endTime, userId);
}

/**
 * Get recent usage events
 */
export async function getRecentUsageEvents(limit = 100, userId?: string) {
	const usageTracker = getUsageTracker();
	return usageTracker.getRecentEvents(limit, userId);
}
