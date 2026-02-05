// src/agents/testDurationOracle.ts
// Predictive test failure detection using EWMA on test duration history

interface TestDurationPrediction {
    testName: string;
    predictedDuration: number; // ms
    confidence: number; // 0-1
    suggestion: 'skip' | 'decreaseRuns' | 'increaseTimeout' | 'split';
}

// Mock cache implementation
const cache = {
    get: (key: string): string | null => {
        // In real implementation, this would be Bun's cache
        return localStorage.getItem(key);
    },
    set: (key: string, value: string): void => {
        // In real implementation, this would be Bun's cache
        localStorage.setItem(key, value);
    }
};

const makeKey = (...parts: string[]): string => {
    return parts.join(':');
};

export class TestDurationOracle {
    private static readonly WINDOW = 50; // last 50 runs
    private static readonly EWMA_ALPHA = 0.3;
    private static readonly SLOW_TEST_THRESHOLD = 30000; // 30 seconds
    private static readonly VERY_SLOW_THRESHOLD = 60000; // 1 minute

    static async predict(testName: string): Promise<TestDurationPrediction | null> {
        const historyKey = makeKey('test:duration', testName);
        const history = JSON.parse(cache.get(historyKey) || '[]') as number[];

        if (history.length < 10) {
            return null; // Not enough data for prediction
        }

        const ewma = this.ewma(history, this.EWMA_ALPHA);
        const stdDev = this.stdDev(history, ewma);
        const confidence = Math.max(0, 1 - (stdDev / ewma)); // Inverse relationship

        // Suggestion logic based on predicted duration
        let suggestion: TestDurationPrediction['suggestion'];

        if (ewma > this.VERY_SLOW_THRESHOLD) {
            suggestion = 'split'; // Very slow tests should be split
        } else if (ewma > this.SLOW_TEST_THRESHOLD) {
            suggestion = 'decreaseRuns'; // Slow tests should reduce iterations
        } else if (ewma > 15000) {
            suggestion = 'increaseTimeout'; // Moderately slow tests need more timeout
        } else {
            suggestion = 'skip'; // Normal speed
        }

        return {
            testName,
            predictedDuration: ewma,
            confidence,
            suggestion,
        };
    }

    static record(testName: string, duration: number): void {
        const historyKey = makeKey('test:duration', testName);
        const history = JSON.parse(cache.get(historyKey) || '[]') as number[];

        history.push(duration);
        if (history.length > this.WINDOW) {
            history.shift();
        }

        cache.set(historyKey, JSON.stringify(history));

        // Log to consciousness ledger for analysis
        console.log(`[TestDurationOracle] Recorded ${testName}: ${duration}ms (history: ${history.length})`);
    }

    static getAllPredictions(): TestDurationPrediction[] {
        const predictions: TestDurationPrediction[] = [];

        // In real implementation, this would scan all test keys in cache
        const testNames = [
            'websocket connection doesn\'t leak',
            'large array processing doesn\'t leak',
            'database connection pool doesn\'t leak',
            'event listeners don\'t leak',
            'calculates arbitrage within budget',
            'processes mock NBA odds'
        ];

        for (const testName of testNames) {
            const prediction = this.predictSync(testName);
            if (prediction) {
                predictions.push(prediction);
            }
        }

        return predictions.sort((a, b) => b.predictedDuration - a.predictedDuration);
    }

    static getSlowTests(thresholdMs: number = this.SLOW_TEST_THRESHOLD): TestDurationPrediction[] {
        return this.getAllPredictions().filter(p => p.predictedDuration > thresholdMs);
    }

    static getTestsWithSuggestion(suggestion: TestDurationPrediction['suggestion']): TestDurationPrediction[] {
        return this.getAllPredictions().filter(p => p.suggestion === suggestion);
    }

    static reset(): void {
        // Clear all test duration history
        const keys = Object.keys(localStorage).filter(key => key.startsWith('test:duration:'));
        keys.forEach(key => localStorage.removeItem(key));
        console.log('[TestDurationOracle] Reset all test history');
    }

    private static predictSync(testName: string): TestDurationPrediction | null {
        const historyKey = makeKey('test:duration', testName);
        const history = JSON.parse(cache.get(historyKey) || '[]') as number[];

        if (history.length < 10) return null;

        const ewma = this.ewma(history, this.EWMA_ALPHA);
        const stdDev = this.stdDev(history, ewma);
        const confidence = Math.max(0, 1 - (stdDev / ewma));

        let suggestion: TestDurationPrediction['suggestion'];

        if (ewma > this.VERY_SLOW_THRESHOLD) {
            suggestion = 'split';
        } else if (ewma > this.SLOW_TEST_THRESHOLD) {
            suggestion = 'decreaseRuns';
        } else if (ewma > 15000) {
            suggestion = 'increaseTimeout';
        } else {
            suggestion = 'skip';
        }

        return {
            testName,
            predictedDuration: ewma,
            confidence,
            suggestion,
        };
    }

    private static ewma(values: number[], alpha: number): number {
        if (values.length === 0) return 0;

        let s = values[0];
        for (let i = 1; i < values.length; i++) {
            s = alpha * values[i] + (1 - alpha) * s;
        }
        return s;
    }

    private static stdDev(values: number[], mean: number): number {
        if (values.length === 0) return 0;

        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
    }

    // Analytics methods
    static getAnalytics(): {
        totalTests: number;
        averageDuration: number;
        slowTestCount: number;
        averageConfidence: number;
        suggestions: Record<TestDurationPrediction['suggestion'], number>;
    } {
        const predictions = this.getAllPredictions();

        if (predictions.length === 0) {
            return {
                totalTests: 0,
                averageDuration: 0,
                slowTestCount: 0,
                averageConfidence: 0,
                suggestions: { skip: 0, decreaseRuns: 0, increaseTimeout: 0, split: 0 }
            };
        }

        const totalDuration = predictions.reduce((sum, p) => sum + p.predictedDuration, 0);
        const totalConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0);
        const slowTests = predictions.filter(p => p.predictedDuration > this.SLOW_TEST_THRESHOLD);

        const suggestions = predictions.reduce((acc, p) => {
            acc[p.suggestion]++;
            return acc;
        }, { skip: 0, decreaseRuns: 0, increaseTimeout: 0, split: 0 });

        return {
            totalTests: predictions.length,
            averageDuration: totalDuration / predictions.length,
            slowTestCount: slowTests.length,
            averageConfidence: totalConfidence / predictions.length,
            suggestions
        };
    }

    // Export data for external analysis
    static exportData(): string {
        const analytics = this.getAnalytics();
        const predictions = this.getAllPredictions();

        return JSON.stringify({
            timestamp: new Date().toISOString(),
            analytics,
            predictions: predictions.map(p => ({
                name: p.testName,
                predictedMs: p.predictedDuration,
                confidence: p.confidence,
                suggestion: p.suggestion
            }))
        }, null, 2);
    }
}
