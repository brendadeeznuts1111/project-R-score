// packages/testing/src/factories/synthetic-arbitrage-factory.ts - Factory for synthetic arbitrage test data

import { BookmakerRegistry } from './bookmaker-registry';

export interface SyntheticArbOpportunity {
    id: string;
    gameId: string;
    rotationId?: string; // Optional rotation number from bookmaker registry
    primaryMarket: {
        odds: { home: number; away: number };
        exchange: string;
        timestamp: number;
    };
    hedgeMarket: {
        odds: { home: number; away: number };
        exchange: string;
        timestamp: number;
        correlation: number;
    };
    // Renamed for clarity - Statistical deviation: (observed - theoretical) / σ_residual
    mispricingZScore: number;
    theoreticalPrice: number;
    residualStdDev: number;
    confidence: number;
    timestamp: number;
}

export interface MarketRelationship {
    primaryMarket: string;
    hedgeMarket: string;
    correlation: number;
    residualStdDev: number;
    sampleSize: number;
    lastUpdated: number;
}

export const TEST_EXPORT = 'test';

export class SyntheticArbitrageFactory {
    private static registry = BookmakerRegistry.getInstance();

    static create(overrides: Partial<SyntheticArbOpportunity> = {}): SyntheticArbOpportunity {
        const primaryExchange = overrides.primaryMarket?.exchange || 'draftkings';
        const hedgeExchange = overrides.hedgeMarket?.exchange || 'fanduel';
        const bookmaker = this.registry.getBookmakerByExchange(primaryExchange);

        // Generate rotation number if bookmaker is found
        const rotationId = bookmaker
            ? this.registry.generateRotationNumber(bookmaker.id, 'NBA', Math.floor(Math.random() * 100))
            : undefined;

        const defaultOpportunity: SyntheticArbOpportunity = {
            id: `arb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            gameId: 'test-game-123',
            rotationId,
            primaryMarket: {
                odds: { home: -110, away: -110 },
                exchange: primaryExchange,
                timestamp: Date.now()
            },
            hedgeMarket: {
                odds: { home: 105, away: -125 },
                exchange: hedgeExchange,
                timestamp: Date.now(),
                correlation: 0.95
            },
            // Explicit Z-score calculation: (observed - theoretical) / σ_residual
            mispricingZScore: 2.3,
            theoreticalPrice: -105.5,
            residualStdDev: 4.2,
            confidence: 0.87,
            timestamp: Date.now()
        };

        return { ...defaultOpportunity, ...overrides };
    }

    static createWithZScore(observedPrice: number, theoreticalPrice: number, residualStdDev: number, exchange?: string): SyntheticArbOpportunity {
        // Explicit Z-score calculation
        const residual = observedPrice - theoreticalPrice;
        const residualZ = residual / residualStdDev;

        const primaryExchange = exchange || 'draftkings';
        const bookmaker = this.registry.getBookmakerByExchange(primaryExchange);

        // Generate rotation number if bookmaker is found
        const rotationId = bookmaker
            ? this.registry.generateRotationNumber(bookmaker.id, 'NBA', Math.floor(Math.random() * 100))
            : undefined;

        return this.create({
            primaryMarket: {
                odds: { home: observedPrice, away: -observedPrice },
                exchange: primaryExchange,
                timestamp: Date.now()
            },
            mispricingZScore: residualZ,
            theoreticalPrice,
            residualStdDev,
            rotationId
        });
    }

    static createHighCorrelation(): SyntheticArbOpportunity {
        return this.create({
            hedgeMarket: {
                odds: { home: 102, away: -122 },
                exchange: 'betmgm',
                timestamp: Date.now(),
                correlation: 0.98
            },
            mispricingZScore: 1.8,
            confidence: 0.92
        });
    }

    static createLowCorrelation(): SyntheticArbOpportunity {
        return this.create({
            hedgeMarket: {
                odds: { home: 115, away: -135 },
                exchange: 'pointsbet',
                timestamp: Date.now(),
                correlation: 0.75
            },
            mispricingZScore: 3.1,
            confidence: 0.65
        });
    }

    static createExtremeMispricing(): SyntheticArbOpportunity {
        return this.create({
            mispricingZScore: 4.5,
            confidence: 0.95,
            hedgeMarket: {
                odds: { home: 120, away: -140 },
                exchange: 'fanduel',
                timestamp: Date.now(),
                correlation: 0.92
            }
        });
    }

    static createBatch(count: number, variation: Partial<SyntheticArbOpportunity> = {}): SyntheticArbOpportunity[] {
        const opportunities: SyntheticArbOpportunity[] = [];
        const primaryExchange = variation.primaryMarket?.exchange || 'draftkings';
        const bookmaker = this.registry.getBookmakerByExchange(primaryExchange);

        for (let i = 0; i < count; i++) {
            // Generate rotation number if bookmaker is found
            const rotationId = bookmaker
                ? this.registry.generateRotationNumber(bookmaker.id, 'NBA', i)
                : undefined;

            const baseOpportunity = this.create({
                id: `arb-${Date.now()}-${i}`,
                gameId: `test-game-${i}`,
                rotationId,
                ...variation
            });

            // Add some variation to odds and correlation
            opportunities.push({
                ...baseOpportunity,
                primaryMarket: {
                    ...baseOpportunity.primaryMarket,
                    odds: {
                        home: baseOpportunity.primaryMarket.odds.home + (Math.random() - 0.5) * 20,
                        away: baseOpportunity.primaryMarket.odds.away + (Math.random() - 0.5) * 20
                    }
                },
                hedgeMarket: {
                    ...baseOpportunity.hedgeMarket,
                    correlation: Math.max(0.5, Math.min(1.0, baseOpportunity.hedgeMarket.correlation + (Math.random() - 0.5) * 0.1))
                },
                mispricingZScore: baseOpportunity.mispricingZScore + (Math.random() - 0.5) * 0.5
            });
        }

        return opportunities;
    }

    // Registry utility methods
    static getRegistry(): BookmakerRegistry {
        return this.registry;
    }

    static getSupportedExchanges(): string[] {
        return this.registry.getAllBookmakers().map(b => b.id);
    }

    static validateRotationNumber(exchange: string, rotationNumber: string): boolean {
        return this.registry.validateRotationNumber(exchange, rotationNumber);
    }
}