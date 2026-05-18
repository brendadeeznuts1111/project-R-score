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
    expect(screen.getByText("IPFoxy")).toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Proxies")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("displays overview page by default", () => {
    render(<App />);

    // Check if overview page elements are present
    expect(screen.getByText("Dashboard Overview")).toBeInTheDocument();
    expect(screen.getByText("Total Proxies")).toBeInTheDocument();
    expect(screen.getByText("Active Proxies")).toBeInTheDocument();
  });
});
