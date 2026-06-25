#!/usr/bin/env bun
/**
 * @fileoverview Utils Demo
 * @description Demonstrates StringMeasurement, HTMLUtils, and Color utilities
 */

import { StringMeasurement } from '../src/utils/string-measurement';
import { HTMLUtils } from '../src/utils/html-utils';
import { Color } from '../src/utils/color-utils';

async function main() {
	console.info('🚀 Utils Demo\n');

	// String Measurement Examples
	console.info('📊 String Measurement Examples');
	const text = 'Hello, \x1b[31mworld\x1b[0m! 🌍🎉';
	console.info('Original text:', text);
	console.info('String width:', StringMeasurement.width(text));
	console.info('Without ANSI:', StringMeasurement.stripANSI(text));
	console.info('Width without ANSI:', StringMeasurement.width(StringMeasurement.stripANSI(text)));
	console.info();

	// Alignment
	console.info('Alignment examples:');
	console.info('Left:  ', StringMeasurement.align('Hello', 20, 'left'));
	console.info('Right: ', StringMeasurement.align('Hello', 20, 'right'));
	console.info('Center:', StringMeasurement.align('Hello', 20, 'center'));
	console.info();

	// Truncation
	console.info('Truncation examples:');
	const longText = 'This is a very long text that needs to be truncated';
	console.info('End:', StringMeasurement.truncate(longText, 30, { position: 'end' }));
	console.info('Start:', StringMeasurement.truncate(longText, 30, { position: 'start' }));
	console.info('Middle:', StringMeasurement.truncate(longText, 30, { position: 'middle' }));
	console.info('Preserve words:', StringMeasurement.truncate(longText, 30, { preserveWords: true }));
	console.info();

	// Progress Bar
	console.info('Progress Bar examples:');
	console.info(StringMeasurement.createProgressBar(75, 100, 30, { color: 'cyan' }));
	console.info(StringMeasurement.createProgressBar(50, 100, 30, { color: 'yellow' }));
	console.info(StringMeasurement.createProgressBar(25, 100, 30, { color: 'red' }));
	console.info();

	// Table
	console.info('Table example:');
	const tableData = [
		['Name', 'Age', 'City'],
		['Alice', '30', 'New York'],
		['Bob', '25', 'Los Angeles'],
		['Charlie', '35', 'Chicago']
	];
	console.info(StringMeasurement.createTable(tableData, {
		border: true,
		header: true,
		align: ['left', 'right', 'left']
	}));
	console.info();

	// HTML Utils Examples
	console.info('📝 HTML Utils Examples');
	const userInput = '<script>alert("XSS")</script><b>Safe bold text</b>';
	console.info('Original:', userInput);
	console.info('Escaped:', HTMLUtils.escape(userInput));
	console.info('Sanitized:', HTMLUtils.sanitize(userInput));
	console.info();

	// Template
	const template = '<div class="user"><h2>{{name}}</h2><p>{{bio}}</p></div>';
	const data = {
		name: 'Alice <script>alert("XSS")</script>',
		bio: 'Software developer & OSS contributor'
	};
	console.info('Template result:');
	console.info(HTMLUtils.createTemplate(template, data));
	console.info();

	// Syntax Highlighting
	const code = `function hello(name) {
  return "Hello, " + name + "!";
}`;
	console.info('Syntax highlighting:');
	console.info(HTMLUtils.highlightSyntax(code, 'javascript'));
	console.info();

	// Color Utils Examples
	console.info('🎨 Color Utils Examples');
	console.info('HEX to RGB:', Color.hexToRGB('#FF5733'));
	console.info('RGB to HEX:', Color.rgbToHex({ r: 255, g: 87, b: 51 }));

	const hsl = Color.rgbToHSL({ r: 255, g: 87, b: 51 });
	console.info('RGB to HSL:', hsl);
	console.info('HSL to RGB:', Color.hslToRGB(hsl));
	console.info();

	// Generate palette
	const palette = Color.generatePalette('#3498db', 5);
	console.info('Color palette:');
	palette.forEach((color, i) => {
		console.info(`  ${i}: ${Color.rgbToHex(color)}`);
	});
	console.info();

	// Text gradient
	const gradientText = Color.gradient(
		'Hello, World!',
		{ r: 255, g: 0, b: 0 },
		{ r: 0, g: 0, b: 255 }
	);
	console.info('Gradient text:', gradientText);
	console.info();

	// Contrast color
	const bgColor = Color.hexToRGB('#3498db');
	const contrast = Color.getContrastColor(bgColor);
	console.info(`Contrast color for #3498db: ${contrast}`);
	console.info();

	console.info('✅ Demo complete');
}

main().catch(console.error);
