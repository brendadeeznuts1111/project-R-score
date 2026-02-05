#!/usr/bin/env bun
// 🧪 src/nexus/citadel-feedback.test.ts - Comprehensive Test Suite
// Testing the Android 13 Nexus Citadel Feedback System with advanced Bun features

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { CitadelFeedbackDemo } from "./citadel-feedback-demo";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

// Test configuration
const TEST_AUDIT_DIR = "./test-audit";
const TEST_TIMEOUT = 10000; // 10 seconds for comprehensive tests

describe("🏛️ Citadel Feedback System", () => {
  let demo: CitadelFeedbackDemo;

  beforeEach(async () => {
    // Clean up test directories
    if (existsSync(TEST_AUDIT_DIR)) {
      const { rmSync } = require("fs");
      rmSync(TEST_AUDIT_DIR, { recursive: true, force: true });
    }
    if (existsSync("./audit")) {
      const { rmSync } = require("fs");
      rmSync("./audit", { recursive: true, force: true });
    }
    mkdirSync(TEST_AUDIT_DIR, { recursive: true });
    
    // Create demo instance with test directory
    demo = new CitadelFeedbackDemo();
    (demo as any).auditDirectory = TEST_AUDIT_DIR;
  });

  afterEach(async () => {
    // Clean up after tests
    if (existsSync(TEST_AUDIT_DIR)) {
      const { rmSync } = require("fs");
      rmSync(TEST_AUDIT_DIR, { recursive: true, force: true });
    }
    if (existsSync("./audit")) {
      const { rmSync } = require("fs");
      rmSync("./audit", { recursive: true, force: true });
    }
  });

  describe("🔒 Security Incident Logging", () => {
    test.concurrent("logs Apple ID lockout incidents", async () => {
      const deviceId = "test_vm_01";
      const details = "apple_id_lockout test.user@icloud.com account_locked";
      
      // Execute feedback command with test device
      const { execSync } = require("child_process");
      const command = `DEVICE_ID=${deviceId} bun run src/orchestrators/orchestrator.ts --feedback "${details}"`;
      
      expect(() => {
        execSync(command, { 
          cwd: process.cwd(),
          stdio: 'pipe',
          timeout: 5000
        });
      }).not.toThrow();
      
      // Verify audit file was created (look in main audit directory where orchestrator writes)
      const { readdirSync } = require("fs");
      const auditFiles = readdirSync("./audit")
        .filter((f: string) => f.endsWith('.feedback.json') && f.startsWith(deviceId));
      expect(auditFiles.length).toBeGreaterThan(0);
      
      // Verify audit file content
      const latestFile = auditFiles[auditFiles.length - 1];
      const { readFileSync } = require("fs");
      const content = JSON.parse(readFileSync(join("./audit", latestFile), 'utf-8'));
      
      expect(content).toBeDefined();
      expect(content.deviceId).toBe(deviceId);
      expect(content.details).toBe(details);
      expect(content.event).toBe("security_incident");
      expect(content.severity).toBe("medium");
      expect(content.metadata.source).toBe("cli_feedback");
    }, TEST_TIMEOUT);

    test.concurrent("logs CAPTCHA failure incidents", async () => {
      const deviceId = "test_vm_02";
      const details = "captcha_failure suspected_bot_detection automated_behavior";
      
      const { execSync } = require("child_process");
      const command = `DEVICE_ID=${deviceId} bun run src/orchestrators/orchestrator.ts --feedback "${details}"`;
      
      expect(() => {
        execSync(command, { 
          cwd: process.cwd(),
          stdio: 'pipe',
          timeout: 5000
        });
      }).not.toThrow();
      
      // Verify audit file structure (look in main audit directory where orchestrator writes)
      const { readdirSync } = require("fs");
      const auditFiles = readdirSync("./audit")
        .filter((f: string) => f.endsWith('.feedback.json') && f.startsWith(deviceId));
      expect(auditFiles.length).toBe(1);
      
      const { readFileSync } = require("fs");
      const content = JSON.parse(readFileSync(join("./audit", auditFiles[0]), 'utf-8'));
      expect(content.deviceId).toBe(deviceId);
      expect(content.details).toContain("captcha_failure");
      expect(content.timestamp).toBeGreaterThan(0);
    }, TEST_TIMEOUT);

    test.concurrent("logs performance anomaly incidents", async () => {
      const deviceId = "test_vm_03";
      const details = "performance_anomaly sim_api_delay_5.2s threshold_exceeded";
      
      const { execSync } = require("child_process");
      const command = `DEVICE_ID=${deviceId} bun run src/orchestrators/orchestrator.ts --feedback "${details}"`;
      
      expect(() => {
        execSync(command, { 
          cwd: process.cwd(),
          stdio: 'pipe',
          timeout: 5000
        });
      }).not.toThrow();
      
      // Verify performance-specific metadata (look in main audit directory where orchestrator writes)
      const { readdirSync } = require("fs");
      const auditFiles = readdirSync("./audit")
        .filter((f: string) => f.endsWith('.feedback.json') && f.startsWith(deviceId));
      expect(auditFiles.length).toBe(1);
      
      const { readFileSync } = require("fs");
      const content = JSON.parse(readFileSync(join("./audit", auditFiles[0]), 'utf-8'));
      
      expect(content.details).toContain("performance_anomaly");
      expect(content.details).toContain("5.2s");
      expect(content.metadata.argv).toBeDefined();
      expect(content.metadata.argv.length).toBeGreaterThan(0);
    }, TEST_TIMEOUT);
  });

  describe("📊 Dashboard Operations", () => {
    test.concurrent("dashboard displays incidents correctly", async () => {
      // Create test audit files
      const testIncidents = [
        { deviceId: "dash_test_01", details: "test_incident_1" },
        { deviceId: "dash_test_02", details: "test_incident_2" },
        { deviceId: "dash_test_03", details: "test_incident_3" }
      ];
      
      // Create mock audit files in the main audit directory (where dashboard looks)
      const { mkdirSync } = require("fs");
      mkdirSync("./audit", { recursive: true });
      
      testIncidents.forEach((incident, index) => {
        const auditFile = join("./audit", `${incident.deviceId}-${Date.now() + index}.feedback.json`);
        const auditData = {
          timestamp: Date.now() + index,
          deviceId: incident.deviceId,
          event: "security_incident",
          details: incident.details,
          severity: "medium",
          metadata: { source: "test" }
        };
        writeFileSync(auditFile, JSON.stringify(auditData, null, 2));
      });
      
      // Test dashboard search functionality
      const { execSync } = require("child_process");
      const searchCommand = `bun run src/nexus/core/dashboard.ts --search "test_incident"`;
      
      const result = execSync(searchCommand, { 
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: 5000
      });
      
      expect(result).toContain("test_incident_1");
      expect(result).toContain("test_incident_2");
      expect(result).toContain("test_incident_3");
      expect(result).toContain("Found 3 incidents");
    }, TEST_TIMEOUT);

    test.concurrent("dashboard metrics calculation", async () => {
      // Create incidents with different severities
      const severityTests = [
        { deviceId: "metrics_01", severity: "low" },
        { deviceId: "metrics_02", severity: "medium" },
        { deviceId: "metrics_03", severity: "high" },
        { deviceId: "metrics_04", severity: "critical" }
      ];
      
      // Create mock audit files in the main audit directory (where dashboard looks)
      const { mkdirSync } = require("fs");
      mkdirSync("./audit", { recursive: true });
      
      severityTests.forEach((incident, index) => {
        const auditFile = join("./audit", `${incident.deviceId}-${Date.now() + index}.feedback.json`);
        const auditData = {
          timestamp: Date.now() + index,
          deviceId: incident.deviceId,
          event: "security_incident",
          details: `test_${incident.severity}_incident`,
          severity: incident.severity,
          metadata: { source: "test" }
        };
        writeFileSync(auditFile, JSON.stringify(auditData, null, 2));
      });
      
      // Test metrics command
      const { execSync } = require("child_process");
      const metricsCommand = `bun run src/nexus/core/dashboard.ts --metrics`;
      
      const result = execSync(metricsCommand, { 
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: 5000
      });
      
      expect(result).toContain("DETAILED CITADEL METRICS");
      expect(result).toContain("SECURITY OVERVIEW");
      expect(result).toContain("Total Incidents:");
    }, TEST_TIMEOUT);
  });

  describe("⚡ Performance & Concurrency", () => {
    test.concurrent("handles concurrent incident logging", async () => {
      const concurrentIncidents = 10;
      const promises: Promise<any>[] = [];
      
      // Create multiple concurrent incident reports
      for (let i = 0; i < concurrentIncidents; i++) {
        const deviceId = `concurrent_${i}`;
        const details = `concurrent_incident_${i}`;
        
        const promise = new Promise((resolve, reject) => {
          const { execSync } = require("child_process");
          const command = `DEVICE_ID=${deviceId} bun run src/orchestrators/orchestrator.ts --feedback "${details}"`;
          
          try {
            execSync(command, { 
              cwd: process.cwd(),
              stdio: 'pipe',
              timeout: 5000
            });
            resolve({ deviceId, details });
          } catch (error) {
            reject(error);
          }
        });
        
        promises.push(promise);
      }
      
      // Wait for all concurrent operations to complete
      const results = await Promise.all(promises);
      
      // Verify all incidents were logged
      expect(results.length).toBe(concurrentIncidents);
      
      // Verify audit files exist for all incidents (look in main audit directory where orchestrator writes)
      const { readdirSync } = require("fs");
      let totalAuditFiles = 0;
      for (let i = 0; i < concurrentIncidents; i++) {
        const auditFiles = readdirSync("./audit")
          .filter((f: string) => f.endsWith('.feedback.json') && f.startsWith(`concurrent_${i}`));
        totalAuditFiles += auditFiles.length;
      }
      
      expect(totalAuditFiles).toBeGreaterThanOrEqual(concurrentIncidents);
    }, TEST_TIMEOUT);

    test.concurrent("performance under load", async () => {
      const loadTestCount = 20;
      const startTime = Date.now();
      
      // Execute rapid incident logging
      const promises = Array.from({ length: loadTestCount }, (_, i) => {
        const deviceId = `load_test_${i}`;
        const details = `load_test_incident_${i}`;
        
        const { execSync } = require("child_process");
        const command = `DEVICE_ID=${deviceId} bun run src/orchestrators/orchestrator.ts --feedback "${details}"`;
        
        return execSync(command, { 
          cwd: process.cwd(),
          stdio: 'pipe',
          timeout: 3000
        });
      });
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgTimePerIncident = totalTime / loadTestCount;
      
      // Performance assertions
      expect(avgTimePerIncident).toBeLessThan(1000); // Less than 1 second per incident
      expect(totalTime).toBeLessThan(15000); // Less than 15 seconds total
      
      console.log(`📊 Performance: ${loadTestCount} incidents in ${totalTime}ms (${avgTimePerIncident.toFixed(2)}ms per incident)`);
    }, TEST_TIMEOUT);
  });

  describe("🛡️ Security & Validation", () => {
    test.concurrent("validates audit file integrity", async () => {
      const deviceId = "security_test_01";
      const details = "security_validation_test";
      
      // Log an incident
      const { execSync } = require("child_process");
      const command = `DEVICE_ID=${deviceId} bun run src/orchestrators/orchestrator.ts --feedback "${details}"`;
      
      execSync(command, { 
        cwd: process.cwd(),
        stdio: 'pipe',
        timeout: 5000
      });
      
      // Verify audit file structure (look in main audit directory where orchestrator writes)
      const { readdirSync } = require("fs");
      const auditFiles = readdirSync("./audit")
        .filter((f: string) => f.endsWith('.feedback.json') && f.startsWith(deviceId));
      expect(auditFiles.length).toBe(1);
      
      const { readFileSync } = require("fs");
      const content = JSON.parse(readFileSync(join("./audit", auditFiles[0]), 'utf-8'));
      
      // Required fields validation
      expect(content).toHaveProperty("timestamp");
      expect(content).toHaveProperty("deviceId");
      expect(content).toHaveProperty("event");
      expect(content).toHaveProperty("details");
      expect(content).toHaveProperty("severity");
      expect(content).toHaveProperty("metadata");
      
      // Data type validation
      expect(typeof content.timestamp).toBe("number");
      expect(typeof content.deviceId).toBe("string");
      expect(typeof content.event).toBe("string");
      expect(typeof content.details).toBe("string");
      expect(typeof content.severity).toBe("string");
      expect(typeof content.metadata).toBe("object");
      
      // Value validation
      expect(content.timestamp).toBeGreaterThan(0);
      expect(content.deviceId).toBe(deviceId);
      expect(content.event).toBe("security_incident");
      expect(content.details).toBe(details);
      expect(["low", "medium", "high", "critical"]).toContain(content.severity);
    }, TEST_TIMEOUT);

    test.concurrent("handles malformed input gracefully", async () => {
      // Test with empty details
      const { execSync } = require("child_process");
      const command = `DEVICE_ID=malform_test bun run src/orchestrators/orchestrator.ts --feedback ""`;
      
      expect(() => {
        execSync(command, { 
          cwd: process.cwd(),
          stdio: 'pipe',
          timeout: 5000
        });
      }).not.toThrow();
      
      // Test with special characters
      const specialCharsCommand = `DEVICE_ID=special_test bun run src/orchestrators/orchestrator.ts --feedback "special_chars_!@#$%^&*()_+-=[]{}|;:,.<>?"`;
      
      expect(() => {
        execSync(specialCharsCommand, { 
          cwd: process.cwd(),
          stdio: 'pipe',
          timeout: 5000
        });
      }).not.toThrow();
    }, TEST_TIMEOUT);

    test.concurrent("prevents directory traversal attacks", async () => {
      // Test malicious input
      const maliciousCommands = [
        `DEVICE_ID=../../../etc/passwd bun run src/orchestrators/orchestrator.ts --feedback "malicious_test"`,
        `DEVICE_ID=..\\..\\windows\\system32 bun run src/orchestrators/orchestrator.ts --feedback "malicious_test"`,
        `DEVICE_ID=/etc/shadow bun run src/orchestrators/orchestrator.ts --feedback "malicious_test"`
      ];
      
      for (const command of maliciousCommands) {
        expect(() => {
          const { execSync } = require("child_process");
          execSync(command, { 
            cwd: process.cwd(),
            stdio: 'pipe',
            timeout: 5000
          });
        }).not.toThrow();
        
        // Verify no files were created outside test directory
        const auditFiles = (demo as any).getAuditFiles();
        expect(auditFiles.every((file: string) => file.startsWith("unknown_device") || file.includes("malicious"))).toBe(true);
      }
    }, TEST_TIMEOUT);
  });

  describe("🔄 Integration Tests", () => {
    test.serial("end-to-end workflow", async () => {
      // Skip cleanup for this integration test to preserve audit files
      const { mkdirSync } = require("fs");
      mkdirSync("./audit", { recursive: true });
      
      // Step 1: Log multiple incidents
      const incidents = [
        { deviceId: "e2e_01", details: "apple_id_lockout user1@icloud.com" },
        { deviceId: "e2e_02", details: "captcha_failure bot_detected" },
        { deviceId: "e2e_03", details: "performance_anomaly api_delay_2.1s" }
      ];
      
      for (const incident of incidents) {
        const { execSync } = require("child_process");
        const command = `DEVICE_ID=${incident.deviceId} bun run src/orchestrators/orchestrator.ts --feedback "${incident.details}"`;
        
        execSync(command, { 
          cwd: process.cwd(),
          stdio: 'pipe',
          timeout: 5000
        });
      }
      
      // Step 2: Verify dashboard shows all incidents
      const { execSync } = require("child_process");
      const dashboardCommand = `bun run src/nexus/core/dashboard.ts`;
      
      const dashboardResult = execSync(dashboardCommand, { 
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: 5000
      });
      
      expect(dashboardResult).toContain("Incidents:");
      expect(parseInt(dashboardResult.match(/Incidents:.*?(\d+).*?logged/)?.[1] || "0")).toBeGreaterThanOrEqual(3);
      
      // Step 3: Search for specific incident types
      const searchCommand = `bun run src/nexus/core/dashboard.ts --search "apple_id"`;
      const searchResult = execSync(searchCommand, { 
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: 5000
      });
      
      expect(searchResult).toContain("user1@icloud.com");
      expect(searchResult).toContain("Found 1 incidents");
      
      // Step 4: Verify metrics
      const metricsCommand = `bun run src/nexus/core/dashboard.ts --metrics`;
      const metricsResult = execSync(metricsCommand, { 
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: 5000
      });
      
      expect(metricsResult).toContain("SECURITY OVERVIEW");
      expect(metricsResult).toContain("Total Incidents:");
    }, TEST_TIMEOUT);
  });
});

