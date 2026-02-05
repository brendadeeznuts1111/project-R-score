#!/usr/bin/env bun

/**
 * Custom Matchers for Enhanced Naming Conventions
 * Extends bun:test with domain-specific matchers for our WebSocket Proxy API
 */

import { expect } from "bun:test";

// Custom matcher interfaces for TypeScript support
interface EnhancedNamingMatchers {
  /**
   * Checks if a configuration has enhanced WebSocket proxy properties
   */
  toHaveEnhancedWebSocketProperties(): any;

  /**
   * Checks if a performance metrics object has enhanced property names
   */
  toHaveEnhancedPerformanceProperties(): any;

  /**
   * Checks if a connection information object has enhanced property names
   */
  toHaveEnhancedConnectionProperties(): any;

  /**
   * Checks if an error is an enhanced WebSocket proxy error
   */
  toBeEnhancedWebSocketProxyError(): any;

  /**
   * Checks if a value is a valid WebSocket URL
   */
  toBeValidWebSocketUrl(): any;

  /**
   * Checks if a port number is within valid range
   */
  toBeValidPort(): any;

  /**
   * Checks if a configuration object follows enhanced naming conventions
   */
  toFollowEnhancedNamingConventions(): any;

  /**
   * Checks if a DOM element has enhanced properties for dashboard testing
   */
  toHaveEnhancedDOMProperties(): any;

  /**
   * Checks if a dashboard component has enhanced properties
   */
  toHaveEnhancedDashboardProperties(): any;

  /**
   * Checks if a dashboard title follows enhanced naming conventions
   */
  toBeValidDashboardTitle(): any;

  /**
   * Checks if a dashboard count is within valid range
   */
  toBeValidDashboardCount(): any;

  /**
   * Checks if a refresh interval is within valid range
   */
  toBeValidRefreshInterval(): any;
}

// Extend the Matchers interface through declaration merging
declare module "bun:test" {
  interface Matchers<T> extends EnhancedNamingMatchers {}
  interface AsymmetricMatchers extends EnhancedNamingMatchers {}
}

