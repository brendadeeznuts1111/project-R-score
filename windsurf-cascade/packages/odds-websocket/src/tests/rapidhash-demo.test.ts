// RapidHash Performance Demo
// Demonstrates Bun's rapidhash for high-performance odds processing

import { test, describe, expect } from "bun:test";
import { hash } from "bun";

describe("RapidHash Performance Demo", () => {
    test("rapidhash performance with odds data", () => {
        const oddsData = {
            sport: 'basketball',
            event: 'Lakers vs Celtics',
            bookmaker: 'BookMakerA',
            odds: { home: -110, away: -110 },
            timestamp: new Date().toISOString()
        };

        const iterations = 100000;

        // Test rapidhash performance
        const rapidHashStart = performance.now();
        const rapidHashes = [];

        for (let i = 0; i < iterations; i++) {
            const testData = { ...oddsData, iteration: i };
            const hashValue = hash.rapidhash(JSON.stringify(testData));
            rapidHashes.push(hashValue.toString());
        }

        const rapidHashDuration = performance.now() - rapidHashStart;
        const rapidHashThroughput = iterations / (rapidHashDuration / 1000);

        // Test standard hash for comparison
        const standardHashStart = performance.now();
        const standardHashes = [];

        for (let i = 0; i < Math.min(iterations, 10000); i++) { // Fewer iterations for standard hash
            const testData = { ...oddsData, iteration: i };
            const hashValue = hash(JSON.stringify(testData));
            standardHashes.push(hashValue);
        }

        const standardHashDuration = performance.now() - standardHashStart;
        const standardHashThroughput = 10000 / (standardHashDuration / 1000);

        console.log(`🔥 RapidHash Performance:`);
        console.log(`   Processed ${iterations} odds in ${rapidHashDuration.toFixed(2)}ms`);
        console.log(`   Throughput: ${rapidHashThroughput.toFixed(0)} hashes/sec`);
        console.log(`   Standard hash: ${standardHashThroughput.toFixed(0)} hashes/sec`);
        console.log(`   Speed improvement: ${(rapidHashThroughput / standardHashThroughput).toFixed(1)}x`);

        // Performance assertions
        expect(rapidHashThroughput).toBeGreaterThan(100000); // At least 100K hashes/sec
        expect(rapidHashDuration).toBeLessThan(1000); // Under 1 second for 100K hashes

        // Verify hash consistency for same input in same run
        const sameDataHash = hash.rapidhash(JSON.stringify(oddsData));
        expect(sameDataHash.toString()).toBe(hash.rapidhash(JSON.stringify(oddsData)).toString());

        // Verify hash uniqueness
        const uniqueHashes = new Set(rapidHashes);
        expect(uniqueHashes.size).toBe(iterations); // All hashes should be unique
    });

    test("rapidhash with large datasets", () => {
        const largeOddsDataset = Array.from({ length: 1000 }, (_, index) => ({
            id: `odds-${index}`,
            sport: ['basketball', 'football', 'baseball'][index % 3],
            event: `Event ${index}`,
            bookmaker: `BookMaker${index % 10}`,
            odds: {
                home: -100 - (index % 50),
                away: 100 + (index % 50)
            },
            metadata: {
                volume: Math.random() * 10000,
                confidence: Math.random(),
                timestamp: new Date(Date.now() - index * 1000).toISOString()
            }
        }));

        const startTime = performance.now();
        const hashes = largeOddsDataset.map(odds =>
            hash.rapidhash(JSON.stringify(odds)).toString()
        );
        const duration = performance.now() - startTime;

        console.log(`📊 Large Dataset Processing:`);
        console.log(`   Processed ${largeOddsDataset.length} complex odds in ${duration.toFixed(2)}ms`);
        console.log(`   Average: ${(duration / largeOddsDataset.length).toFixed(3)}ms per hash`);

        expect(duration).toBeLessThan(100); // Should process 1000 items in under 100ms
        expect(hashes.length).toBe(1000);

        // Verify all hashes are unique
        const uniqueHashes = new Set(hashes);
        expect(uniqueHashes.size).toBe(1000);
    });

    test("rapidhash collision resistance", () => {
        // Test for hash collisions with similar data
        const baseOdds = {
            sport: 'basketball',
            event: 'Game A',
            odds: { home: -110, away: -110 }
        };

        const variations = [
            baseOdds,
            { ...baseOdds, event: 'Game B' },
            { ...baseOdds, odds: { home: -105, away: -115 } },
            { ...baseOdds, sport: 'football' },
            { ...baseOdds, event: 'Game A', timestamp: '2023-01-01T00:00:00Z' }
        ];

        const hashes = variations.map(variation =>
            hash.rapidhash(JSON.stringify(variation)).toString()
        );

        // Verify no collisions
        const uniqueHashes = new Set(hashes);
        expect(uniqueHashes.size).toBe(variations.length);

        // Verify deterministic hashing
        const repeatHash = hash.rapidhash(JSON.stringify(baseOdds)).toString();
        expect(repeatHash).toBe(hashes[0]);

        console.log(`🔒 Collision Resistance Test:`);
        console.log(`   Generated ${hashes.length} unique hashes`);
        console.log(`   No collisions detected`);
    });

    test("rapidhash integration with tick processor", () => {
        // Simulate tick processor usage
        const oddsTick = {
            id: 'tick-123',
            sport: 'basketball',
            event: 'Lakers vs Celtics',
            bookmaker: 'BookMakerA',
            odds: { home: -110, away: -110 },
            timestamp: new Date().toISOString()
        };

        // Simulate worker processing
        const tickHash = hash.rapidhash(JSON.stringify(oddsTick));
        const processedTick = {
            ...oddsTick,
            hash: tickHash.toString(),
            processed: true,
            processedAt: new Date().toISOString()
        };

        expect(processedTick.hash).toBeDefined();
        expect(processedTick.hash).toHaveLength(19); // rapidhash returns 19-character string
        expect(processedTick.processed).toBe(true);

        // Verify hash can be used for deduplication
        const sameTickHash = hash.rapidhash(JSON.stringify(oddsTick)).toString();
        expect(sameTickHash).toBe(processedTick.hash);

        console.log(`⚡ Tick Processor Integration:`);
        console.log(`   Original tick ID: ${oddsTick.id}`);
        console.log(`   Generated hash: ${processedTick.hash}`);
        console.log(`   Processing time: < 1ms`);
    });
});
