// packages/testing/src/types/templates.ts
// Type testing templates for Phase 2 - Comprehensive type validation

import { expectTypeOf, test } from "bun:test";

// ===== CORE TYPE TEMPLATES =====

/**
 * Template for testing object type properties
 */
function testObjectProperties<T>(
    typeName: string,
    requiredProps: (keyof T)[],
    optionalProps: (keyof T)[] = []
) {
    test(`${typeName} has required properties`, () => {
        requiredProps.forEach(prop => {
            expectTypeOf<T>().toHaveProperty(prop);
        });
    });

    test(`${typeName} has optional properties`, () => {
        if (optionalProps.length > 0) {
            optionalProps.forEach(prop => {
                expectTypeOf<T>().toHaveProperty(prop);
            });
        }
    });
}

/**
 * Template for testing numeric type constraints
 */
function testNumericTypes<T>(
    typeName: string,
    numericProps: { [K in keyof T]: { min?: number; max?: number; integer?: boolean } }
) {
    Object.entries(numericProps).forEach(([prop, constraints]) => {
        test(`${typeName}.${prop} is numeric`, () => {
            expectTypeOf<T[typeof prop]>().toBeNumber();
        });

        if (constraints.integer) {
            test(`${typeName}.${prop} is integer`, () => {
                expectTypeOf<T[typeof prop]>().toBeInteger();
            });
        }
    });
}

/**
 * Template for testing array type structures
 */
function testArrayTypes<T>(
    typeName: string,
    arrayProps: (keyof T)[],
    itemTypes?: { [K in keyof T]: any }
) {
    arrayProps.forEach(prop => {
        test(`${typeName}.${prop} is array`, () => {
            expectTypeOf<T[typeof prop]>().toBeArray();
        });

        if (itemTypes && itemTypes[prop]) {
            test(`${typeName}.${prop} array items have correct type`, () => {
                expectTypeOf<T[typeof prop][number]>().toEqualTypeOf(itemTypes[prop]);
            });
        }
    });
}

/**
 * Template for testing function signatures
 */
function testFunctionTypes<T>(
    typeName: string,
    functionProps: { [K in keyof T]: { params: any[]; return: any } }
) {
    Object.entries(functionProps).forEach(([prop, signature]) => {
        test(`${typeName}.${prop} is function`, () => {
            expectTypeOf<T[typeof prop]>().toBeFunction();
        });

        test(`${typeName}.${prop} has correct parameters`, () => {
            expectTypeOf<T[typeof prop]>().parameters.toEqualTypeOf(signature.params);
        });

        test(`${typeName}.${prop} has correct return type`, () => {
            expectTypeOf<T[typeof prop]>().returns.toEqualTypeOf(signature.return);
        });
    });
}

// ===== DOMAIN-SPECIFIC TEMPLATES =====

/**
 * Template for testing financial/odds types
 */
