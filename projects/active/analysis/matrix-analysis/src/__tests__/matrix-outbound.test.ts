import { describe, expect, it } from "bun:test";
import type { OutboundFetch } from "../../../../../../lib/http/outbound-policy.ts";
import {
	fetchMatrixGrantedResource,
	fetchMatrixLoopbackRead,
	fetchMatrixLoopbackWrite,
	fetchMatrixPublicResource,
} from "../lib/matrix-outbound.ts";

const PUBLIC_DNS = async () => [
	{
		address: "93.184.216.34",
		family: 4 as const,
		ttl: 60,
		source: "node-resolver" as const,
	},
];

describe("matrix outbound public boundary", () => {
	it("denies non-HTTPS and credentials before transport", async () => {
		let calls = 0;
		const fetcher: OutboundFetch = async () => {
			calls++;
			return new Response("unexpected");
		};
		const options = { fetcher, resolver: PUBLIC_DNS, environment: {} };

		expect(() =>
			fetchMatrixPublicResource("http://example.com/feed", {}, options),
		).toThrow("HTTPS");
		expect(() =>
			fetchMatrixPublicResource(
				"https://example.com/feed",
				{ headers: { Authorization: "secret" } },
				options,
			),
		).toThrow("credentials");
		expect(calls).toBe(0);
	});

	it("denies redirects, writes, private authority, and offline mode before transport", async () => {
		let calls = 0;
		const fetcher: OutboundFetch = async () => {
			calls++;
			return new Response("unexpected");
		};
		const base = { fetcher, resolver: PUBLIC_DNS, environment: {} };

		expect(() =>
			fetchMatrixPublicResource(
				"https://example.com/feed",
				{ redirect: "follow" },
				base,
			),
		).toThrow("redirect");
		expect(() =>
			fetchMatrixPublicResource("https://example.com/feed", { method: "POST" }, base),
		).toThrow("method POST");
		await expect(
			fetchMatrixPublicResource(
				"https://example.com/feed",
				{},
				{
					...base,
					resolver: async () => [
						{
							address: "127.0.0.1",
							family: 4,
							ttl: 0,
							source: "node-resolver" as const,
						},
					],
				},
			),
		).rejects.toThrow("rejected");
		expect(() =>
			fetchMatrixPublicResource(
				"https://example.com/feed",
				{},
				{
					...base,
					networkMode: "offline-no-socket",
				},
			),
		).toThrow("forbids network fetch");
		expect(calls).toBe(0);
	});

	it("honors the validated offline environment and bounds streamed responses", async () => {
		let calls = 0;
		const fetcher: OutboundFetch = async (_input, init) => {
			calls++;
			expect(init?.redirect).toBe("error");
			expect(init?.credentials).toBe("omit");
			expect(init?.signal).toBeInstanceOf(AbortSignal);
			return new Response("four");
		};

		expect(() =>
			fetchMatrixPublicResource(
				"https://example.com/feed",
				{},
				{
					fetcher,
					resolver: PUBLIC_DNS,
					environment: { MATRIX_OFFLINE: "1" },
				},
			),
		).toThrow("forbids network fetch");
		expect(calls).toBe(0);

		const response = await fetchMatrixPublicResource(
			"https://example.com/feed",
			{},
			{
				fetcher,
				resolver: PUBLIC_DNS,
				environment: {},
				responseByteLimit: 3,
			},
		);
		await expect(response.text()).rejects.toThrow("exceeds 3 bytes");
		expect(calls).toBe(1);
	});

	it("rejects malformed environment overrides before transport", async () => {
		let calls = 0;
		expect(() =>
			fetchMatrixPublicResource(
				"https://example.com/feed",
				{},
				{
					fetcher: async () => {
						calls++;
						return new Response("unexpected");
					},
					environment: { MATRIX_NETWORK_MODE: "sometimes" },
				},
			),
		).toThrow("Unsupported MATRIX_NETWORK_MODE");
		expect(calls).toBe(0);
	});
});

describe("matrix outbound granted endpoint boundary", () => {
	it("rejects origin drift and non-loopback destinations before transport", () => {
		let calls = 0;
		const options = {
			fetcher: async () => {
				calls++;
				return new Response("unexpected");
			},
			environment: {},
		};
		expect(() =>
			fetchMatrixGrantedResource(
				"https://evil.example/write",
				{ method: "POST" },
				{
					name: "configured-write",
					origin: "https://api.example.com",
					authority: "public-https",
					allowedMethods: ["POST"],
					replayClass: "unsafe",
				},
				options,
			),
		).toThrow("origin is not allowed");
		expect(() =>
			fetchMatrixLoopbackRead("http://example.com/health", {}, options),
		).toThrow("must remain loopback");
		expect(calls).toBe(0);
	});

	it("enforces exact methods and scoped credentials before loopback writes", () => {
		let calls = 0;
		const options = {
			fetcher: async () => {
				calls++;
				return new Response("unexpected");
			},
			environment: {},
		};
		expect(() =>
			fetchMatrixLoopbackWrite(
				"http://127.0.0.1:3000/audit",
				{ method: "PUT" },
				options,
			),
		).toThrow("method PUT");
		expect(() =>
			fetchMatrixLoopbackWrite(
				"http://127.0.0.1:3000/audit",
				{ method: "POST", headers: { Authorization: "secret" } },
				options,
			),
		).toThrow("credentials");
		expect(calls).toBe(0);
	});

	it("passes only an explicitly scoped unsafe write to injected transport", async () => {
		let calls = 0;
		const response = await fetchMatrixLoopbackWrite(
			"http://127.0.0.1:3000/audit",
			{
				method: "POST",
				headers: { Authorization: "Bearer test", "Content-Type": "application/json" },
				body: "{}",
			},
			{
				credentialHeaders: ["authorization"],
				fetcher: async (_input, init) => {
					calls++;
					expect(init?.method).toBe("POST");
					expect(new Headers(init?.headers).get("authorization")).toBe("Bearer test");
					return new Response("ok");
				},
				environment: {},
			},
		);
		expect(await response.text()).toBe("ok");
		expect(calls).toBe(1);
	});

	it("never forwards a scoped service credential across origins", async () => {
		let calls = 0;
		const grant = {
			name: "matrix-registry-read",
			origin: "https://registry.example",
			authority: "public-https" as const,
			allowedMethods: ["GET"],
			credentialHeaders: ["authorization"],
			replayClass: "safe" as const,
		};
		const options = {
			fetcher: async () => {
				calls++;
				return new Response("ok");
			},
			resolver: PUBLIC_DNS,
			environment: {},
		};

		expect(() =>
			fetchMatrixGrantedResource(
				"https://cdn.example/package.tgz",
				{ headers: { Authorization: "Bearer secret" } },
				grant,
				options,
			),
		).toThrow("origin is not allowed");
		expect(calls).toBe(0);

		const response = await fetchMatrixGrantedResource(
			"https://registry.example/package.tgz",
			{ headers: { Authorization: "Bearer secret" } },
			grant,
			options,
		);
		expect(await response.text()).toBe("ok");
		expect(calls).toBe(1);
	});
});
