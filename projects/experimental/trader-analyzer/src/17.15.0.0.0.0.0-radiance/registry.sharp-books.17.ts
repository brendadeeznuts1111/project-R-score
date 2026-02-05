/**
 * @fileoverview Sharp Books Registry v17
 * @description 17.15.0.0.0.0.0 - RadianceTyped sharp books registry queries
 * @module 17.15.0.0.0.0.0-radiance/registry.sharp-books.17
 */

import type { SharpBookDefinition } from "./types.radiance.17";
import { ROUTING_REGISTRY_NAMES } from "../../utils/rss-constants";

/**
 * Query Sharp Books Registry v17
 * 
 * @param filters - Optional filters for querying sharp books
 * @returns Array of SharpBookDefinition items
 */
export async function querySharpBooksRegistry17(
	filters?: {
		tier?: 1 | 2 | 3 | 4;
		status?: "active" | "degraded" | "offline";
		cryptoAccepted?: boolean;
	},
): Promise<SharpBookDefinition[]> {
	const { SHARP_BOOKS } = await import("../../orca/sharp-books/registry");

	return Object.entries(SHARP_BOOKS).map(([id, book]: [string, any]) => ({
		...book,
		id: book.id?.startsWith("book_") ? book.id : `book_${id}`,
		endpoints: {
			odds: new URL(book.endpoints?.odds || ""),
			markets: book.endpoints?.markets ? new URL(book.endpoints.markets) : undefined,
			auth: book.endpoints?.auth ? new URL(book.endpoints.auth) : undefined,
		},
		tags: new Set(book.tags || []),
		version: book.version || "v1.0.0",
		__category: ROUTING_REGISTRY_NAMES.SHARP_BOOKS as const,
		__version: "17.15.0" as const,
		__radianceChannel: "radiance-sharp" as const,
		__semanticType: "SharpBookDefinition",
	})).filter((book) => {
		if (filters?.tier && book.sharpTier !== filters.tier) return false;
		if (filters?.status && book.status !== filters.status) return false;
		if (filters?.cryptoAccepted !== undefined && book.cryptoAccepted !== filters.cryptoAccepted) return false;
		return true;
	}) as SharpBookDefinition[];
}

/**
 * Probe Sharp Books Health v17
 * 
 * @returns Health status
 */
export async function probeSharpBooksHealth17(): Promise<{
	healthy: boolean;
	status: "healthy" | "degraded" | "offline";
	activeCount: number;
	totalCount: number;
	lastChecked: number;
}> {
	try {
		const books = await querySharpBooksRegistry17();
		const activeBooks = books.filter(b => b.status === "active");
		
		return {
			healthy: activeBooks.length > 0,
			status: activeBooks.length > 0 ? "healthy" : "degraded",
			activeCount: activeBooks.length,
			totalCount: books.length,
			lastChecked: Date.now(),
		};
	} catch (error) {
		return {
			healthy: false,
			status: "offline",
			activeCount: 0,
			totalCount: 0,
			lastChecked: Date.now(),
		};
	}
}
