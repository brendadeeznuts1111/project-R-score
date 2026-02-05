/**
 * @dynamic-spy/kit v5.2 - URLPattern "/files/*" Wildcard - Bun 1.1 Exact Example
 * 
 * Bun docs wildcard example → Production spy integration
 */

import { test, expect } from "bun:test";
import { URLPatternSpyFactory } from "../src/core/urlpattern-spy";

test('URLPattern "/files/*" wildcard - Bun 1.1 exact', () => {
	const fileApi = { serveFile: () => {} };

	// ✅ EXACT Bun wildcard example + spy
	const filesSpy = URLPatternSpyFactory.create(
		fileApi,
		'serveFile',
		{ pathname: "/files/*" }
	);

	// ✅ Wildcard groups[0]
	const match = filesSpy.exec("https://example.com/files/image.png");
	expect(match).not.toBeNull();
	expect(match!.pathname.groups[0]).toBe("image.png"); // ✅ EXACT

	// ✅ Test multiple wildcard paths
	expect(filesSpy.test("https://example.com/files/image.png")).toBe(true);
	expect(filesSpy.test("https://example.com/files/docs/readme.md")).toBe(true);
	expect(filesSpy.test("https://example.com/other/image.png")).toBe(false);

	// 🆕 SPY + WILDCARD
	fileApi.serveFile("https://example.com/files/image.png");
	filesSpy.verify("https://example.com/files/image.png");

	// ✅ Wildcard groups extraction
	const deepMatch = filesSpy.exec("https://example.com/files/docs/readme.md");
	expect(deepMatch!.pathname.groups[0]).toBe("docs/readme.md");
});



