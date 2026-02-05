#!/usr/bin/env bun
/**
 * @fileoverview Comprehensive Test Suite for Geographic Filter Component
 * @description Production-grade tests using Bun v1.3.4 patterns
 * @version 1.0.0
 * @since Bun 1.3.4
 *
 * @see {@link https://bun.sh/blog/bun-v1.3.4|Bun v1.3.4 Release}
 * @see {@link ../../../test/bun-1.3.4-features.test.ts|Bun v1.3.4 Feature Tests}
 * @see {@link ../../../../docs/TEAM-DASHBOARD-API-VERIFICATION.md|Team Dashboard API Verification}
 * @see {@link ../../../../docs/14.4.0.0.0.0.0-BUN-RUNTIME-ENHANCEMENTS.md|Bun Runtime Enhancements}
 *
 * @module apps/registry-dashboard/src/components/geographic-filter.test
 */

import { describe, expect, test } from "bun:test";
import { GEOGRAPHIC_FILTER_JS, renderGeographicFilter, renderMapVisualization } from "./geographic-filter";

describe("Geographic Filter Component", () => {
	describe("renderGeographicFilter", () => {
		/**
		 * @test Should render filter container
		 */
		test("should render geographic filter container", () => {
			const html = renderGeographicFilter();
			expect(html).toContain("geographic-filter-bar");
			expect(html).toContain("🌍 Geographic & Bookmaker Filters");
		});

		/**
		 * @test Should include bookmaker filter
		 */
		test("should include bookmaker filter dropdown", () => {
			const html = renderGeographicFilter();
			expect(html).toContain("bookmaker-filter");
			expect(html).toContain("All Bookmakers");
			expect(html).toContain("bet365");
			expect(html).toContain("pinnacle");
			expect(html).toContain("fanatics");
			expect(html).toContain("draftkings");
			expect(html).toContain("betfair-asia");
		});

		/**
		 * @test Should include region filter
		 */
		test("should include region filter dropdown", () => {
			const html = renderGeographicFilter();
			expect(html).toContain("region-filter");
			expect(html).toContain("All Regions");
			expect(html).toContain("🇬🇧 United Kingdom");
			expect(html).toContain("🇨🇼 Curacao");
			expect(html).toContain("🇺🇸 US East Coast");
			expect(html).toContain("🇺🇸 US West Coast");
			expect(html).toContain("🌏 Asia-Pacific");
		});

		/**
		 * @test Should include geographic zone filter
		 */
		test("should include geographic zone filter dropdown", () => {
			const html = renderGeographicFilter();
			expect(html).toContain("zone-filter");
			expect(html).toContain("All Zones");
			expect(html).toContain("🌐 Northern Hemisphere");
			expect(html).toContain("🌴 Tropics");
			expect(html).toContain("🐧 Southern Hemisphere");
		});

		/**
		 * @test Should include elevation filter
		 */
		test("should include elevation filter dropdown", () => {
			const html = renderGeographicFilter();
			expect(html).toContain("elevation-filter");
			expect(html).toContain("All Elevations");
			expect(html).toContain("🏖️ Sea Level");
			expect(html).toContain("🏔️ Lowland");
			expect(html).toContain("⛰️ Highland");
		});

		/**
		 * @test Should include latency filter slider
		 */
		test("should include latency filter slider", () => {
			const html = renderGeographicFilter();
			expect(html).toContain("latency-filter");
			expect(html).toContain('type="range"');
			expect(html).toContain('min="0"');
			expect(html).toContain('max="200"');
			expect(html).toContain('value="50"');
			expect(html).toContain("latency-value");
			expect(html).toContain("50ms");
		});

		/**
		 * @test Should include action buttons
		 */
		test("should include clear and apply buttons", () => {
			const html = renderGeographicFilter();
			expect(html).toContain("clear-geo-btn");
			expect(html).toContain("apply-geo-btn");
			expect(html).toContain("clearGeographicFilters()");
			expect(html).toContain("applyGeographicFilter()");
		});

		/**
		 * @test Should have proper styling
		 */
		test("should have proper styling attributes", () => {
			const html = renderGeographicFilter();
			expect(html).toContain("border-left: 4px solid #17a2b8");
			expect(html).toContain("border-radius: 12px");
			expect(html).toContain("box-shadow");
		});

		/**
		 * @test Should include bookmaker coordinates
		 */
		test("should include bookmaker coordinates in options", () => {
			const html = renderGeographicFilter();
			// Bet365 - Stoke-on-Trent, UK
			expect(html).toContain("52.95°");
			expect(html).toContain("-1.15°");
			expect(html).toContain("45m");
			// Pinnacle - Curacao
			expect(html).toContain("12.17°");
			expect(html).toContain("-68.99°");
		});
	});

	describe("renderMapVisualization", () => {
		/**
		 * @test Should render map container
		 */
		test("should render map visualization container", () => {
			const html = renderMapVisualization();
			expect(html).toContain("map-visualization");
			expect(html).toContain("📍 Geographic Distribution");
		});

		/**
		 * @test Should include Leaflet map container
		 */
		test("should include Leaflet map container", () => {
			const html = renderMapVisualization();
			expect(html).toContain("leaflet-map");
			expect(html).toContain('height: 400px');
		});

		/**
		 * @test Should include locations grid
		 */
		test("should include map locations grid", () => {
			const html = renderMapVisualization();
			expect(html).toContain("map-locations");
			expect(html).toContain("grid-template-columns");
		});

		/**
		 * @test Should include Leaflet CSS
		 */
		test("should include Leaflet CSS link", () => {
			const html = renderMapVisualization();
			expect(html).toContain('rel="stylesheet"');
			expect(html).toContain("leaflet@1.9.4/dist/leaflet.css");
			expect(html).toContain('crossorigin=""');
		});

		/**
		 * @test Should include Leaflet JS
		 */
		test("should include Leaflet JavaScript", () => {
			const html = renderMapVisualization();
			expect(html).toContain("leaflet@1.9.4/dist/leaflet.js");
			expect(html).toContain('crossorigin=""');
		});

		/**
		 * @test Should have proper container styling
		 */
		test("should have proper container styling", () => {
			const html = renderMapVisualization();
			expect(html).toContain("border-radius: 12px");
			expect(html).toContain("background: #f8f9fa");
		});
	});

	describe("GEOGRAPHIC_FILTER_JS Client-Side JavaScript", () => {
		/**
		 * @test Should define BOOKMAKER_LOCATIONS
		 */
		test("should define BOOKMAKER_LOCATIONS constant", () => {
			expect(GEOGRAPHIC_FILTER_JS).toContain("const BOOKMAKER_LOCATIONS");
		});

		/**
		 * @test Should include all bookmaker data
		 */
		test("should include all bookmaker location data", () => {
			expect(GEOGRAPHIC_FILTER_JS).toContain("'bet365'");
			expect(GEOGRAPHIC_FILTER_JS).toContain("'pinnacle'");
			expect(GEOGRAPHIC_FILTER_JS).toContain("'fanatics'");
			expect(GEOGRAPHIC_FILTER_JS).toContain("'draftkings'");
			expect(GEOGRAPHIC_FILTER_JS).toContain("'betfair-asia'");
		});

		/**
		 * @test Should include bookmaker coordinates
		 */
		test("should include bookmaker coordinates", () => {
			// Bet365 - Stoke-on-Trent
			expect(GEOGRAPHIC_FILTER_JS).toContain("latitude: 52.9548");
			expect(GEOGRAPHIC_FILTER_JS).toContain("longitude: -1.1496");
			expect(GEOGRAPHIC_FILTER_JS).toContain("elevation: 45");
			// Pinnacle - Curacao
			expect(GEOGRAPHIC_FILTER_JS).toContain("latitude: 12.1696");
			expect(GEOGRAPHIC_FILTER_JS).toContain("longitude: -68.9900");
		});

		/**
		 * @test Should include latency data
		 */
		test("should include latency data for each bookmaker", () => {
			expect(GEOGRAPHIC_FILTER_JS).toContain("latencyMs: 12"); // Bet365
			expect(GEOGRAPHIC_FILTER_JS).toContain("latencyMs: 85"); // Pinnacle
			expect(GEOGRAPHIC_FILTER_JS).toContain("latencyMs: 5"); // Fanatics
			expect(GEOGRAPHIC_FILTER_JS).toContain("latencyMs: 8"); // DraftKings
			expect(GEOGRAPHIC_FILTER_JS).toContain("latencyMs: 120"); // Betfair Asia
		});

		/**
		 * @test Should include supported sports
		 */
		test("should include supported sports arrays", () => {
			expect(GEOGRAPHIC_FILTER_JS).toContain("supportedSports:");
			expect(GEOGRAPHIC_FILTER_JS).toContain("'soccer'");
			expect(GEOGRAPHIC_FILTER_JS).toContain("'basketball'");
			expect(GEOGRAPHIC_FILTER_JS).toContain("'tennis'");
			expect(GEOGRAPHIC_FILTER_JS).toContain("'cricket'");
		});

		/**
		 * @test Should define REGION_FILTERS
		 */
		test("should define REGION_FILTERS constant", () => {
			expect(GEOGRAPHIC_FILTER_JS).toContain("const REGION_FILTERS");
			expect(GEOGRAPHIC_FILTER_JS).toContain("'UK'");
			expect(GEOGRAPHIC_FILTER_JS).toContain("'Curacao'");
			expect(GEOGRAPHIC_FILTER_JS).toContain("'US-East'");
			expect(GEOGRAPHIC_FILTER_JS).toContain("'US-West'");
			expect(GEOGRAPHIC_FILTER_JS).toContain("'Asia-Pacific'");
		});

		/**
		 * @test Should define updateLatencyValue function
		 */
		test("should define updateLatencyValue function", () => {
			expect(GEOGRAPHIC_FILTER_JS).toContain("function updateLatencyValue(value)");
			expect(GEOGRAPHIC_FILTER_JS).toContain("latency-value");
			expect(GEOGRAPHIC_FILTER_JS).toContain("+ 'ms'");
		});

		/**
		 * @test Should define applyGeographicFilter function
		 */
		test("should define applyGeographicFilter function", () => {
			expect(GEOGRAPHIC_FILTER_JS).toContain("function applyGeographicFilter()");
			expect(GEOGRAPHIC_FILTER_JS).toContain("bookmaker-filter");
			expect(GEOGRAPHIC_FILTER_JS).toContain("region-filter");
			expect(GEOGRAPHIC_FILTER_JS).toContain("zone-filter");
			expect(GEOGRAPHIC_FILTER_JS).toContain("elevation-filter");
		});

		/**
		 * @test Should define clearGeographicFilters function
		 */
		test("should define clearGeographicFilters function", () => {
			expect(GEOGRAPHIC_FILTER_JS).toContain("function clearGeographicFilters()");
		});

		/**
		 * @test Should include zone filter logic
		 */
		test("should include zone filter logic", () => {
			expect(GEOGRAPHIC_FILTER_JS).toContain("zoneFilters");
			expect(GEOGRAPHIC_FILTER_JS).toContain("'northern'");
			expect(GEOGRAPHIC_FILTER_JS).toContain("'tropical'");
			expect(GEOGRAPHIC_FILTER_JS).toContain("'southern'");
			expect(GEOGRAPHIC_FILTER_JS).toContain("lat >= 50 && lat <= 70"); // Northern
			expect(GEOGRAPHIC_FILTER_JS).toContain("lat >= -23.5 && lat <= 23.5"); // Tropical
		});

		/**
		 * @test Should include elevation filter logic
		 */
		test("should include elevation filter logic", () => {
			expect(GEOGRAPHIC_FILTER_JS).toContain("elevationFilters");
			expect(GEOGRAPHIC_FILTER_JS).toContain("'sea-level'");
			expect(GEOGRAPHIC_FILTER_JS).toContain("'lowland'");
			expect(GEOGRAPHIC_FILTER_JS).toContain("'highland'");
			expect(GEOGRAPHIC_FILTER_JS).toContain("elev >= -10 && elev <= 100"); // Sea level
		});

		/**
		 * @test Should include Leaflet map initialization
		 */
		test("should include Leaflet map initialization", () => {
			expect(GEOGRAPHIC_FILTER_JS).toContain("let leafletMap = null");
			expect(GEOGRAPHIC_FILTER_JS).toContain("function initializeLeafletMap()");
			expect(GEOGRAPHIC_FILTER_JS).toContain("L.map('leaflet-map')");
			expect(GEOGRAPHIC_FILTER_JS).toContain("L.tileLayer");
			expect(GEOGRAPHIC_FILTER_JS).toContain("openstreetmap.org");
		});

		/**
		 * @test Should include map marker management
		 */
		test("should include map marker management", () => {
			expect(GEOGRAPHIC_FILTER_JS).toContain("let mapMarkers = []");
			expect(GEOGRAPHIC_FILTER_JS).toContain("L.marker");
			expect(GEOGRAPHIC_FILTER_JS).toContain("bindPopup");
			expect(GEOGRAPHIC_FILTER_JS).toContain("fitBounds");
		});

		/**
		 * @test Should include updateMapVisualization function
		 */
		test("should include updateMapVisualization function", () => {
			expect(GEOGRAPHIC_FILTER_JS).toContain("function updateMapVisualization");
			expect(GEOGRAPHIC_FILTER_JS).toContain("selectedBookmaker");
			expect(GEOGRAPHIC_FILTER_JS).toContain("selectedRegion");
			expect(GEOGRAPHIC_FILTER_JS).toContain("matchingBookmakers");
		});

		/**
		 * @test Should include location card rendering
		 */
		test("should include location card rendering", () => {
			expect(GEOGRAPHIC_FILTER_JS).toContain("location-pin");
			expect(GEOGRAPHIC_FILTER_JS).toContain("📍");
			expect(GEOGRAPHIC_FILTER_JS).toContain("⛰️");
			expect(GEOGRAPHIC_FILTER_JS).toContain("🏙️");
			expect(GEOGRAPHIC_FILTER_JS).toContain("⏱️");
			expect(GEOGRAPHIC_FILTER_JS).toContain("🏆");
		});

		/**
		 * @test Should include results count update
		 */
		test("should include filter results count update", () => {
			expect(GEOGRAPHIC_FILTER_JS).toContain("filter-results-count");
			expect(GEOGRAPHIC_FILTER_JS).toContain("packages visible");
		});
	});

	describe("Edge Cases", () => {
		/**
		 * @test Empty function should not throw
		 */
		test("should return valid HTML strings", () => {
			const filterHtml = renderGeographicFilter();
			const mapHtml = renderMapVisualization();

			expect(typeof filterHtml).toBe("string");
			expect(typeof mapHtml).toBe("string");
			expect(filterHtml.length).toBeGreaterThan(0);
			expect(mapHtml.length).toBeGreaterThan(0);
		});

		/**
		 * @test HTML should be well-formed
		 */
		test("should have matching div tags", () => {
			const filterHtml = renderGeographicFilter();
			const openDivs = (filterHtml.match(/<div/g) || []).length;
			const closeDivs = (filterHtml.match(/<\/div>/g) || []).length;
			expect(openDivs).toBe(closeDivs);
		});

		/**
		 * @test Should have proper select elements
		 */
		test("should have matching select tags", () => {
			const filterHtml = renderGeographicFilter();
			const openSelects = (filterHtml.match(/<select/g) || []).length;
			const closeSelects = (filterHtml.match(/<\/select>/g) || []).length;
			expect(openSelects).toBe(closeSelects);
		});
	});

	describe("Accessibility", () => {
		/**
		 * @test Should have labels for form elements
		 */
		test("should have labels for all filter inputs", () => {
			const html = renderGeographicFilter();
			expect(html).toContain("<label>");
			// Count labels
			const labels = (html.match(/<label>/g) || []).length;
			expect(labels).toBeGreaterThan(0);
		});

		/**
		 * @test Should have IDs for form elements
		 */
		test("should have IDs for all form elements", () => {
			const html = renderGeographicFilter();
			expect(html).toContain('id="bookmaker-filter"');
			expect(html).toContain('id="region-filter"');
			expect(html).toContain('id="zone-filter"');
			expect(html).toContain('id="elevation-filter"');
			expect(html).toContain('id="latency-filter"');
		});
	});
});
