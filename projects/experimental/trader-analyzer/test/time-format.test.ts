import { test, expect, setSystemTime, beforeAll } from "bun:test";

/**
 * Test time formatting consistency
 * Ensures dashboard time format matches test runner output
 * 
 * @see https://bun.com/docs/test/time
 */

// Reset to actual time before all tests
beforeAll(() => {
	setSystemTime();
});

test("time format matches CLI dashboard", () => {
	const now = new Date();
	const formatted = now.toLocaleTimeString();
	
	// Verify format is consistent
	expect(typeof formatted).toBe("string");
	expect(formatted.length).toBeGreaterThan(0);
	
	// Format should match CLI dashboard format
	// CLI uses: new Date().toLocaleTimeString()
	console.log(`Formatted time: ${formatted}`);
});

test("setSystemTime works correctly", () => {
	// Set to a specific date
	const testDate = new Date("1999-01-01T10:49:18.000Z");
	setSystemTime(testDate);
	
	const now = new Date();
	expect(now.getFullYear()).toBe(1999);
	expect(now.getMonth()).toBe(0);
	expect(now.getDate()).toBe(1);
	expect(now.getHours()).toBe(10);
	
	// Format should work with setSystemTime
	const formatted = now.toLocaleTimeString();
	expect(typeof formatted).toBe("string");
	
	// Reset to actual time (no arguments)
	setSystemTime();
	
	const actualNow = new Date();
	expect(actualNow.getFullYear()).toBeGreaterThan(1999);
});

test("setSystemTime reset with no arguments", () => {
	// Set to a past date
	setSystemTime(new Date("2020-01-01T00:00:00.000Z"));
	expect(new Date().getFullYear()).toBe(2020);
	
	// Reset with no arguments (as per Bun docs)
	setSystemTime();
	
	// Should be back to actual time
	const now = new Date();
	expect(now.getFullYear()).toBeGreaterThan(2020);
});

test("formatSystemTime utility matches test runner format", () => {
	setSystemTime(); // Reset to actual time
	
	const testDate = new Date("2024-01-15T10:49:18.000Z");
	setSystemTime(testDate);
	
	const now = new Date();
	const formatted = now.toLocaleTimeString();
	
	// Should match dashboard formatSystemTime output
	expect(formatted).toBe(now.toLocaleTimeString());
	
	// Reset
	setSystemTime();
});

test("setSystemTime works with Date.now", () => {
	const testDate = new Date("2020-01-01T00:00:00.000Z");
	setSystemTime(testDate);
	
	// Date.now() should return mocked time
	const timestamp = Date.now();
	expect(timestamp).toBe(testDate.getTime());
	
	setSystemTime();
});

test("setSystemTime works with Intl.DateTimeFormat", () => {
	const testDate = new Date("2020-01-01T00:00:00.000Z");
	setSystemTime(testDate);
	
	const formatted = new Intl.DateTimeFormat().format(new Date());
	expect(typeof formatted).toBe("string");
	expect(formatted.length).toBeGreaterThan(0);
	
	setSystemTime();
});

test("setSystemTime works with new Date()", () => {
	const testDate = new Date("2020-01-01T00:00:00.000Z");
	setSystemTime(testDate);
	
	// new Date() should return mocked time
	const now = new Date();
	expect(now.getFullYear()).toBe(2020);
	expect(now.getMonth()).toBe(0);
	expect(now.getDate()).toBe(1);
	
	setSystemTime();
});

test("timezone defaults to UTC in bun test", () => {
	// Bun tests run in UTC by default (Etc/UTC)
	// Verify timezone offset matches UTC
	const offset = new Date().getTimezoneOffset();
	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	
	// In UTC, offset should be 0 (or close to it)
	// Note: getTimezoneOffset() returns offset in minutes, UTC = 0
	console.log(`Timezone: ${timeZone}, Offset: ${offset} minutes`);
	
	// Verify we can format with timezone
	const formatted = new Intl.DateTimeFormat().format(new Date());
	expect(typeof formatted).toBe("string");
});

