// packages/testing/src/types/odds.types.test.ts
// Comprehensive type testing for Odds Protocol using Bun 1.3 expectTypeOf

import { expectTypeOf, test, describe } from "bun:test";
import type {
    Odds,
    TickData,
    MarketHours,
    ArbitrageOpportunity,
    PricePoint,
    MarketData
} from "@odds-core/types";

describe("Odds Type Validation", () => {
    test("Odds type has required numeric properties", () => {
        expectTypeOf<Odds>().toHaveProperty('american');
        expectTypeOf<Odds>().toHaveProperty('decimal');
        expectTypeOf<Odds>().toHaveProperty('impliedProbability');
    });

    test("Odds properties are numeric types", () => {
        expectTypeOf<Odds['american']>().toBeNumber();
        expectTypeOf<Odds['decimal']>().toBeNumber();
        expectTypeOf<Odds['impliedProbability']>().toBeNumber();
    });

    test("Odds american values are integers", () => {
        expectTypeOf<Odds['american']>().toBeInteger();
    });

    test("Odds decimal values are positive numbers", () => {
        // Compile-time assertion for positive constraint
        type PositiveDecimal = Odds['decimal'] extends number
            ? Odds['decimal'] extends infer D
            ? D extends number
            ? D extends 0
            ? never
            : D extends -1
            ? never
            : D
            : never
            : never
            : never;

        expectTypeOf<PositiveDecimal>().toBeNumber();
    });

    test("Odds implied probability is between 0 and 1", () => {
        type ValidProbability = Odds['impliedProbability'] extends number
            ? Odds['impliedProbability'] extends infer P
            ? P extends number
            ? P extends 0
            ? never
            : P extends 1
            ? never
            : P
            : never
            : never
            : never;

        expectTypeOf<ValidProbability>().toBeNumber();
    });
});

describe("TickData Type Validation", () => {
    test("TickData has timestamp property", () => {
        expectTypeOf<TickData>().toHaveProperty('timestamp');
    });

    test("TickData timestamp is Date object", () => {
        expectTypeOf<TickData['timestamp']>().toEqualTypeOf<Date>();
    });

    test("TickData timestamp is not string", () => {
        expectTypeOf<TickData['timestamp']>().not.toEqualTypeOf<string>();
        expectTypeOf<TickData['timestamp']>().not.toEqualTypeOf<number>();
    });

    test("TickData has odds property", () => {
        expectTypeOf<TickData>().toHaveProperty('odds');
        expectTypeOf<TickData['odds']>().toEqualTypeOf<Odds>();
    });

    test("TickData has symbol property", () => {
        expectTypeOf<TickData>().toHaveProperty('symbol');
        expectTypeOf<TickData['symbol']>().toBeString();
    });

    test("TickData has optional metadata", () => {
        expectTypeOf<TickData>().toHaveProperty('metadata');
        expectTypeOf<TickData['metadata']>().toBeNullable();
    });
});

describe("MarketHours Type Validation", () => {
    test("MarketHours has time properties", () => {
        expectTypeOf<MarketHours>().toHaveProperty('open');
        expectTypeOf<MarketHours>().toHaveProperty('close');
        expectTypeOf<MarketHours>().toHaveProperty('timezone');
    });

    test("MarketHours times are strings", () => {
        expectTypeOf<MarketHours['open']>().toBeString();
        expectTypeOf<MarketHours['close']>().toBeString();
        expectTypeOf<MarketHours['timezone']>().toBeString();
    });

    test("MarketHours has day properties", () => {
        expectTypeOf<MarketHours>().toHaveProperty('days');
        expectTypeOf<MarketHours['days']>().toBeArray();
        expectTypeOf<MarketHours['days'][number]>().toBeString();
    });

    test("MarketHours validates time format", () => {
        // Compile-time check for HH:MM format
        type TimeFormat = MarketHours['open'] extends `${string}:${string}`
            ? MarketHours['open']
            : never;

        expectTypeOf<TimeFormat>().toBeString();
    });
});

