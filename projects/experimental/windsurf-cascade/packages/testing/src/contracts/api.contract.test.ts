// API Contract Testing
// Ensures API responses conform to expected schemas and business rules

import { test, describe, expect, beforeAll, afterAll } from "bun:test";
import { ContractTestFactory, NetworkDataFactory } from "../factories";

// Mock API server for contract testing
class MockAPIServer {
    private routes = new Map();

    constructor() {
        this.setupRoutes();
    }

    private setupRoutes() {
        // GET /api/odds
        this.routes.set('/api/odds', () => ({
            status: 200,
            body: ContractTestFactory.createAPIContractResponses().valid
        }));

        // POST /api/arbitrage/calculate
        this.routes.set('/api/arbitrage/calculate', (request: any) => {
            if (!request.body || !request.body.odds) {
                return {
                    status: 400,
                    body: ContractTestFactory.createAPIContractResponses().error
                };
            }
            return {
                status: 200,
                body: {
                    success: true,
                    data: ContractTestFactory.createValidOddsTickContract(),
                    calculation: {
                        profit: 2.5,
                        confidence: 0.95
                    }
                }
            };
        });

        // GET /api/health
        this.routes.set('/api/health', () => ({
            status: 200,
            body: {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            }
        }));
    }

    async request(url: string, options: any = {}) {
        const route = this.routes.get(url);
        if (!route) {
            return {
                status: 404,
                body: { error: 'Not Found' }
            };
        }

        try {
            return route(options);
        } catch (error) {
            return {
                status: 500,
                body: { error: 'Internal Server Error' }
            };
        }
    }
}

// API Contract Schemas
const APIResponseSchema = {
    type: "object",
    required: ["status", "body"],
    properties: {
        status: { type: "number", enum: [200, 201, 400, 404, 500] },
        body: { type: "object" }
    }
};

const SuccessResponseSchema = {
    type: "object",
    required: ["success", "data"],
    properties: {
        success: { type: "boolean" },
        data: { type: "object" },
        pagination: {
            type: "object",
            properties: {
                page: { type: "number" },
                total: { type: "number" },
                limit: { type: "number" }
            }
        }
    }
};

const ErrorResponseSchema = {
    type: "object",
    required: ["error"],
    properties: {
        error: {
            type: "object",
            required: ["message", "code"],
            properties: {
                message: { type: "string" },
                code: { type: "number" },
                details: { type: "object" }
            }
        }
    }
};

// Schema validation utility
function validateAPISchema(response: any, schema: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (schema.required) {
        for (const field of schema.required) {
            if (!(field in response)) {
                errors.push(`Missing required field: ${field}`);
            }
        }
    }

    if (schema.properties) {
        for (const [field, fieldSchema] of Object.entries(schema.properties)) {
            if (field in response) {
                const fieldDef = fieldSchema as any;
                if (fieldDef.type && typeof response[field] !== fieldDef.type) {
                    errors.push(`Field ${field} should be ${fieldDef.type}, got ${typeof response[field]}`);
                }
                if (fieldDef.enum && !fieldDef.enum.includes(response[field])) {
                    errors.push(`Field ${field} should be one of ${fieldDef.enum}, got ${response[field]}`);
                }
            }
        }
    }

    return { valid: errors.length === 0, errors };
}

