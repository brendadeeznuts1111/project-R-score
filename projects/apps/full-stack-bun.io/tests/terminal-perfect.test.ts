import { test, expect } from 'bun:test';

test('Bun.stringWidth handles ANSI codes correctly', () => {
	const plainText = 'Hello World';
	const ansiText = '\u001b[31mHello World\u001b[0m';
	
	// Plain text width should be 11
	expect(Bun.stringWidth(plainText)).toBe(11);
	
	// ANSI text should have same visual width (ANSI codes don't count)
	expect(Bun.stringWidth(ansiText)).toBe(11);
});

test('Bun.stringWidth handles emoji correctly', () => {
	const textWithEmoji = '🚀 Hello';
	const emojiWidth = Bun.stringWidth('🚀');
	
	// Emoji typically takes 2 character widths
	expect(emojiWidth).toBeGreaterThanOrEqual(1);
	expect(Bun.stringWidth(textWithEmoji)).toBeGreaterThan(6);
});

test('Bun.stringWidth handles mixed ANSI and emoji', () => {
	const mixed = '\u001b[31m🚀 Hello\u001b[0m';
	const width = Bun.stringWidth(mixed);
	
	// Should count emoji width but not ANSI codes
	expect(width).toBeGreaterThan(6);
});

test('Bun.stringWidth handles empty string', () => {
	expect(Bun.stringWidth('')).toBe(0);
});

test('Bun.stringWidth handles padding correctly', () => {
	const text = 'Test';
	const padded = text.padEnd(10);
	
	// Padded string should have width of 10
	expect(Bun.stringWidth(padded)).toBe(10);
});

test('Bun.stringWidth handles ANSI colors in table alignment', () => {
	const redText = '\u001b[31m5.82%\u001b[0m';
	const greenText = '\u001b[32m4.37%\u001b[0m';
	
	const redWidth = Bun.stringWidth(redText);
	const greenWidth = Bun.stringWidth(greenText);
	
	// Both should have same visual width (5 characters)
	expect(redWidth).toBe(5);
	expect(greenWidth).toBe(5);
	
	// Manual ANSI-aware padding
	const padToWidth = (str: string, targetWidth: number): string => {
		const width = Bun.stringWidth(str);
		const padding = Math.max(0, targetWidth - width);
		return str + ' '.repeat(padding);
	};
	
	const redPadded = padToWidth(redText, 10);
	const greenPadded = padToWidth(greenText, 10);
	
	expect(Bun.stringWidth(redPadded)).toBe(10);
	expect(Bun.stringWidth(greenPadded)).toBe(10);
});

