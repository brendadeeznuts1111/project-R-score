// Serial Test Demonstration without .only
// Shows test.serial behavior and randomization

import { test, expect, describe } from "bun:test";

describe.concurrent("Mixed Execution Pattern", () => {

    let executionLog: string[] = [];

    test.concurrent("concurrent test A", async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        executionLog.push("A-concurrent");
        console.info("🔄 Concurrent test A completed");
        expect(executionLog).toContain("A-concurrent");
    });

    test.concurrent("concurrent test B", async () => {
        await new Promise(resolve => setTimeout(resolve, 40));
        executionLog.push("B-concurrent");
        console.info("🔄 Concurrent test B completed");
        expect(executionLog).toContain("B-concurrent");
    });

    test.concurrent("concurrent test C", async () => {
        await new Promise(resolve => setTimeout(resolve, 60));
        executionLog.push("C-concurrent");
        console.info("🔄 Concurrent test C completed");
        expect(executionLog).toContain("C-concurrent");
    });

    // This will run AFTER all concurrent tests complete
    test.serial("sequential validation", () => {
        console.info("📋 Serial test running after concurrent tests");
        console.info("📊 Execution log:", executionLog);

        // Verify all concurrent tests completed
        expect(executionLog).toContain("A-concurrent");
        expect(executionLog).toContain("B-concurrent");
        expect(executionLog).toContain("C-concurrent");
        expect(executionLog.length).toBe(3);

        console.info("✅ Serial validation completed");
    });

    // More concurrent tests after the serial one
    test.concurrent("concurrent test D", async () => {
        await new Promise(resolve => setTimeout(resolve, 30));
        executionLog.push("D-concurrent");
        console.info("🔄 Concurrent test D completed");
        expect(executionLog).toContain("D-concurrent");
    });

    test.concurrent("concurrent test E", async () => {
        await new Promise(resolve => setTimeout(resolve, 35));
        executionLog.push("E-concurrent");
        console.info("🔄 Concurrent test E completed");
        expect(executionLog).toContain("E-concurrent");
    });

    // Final serial test
    test.serial("final cleanup", () => {
        console.info("📋 Final serial cleanup");

        // Verify all tests completed
        expect(executionLog.length).toBe(5);
        expect(executionLog).toContain("D-concurrent");
        expect(executionLog).toContain("E-concurrent");

        // Reset for next run
        executionLog = [];
        console.info("✅ All tests completed and cleaned up");
    });
});

describe("Chained Qualifiers Demo", () => {

    // Demonstrate test.failing.each
    test.failing.each([
        { scenario: "timeout", error: "Connection timeout" },
        { scenario: "auth", error: "Authentication failed" },
        { scenario: "rate-limit", error: "Rate limit exceeded" }
    ])("error handling for %s", ({ scenario, error }) => {
        // These tests are expected to fail
        console.info(`❌ Expected failure for ${scenario}: ${error}`);
        throw new Error(`${scenario}: ${error}`);
    });

    // Demonstrate test.skip.each
    test.skip.each([
        "deprecated-endpoint-1",
        "deprecated-endpoint-2",
        "deprecated-endpoint-3"
    ])("skipped deprecated endpoint %s", (endpoint) => {
        // These tests will be skipped
        console.info(`⏭️ Skipping ${endpoint}`);
        expect(endpoint).toBeDefined();
    });
});

describe("Randomization-Ready Tests", () => {

    let orderLog: string[] = [];

    test("first operation", () => {
        orderLog.push("first");
        expect(orderLog.length).toBe(1);
    });

    test("second operation", () => {
        orderLog.push("second");
        expect(orderLog.length).toBe(2);
    });

    test("third operation", () => {
        orderLog.push("third");
        expect(orderLog.length).toBe(3);
    });

    test("fourth operation", () => {
        orderLog.push("fourth");
        expect(orderLog.length).toBe(4);
    });

    test.serial("order verification", () => {
        console.info("🎲 Random execution order:", orderLog.join(" -> "));
        expect(orderLog).toHaveLength(4);
        expect(new Set(orderLog).size).toBe(4); // All unique

        // Reset for next random run
        orderLog = [];
    });
});
