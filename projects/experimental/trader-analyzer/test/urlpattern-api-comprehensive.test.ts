#!/usr/bin/env bun
/**
 * @fileoverview Comprehensive URLPattern API Tests
 * @description Tests for all URLPattern API methods and properties
 * @module test/urlpattern-api-comprehensive
 * 
 * Tests cover:
 * - Constructor (from strings or URLPatternInit dictionaries)
 * - test() method (boolean matching)
 * - exec() method (parameter extraction)
 * - Pattern properties (protocol, username, password, hostname, port, pathname, search, hash)
 * - hasRegExpGroups property
 * 
 * Web Platform Tests Compliance:
 * Bun's URLPattern implementation passes 408 Web Platform Tests.
 * Thanks to the WebKit team for implementing this!
 * 
 * @see {@link https://github.com/web-platform-tests/wpt/tree/master/urlpattern Web Platform Tests}
 */

import { describe, test, expect } from "bun:test";

describe("URLPattern API - Constructor", () => {
	describe("Constructor from string", () => {
		test("creates pattern from full URL string", () => {
			const pattern = new URLPattern("https://example.com/users/:id");
			expect(pattern).toBeInstanceOf(URLPattern);
			expect(pattern.pathname).toBe("/users/:id");
		});

	test("creates pattern from pathname string with baseURL", () => {
		const pattern = new URLPattern("/api/v1/:resource/:id", "https://example.com");
		expect(pattern).toBeInstanceOf(URLPattern);
		expect(pattern.pathname).toBe("/api/v1/:resource/:id");
	});
	});

	describe("Constructor from URLPatternInit dictionary", () => {
		test("creates pattern with pathname only", () => {
			const pattern = new URLPattern({
				pathname: "/users/:id",
			});
			expect(pattern).toBeInstanceOf(URLPattern);
			expect(pattern.pathname).toBe("/users/:id");
		});

		test("creates pattern with protocol and hostname", () => {
			const pattern = new URLPattern({
				protocol: "https",
				hostname: "api.example.com",
				pathname: "/v1/:resource",
			});
			expect(pattern.protocol).toBe("https");
			expect(pattern.hostname).toBe("api.example.com");
			expect(pattern.pathname).toBe("/v1/:resource");
		});

		test("creates pattern with all URL components", () => {
			const pattern = new URLPattern({
				protocol: "https",
				username: "user",
				password: "pass",
				hostname: "api.example.com",
				port: "8080",
				pathname: "/api/v1/:resource/:id",
				search: "?filter=:filter",
				hash: "#:section",
			});

			expect(pattern.protocol).toBe("https");
			expect(pattern.username).toBe("user");
			expect(pattern.password).toBe("pass");
			expect(pattern.hostname).toBe("api.example.com");
			expect(pattern.port).toBe("8080");
		expect(pattern.pathname).toBe("/api/v1/:resource/:id");
		expect(pattern.search).toBe("filter=:filter"); // Note: search doesn't include '?'
		expect(pattern.hash).toBe(":section"); // Note: hash doesn't include '#'
		});

		test("creates pattern with wildcard hostname", () => {
			const pattern = new URLPattern({
				hostname: "*.example.com",
				pathname: "/api/:version",
			});
			expect(pattern.hostname).toBe("*.example.com");
		});
	});
});

describe("URLPattern API - test() method", () => {
	test("test() returns true for matching URL", () => {
		const pattern = new URLPattern({ pathname: "/users/:id" });
		const result = pattern.test("https://example.com/users/123");
		expect(result).toBe(true);
	});

	test("test() returns false for non-matching URL", () => {
		const pattern = new URLPattern({ pathname: "/users/:id" });
		const result = pattern.test("https://example.com/posts/456");
		expect(result).toBe(false);
	});

	test("test() matches with protocol constraint", () => {
		const pattern = new URLPattern({
			protocol: "https",
			pathname: "/api/:resource",
		});
		expect(pattern.test("https://example.com/api/users")).toBe(true);
		expect(pattern.test("http://example.com/api/users")).toBe(false);
	});

	test("test() matches with hostname constraint", () => {
		const pattern = new URLPattern({
			hostname: "api.example.com",
			pathname: "/v1/:resource",
		});
		expect(pattern.test("https://api.example.com/v1/users")).toBe(true);
		expect(pattern.test("https://www.example.com/v1/users")).toBe(false);
	});

	test("test() matches with wildcard hostname", () => {
		const pattern = new URLPattern({
			hostname: "*.example.com",
			pathname: "/api/:resource",
		});
		expect(pattern.test("https://api.example.com/api/users")).toBe(true);
		expect(pattern.test("https://v1.example.com/api/users")).toBe(true);
		expect(pattern.test("https://example.com/api/users")).toBe(false);
	});

	test("test() matches with port constraint", () => {
		const pattern = new URLPattern({
			hostname: "localhost",
			port: "3000",
			pathname: "/api/:resource",
		});
		expect(pattern.test("http://localhost:3000/api/users")).toBe(true);
		expect(pattern.test("http://localhost:8080/api/users")).toBe(false);
	});

	test("test() matches with search parameters", () => {
		const pattern = new URLPattern({
			pathname: "/api/logs",
			search: "?level=:level",
		});
		expect(pattern.test("https://example.com/api/logs?level=INFO")).toBe(true);
		expect(pattern.test("https://example.com/api/logs?level=ERROR")).toBe(true);
		expect(pattern.test("https://example.com/api/logs")).toBe(false);
	});

	test("test() matches with hash", () => {
		const pattern = new URLPattern({
			pathname: "/docs/:page",
			hash: "#:section",
		});
		expect(pattern.test("https://example.com/docs/api#intro")).toBe(true);
		expect(pattern.test("https://example.com/docs/api")).toBe(false);
	});
});

