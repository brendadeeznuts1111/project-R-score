/**
 * @fileoverview Bun CSS Bundler Integration
 * @description CSS bundling using Bun's native CSS bundler with syntax lowering
 * @module utils/css-bundler
 *
 * Based on: https://bun.com/docs/bundler/css
 *
 * Bun's CSS bundler features:
 * - CSS imports: `import "./styles.css"` (Bun handles automatically)
 * - CSS modules: `import styles from "./styles.module.css"` (Bun handles automatically)
 * - PostCSS support (via bun build)
 * - CSS-in-JS support
 * - Automatic minification (via bun build --minify)
 * - Source maps (via bun build --sourcemap)
 *
 * Syntax Lowering Features (automatic conversion):
 * - CSS Nesting - Nested selectors compiled to flat CSS
 * - Color mix - color-mix() evaluated at build time
 * - Relative colors - lch(from ...) computed to static values
 * - LAB colors - lab(), lch(), oklab(), oklch() with fallbacks
 * - Color function - color(display-p3 ...) with RGB fallbacks
 * - HWB colors - hwb() converted to RGB
 * - Color notation - Space-separated RGB/HSL, hex with alpha
 * - light-dark() - Automatic light/dark theme support
 * - Logical properties - margin-inline, padding-block, etc.
 * - :dir() selector - Direction-aware selectors
 * - :lang() selector - Language-specific styling
 * - :is() selector - Selector grouping with fallbacks
 * - :not() selector - Multiple argument support
 * - Math functions - clamp(), round(), sin(), pow(), etc.
 * - Media query ranges - width >= 768px syntax
 * - Shorthands - place-items, overflow: hidden auto, etc.
 * - Double position gradients - Hard color stops
 * - system-ui font - Expanded to platform-specific fonts
 *
 * Usage with Bun build:
 * ```bash
 * bun build ./styles/dashboard.css --outdir ./dist --minify
 * ```
 *
 * Watch mode for development (auto-rebuild on changes):
 * ```bash
 * bun build --watch ./styles/dashboard.css --outdir ./dist
 * ```
 * See: https://bun.sh/docs/bundler#watch-mode
 *
 * Or import directly in code:
 * ```ts
 * import "./styles/dashboard.css"; // Bun bundles automatically
 * ```
 */

import type { BunFile } from "bun";

/**
 * Syntax lowering feature flags
 */
export interface SyntaxLoweringOptions {
	/** Enable CSS nesting */
	nesting?: boolean;
	/** Enable color-mix() */
	colorMix?: boolean;
	/** Enable relative colors (lch(from ...)) */
	relativeColors?: boolean;
	/** Enable LAB colors (lab, lch, oklab, oklch) */
	labColors?: boolean;
	/** Enable HWB colors */
	hwbColors?: boolean;
	/** Enable color() function */
	colorFunction?: boolean;
	/** Enable light-dark() */
	lightDark?: boolean;
	/** Enable logical properties */
	logicalProperties?: boolean;
	/** Enable modern selectors (:is, :not, :dir, :lang) */
	modernSelectors?: boolean;
	/** Enable math functions */
	mathFunctions?: boolean;
	/** Enable media query ranges */
	mediaQueryRanges?: boolean;
	/** Enable modern shorthands */
	shorthands?: boolean;
	/** Enable double position gradients */
	doublePositionGradients?: boolean;
	/** Enable system-ui font expansion */
	systemUi?: boolean;
}

/**
 * Browser target configuration
 */
export interface BrowserTarget {
	/** Minimum Chrome version */
	chrome?: number;
	/** Minimum Firefox version */
	firefox?: number;
	/** Minimum Safari version */
	safari?: number;
	/** Minimum Edge version */
	edge?: number;
}

/**
 * CSS bundler options
 */