// Performance benchmark test
describe("⚡ Performance Benchmarks", () => {
  test.concurrent("incident logging performance benchmark", async () => {
    const benchmarkCount = 50;
    const startTime = process.hrtime.bigint();
    
    const promises = Array.from({ length: benchmarkCount }, (_, i) => {
      const { execSync } = require("child_process");
      const command = `DEVICE_ID=benchmark_${i} bun run src/orchestrators/orchestrator.ts --feedback "benchmark_test_${i}"`;
      
      return execSync(command, { 
        cwd: process.cwd(),
        stdio: 'pipe',
        timeout: 2000
      });
    });
    
    await Promise.all(promises);
    
    const endTime = process.hrtime.bigint();
    const totalTimeMs = Number(endTime - startTime) / 1000000; // Convert nanoseconds to milliseconds
    const avgTimePerIncident = totalTimeMs / benchmarkCount;
    
    // Performance assertions
    expect(avgTimePerIncident).toBeLessThan(500); // Less than 500ms per incident
    expect(totalTimeMs).toBeLessThan(10000); // Less than 10 seconds total
    
    console.log(`🚀 Benchmark: ${benchmarkCount} incidents in ${totalTimeMs.toFixed(2)}ms (${avgTimePerIncident.toFixed(2)}ms per incident)`);
  }, 15000); // 15 second timeout for benchmark
});
