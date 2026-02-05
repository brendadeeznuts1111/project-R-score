// packages/testing/src/timeout-demo.test.ts
// Demonstration of timeout configuration

import { test, expect } from "bun:test";

// Test that uses default timeout from config
test("uses default timeout", async () => {
    console.log("⏱️ This test uses the default timeout from configuration");

    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(true).toBe(true);
});

// Test that overrides the default timeout
test("custom timeout", async () => {
    console.log("⏱️ This test overrides the default timeout with 30 seconds");

    // Simulate some work that might take longer
    await new Promise(resolve => setTimeout(resolve, 200));

    expect(true).toBe(true);
}, 30000); // 30 seconds custom timeout

// Test that would timeout with short configuration
test("potential timeout test", async () => {
    console.log("⏱️ This test demonstrates timeout behavior");

    // This would fail if timeout was set to 5 seconds
    const startTime = Date.now();

    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 1000));

    const duration = Date.now() - startTime;
    console.log(`   Test completed in ${duration}ms`);

    expect(duration).toBeGreaterThan(500);
}, 5000); // 5 second timeout for this specific test

// Test with very short timeout to demonstrate timeout failure
test("very short timeout", async () => {
    console.log("⏱️ This test will timeout if configured too low");

    // Sleep longer than expected timeout
    await new Promise(resolve => setTimeout(resolve, 2000));

    expect(true).toBe(true);
}, 1000); // 1 second - this will timeout