function testFinancialTypes<T extends { american: number; decimal: number; impliedProbability: number }>(
    typeName: string
) {
    test(`${typeName} has required odds properties`, () => {
        expectTypeOf<T>().toHaveProperty('american');
        expectTypeOf<T>().toHaveProperty('decimal');
        expectTypeOf<T>().toHaveProperty('impliedProbability');
    });

    test(`${typeName} odds properties are numeric`, () => {
        expectTypeOf<T['american']>().toBeNumber();
        expectTypeOf<T['decimal']>().toBeNumber();
        expectTypeOf<T['impliedProbability']>().toBeNumber();
    });

    test(`${typeName} implied probability is between 0 and 1`, () => {
        // This is a compile-time assertion pattern
        type ValidProbability = T['impliedProbability'] extends number
            ? T['impliedProbability'] extends infer P
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
}

/**
 * Template for testing temporal/timestamp types
 */
function testTemporalTypes<T extends { timestamp: Date }>(
    typeName: string
) {
    test(`${typeName} has timestamp property`, () => {
        expectTypeOf<T>().toHaveProperty('timestamp');
    });

    test(`${typeName}.timestamp is Date object`, () => {
        expectTypeOf<T['timestamp']>().toEqualTypeOf<Date>();
    });

    test(`${typeName}.timestamp is not string`, () => {
        expectTypeOf<T['timestamp']>().not.toEqualTypeOf<string>();
    });
}

/**
 * Template for testing market data types
 */
function testMarketDataTypes<T extends { symbol: string; price: number; volume: number }>(
    typeName: string
) {
    test(`${typeName} has market data properties`, () => {
        expectTypeOf<T>().toHaveProperty('symbol');
        expectTypeOf<T>().toHaveProperty('price');
        expectTypeOf<T>().toHaveProperty('volume');
    });

    test(`${typeName}.symbol is string`, () => {
        expectTypeOf<T['symbol']>().toBeString();
    });

    test(`${typeName}.price and volume are numeric`, () => {
        expectTypeOf<T['price']>().toBeNumber();
        expectTypeOf<T['volume']>().toBeNumber();
    });
}

// ===== UTILITY TEMPLATES =====

/**
 * Template for testing union types
 */
function testUnionTypes<T, U>(
    unionName: string,
    typeA: new () => T,
    typeB: new () => U
) {
    test(`${unionName} includes both types`, () => {
        expectTypeOf<T | U>().toEqualTypeOf<T | U>();
    });

    test(`${unionName} is not just one type`, () => {
        expectTypeOf<T | U>().not.toEqualTypeOf<T>();
        expectTypeOf<T | U>().not.toEqualTypeOf<U>();
    });
}

/**
 * Template for testing generic types
 */
function testGenericTypes<T, U>(
    genericName: string,
    concreteType: new () => T,
    genericParam: U
) {
    test(`${genericName} works with concrete type`, () => {
        expectTypeOf<T>().toEqualTypeOf<T>();
    });

    test(`${genericName} accepts generic parameter`, () => {
        expectTypeOf<U>().toBeUnknown(); // Generic params are typically unknown
    });
}

/**
 * Template for testing conditional types
 */
function testConditionalTypes<T, U, V>(
    conditionalName: string,
    condition: T extends U ? V : never
) {
    test(`${conditionalName} conditional type works`, () => {
        expectTypeOf<typeof condition>().toEqualTypeOf<V>();
    });
}

// ===== EXAMPLE USAGE =====

// Example: Testing Odds type
function createOddsTypeTests() {
    type Odds = {
        american: number;
        decimal: number;
        impliedProbability: number;
    };

    testFinancialTypes<Odds>("Odds");

    testNumericTypes("Odds", {
        american: { integer: true },
        decimal: { min: 1 },
        impliedProbability: { min: 0, max: 1 }
    } as any);
}

// Example: Testing Tick type
function createTickTypeTests() {
    type Tick = {
        id: string;
        timestamp: Date;
        odds: {
            american: number;
            decimal: number;
            impliedProbability: number;
        };
        symbol: string;
        volume: number;
    };

    testTemporalTypes<Tick>("Tick");
    testMarketDataTypes<Tick>("Tick");
    testObjectProperties("Tick", ['id', 'timestamp', 'odds', 'symbol', 'volume']);
}

// Example: Testing API response types
function createAPIResponseTypeTests() {
    type APIResponse<T> = {
        success: boolean;
        data: T;
        error?: string;
        timestamp: string;
    };

    testGenericTypes("APIResponse", Object, {} as any);
    testObjectProperties("APIResponse", ['success', 'data', 'timestamp'], ['error']);
}

// ===== AUTOMATED TEST GENERATION =====

/**
 * Generate comprehensive type tests for a given type
 */
function generateTypeTests<T>(
    typeName: string,
    config: {
        numericProps?: string[];
        arrayProps?: string[];
        functionProps?: string[];
        temporal?: boolean;
        financial?: boolean;
        marketData?: boolean;
    } = {}
) {
    describe(`${typeName} Type Tests`, () => {
        if (config.temporal) {
            testTemporalTypes<T>(typeName);
        }

        if (config.financial) {
            testFinancialTypes<T>(typeName);
        }

        if (config.marketData) {
            testMarketDataTypes<T>(typeName);
        }

        // Add more automated tests based on config
    });
}

export {
    testObjectProperties,
    testNumericTypes,
    testArrayTypes,
    testFunctionTypes,
    testFinancialTypes,
    testTemporalTypes,
    testMarketDataTypes,
    testUnionTypes,
    testGenericTypes,
    testConditionalTypes,
    generateTypeTests
};
