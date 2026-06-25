#!/usr/bin/env bun

export {}; // Make this file a module to enable top-level await

/**
 * Time Zone Setting Examples - MAJOR FEATURE!
 *
 * This is a HUGE time saver! Instead of making costly API calls to timezone services,
 * you can handle all timezone operations locally in Bun.
 *
 * TZ + Date = Local timezone handling without external APIs
 * - No more calling timezone API services
 * - No more timezone conversion libraries with dependencies
 * - Direct Date() objects work in any timezone you specify
 * - Perfect for server-side rendering with timezone-aware dates
 */

console.info("🕒 Time Zone Setting - A Major Feature That Saves API Calls!\n");
console.info("🌍 TZ + Date = Local timezone handling without external APIs\n");

// Example 1: Display current time zone behavior
console.info("1. Current system time zone behavior:");

const date1 = new Date();
console.info(`Current time: ${date1.toString()}`);
console.info(`Hours (system TZ): ${date1.getHours()}`);
console.info(`ISO string: ${date1.toISOString()}`);

// Example 2: Setting a specific time zone programmatically
console.info("\n2. Setting time zone to America/New_York programmatically:");
process.env.TZ = "America/New_York";

// Create a new Date instance after setting TZ
const date2 = new Date();
console.info(`Current time: ${date2.toString()}`);
console.info(`Hours (America/New_York): ${date2.getHours()}`);
console.info(`ISO string: ${date2.toISOString()}`);

// Example 3: Demonstrating different time zones
console.info("\n3. Comparing time zones:");

console.info("Before TZ change:");
console.info(`  Hours: ${new Date().getHours()}`);

process.env.TZ = "UTC";
console.info("After setting TZ to UTC:");
console.info(`  Hours: ${new Date().getHours()}`);

process.env.TZ = "Asia/Tokyo";
console.info("After setting TZ to Asia/Tokyo:");
console.info(`  Hours: ${new Date().getHours()}`);

console.info("\nTo run with a specific timezone from command line:");
console.info("  TZ=America/New_York bun run examples/timezone.ts");

console.info("\n✅ Time zone examples completed!");
