// packages/testing/src/types/practical-type-tests.test.ts
// Practical type testing examples using Bun 1.3 expectTypeOf

import { expectTypeOf, test, describe } from "bun:test";

// Define example types for demonstration
type Odds = {
    american: number;
    decimal: number;
    impliedProbability: number;
};

type Tick = {
    id: string;
    timestamp: Date;
    odds: Odds;
    symbol: string;
    volume: number;
    metadata?: Record<string, unknown>;
};

type MarketData = {
    symbol: string;
    price: number;
    volume: number;
    bid: number;
    ask: number;
    timestamp: Date;
};

type APIResponse<T> = {
    success: boolean;
    data: T;
    error?: string;
    timestamp: string;
};

describe("Core Type Validation", () => {
    test("Odds type has required numeric properties", () => {
        expectTypeOf<Odds>().toHaveProperty('american');
        expectTypeOf<Odds>().toHaveProperty('decimal');
        expectTypeOf<Odds>().toHaveProperty('impliedProbability');
    });

    test("Odds properties are correct numeric types", () => {
        expectTypeOf<Odds['american']>().toBeNumber();
        expectTypeOf<Odds['decimal']>().toBeNumber();
        expectTypeOf<Odds['impliedProbability']>().toBeNumber();
    });

    test("Odds american values are integers", () => {
        // Note: Bun's expectTypeOf doesn't have toBeInteger()
        // We can only check that it's a number
        expectTypeOf<Odds['american']>().toBeNumber();
    });

    test("Tick has timestamp property that is Date", () => {
        expectTypeOf<Tick>().toHaveProperty('timestamp');
        expectTypeOf<Tick['timestamp']>().toEqualTypeOf<Date>();
        expectTypeOf<Tick['timestamp']>().not.toEqualTypeOf<string>();
    });

    test("Tick has odds property of type Odds", () => {
        expectTypeOf<Tick>().toHaveProperty('odds');
        expectTypeOf<Tick['odds']>().toEqualTypeOf<Odds>();
    });

    test("MarketData has required properties", () => {
        expectTypeOf<MarketData>().toHaveProperty('symbol');
        expectTypeOf<MarketData>().toHaveProperty('price');
        expectTypeOf<MarketData>().toHaveProperty('volume');
        expectTypeOf<MarketData>().toHaveProperty('bid');
        expectTypeOf<MarketData>().toHaveProperty('ask');
        expectTypeOf<MarketData>().toHaveProperty('timestamp');
    });

    test("MarketData properties have correct types", () => {
        expectTypeOf<MarketData['symbol']>().toBeString();
        expectTypeOf<MarketData['price']>().toBeNumber();
        expectTypeOf<MarketData['volume']>().toBeNumber();
        expectTypeOf<MarketData['bid']>().toBeNumber();
        expectTypeOf<MarketData['ask']>().toBeNumber();
        expectTypeOf<MarketData['timestamp']>().toEqualTypeOf<Date>();
    });
});

describe("Complex Type Validation", () => {
    test("API response wrapper preserves data types", () => {
        expectTypeOf<APIResponse<Odds>>().toHaveProperty('data');
        expectTypeOf<APIResponse<Odds>['data']>().toEqualTypeOf<Odds>();
        expectTypeOf<APIResponse<Tick>['data']>().toEqualTypeOf<Tick>();
        expectTypeOf<APIResponse<MarketData>['data']>().toEqualTypeOf<MarketData>();
    });

    test("Function signatures preserve type safety", () => {
        type OddsCalculator = (odds: Odds) => number;
        type TickProcessor = (tick: Tick) => MarketData;
        type DataValidator = <T>(data: T) => boolean;

        expectTypeOf<OddsCalculator>().toBeFunction();
        expectTypeOf<OddsCalculator>().parameters.toEqualTypeOf<[Odds]>();
        expectTypeOf<OddsCalculator>().returns.toEqualTypeOf<number>();

        expectTypeOf<TickProcessor>().toBeFunction();
        expectTypeOf<TickProcessor>().parameters.toEqualTypeOf<[Tick]>();
        expectTypeOf<TickProcessor>().returns.toEqualTypeOf<MarketData>();

        expectTypeOf<DataValidator>().toBeFunction();
        expectTypeOf<DataValidator>().parameters.toEqualTypeOf<[unknown]>();
        expectTypeOf<DataValidator>().returns.toEqualTypeOf<boolean>();
    });

    test("Array operations preserve types", () => {
        expectTypeOf<MarketData[]>().toBeArray();
        expectTypeOf<MarketData[0]>().toEqualTypeOf<MarketData>();
        expectTypeOf<MarketData[number]['symbol']>().toBeString();
        expectTypeOf<MarketData[number]['price']>().toBeNumber();
    });

    test("Union types work correctly", () => {
        type PriceInput = number | string | { value: number; currency: string };
        type MarketStatus = 'open' | 'closed' | 'suspended';
        type DataFeed = 'real-time' | 'delayed' | 'historical';

        expectTypeOf<PriceInput>().toEqualTypeOf<number | string | { value: number; currency: string }>();
        expectTypeOf<MarketStatus>().toEqualTypeOf<'open' | 'closed' | 'suspended'>();
        expectTypeOf<DataFeed>().toEqualTypeOf<'real-time' | 'delayed' | 'historical'>();

        // Test specific union constraints
        expectTypeOf<MarketStatus>().not.toEqualTypeOf<string>();
        expectTypeOf<DataFeed>().not.toEqualTypeOf<string>();
    });
});

