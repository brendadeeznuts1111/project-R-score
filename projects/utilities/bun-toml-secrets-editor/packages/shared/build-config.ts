/**
 * Shared Build Configuration - Bun v1.3.7 Optimized
 *
 * Used across all packages for consistent builds
 */

export const buildConfig = {
	target: "bun" as const,
	minify: true,
	external: ["bun:*", "node:*"],
	splitting: true,
	format: "esm" as const,
	sourcemap: "external" as const,
};

export const testConfig = {
	coverage: true,
	timeout: 30000,
	parallel: true,
};

export const packageDefaults = {
	license: "MIT",
	author: "Nola Rose <nola@example.com>",
	repository: {
		type: "git",
		url: "https://github.com/nolarose/golden-template.git",
	},
	bugs: "https://github.com/nolarose/golden-template/issues",
	homepage: "https://github.com/nolarose/golden-template#readme",
	engines: {
		bun: ">=1.3.7",
	},
	os: ["darwin", "linux", "win32"],
	cpu: ["x64", "arm64"],
};

/**
 * Generate package.json for a package
 */
export function generatePackageJson(
	name: string,
	version: string,
	description: string,
	options: {
		dependencies?: Record<string, string>;
		peerDependencies?: Record<string, string>;
		bin?: Record<string, string>;
		exports?: Record<string, string>;
	} = {},
) {
	return {
		name: `@golden/${name}`,
		version,
		description,
		...packageDefaults,
		main: "./dist/index.js",
		types: "./dist/index.d.ts",
		exports: options.exports || {
			".": {
				import: "./dist/index.js",
				types: "./dist/index.d.ts",
			},
		},
		scripts: {
			build: `bun build ./src/index.ts --outdir ./dist --target ${buildConfig.target} --minify --splitting`,
			test: "bun test",
			typecheck: "tsc --noEmit",
			clean: "rm -rf dist",
			prepublishOnly: "bun run clean && bun run build && bun test",
		},
		devDependencies: {
			"bun-types": "latest",
			"@golden/shared": "workspace:*",
		},
		dependencies: options.dependencies || {},
		peerDependencies: options.peerDependencies || {},
		bin: options.bin,
		files: ["dist/", "README.md", "LICENSE"],
	};
}
