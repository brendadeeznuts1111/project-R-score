// packages/testing/src/types/using-templates.test.ts
// Demonstrating practical usage of type testing templates

import { expectTypeOf, test, describe } from "bun:test";
import {
    testFinancialTypes,
    testTemporalTypes,
    testMarketDataTypes,
    testObjectProperties,
    testNumericTypes,
    testArrayTypes,
    generateTypeTests
} from "./templates";

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

describe("Template-Based Type Testing", () => {
    test("Financial types template works for Odds", () => {
        testFinancialTypes<Odds>("Odds");
    });

    test("Temporal types template works for Tick", () => {
        testTemporalTypes<Tick>("Tick");
    });

    test("Market data types template works for MarketData", () => {
        testMarketDataTypes<MarketData>("MarketData");
    });

    test("Object properties template validates Tick structure", () => {
        testObjectProperties<Tick>(
            "Tick",
            ['id', 'timestamp', 'odds', 'symbol', 'volume'], // required
            ['metadata'] // optional
        );
    });

    test("Numeric types template validates MarketData constraints", () => {
        testNumericTypes("MarketData", {
            price: { min: 0 },
            volume: { min: 0, integer: false },
            bid: { min: 0 },
            ask: { min: 0 }
        } as any);
    });

    test("Array types template validates API response arrays", () => {
        testArrayTypes("APIResponse<MarketData[]>", ['data'], {
            data: MarketData
        } as any);
    });

    test("Generated comprehensive tests for complex types", () => {
        generateTypeTests<Tick>("Tick", {
            numericProps: ['volume'],
            temporal: true,
            marketData: true
        });
    });
});

describe("Real-World Type Testing Scenarios", () => {
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

    test("Union types work with financial data", () => {
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
});

describe("Advanced Type Testing Patterns", () => {
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

    test("Mapped types preserve transformations", () => {
        type OptionalOdds = Partial<Odds>;
        type ReadonlyOdds = Readonly<Odds>;
        type RequiredMarketData = Required<MarketData>;

        expectTypeOf<OptionalOdds>().toEqualTypeOf<Partial<Odds>>();
        expectTypeOf<ReadonlyOdds>().toEqualTypeOf<Readonly<Odds>>();
        expectTypeOf<RequiredMarketData>().toEqualTypeOf<Required<MarketData>>();
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
