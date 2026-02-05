#!/usr/bin/env bun
/**
 * Timezone test — Bun allows setting TZ multiple times at runtime
 * @see https://bun.com/docs/test/dates-times
 *
 * Run: bun test mcp-bun-docs/timezone.test.ts
 */

import { expect, it } from "bun:test";

it("Welcome to California!", () => {
	process.env.TZ = "America/Los_Angeles";
	// Pacific: 480 (PST) or 420 (PDT)
	expect([420, 480]).toContain(new Date().getTimezoneOffset());
	expect(new Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(
		"America/Los_Angeles",
	);
});

it("Welcome to New York!", () => {
	// Unlike in Jest, you can set the timezone multiple times at runtime and it will work.
	process.env.TZ = "America/New_York";
	// Eastern: 300 (EST) or 240 (EDT)
	expect([240, 300]).toContain(new Date().getTimezoneOffset());
	expect(new Intl.DateTimeFormat().resolvedOptions().timeZone).toBe("America/New_York");
});