describe("URLPattern API - exec() method", () => {
	test("exec() returns URLPatternResult for matching URL", () => {
		const pattern = new URLPattern({ pathname: "/users/:id" });
		const result = pattern.exec("https://example.com/users/123");
		expect(result).not.toBeNull();
		expect(result?.pathname.groups.id).toBe("123");
	});

	test("exec() returns null for non-matching URL", () => {
		const pattern = new URLPattern({ pathname: "/users/:id" });
		const result = pattern.exec("https://example.com/posts/456");
		expect(result).toBeNull();
	});

	test("exec() extracts multiple pathname parameters", () => {
		const pattern = new URLPattern({
			pathname: "/api/v1/:resource/:id/:action",
		});
		const result = pattern.exec(
			"https://api.example.com/api/v1/secrets/hyperbun/get",
		);
		expect(result).not.toBeNull();
		expect(result?.pathname.groups.resource).toBe("secrets");
		expect(result?.pathname.groups.id).toBe("hyperbun");
		expect(result?.pathname.groups.action).toBe("get");
	});

	test("exec() extracts search parameter groups", () => {
		const pattern = new URLPattern({
			pathname: "/api/logs",
			search: "?level=:level&limit=:limit",
		});
		const result = pattern.exec(
			"https://api.example.com/api/logs?level=INFO&limit=100",
		);
		expect(result).not.toBeNull();
		expect(result?.search.groups.level).toBe("INFO");
		expect(result?.search.groups.limit).toBe("100");
	});

	test("exec() extracts hash parameter groups", () => {
		const pattern = new URLPattern({
			pathname: "/docs/:page",
			hash: "#:section",
		});
		const result = pattern.exec("https://example.com/docs/api#intro");
		expect(result).not.toBeNull();
		expect(result?.pathname.groups.page).toBe("api");
		expect(result?.hash.groups.section).toBe("intro");
	});

	test("exec() extracts wildcard groups", () => {
		const pattern = new URLPattern({ pathname: "/files/*" });
		const result = pattern.exec("https://example.com/files/image.png");
		expect(result).not.toBeNull();
		expect(result?.pathname.groups[0]).toBe("image.png");
	});

	test("exec() extracts all URL components", () => {
		const pattern = new URLPattern({
			protocol: "https",
			username: ":user",
			password: ":pass",
			hostname: "api.example.com",
			port: ":port",
			pathname: "/api/:version/:resource",
			search: "?filter=:filter",
			hash: "#:section",
		});
		const result = pattern.exec(
			"https://admin:secret@api.example.com:8080/api/v1/users?filter=active#details",
		);
		expect(result).not.toBeNull();
		// Protocol is not extracted as a group, it's matched
		expect(result?.username.groups.user).toBe("admin");
		expect(result?.password.groups.pass).toBe("secret");
		// Hostname is not extracted as a group when it's a literal
		expect(result?.port.groups.port).toBe("8080");
		expect(result?.pathname.groups.version).toBe("v1");
		expect(result?.pathname.groups.resource).toBe("users");
		expect(result?.search.groups.filter).toBe("active");
		expect(result?.hash.groups.section).toBe("details");
	});

	test("exec() returns input URLs in result", () => {
		const pattern = new URLPattern({ pathname: "/users/:id" });
		const url = "https://example.com/users/123";
		const result = pattern.exec(url);
		expect(result).not.toBeNull();
		expect(result?.pathname.input).toBe("/users/123");
	});
});

