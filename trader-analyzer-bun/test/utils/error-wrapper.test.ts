#!/usr/bin/env bun
/**
 * @fileoverview Error Wrapper Tests
 * @description Tests for defensive error handling utility
 * @module test/utils/error-wrapper
 */

import { expect, test } from "bun:test";
import {
    createErrorHandler,
    getErrorMessage,
    getErrorStack,
    getErrorType,
    logError,
    normalizeError
} from "../../src/utils/error-wrapper";

test("handles null/undefined errors", () => {
	const nullResult = normalizeError(null);
	expect(nullResult.message).toBe("Unknown error occurred");
	expect(nullResult.type).toBe("UnknownError");
	expect(nullResult.raw).toBe(null);

	const undefinedResult = normalizeError(undefined);
	expect(undefinedResult.message).toBe("Unknown error occurred");
	expect(undefinedResult.type).toBe("UnknownError");
});

test("handles string errors", () => {
	const result = normalizeError("Simple error message");
	expect(result.message).toBe("Simple error message");
	expect(result.type).toBe("StringError");
	expect(result.stack).toBeDefined();
});

test("handles Error instances", () => {
	const error = new Error("Test error");
	error.stack = "Error: Test error\n    at test.ts:1:1";

	const result = normalizeError(error);
	expect(result.message).toBe("Test error");
	expect(result.type).toBe("Error");
	expect(result.stack).toBe("Error: Test error\n    at test.ts:1:1");
});

test("handles ErrorEvent pattern (Bun HMR style)", () => {
	const event = { error: null, message: "Event error message" };
	const result = normalizeError(event);
	expect(result.message).toBe("Event error message");
});

test("handles ErrorEvent with error property", () => {
	const innerError = new Error("Inner error");
	const event = { error: innerError, message: "Event message" };
	const result = normalizeError(event);
	expect(result.message).toBe("Inner error");
	expect(result.type).toBe("Error");
});

test("handles nested cause chains", () => {
	const rootError = new Error("Root cause");
	const middleError = new Error("Middle error", { cause: rootError });
	const topError = new Error("Top error", { cause: middleError });

	const result = normalizeError(topError);
	expect(result.message).toBe("Top error");
	expect(result.cause).toBeDefined();
	expect(result.cause?.message).toBe("Middle error");
	expect(result.cause?.cause?.message).toBe("Root cause");
});

test("handles numeric errors", () => {
	const result = normalizeError(404);
	expect(result.message).toBe("Error code: 404");
	expect(result.type).toBe("NumericError");
});

test("handles objects with message property", () => {
	const errorObj = { message: "Object error", code: 500 };
	const result = normalizeError(errorObj);
	expect(result.message).toBe("Object error");
	expect(result.type).toBeDefined();
});

test("getErrorMessage always returns string", () => {
	expect(getErrorMessage(null)).toBe("Unknown error occurred");
	expect(getErrorMessage("string error")).toBe("string error");
	expect(getErrorMessage(new Error("Error instance"))).toBe("Error instance");
	expect(getErrorMessage(404)).toBe("Error code: 404");
});

test("getErrorStack provides fallback", () => {
	const error = new Error("Test");
	error.stack = undefined as any;
	const stack = getErrorStack(error);
	expect(stack).toBe("No stack trace available");
});

test("getErrorType extracts type correctly", () => {
	expect(getErrorType(new Error("test"))).toBe("Error");
	expect(getErrorType("string")).toBe("StringError");
	expect(getErrorType(null)).toBe("UnknownError");
});

test("logError logs with full context", () => {
	const mockLogger = {
		error: (message: string, ...args: unknown[]) => {
			expect(message).toBe("Test context");
			expect(args[0]).toHaveProperty("error");
			expect(args[0]).toHaveProperty("timestamp");
			expect(args[0]).toHaveProperty("customField");
		},
	};

	logError(mockLogger, "Test context", new Error("Test error"), {
		customField: "value",
	});
});

test("createErrorHandler creates reusable handler", () => {
	const mockLogger = {
		error: (message: string, ...args: unknown[]) => {
			expect(message).toBe("WebSocket error");
			expect(args[0]).toHaveProperty("error");
		},
	};

	const handler = createErrorHandler(mockLogger, "WebSocket error");
	handler(new Error("Connection failed"));
});

test("handles Error with empty message", () => {
	const error = new Error("");
	const result = normalizeError(error);
	expect(result.message).toBeTruthy(); // Should have fallback
	expect(result.type).toBe("Error");
});

test("handles Error with toString override", () => {
	class CustomError extends Error {
		toString() {
			return "Custom toString";
		}
	}

	const error = new CustomError();
	const result = normalizeError(error);
	expect(result.message).toBeTruthy();
	expect(result.type).toBe("CustomError");
});

test("preserves timestamp in normalized error", () => {
	const before = Date.now();
	const result = normalizeError(new Error("test"));
	const after = Date.now();

	expect(result.timestamp).toBeGreaterThanOrEqual(before);
	expect(result.timestamp).toBeLessThanOrEqual(after);
});
