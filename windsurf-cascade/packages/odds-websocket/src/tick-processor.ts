// Tick Processor Worker
// Handles odds tick processing in worker threads

import { hash } from "bun";
import type { OddsTick } from 'odds-core';

interface TickProcessorMessage {
    type: 'process-tick';
    data: OddsTick;
    id: string;
}

interface ProcessorResult {
    id: string;
    result: any;
    processedAt: number;
}

// Worker message handler
self.onmessage = (event: MessageEvent<TickProcessorMessage>) => {
    const message = event.data;

    try {
        switch (message.type) {
            case 'process-tick':
                const result = processTick(message.data);

                self.postMessage({
                    id: message.id,
                    result,
                    processedAt: Date.now()
                } as ProcessorResult);
                break;

            default:
                throw new Error(`Unknown message type: ${message.type}`);
        }
    } catch (error) {
        self.postMessage({
            id: message.id,
            error: (error as Error).message,
            processedAt: Date.now()
        });
    }
};

function processTick(oddsTick: OddsTick): any {
    // Generate fast hash for the odds tick
    const tickHash = hash.rapidhash(JSON.stringify(oddsTick));

    // Simulate odds tick processing
    const processedTick = {
        ...oddsTick,
        hash: tickHash.toString(),
        processed: true,
        processedAt: new Date().toISOString(),
        calculations: {
            impliedProbability: calculateImpliedProbability(oddsTick.odds.home),
            kellyFraction: calculateKellyFraction(oddsTick.odds.home, oddsTick.odds.away),
            expectedValue: calculateExpectedValue(oddsTick.odds.home, oddsTick.odds.away)
        }
    };

    return processedTick;
}

function calculateImpliedProbability(odds: number): number {
    if (odds > 0) {
        return 100 / (odds + 100);
    } else {
        return Math.abs(odds) / (Math.abs(odds) + 100);
    }
}

function calculateKellyFraction(homeOdds: number, awayOdds: number): number {
    // Simplified Kelly fraction calculation
    const homeProb = calculateImpliedProbability(homeOdds);
    const awayProb = calculateImpliedProbability(awayOdds);

    // Assuming 5% edge for demonstration
    const edge = 0.05;
    return edge / (homeProb + awayProb);
}

function calculateExpectedValue(homeOdds: number, awayOdds: number): number {
    // Simplified expected value calculation
    const homeProb = calculateImpliedProbability(homeOdds);
    const awayProb = calculateImpliedProbability(awayOdds);

    // Assuming fair odds calculation
    const fairHomeOdds = homeProb > 0.5 ? -100 / homeProb - 100 : 100 / homeProb - 100;
    const fairAwayOdds = awayProb > 0.5 ? -100 / awayProb - 100 : 100 / awayProb - 100;

    return Math.abs(homeOdds - fairHomeOdds) + Math.abs(awayOdds - fairAwayOdds);
}

export { };