describe("URLPattern API - Pattern Properties", () => {
	test("protocol property", () => {
		const pattern = new URLPattern({
			protocol: "https",
			pathname: "/api/:resource",
		});
		expect(pattern.protocol).toBe("https");
	});

	test("username property", () => {
		const pattern = new URLPattern({
			username: "user",
			pathname: "/api/:resource",
		});
		expect(pattern.username).toBe("user");
	});

	test("password property", () => {
		const pattern = new URLPattern({
			password: "pass",
			pathname: "/api/:resource",
		});
		expect(pattern.password).toBe("pass");
	});

	test("hostname property", () => {
		const pattern = new URLPattern({
			hostname: "api.example.com",
			pathname: "/api/:resource",
		});
		expect(pattern.hostname).toBe("api.example.com");
	});

	test("port property", () => {
		const pattern = new URLPattern({
			port: "8080",
			pathname: "/api/:resource",
		});
		expect(pattern.port).toBe("8080");
	});

	test("pathname property", () => {
		const pattern = new URLPattern({
			pathname: "/api/v1/:resource/:id",
		});
		expect(pattern.pathname).toBe("/api/v1/:resource/:id");
	});

	test("search property", () => {
		const pattern = new URLPattern({
			pathname: "/api/logs",
			search: "?level=:level",
		});
		expect(pattern.search).toBe("level=:level"); // Note: '?' is not included in property
	});

	test("hash property", () => {
		const pattern = new URLPattern({
			pathname: "/docs/:page",
			hash: "#:section",
		});
		expect(pattern.hash).toBe(":section"); // Note: '#' is not included in property
	});

	test("properties are read-only", () => {
		const pattern = new URLPattern({ pathname: "/users/:id" });
		expect(() => {
			// @ts-expect-error - Testing that properties are read-only
			pattern.pathname = "/new/path";
		}).toThrow();
	});
});

describe("URLPattern API - hasRegExpGroups property", () => {
	test("hasRegExpGroups is false for simple patterns", () => {
		const pattern = new URLPattern({ pathname: "/users/:id" });
		expect(pattern.hasRegExpGroups).toBe(false);
	});

	test("hasRegExpGroups is true for regex patterns", () => {
		const pattern = new URLPattern({ pathname: "/users/:id(\\d+)" });
		expect(pattern.hasRegExpGroups).toBe(true);
	});

	test("hasRegExpGroups detects numeric regex", () => {
		const pattern = new URLPattern({
			pathname: "/api/v:version(\\d+)",
		});
		expect(pattern.hasRegExpGroups).toBe(true);
	});

	test("hasRegExpGroups detects alphanumeric regex", () => {
		const pattern = new URLPattern({
			pathname: "/users/:id([a-zA-Z0-9]+)",
		});
		expect(pattern.hasRegExpGroups).toBe(true);
	});

	test("hasRegExpGroups detects regex in search parameters", () => {
		const pattern = new URLPattern({
			pathname: "/api/logs",
			search: "?level=:level(INFO|WARN|ERROR)",
		});
		expect(pattern.hasRegExpGroups).toBe(true);
	});

	test("hasRegExpGroups detects regex in multiple components", () => {
		const pattern = new URLPattern({
			pathname: "/api/v:version(\\d+)/:resource",
			search: "?id=:id(\\d+)",
		});
		expect(pattern.hasRegExpGroups).toBe(true);
	});
});

describe("URLPattern API - Integration Examples", () => {
	test("route matching with test()", () => {
		const routes = [
			new URLPattern({ pathname: "/api/v1/users/:id" }),
			new URLPattern({ pathname: "/api/v1/posts/:id" }),
			new URLPattern({ pathname: "/api/v1/comments/:id" }),
		];

		const url = "https://api.example.com/api/v1/users/123";
		const matched = routes.find((pattern) => pattern.test(url));
		expect(matched).not.toBeUndefined();
		expect(matched?.pathname).toBe("/api/v1/users/:id");
	});

	test("parameter extraction with exec()", () => {
		const pattern = new URLPattern({
			pathname: "/api/v1/secrets/:server/:type",
		});
		const url = "https://api.example.com/api/v1/secrets/hyperbun/TELEGRAM_BOT_TOKEN";
		const result = pattern.exec(url);

		expect(result).not.toBeNull();
		expect(result?.pathname.groups.server).toBe("hyperbun");
		expect(result?.pathname.groups.type).toBe("TELEGRAM_BOT_TOKEN");
	});

	test("pattern caching for performance", () => {
		const cache = new Map<string, URLPattern>();

		function getPattern(template: string): URLPattern {
			if (!cache.has(template)) {
				cache.set(template, new URLPattern({ pathname: template }));
			}
			return cache.get(template)!;
		}

		const pattern1 = getPattern("/api/v1/users/:id");
		const pattern2 = getPattern("/api/v1/users/:id");
		expect(pattern1).toBe(pattern2); // Same instance from cache
		expect(cache.size).toBe(1);
	});

	test("multiple pattern matching", () => {
		const patterns = [
			new URLPattern({ pathname: "/api/v1/:resource" }),
			new URLPattern({ pathname: "/api/v2/:resource" }),
		];

		function matchAny(url: string) {
			for (const pattern of patterns) {
				const match = pattern.exec(url);
				if (match) {
					return {
						version: pattern.pathname.includes("v1") ? "v1" : "v2",
						resource: match.pathname.groups.resource,
					};
				}
			}
			return null;
		}

		const result = matchAny("https://api.example.com/api/v2/users");
		expect(result).not.toBeNull();
		expect(result?.version).toBe("v2");
		expect(result?.resource).toBe("users");
	});
});
