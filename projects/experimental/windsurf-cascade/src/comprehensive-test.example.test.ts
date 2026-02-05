// src/comprehensive-test.example.ts
// Example test file to demonstrate comprehensive configuration

import { test, expect, describe } from "bun:test";

describe("Comprehensive Configuration Demo", () => {
    test("environment variables are set correctly", () => {
        expect(process.env.NODE_ENV).toBe("test");
        expect(process.env.DATABASE_URL).toBe("postgresql://localhost:5432/test_db");
        expect(process.env.API_URL).toBe("http://localhost:3001");
        expect(process.env.LOG_LEVEL).toBe("error");
    });

    test("global test utilities are available", () => {
        expect(global.testUtils).toBeDefined();
        expect(global.testEnvironment).toBe("comprehensive-test");
        expect(global.testStartTime).toBeDefined();

        // Test utility functions
        const mockUser = global.testUtils.generateMockData("user");
        expect(mockUser).toHaveProperty("id");
        expect(mockUser).toHaveProperty("name");
        expect(mockUser).toHaveProperty("email");
    });

    test("database mock works correctly", async () => {
        const { Pool } = require("pg");
        const pool = new Pool();
        const client = await pool.connect();

        const result = await client.query("SELECT * FROM users");
        expect(result.rows).toHaveLength(1);
        expect(result.rowCount).toBe(1);

        client.release();
    });

    test("API mock works correctly", async () => {
        const axios = require("axios");

        const response = await axios.get("/api/users");
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty("url");
        expect(response.data).toHaveProperty("method");

        const postResponse = await axios.post("/api/users", { name: "Test" });
        expect(postResponse.status).toBe(201);
        expect(postResponse.data).toHaveProperty("data");
    });

    test("filesystem mock works correctly", async () => {
        const fs = require("fs/promises");

        const data = await fs.readFile("test.json");
        const parsed = JSON.parse(data);
        expect(parsed).toHaveProperty("path");
        expect(parsed).toHaveProperty("content");

        await fs.writeFile("output.json", JSON.stringify({ test: true }));
        // Should not throw error
    });

    test("global fetch mock works correctly", async () => {
        const response = await fetch("https://api.example.com/data");
        expect(response.ok).toBe(true);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data).toHaveProperty("url");
        expect(data).toHaveProperty("mock");
    });

    test("external service mock works correctly", async () => {
        const externalService = require("./src/services/external-service.js");

        const result = await externalService.fetchData("/api/external");
        expect(result).toHaveProperty("endpoint");
        expect(result).toHaveProperty("data");
        expect(result).toHaveProperty("status");

        const submitResult = await externalService.submitData("/api/submit", { test: true });
        expect(submitResult).toHaveProperty("submitted");
        expect(submitResult).toHaveProperty("id");
    });

    test("logger mock respects log level", () => {
        const logger = require("./src/utils/logger.js");

        // These should not log when LOG_LEVEL is "error"
        logger.info("Info message");
        logger.warn("Warning message");
        logger.debug("Debug message");

        // This should always log
        logger.error("Error message");
    });

    test("configuration mock works correctly", () => {
        const config = require("./config.js");

        expect(config.database).toHaveProperty("host");
        expect(config.database).toHaveProperty("port");
        expect(config.api).toHaveProperty("url");
        expect(config.logging).toHaveProperty("level");
    });

    test("timeout configuration works", async () => {
        // This test uses the default timeout from config (10s)
        const startTime = Date.now();

        // Simulate some work
        await global.testUtils.delay(100);

        const duration = Date.now() - startTime;
        expect(duration).toBeGreaterThan(50);
        expect(duration).toBeLessThan(1000); // Well under 10s timeout
    }, 5000); // Override with 5s timeout for this specific test

    test("test environment assertion", () => {
        expect(() => global.testUtils.assertEnvironment()).not.toThrow();
    });
});

describe("Coverage Configuration Demo", () => {
    test("function coverage example", () => {
        function add(a: number, b: number): number {
            return a + b;
        }

        function multiply(a: number, b: number): number {
            return a * b;
        }

        expect(add(2, 3)).toBe(5);
        expect(multiply(4, 5)).toBe(20);
    });

    test("statement coverage example", () => {
        const x = 10;
        let y: number;

        if (x > 5) {
            y = x * 2;
        } else {
            y = x / 2;
        }

        expect(y).toBe(20);
    });

    test("branch coverage example", () => {
        const isEven = (n: number) => n % 2 === 0;

        expect(isEven(2)).toBe(true);
        expect(isEven(3)).toBe(false);
    });
});
