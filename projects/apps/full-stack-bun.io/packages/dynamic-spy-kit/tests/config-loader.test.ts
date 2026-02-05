/**
 * Config Loader Test Suite
 * 
 * Tests hidden file matching with Bun Glob API
 */

import { test, expect, beforeEach, afterEach } from "bun:test";
import { ConfigLoader } from "../src/config-loader";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";

const TEST_DIR = './test-config';

beforeEach(async () => {
	// Create test config directory structure
	try {
		await mkdir(join(TEST_DIR, 'sports'), { recursive: true });
		
		// Create visible config files
		await writeFile(
			join(TEST_DIR, 'sports', 'football.json'),
			JSON.stringify({ sport: 'football', markets: 100 })
		);
		
		await writeFile(
			join(TEST_DIR, 'sports', 'basketball.json'),
			JSON.stringify({ sport: 'basketball', markets: 50 })
		);
		
		// Create hidden config files
		await writeFile(
			join(TEST_DIR, 'sports', '.env.local'),
			'API_KEY=test123\nSECRET=secret456'
		);
		
		await writeFile(
			join(TEST_DIR, 'sports', '.secrets'),
			'PINNACLE_KEY=pk_test\nFONBET_KEY=fk_test'
		);
	} catch (e: any) {
		if (e.code !== 'EEXIST') {
			throw e;
		}
	}
});

afterEach(async () => {
	// Clean up test directory
	try {
		await rm(TEST_DIR, { recursive: true, force: true });
	} catch (e) {
		// Ignore cleanup errors
	}
});

test('scanConfigFiles - includes hidden files', async () => {
	const loader = new ConfigLoader(TEST_DIR);
	const files = await loader.scanConfigFiles('sports/**/*.{json,env,secrets}', {
		hidden: true
	});

	// Should include both visible and hidden files
	expect(files.length).toBeGreaterThanOrEqual(4);
	
	// Check for hidden files
	const hasEnvFile = files.some(f => f.includes('.env.local'));
	const hasSecretsFile = files.some(f => f.includes('.secrets'));
	
	expect(hasEnvFile).toBe(true);
	expect(hasSecretsFile).toBe(true);
});

test('scanConfigFiles - excludes hidden files when hidden=false', async () => {
	const loader = new ConfigLoader(TEST_DIR);
	const files = await loader.scanConfigFiles('sports/**/*.{json,env,secrets}', {
		hidden: false
	});

	// Should only include visible files
	const hasEnvFile = files.some(f => f.includes('.env.local'));
	const hasSecretsFile = files.some(f => f.includes('.secrets'));
	
	// Hidden files should not be included
	expect(hasEnvFile).toBe(false);
	expect(hasSecretsFile).toBe(false);
});

test('loadConfigFiles - loads JSON configs', async () => {
	const loader = new ConfigLoader(TEST_DIR);
	const configs = await loader.loadConfigFiles('sports/*.json', {
		hidden: false
	});

	expect(configs.length).toBeGreaterThanOrEqual(2);
	
	const footballConfig = configs.find(c => c.path.includes('football.json'));
	expect(footballConfig).toBeDefined();
	expect(footballConfig?.type).toBe('json');
	expect(footballConfig?.content?.sport).toBe('football');
});

test('loadConfigFile - loads env file as text', async () => {
	const loader = new ConfigLoader(TEST_DIR);
	const envPath = join(TEST_DIR, 'sports', '.env.local');
	
	const config = await loader.loadConfigFile(envPath);
	
	expect(config.type).toBe('env');
	expect(typeof config.content).toBe('string');
	expect(config.content).toContain('API_KEY=test123');
});

test('loadConfigFile - loads secrets file as text', async () => {
	const loader = new ConfigLoader(TEST_DIR);
	const secretsPath = join(TEST_DIR, 'sports', '.secrets');
	
	const config = await loader.loadConfigFile(secretsPath);
	
	expect(config.type).toBe('secrets');
	expect(typeof config.content).toBe('string');
	expect(config.content).toContain('PINNACLE_KEY=pk_test');
});

test('scanHiddenConfigs - finds all hidden files', async () => {
	const loader = new ConfigLoader(TEST_DIR);
	const hiddenFiles = await loader.scanHiddenConfigs();

	expect(hiddenFiles.length).toBeGreaterThanOrEqual(2);
	
	const hasEnv = hiddenFiles.some(f => f.includes('.env'));
	const hasSecrets = hiddenFiles.some(f => f.includes('.secrets'));
	
	expect(hasEnv).toBe(true);
	expect(hasSecrets).toBe(true);
});

test('loadEnvConfigs - loads all env files', async () => {
	const loader = new ConfigLoader(TEST_DIR);
	const envConfigs = await loader.loadEnvConfigs();

	expect(envConfigs.length).toBeGreaterThanOrEqual(1);
	
	const envConfig = envConfigs.find(c => c.path.includes('.env.local'));
	expect(envConfig).toBeDefined();
	expect(envConfig?.type).toBe('env');
});

test('loadSecretsConfigs - loads all secrets files', async () => {
	const loader = new ConfigLoader(TEST_DIR);
	const secretsConfigs = await loader.loadSecretsConfigs();

	expect(secretsConfigs.length).toBeGreaterThanOrEqual(1);
	
	const secretsConfig = secretsConfigs.find(c => c.path.includes('.secrets'));
	expect(secretsConfig).toBeDefined();
	expect(secretsConfig?.type).toBe('secrets');
});

test('getConfigFilesJSON - returns JSON string', async () => {
	const loader = new ConfigLoader(TEST_DIR);
	const json = await loader.getConfigFilesJSON('sports/*.json');

	expect(typeof json).toBe('string');
	
	const parsed = JSON.parse(json);
	expect(Array.isArray(parsed)).toBe(true);
	expect(parsed.length).toBeGreaterThan(0);
});

test('scanConfigFiles - respects cwd boundary', async () => {
	const loader = new ConfigLoader(TEST_DIR);
	const files = await loader.scanConfigFiles('sports/**/*', {
		cwd: TEST_DIR,
		hidden: true
	});

	// All files should be within TEST_DIR boundary
	files.forEach(file => {
		expect(file.startsWith(TEST_DIR) || file.startsWith('sports')).toBe(true);
	});
});

test('loadConfigFile - handles missing file gracefully', async () => {
	const loader = new ConfigLoader(TEST_DIR);
	
	await expect(
		loader.loadConfigFile('nonexistent.json')
	).rejects.toThrow();
});

test('loadConfigFiles - continues on error', async () => {
	const loader = new ConfigLoader(TEST_DIR);
	
	// Should not throw even if some files fail to load
	const configs = await loader.loadConfigFiles('sports/**/*', {
		hidden: true
	});

	// Should have loaded at least some valid configs
	expect(Array.isArray(configs)).toBe(true);
});



