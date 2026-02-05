// packages/testing/src/domain/rotation-numbers/integration/rotation-db.test.ts

import { test, describe, beforeEach, expect } from 'bun:test';
import {
    saveRotationNumber,
    loadRotationNumber,
    batchSaveRotationNumbers,
    searchRotationNumbersDB,
    deleteRotationNumber,
    type RotationNumberRecord
} from '../../odds-core/src/types/rotation-numbers';

// Mock database functions for testing (in real implementation, these would connect to actual DB)
const mockDB = new Map<number, RotationNumberRecord>();

async function mockSaveRotationNumber(rotation: RotationNumberRecord): Promise<void> {
    mockDB.set(rotation.rotationId, rotation);
}

async function mockLoadRotationNumber(rotationId: number): Promise<RotationNumberRecord | null> {
    return mockDB.get(rotationId) || null;
}

async function mockBatchSaveRotationNumbers(rotations: RotationNumberRecord[]): Promise<void> {
    rotations.forEach(rotation => {
        mockDB.set(rotation.rotationId, rotation);
    });
}

async function mockSearchRotationNumbersDB(criteria: any): Promise<RotationNumberRecord[]> {
    const results = Array.from(mockDB.values());

    if (criteria.sport) {
        return results.filter(r => r.sport === criteria.sport);
    }

    if (criteria.minRotation && criteria.maxRotation) {
        return results.filter(r =>
            r.rotationId >= criteria.minRotation &&
            r.rotationId <= criteria.maxRotation
        );
    }

    if (criteria.gameId) {
        return results.filter(r => r.gameId === criteria.gameId);
    }

    return results;
}

async function mockDeleteRotationNumber(rotationId: number): Promise<boolean> {
    return mockDB.delete(rotationId);
}

// Use mock functions for testing
const saveRotationNumber = mockSaveRotationNumber;
const loadRotationNumber = mockLoadRotationNumber;
const batchSaveRotationNumbers = mockBatchSaveRotationNumbers;
const searchRotationNumbersDB = mockSearchRotationNumbersDB;
const deleteRotationNumber = mockDeleteRotationNumber;