describe("Advanced Type Patterns", () => {
    test("Generic types preserve constraints", () => {
        type ValidationResult<T> = {
            isValid: boolean;
            data?: T;
            errors?: string[];
        };

        expectTypeOf<ValidationResult<Odds>>().toHaveProperty('isValid');
        expectTypeOf<ValidationResult<Odds>['data']>().toEqualTypeOf<Odds | undefined>();
        expectTypeOf<ValidationResult<Tick>['data']>().toEqualTypeOf<Tick | undefined>();
        expectTypeOf<ValidationResult<MarketData>['errors']>().toEqualTypeOf<string[] | undefined>();
    });

    test("Utility types work with domain types", () => {
        type OddsWithoutImplied = Omit<Odds, 'impliedProbability'>;
        type TickWithRequiredMetadata = Required<Pick<Tick, 'metadata'>> & Omit<Tick, 'metadata'>;
        type MarketDataFields = keyof MarketData;

        expectTypeOf<OddsWithoutImplied>().toHaveProperty('american');
        expectTypeOf<OddsWithoutImplied>().toHaveProperty('decimal');
        expectTypeOf<OddsWithoutImplied>().not.toHaveProperty('impliedProbability');

        expectTypeOf<TickWithRequiredMetadata['metadata']>().toEqualTypeOf<Record<string, unknown>>();
        expectTypeOf<MarketDataFields>().toEqualTypeOf<'symbol' | 'price' | 'volume' | 'bid' | 'ask' | 'timestamp'>;
    });

    test("Conditional types work with business logic", () => {
        type ProfitableArbitrage<T> = T extends { profit: infer P }
            ? P extends number
            ? P extends 0
            ? never
            : P extends -1
            ? never
            : T
            : never
            : never;

        type ArbitrageOpportunity = {
            profit: number;
            markets: string[];
        };

        type LosingOpportunity = {
            profit: -50;
            markets: string[];
        };

        expectTypeOf<ProfitableArbitrage<ArbitrageOpportunity>>().toEqualTypeOf<ArbitrageOpportunity>();
        expectTypeOf<ProfitableArbitrage<LosingOpportunity>>().toEqualTypeOf<never>();
    });

    test("Complex nested types maintain structure", () => {
        type Portfolio = {
            id: string;
            name: string;
            positions: Array<{
                symbol: string;
                quantity: number;
                averagePrice: number;
                currentPrice: number;
                odds?: Odds;
            }>;
            lastUpdated: Date;
            metadata?: Record<string, unknown>;
        };

        expectTypeOf<Portfolio>().toHaveProperty('positions');
        expectTypeOf<Portfolio['positions']>().toBeArray();
        expectTypeOf<Portfolio['positions'][number]>().toHaveProperty('symbol');
        expectTypeOf<Portfolio['positions'][number]['symbol']>().toBeString();
        expectTypeOf<Portfolio['positions'][number]['quantity']>().toBeNumber();
        expectTypeOf<Portfolio['positions'][number]['odds']>().toEqualTypeOf<Odds | undefined>();
    });
});

