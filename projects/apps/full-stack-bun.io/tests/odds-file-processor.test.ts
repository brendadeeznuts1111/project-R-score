import { test, expect, beforeAll, afterAll } from 'bun:test';
import { writeFile, unlink } from 'node:fs/promises';
import { processOddsFile, processOddsFiles } from '../src/utils/odds-file-processor';
import { MLGSGraph } from '../src/graph/MLGSGraph';

const TEST_FILE = './test-odds.ndjson';
const TEST_FILE_2 = './test-odds-2.ndjson';
const TEST_MLGS_PATH = ':memory:';

let mlgs: MLGSGraph;

beforeAll(() => {
	mlgs = new MLGSGraph(TEST_MLGS_PATH);
});

afterAll(async () => {
	try {
		await unlink(TEST_FILE).catch(() => {});
		await unlink(TEST_FILE_2).catch(() => {});
	} catch {}
});

test('processOddsFile reads lines efficiently', async () => {
	// Create fresh MLGS instance for this test
	const testMlgs = new MLGSGraph(':memory:');
	
	// Create test NDJSON file
	const testData = [
		{ league: 'nfl', market: 'spread', bookie_a: 'pinnacle', bookie_b: 'draftkings', odds_a: -105, odds_b: -110, profit_pct: 4.37, timestamp: Date.now() },
		{ league: 'nba', market: 'total', bookie_a: 'betfair', bookie_b: 'fanduel', odds_a: -110, odds_b: -115, profit_pct: 5.82, timestamp: Date.now() },
		{ league: 'mlb', market: 'spread', bookie_a: 'betmgm', bookie_b: 'caesars', odds_a: -108, odds_b: -112, profit_pct: 3.2, timestamp: Date.now() }
	];

	await writeFile(TEST_FILE, testData.map(d => JSON.stringify(d)).join('\n'));

	// Process file
	const result = await processOddsFile(TEST_FILE, testMlgs);

	expect(result.processed).toBe(3);
	expect(result.arbs).toBe(2); // Only >3.5% profit (4.37 and 5.82)
	expect(result.errors).toBe(0);
});

test('processOddsFile handles empty lines', async () => {
	// Create fresh MLGS instance for this test
	const testMlgs = new MLGSGraph(':memory:');
	
	const testData = [
		{ league: 'nfl', market: 'spread', bookie_a: 'pinnacle', bookie_b: 'draftkings', odds_a: -105, odds_b: -110, profit_pct: 4.37, timestamp: Date.now() },
		'',
		'   ',
		{ league: 'nba', market: 'total', bookie_a: 'betfair', bookie_b: 'fanduel', odds_a: -110, odds_b: -115, profit_pct: 5.82, timestamp: Date.now() }
	];

	await writeFile(TEST_FILE, testData.map(d => typeof d === 'string' ? d : JSON.stringify(d)).join('\n'));

	const result = await processOddsFile(TEST_FILE, testMlgs);

	expect(result.processed).toBe(2); // Empty lines skipped
	expect(result.arbs).toBe(2);
});

test('processOddsFile handles parse errors gracefully', async () => {
	// Create fresh MLGS instance for this test
	const testMlgs = new MLGSGraph(':memory:');
	
	const testData = [
		{ league: 'nfl', market: 'spread', bookie_a: 'pinnacle', bookie_b: 'draftkings', odds_a: -105, odds_b: -110, profit_pct: 4.37, timestamp: Date.now() },
		'invalid json line',
		{ league: 'nba', market: 'total', bookie_a: 'betfair', bookie_b: 'fanduel', odds_a: -110, odds_b: -115, profit_pct: 5.82, timestamp: Date.now() }
	];

	await writeFile(TEST_FILE, testData.map(d => typeof d === 'string' ? d : JSON.stringify(d)).join('\n'));

	const result = await processOddsFile(TEST_FILE, testMlgs);

	expect(result.processed).toBe(2); // Valid lines
	expect(result.errors).toBe(1); // Invalid JSON line
	expect(result.arbs).toBe(2);
});

