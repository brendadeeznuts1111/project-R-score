/**
 * CSS Bundler Tests
 * Tests for Bun CSS bundler syntax lowering features
 */

import { describe, it, expect } from "bun:test";
import { BunCSSBundler } from "../src/utils/css-bundler";

describe("CSS Bundler Syntax Lowering", () => {
	const bundler = new BunCSSBundler();

	it("should detect CSS nesting", async () => {
		const testCSS = Bun.file("test-data/nesting-test.css");
		await Bun.write(
			"test-data/nesting-test.css",
			`.card {
  background: var(--bg-secondary);
  
  h2 {
    color: var(--accent-cyan);
  }
  
  &:hover {
    transform: translateY(-2px);
  }
}`,
		);

		const report = await bundler.detectFeatures("test-data/nesting-test.css");
		expect(report.features.nesting).toBe(true);
		expect(report.willLower).toContain("CSS Nesting");

		// Cleanup
		await Bun.write("test-data/nesting-test.css", "");
	});

	it("should detect color-mix", async () => {
		const testCSS = Bun.file("test-data/color-mix-test.css");
		await Bun.write(
			"test-data/color-mix-test.css",
			`:root {
  --accent-light: color-mix(in srgb, var(--accent-cyan) 70%, white);
}`,
		);

		const report = await bundler.detectFeatures("test-data/color-mix-test.css");
		expect(report.features.colorMix).toBe(true);
		expect(report.willLower).toContain("color-mix()");

		// Cleanup
		await Bun.write("test-data/color-mix-test.css", "");
	});

	it("should detect relative colors", async () => {
		const testCSS = Bun.file("test-data/relative-colors-test.css");
		await Bun.write(
			"test-data/relative-colors-test.css",
			`:root {
  --lighter: lch(from var(--base-color) calc(l + 10%) c h);
}`,
		);

		const report = await bundler.detectFeatures("test-data/relative-colors-test.css");
		expect(report.features.relativeColors).toBe(true);
		expect(report.willLower).toContain("Relative Colors");

		// Cleanup
		await Bun.write("test-data/relative-colors-test.css", "");
	});

	it("should detect LAB colors", async () => {
		const testCSS = Bun.file("test-data/lab-colors-test.css");
		await Bun.write(
			"test-data/lab-colors-test.css",
			`.card {
  background: oklch(25% 0.05 250);
  color: lab(55% 78 35);
}`,
		);

		const report = await bundler.detectFeatures("test-data/lab-colors-test.css");
		expect(report.features.labColors).toBe(true);
		expect(report.willLower).toContain("LAB Colors");

		// Cleanup
		await Bun.write("test-data/lab-colors-test.css", "");
	});

	it("should detect logical properties", async () => {
		const testCSS = Bun.file("test-data/logical-properties-test.css");
		await Bun.write(
			"test-data/logical-properties-test.css",
			`.card {
  padding-block: 25px;
  margin-inline-start: 1rem;
}`,
		);

		const report = await bundler.detectFeatures("test-data/logical-properties-test.css");
		expect(report.features.logicalProperties).toBe(true);
		expect(report.requiresSupport).toContain("Logical Properties");

		// Cleanup
		await Bun.write("test-data/logical-properties-test.css", "");
	});

	it("should detect modern selectors", async () => {
		const testCSS = Bun.file("test-data/modern-selectors-test.css");
		await Bun.write(
			"test-data/modern-selectors-test.css",
			`:is(.card, .status-item):not(.disabled, .hidden) {
  transition: transform 0.2s;
}`,
		);

		const report = await bundler.detectFeatures("test-data/modern-selectors-test.css");
		expect(report.features.modernSelectors).toBe(true);
		expect(report.requiresSupport).toContain("Modern Selectors");

		// Cleanup
		await Bun.write("test-data/modern-selectors-test.css", "");
	});

	it("should detect math functions", async () => {
		const testCSS = Bun.file("test-data/math-functions-test.css");
		await Bun.write(
			"test-data/math-functions-test.css",
			`.card {
  width: clamp(300px, 50%, 800px);
  padding: round(24.7px, 5px);
}`,
		);

		const report = await bundler.detectFeatures("test-data/math-functions-test.css");
		expect(report.features.mathFunctions).toBe(true);
		expect(report.requiresSupport).toContain("Math Functions");

		// Cleanup
		await Bun.write("test-data/math-functions-test.css", "");
	});

	it("should detect media query ranges", async () => {
		const testCSS = Bun.file("test-data/media-ranges-test.css");
		await Bun.write(
			"test-data/media-ranges-test.css",
			`@media (width >= 768px) {
  .grid {
    display: grid;
  }
}`,
		);

		const report = await bundler.detectFeatures("test-data/media-ranges-test.css");
		expect(report.features.mediaQueryRanges).toBe(true);
		expect(report.requiresSupport).toContain("Media Query Ranges");

		// Cleanup
		await Bun.write("test-data/media-ranges-test.css", "");
	});

	it("should detect CSS module composition", async () => {
		const testCSS = Bun.file("test-data/composition-test.css");
		await Bun.write(
			"test-data/composition-test.css",
			`.button {
  composes: base from "./base.module.css";
  color: red;
}`,
		);

		const report = await bundler.detectFeatures("test-data/composition-test.css");
		expect(report.features.composes).toBe(true);

		// Cleanup
		await Bun.write("test-data/composition-test.css", "");
	});

	it("should bundle CSS with syntax lowering detection", async () => {
		const testCSS = Bun.file("test-data/bundle-test.css");
		await Bun.write(
			"test-data/bundle-test.css",
			`.card {
  background: var(--bg-secondary);
  
  h2 {
    color: var(--accent-cyan);
  }
  
  &:hover {
    transform: translateY(-2px);
  }
}`,
		);

		const result = await bundler.bundle({
			input: "test-data/bundle-test.css",
			output: "test-data/bundle-output.css",
		});

		expect(result.css).toBeTruthy();
		expect(result.size).toBeGreaterThan(0);
		expect(result.syntaxReport).toBeDefined();
		if (result.syntaxReport) {
			expect(result.syntaxReport.features.nesting).toBe(true);
		}

		// Cleanup
		await Bun.write("test-data/bundle-test.css", "");
		const outputFile = Bun.file("test-data/bundle-output.css");
		if (await outputFile.exists()) {
			await Bun.write("test-data/bundle-output.css", "");
		}
	});

	it("should validate CSS syntax", async () => {
		const testCSS = Bun.file("test-data/validation-test.css");
		await Bun.write(
			"test-data/validation-test.css",
			`.card {
  background: var(--bg-secondary);
  padding: 25px;
}`,
		);

		const validation = await bundler.validateSyntax("test-data/validation-test.css");
		expect(validation.valid).toBe(true);
		expect(validation.errors.length).toBe(0);

		// Cleanup
		await Bun.write("test-data/validation-test.css", "");
	});

	it("should bundle CSS modules with composition", async () => {
		// Create base module
		await Bun.write(
			"test-data/base-module-test.css",
			`.base {
  padding: 1rem;
  border-radius: 8px;
}`,
		);

		// Create component module with composition
		await Bun.write(
			"test-data/component-module-test.css",
			`.button {
  composes: base from "./base-module-test.css";
  background: var(--accent-purple);
}`,
		);

		const modules = await bundler.bundleModules("test-data/component-module-test.css");
		expect(modules.button).toBeDefined();

		// Cleanup
		await Bun.write("test-data/base-module-test.css", "");
		await Bun.write("test-data/component-module-test.css", "");
	});

	it("should format colors as CSS using Bun.color", () => {
		const cssColor = bundler.formatColorAsCSS("#00d4ff");
		expect(cssColor).toBeTruthy();
		expect(cssColor).toContain("rgb");

		const cssColorWithAlpha = bundler.formatColorAsCSS("#00d4ff", 0.8);
		expect(cssColorWithAlpha).toBeTruthy();
		expect(cssColorWithAlpha).toContain("rgba");
	});

	it("should generate CSS variables from color map", () => {
		const cssVars = bundler.generateColorVariables({
			"accent-cyan": "#00d4ff",
			"accent-purple": "#667eea",
		});

		expect(cssVars).toContain(":root");
		expect(cssVars).toContain("--accent-cyan");
		expect(cssVars).toContain("--accent-purple");
		expect(cssVars).toContain("rgb");
	});
});
