/**
 * @dynamic-spy/kit v5.2 - URLPattern "/users/:id" - Bun 1.1 Exact Example
 * 
 * Bun docs example #1 → Production spy integration
 */

import { test, expect } from "bun:test";
import { URLPatternSpyFactory } from "../src/core/urlpattern-spy";

test('URLPattern "/users/:id" - Bun 1.1 exact', () => {
	const userApi = { updateUser: () => {} };

	// ✅ EXACT Bun example + spy
	const userSpy = URLPatternSpyFactory.create(
		userApi,
		'updateUser',
		{ pathname: "/users/:id" }
	);

	// ✅ Bun.test() → true
	expect(userSpy.test("https://example.com/users/123")).toBe(true);
	expect(userSpy.test("https://example.com/posts/456")).toBe(false);

	// ✅ Bun.exec() → groups.id
	const result = userSpy.exec("https://example.com/users/123");
	expect(result).not.toBeNull();
	expect(result!.pathname.groups.id).toBe("123"); // ✅ EXACT

	// 🆕 SPY VERIFICATION
	userApi.updateUser("https://example.com/users/123", { name: "John" });
	userSpy.verify("https://example.com/users/123");

	// ✅ Spy metrics
	expect(userSpy.calledTimes()).toBe(1);
	userSpy.reset();
	expect(userSpy.calledTimes()).toBe(0);
});



