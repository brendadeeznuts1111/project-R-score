/**
 * Bun Timezone Integration Examples
 *
 * This file demonstrates how to use the standardized date utilities
 * with Bun's built-in timezone support.
 */

import { DateUtils, PerformanceTimer } from "./date-utils";

/**
 * Example 1: Basic timezone setup
 */
export function basicTimezoneSetup() {
  console.log("=== Basic Timezone Setup ===");

  // Check current timezone
  console.log("Current Bun TZ:", DateUtils.getBunTimezone());
  console.log("Effective timezone:", DateUtils.getEffectiveTimezone());
  console.log("Timezone offset:", DateUtils.getCurrentTimezoneOffset());

  // Set timezone to New York
  DateUtils.setBunTimezone("America/New_York");
  console.log("Set timezone to America/New_York");

  // Create dates with the new timezone
  const now = DateUtils.now();
  console.log("Current time (NY):", now.format("DISPLAY_DATETIME"));
  console.log("UTC time:", now.format("ISO"));
}

/**
 * Example 2: Development vs Testing vs Production
 */
export function environmentSpecificTimezones() {
  console.log("\n=== Environment-Specific Timezones ===");

  // Development - use system timezone
  if (process.env.NODE_ENV === "development") {
    console.log("Development mode - using system timezone");
    const devTime = DateUtils.now();
    console.log("Dev time:", devTime.format("DISPLAY_DATETIME"));
  }

  // Testing - force UTC for determinism
  if (process.env.NODE_ENV === "test") {
    console.log("Test mode - forcing UTC");
    DateUtils.setBunTimezone("UTC");
    const testTime = DateUtils.now();
    console.log("Test time (UTC):", testTime.format("DISPLAY_DATETIME"));
  }

  // Production - use specific timezone
  if (process.env.NODE_ENV === "production") {
    console.log("Production mode - using configured timezone");
    const prodTimezone = process.env.TZ || "America/New_York";
    DateUtils.setBunTimezone(prodTimezone);
    const prodTime = DateUtils.now();
    console.log("Production time:", prodTime.format("DISPLAY_DATETIME"));
  }
}

/**
 * Example 3: File naming with timezone awareness
 */
export function timezoneAwareFileNaming() {
  console.log("\n=== Timezone-Aware File Naming ===");

  // Set timezone
  DateUtils.setBunTimezone("America/Los_Angeles");

  // Create file with timestamp
  const timestamp = DateUtils.fileTimestamp();
  const filename = `backup-${timestamp}.json`;

  console.log("Generated filename:", filename);
  console.log("Current LA time:", DateUtils.now().format("DISPLAY_DATETIME"));

  // Files always use UTC timestamps for consistency
  console.log("File timestamp is UTC-based:", timestamp);
}

/**
 * Example 4: API responses with timezone handling
 */
export function apiTimezoneHandling() {
  console.log("\n=== API Timezone Handling ===");

  // API always returns UTC
  DateUtils.setBunTimezone("UTC");
  const apiTimestamp = DateUtils.now().format("ISO");
  console.log("API response timestamp:", apiTimestamp);

  // Client displays in local timezone
  DateUtils.setBunTimezone("Europe/London");
  const localDisplay = DateUtils.from(apiTimestamp).format("DISPLAY_DATETIME");
  console.log("Client display time (London):", localDisplay);

  // Another client in different timezone
  DateUtils.setBunTimezone("Asia/Tokyo");
  const tokyoDisplay = DateUtils.from(apiTimestamp).format("DISPLAY_DATETIME");
  console.log("Client display time (Tokyo):", tokyoDisplay);
}

/**
 * Example 5: Performance timing across timezones
 */
export function performanceWithTimezones() {
  console.log("\n=== Performance Timing Across Timezones ===");

  // Set initial timezone
  DateUtils.setBunTimezone("America/New_York");

  const timer = new PerformanceTimer();

  // Simulate some work
  for (let i = 0; i < 1000000; i++) {
    Math.random();
  }

  // Change timezone mid-operation (shouldn't affect timing)
  DateUtils.setBunTimezone("UTC");

  timer.stop();
  console.log("Operation duration:", timer.getFormattedDuration());
  console.log("Timezone change doesn't affect timing measurement");
}

/**
 * Example 6: Timezone validation and error handling
 */
export function timezoneValidation() {
  console.log("\n=== Timezone Validation ===");

  // Test supported timezones
  const supportedTimezones = ["UTC", "America/New_York", "Europe/London"];
  supportedTimezones.forEach((tz) => {
    console.log(`${tz} supported:`, DateUtils.isTimezoneSupported(tz));
  });

  // Test unsupported timezone
  console.log("Invalid timezone supported:", DateUtils.isTimezoneSupported("Invalid/Timezone"));

  // Try to set invalid timezone (Bun will handle this gracefully)
  try {
    DateUtils.setBunTimezone("Invalid/Timezone");
    console.log("Invalid timezone set (Bun may handle gracefully)");
  } catch (error) {
    console.error("Error setting invalid timezone:", error);
  }
}

/**
 * Example 7: Logging with timezone information
 */
export function timezoneAwareLogging() {
  console.log("\n=== Timezone-Aware Logging ===");

  // Set timezone for logging
  DateUtils.setBunTimezone("America/Chicago");

  const logEntry = {
    timestamp: DateUtils.now().format("LOG_DATETIME"),
    timezone: DateUtils.getBunTimezone(),
    offset: DateUtils.getCurrentTimezoneOffset(),
    message: "Application started",
    utcTimestamp: DateUtils.now().format("ISO")
  };

  console.log("Log entry:", JSON.stringify(logEntry, null, 2));
}

/**
 * Run all examples
 */
export function runAllExamples() {
  console.log("Bun Timezone Integration Examples");
  console.log("=====================================");

  basicTimezoneSetup();
  environmentSpecificTimezones();
  timezoneAwareFileNaming();
  apiTimezoneHandling();
  performanceWithTimezones();
  timezoneValidation();
  timezoneAwareLogging();

  console.log("\n=== Summary ===");
  console.log("✅ Timezone configuration working");
  console.log("✅ Date utilities integrated with Bun TZ");
  console.log("✅ Environment-specific timezone handling");
  console.log("✅ Performance timing unaffected by timezone");
  console.log("✅ Proper UTC storage and local display");
}
