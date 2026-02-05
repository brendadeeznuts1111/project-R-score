/**
 * @fileoverview Bun Color Utilities
 * @description Color utilities using Bun's native color support
 * @module utils/bun-color
 *
 * Bun provides color utilities through Bun.color
 * Reference: Bun's color implementation
 *
 * Note: This extends the existing color utilities in src/utils/bun.ts
 * Use Bun.color() for parsing colors, this provides convenience methods
 */

/**
 * Color utilities using Bun's color support
 *
 * Bun.color provides ANSI color codes and color formatting
 */
// ANSI escape codes
const RESET = "\x1b[0m";
const CODES = {
	black: "\x1b[30m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
	white: "\x1b[37m",
	gray: "\x1b[90m",
	brightBlack: "\x1b[90m",
	brightRed: "\x1b[91m",
	brightGreen: "\x1b[92m",
	brightYellow: "\x1b[93m",
	brightBlue: "\x1b[94m",
	brightMagenta: "\x1b[95m",
	brightCyan: "\x1b[96m",
	brightWhite: "\x1b[97m",
} as const;

export class BunColor {
	/**
	 * Reset color code
	 */
	static reset = RESET;

	/**
	 * Background colors
	 */
	static bgBlack = "\x1b[40m";
	static bgRed = "\x1b[41m";
	static bgGreen = "\x1b[42m";
	static bgYellow = "\x1b[43m";
	static bgBlue = "\x1b[44m";
	static bgMagenta = "\x1b[45m";
	static bgCyan = "\x1b[46m";
	static bgWhite = "\x1b[47m";

	/**
	 * Bright background colors
	 */
	static bgBrightBlack = "\x1b[100m";
	static bgBrightRed = "\x1b[101m";
	static bgBrightGreen = "\x1b[102m";
	static bgBrightYellow = "\x1b[103m";
	static bgBrightBlue = "\x1b[104m";
	static bgBrightMagenta = "\x1b[105m";
	static bgBrightCyan = "\x1b[106m";
	static bgBrightWhite = "\x1b[107m";

	/**
	 * Text styles
	 */
	static boldCode = "\x1b[1m";
	static dim = "\x1b[2m";
	static italic = "\x1b[3m";
	static underline = "\x1b[4m";
	static strikethrough = "\x1b[9m";

	/**
	 * Color text with reset
	 */
	static color(text: string, colorCode: string): string {
		return `${colorCode}${text}${RESET}`;
	}

	/**
	 * Color text (cyan - matches NEXUS theme)
	 */
	static cyan(text: string): string {
		return `${CODES.cyan}${text}${RESET}`;
	}

	/**
	 * Color text (red - for errors)
	 */
	static red(text: string): string {
		return `${CODES.red}${text}${RESET}`;
	}

	/**
	 * Color text (green - for success)
	 */
	static green(text: string): string {
		return `${CODES.green}${text}${RESET}`;
	}

	/**
	 * Color text (yellow - for warnings)
	 */
	static yellow(text: string): string {
		return `${CODES.yellow}${text}${RESET}`;
	}

	/**
	 * Color text (magenta - for highlights)
	 */
	static magenta(text: string): string {
		return `${CODES.magenta}${text}${RESET}`;
	}

	/**
	 * Color text (blue - for info)
	 */
	static blue(text: string): string {
		return `${CODES.blue}${text}${RESET}`;
	}

	/**
	 * Color text (gray - for secondary/muted text)
	 */
	static gray(text: string): string {
		return `${CODES.gray}${text}${RESET}`;
	}

	/**
	 * Color text (bright green - for success indicators)
	 */
	static brightGreen(text: string): string {
		return `${CODES.brightGreen}${text}${RESET}`;
	}

	/**
	 * Color text (bright red - for error indicators)
	 */
	static brightRed(text: string): string {
		return `${CODES.brightRed}${text}${RESET}`;
	}

	/**
	 * Color text (bright cyan - for primary highlights)
	 */
	static brightCyan(text: string): string {
		return `${CODES.brightCyan}${text}${RESET}`;
	}