export interface CSSBundlerOptions {
	/** Input CSS file or directory */
	input: string | string[];
	/** Output file path */
	output?: string;
	/** Minify CSS */
	minify?: boolean;
	/** Generate source maps */
	sourcemap?: boolean;
	/** PostCSS config path */
	postcss?: string;
	/** Target browsers (for autoprefixer) */
	targets?: string[];
	/** Syntax lowering feature flags */
	syntaxLowering?: SyntaxLoweringOptions;
	/** Browser target configuration */
	browserTarget?: BrowserTarget;
}

/**
 * Detected syntax features
 */
export interface DetectedFeatures {
	nesting: boolean;
	colorMix: boolean;
	relativeColors: boolean;
	labColors: boolean;
	hwbColors: boolean;
	colorFunction: boolean;
	lightDark: boolean;
	logicalProperties: boolean;
	modernSelectors: boolean;
	mathFunctions: boolean;
	mediaQueryRanges: boolean;
	shorthands: boolean;
	doublePositionGradients: boolean;
	systemUi: boolean;
	composes: boolean;
}

/**
 * Syntax lowering report
 */
export interface SyntaxLoweringReport {
	/** Detected features */
	features: DetectedFeatures;
	/** Features that will be lowered */
	willLower: string[];
	/** Features that require browser support */
	requiresSupport: string[];
	/** Estimated browser compatibility */
	compatibility: {
		chrome: string;
		firefox: string;
		safari: string;
		edge: string;
	};
}

/**
 * Bundled CSS result
 */
export interface BundledCSS {
	/** Bundled CSS content */
	css: string;
	/** Source map (if enabled) */
	sourceMap?: string;
	/** Input files */
	inputs: string[];
	/** Output size in bytes */
	size: number;
	/** Syntax lowering report (if detection enabled) */
	syntaxReport?: SyntaxLoweringReport;
}

/**
 * Bun CSS Bundler
 *
 * Uses Bun's native CSS bundling capabilities
 */
export class BunCSSBundler {
	/**
	 * Bundle CSS files using Bun's bundler
	 *
	 * Uses Bun.build() for native CSS bundling when possible,
	 * falls back to manual bundling for multiple files.
	 *
	 * @example
	 * ```ts
	 * const bundler = new BunCSSBundler();
	 * const result = await bundler.bundle({
	 *   input: "./styles/main.css",
	 *   output: "./dist/bundle.css",
	 *   minify: true
	 * });
	 * ```
	 *
	 * For best results, use Bun.build directly:
	 * ```bash
	 * bun build ./styles/dashboard.css --outdir ./dist --minify --target browser
	 * ```
	 */
	async bundle(options: CSSBundlerOptions): Promise<BundledCSS> {
		const inputs = Array.isArray(options.input)
			? options.input
			: [options.input];

		// Detect syntax features if requested
		let syntaxReport: SyntaxLoweringReport | undefined;
		if (inputs.length === 1) {
			try {
				syntaxReport = await this.detectFeatures(inputs[0]);
			} catch (error) {
				// Ignore detection errors
			}
		}

		// Try using Bun.build for single file (Bun's native bundler)
		if (inputs.length === 1 && options.output) {
			try {
				const result = await Bun.build({
					entrypoints: inputs,
					outdir: options.output ? undefined : "./dist",
					minify: options.minify,
					sourcemap: options.sourcemap ? "inline" : "none",
					target: "browser",
				});

				if (result.success && result.outputs.length > 0) {
					const output = result.outputs[0];
					const css = await output.text();

					// Write to specified output path
					if (options.output) {
						await Bun.write(options.output, css);
					}

					return {
						css,
						inputs,
						size: output.size,
						syntaxReport,
					};
				}
			} catch (error) {
				// Fall back to manual bundling
				console.warn("Bun.build failed, using manual bundling:", error);
			}
		}

		// Manual bundling for multiple files or fallback
		const cssFiles = await Promise.all(
			inputs.map(async (input) => {
				const file = Bun.file(input);
				if (!(await file.exists())) {
					throw new Error(`CSS file not found: ${input}`);
				}
				return {
					path: input,
					content: await file.text(),
				};
			}),
		);

		// Combine CSS content
		let combinedCSS = cssFiles
			.map((f) => `/* ${f.path} */\n${f.content}`)
			.join("\n\n");

		// Minify if requested
		if (options.minify) {
			combinedCSS = this.minifyCSS(combinedCSS);
		}

		// Write output file if specified
		if (options.output) {
			await Bun.write(options.output, combinedCSS);
		}

		const size = new TextEncoder().encode(combinedCSS).length;

		return {
			css: combinedCSS,
			inputs: inputs,
			size,
			syntaxReport,
		};
	}

