#!/usr/bin/env bun
/**
 * Color Utility Module
 *
 * Uses Bun's native color API for parsing, converting, and manipulating colors.
 * https://bun.sh/docs/runtime/color
 */

export type ColorInput =
	| string
	| number
	| { r: number; g: number; b: number; a?: number }
	| [number, number, number, number?];

export type ColorFormat =
	| "css"
	| "ansi"
	| "ansi-16"
	| "ansi-256"
	| "ansi-16m"
	| "number"
	| "rgb"
	| "rgba"
	| "hsl"
	| "hex"
	| "HEX"
	| "{rgb}"
	| "{rgba}"
	| "[rgb]"
	| "[rgba]";

export interface RGBA {
	r: number; // 0-255
	g: number; // 0-255
	b: number; // 0-255
	a: number; // 0-1
}

export interface RGB {
	r: number; // 0-255
	g: number; // 0-255
	b: number; // 0-255
}

/**
 * Parse and convert a color to the specified format
 */
export function convertColor(
	input: ColorInput,
	format: ColorFormat,
): string | number | RGBA | RGB | number[] | null {
	// @ts-expect-error - Bun.color is available at runtime
	if (typeof Bun !== "undefined" && Bun.color) {
		// @ts-expect-error
		return Bun.color(input, format);
	}

	// Fallback implementation
	return fallbackConvert(input, format);
}

/**
 * Get RGBA channels from a color
 */
export function getRGBA(input: ColorInput): RGBA | null {
	const result = convertColor(input, "{rgba}");
	return result as RGBA | null;
}

/**
 * Get RGB channels from a color (no alpha)
 */
export function getRGB(input: ColorInput): RGB | null {
	const result = convertColor(input, "{rgb}");
	return result as RGB | null;
}

/**
 * Get RGBA as array [r, g, b, a]
 */
export function getRGBAArray(
	input: ColorInput,
): [number, number, number, number] | null {
	const result = convertColor(input, "[rgba]");
	return result as [number, number, number, number] | null;
}

/**
 * Get color as 24-bit number
 */
export function getColorNumber(input: ColorInput): number | null {
	return convertColor(input, "number") as number | null;
}

/**
 * Get color as CSS string
 */
export function getCSSColor(input: ColorInput): string | null {
	return convertColor(input, "css") as string | null;
}

/**
 * Get ANSI color code for terminals
 */
export function getANSIColor(
	input: ColorInput,
	variant: "ansi" | "ansi-16" | "ansi-256" | "ansi-16m" = "ansi",
): string | null {
	return convertColor(input, variant) as string | null;
}

/**
 * Get hex color string
 */
export function getHexColor(input: ColorInput, uppercase = false): string | null {
	return convertColor(input, uppercase ? "HEX" : "hex") as string | null;
}

/**
 * Get HSL color string
 */
export function getHSLColor(input: ColorInput): string | null {
	return convertColor(input, "hsl") as string | null;
}

/**
 * Create color from RGB values
 */
export function fromRGB(r: number, g: number, b: number, a?: number): RGBA {
	return { r, g, b, a: a ?? 1 };
}

/**
 * Create color from hex string
 */
export function fromHex(hex: string): RGBA | null {
	return getRGBA(hex);
}

/**
 * Blend two colors together
 */
export function blendColors(
	color1: ColorInput,
	color2: ColorInput,
	ratio = 0.5,
): RGBA | null {
	const c1 = getRGBA(color1);
	const c2 = getRGBA(color2);

	if (!c1 || !c2) return null;

	const inverseRatio = 1 - ratio;
	return {
		r: Math.round(c1.r * inverseRatio + c2.r * ratio),
		g: Math.round(c1.g * inverseRatio + c2.g * ratio),
		b: Math.round(c1.b * inverseRatio + c2.b * ratio),
		a: c1.a * inverseRatio + c2.a * ratio,
	};
}

/**
 * Lighten a color by a percentage (0-1)
 */
export function lighten(input: ColorInput, amount = 0.1): RGBA | null {
	const rgba = getRGBA(input);
	if (!rgba) return null;

	return {
		r: Math.min(255, Math.round(rgba.r + (255 - rgba.r) * amount)),
		g: Math.min(255, Math.round(rgba.g + (255 - rgba.g) * amount)),
		b: Math.min(255, Math.round(rgba.b + (255 - rgba.b) * amount)),
		a: rgba.a,
	};
}

/**
 * Darken a color by a percentage (0-1)
 */
export function darken(input: ColorInput, amount = 0.1): RGBA | null {
	const rgba = getRGBA(input);
	if (!rgba) return null;

	return {
		r: Math.max(0, Math.round(rgba.r * (1 - amount))),
		g: Math.max(0, Math.round(rgba.g * (1 - amount))),
		b: Math.max(0, Math.round(rgba.b * (1 - amount))),
		a: rgba.a,
	};
}

/**
 * Calculate relative luminance of a color
 */
