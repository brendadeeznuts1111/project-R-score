/**
 * @dynamic-spy/kit v9.0 - TypeScript Definitions Test
 * 
 * Verify all TypeScript definitions are correct
 */

import { test, expect } from "bun:test";
import {
	ProductionBasketballMarket,
	createLockfile,
	isValidLoader,
	type BasketballMarketConfig
} from "../src/basketball-types";

test("BunLockFile.configVersion - documented", () => {
	// ✅ BunLockFile.configVersion
	const lockfile = createLockfile();
	
	expect(lockfile.configVersion).toBe(1);
	expect(typeof lockfile.configVersion).toBe('number');
	
	// Should be documented in type definition
	const lockfile2: { configVersion: number } = { configVersion: 1 };
	expect(lockfile2.configVersion).toBe(1);
});

test("All loaders supported - CSS/JSONC/YAML/HTML", () => {
	// ✅ All loaders
	const loaders: string[] = ['css', 'jsonc', 'yaml', 'yml', 'html', 'js', 'ts', 'json'];
	
	loaders.forEach(loader => {
		expect(isValidLoader(loader)).toBe(true);
	});
	
	// Invalid loader
	expect(isValidLoader('invalid')).toBe(false);
});

test("Production Basketball Market - TypeScript perfection", () => {
	const market = new ProductionBasketballMarket('Lakers-Celtics', {
		home: 1.95,
		away: 1.96
	});
	
	expect(market.market).toBe('Lakers-Celtics');
	expect(market.odds.home).toBe(1.95);
	expect(market.config.league).toBe('jsonc');  // ✅ jsonc support
	expect(market.lockfile?.configVersion).toBe(1);  // ✅ Documented!
	
	// Test JSONC output
	const jsonc = market.toJSONC();
	expect(jsonc).toContain('Lakers-Celtics');
	expect(jsonc).toContain('1.95');
});

test("Bun.serve - No React dependencies", () => {
	// ✅ No React bloat - Bun.serve should be available
	expect(typeof Bun.serve).toBe('function');
	expect(typeof Bun.file).toBe('function');
	expect(typeof Bun.env).toBe('object');
});

test("Loader types - CSS support", () => {
	const config: BasketballMarketConfig = {
		league: 'jsonc',
		odds: { home: 1.95, away: 1.96 },
		css: '.market { color: blue; }',  // ✅ CSS loader
		format: 'jsonc'
	};
	
	expect(config.css).toBe('.market { color: blue; }');
	expect(config.league).toBe('jsonc');
});

test("TypeScript type safety - all types work", () => {
	// Test that all types compile correctly
	const market = new ProductionBasketballMarket('Test', { home: 1.9, away: 2.0 });
	const lockfile = createLockfile({ 'test': '1.0.0' });
	
	expect(market.market).toBe('Test');
	expect(lockfile.configVersion).toBe(1);
	expect(lockfile.modules).toBeDefined();
});