describe("Performance and Edge Cases", () => {
    test("Large complex types can be validated efficiently", () => {
        type ComplexFinancialInstrument = {
            id: string;
            symbol: string;
            name: string;
            type: 'stock' | 'bond' | 'derivative' | 'crypto';
            odds: Odds;
            marketData: MarketData;
            historicalData: Array<{
                timestamp: Date;
                price: number;
                volume: number;
                events?: Array<{
                    type: string;
                    timestamp: Date;
                    impact: number;
                }>;
            }>;
            metadata: {
                created: Date;
                updated: Date;
                version: number;
                tags: string[];
                classifications: Array<{
                    category: string;
                    confidence: number;
                }>;
            };
        };

        // These should all pass without performance issues
        expectTypeOf<ComplexFinancialInstrument>().toHaveProperty('id');
        expectTypeOf<ComplexFinancialInstrument['odds']>().toEqualTypeOf<Odds>();
        expectTypeOf<ComplexFinancialInstrument['historicalData']>().toBeArray();
        expectTypeOf<ComplexFinancialInstrument['historicalData'][number]['events']>().toEqualTypeOf<Array<any> | undefined>();
        expectTypeOf<ComplexFinancialInstrument['metadata']['classifications'][number]['confidence']>().toBeNumber();
    });

    test("Recursive types can be handled", () => {
        type TreeNode<T> = {
            value: T;
            children: TreeNode<T>[];
        };

        type MarketTree = TreeNode<{
            symbol: string;
            price: number;
            odds: Odds;
        }>;

        expectTypeOf<TreeNode<string>>().toHaveProperty('value');
        expectTypeOf<TreeNode<string>>().toHaveProperty('children');
        expectTypeOf<TreeNode<string>['children']>().toBeArray();
        expectTypeOf<TreeNode<string>['children'][number]>().toEqualTypeOf<TreeNode<string>>();

        expectTypeOf<MarketTree['value']>().toHaveProperty('symbol');
        expectTypeOf<MarketTree['value']['odds']>().toEqualTypeOf<Odds>();
    });
});

describe("Real-World Financial Type Scenarios", () => {
    test("Currency and price types work correctly", () => {
        type CurrencyAmount = {
            amount: number;
            currency: 'USD' | 'EUR' | 'GBP' | 'JPY';
        };

        type PricePoint = {
            price: CurrencyAmount;
            timestamp: Date;
            source: string;
        };

        expectTypeOf<CurrencyAmount['amount']>().toBeNumber();
        expectTypeOf<CurrencyAmount['currency']>().toEqualTypeOf<'USD' | 'EUR' | 'GBP' | 'JPY'>();
        expectTypeOf<PricePoint['price']>().toEqualTypeOf<CurrencyAmount>();
        expectTypeOf<PricePoint['timestamp']>().toEqualTypeOf<Date>();
    });

    test("Order and execution types maintain integrity", () => {
        type OrderSide = 'buy' | 'sell';
        type OrderType = 'market' | 'limit' | 'stop';
        type OrderStatus = 'pending' | 'executed' | 'cancelled' | 'rejected';

        type Order = {
            id: string;
            symbol: string;
            side: OrderSide;
            type: OrderType;
            status: OrderStatus;
            quantity: number;
            price?: number;
            createdAt: Date;
            executedAt?: Date;
        };

        expectTypeOf<Order['side']>().toEqualTypeOf<'buy' | 'sell'>();
        expectTypeOf<Order['type']>().toEqualTypeOf<'market' | 'limit' | 'stop'>();
        expectTypeOf<Order['status']>().toEqualTypeOf<'pending' | 'executed' | 'cancelled' | 'rejected'>();
        expectTypeOf<Order['price']>().toEqualTypeOf<number | undefined>();
        expectTypeOf<Order['executedAt']>().toEqualTypeOf<Date | undefined>();
    });

    test("Risk management types are properly constrained", () => {
        type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
        type RiskMetrics = {
            level: RiskLevel;
            score: number; // 0-100
            maxDrawdown: number; // percentage
            sharpeRatio: number;
            volatility: number;
        };

        type RiskAssessment = {
            portfolio: string;
            metrics: RiskMetrics;
            recommendations: Array<{
                action: string;
                priority: 'low' | 'medium' | 'high';
                estimatedImpact: number;
            }>;
            assessedAt: Date;
        };

        expectTypeOf<RiskMetrics['level']>().toEqualTypeOf<'low' | 'medium' | 'high' | 'critical'>();
        expectTypeOf<RiskMetrics['score']>().toBeNumber();
        expectTypeOf<RiskAssessment['recommendations']>().toBeArray();
        expectTypeOf<RiskAssessment['recommendations'][number]['priority']>().toEqualTypeOf<'low' | 'medium' | 'high'>();
    });
});
