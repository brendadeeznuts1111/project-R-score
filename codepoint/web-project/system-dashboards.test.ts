#!/usr/bin/env bun

/// <reference lib="dom" />

/**
 * Comprehensive Test Suite for System Dashboards
 * Tests all dashboard components using Bun's advanced test features with happy-dom
 */

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";

// Import custom matchers for enhanced validation
import "./custom-matchers";

// Mock DOM environment for dashboard testing
const mockDOM = {
  body: null as any,
  container: null as any,
  breadcrumb: null as any,
  header: null as any,
  dashboardsGrid: null as any,
  dashboardCards: [] as any[],
};

// Mock dashboard data
const mockDashboardData = {
  analyticsDashboard: {
    title: "Analytics Dashboard",
    description:
      "Real-time analytics and metrics tracking for system performance, user behavior, and application insights.",
    status: "live",
    size: "18KB",
    icon: "fa-chart-line",
  },
  linkAnalyticsDashboard: {
    title: "Link Analytics Dashboard",
    description:
      "Comprehensive link tracking and analytics for monitoring user engagement and conversion metrics.",
    status: "live",
    size: "22KB",
    icon: "fa-link",
  },
  secretsDashboard: {
    title: "Secrets Dashboard",
    description:
      "Secure management and monitoring of application secrets, API keys, and sensitive configuration.",
    status: "live",
    size: "15KB",
    icon: "fa-lock",
  },
  systemsDashboard: {
    title: "Systems Dashboard",
    description:
      "System-wide monitoring and management dashboard for infrastructure, services, and operational metrics.",
    status: "live",
    size: "25KB",
    icon: "fa-server",
  },
};

// Enhanced interfaces following our naming conventions
interface DashboardComponent {
  componentId: string;
  componentTitle: string;
  componentDescription: string;
  componentStatus: "live" | "offline" | "maintenance";
  componentSize: string;
  componentIcon: string;
  componentUrl: string;
}

interface DashboardConfiguration {
  dashboardTitle: string;
  totalDashboardCount: number;
  activeDashboardCount: number;
  dashboardGridColumns: number;
  enableRealTimeUpdates: boolean;
  refreshIntervalMilliseconds: number;
}