describe("ArbitrageOpportunity Type Validation", () => {
    test("ArbitrageOpportunity has calculation properties", () => {
        expectTypeOf<ArbitrageOpportunity>().toHaveProperty('profit');
        expectTypeOf<ArbitrageOpportunity>().toHaveProperty('profitMargin');
        expectTypeOf<ArbitrageOpportunity>().toHaveProperty('totalStake');
    });

    test("ArbitrageOpportunity financial properties are numeric", () => {
        expectTypeOf<ArbitrageOpportunity['profit']>().toBeNumber();
        expectTypeOf<ArbitrageOpportunity['profitMargin']>().toBeNumber();
        expectTypeOf<ArbitrageOpportunity['totalStake']>().toBeNumber();
    });

    test("ArbitrageOpportunity has market data", () => {
        expectTypeOf<ArbitrageOpportunity>().toHaveProperty('markets');
        expectTypeOf<ArbitrageOpportunity['markets']>().toBeArray();
    });

    test("ArbitrageOpportunity markets contain odds", () => {
        expectTypeOf<ArbitrageOpportunity['markets'][number]>().toHaveProperty('odds');
        expectTypeOf<ArbitrageOpportunity['markets'][number]['odds']>().toEqualTypeOf<Odds>();
    });

    test("ArbitrageOpportunity profit is non-negative", () => {
        type NonNegativeProfit = ArbitrageOpportunity['profit'] extends number
            ? ArbitrageOpportunity['profit'] extends infer P
            ? P extends number
            ? P extends -1
            ? never
            : P
            : never
            : never
            : never;

        expectTypeOf<NonNegativeProfit>().toBeNumber();
    });
});

describe("PricePoint Type Validation", () => {
    test("PricePoint has coordinate properties", () => {
        expectTypeOf<PricePoint>().toHaveProperty('price');
        expectTypeOf<PricePoint>().toHaveProperty('timestamp');
        expectTypeOf<PricePoint>().toHaveProperty('volume');
    });

    test("PricePoint coordinates are correct types", () => {
        expectTypeOf<PricePoint['price']>().toBeNumber();
        expectTypeOf<PricePoint['timestamp']>().toEqualTypeOf<Date>();
        expectTypeOf<PricePoint['volume']>().toBeNumber();
    });

    test("PricePoint volume is non-negative", () => {
        type NonNegativeVolume = PricePoint['volume'] extends number
            ? PricePoint['volume'] extends infer V
            ? V extends number
            ? V extends -1
            ? never
            : V
            : never
            : never
            : never;

        expectTypeOf<NonNegativeVolume>().toBeNumber();
    });
});

describe("MarketData Type Validation", () => {
    test("MarketData has symbol and price data", () => {
        expectTypeOf<MarketData>().toHaveProperty('symbol');
        expectTypeOf<MarketData>().toHaveProperty('currentPrice');
        expectTypeOf<MarketData>().toHaveProperty('priceHistory');
    });

    test("MarketData symbol is string", () => {
        expectTypeOf<MarketData['symbol']>().toBeString();
    });

    test("MarketData currentPrice is number", () => {
        expectTypeOf<MarketData['currentPrice']>().toBeNumber();
    });

    test("MarketData priceHistory is array of PricePoint", () => {
        expectTypeOf<MarketData['priceHistory']>().toBeArray();
        expectTypeOf<MarketData['priceHistory'][number]>().toEqualTypeOf<PricePoint>();
    });

    test("MarketData has optional metadata", () => {
        expectTypeOf<MarketData>().toHaveProperty('metadata');
        expectTypeOf<MarketData['metadata']>().toBeNullable();
    });
});

