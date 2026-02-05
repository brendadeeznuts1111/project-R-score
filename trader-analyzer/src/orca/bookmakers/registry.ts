/**
 * Unified Bookmaker Registry
 * Combines sharp book data, geographic data, and profile information
 * [#REF:BOOKMAKER-REGISTRY]
 */

import type { SharpBookConfig } from "../sharp-books/types";
import { SHARP_BOOKS } from "../sharp-books/registry";
import type {
	BookmakerLocation,
	RegionType,
	GeographicZone,
	ElevationZone,
} from "../../../packages/@graph/types/geography";
import {
	BOOKMAKER_LOCATIONS,
	REGION_FILTERS,
	GEOGRAPHIC_ZONES,
	ELEVATION_ZONES,
	getBookmakerLocation,
	getBookmakersByRegion,
	getBookmakersByZone,
	getBookmakersByElevation,
	getBookmakersByLatency,
} from "../../../packages/@graph/types/geography";

export interface UnifiedBookmaker {
	// Sharp book data
	id: string;
	name: string;
	sharpTier: string;
	endpoints: {
		rest?: string;
		ws?: string;
		odds?: string;
	};
	latencyBenchmark: number;
	weight: number;
	tags: string[];
	status: string;
	rateLimit: number;
	limitsWinners: boolean;
	cryptoAccepted: boolean;

	// Geographic data
	geographic?: {
		region: RegionType;
		country: string;
		coordinates: {
			latitude: number;
			longitude: number;
			elevation: number;
		};
		officeAddress: string;
		timezone: string;
		supportedSports: string[];
		latencyMs: number;
	};

	// Profile data (optional, loaded from database)
	profile?: {
		endpointConfig?: Record<string, number>;
		lastProfiled?: number;
		urlEncodingBehavior?: any;
	};
}

/**
 * Unified bookmaker registry combining all data sources
 */
class BookmakerRegistry {
	private bookmakers: Map<string, UnifiedBookmaker> = new Map();

	/**
	 * Initialize registry by combining sharp books and geographic data
	 */
	initialize(): void {
		// Start with sharp books
		for (const [id, sharpBook] of Object.entries(SHARP_BOOKS)) {
			const geo = getBookmakerLocation(id);
			const unified: UnifiedBookmaker = {
				...sharpBook,
				geographic: geo
					? {
							region: geo.region,
							country: geo.country,
							coordinates: geo.coordinates,
							officeAddress: geo.officeAddress,
							timezone: geo.timezone,
							supportedSports: geo.supportedSports,
							latencyMs: geo.latencyMs,
						}
					: undefined,
			};

			this.bookmakers.set(id, unified);
		}

		// Add geographic-only bookmakers (not in sharp books)
		for (const [id, location] of Object.entries(BOOKMAKER_LOCATIONS)) {
			if (!this.bookmakers.has(id)) {
				const unified: UnifiedBookmaker = {
					id,
					name: location.name,
					sharpTier: "Unknown",
					endpoints: {},
					latencyBenchmark: location.latencyMs,
					weight: 0,
					tags: [],
					status: "unknown",
					rateLimit: 0,
					limitsWinners: false,
					cryptoAccepted: false,
					geographic: {
						region: location.region,
						country: location.country,
						coordinates: location.coordinates,
						officeAddress: location.officeAddress,
						timezone: location.timezone,
						supportedSports: location.supportedSports,
						latencyMs: location.latencyMs,
					},
				};
				this.bookmakers.set(id, unified);
			}
		}
	}

	/**
	 * Get all bookmakers
	 */
	getAll(): UnifiedBookmaker[] {
		return Array.from(this.bookmakers.values());
	}

	/**
	 * Get bookmaker by ID
	 */
	getById(id: string): UnifiedBookmaker | undefined {
		return this.bookmakers.get(id);
	}

	/**
	 * Get bookmakers by region
	 */
	getByRegion(region: RegionType): UnifiedBookmaker[] {
		const bookmakerIds = getBookmakersByRegion(region);
		return bookmakerIds
			.map((id) => this.bookmakers.get(id))
			.filter((b): b is UnifiedBookmaker => Boolean(b));
	}

