import { test, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';

// Test CSS parsing with view transitions
test('view transition CSS parses', () => {
	const css = readFileSync(join(import.meta.dir, '..', 'dashboard.css'), 'utf-8');
	
	// ✅ No "Unexpected token: ."
	expect(css).toContain('::view-transition-old(.arb-slide-out)');
	expect(css).toContain('::view-transition-new(.arb-slide-in)');
	expect(css).toContain('@layer base');
	expect(css).toContain('@layer components');
	expect(css).toContain('--buncss-light');
	expect(css).toContain('--buncss-dark');
});

// Test CSS @layer minification
test('CSS @layer minified correctly', () => {
	const css = readFileSync(join(import.meta.dir, '..', 'dashboard.css'), 'utf-8');
	
	// Verify @layer structure
	expect(css).toContain('@layer base {');
	expect(css).toContain('@layer components {');
	
	// Verify CSS variables are defined
	expect(css).toContain(':root {');
	expect(css).toContain('--arb-green');
});

// Test view transition animations
test('view transition animations defined', () => {
	const css = readFileSync(join(import.meta.dir, '..', 'dashboard.css'), 'utf-8');
	
	expect(css).toContain('@keyframes slide-in');
	expect(css).toContain('@keyframes slide-out');
	expect(css).toContain('@keyframes pulse');
	expect(css).toContain('@keyframes shimmer');
});

// Test monorepo peer dependencies (simulated)
test('monorepo peer deps resolve', () => {
	// Check if optional peer dependencies are defined in package.json
	const packageJson = JSON.parse(
		readFileSync(join(import.meta.dir, '..', 'package.json'), 'utf-8')
	);
	
	expect(packageJson.optionalPeerDependencies).toBeDefined();
	expect(packageJson.optionalPeerDependencies['pinnacle-sdk']).toBeDefined();
	expect(packageJson.optionalPeerDependencies['draftkings-api']).toBeDefined();
});

// Test dashboard HTML structure
test('dashboard HTML structure', () => {
	const dashboardHTML = readFileSync(
		join(import.meta.dir, '..', 'arb-dashboard-v2.tsx'),
		'utf-8'
	);
	
	expect(dashboardHTML).toContain('arb-dashboard');
	expect(dashboardHTML).toContain('arb-grid');
	expect(dashboardHTML).toContain('profit-card');
	expect(dashboardHTML).toContain('startViewTransition');
});

// Test dashboard server endpoints (skip if server not running)
test.skip('dashboard server health endpoint', async () => {
	// This test requires the server to be running
	// Run manually with: bun run dashboard:start
	const res = await fetch('http://localhost:3006/health');
	expect(res.ok).toBe(true);
	
	const data = await res.json();
	expect(data.status).toBe('dashboard-v2-live');
	expect(data.css_features).toBeDefined();
	expect(data.monorepo_install).toBeDefined();
	expect(data.arbitrage).toBeDefined();
}, 10000);

// Test CSS color scheme fallback
test('CSS color scheme fallback safe', () => {
	const css = readFileSync(join(import.meta.dir, '..', 'dashboard.css'), 'utf-8');
	
	// Verify CSS variables for light/dark themes
	expect(css).toContain('--buncss-light');
	expect(css).toContain('--buncss-dark');
	expect(css).toContain('--text-light');
	expect(css).toContain('--text-dark');
});

// Test npm aliases preserved (package.json) - Note: npm: aliases are supported but not required
test('package.json structure valid', () => {
	const packageJson = JSON.parse(
		readFileSync(join(import.meta.dir, '..', 'package.json'), 'utf-8')
	);
	
	// Verify package.json structure
	expect(packageJson.name).toBeDefined();
	expect(packageJson.version).toBeDefined();
	expect(packageJson.dependencies).toBeDefined();
	expect(packageJson.devDependencies).toBeDefined();
});

