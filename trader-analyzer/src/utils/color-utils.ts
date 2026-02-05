/**
 * @fileoverview Color Utilities
 * @description Color conversion and manipulation utilities
 * @module utils/color-utils
 * 
 * Provides RGB, HSL, HEX conversion and color manipulation utilities.
 */

export interface RGB {
	r: number; // 0-255
	g: number; // 0-255
	b: number; // 0-255
	a?: number; // 0-1
}

export interface HSL {
	h: number; // 0-360
	s: number; // 0-100
	l: number; // 0-100
	a?: number; // 0-1
}

/**
 * Color Utilities
 * 
 * Provides color conversion and manipulation utilities for RGB, HSL, and HEX formats.
 */
export class Color {
	/**
	 * Convert HEX to RGB
	 */
	static hexToRGB(hex: string): RGB {
		hex = hex.replace(/^#/, '');

		if (hex.length === 3) {
			hex = hex.split('').map(c => c + c).join('');
		}

		if (hex.length === 6) {
			const r = parseInt(hex.slice(0, 2), 16);
			const g = parseInt(hex.slice(2, 4), 16);
			const b = parseInt(hex.slice(4, 6), 16);

			return { r, g, b };
		}

		if (hex.length === 8) {
			const r = parseInt(hex.slice(0, 2), 16);
			const g = parseInt(hex.slice(2, 4), 16);
			const b = parseInt(hex.slice(4, 6), 16);
			const a = parseInt(hex.slice(6, 8), 16) / 255;

			return { r, g, b, a };
		}

		throw new Error(`Invalid hex color: ${hex}`);
	}

	/**
	 * Convert RGB to HEX
	 */
	static rgbToHex(rgb: RGB): string {
		const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');

		let hex = '#' + toHex(rgb.r) + toHex(rgb.g) + toHex(rgb.b);

		if (rgb.a !== undefined) {
			hex += toHex(rgb.a * 255);
		}

		return hex;
	}

	/**
	 * Convert RGB to HSL
	 */
	static rgbToHSL(rgb: RGB): HSL {
		const r = rgb.r / 255;
		const g = rgb.g / 255;
		const b = rgb.b / 255;

		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);
		let h = 0, s = 0, l = (max + min) / 2;

		if (max !== min) {
			const d = max - min;
			s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

			switch (max) {
				case r: h = (g - b) / d + (g < b ? 6 : 0); break;
				case g: h = (b - r) / d + 2; break;
				case b: h = (r - g) / d + 4; break;
			}

			h /= 6;
		}

		return {
			h: Math.round(h * 360),
			s: Math.round(s * 100),
			l: Math.round(l * 100),
			a: rgb.a
		};
	}

	/**
	 * Convert HSL to RGB
	 */
	static hslToRGB(hsl: HSL): RGB {
		const h = hsl.h / 360;
		const s = hsl.s / 100;
		const l = hsl.l / 100;

		let r = 0, g = 0, b = 0;

		if (s === 0) {
			r = g = b = l;
		} else {
			const hue2rgb = (p: number, q: number, t: number) => {
				if (t < 0) t += 1;
				if (t > 1) t -= 1;
				if (t < 1/6) return p + (q - p) * 6 * t;
				if (t < 1/2) return q;
				if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
				return p;
			};

			const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
			const p = 2 * l - q;

			r = hue2rgb(p, q, h + 1/3);
			g = hue2rgb(p, q, h);
			b = hue2rgb(p, q, h - 1/3);
		}

		return {
			r: Math.round(r * 255),
			g: Math.round(g * 255),
			b: Math.round(b * 255),
			a: hsl.a
		};
	}

	/**
	 * Adjust brightness of RGB color
	 */
	static adjustBrightness(rgb: RGB, factor: number): RGB {
		const adjust = (c: number) => Math.max(0, Math.min(255, c * factor));

		return {
			r: adjust(rgb.r),
			g: adjust(rgb.g),
			b: adjust(rgb.b),
			a: rgb.a
		};
	}

	/**
	 * Blend two colors
	 */
	static blend(color1: RGB, color2: RGB, weight: number = 0.5): RGB {
		const w = Math.max(0, Math.min(1, weight));

		return {
			r: Math.round(color1.r * (1 - w) + color2.r * w),
			g: Math.round(color1.g * (1 - w) + color2.g * w),
			b: Math.round(color1.b * (1 - w) + color2.b * w),
			a: color1.a !== undefined && color2.a !== undefined
				? color1.a * (1 - w) + color2.a * w
				: undefined
		};
	}

	/**
	 * Get contrast color (black or white) for a given RGB color
	 */
	static getContrastColor(rgb: RGB): 'black' | 'white' {
		// Calculate relative luminance
		const r = rgb.r / 255;
		const g = rgb.g / 255;
		const b = rgb.b / 255;

		const gammaCorrect = (c: number) =>
			c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

		const luminance =
			0.2126 * gammaCorrect(r) +
			0.7152 * gammaCorrect(g) +
			0.0722 * gammaCorrect(b);

		return luminance > 0.179 ? 'black' : 'white';
	}

	/**
	 * Generate color palette from base color
	 */
	static generatePalette(baseColor: RGB | string, count: number = 5): RGB[] {
		const rgb = typeof baseColor === 'string'
			? this.hexToRGB(baseColor)
			: baseColor;

		const hsl = this.rgbToHSL(rgb);
		const palette: RGB[] = [];

		for (let i = 0; i < count; i++) {
			const hueShift = (i * (360 / count)) % 360;
			const newHsl = {
				...hsl,
				h: (hsl.h + hueShift) % 360,
				s: Math.min(100, hsl.s * (1 + i * 0.1))
			};

			palette.push(this.hslToRGB(newHsl));
		}

		return palette;
	}

	/**
	 * Convert RGB to ANSI color code
	 */
	static toANSI(rgb: RGB, foreground: boolean = true): string {
		if (foreground) {
			return `\x1b[38;2;${rgb.r};${rgb.g};${rgb.b}m`;
		} else {
			return `\x1b[48;2;${rgb.r};${rgb.g};${rgb.b}m`;
		}
	}

	/**
	 * Create gradient text with ANSI colors
	 */
	static gradient(text: string, startColor: RGB, endColor: RGB): string {
		const characters = text.split('');
		const gradientColors = characters.map((_, i) => {
			const weight = characters.length > 1 ? i / (characters.length - 1) : 0;
			return this.blend(startColor, endColor, weight);
		});

		return characters
			.map((char, i) => this.toANSI(gradientColors[i]) + char)
			.join('') + '\x1b[0m';
	}
}
