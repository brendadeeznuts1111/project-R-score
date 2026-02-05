/**
 * @fileoverview URLPattern Wildcard Radiance Patterns - Module Exports
 * @description 17.16.0.0.0.0.0 - Central export point for all URLPattern wildcard functionality
 * @module 17.16.0.0.0.0.0-routing/index.17.16
 *
 * **Single import point for all URLPattern wildcard patterns.**
 * 
 * **Constants Integration:**
 * - Uses `ROUTING_REGISTRY_NAMES` from `src/utils/rss-constants.ts` for registry name matching
 * - Uses `RSS_API_PATHS.V17_*` constants for v17 routing paths
 * - Integrated with MCP tools and CLI commands registries
 * 
 * @see src/utils/rss-constants.ts for routing constants
 * @see src/api/registry.ts for registry implementations
 */

// Pattern definitions
export {
    extractAllSegments17, extractSegments17, getPatternMetadata17, matchRadiancePattern17, radiancePatternMetadata, radiancePatterns, type PatternMatch
} from "./17.16.1-urlpattern.wildcards";

// Routing handler
export {
    handleRadianceRoute17
} from "./17.16.2-routing.handler";

// Examples
export {
    exampleDashboard17,
    exampleExtractSegments17, exampleHealthProbe17, exampleMultipleWildcards17, exampleOptionalSegments17, examplePatternMetadata17, examplePerformanceBenchmark17, exampleRegistryDeep17, exampleRoutingHandler17, exampleTelemetryIngest17, exampleWebSocket17, runAllExamples17_16
} from "./examples.17.16";

