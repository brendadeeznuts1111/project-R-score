/**
 * Unit and integration tests for analyze CLI (stages 3.x).
 * Fixtures: tools/__fixtures__/analyze/
 */
import { describe, expect, it } from "bun:test";
import {
	approxComplexity,
	extractEnumMembers,
	extractProps,
	loadConfig,
	matchesIgnore,
	parseArgs,
	runClasses,
	runComplexity,
	runDeps,
	runPolish,
	runRename,
	runScan,
	runStrength,
	runTypes,
} from "./analyze.ts";

const FIXTURE_ROOT = "tools/__fixtures__/analyze";

function opts(
	overrides: Partial<ReturnType<typeof parseArgs>> = {},
): ReturnType<typeof parseArgs> {
	return {
		cmd: "scan",
		rest: [],
		roots: [FIXTURE_ROOT],
		all: false,
		limit: 25,
		format: "table",
		metrics: true,
		depth: null,
		ignorePatterns: [],
		...overrides,
	};
}

describe("parseArgs", () => {
	it("defaults to scan when no subcommand", () => {
		const r = parseArgs(["node", "analyze.ts"], {});
		expect(r.cmd).toBe("scan");
	});

	it("accepts --roots=dir1,dir2", () => {
		const r = parseArgs(["node", "analyze.ts", "scan", "--roots=a,b"], {});
		expect(r.roots).toEqual(["a", "b"]);
	});

	it("accepts --limit=N", () => {
		const r = parseArgs(["node", "analyze.ts", "scan", "--limit=10"], {});
		expect(r.limit).toBe(10);
	});

	it("accepts --format=json", () => {
		const r = parseArgs(["node", "analyze.ts", "scan", "--format=json"], {});
		expect(r.format).toBe("json");
	});

	it("accepts --ignore=glob1,glob2", () => {
		const r = parseArgs(
			["node", "analyze.ts", "scan", "--ignore=**/node_modules,*.test.ts"],
			{},
		);
		expect(r.ignorePatterns).toContain("**/node_modules");
		expect(r.ignorePatterns).toContain("*.test.ts");
	});

	it("argv wins over config for roots", () => {
		const r = parseArgs(["node", "analyze.ts", "scan", "--roots=argv-root"], {
			roots: ["config-root"],
		});
		expect(r.roots).toEqual(["argv-root"]);
	});

	it("uses config roots when no --roots in argv", () => {
		const r = parseArgs(["node", "analyze.ts", "scan"], { roots: ["config-root"] });
		expect(r.roots).toEqual(["config-root"]);
	});

	it("parses types subcommand and --kind=interface", () => {
		const r = parseArgs(["node", "analyze.ts", "types", "--kind=interface"], {});
		expect(r.cmd).toBe("types");
		expect(r.rest).toContain("--kind=interface");
	});
});

describe("loadConfig", () => {
	it("returns object (may be empty if no config files)", async () => {
		const config = await loadConfig();
		expect(config).toBeDefined();
		expect(typeof config).toBe("object");
	});
});

describe("matchesIgnore", () => {
	it("matches **/node_modules", () => {
		expect(matchesIgnore("src/foo/node_modules/bar", ["**/node_modules"])).toBe(true);
		expect(matchesIgnore("src/foo/bar", ["**/node_modules"])).toBe(false);
	});

	it("matches *.test.ts", () => {
		expect(matchesIgnore("src/foo.test.ts", ["*.test.ts"])).toBe(true);
		expect(matchesIgnore("src/foo.ts", ["*.test.ts"])).toBe(false);
	});

	it("skips empty patterns", () => {
		expect(matchesIgnore("any/path", ["", "  "])).toBe(false);
	});
});

describe("approxComplexity", () => {
	it("returns at least 1", () => {
		expect(approxComplexity("")).toBe(1);
	});

	it("counts if/else/for", () => {
		const text = "if (x) { } else if (y) { } for (let i=0;i<10;i++) { }";
		expect(approxComplexity(text)).toBeGreaterThan(1);
	});
});

describe("extractProps", () => {
	it("extracts interface props", () => {
		const body = " id: string;\n count?: number; ";
		expect(extractProps(body, "interface")).toContain("id");
		expect(extractProps(body, "interface")).toContain("count");
	});

	it("extracts enum members", () => {
		const body = " A = 1,\n B = 2,\n C, ";
		const members = extractEnumMembers(body);
		expect(members).toContain("A");
		expect(members).toContain("B");
		expect(members).toContain("C");
	});
});

describe("extractEnumMembers", () => {
	it("parses Name = value and Name,", () => {
		const body = "X = 1, Y = 2, Z,";
		expect(extractEnumMembers(body)).toEqual(expect.arrayContaining(["X", "Y", "Z"]));
	});
});

