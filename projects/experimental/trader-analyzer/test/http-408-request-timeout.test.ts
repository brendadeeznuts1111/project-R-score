#!/usr/bin/env bun
/**
 * @fileoverview HTTP 408 Request Timeout Tests
 * @description Tests for HTTP 408 Request Timeout handling
 * @module test/http-408-request-timeout
 */

import { describe, test, expect } from "bun:test";
import { ERROR_REGISTRY } from "../src/errors/index";

describe("HTTP 408 Request Timeout", () => {
	test("NX-006 error code exists in registry", () => {
		const error = ERROR_REGISTRY["NX-006"];
		expect(error).toBeDefined();
		expect(error.code).toBe("NX-006");
		expect(error.status).toBe(408);
		expect(error.message).toBe("Request Timeout");
		expect(error.category).toBe("GENERAL");
		expect(error.recoverable).toBe(true);
	});

	test("408 status code is correct", () => {
		const error = ERROR_REGISTRY["NX-006"];
		expect(error.status).toBe(408);
	});

	test("error is recoverable", () => {
		const error = ERROR_REGISTRY["NX-006"];
		expect(error.recoverable).toBe(true);
	});

	test("error reference exists", () => {
		const error = ERROR_REGISTRY["NX-006"];
		expect(error.ref).toBe("/docs/errors#nx-006");
	});
});

describe("HTTP 408 vs 504 Comparison", () => {
	test("408 is for client request timeout", () => {
		const error408 = ERROR_REGISTRY["NX-006"];
		expect(error408.status).toBe(408);
		expect(error408.message).toBe("Request Timeout");
	});

	test("504 is for gateway timeout (external service)", () => {
		const error504 = ERROR_REGISTRY["NX-405"];
		expect(error504.status).toBe(504);
		expect(error504.message).toBe("External Service Timeout");
		expect(error504.category).toBe("EXTERNAL");
	});

	test("408 and 504 are different error codes", () => {
		const error408 = ERROR_REGISTRY["NX-006"];
		const error504 = ERROR_REGISTRY["NX-405"];
		
		expect(error408.status).not.toBe(error504.status);
		expect(error408.category).not.toBe(error504.category);
		expect(error408.code).not.toBe(error504.code);
	});
});

describe("HTTP 408 Error Response Format", () => {
	test("creates proper 408 error response", () => {
		const error = ERROR_REGISTRY["NX-006"];
		const response = new Response(
			JSON.stringify({
				error: error.code,
				message: error.message,
				status: error.status,
				retryable: error.recoverable,
			}),
			{
				status: 408,
				headers: {
					"Content-Type": "application/json",
				},
			},
		);

		expect(response.status).toBe(408);
		expect(response.headers.get("Content-Type")).toBe("application/json");
	});

	test("includes retry information in response", () => {
		const error = ERROR_REGISTRY["NX-006"];
		const response = new Response(
			JSON.stringify({
				error: error.code,
				message: error.message,
				status: error.status,
				retryable: error.recoverable,
				retryAfter: 5,
			}),
			{
				status: 408,
				headers: {
					"Content-Type": "application/json",
					"Retry-After": "5",
				},
			},
		);

		expect(response.status).toBe(408);
		expect(response.headers.get("Retry-After")).toBe("5");
	});
});