	/**
	 * Minify CSS (basic implementation)
	 * Bun's bundler handles minification automatically, but this provides a fallback
	 */
	private minifyCSS(css: string): string {
		return css
			.replace(/\/\*[\s\S]*?\*\//g, "") // Remove comments
			.replace(/\s+/g, " ") // Collapse whitespace
			.replace(/;\s*}/g, "}") // Remove semicolons before closing braces
			.replace(/\s*{\s*/g, "{") // Remove spaces around opening braces
			.replace(/;\s*/g, ";") // Remove spaces after semicolons
			.replace(/\s*:\s*/g, ":") // Remove spaces around colons
			.trim();
	}

	/**
	 * Extract CSS from HTML file
	 *
	 * @example
	 * ```ts
	 * const bundler = new BunCSSBundler();
	 * const css = await bundler.extractFromHTML("./dashboard/index.html");
	 * ```
	 */
	async extractFromHTML(htmlPath: string): Promise<string> {
		const file = Bun.file(htmlPath);
		const html = await file.text();

		// Extract <style> tags
		const styleMatches = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
		if (!styleMatches) {
			return "";
		}

		return styleMatches
			.map((match) => {
				const content = match.replace(/<style[^>]*>|<\/style>/gi, "");
				return content.trim();
			})
			.join("\n\n");
	}

	/**
	 * Detect syntax lowering features in CSS
	 *
	 * @example
	 * ```ts
	 * const bundler = new BunCSSBundler();
	 * const features = await bundler.detectFeatures("./styles/dashboard.css");
	 * console.log(features.features.nesting); // true if nesting detected
	 * ```
	 */
	async detectFeatures(cssPath: string): Promise<SyntaxLoweringReport> {
		const file = Bun.file(cssPath);
		if (!(await file.exists())) {
			throw new Error(`CSS file not found: ${cssPath}`);
		}

		const content = await file.text();
		const features: DetectedFeatures = {
			nesting:
				/&[\s\S]*?{/g.test(content) ||
				/\.[\w-]+\s*{[\s\S]*?\.[\w-]+/g.test(content),
			colorMix: /color-mix\(/i.test(content),
			relativeColors: /lch\(from|rgb\(from|hsl\(from/i.test(content),
			labColors: /\b(lab|lch|oklab|oklch)\(/i.test(content),
			hwbColors: /\bhwb\(/i.test(content),
			colorFunction: /\bcolor\(display-p3/i.test(content),
			lightDark: /\blight-dark\(/i.test(content),
			logicalProperties:
				/\b(margin|padding|border|inset|text-align|float|clear)-(inline|block|start|end)/.test(
					content,
				),
			modernSelectors: /:is\(|:not\([^)]+,[^)]+\)|:dir\(|:lang\(/i.test(
				content,
			),
			mathFunctions:
				/\b(clamp|round|sin|cos|tan|pow|sqrt|exp|abs|sign|mod|rem|min|max)\(/i.test(
					content,
				),
			mediaQueryRanges: /@media\s*\([^)]+[><=]/i.test(content),
			shorthands:
				/\bplace-items:|\bplace-content:|\boverflow:\s*[\w-]+\s+[\w-]+/i.test(
					content,
				),
			doublePositionGradients:
				/(linear|radial|conic)-gradient\([^)]+\d+%\s+\d+%/i.test(content),
			systemUi: /\bfont-family:\s*system-ui/i.test(content),
			composes: /\bcomposes:/i.test(content),
		};

		const willLower: string[] = [];
		const requiresSupport: string[] = [];

		if (features.nesting) willLower.push("CSS Nesting");
		if (features.colorMix) willLower.push("color-mix()");
		if (features.relativeColors) willLower.push("Relative Colors");
		if (features.labColors) willLower.push("LAB Colors");
		if (features.hwbColors) willLower.push("HWB Colors");
		if (features.colorFunction) willLower.push("color() function");
		if (features.lightDark) willLower.push("light-dark()");
		if (features.logicalProperties) requiresSupport.push("Logical Properties");
		if (features.modernSelectors) requiresSupport.push("Modern Selectors");
		if (features.mathFunctions) requiresSupport.push("Math Functions");
		if (features.mediaQueryRanges) requiresSupport.push("Media Query Ranges");
		if (features.shorthands) requiresSupport.push("Modern Shorthands");
		if (features.doublePositionGradients)
			requiresSupport.push("Double Position Gradients");
		if (features.systemUi) willLower.push("system-ui font");

		return {
			features,
			willLower,
			requiresSupport,
			compatibility: {
				chrome: ">= 112",
				firefox: ">= 113",
				safari: ">= 16.4",
				edge: ">= 112",
			},
		};
	}

	/**
	 * Bundle CSS modules with composition support
	 *
	 * Enhanced version that handles `composes` property:
	 * ```css
	 * .button {
	 *   composes: base from "./base.module.css";
	 *   color: red;
	 * }
	 * ```
	 *
	 * @example
	 * ```ts
	 * const bundler = new BunCSSBundler();
	 * const modules = await bundler.bundleModules("./styles/components.module.css");
	 * ```
	 */
	async bundleModules(modulePath: string): Promise<Record<string, string>> {
		const file = Bun.file(modulePath);
		if (!(await file.exists())) {
			throw new Error(`CSS module not found: ${modulePath}`);
		}

		const content = await file.text();
		const classNames: Record<string, string> = {};
		const compositionMap = new Map<string, string[]>();

		// Extract class names and compositions
		const classMatches = content.match(/\.([a-zA-Z][\w-]*)\s*{[\s\S]*?}/g);
		if (classMatches) {
			classMatches.forEach((match) => {
				const classNameMatch = match.match(/\.([a-zA-Z][\w-]*)\s*{/);
				if (!classNameMatch) return;

				const className = classNameMatch[1];

				// Extract composes declarations
				const composesMatch = match.match(/composes:\s*([^;]+);/);
				if (composesMatch) {
					const composesValue = composesMatch[1].trim();
					const fromMatch = composesValue.match(/from\s+["']([^"']+)["']/);

					if (fromMatch) {
						const sourceFile = fromMatch[1];
						const baseClasses = composesValue
							.replace(/\s*from\s+["'][^"']+["']/, "")
							.split(",")
							.map((c) => c.trim());

						compositionMap.set(className, baseClasses);
					} else {
						// Local composition
						const baseClasses = composesValue.split(",").map((c) => c.trim());
						compositionMap.set(className, baseClasses);
					}
				}

				// In real CSS modules, Bun would hash these
				classNames[className] = className;
			});
		}

		// Resolve compositions (simplified - Bun handles this automatically)
		for (const [className, baseClasses] of compositionMap.entries()) {
			classNames[className] = `${baseClasses.join(" ")} ${className}`;
		}

		return classNames;
	}

	/**
	 * Format color as CSS using Bun.color
	 *
	 * Uses Bun.color to convert any color format to CSS format (rgb, rgba, hsl, etc.)
	 *
	 * @example
	 * ```ts
	 * const bundler = new BunCSSBundler();
	 * const cssColor = bundler.formatColorAsCSS("#00d4ff");
	 * // Returns: "rgb(0, 212, 255)"
	 *
	 * const cssColorWithAlpha = bundler.formatColorAsCSS("#00d4ff", 0.8);
	 * // Returns: "rgba(0, 212, 255, 0.8)"
	 * ```
	 */
	formatColorAsCSS(color: string, alpha?: number): string | null {
		try {
			const cssColor = Bun.color(color, "css");
			if (!cssColor) return null;

			// Bun.color may return hex or rgb format
			// If it's hex and we need rgb/rgba, convert it
			let rgbColor = cssColor;

			// Convert hex to rgb if needed
			if (cssColor.startsWith("#")) {
				const hexMatch = cssColor.match(/#([0-9a-f]{6})/i);
				if (hexMatch) {
					const hex = hexMatch[1];
					const r = parseInt(hex.substring(0, 2), 16);
					const g = parseInt(hex.substring(2, 4), 16);
					const b = parseInt(hex.substring(4, 6), 16);
					rgbColor = `rgb(${r}, ${g}, ${b})`;
				}
			}

			// If alpha is provided and color doesn't already have alpha, convert to rgba
			if (alpha !== undefined && alpha !== 1) {
				// Parse rgb/rgba format
				const rgbMatch = rgbColor.match(
					/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/,
				);
				if (rgbMatch) {
					return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${alpha})`;
				}

				// Fallback: parse hex from original color
				const hexMatch = color.match(/#([0-9a-f]{6})/i);
				if (hexMatch) {
					const hex = hexMatch[1];
					const r = parseInt(hex.substring(0, 2), 16);
					const g = parseInt(hex.substring(2, 4), 16);
					const b = parseInt(hex.substring(4, 6), 16);
					return `rgba(${r}, ${g}, ${b}, ${alpha})`;
				}
			}

			return rgbColor;
		} catch {
			return null;
		}
	}

	/**
	 * Generate CSS variables from color map using Bun.color
	 *
	 * @example
	 * ```ts
	 * const bundler = new BunCSSBundler();
	 * const cssVars = bundler.generateColorVariables({
	 *   "accent-cyan": "#00d4ff",
	 *   "accent-purple": "#667eea",
	 * });
	 * // Returns CSS variables with properly formatted colors
	 * ```
	 */
	generateColorVariables(colorMap: Record<string, string>): string {
		const variables: string[] = [];

		for (const [name, color] of Object.entries(colorMap)) {
			const cssColor = this.formatColorAsCSS(color);
			if (cssColor) {
				variables.push(`  --${name}: ${cssColor};`);
			}
		}

		return `:root {\n${variables.join("\n")}\n}`;
	}

	/**
	 * Validate CSS syntax lowering features
	 *
	 * @example
	 * ```ts
	 * const bundler = new BunCSSBundler();
	 * const isValid = await bundler.validateSyntax("./styles/dashboard.css");
	 * ```
	 */
	async validateSyntax(cssPath: string): Promise<{
		valid: boolean;
		errors: string[];
		warnings: string[];
	}> {
		const file = Bun.file(cssPath);
		if (!(await file.exists())) {
			return {
				valid: false,
				errors: [`CSS file not found: ${cssPath}`],
				warnings: [],
			};
		}

		const content = await file.text();
		const errors: string[] = [];
		const warnings: string[] = [];

		// Validate nesting syntax
		const nestingErrors = content.match(/&[^:.\s{][\s\S]*?{/g);
		if (nestingErrors) {
			warnings.push("Potential nesting syntax issues detected");
		}

		// Validate color-mix syntax
		const colorMixErrors = content.match(/color-mix\([^)]*\)/g);
		if (colorMixErrors) {
			colorMixErrors.forEach((match) => {
				if (!match.includes("in ") || !match.includes("%")) {
					warnings.push(
						`Potential color-mix syntax issue: ${match.substring(0, 50)}`,
					);
				}
			});
		}

		// Validate composes syntax
		const composesErrors = content.match(/composes:\s*[^;]+;/g);
		if (composesErrors) {
			composesErrors.forEach((match) => {
				if (!match.includes("from") && !match.match(/composes:\s*[\w-]+/)) {
					warnings.push(`Potential composes syntax issue: ${match}`);
				}
			});
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		};
	}
}

/**
 * Singleton instance
 */
export const cssBundler = new BunCSSBundler();