describe("runners with fixtures", () => {
	it("runScan returns JSON shape with total and files", async () => {
		const o = opts({ cmd: "scan", format: "json" });
		const log = console.log;
		let out = "";
		console.log = (x: string) => {
			out = x;
		};
		await runScan(o);
		console.log = log;
		const j = JSON.parse(out) as { total: number; files: unknown[] };
		expect(typeof j.total).toBe("number");
		expect(Array.isArray(j.files)).toBe(true);
		expect(j.total).toBeGreaterThan(0);
	});

	it("runTypes returns types with name, kind, file", async () => {
		const o = opts({ cmd: "types", format: "json" });
		let out = "";
		const log = console.log;
		console.log = (x: string) => {
			out = x;
		};
		await runTypes(o);
		console.log = log;
		const j = JSON.parse(out) as {
			types: { name: string; kind: string; file: string }[];
		};
		expect(Array.isArray(j.types)).toBe(true);
		const hasIface = j.types.some((t: { name: string }) => t.name === "FixtureIface");
		expect(hasIface).toBe(true);
	});

	it("runClasses returns classes with name, extends, file", async () => {
		const o = opts({ cmd: "classes", format: "json" });
		let out = "";
		const log = console.log;
		console.log = (x: string) => {
			out = x;
		};
		await runClasses(o);
		console.log = log;
		const j = JSON.parse(out) as {
			classes: { name: string; extends: string; file: string }[];
		};
		expect(Array.isArray(j.classes)).toBe(true);
		const base = j.classes.find((c: { name: string }) => c.name === "Base");
		expect(base).toBeDefined();
		const child = j.classes.find((c: { name: string }) => c.name === "Child");
		expect(child?.extends).toBe("Base");
	});

	it("runDeps returns imports structure", async () => {
		const o = opts({ cmd: "deps", format: "json" });
		let out = "";
		const log = console.log;
		console.log = (x: string) => {
			out = x;
		};
		await runDeps(o);
		console.log = log;
		const j = JSON.parse(out) as Record<string, unknown>;
		expect(typeof j).toBe("object");
		// At least deps-a or deps-b has imports
		const keys = Object.keys(j).filter((k) => k.includes("deps"));
		expect(keys.length).toBeGreaterThan(0);
	});

	it("runComplexity returns files with complexity", async () => {
		const o = opts({ cmd: "complexity", format: "json", rest: ["--threshold=1"] });
		let out = "";
		const log = console.log;
		console.log = (x: string) => {
			out = x;
		};
		await runComplexity(o, { complexity: { threshold: 1 } });
		console.log = log;
		const j = JSON.parse(out) as { files: { file: string; complexity: number }[] };
		expect(Array.isArray(j.files)).toBe(true);
	});

	it("runStrength returns files with score, lines, complexity, exports", async () => {
		const o = opts({ cmd: "strength", format: "json" });
		let out = "";
		const log = console.log;
		console.log = (x: string) => {
			out = x;
		};
		await runStrength(o);
		console.log = log;
		const j = JSON.parse(out) as {
			files: {
				file: string;
				score: number;
				lines: number;
				complexity: number;
				exports: number;
			}[];
		};
		expect(Array.isArray(j.files)).toBe(true);
		if (j.files.length > 0) {
			expect(typeof j.files[0].score).toBe("number");
			expect(typeof j.files[0].lines).toBe("number");
			expect(typeof j.files[0].exports).toBe("number");
		}
	});
});

describe("runRename dry-run", () => {
	it("reports file:line for OldName in fixture", async () => {
		const o = opts({ cmd: "rename", rest: ["OldName", "NewName"] });
		const chunks: string[] = [];
		const log = console.log;
		console.log = (...args: unknown[]) => {
			chunks.push(args.map(String).join(" "));
		};
		await runRename(o);
		console.log = log;
		const out = chunks.join("\n");
		expect(out).toContain("OldName");
		expect(out).toContain("rename-target");
	});
});

describe("runPolish dry-run", () => {
	it("reports unused import in fixture", async () => {
		const o = opts({ cmd: "polish", rest: [] });
		let out = "";
		const log = console.log;
		console.log = (x: string) => {
			out = x;
		};
		await runPolish(o);
		console.log = log;
		// unused-import.ts has FixtureEnum imported but only FixtureIface used
		expect(
			out.includes("unused") || out.includes("import") || out.includes("removed"),
		).toBe(true);
	});
});

describe("integration: CLI spawn", () => {
	it("bun tools/analyze.ts scan --roots=tools/__fixtures__/analyze --format=json returns total and files", async () => {
		const scriptPath = import.meta.dir + "/analyze.ts";
		const res = Bun.spawn({
			cmd: [
				process.execPath,
				scriptPath,
				"scan",
				`--roots=${FIXTURE_ROOT}`,
				"--format=json",
			],
			cwd: process.cwd(),
			stdout: "pipe",
			stderr: "pipe",
		});
		const out = await new Response(res.stdout).text();
		await res.exited;
		const j = JSON.parse(out) as { total?: number; files?: unknown[] };
		expect(j).toHaveProperty("total");
		expect(j).toHaveProperty("files");
	});
});