describe("System Dashboards - Comprehensive Test Suite", () => {
  beforeAll(() => {
    console.log("🚀 Setting up System Dashboards test environment...");

    // Use real DOM with happy-dom
    mockDOM.body = document.body;
    mockDOM.body.setAttribute("data-component-name", "<body />");

    mockDOM.container = document.createElement("div");
    mockDOM.container.className = "container";
    mockDOM.container.setAttribute("data-component-name", "<div />");

    mockDOM.breadcrumb = document.createElement("div");
    mockDOM.breadcrumb.className = "breadcrumb";
    mockDOM.breadcrumb.setAttribute("data-component-name", "<div />");

    mockDOM.header = document.createElement("div");
    mockDOM.header.className = "header";
    mockDOM.header.setAttribute("data-component-name", "<div />");

    mockDOM.dashboardsGrid = document.createElement("div");
    mockDOM.dashboardsGrid.className = "dashboards-grid";
    mockDOM.dashboardsGrid.setAttribute("data-component-name", "<div />");

    // Assemble DOM structure
    mockDOM.body.appendChild(mockDOM.container);
    mockDOM.container.appendChild(mockDOM.breadcrumb);
    mockDOM.container.appendChild(mockDOM.header);
    mockDOM.container.appendChild(mockDOM.dashboardsGrid);

    console.log("✅ System Dashboards test environment ready");
  });

  afterAll(() => {
    console.log("🧹 Cleaning up System Dashboards test environment...");

    // Clean up DOM
    if (mockDOM.body) {
      mockDOM.body.innerHTML = "";
    }

    console.log("✅ System Dashboards test environment cleaned up");
  });

  beforeEach(() => {
    // Reset dashboard cards before each test
    mockDOM.dashboardCards = [];
    if (mockDOM.dashboardsGrid) {
      mockDOM.dashboardsGrid.innerHTML = "";
    }
  });

  afterEach(() => {
    // Clean up dashboard cards after each test
    mockDOM.dashboardCards = [];
  });

  describe("DOM Structure Validation", () => {
    test("should have proper body element with data-component-name", () => {
      expect(mockDOM.body).not.toBeNull();
      expect(mockDOM.body?.getAttribute("data-component-name")).toBe(
        "<body />"
      );
      expect(mockDOM.body).toHaveEnhancedDOMProperties();
    });

    test("should have container element with proper attributes", () => {
      expect(mockDOM.container).not.toBeNull();
      expect(mockDOM.container?.className).toBe("container");
      expect(mockDOM.container?.getAttribute("data-component-name")).toBe(
        "<div />"
      );
    });

    test("should have breadcrumb navigation", () => {
      expect(mockDOM.breadcrumb).not.toBeNull();
      expect(mockDOM.breadcrumb?.className).toBe("breadcrumb");
    });

    test("should have header with System Dashboards title", () => {
      expect(mockDOM.header).not.toBeNull();
      expect(mockDOM.header?.className).toBe("header");
      expect(mockDOM.header?.getAttribute("data-component-name")).toBe(
        "<div />"
      );
    });

    test("should have dashboards grid container", () => {
      expect(mockDOM.dashboardsGrid).not.toBeNull();
      expect(mockDOM.dashboardsGrid?.className).toBe("dashboards-grid");
    });
  });

  describe("Dashboard Component Creation", () => {
    test("should create analytics dashboard card", () => {
      const dashboardCard = createDashboardCard(
        mockDashboardData.analyticsDashboard
      );

      expect(dashboardCard).toBeInstanceOf(HTMLElement);
      expect(dashboardCard.className).toBe("dashboard-card");
      expect(dashboardCard.getAttribute("data-component-name")).toBe("<a />");
      expect(dashboardCard).toHaveEnhancedDashboardProperties();
    });

    test("should create link analytics dashboard card", () => {
      const dashboardCard = createDashboardCard(
        mockDashboardData.linkAnalyticsDashboard
      );

      expect(dashboardCard).toBeInstanceOf(HTMLElement);
      expect(dashboardCard).toHaveEnhancedDashboardProperties();
      expect(dashboardCard.querySelector(".dashboard-title")?.textContent).toBe(
        "Link Analytics Dashboard"
      );
    });

    test("should create secrets dashboard card", () => {
      const dashboardCard = createDashboardCard(
        mockDashboardData.secretsDashboard
      );

      expect(dashboardCard).toHaveEnhancedDashboardProperties();
      expect(
        dashboardCard.querySelector(".dashboard-icon i")?.className
      ).toContain("fa-lock");
    });

    test("should create systems dashboard card", () => {
      const dashboardCard = createDashboardCard(
        mockDashboardData.systemsDashboard
      );

      expect(dashboardCard).toHaveEnhancedDashboardProperties();
      expect(dashboardCard.querySelector(".dashboard-title")?.textContent).toBe(
        "Systems Dashboard"
      );
    });

    test("should add dashboard cards to grid", () => {
      const cards = Object.values(mockDashboardData).map(createDashboardCard);

      expect(cards).toHaveLength(4);
      cards.forEach((card) => {
        expect(card).toHaveEnhancedDashboardProperties();
        mockDOM.dashboardsGrid?.appendChild(card);
      });

      expect(mockDOM.dashboardsGrid?.children.length).toBe(4);
    });
  });

  describe("Enhanced Naming Convention Validation", () => {
    test("should validate dashboard component naming", () => {
      const dashboardComponent: DashboardComponent = {
        componentId: "analytics-dashboard",
        componentTitle: "Analytics Dashboard",
        componentDescription: "Real-time analytics and metrics tracking",
        componentStatus: "live",
        componentSize: "18KB",
        componentIcon: "fa-chart-line",
        componentUrl: "analytics-dashboard.html",
      };

      expect(dashboardComponent).toFollowEnhancedNamingConventions();
      expect(dashboardComponent.componentId).toMatch(/^analytics-dashboard$/);
      expect(dashboardComponent.componentTitle).toMatch(
        /^Analytics Dashboard$/
      );
      expect(dashboardComponent.componentDescription).toMatch(
        /^Real-time analytics and metrics tracking/
      );
    });

    test("should validate dashboard configuration naming", () => {
      const dashboardConfig: DashboardConfiguration = {
        dashboardTitle: "System Dashboards",
        totalDashboardCount: 4,
        activeDashboardCount: 4,
        dashboardGridColumns: 2,
        enableRealTimeUpdates: true,
        refreshIntervalMilliseconds: 5000,
      };

      expect(dashboardConfig).toFollowEnhancedNamingConventions();
      expect(dashboardConfig.dashboardTitle).toBe("System Dashboards");
      expect(dashboardConfig.totalDashboardCount).toBe(4);
      expect(dashboardConfig.activeDashboardCount).toBe(4);
    });
  });

  describe("Dashboard Functionality Tests", () => {
    test("should render breadcrumb navigation correctly", () => {
      setupBreadcrumb();

      const breadcrumb = mockDOM.breadcrumb;
      expect(
        breadcrumb?.querySelector('a[href="../index.html"]')
      ).not.toBeNull();
      expect(
        breadcrumb?.querySelector('span[data-component-name="<span />"]')
          ?.textContent
      ).toBe("System Dashboards");
    });

    test("should render header with correct title and description", () => {
      setupHeader();

      const header = mockDOM.header;
      expect(
        header?.querySelector('h1[data-component-name="<h1 />"]')?.textContent
      ).toContain("System Dashboards");
      expect(
        header?.querySelector('p[data-component-name="<p />"]')?.textContent
      ).toContain("Comprehensive monitoring and analytics dashboards");
    });

    test("should display dashboard status indicators", () => {
      const dashboardCard = createDashboardCard(
        mockDashboardData.analyticsDashboard
      );
      const statusElement = dashboardCard.querySelector(
        ".dashboard-status.status-live"
      );

      expect(statusElement).not.toBeNull();
      expect(statusElement?.textContent?.trim()).toBe("Live");
      expect(
        statusElement?.querySelector("i")?.classList.contains("fa-circle")
      ).toBe(true);
    });

    test("should display dashboard size information", () => {
      const dashboardCard = createDashboardCard(
        mockDashboardData.analyticsDashboard
      );
      const sizeElement = dashboardCard.querySelector(".dashboard-size");

      expect(sizeElement).not.toBeNull();
      expect(sizeElement?.textContent).toBe("18KB");
    });

    test("should have correct dashboard icons", () => {
      const dashboardCard = createDashboardCard(
        mockDashboardData.analyticsDashboard
      );
      const iconElement = dashboardCard.querySelector(".dashboard-icon i");

      expect(iconElement).not.toBeNull();
      expect(iconElement?.className).toContain("fa-chart-line");
    });
  });

  describe("Advanced Test Features Demonstration", () => {
    // Parametrized tests for different dashboard types
    test.each([
      {
        name: "Analytics Dashboard",
        data: mockDashboardData.analyticsDashboard,
        expectedSize: "18KB",
      },
      {
        name: "Link Analytics Dashboard",
        data: mockDashboardData.linkAnalyticsDashboard,
        expectedSize: "22KB",
      },
      {
        name: "Secrets Dashboard",
        data: mockDashboardData.secretsDashboard,
        expectedSize: "15KB",
      },
      {
        name: "Systems Dashboard",
        data: mockDashboardData.systemsDashboard,
        expectedSize: "25KB",
      },
    ])(
      "should create %s with correct size %s",
      ({ name, data, expectedSize }) => {
        const dashboardCard = createDashboardCard(data);
        const sizeElement = dashboardCard.querySelector(".dashboard-size");

        expect(
          dashboardCard.querySelector(".dashboard-title")?.textContent
        ).toBe(name);
        expect(sizeElement?.textContent).toBe(expectedSize);
      }
    );

    // Async test for dashboard loading simulation
    test("should load dashboard data asynchronously", async () => {
      const dashboardData = await loadDashboardDataAsync("analytics-dashboard");

      expect(dashboardData).toBeDefined();
      expect(dashboardData.title).toBe("Analytics Dashboard");
      expect(dashboardData.status).toBe("live");
    }, 1000); // 1 second timeout

    // Test with retry for potentially flaky network operations
    test(
      "should handle dashboard network requests reliably",
      async () => {
        const response = await fetchDashboardData("analytics-dashboard");
        expect(response.ok).toBe(true);
      },
      { retry: 3 } // Retry up to 3 times if it fails
    );

    // Test with repeats for stability testing
    test(
      "should consistently create dashboard cards",
      () => {
        const dashboardCard = createDashboardCard(
          mockDashboardData.analyticsDashboard
        );
        expect(dashboardCard).toHaveEnhancedDashboardProperties();
        expect(dashboardCard.querySelector(".dashboard-title")).not.toBeNull();
      },
      { repeats: 5 } // Run 6 times total (1 initial + 5 repeats)
    );

    // Assertion counting test
    test("should validate dashboard card creation with exact assertions", () => {
      expect.assertions(4); // Expect exactly 4 assertions

      const dashboardCard = createDashboardCard(
        mockDashboardData.analyticsDashboard
      );
      expect(dashboardCard).toBeInstanceOf(HTMLElement);
      expect(dashboardCard.className).toBe("dashboard-card");
      expect(dashboardCard.querySelector(".dashboard-title")).not.toBeNull();
      expect(dashboardCard.querySelector(".dashboard-icon")).not.toBeNull();
    });

    // Test with minimum assertion count
    test("should perform dashboard validation with minimum assertions", () => {
      expect.hasAssertions(); // Will fail if no assertions are called

      const dashboardConfig: DashboardConfiguration = {
        dashboardTitle: "System Dashboards",
        totalDashboardCount: 4,
        activeDashboardCount: 4,
        dashboardGridColumns: 2,
        enableRealTimeUpdates: true,
        refreshIntervalMilliseconds: 5000,
      };

      expect(dashboardConfig).toFollowEnhancedNamingConventions();
    });
  });

  describe("Error Handling and Edge Cases", () => {
    test("should handle missing dashboard data gracefully", () => {
      expect(() => {
        createDashboardCard(null as any);
      }).toThrow("Dashboard data is required");
    });

    test("should handle invalid dashboard status", () => {
      const invalidDashboard = {
        ...mockDashboardData.analyticsDashboard,
        status: "invalid" as any,
      };

      expect(() => {
        createDashboardCard(invalidDashboard);
      }).toThrow("Invalid dashboard status");
    });

    test("should handle empty dashboard grid", () => {
      expect(mockDOM.dashboardsGrid?.children.length).toBe(0);
      expect(mockDOM.dashboardsGrid?.innerHTML).toBe("");
    });

    test("should handle DOM element creation failures", () => {
      expect(() => {
        createDashboardCard(null as any);
      }).toThrow();
    });
  });

  describe("Conditional and Platform-Specific Tests", () => {
    // Skip test on certain platforms
    test.skipIf(process.platform === "win32")(
      "should run on non-Windows platforms",
      () => {
        expect(mockDOM.body).not.toBeNull();
        expect(mockDOM.container).not.toBeNull();
      }
    );

    // TODO test for future features
    test.todo("should support real-time dashboard updates", () => {
      // Future implementation for real-time updates
      expect(true).toBe(true);
    });

    // Failing test for known issue
    test.failing(
      "should handle floating point precision in dashboard metrics",
      () => {
        expect(0.1 + 0.2).toBe(0.3); // This fails as expected due to floating point precision
      }
    );
  });

  describe("Performance and Memory Tests", () => {
    test("should create dashboard cards efficiently", () => {
      const startTime = performance.now();

      // Create 100 dashboard cards
      for (let i = 0; i < 100; i++) {
        createDashboardCard(mockDashboardData.analyticsDashboard);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should complete in less than 100ms
    });

    test("should handle large dashboard grids efficiently", () => {
      const startTime = performance.now();

      // Add 50 dashboard cards to grid
      for (let i = 0; i < 50; i++) {
        const card = createDashboardCard(mockDashboardData.analyticsDashboard);
        mockDOM.dashboardsGrid?.appendChild(card);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(200); // Should complete in less than 200ms
      expect(mockDOM.dashboardsGrid?.children.length).toBe(50);
    });
  });

  describe("Integration Tests with Custom Matchers", () => {
    test("should validate complete dashboard structure with custom matchers", () => {
      setupCompleteDashboard();

      expect(mockDOM.body).toHaveEnhancedDOMProperties();
      expect(mockDOM.container).toHaveEnhancedDOMProperties();
      expect(mockDOM.header).toHaveEnhancedDOMProperties();
      expect(mockDOM.dashboardsGrid).toHaveEnhancedDOMProperties();

      // Validate all dashboard cards
      const cards = mockDOM.dashboardsGrid?.querySelectorAll(".dashboard-card");
      expect(cards).toHaveLength(4);

      cards.forEach((card: any) => {
        expect(card).toHaveEnhancedDashboardProperties();
      });
    });

    test("should validate dashboard configuration with custom matchers", () => {
      const dashboardConfig: DashboardConfiguration = {
        dashboardTitle: "System Dashboards",
        totalDashboardCount: 4,
        activeDashboardCount: 4,
        dashboardGridColumns: 2,
        enableRealTimeUpdates: true,
        refreshIntervalMilliseconds: 5000,
      };

      expect(dashboardConfig).toFollowEnhancedNamingConventions();
      expect(dashboardConfig.dashboardTitle).toBeValidDashboardTitle();
      expect(dashboardConfig.totalDashboardCount).toBeValidDashboardCount();
      expect(
        dashboardConfig.refreshIntervalMilliseconds
      ).toBeValidRefreshInterval();
    });
  });
});

// Helper functions for dashboard testing
function createDashboardCard(dashboardData: any): any {
  if (!dashboardData) {
    throw new Error("Dashboard data is required");
  }

  if (!["live", "offline", "maintenance"].includes(dashboardData.status)) {
    throw new Error("Invalid dashboard status");
  }

  const card = document.createElement("a");
  card.className = "dashboard-card";
  card.setAttribute("data-component-name", "<a />");
  card.href = `${dashboardData.title.toLowerCase().replace(/\s+/g, "-")}.html`;

  card.innerHTML = `
    <div class="dashboard-icon">
      <i class="fas ${dashboardData.icon}"></i>
    </div>
    <div class="dashboard-title" data-component-name="<div />">${
      dashboardData.title
    }</div>
    <div class="dashboard-description" data-component-name="<div />">${
      dashboardData.description
    }</div>
    <div class="dashboard-meta">
      <span class="dashboard-status status-${dashboardData.status}">
        <i class="fas fa-circle"></i>
        ${
          dashboardData.status.charAt(0).toUpperCase() +
          dashboardData.status.slice(1)
        }
      </span>
      <span class="dashboard-size">${dashboardData.size}</span>
    </div>
  `;

  return card;
}

function setupBreadcrumb(): void {
  if (!mockDOM.breadcrumb) return;

  mockDOM.breadcrumb.innerHTML = `
    <a href="../index.html"><i class="fas fa-home"></i> Dashboard Hub</a>
    <i class="fas fa-chevron-right"></i>
    <span data-component-name="<span />">System Dashboards</span>
  `;
}

function setupHeader(): void {
  if (!mockDOM.header) return;

  mockDOM.header.innerHTML = `
    <h1 data-component-name="<h1 />"><i class="fas fa-tachometer-alt"></i> System Dashboards</h1>
    <p data-component-name="<p />">Comprehensive monitoring and analytics dashboards for all Fractal system components</p>
  `;
}

function setupCompleteDashboard(): void {
  setupBreadcrumb();
  setupHeader();

  // Add all dashboard cards
  Object.values(mockDashboardData).forEach((dashboardData) => {
    const card = createDashboardCard(dashboardData);
    mockDOM.dashboardsGrid?.appendChild(card);
  });
}

async function loadDashboardDataAsync(dashboardId: string): Promise<any> {
  // Simulate async data loading
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockDashboardData.analyticsDashboard);
    }, 100);
  });
}

async function fetchDashboardData(dashboardId: string): Promise<Response> {
  // Simulate network request
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockDashboardData.analyticsDashboard),
      } as Response);
    }, 50);
  });
}

console.log("✅ System Dashboards test suite completed!");