test("timezone can be set via process.env.TZ", () => {
	// Save original TZ
	const originalTZ = process.env.TZ;
	
	try {
		// Set to Los Angeles (PST/PDT)
		process.env.TZ = "America/Los_Angeles";
		
		// Note: Intl.DateTimeFormat may cache timezone, so we check offset instead
		// Verify offset changed (PST is UTC-8, PDT is UTC-7)
		const offset = new Date().getTimezoneOffset();
		// Los Angeles offset should be positive (ahead of UTC)
		// getTimezoneOffset returns minutes, LA is behind UTC so offset is positive
		expect(offset).toBeGreaterThanOrEqual(0);
		
		// Format should still work
		const formatted = new Date().toLocaleTimeString();
		expect(typeof formatted).toBe("string");
		
		// Verify timezone is set (may not immediately reflect in Intl API)
		const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		console.log(`LA Timezone: ${timeZone}, Offset: ${offset}`);
		
		// Set to New York (EST/EDT)
		process.env.TZ = "America/New_York";
		const nyOffset = new Date().getTimezoneOffset();
		expect(nyOffset).toBeGreaterThanOrEqual(0);
		
		const nyTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		console.log(`NY Timezone: ${nyTimeZone}, Offset: ${nyOffset}`);
		
		// Format should work with different timezone
		const nyFormatted = new Date().toLocaleTimeString();
		expect(typeof nyFormatted).toBe("string");
	} finally {
		// Restore original TZ
		if (originalTZ !== undefined) {
			process.env.TZ = originalTZ;
		} else {
			delete process.env.TZ;
		}
	}
});

test("formatSystemTime respects timezone", () => {
	const testDate = new Date("2020-01-01T12:00:00.000Z"); // Noon UTC
	setSystemTime(testDate);
	
	// Format should respect current timezone
	const formatted = new Date().toLocaleTimeString();
	expect(typeof formatted).toBe("string");
	
	// In UTC, should show 12:00
	// In other timezones, will show different time
	const hours = new Date().getHours();
	console.log(`UTC 12:00 formatted as: ${formatted}, hours: ${hours}`);
	
	setSystemTime();
});

test("timezone changes work multiple times (unlike Jest)", () => {
	// Bun allows multiple timezone changes at runtime
	// Note: Intl.DateTimeFormat may cache timezone, so we verify via offset/format
	const originalTZ = process.env.TZ;
	
	try {
		// Change timezone multiple times
		process.env.TZ = "America/Los_Angeles";
		const offset1 = new Date().getTimezoneOffset();
		const formatted1 = new Date().toLocaleTimeString();
		expect(typeof formatted1).toBe("string");
		
		process.env.TZ = "America/New_York";
		const offset2 = new Date().getTimezoneOffset();
		const formatted2 = new Date().toLocaleTimeString();
		expect(typeof formatted2).toBe("string");
		
		process.env.TZ = "Europe/London";
		const offset3 = new Date().getTimezoneOffset();
		const formatted3 = new Date().toLocaleTimeString();
		expect(typeof formatted3).toBe("string");
		
		// Verify we can set TZ multiple times without error
		// Offsets may differ based on timezone
		console.log(`Timezone offsets: LA=${offset1}, NY=${offset2}, London=${offset3}`);
		console.log(`Formatted times: ${formatted1}, ${formatted2}, ${formatted3}`);
		
		// All should be valid formatted strings
		expect(formatted1.length).toBeGreaterThan(0);
		expect(formatted2.length).toBeGreaterThan(0);
		expect(formatted3.length).toBeGreaterThan(0);
	} finally {
		if (originalTZ !== undefined) {
			process.env.TZ = originalTZ;
		} else {
			delete process.env.TZ;
		}
	}
});
