import { describe, expect, it } from "bun:test";
import {
	checkPathExists,
	dedupePaths,
	expandPathVars,
	PATH_SEPARATOR,
	resolvePaths,
} from "./pathResolver";

describe("expandPathVars", () => {
	it("expands known variables", () => {
		const env = { HOME: "/Users/test", PROJECT_ROOT: "/code" };
		expect(expandPathVars("${HOME}/.local/bin", env)).toBe("/Users/test/.local/bin");
	});

	it("expands multiple variables", () => {
		const env = { HOME: "/Users/test", PROJECT_ROOT: "/code" };
		expect(expandPathVars("${HOME}/${PROJECT_ROOT}/bin", env)).toBe(
			"/Users/test//code/bin",
		);
	});

	it("replaces unknown variables with empty string", () => {
		expect(expandPathVars("${NONEXISTENT}/bin", {})).toBe("/bin");
	});

	it("returns string unchanged when no variables present", () => {
		expect(expandPathVars("/usr/local/bin", {})).toBe("/usr/local/bin");
	});
});

describe("dedupePaths", () => {
	it("removes duplicate entries preserving order", () => {
		expect(dedupePaths(["/a", "/b", "/a", "/c"])).toEqual(["/a", "/b", "/c"]);
	});

	it("normalizes trailing slashes for comparison", () => {
		expect(dedupePaths(["/usr/local/bin/", "/usr/local/bin"])).toEqual([
			"/usr/local/bin/",
		]);
	});

	it("skips empty strings", () => {
		expect(dedupePaths(["", "/a", "", "/b"])).toEqual(["/a", "/b"]);
	});

	it("preserves root slash", () => {
		expect(dedupePaths(["/"])).toEqual(["/"]);
	});
});

describe("resolvePaths", () => {
	it("returns empty when no paths configured", () => {
		const result = resolvePaths(undefined, {}, {});
		expect(result.resolved).toEqual({});
		expect(result.warnings).toEqual([]);
	});

	it("returns empty for empty paths object", () => {
		const result = resolvePaths({}, {}, {});
		expect(result.resolved).toEqual({});
		expect(result.warnings).toEqual([]);
	});

	it("prepends directories before current PATH", () => {
		const paths = { PATH: { prepend: ["/new/bin"] } };
		const currentEnv = { PATH: "/usr/bin:/bin" };
		const result = resolvePaths(paths, currentEnv, {});
		const dirs = result.resolved.PATH.split(PATH_SEPARATOR);
		expect(dirs[0]).toBe("/new/bin");
		expect(dirs).toContain("/usr/bin");
		expect(dirs).toContain("/bin");
	});

	it("appends directories after current PATH", () => {
		const paths = { PATH: { append: ["/opt/bin"] } };
		const currentEnv = { PATH: "/usr/bin" };
		const result = resolvePaths(paths, currentEnv, {});
		const dirs = result.resolved.PATH.split(PATH_SEPARATOR);
		expect(dirs[dirs.length - 1]).toBe("/opt/bin");
	});

	it("handles both prepend and append", () => {
		const paths = {
			PATH: {
				prepend: ["/first"],
				append: ["/last"],
			},
		};
		const currentEnv = { PATH: "/middle" };
		const result = resolvePaths(paths, currentEnv, {});
		const dirs = result.resolved.PATH.split(PATH_SEPARATOR);
		expect(dirs[0]).toBe("/first");
		expect(dirs[dirs.length - 1]).toBe("/last");
		expect(dirs).toContain("/middle");
	});

	it("deduplicates entries", () => {
		const paths = { PATH: { prepend: ["/usr/bin"] } };
		const currentEnv = { PATH: "/usr/bin:/bin" };
		const result = resolvePaths(paths, currentEnv, {});
		const dirs = result.resolved.PATH.split(PATH_SEPARATOR);
		const usrBinCount = dirs.filter((d) => d === "/usr/bin").length;
		expect(usrBinCount).toBe(1);
	});

	it("expands variables in path entries", () => {
		const paths = { PATH: { prepend: ["${HOME}/.local/bin"] } };
		const currentEnv = { HOME: "/Users/test", PATH: "/usr/bin" };
		const result = resolvePaths(paths, currentEnv, {});
		const dirs = result.resolved.PATH.split(PATH_SEPARATOR);
		expect(dirs[0]).toBe("/Users/test/.local/bin");
	});

	it("uses profileEnv for variable expansion", () => {
		const paths = { PATH: { prepend: ["${PROJECT_ROOT}/bin"] } };
		const currentEnv = { PATH: "/usr/bin" };
		const profileEnv = { PROJECT_ROOT: "/code/myproject" };
		const result = resolvePaths(paths, currentEnv, profileEnv);
		const dirs = result.resolved.PATH.split(PATH_SEPARATOR);
		expect(dirs[0]).toBe("/code/myproject/bin");
	});

	it("handles multiple path variables", () => {
		const paths = {
			PATH: { prepend: ["/new/bin"] },
			LD_LIBRARY_PATH: { prepend: ["/new/lib"] },
		};
		const currentEnv = {
			PATH: "/usr/bin",
			LD_LIBRARY_PATH: "/usr/lib",
		};
		const result = resolvePaths(paths, currentEnv, {});
		expect(result.resolved.PATH).toContain("/new/bin");
		expect(result.resolved.LD_LIBRARY_PATH).toContain("/new/lib");
	});

	it("warns about non-existent directories", () => {
		const paths = {
			PATH: { prepend: ["/nonexistent/fake/path/xyz"] },
		};
		const result = resolvePaths(paths, {}, {});
		expect(result.warnings.length).toBeGreaterThan(0);
		expect(result.warnings[0].variable).toBe("PATH");
		expect(result.warnings[0].dir).toBe("/nonexistent/fake/path/xyz");
		expect(result.warnings[0].reason).toContain("does not exist");
	});

	it("handles empty current env for a variable", () => {
		const paths = { MANPATH: { append: ["/usr/share/man"] } };
		const result = resolvePaths(paths, {}, {});
		expect(result.resolved.MANPATH).toBe("/usr/share/man");
	});
});

describe("checkPathExists", () => {
	it("returns true for existing directory", () => {
		expect(checkPathExists("/usr")).toBe(true);
	});

	it("returns false for non-existent directory", () => {
		expect(checkPathExists("/nonexistent/fake/path/xyz")).toBe(false);
	});
});