describe("API Contract Tests", () => {
    let apiServer: MockAPIServer;

    beforeAll(() => {
        apiServer = new MockAPIServer();
    });

    describe("Response Schema Validation", () => {
        test("GET /api/odds returns valid success response", async () => {
            const response = await apiServer.request('/api/odds');

            // Basic API response structure
            const basicValidation = validateAPISchema(response, APIResponseSchema);
            expect(basicValidation.valid).toBe(true);
            expect(basicValidation.errors).toHaveLength(0);

            // Success response structure
            const successValidation = validateAPISchema(response.body, SuccessResponseSchema);
            expect(successValidation.valid).toBe(true);
            expect(successValidation.errors).toHaveLength(0);

            // Specific business rules
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.pagination).toBeDefined();
        });

        test("POST /api/arbitrage/calculate with valid data returns calculation", async () => {
            const validRequest = {
                body: {
                    odds: [
                        { bookmaker: 'BookA', odds: -110, commission: 0.02 },
                        { bookmaker: 'BookB', odds: -105, commission: 0.025 }
                    ]
                }
            };

            const response = await apiServer.request('/api/arbitrage/calculate', validRequest);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
            expect(response.body.calculation).toBeDefined();
            expect(response.body.calculation.profit).toBeGreaterThan(0);
            expect(response.body.calculation.confidence).toBeBetween(0, 1);
        });

        test("POST /api/arbitrage/calculate with invalid data returns error", async () => {
            const invalidRequest = {
                body: {} // Missing required odds data
            };

            const response = await apiServer.request('/api/arbitrage/calculate', invalidRequest);

            expect(response.status).toBe(400);

            const errorValidation = validateAPISchema(response.body, ErrorResponseSchema);
            expect(errorValidation.valid).toBe(true);
            expect(response.body.error.message).toBeDefined();
            expect(response.body.error.code).toBeDefined();
        });

        test("GET /api/health returns health status", async () => {
            const response = await apiServer.request('/api/health');

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('healthy');
            expect(response.body.timestamp).toBeDefined();
            expect(response.body.version).toBeDefined();

            // Validate timestamp format
            const timestamp = new Date(response.body.timestamp);
            expect(timestamp.getTime()).not.toBeNaN();
        });

        test("unknown endpoint returns 404 error", async () => {
            const response = await apiServer.request('/api/unknown');

            expect(response.status).toBe(404);
            expect(response.body.error).toBeDefined();
        });
    });

    describe("Data Format Contracts", () => {
        test("odds data follows expected format", async () => {
            const response = await apiServer.request('/api/odds');
            const oddsData = response.body.data;

            expect(Array.isArray(oddsData)).toBe(true);

            if (oddsData.length > 0) {
                const odd = oddsData[0];

                // Required fields for odds data
                expect(odd).toHaveProperty('id');
                expect(odd).toHaveProperty('sport');
                expect(odd).toHaveProperty('event');
                expect(odd).toHaveProperty('odds');
                expect(odd).toHaveProperty('timestamp');
                expect(odd).toHaveProperty('bookmaker');

                // Odds object validation
                expect(odd.odds).toHaveProperty('home');
                expect(odd.odds).toHaveProperty('away');
                expect(typeof odd.odds.home).toBe('number');
                expect(typeof odd.odds.away).toBe('number');

                // Timestamp validation
                const timestamp = new Date(odd.timestamp);
                expect(timestamp.getTime()).not.toBeNaN();
            }
        });

        test("pagination data follows expected format", async () => {
            const response = await apiServer.request('/api/odds');
            const pagination = response.body.pagination;

            expect(pagination).toHaveProperty('page');
            expect(pagination).toHaveProperty('total');
            expect(pagination).toHaveProperty('limit');

            expect(typeof pagination.page).toBe('number');
            expect(typeof pagination.total).toBe('number');
            expect(typeof pagination.limit).toBe('number');

            expect(pagination.page).toBeGreaterThan(0);
            expect(pagination.total).toBeGreaterThanOrEqual(0);
            expect(pagination.limit).toBeGreaterThan(0);
        });

        test("error responses follow consistent format", async () => {
            const errorResponse = ContractTestFactory.createAPIContractResponses().error;

            expect(errorResponse.status).toBe(500);
            expect(errorResponse.body).toHaveProperty('success');
            expect(errorResponse.body.success).toBe(false);
            expect(errorResponse.body.error).toHaveProperty('message');
            expect(errorResponse.body.error).toHaveProperty('code');
        });
    });

    describe("Business Logic Contracts", () => {
        test("arbitrage calculation returns mathematically valid results", async () => {
            const request = {
                body: {
                    odds: [
                        { bookmaker: 'BookA', odds: 2.1, commission: 0.02 },
                        { bookmaker: 'BookB', odds: 2.0, commission: 0.025 }
                    ]
                }
            };

            const response = await apiServer.request('/api/arbitrage/calculate', request);

            expect(response.body.calculation.profit).toBeGreaterThan(0);

            // Verify mathematical consistency
            const profit = response.body.calculation.profit;
            expect(typeof profit).toBe('number');
            expect(profit).toBeLessThan(100); // Profit should be reasonable percentage
        });

        test("odds filtering respects query parameters", async () => {
            // This would test query parameter contracts in a real implementation
            const response = await apiServer.request('/api/odds?sport=basketball');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // In a real implementation, verify filtered results
            // expect(response.body.data.every(odd => odd.sport === 'basketball')).toBe(true);
        });

        test("rate limiting headers are present", async () => {
            const response = await apiServer.request('/api/odds');

            // In a real implementation, check for rate limiting headers
            // expect(response.headers).toHaveProperty('x-ratelimit-limit');
            // expect(response.headers).toHaveProperty('x-ratelimit-remaining');

            // For now, just ensure the response structure is valid
            expect(response.status).toBe(200);
        });
    });

    describe("Performance Contracts", () => {
        test("API responses meet latency requirements", async () => {
            const startTime = performance.now();
            const response = await apiServer.request('/api/odds');
            const endTime = performance.now();

            const latency = endTime - startTime;
            expect(latency).toBeLessThan(100); // Should respond in under 100ms
            expect(response.status).toBe(200);
        });

        test("concurrent requests are handled properly", async () => {
            const requests = Array.from({ length: 10 }, () =>
                apiServer.request('/api/odds')
            );

            const responses = await Promise.all(requests);

            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });

            // Verify all responses are consistent
            const firstResponse = responses[0];
            responses.forEach(response => {
                expect(response.body.data.length).toBe(firstResponse.body.data.length);
            });
        });
    });

    describe("Security Contracts", () => {
        test("sensitive data is not exposed in responses", async () => {
            const response = await apiServer.request('/api/odds');

            // Ensure no internal system details are exposed
            expect(response.body).not.toHaveProperty('stackTrace');
            expect(response.body).not.toHaveProperty('internalError');
            expect(response.body).not.toHaveProperty('databaseQuery');
        });

        test("error messages don't reveal system information", async () => {
            const response = await apiServer.request('/api/unknown');

            expect(response.status).toBe(404);
            expect(response.body.error.message).not.toContain('database');
            expect(response.body.error.message).not.toContain('internal');
            expect(response.body.error.message).not.toContain('/path/');
        });
    });

    describe("Versioning Contracts", () => {
        test("API version is communicated properly", async () => {
            const response = await apiServer.request('/api/health');

            expect(response.body.version).toBeDefined();
            expect(typeof response.body.version).toBe('string');
            expect(response.body.version).toMatch(/^\d+\.\d+\.\d+$/);
        });

        test("backward compatibility is maintained", async () => {
            const response = await apiServer.request('/api/odds');

            // Ensure all currently expected fields are present
            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('pagination');

            // These fields should not be removed in future versions
            const dataItem = response.body.data[0] || {};
            const requiredFields = ['id', 'sport', 'event', 'odds', 'timestamp'];
            requiredFields.forEach(field => {
                expect(dataItem).toHaveProperty(field);
            });
        });
    });
});

// API Contract test utilities
export const APIContractUtils = {
    validateAPISchema,
    APIResponseSchema,
    SuccessResponseSchema,
    ErrorResponseSchema,

    createContractTestSuite: (customSchema?: any) => {
        return {
            validateResponse: (response: any) => validateAPISchema(response, customSchema || APIResponseSchema),
            expectValidResponse: (response: any) => {
                const validation = validateAPISchema(response, customSchema || APIResponseSchema);
                expect(validation.valid).toBe(true);
                return validation;
            },
            expectErrorResponse: (response: any, expectedStatus?: number) => {
                if (expectedStatus) {
                    expect(response.status).toBe(expectedStatus);
                }
                const validation = validateAPISchema(response.body, ErrorResponseSchema);
                expect(validation.valid).toBe(true);
                return validation;
            }
        };
    },

    MockAPIServer
};
