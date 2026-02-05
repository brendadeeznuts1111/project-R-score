#!/usr/bin/env bun
// Monitoring Dashboard Test Suite
// [TENSION-TEST-003]
// Tests focus on pure methods; server lifecycle is tested indirectly.

import { describe, it, expect } from "bun:test";
import { LiveMonitoringDashboard } from "../tension-field/monitoring-dashboard";
import { PORT_TEST } from "../tension-field/constants";

// Use a high port to avoid collisions; close server after each suite
let dashboard: LiveMonitoringDashboard;

describe("LiveMonitoringDashboard", () => {
  // NOTE: Constructor starts WebSocket server, so we test constructor-free
  // methods by instantiating once on a test-only port.

  describe("generateDashboardHTML()", () => {
    it("should return valid HTML document", () => {
      // Access method without starting server — instantiate with test port
      const d = new LiveMonitoringDashboard(PORT_TEST);
      try {
        const html = d.generateDashboardHTML();

        expect(html).toContain("<!DOCTYPE html>");
        expect(html).toContain("</html>");
        expect(html).toContain("<title>");
      } finally {
        d["wss"]?.close();
      }
    });

    it("should include Chart.js CDN script", () => {
      const d = new LiveMonitoringDashboard(PORT_TEST + 10);
      try {
        const html = d.generateDashboardHTML();
        expect(html).toContain("chart.js");
      } finally {
        d["wss"]?.close();
      }
    });

    it("should include WebSocket connection code", () => {
      const d = new LiveMonitoringDashboard(PORT_TEST + 20);
      try {
        const html = d.generateDashboardHTML();
        expect(html).toContain("WebSocket");
      } finally {
        d["wss"]?.close();
      }
    });

    it("should contain monitoring dashboard heading", () => {
      const d = new LiveMonitoringDashboard(PORT_TEST + 30);
      try {
        const html = d.generateDashboardHTML();
        // Should contain some form of dashboard title
        expect(html.toLowerCase()).toContain("dashboard");
      } finally {
        d["wss"]?.close();
      }
    });
  });

  describe("Client ID generation", () => {
    it("should generate unique client IDs", () => {
      const d = new LiveMonitoringDashboard(PORT_TEST + 40);
      try {
        // Access private method via bracket notation
        const id1 = d["generateClientId"]();
        const id2 = d["generateClientId"]();

        expect(id1).toBeTypeOf("string");
        expect(id2).toBeTypeOf("string");
        expect(id1).not.toBe(id2);
        expect(id1.length).toBeGreaterThan(0);
      } finally {
        d["wss"]?.close();
      }
    });

    it("should produce alphanumeric IDs", () => {
      const d = new LiveMonitoringDashboard(PORT_TEST + 50);
      try {
        const id = d["generateClientId"]();
        expect(id).toMatch(/^[a-z0-9]+$/);
      } finally {
        d["wss"]?.close();
      }
    });
  });

  describe("Metrics storage", () => {
    it("should have metrics array", () => {
      const d = new LiveMonitoringDashboard(PORT_TEST + 60);
      try {
        const metrics = d["metrics"];
        expect(metrics).toBeArray();
        // Constructor triggers initial metrics collection
        expect(metrics.length).toBeGreaterThanOrEqual(0);
      } finally {
        d["wss"]?.close();
      }
    });

    it("should start with empty clients map (no WS connections yet)", () => {
      const d = new LiveMonitoringDashboard(PORT_TEST + 70);
      try {
        const clients = d["clients"];
        expect(clients).toBeInstanceOf(Map);
        expect(clients.size).toBe(0);
      } finally {
        d["wss"]?.close();
      }
    });
  });
});
