/**
 * @fileoverview 7.4.0.0.0.0.0: Type-Safe Route Builder for URLPattern Router
 * @description Fluent API for building URLPattern routes with compile-time type checking
 * @module api/routers/route-builder
 * @version 7.4.0.0.0.0.0
 *
 * [DoD][CLASS:RouteBuilder][SCOPE:TypeSafety]
 * Fluent API for building URLPattern routes with compile-time type checking
 * Provides type-safe parameter extraction from URLPattern groups
 *
 * Cross-reference: docs/7.0.0.0.0.0.0-URLPATTERN-ROUTER.md
 * Cross-reference: docs/BUN-1.3.4-URLPATTERN-API.md
 * Ripgrep Pattern: 7\.4\.0\.0\.0\.0\.0|RouteBuilder|route-builder
 */

import type { Context } from 'hono';
import type { RoutePattern } from './urlpattern-router';

type URLPatternGroups<T extends string> = {
	[K in T]: string;
};

/**
 * 7.4.0.0.0.0.0: Route Builder Class
 * [DoD][CLASS:RouteBuilder][SCOPE:TypeSafety]
 * 
 * Provides fluent API for building URLPattern routes with compile-time type checking.
 * Enables type-safe parameter extraction from URLPattern groups.
 */
export class RouteBuilder<T extends string = never> {
	private pattern: Partial<URLPatternInit> = {};
	private method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
	private middlewares: Array<(request: Request, context: Context, groups: Record<string, string>) => Promise<Response> | Response> = [];
	private handler?: (req: Request, context: Context, groups: URLPatternGroups<T>) => Promise<Response> | Response;
	private options: { summary?: string; tags?: string[] } = {};

	/**
	 * 7.4.1.0.0.0.0: Start building a route with pathname
	 * [DoD][METHOD:Path][SCOPE:RouteBuilding]
	 * 
	 * @param pathname - URLPattern pathname string (e.g., '/api/v1/users/:id')
	 * @returns New RouteBuilder instance
	 * 
	 * @example
	 * ```typescript
	 * RouteBuilder.path('/api/v1/users/:id')
	 *   .get()
	 *   .handle(async (req, ctx, groups) => {
	 *     const userId = groups.id; // Type-safe!
	 *     return Response.json({ userId });
	 *   })
	 *   .build();
	 * ```
	 */
	static path(pathname: string): RouteBuilder {
		const builder = new RouteBuilder();
		builder.pattern.pathname = pathname;
		return builder;
	}

	/**
	 * 7.4.2.0.0.0.0: Add hostname constraint
	 * [DoD][METHOD:Hostname][SCOPE:RouteBuilding]
	 */
	hostname(host: string): RouteBuilder<T> {
		this.pattern.hostname = host;
		return this;
	}

	/**
	 * 7.4.3.0.0.0.0: Add protocol constraint
	 * [DoD][METHOD:Protocol][SCOPE:RouteBuilding]
	 */
	protocol(proto: 'http:' | 'https:'): RouteBuilder<T> {
		this.pattern.protocol = proto;
		return this;
	}

	/**
	 * 7.4.4.0.0.0.0: Add HTTP GET method
	 * [DoD][METHOD:Get][SCOPE:RouteBuilding]
	 */
	get(): RouteBuilder<T> {
		this.method = 'GET';
		return this;
	}

	/**
	 * 7.4.5.0.0.0.0: Add HTTP POST method
	 * [DoD][METHOD:Post][SCOPE:RouteBuilding]
	 */
	post(): RouteBuilder<T> {
		this.method = 'POST';
		return this;
	}

	/**
	 * 7.4.6.0.0.0.0: Add HTTP DELETE method
	 * [DoD][METHOD:Delete][SCOPE:RouteBuilding]
	 */
	delete(): RouteBuilder<T> {
		this.method = 'DELETE';
		return this;
	}

	/**
	 * 7.4.7.0.0.0.0: Add HTTP PUT method
	 * [DoD][METHOD:Put][SCOPE:RouteBuilding]
	 */
	put(): RouteBuilder<T> {
		this.method = 'PUT';
		return this;
	}

	/**
	 * 7.4.8.0.0.0.0: Add HTTP PATCH method
	 * [DoD][METHOD:Patch][SCOPE:RouteBuilding]
	 */
	patch(): RouteBuilder<T> {
		this.method = 'PATCH';
		return this;
	}

	/**
	 * 7.4.9.0.0.0.0: Add middleware
	 * [DoD][METHOD:Use][SCOPE:RouteBuilding]
	 */
	use(middleware: (request: Request, context: Context, groups: Record<string, string>) => Promise<Response> | Response): RouteBuilder<T> {
		this.middlewares.push(middleware);
		return this;
	}

	/**
	 * 7.4.10.0.0.0.0: Set handler with typed groups
	 * [DoD][METHOD:Handle][SCOPE:RouteBuilding]
	 * 
	 * @param handler - Route handler function with typed groups parameter
	 * @returns RouteBuilder with updated type parameter
	 */
	handle<U extends string>(
		handler: (req: Request, context: Context, groups: URLPatternGroups<U>) => Promise<Response> | Response
	): RouteBuilder<U> {
		this.handler = handler as any;
		return this as RouteBuilder<U>;
	}

	/**
	 * 7.4.11.0.0.0.0: Add summary metadata
	 * [DoD][METHOD:Summary][SCOPE:RouteBuilding]
	 */
	summary(text: string): RouteBuilder<T> {
		this.options.summary = text;
		return this;
	}

	/**
	 * 7.4.12.0.0.0.0: Add tags metadata
	 * [DoD][METHOD:Tags][SCOPE:RouteBuilding]
	 */
	tags(tags: string[]): RouteBuilder<T> {
		this.options.tags = tags;
		return this;
	}

	/**
	 * 7.4.13.0.0.0.0: Build final route
	 * [DoD][METHOD:Build][SCOPE:RouteBuilding]
	 * 
	 * @returns Complete RoutePattern ready for registration
	 * @throws Error if handler is not provided
	 */
	build(): RoutePattern {
		if (!this.handler) {
			throw new Error('Route handler is required');
		}

		return {
			pattern: new URLPattern(this.pattern),
			method: this.method,
			middlewares: this.middlewares.length > 0 ? this.middlewares : undefined,
			handler: this.handler as any,
			summary: this.options.summary,
			tags: this.options.tags
		};
	}
}

/**
 * Example usage with type safety
 * [DoD][EXAMPLE:TypedRoutes][SCOPE:TypeSafety]
 * 
 * @example
 * ```typescript
 * import { RouteBuilder } from './route-builder';
 * import { dodMiddleware } from '../middleware/dod-middleware';
 * 
 * export function buildTypedRoutes(): void {
 *   // Type-safe route with parameter extraction
 *   RouteBuilder.path('/api/v1/events/:eventId/periods/:period')
 *     .get()
 *     .use(dodMiddleware.preHandler)
 *     .handle(async (req, context, groups) => {
 *       // groups.eventId and groups.period are string (type-safe!)
 *       const { eventId, period } = groups;
 *       
 *       logger.info('Fetching period data', { eventId, period });
 *       
 *       const data = await fetchPeriodData(eventId, period);
 *       return Response.json(data);
 *     })
 *     .summary('Get specific period data for event')
 *     .tags(['events', 'periods'])
 *     .build();
 * }
 * ```
 */
