import { describe, expect, test } from "bun:test";
import type { OutboundFetch } from "../../../../../lib/http/outbound-policy.ts";
import { createStorageOutboundClient } from "../src/http/storage-outbound.ts";

const publicResolver = async () => [
	{
		address: "93.184.216.34",
		family: 4 as const,
		ttl: 60,
		source: "node-resolver" as const,
	},
];

describe("storage outbound authority", () => {
	test("owns exact origin, method, credentials, and response bounds", async () => {
		const calls: Array<{ url: string; init?: BunFetchRequestInit }> = [];
		const fetcher: OutboundFetch = async (input, init) => {
			calls.push({ url: input.toString(), init });
			return new Response("ok");
		};
		const client = createStorageOutboundClient("https://bucket.example", {
			fetcher,
			resolver: publicResolver,
			environment: {},
		});
		await client.request("https://bucket.example/releases/app", {
			method: "PUT",
			headers: { Authorization: "AWS4 test" },
			body: "artifact",
		});
		expect(calls).toHaveLength(1);
		expect(calls[0]?.init?.redirect).toBe("error");
		expect(calls[0]?.init?.credentials).toBe("omit");
	});

		test("rejects origin and ambient credentials while dropping undeclared extensions", async () => {
		const calls: BunFetchRequestInit[] = [];
		const client = createStorageOutboundClient("https://bucket.example", {
			fetcher: (async (_input, init) => {
				calls.push(init ?? {});
				return new Response("ok");
			}) as OutboundFetch,
			resolver: publicResolver,
			environment: {},
		});
		expect(() =>
			client.request("https://attacker.example/object", { method: "GET" }),
		).toThrow("origin is not allowed");
		expect(() =>
			client.request("https://bucket.example/object", {
				method: "GET",
				headers: { Cookie: "secret" },
			}),
		).toThrow("credentials are forbidden");
		const escaped = {
				method: "GET",
				proxy: "https://proxy.example",
				protocol: "http2",
			} as unknown as Parameters<typeof client.request>[1];
		await client.request("https://bucket.example/object", escaped);
		expect((calls[0] as Record<string, unknown>).proxy).toBeUndefined();
		expect((calls[0] as Record<string, unknown>).tls).toBeUndefined();
			expect((calls[0] as Record<string, unknown>).protocol).toBeUndefined();
		expect(() =>
			client.request("https://bucket.example/object", {
				method: "POST",
			} as never),
		).toThrow("method must be GET, HEAD, or PUT");
		expect(() =>
			client.request("https://bucket.example/object", {
				method: "GET",
				body: "not allowed",
			}),
		).toThrow("must not include a body");
	});

	test("fails before fetch when offline or DNS resolves non-public", async () => {
		let calls = 0;
		const fetcher = (async () => {
			calls += 1;
			return new Response("unexpected");
		}) as OutboundFetch;
		const offline = createStorageOutboundClient("https://bucket.example", {
			fetcher,
			resolver: publicResolver,
			environment: {},
			networkMode: "offline-no-socket",
		});
		expect(() =>
			offline.request("https://bucket.example/object", { method: "GET" }),
		).toThrow("forbids network fetch");
		const privateDns = createStorageOutboundClient("https://bucket.example", {
			fetcher,
			resolver: async () => [
				{ address: "127.0.0.1", family: 4, ttl: 0, source: "node-resolver" },
			],
			environment: {},
		});
		await expect(
			privateDns.request("https://bucket.example/object", { method: "HEAD" }),
		).rejects.toThrow();
			expect(calls).toBe(0);
		});

		test("rejects active proxies and oversized declared responses", async () => {
			const fetcher = (async () =>
				new Response("too large", {
					headers: { "content-length": "16000001" },
				})) as OutboundFetch;
			const proxied = createStorageOutboundClient("https://bucket.example", {
				fetcher,
				resolver: publicResolver,
				environment: { HTTPS_PROXY: "https://proxy.example" },
			});
			expect(() =>
				proxied.request("https://bucket.example/object", { method: "GET" }),
			).toThrow("blocked by active proxy");
			const bounded = createStorageOutboundClient("https://bucket.example", {
				fetcher,
				resolver: publicResolver,
				environment: {},
			});
			await expect(
				bounded.request("https://bucket.example/object", { method: "GET" }),
			).rejects.toThrow("exceeds 16000000 bytes");
		});
});
