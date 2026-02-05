/**
 * Bun v1.3.7 Performance Benchmarks
 * Compare new APIs vs traditional approaches
 */

import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bench, run } from "mitata";
import { parseJSONC, stripAnsi } from "../../src/utils/bun-v137-utils";

const TEST_DIR = join(tmpdir(), `bun-v137-bench-${Date.now()}`);

// Setup test files
function setup() {
	mkdirSync(TEST_DIR, { recursive: true });

	// Create various file types
	for (let i = 0; i < 100; i++) {
		writeFileSync(join(TEST_DIR, `file${i}.ts`), `export const x${i} = ${i};`);
		writeFileSync(join(TEST_DIR, `file${i}.js`), `module.exports = ${i};`);
		writeFileSync(join(TEST_DIR, `file${i}.txt`), `Content ${i}`);
	}

	// Create subdirectories with files
	for (let d = 0; d < 5; d++) {
		const subDir = join(TEST_DIR, `subdir${d}`);
		mkdirSync(subDir, { recursive: true });
		for (let i = 0; i < 20; i++) {
			writeFileSync(
				join(subDir, `nested${i}.ts`),
				`export const n${i} = ${i};`,
			);
		}
	}
}

function cleanup() {
	try {
		rmSync(TEST_DIR, { recursive: true, force: true });
	} catch {
		// Ignore
	}
}

// Setup before benchmarks
setup();

// Bun.Glob vs fs.readdirSync benchmark
bench("Bun.Glob - scan 200 TypeScript files", () => {
	const glob = new Bun.Glob("**/*.ts");
	const files: string[] = [];
	for (const file of glob.scanSync({ cwd: TEST_DIR })) {
		files.push(file);
	}
	return files.length;
});

bench("fs.readdirSync - scan 200 TypeScript files", () => {
	function findFiles(
		dir: string,
		pattern: RegExp,
		files: string[] = [],
	): string[] {
		const items = readdirSync(dir, { withFileTypes: true });
		for (const item of items) {
			const fullPath = join(dir, item.name);
			if (item.isDirectory()) {
				findFiles(fullPath, pattern, files);
			} else if (pattern.test(item.name)) {
				files.push(fullPath);
			}
		}
		return files;
	}
	const files = findFiles(TEST_DIR, /\.ts$/);
	return files.length;
});

// Bun.Glob simple pattern
bench("Bun.Glob - simple pattern *.ts", () => {
	const glob = new Bun.Glob("*.ts");
	const files: string[] = [];
	for (const file of glob.scanSync({ cwd: TEST_DIR })) {
		files.push(file);
	}
	return files.length;
});

bench("fs.readdirSync - simple pattern *.ts", () => {
	const files = readdirSync(TEST_DIR).filter((f) => f.endsWith(".ts"));
	return files.length;
});

// Bun.stripANSI vs regex
bench("Bun.stripANSI", () => {
	const text = "\x1b[31mRed\x1b[0m \x1b[32mGreen\x1b[0m \x1b[34mBlue\x1b[0m";
	return stripAnsi(text);
});

bench("Regex strip ANSI", () => {
	const text = "\x1b[31mRed\x1b[0m \x1b[32mGreen\x1b[0m \x1b[34mBlue\x1b[0m";
	return text.replace(/\x1b\[[0-9;]*m/g, "");
});

// Bun.JSONC vs strip-comments + JSON.parse
const jsoncContent = `
{
	// Application configuration
	"name": "test-app",
	"version": "1.0.0",
	/* Features array
	   with multi-line comment */
	"features": ["auth", "api", "cache"],
	"database": {
		// Connection settings
		"host": "localhost",
		"port": 5432  // default port
	}
}
`;

bench("Bun.JSONC.parse", () => {
	return parseJSONC(jsoncContent);
});

bench("Regex remove comments + JSON.parse", () => {
	const cleaned = jsoncContent
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/\/\/.*$/gm, "");
	return JSON.parse(cleaned);
});

// Bun.deepEquals comparison
const obj1 = { a: 1, b: { c: 2, d: [1, 2, 3] } };
const obj2 = { a: 1, b: { c: 2, d: [1, 2, 3] } };
const obj3 = { a: 1, b: { c: 2, d: [1, 2, 4] } };

bench("Bun.deepEquals - equal objects", () => {
	return Bun.deepEquals(obj1, obj2);
});

bench("JSON.stringify - equal objects", () => {
	return JSON.stringify(obj1) === JSON.stringify(obj2);
});

bench("Bun.deepEquals - different objects", () => {
	return Bun.deepEquals(obj1, obj3);
});

bench("JSON.stringify - different objects", () => {
	return JSON.stringify(obj1) === JSON.stringify(obj3);
});

// String width calculations
const unicodeText = "Hello 世界 🌍 📊";

bench("Bun.stringWidth", () => {
	return (Bun as any).stringWidth?.(unicodeText) ?? unicodeText.length;
});

bench("String.length", () => {
	return unicodeText.length;
});

// Run benchmarks
run().then(() => {
	cleanup();
	console.log("\n✅ Benchmarks complete, cleaned up test directory");
});