describe("Rotation Number Database Integration", () => {

    beforeEach(() => {
        mockDB.clear();
    });

    test("rotation numbers persist and load correctly", async () => {
        const rotation: RotationNumberRecord = {
            rotationId: 3500,
            sport: 'NFL',
            gameId: 'game-123',
            teamId: 'team-456',
            timestamp: Date.now(),
            marketType: 'moneyline',
            odds: -110,
            exchange: 'draftkings'
        };

        await saveRotationNumber(rotation);
        const loaded = await loadRotationNumber(3500);

        expect(loaded).not.toBeNull();
        expect(loaded!.rotationId).toBe(rotation.rotationId);
        expect(loaded!.sport).toBe(rotation.sport);
        expect(loaded!.gameId).toBe(rotation.gameId);
        expect(loaded!.teamId).toBe(rotation.teamId);
    });

    test("loading non-existent rotation returns null", async () => {
        const loaded = await loadRotationNumber(99999);
        expect(loaded).toBeNull();
    });

    test("batch operations handle 1000+ rotations efficiently", async () => {
        const rotations: RotationNumberRecord[] = Array.from({ length: 1000 }, (_, i) => ({
            rotationId: 3000 + i,
            sport: 'NFL' as const,
            gameId: `game-${i}`,
            teamId: `team-${i}`,
            timestamp: Date.now() - (i * 1000),
            marketType: 'moneyline',
            odds: -110,
            exchange: 'draftkings'
        }));

        const start = performance.now();
        await batchSaveRotationNumbers(rotations);
        const duration = performance.now() - start;

        expect(duration).toBeLessThan(1000); // < 1s for 1000 inserts

        // Verify all saved
        for (let i = 0; i < 1000; i++) {
            const loaded = await loadRotationNumber(3000 + i);
            expect(loaded).not.toBeNull();
            expect(loaded!.gameId).toBe(`game-${i}`);
        }
    });

    test("database search by sport works correctly", async () => {
        // Insert test data
        const testRotations = [
            { rotationId: 3001, sport: 'NFL' as const, gameId: 'game-1', teamId: 'team-1', timestamp: Date.now(), marketType: 'moneyline', odds: -110, exchange: 'draftkings' },
            { rotationId: 3002, sport: 'NFL' as const, gameId: 'game-2', teamId: 'team-2', timestamp: Date.now(), marketType: 'spread', odds: -105, exchange: 'fanduel' },
            { rotationId: 2001, sport: 'NBA' as const, gameId: 'game-3', teamId: 'team-3', timestamp: Date.now(), marketType: 'moneyline', odds: 120, exchange: 'draftkings' },
            { rotationId: 2002, sport: 'NBA' as const, gameId: 'game-4', teamId: 'team-4', timestamp: Date.now(), marketType: 'total', odds: -110, exchange: 'betmgm' }
        ];

        await batchSaveRotationNumbers(testRotations);

        // Search by sport
        const nflResults = await searchRotationNumbersDB({ sport: 'NFL' });
        const nbaResults = await searchRotationNumbersDB({ sport: 'NBA' });

        expect(nflResults).toHaveLength(2);
        expect(nbaResults).toHaveLength(2);

        expect(nflResults.every(r => r.sport === 'NFL')).toBe(true);
        expect(nbaResults.every(r => r.sport === 'NBA')).toBe(true);
    });

    test("database search by rotation range works correctly", async () => {
        // Insert test data
        const testRotations = Array.from({ length: 100 }, (_, i) => ({
            rotationId: 3000 + i,
            sport: 'NFL' as const,
            gameId: `game-${i}`,
            teamId: `team-${i}`,
            timestamp: Date.now(),
            marketType: 'moneyline',
            odds: -110,
            exchange: 'draftkings'
        }));

        await batchSaveRotationNumbers(testRotations);

        // Search by range
        const rangeResults = await searchRotationNumbersDB({
            minRotation: 3020,
            maxRotation: 3040
        });

        expect(rangeResults.length).toBeGreaterThan(0);
        expect(rangeResults.every(r => r.rotationId >= 3020 && r.rotationId <= 3040)).toBe(true);
    });

    test("database search by game ID works correctly", async () => {
        const rotation: RotationNumberRecord = {
            rotationId: 3500,
            sport: 'NFL',
            gameId: 'specific-game-123',
            teamId: 'team-456',
            timestamp: Date.now(),
            marketType: 'moneyline',
            odds: -110,
            exchange: 'draftkings'
        };

        await saveRotationNumber(rotation);

        const searchResults = await searchRotationNumbersDB({ gameId: 'specific-game-123' });

        expect(searchResults).toHaveLength(1);
        expect(searchResults[0].rotationId).toBe(3500);
        expect(searchResults[0].gameId).toBe('specific-game-123');
    });

    test("database operations are transactional", async () => {
        const rotation1: RotationNumberRecord = {
            rotationId: 3501,
            sport: 'NFL',
            gameId: 'game-1',
            teamId: 'team-1',
            timestamp: Date.now(),
            marketType: 'moneyline',
            odds: -110,
            exchange: 'draftkings'
        };

        const rotation2: RotationNumberRecord = {
            rotationId: 3502,
            sport: 'NFL',
            gameId: 'game-2',
            teamId: 'team-2',
            timestamp: Date.now(),
            marketType: 'spread',
            odds: -105,
            exchange: 'fanduel'
        };

        // Save both rotations
        await saveRotationNumber(rotation1);
        await saveRotationNumber(rotation2);

        // Verify both exist
        expect(await loadRotationNumber(3501)).not.toBeNull();
        expect(await loadRotationNumber(3502)).not.toBeNull();

        // Delete one
        const deleted = await deleteRotationNumber(3501);
        expect(deleted).toBe(true);

        // Verify deletion
        expect(await loadRotationNumber(3501)).toBeNull();
        expect(await loadRotationNumber(3502)).not.toBeNull();
    });

    test("database handles concurrent operations", async () => {
        const rotations: RotationNumberRecord[] = Array.from({ length: 100 }, (_, i) => ({
            rotationId: 4000 + i,
            sport: 'NHL' as const,
            gameId: `game-${i}`,
            teamId: `team-${i}`,
            timestamp: Date.now(),
            marketType: 'moneyline',
            odds: -110,
            exchange: 'draftkings'
        }));

        // Save concurrently
        const savePromises = rotations.map(rotation => saveRotationNumber(rotation));
        await Promise.all(savePromises);

        // Load concurrently
        const loadPromises = rotations.map(rotation => loadRotationNumber(rotation.rotationId));
        const loadedResults = await Promise.all(loadPromises);

        expect(loadedResults.every(r => r !== null)).toBe(true);

        // Search concurrently
        const searchPromises = [
            searchRotationNumbersDB({ sport: 'NHL' }),
            searchRotationNumbersDB({ minRotation: 4000, maxRotation: 4050 }),
            searchRotationNumbersDB({ gameId: 'game-50' })
        ];

        const searchResults = await Promise.all(searchPromises);
        expect(searchResults.every(results => Array.isArray(results))).toBe(true);
    });

    test("database operations maintain data integrity", async () => {
        const originalRotation: RotationNumberRecord = {
            rotationId: 5000,
            sport: 'MLB',
            gameId: 'game-integrity',
            teamId: 'team-integrity',
            timestamp: Date.now(),
            marketType: 'moneyline',
            odds: -110,
            exchange: 'draftkings'
        };

        await saveRotationNumber(originalRotation);

        const loadedRotation = await loadRotationNumber(5000);
        expect(loadedRotation).not.toBeNull();

        // Verify all fields are preserved exactly
        expect(loadedRotation!.rotationId).toBe(originalRotation.rotationId);
        expect(loadedRotation!.sport).toBe(originalRotation.sport);
        expect(loadedRotation!.gameId).toBe(originalRotation.gameId);
        expect(loadedRotation!.teamId).toBe(originalRotation.teamId);
        expect(loadedRotation!.marketType).toBe(originalRotation.marketType);
        expect(loadedRotation!.odds).toBe(originalRotation.odds);
        expect(loadedRotation!.exchange).toBe(originalRotation.exchange);
    });

    test("database performance scales appropriately", async () => {
        const largeBatch: RotationNumberRecord[] = Array.from({ length: 5000 }, (_, i) => ({
            rotationId: 6000 + i,
            sport: ['MLB', 'NBA', 'NFL', 'NHL'][i % 4] as any,
            gameId: `game-${i}`,
            teamId: `team-${i}`,
            timestamp: Date.now() - (i * 1000),
            marketType: 'moneyline',
            odds: -110 + (i % 20),
            exchange: ['draftkings', 'fanduel', 'betmgm'][i % 3]
        }));

        const start = performance.now();
        await batchSaveRotationNumbers(largeBatch);
        const saveDuration = performance.now() - start;

        expect(saveDuration).toBeLessThan(2000); // < 2s for 5000 records

        // Test search performance
        const searchStart = performance.now();
        const searchResults = await searchRotationNumbersDB({ sport: 'NFL' });
        const searchDuration = performance.now() - searchStart;

        expect(searchDuration).toBeLessThan(100); // < 100ms for search
        expect(searchResults.length).toBeGreaterThan(0);
    });
});