export function getLuminance(input: ColorInput): number | null {
	const rgba = getRGBA(input);
	if (!rgba) return null;

	// Convert to linear RGB
	const r = rgba.r / 255;
	const g = rgba.g / 255;
	const b = rgba.b / 255;

	const linearR = r <= 0.03928 ? r / 12.92 : ((r + 0.055) / 1.055) ** 2.4;
	const linearG = g <= 0.03928 ? g / 12.92 : ((g + 0.055) / 1.055) ** 2.4;
	const linearB = b <= 0.03928 ? b / 12.92 : ((b + 0.055) / 1.055) ** 2.4;

	return 0.2126 * linearR + 0.7152 * linearG + 0.0722 * linearB;
}

/**
 * Determine if a color is light or dark
 */
export function isLight(input: ColorInput): boolean | null {
	const luminance = getLuminance(input);
	if (luminance === null) return null;
	return luminance > 0.5;
}

/**
 * Get contrasting text color (black or white) for a background
 */
export function getContrastColor(input: ColorInput): "#000000" | "#ffffff" | null {
	const isBgLight = isLight(input);
	if (isBgLight === null) return null;
	return isBgLight ? "#000000" : "#ffffff";
}

/**
 * Calculate contrast ratio between two colors (WCAG)
 */
export function getContrastRatio(color1: ColorInput, color2: ColorInput): number | null {
	const lum1 = getLuminance(color1);
	const lum2 = getLuminance(color2);

	if (lum1 === null || lum2 === null) return null;

	const lighter = Math.max(lum1, lum2);
	const darker = Math.min(lum1, lum2);

	return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color meets WCAG AA contrast standards
 */
export function meetsWCAG(
	color1: ColorInput,
	color2: ColorInput,
	level: "AA" | "AAA" = "AA",
): boolean | null {
	const ratio = getContrastRatio(color1, color2);
	if (ratio === null) return null;

	const threshold = level === "AAA" ? 7 : 4.5;
	return ratio >= threshold;
}

/**
 * Get terminal color code for a topic based on its configured color
 */
export function getTopicColor(topicColor: string): {
	ansi: string | null;
	hex: string | null;
	rgba: RGBA | null;
	isLight: boolean | null;
	contrastText: "#000000" | "#ffffff" | null;
} {
	const ansi = getANSIColor(topicColor);
	const hex = getHexColor(topicColor);
	const rgba = getRGBA(topicColor);
	const light = rgba ? isLight(rgba) : null;
	const contrast = rgba ? getContrastColor(rgba) : null;

	return {
		ansi,
		hex,
		rgba,
		isLight: light,
		contrastText: contrast,
	};
}

/**
 * Fallback implementation when Bun.color is not available
 */
function fallbackConvert(
	input: ColorInput,
	format: ColorFormat,
): string | number | RGBA | RGB | number[] | null {
	// Parse input to RGBA
	let rgba: RGBA | null = null;

	if (typeof input === "string") {
		rgba = parseCSSColor(input);
	} else if (typeof input === "number") {
		rgba = {
			r: (input >> 16) & 0xff,
			g: (input >> 8) & 0xff,
			b: input & 0xff,
			a: 1,
		};
	} else if (Array.isArray(input)) {
		rgba = {
			r: input[0],
			g: input[1],
			b: input[2],
			a: input[3] !== undefined ? input[3] / 255 : 1,
		};
	} else if (typeof input === "object" && input !== null) {
		rgba = {
			r: input.r,
			g: input.g,
			b: input.b,
			a: input.a ?? 1,
		};
	}

	if (!rgba) return null;

	// Convert to requested format
	switch (format) {
		case "{rgba}":
			return rgba;
		case "{rgb}":
			return { r: rgba.r, g: rgba.g, b: rgba.b };
		case "[rgba]":
			return [rgba.r, rgba.g, rgba.b, Math.round(rgba.a * 255)];
		case "[rgb]":
			return [rgba.r, rgba.g, rgba.b];
		case "number":
			return (rgba.r << 16) | (rgba.g << 8) | rgba.b;
		case "hex":
			return `#${((1 << 24) + (rgba.r << 16) + (rgba.g << 8) + rgba.b).toString(16).slice(1)}`;
		case "HEX":
			return `#${((1 << 24) + (rgba.r << 16) + (rgba.g << 8) + rgba.b).toString(16).slice(1)}`.toUpperCase();
		case "rgb":
			return `rgb(${rgba.r}, ${rgba.g}, ${rgba.b})`;
		case "rgba":
			return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`;
		case "css":
			if (rgba.a === 1) return fallbackConvert(input, "hex") as string;
			return fallbackConvert(input, "rgba") as string;
		case "ansi":
		case "ansi-16m":
			return `\x1b[38;2;${rgba.r};${rgba.g};${rgba.b}m`;
		default:
			return null;
	}
}

/**
 * Simple CSS color parser (fallback)
 */
function parseCSSColor(color: string): RGBA | null {
	const namedColors: Record<string, RGBA> = {
		red: { r: 255, g: 0, b: 0, a: 1 },
		green: { r: 0, g: 128, b: 0, a: 1 },
		blue: { r: 0, g: 0, b: 255, a: 1 },
		white: { r: 255, g: 255, b: 255, a: 1 },
		black: { r: 0, g: 0, b: 0, a: 1 },
		yellow: { r: 255, g: 255, b: 0, a: 1 },
		cyan: { r: 0, g: 255, b: 255, a: 1 },
		magenta: { r: 255, g: 0, b: 255, a: 1 },
		gray: { r: 128, g: 128, b: 128, a: 1 },
		orange: { r: 255, g: 165, b: 0, a: 1 },
		purple: { r: 128, g: 0, b: 128, a: 1 },
		pink: { r: 255, g: 192, b: 203, a: 1 },
		brown: { r: 165, g: 42, b: 42, a: 1 },
	};

	// Named color
	const lower = color.toLowerCase().trim();
	if (namedColors[lower]) return namedColors[lower];

	// Hex
	if (color.startsWith("#")) {
		const hex = color.slice(1);
		if (hex.length === 3) {
			return {
				r: parseInt(hex[0] + hex[0], 16),
				g: parseInt(hex[1] + hex[1], 16),
				b: parseInt(hex[2] + hex[2], 16),
				a: 1,
			};
		} else if (hex.length === 6) {
			return {
				r: parseInt(hex.slice(0, 2), 16),
				g: parseInt(hex.slice(2, 4), 16),
				b: parseInt(hex.slice(4, 6), 16),
				a: 1,
			};
		}
	}

	// RGB/RGBA
	const rgbMatch = color.match(
		/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/,
	);
	if (rgbMatch) {
		return {
			r: parseInt(rgbMatch[1]),
			g: parseInt(rgbMatch[2]),
			b: parseInt(rgbMatch[3]),
			a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1,
		};
	}

	return null;
}

// CLI
if (import.meta.main) {
	const [, , command, ...args] = process.argv;

	switch (command) {
		case "convert": {
			const [color, format] = args;
			if (color && format) {
				const result = convertColor(color, format as ColorFormat);
				console.log(result);
			} else {
				console.log("Usage: color convert <color> <format>");
				console.log("Example: color convert red hex");
			}
			break;
		}

		case "rgba": {
			const [color] = args;
			if (color) {
				const rgba = getRGBA(color);
				if (rgba) {
					console.log(`R: ${rgba.r}, G: ${rgba.g}, B: ${rgba.b}, A: ${rgba.a}`);
				} else {
					console.log("Invalid color");
				}
			}
			break;
		}

		case "ansi": {
			const [color] = args;
			if (color) {
				const ansi = getANSIColor(color);
				if (ansi) {
					console.log(`${ansi}This is colored text${"\x1b[0m"}`);
					console.log(`ANSI code: ${JSON.stringify(ansi)}`);
				}
			}
			break;
		}

		case "contrast": {
			const [bg, fg] = args;
			if (bg && fg) {
				const ratio = getContrastRatio(bg, fg);
				const meetsAA = meetsWCAG(bg, fg, "AA");
				const meetsAAA = meetsWCAG(bg, fg, "AAA");
				console.log(`Contrast ratio: ${ratio?.toFixed(2)}:1`);
				console.log(`WCAG AA: ${meetsAA ? "✅ Pass" : "❌ Fail"}`);
				console.log(`WCAG AAA: ${meetsAAA ? "✅ Pass" : "❌ Fail"}`);
			}
			break;
		}

		case "lighten": {
			const [color, amount] = args;
			if (color) {
				const result = lighten(color, parseFloat(amount) || 0.2);
				console.log(result);
			}
			break;
		}

		case "darken": {
			const [color, amount] = args;
			if (color) {
				const result = darken(color, parseFloat(amount) || 0.2);
				console.log(result);
			}
			break;
		}

		case "topics": {
			// Show topic colors from config
			const topicColors: Record<string, string> = {
				General: "#4CAF50",
				Alerts: "#F44336",
				Logs: "#2196F3",
				Development: "#9C27B0",
			};

			console.log("Topic Colors:");
			for (const [name, color] of Object.entries(topicColors)) {
				const info = getTopicColor(color);
				const ansi = info.ansi || "";
				const reset = "\x1b[0m";
				console.log(
					`  ${ansi}●${reset} ${name.padEnd(15)} ${info.hex} RGB(${info.rgba?.r},${info.rgba?.g},${info.rgba?.b}) ${info.isLight ? "(light)" : "(dark)"}`,
				);
			}
			break;
		}

		default:
			console.log(`
Color Utility - Uses Bun.color() API

Usage:
  color convert <color> <format>  Convert color to format
  color rgba <color>              Get RGBA channels
  color ansi <color>              Show ANSI color code
  color contrast <bg> <fg>        Check contrast ratio
  color lighten <color> [amt]     Lighten color (0-1)
  color darken <color> [amt]      Darken color (0-1)
  color topics                    Show topic colors

Formats: css, ansi, hex, HEX, rgb, rgba, hsl, number, {rgb}, {rgba}, [rgb], [rgba]

Examples:
  color convert red hex
  color rgba "rgb(255, 99, 71)"
  color ansi "#4CAF50"
  color contrast white black
  color lighten "#4CAF50" 0.3
`);
	}
}
