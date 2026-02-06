/**
 * Services Module - Centralized Service Exports
 * 
 * This file provides a clean import interface for all services
 * and maintains backward compatibility during the reorganization.
 */

// Core Services
export { FetchService } from './core/fetch-service';
export { default as AdvancedFetchService } from './core/advanced-fetch-service';
export { RSSService, RSSItem, RSSFeed } from './core/rss-service';

// Monitoring Services
export { default as MonitoringService } from './monitoring/monitoring-service';

// Testing Services
export { default as ABTestingService } from './testing/ab-testing-service';

// Demo Services
export { default as ContentTypeDemo } from './demos/content-type-demo';
export { default as VerboseFetchDemo } from './demos/verbose-fetch-demo';

/**
 * Service Factory - Create configured service instances
 */
export class ServiceFactory {
  static createFetchService(): FetchService {
    return new FetchService();
  }

  static createAdvancedFetchService(): typeof AdvancedFetchService {
    return AdvancedFetchService;
  }

  static createRSSService(): RSSService {
    return new RSSService();
  }

  static createMonitoringService() {
    return MonitoringService;
  }

  static createABTestingService() {
    return ABTestingService;
  }
}

/**
 * Backward Compatibility - Re-export from old locations
 * @deprecated Use the new organized imports instead
 */
export * from './core/fetch-service';
export * from './core/advanced-fetch-service';
export * from './core/rss-service';
export * from './monitoring/monitoring-service';
export * from './testing/ab-testing-service';
export * from './demos/content-type-demo';
export * from './demos/verbose-fetch-demo';