describe("Union and Complex Type Validation", () => {
    test("Odds can be created from different input types", () => {
        type AmericanOdds = { american: number; decimal?: never; impliedProbability?: never };
        type DecimalOdds = { american?: never; decimal: number; impliedProbability?: never };
        type ImpliedOdds = { american?: never; decimal?: never; impliedProbability: number };

        expectTypeOf<AmericanOdds | DecimalOdds | ImpliedOdds>().toEqualTypeOf<Partial<Odds> & Record<string, number>>();
    });

    test("TickData can have optional metadata", () => {
        type TickWithMetadata = TickData & { metadata: Record<string, unknown> };
        type TickWithoutMetadata = Omit<TickData, 'metadata'>;

        expectTypeOf<TickWithMetadata | TickWithoutMetadata>().toEqualTypeOf<TickData>();
    });

    test("MarketData array operations preserve types", () => {
        expectTypeOf<MarketData[]>().toBeArray();
        expectTypeOf<MarketData[0]>().toEqualTypeOf<MarketData>();
        expectTypeOf<MarketData[number]['symbol']>().toBeString();
    });
});

describe("Generic Type Validation", () => {
    test("API response wrapper preserves data type", () => {
        type ApiResponse<T> = {
            success: boolean;
            data: T;
            error?: string;
            timestamp: string;
        };

        expectTypeOf<ApiResponse<Odds>>().toHaveProperty('data');
        expectTypeOf<ApiResponse<Odds>['data']>().toEqualTypeOf<Odds>();
        expectTypeOf<ApiResponse<TickData>['data']>().toEqualTypeOf<TickData>();
    });

    test("Paginated response preserves array types", () => {
        type PaginatedResponse<T> = {
            data: T[];
            page: number;
            totalPages: number;
            totalItems: number;
        };

        expectTypeOf<PaginatedResponse<MarketData>>().toHaveProperty('data');
        expectTypeOf<PaginatedResponse<MarketData>['data']>().toBeArray();
        expectTypeOf<PaginatedResponse<MarketData>['data'][number]>().toEqualTypeOf<MarketData>();
    });

    test("Event emitter preserves callback types", () => {
        type EventEmitter<T> = {
            on(event: string, callback: (data: T) => void): void;
            emit(event: string, data: T): void;
        };

        expectTypeOf<EventEmitter<Odds>>().toHaveProperty('on');
        expectTypeOf<EventEmitter<TickData>>().toHaveProperty('emit');
    });
});

describe("Conditional Type Validation", () => {
    test("Nullable types work correctly", () => {
        type Nullable<T> = T | null | undefined;

        expectTypeOf<Nullable<string>>().toEqualTypeOf<string | null | undefined>();
        expectTypeOf<Nullable<number>>().toEqualTypeOf<number | null | undefined>();
        expectTypeOf<Nullable<Odds>>().toEqualTypeOf<Odds | null | undefined>();
    });

    test("Deep readonly types preserve structure", () => {
        type DeepReadonly<T> = {
            readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
        };

        expectTypeOf<DeepReadonly<Odds>>().toHaveProperty('american');
        expectTypeOf<DeepReadonly<Odds>['american']>().toBeNumber();
        expectTypeOf<DeepReadonly<TickData>['timestamp']>().toEqualTypeOf<Date>();
    });

    test("Function parameter types are preserved", () => {
        type OddsCalculator = (odds: Odds) => ArbitrageOpportunity;
        type TickProcessor = (tick: TickData) => MarketData;

        expectTypeOf<OddsCalculator>().toBeFunction();
        expectTypeOf<OddsCalculator>().parameters.toEqualTypeOf<[Odds]>();
        expectTypeOf<OddsCalculator>().returns.toEqualTypeOf<ArbitrageOpportunity>();

        expectTypeOf<TickProcessor>().toBeFunction();
        expectTypeOf<TickProcessor>().parameters.toEqualTypeOf<[TickData]>();
        expectTypeOf<TickProcessor>().returns.toEqualTypeOf<MarketData>();
    });
});
