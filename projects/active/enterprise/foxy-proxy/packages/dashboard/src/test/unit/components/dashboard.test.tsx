import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import App from "../../../App";

// Mock the API to avoid actual API calls
vi.mock("../../utils/api", () => ({
  default: class MockAPI {
    async getMockData() {
      return {
        account: {
          id: "123",
          email: "test@example.com",
          balance: "100.00",
          status: "active",
          total_proxies: 5,
          active_proxies: 3,
          expired_proxies: 2,
          traffic_used: 1000,
          traffic_limit: 10000
        },
        proxies: [],
        stats: {
          total_proxies: 5,
          active_proxies: 3,
          expired_proxies: 2,
          expiring_soon: 1,
          traffic_used: 1000,
          traffic_limit: 10000,
          countries: [],
          types: []
        },
        recent_orders: []
      };
    }
  }
}));

describe("Dashboard", () => {
  it("renders the dashboard layout", () => {
    render(<App />);

    // Check if main navigation elements are present
    expect(screen.getAllByText("IPFoxy").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Overview").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Proxies").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Analytics").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Settings").length).toBeGreaterThan(0);
  });

  it("displays overview page by default", () => {
    render(<App />);

    // Check if overview page elements are present
    expect(screen.getAllByText("Dashboard Overview").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Total Proxies").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Active Proxies").length).toBeGreaterThan(0);
  });
});