	/**
	 * Get bookmakers by geographic zone
	 */
	getByZone(zone: GeographicZone): UnifiedBookmaker[] {
		const bookmakerIds = getBookmakersByZone(zone);
		return bookmakerIds
			.map((id) => this.bookmakers.get(id))
			.filter((b): b is UnifiedBookmaker => Boolean(b));
	}

	/**
	 * Get bookmakers by elevation zone
	 */
	getByElevation(elevationZone: ElevationZone): UnifiedBookmaker[] {
		const bookmakerIds = getBookmakersByElevation(elevationZone);
		return bookmakerIds
			.map((id) => this.bookmakers.get(id))
			.filter((b): b is UnifiedBookmaker => Boolean(b));
	}

	/**
	 * Get bookmakers by max latency
	 */
	getByMaxLatency(maxLatency: number): UnifiedBookmaker[] {
		const bookmakerIds = getBookmakersByLatency(maxLatency);
		return bookmakerIds
			.map((id) => this.bookmakers.get(id))
			.filter((b): b is UnifiedBookmaker => Boolean(b));
	}

	/**
	 * Get bookmakers by sharp tier
	 */
	getByTier(tier: string): UnifiedBookmaker[] {
		return Array.from(this.bookmakers.values()).filter(
			(b) => b.sharpTier === tier,
		);
	}

	/**
	 * Get bookmakers by tag
	 */
	getByTag(tag: string): UnifiedBookmaker[] {
		return Array.from(this.bookmakers.values()).filter((b) =>
			b.tags.includes(tag),
		);
	}

	/**
	 * Get connected bookmakers only
	 */
	getConnected(): UnifiedBookmaker[] {
		return Array.from(this.bookmakers.values()).filter(
			(b) => b.status === "connected",
		);
	}

	/**
	 * Search bookmakers by name (fuzzy)
	 */
	searchByName(query: string): UnifiedBookmaker[] {
		const lowerQuery = query.toLowerCase();
		return Array.from(this.bookmakers.values()).filter(
			(b) =>
				b.name.toLowerCase().includes(lowerQuery) ||
				b.id.toLowerCase().includes(lowerQuery),
		);
	}

	/**
	 * Update bookmaker profile data
	 */
	updateProfile(
		id: string,
		profile: {
			endpointConfig?: Record<string, number>;
			lastProfiled?: number;
			urlEncodingBehavior?: any;
		},
	): void {
		const bookmaker = this.bookmakers.get(id);
		if (bookmaker) {
			bookmaker.profile = {
				...bookmaker.profile,
				...profile,
			};
		}
	}

	/**
	 * Get registry statistics
	 */
	getStatistics(): {
		total: number;
		byTier: Record<string, number>;
		byRegion: Record<string, number>;
		connected: number;
		withGeographic: number;
	} {
		const stats = {
			total: this.bookmakers.size,
			byTier: {} as Record<string, number>,
			byRegion: {} as Record<string, number>,
			connected: 0,
			withGeographic: 0,
		};

		for (const bookmaker of this.bookmakers.values()) {
			stats.byTier[bookmaker.sharpTier] =
				(stats.byTier[bookmaker.sharpTier] || 0) + 1;

			if (bookmaker.geographic) {
				stats.withGeographic++;
				stats.byRegion[bookmaker.geographic.region] =
					(stats.byRegion[bookmaker.geographic.region] || 0) + 1;
			}

			if (bookmaker.status === "connected") {
				stats.connected++;
			}
		}

		return stats;
	}
}

// Singleton instance
let registryInstance: BookmakerRegistry | null = null;

export function getBookmakerRegistry(): BookmakerRegistry {
	if (!registryInstance) {
		registryInstance = new BookmakerRegistry();
		registryInstance.initialize();
	}
	return registryInstance;
}

export default getBookmakerRegistry();