	/**
	 * Color text (bright yellow - for important warnings)
	 */
	static brightYellow(text: string): string {
		return `${CODES.brightYellow}${text}${RESET}`;
	}

	/**
	 * Color text (bright blue - for info highlights)
	 */
	static brightBlue(text: string): string {
		return `${CODES.brightBlue}${text}${RESET}`;
	}

	/**
	 * Color text (bright magenta - for special highlights)
	 */
	static brightMagenta(text: string): string {
		return `${CODES.brightMagenta}${text}${RESET}`;
	}

	/**
	 * Color text (bright white - for emphasis)
	 */
	static brightWhite(text: string): string {
		return `${CODES.brightWhite}${text}${RESET}`;
	}

	/**
	 * Bold text
	 */
	static bold(text: string): string {
		return `\x1b[1m${text}${RESET}`;
	}

	/**
	 * Department color mapping (matches TEAM.md colors)
	 */
	static departmentColors: Record<string, string> = {
		"API & Routes": "\x1b[36m",
		"Arbitrage & Trading": "\x1b[31m",
		"ORCA & Sports Betting": "\x1b[35m",
		"Dashboard & UI": "\x1b[34m",
		"Registry & MCP Tools": "\x1b[35m",
		Security: "\x1b[33m",
		"Performance & Caching": "\x1b[32m",
		"Documentation & DX": "\x1b[32m",
	};

	/**
	 * Color text by department
	 */
	static department(text: string, department: string): string {
		const colorCode = this.departmentColors[department];
		if (colorCode) {
			return this.color(text, colorCode);
		}
		return text;
	}

	/**
	 * RGB color using Bun.color for parsing
	 *
	 * @example
	 * ```ts
	 * BunColor.rgb("#00d4ff", "Cyan text");
	 * BunColor.rgb("rgb(0, 212, 255)", "Cyan text");
	 * ```
	 */
	static rgb(color: string, text: string): string {
		try {
			// Use Bun.color to parse and convert to ANSI
			const ansi = Bun.color(color, "ansi-16m");
			return `${ansi}${text}${this.reset}`;
		} catch {
			// Fallback to manual RGB if Bun.color fails
			const match = color.match(/#([0-9a-f]{6})/i);
			if (match) {
				const hex = match[1];
				const r = parseInt(hex.substring(0, 2), 16);
				const g = parseInt(hex.substring(2, 4), 16);
				const b = parseInt(hex.substring(4, 6), 16);
				return `\x1b[38;2;${r};${g};${b}m${text}${this.reset}`;
			}
			return text;
		}
	}

	/**
	 * Background RGB color using Bun.color
	 */
	static bgRgb(color: string, text: string): string {
		try {
			const ansi = Bun.color(color, "ansi-16m");
			// Convert foreground to background (add 10 to the code)
			const bgAnsi = ansi.replace(/\x1b\[38;2;/, "\x1b[48;2;");
			return `${bgAnsi}${text}${this.reset}`;
		} catch {
			const match = color.match(/#([0-9a-f]{6})/i);
			if (match) {
				const hex = match[1];
				const r = parseInt(hex.substring(0, 2), 16);
				const g = parseInt(hex.substring(2, 4), 16);
				const b = parseInt(hex.substring(4, 6), 16);
				return `\x1b[48;2;${r};${g};${b}m${text}${this.reset}`;
			}
			return text;
		}
	}

	/**
	 * NEXUS theme colors (matching dashboard)
	 * Uses Bun.color for parsing hex colors
	 */
	static theme = {
		primary: (text: string) => BunColor.rgb("#667eea", text), // Indigo
		secondary: (text: string) => BunColor.rgb("#00d4ff", text), // Cyan
		accent: (text: string) => BunColor.rgb("#9c27b0", text), // Purple
		success: (text: string) => BunColor.rgb("#10b981", text), // Green
		warning: (text: string) => BunColor.rgb("#f59e0b", text), // Yellow
		error: (text: string) => BunColor.rgb("#ef4444", text), // Red
	};
}

/**
 * Export singleton instance
 */
export const colors = BunColor;