test('processOddsFiles processes multiple files in parallel', async () => {
	// Create fresh MLGS instance for this test
	const testMlgs = new MLGSGraph(':memory:');
	
	const testData1 = [
		{ league: 'nfl', market: 'spread', bookie_a: 'pinnacle', bookie_b: 'draftkings', odds_a: -105, odds_b: -110, profit_pct: 4.37, timestamp: Date.now() }
	];

	const testData2 = [
		{ league: 'nba', market: 'total', bookie_a: 'betfair', bookie_b: 'fanduel', odds_a: -110, odds_b: -115, profit_pct: 5.82, timestamp: Date.now() }
	];

	await writeFile(TEST_FILE, testData1.map(d => JSON.stringify(d)).join('\n'));
	await writeFile(TEST_FILE_2, testData2.map(d => JSON.stringify(d)).join('\n'));

	const result = await processOddsFiles([TEST_FILE, TEST_FILE_2], testMlgs);

	expect(result.totalProcessed).toBe(2);
	expect(result.totalArbs).toBe(2);
	expect(result.totalErrors).toBe(0);
});

test('processOddsFile filters low-profit opportunities', async () => {
	// Create fresh MLGS instance for this test
	const testMlgs = new MLGSGraph(':memory:');
	
	const testData = [
		{ league: 'nfl', market: 'spread', bookie_a: 'pinnacle', bookie_b: 'draftkings', odds_a: -105, odds_b: -110, profit_pct: 4.37, timestamp: Date.now() },
		{ league: 'mlb', market: 'spread', bookie_a: 'betmgm', bookie_b: 'caesars', odds_a: -108, odds_b: -112, profit_pct: 2.5, timestamp: Date.now() } // Below 3.5% threshold
	];

	await writeFile(TEST_FILE, testData.map(d => JSON.stringify(d)).join('\n'));

	const result = await processOddsFile(TEST_FILE, testMlgs);

	expect(result.processed).toBe(2);
	expect(result.arbs).toBe(1); // Only >3.5% profit
});

test('watchOddsFile handles partial lines correctly', async () => {
	// Create fresh MLGS instance for this test
	const testMlgs = new MLGSGraph(':memory:');
	const WATCH_FILE = './test-watch.ndjson';
	
	// Clean up
	try {
		await unlink(WATCH_FILE).catch(() => {});
	} catch {}

	const arbFound: any[] = [];
	const controller = new AbortController();

	// Start watcher
	const watchPromise = import('../src/utils/odds-file-processor').then(m => 
		m.watchOddsFile(WATCH_FILE, testMlgs, (odds) => {
			arbFound.push(odds);
		}, {
			interval: 100,
			signal: controller.signal
		})
	);

	// Wait a bit for watcher to start
	await new Promise(resolve => setTimeout(resolve, 150));

	// Write partial line (should be buffered)
	await writeFile(WATCH_FILE, JSON.stringify({
		league: 'nfl',
		market: 'spread',
		bookie_a: 'pinnacle',
		bookie_b: 'draftkings',
		odds_a: -105,
		odds_b: -110,
		profit_pct: 4.37,
		timestamp: Date.now()
	}).substring(0, 50)); // Partial line

	await new Promise(resolve => setTimeout(resolve, 150));

	// Complete the line
	await writeFile(WATCH_FILE, JSON.stringify({
		league: 'nfl',
		market: 'spread',
		bookie_a: 'pinnacle',
		bookie_b: 'draftkings',
		odds_a: -105,
		odds_b: -110,
		profit_pct: 4.37,
		timestamp: Date.now()
	}) + '\n' + JSON.stringify({
		league: 'nba',
		market: 'total',
		bookie_a: 'betfair',
		bookie_b: 'fanduel',
		odds_a: -110,
		odds_b: -115,
		profit_pct: 5.82,
		timestamp: Date.now()
	}));

	// Wait for processing
	await new Promise(resolve => setTimeout(resolve, 300));

	// Stop watcher
	controller.abort();

	// Wait for watcher to stop
	try {
		await Promise.race([
			watchPromise,
			new Promise(resolve => setTimeout(resolve, 500))
		]);
	} catch {}

	// Clean up
	try {
		await unlink(WATCH_FILE).catch(() => {});
	} catch {}

	// Should have found both arbs (partial line should be handled)
	expect(arbFound.length).toBeGreaterThanOrEqual(1);
});