// Custom matcher implementations
expect.extend({
  /**
   * Matcher for enhanced WebSocket proxy properties
   */
  toHaveEnhancedWebSocketProperties(actual: any) {
    if (typeof actual !== "object" || actual === null) {
      throw new Error("Expected an object");
    }

    const enhancedProperties = [
      "targetUrl",
      "listenPort",
      "maxConnections",
      "idleTimeout",
      "debug",
    ];

    const hasAllProperties = enhancedProperties.every((prop) => prop in actual);
    const missingProperties = enhancedProperties.filter(
      (prop) => !(prop in actual)
    );

    return {
      pass: hasAllProperties,
      message: () => {
        if (hasAllProperties) {
          return `expected ${this.utils.printReceived(
            actual
          )} not to have enhanced WebSocket properties`;
        } else {
          return `expected ${this.utils.printReceived(
            actual
          )} to have enhanced WebSocket properties, but missing: ${this.utils.printExpected(
            missingProperties.join(", ")
          )}`;
        }
      },
    };
  },

  /**
   * Matcher for enhanced performance metrics properties
   */
  toHaveEnhancedPerformanceProperties(actual: any) {
    if (typeof actual !== "object" || actual === null) {
      throw new Error("Expected an object");
    }

    const enhancedProperties = [
      "totalConnectionCount",
      "activeConnectionCount",
      "totalMessageCount",
      "totalByteCount",
      "averageLatencyMilliseconds",
      "totalErrorCount",
      "serverUptimeMilliseconds",
      "systemMemoryUsage",
      "systemCpuUsage",
    ];

    const hasAllProperties = enhancedProperties.every((prop) => prop in actual);
    const missingProperties = enhancedProperties.filter(
      (prop) => !(prop in actual)
    );

    return {
      pass: hasAllProperties,
      message: () => {
        if (hasAllProperties) {
          return `expected ${this.utils.printReceived(
            actual
          )} not to have enhanced performance properties`;
        } else {
          return `expected ${this.utils.printReceived(
            actual
          )} to have enhanced performance properties, but missing: ${this.utils.printExpected(
            missingProperties.join(", ")
          )}`;
        }
      },
    };
  },

  /**
   * Matcher for enhanced connection information properties
   */
  toHaveEnhancedConnectionProperties(actual: any) {
    if (typeof actual !== "object" || actual === null) {
      throw new Error("Expected an object");
    }

    const enhancedProperties = [
      "connectionUniqueId",
      "clientRemoteAddress",
      "clientUserAgent",
      "connectionEstablishedTimestamp",
      "lastActivityTimestamp",
      "outboundMessageCount",
      "inboundMessageCount",
      "inboundByteCount",
      "outboundByteCount",
      "targetWebSocketUrl",
    ];

    const hasAllProperties = enhancedProperties.every((prop) => prop in actual);
    const missingProperties = enhancedProperties.filter(
      (prop) => !(prop in actual)
    );

    return {
      pass: hasAllProperties,
      message: () => {
        if (hasAllProperties) {
          return `expected ${this.utils.printReceived(
            actual
          )} not to have enhanced connection properties`;
        } else {
          return `expected ${this.utils.printReceived(
            actual
          )} to have enhanced connection properties, but missing: ${this.utils.printExpected(
            missingProperties.join(", ")
          )}`;
        }
      },
    };
  },

  /**
   * Matcher for enhanced WebSocket proxy errors
   */
  toBeEnhancedWebSocketProxyError(actual: any) {
    const enhancedErrorNames = [
      "WebSocketProxyOperationalError",
      "WebSocketProxyConfigurationError",
      "WebSocketProxyConnectionError",
      "WebSocketProxyRateLimitError",
      "WebSocketProxyAuthenticationError",
      "WebSocketProxyFirewallError",
    ];

    const isEnhancedError = enhancedErrorNames.some(
      (name) => actual.constructor?.name === name || actual.name === name
    );

    return {
      pass: isEnhancedError,
      message: () => {
        if (isEnhancedError) {
          return `expected ${this.utils.printReceived(
            actual
          )} not to be an enhanced WebSocket proxy error`;
        } else {
          return `expected ${this.utils.printReceived(
            actual
          )} to be an enhanced WebSocket proxy error (one of: ${this.utils.printExpected(
            enhancedErrorNames.join(", ")
          )})`;
        }
      },
    };
  },

  /**
   * Matcher for valid WebSocket URLs
   */
  toBeValidWebSocketUrl(actual: any) {
    if (typeof actual !== "string") {
      throw new Error("Expected a string");
    }

    try {
      const parsed = new URL(actual);
      const isValid = parsed.protocol === "ws:" || parsed.protocol === "wss:";

      return {
        pass: isValid,
        message: () => {
          if (isValid) {
            return `expected ${this.utils.printReceived(
              actual
            )} not to be a valid WebSocket URL`;
          } else {
            return `expected ${this.utils.printReceived(
              actual
            )} to be a valid WebSocket URL (ws:// or wss://)`;
          }
        },
      };
    } catch {
      return {
        pass: false,
        message: () =>
          `expected ${this.utils.printReceived(
            actual
          )} to be a valid WebSocket URL, but it's not a valid URL`,
      };
    }
  },

  /**
   * Matcher for valid port numbers
   */
  toBeValidPort(actual: any) {
    if (typeof actual !== "number") {
      throw new Error("Expected a number");
    }

    const isValid = Number.isInteger(actual) && actual >= 0 && actual <= 65535;

    return {
      pass: isValid,
      message: () => {
        if (isValid) {
          return `expected ${this.utils.printReceived(
            actual
          )} not to be a valid port number`;
        } else {
          return `expected ${this.utils.printReceived(
            actual
          )} to be a valid port number (0-65535)`;
        }
      },
    };
  },

  /**
   * Matcher for enhanced naming conventions
   */
  toFollowEnhancedNamingConventions(actual: any) {
    if (typeof actual !== "object" || actual === null) {
      throw new Error("Expected an object");
    }

    // Check for enhanced naming patterns in property names
    const properties = Object.keys(actual);
    const enhancedPatterns = [
      // WebSocket proxy properties
      /^targetUrl$/,
      /^listenPort$/,
      /^maxConnections$/,
      /^idleTimeout$/,
      /^debug$/,
      /^targetWebSocketUrl$/,
      /^connectionUniqueId$/,
      /^clientRemoteAddress$/,
      /^totalConnectionCount$/,
      /^activeConnectionCount$/,
      /^serverUptimeMilliseconds$/,
      /^averageLatencyMilliseconds$/,
      /^systemMemoryUsage$/,
      /^systemCpuUsage$/,
      /^WebSocketProxy.*Error$/,
      // Dashboard-specific properties
      /^dashboardTitle$/,
      /^totalDashboardCount$/,
      /^activeDashboardCount$/,
      /^dashboardGridColumns$/,
      /^enableRealTimeUpdates$/,
      /^refreshIntervalMilliseconds$/,
      /^componentId$/,
      /^componentTitle$/,
      /^componentDescription$/,
      /^componentSize$/,
      /^componentStatus$/,
    ];

    const hasEnhancedNaming = properties.some((prop) =>
      enhancedPatterns.some((pattern) => pattern.test(prop))
    );

    return {
      pass: hasEnhancedNaming,
      message: () => {
        if (hasEnhancedNaming) {
          return `expected ${this.utils.printReceived(
            actual
          )} not to follow enhanced naming conventions`;
        } else {
          return `expected ${this.utils.printReceived(
            actual
          )} to follow enhanced naming conventions (properties like targetUrl, maxConnections, etc.)`;
        }
      },
    };
  },

  /**
   * Matcher for enhanced DOM properties
   */
  toHaveEnhancedDOMProperties(actual: any) {
    if (!actual || typeof actual !== "object") {
      throw new Error("Expected a DOM element");
    }

    // Check for data-component-name attribute
    const hasComponentName =
      actual.getAttribute && actual.getAttribute("data-component-name");

    return {
      pass: !!hasComponentName,
      message: () => {
        if (hasComponentName) {
          return `expected ${this.utils.printReceived(
            actual
          )} not to have enhanced DOM properties`;
        } else {
          return `expected ${this.utils.printReceived(
            actual
          )} to have enhanced DOM properties (data-component-name attribute)`;
        }
      },
    };
  },

  /**
   * Matcher for enhanced dashboard properties
   */
  toHaveEnhancedDashboardProperties(actual: any) {
    if (!actual || typeof actual !== "object") {
      throw new Error("Expected a dashboard element");
    }

    // Check for required dashboard structure using querySelector
    const hasTitle = actual.querySelector(".dashboard-title");
    const hasDescription = actual.querySelector(".dashboard-description");

    // Check for icon and meta in children (since they might be flattened)
    const children = actual.children || [];
    const childrenArray = Array.from(children);
    const hasIcon = childrenArray.some(
      (child) =>
        (child as any)._className?.includes("dashboard-icon") ||
        (child as any)._className?.includes("fa-") ||
        actual.querySelector(".dashboard-icon")
    );
    const hasMeta = childrenArray.some(
      (child) =>
        (child as any)._className?.includes("dashboard-meta") ||
        (child as any)._className?.includes("dashboard-status") ||
        (child as any)._className?.includes("dashboard-size") ||
        actual.querySelector(".dashboard-meta")
    );

    // Consider it valid if we have the main components
    const hasAllProperties = hasTitle && hasDescription && hasIcon && hasMeta;

    return {
      pass: hasAllProperties,
      message: () => {
        if (hasAllProperties) {
          return `expected ${this.utils.printReceived(
            actual
          )} not to have enhanced dashboard properties`;
        } else {
          return `expected ${this.utils.printReceived(
            actual
          )} to have enhanced dashboard properties (title, icon, description, meta)`;
        }
      },
    };
  },

  /**
   * Matcher for valid dashboard title
   */
  toBeValidDashboardTitle(actual: any) {
    if (typeof actual !== "string") {
      throw new Error("Expected a string");
    }

    const isValidTitle =
      actual.length > 0 &&
      actual.length <= 100 &&
      /^[A-Za-z0-9\s\-]+$/.test(actual);

    return {
      pass: isValidTitle,
      message: () => {
        if (isValidTitle) {
          return `expected ${this.utils.printReceived(
            actual
          )} not to be a valid dashboard title`;
        } else {
          return `expected ${this.utils.printReceived(
            actual
          )} to be a valid dashboard title (1-100 characters, alphanumeric, spaces, and hyphens only)`;
        }
      },
    };
  },

  /**
   * Matcher for valid dashboard count
   */
  toBeValidDashboardCount(actual: any) {
    if (typeof actual !== "number") {
      throw new Error("Expected a number");
    }

    const isValidCount = actual >= 0 && actual <= 50;

    return {
      pass: isValidCount,
      message: () => {
        if (isValidCount) {
          return `expected ${this.utils.printReceived(
            actual
          )} not to be a valid dashboard count`;
        } else {
          return `expected ${this.utils.printReceived(
            actual
          )} to be a valid dashboard count (0-50)`;
        }
      },
    };
  },

  /**
   * Matcher for valid refresh interval
   */
  toBeValidRefreshInterval(actual: any) {
    if (typeof actual !== "number") {
      throw new Error("Expected a number");
    }

    const isValidInterval = actual >= 1000 && actual <= 60000; // 1 second to 1 minute

    return {
      pass: isValidInterval,
      message: () => {
        if (isValidInterval) {
          return `expected ${this.utils.printReceived(
            actual
          )} not to be a valid refresh interval`;
        } else {
          return `expected ${this.utils.printReceived(
            actual
          )} to be a valid refresh interval (1000-60000ms)`;
        }
      },
    };
  },
});

// Export for use in other test files
export { expect };

// Type exports for TypeScript
export type { EnhancedNamingMatchers };
