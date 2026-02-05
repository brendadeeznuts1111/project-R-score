import { expect, test } from "bun:test";

test("basic sanity check", () => {
	expect(1 + 1).toBe(2);
});

test("package configuration", () => {
	const pkg = require("./package.json");
	expect(pkg.name).toBe("@nolarose/windsurf-project");
	expect(pkg.version).toBeDefined();
});
