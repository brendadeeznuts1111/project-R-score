#!/usr/bin/env bun
/**
 * @fileoverview Utils Demo
 * @description Demonstrates StringMeasurement, HTMLUtils, and Color utilities
 */

import { StringMeasurement } from '../src/utils/string-measurement';
import { HTMLUtils } from '../src/utils/html-utils';
import { Color } from '../src/utils/color-utils';

async function main() {
	console.log('🚀 Utils Demo\n');

	// String Measurement Examples
	console.log('📊 String Measurement Examples');
	const text = 'Hello, \x1b[31mworld\x1b[0m! 🌍🎉';
	console.log('Original text:', text);
	console.log('String width:', StringMeasurement.width(text));
	console.log('Without ANSI:', StringMeasurement.stripANSI(text));
	console.log('Width without ANSI:', StringMeasurement.width(StringMeasurement.stripANSI(text)));
	console.log();

	// Alignment
	console.log('Alignment examples:');
	console.log('Left:  ', StringMeasurement.align('Hello', 20, 'left'));
	console.log('Right: ', StringMeasurement.align('Hello', 20, 'right'));
	console.log('Center:', StringMeasurement.align('Hello', 20, 'center'));
	console.log();

	// Truncation
	console.log('Truncation examples:');
	const longText = 'This is a very long text that needs to be truncated';
	console.log('End:', StringMeasurement.truncate(longText, 30, { position: 'end' }));
	console.log('Start:', StringMeasurement.truncate(longText, 30, { position: 'start' }));
	console.log('Middle:', StringMeasurement.truncate(longText, 30, { position: 'middle' }));
	console.log('Preserve words:', StringMeasurement.truncate(longText, 30, { preserveWords: true }));
	console.log();

	// Progress Bar
	console.log('Progress Bar examples:');
	console.log(StringMeasurement.createProgressBar(75, 100, 30, { color: 'cyan' }));
	console.log(StringMeasurement.createProgressBar(50, 100, 30, { color: 'yellow' }));
	console.log(StringMeasurement.createProgressBar(25, 100, 30, { color: 'red' }));
	console.log();

	// Table
	console.log('Table example:');
	const tableData = [
		['Name', 'Age', 'City'],
		['Alice', '30', 'New York'],
		['Bob', '25', 'Los Angeles'],
		['Charlie', '35', 'Chicago']
	];
	console.log(StringMeasurement.createTable(tableData, {
		border: true,
		header: true,
		align: ['left', 'right', 'left']
	}));
	console.log();

	// HTML Utils Examples
	console.log('📝 HTML Utils Examples');
	const userInput = '<script>alert("XSS")</script><b>Safe bold text</b>';
	console.log('Original:', userInput);
	console.log('Escaped:', HTMLUtils.escape(userInput));
	console.log('Sanitized:', HTMLUtils.sanitize(userInput));
	console.log();

	// Template
	const template = '<div class="user"><h2>{{name}}</h2><p>{{bio}}</p></div>';
	const data = {
		name: 'Alice <script>alert("XSS")</script>',
		bio: 'Software developer & OSS contributor'
	};
	console.log('Template result:');
	console.log(HTMLUtils.createTemplate(template, data));
	console.log();

	// Syntax Highlighting
	const code = `function hello(name) {
  return "Hello, " + name + "!";
}`;
	console.log('Syntax highlighting:');
	console.log(HTMLUtils.highlightSyntax(code, 'javascript'));
	console.log();

	// Color Utils Examples
	console.log('🎨 Color Utils Examples');
	console.log('HEX to RGB:', Color.hexToRGB('#FF5733'));
	console.log('RGB to HEX:', Color.rgbToHex({ r: 255, g: 87, b: 51 }));

	const hsl = Color.rgbToHSL({ r: 255, g: 87, b: 51 });
	console.log('RGB to HSL:', hsl);
	console.log('HSL to RGB:', Color.hslToRGB(hsl));
	console.log();

	// Generate palette
	const palette = Color.generatePalette('#3498db', 5);
	console.log('Color palette:');
	palette.forEach((color, i) => {
		console.log(`  ${i}: ${Color.rgbToHex(color)}`);
	});
	console.log();

	// Text gradient
	const gradientText = Color.gradient(
		'Hello, World!',
		{ r: 255, g: 0, b: 0 },
		{ r: 0, g: 0, b: 255 }
	);
	console.log('Gradient text:', gradientText);
	console.log();

	// Contrast color
	const bgColor = Color.hexToRGB('#3498db');
	const contrast = Color.getContrastColor(bgColor);
	console.log(`Contrast color for #3498db: ${contrast}`);
	console.log();

	console.log('✅ Demo complete');
}

main().catch(console.error);
