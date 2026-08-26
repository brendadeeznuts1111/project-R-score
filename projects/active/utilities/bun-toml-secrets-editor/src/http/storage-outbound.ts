import {
	fetchWithPolicy,
	type OutboundExecutionOptions,
	type OutboundFetch,
	type OutboundNetworkMode,
	type OutboundEndpointPolicy,
} from "../../../../../../lib/http/outbound-policy.ts";

export type StorageMethod = "GET" | "HEAD" | "PUT";

export interface StorageOutboundOptions extends OutboundExecutionOptions {
	readonly fetcher?: OutboundFetch;
	readonly networkMode?: OutboundNetworkMode;
}

export interface StorageRequest {
	readonly method: StorageMethod;
	readonly headers?: HeadersInit;
	readonly body?: BodyInit | null;
	readonly signal?: AbortSignal;
}

function configuredOrigin(input: string | URL): string {
	let url: URL;
	try {
		url = new URL(input.toString());
	} catch {
		throw new TypeError("Storage endpoint must be a valid URL");
	}
	if (url.protocol !== "https:")
		throw new TypeError("Storage endpoint must use HTTPS");
	if (url.username || url.password)
		throw new TypeError("Storage endpoint must not contain credentials");
	if (url.pathname !== "/" || url.search || url.hash)
		throw new TypeError("Storage endpoint must be an exact origin");
	return url.origin;
}

function assertStorageRequest(request: StorageRequest): void {
	if (!["GET", "HEAD", "PUT"].includes(request.method))
		throw new TypeError("Storage method must be GET, HEAD, or PUT");
	if (request.method !== "PUT" && request.body != null)
		throw new TypeError(`Storage ${request.method} request must not include a body`);
}

function policyFor(
	origin: string,
	method: StorageMethod,
	networkMode: OutboundNetworkMode,
): OutboundEndpointPolicy {
	const write = method === "PUT";
	return {
		name: write ? "toml-storage-write" : "toml-storage-read",
		allowedOrigins: [origin],
		allowedMethods: [method],
		credentialMode: "scoped",
		credentialHeaders: ["authorization"],
		redirect: "error",
		timeoutMs: write ? 30_000 : 10_000,
		totalDeadlineMs: write ? 30_000 : 10_000,
		responseByteLimit: write ? 64_000 : 16_000_000,
		route: { mode: "direct" },
		networkMode,
		protocol: { allowed: ["auto"], default: "auto" },
		ipAuthority: {
			mode: "public-only",
			enforcement: "resolve-before-connect",
		},
		replayClass: write ? "unsafe" : "safe",
	};
}

export function createStorageOutboundClient(
	endpoint: string | URL,
	options: StorageOutboundOptions = {},
) {
	const origin = configuredOrigin(endpoint);
	return {
		request(input: string | URL, request: StorageRequest): Promise<Response> {
			assertStorageRequest(request);
			return fetchWithPolicy(
				input,
				{
					method: request.method,
					headers: request.headers,
					body: request.body,
					signal: request.signal,
				},
				policyFor(origin, request.method, options.networkMode ?? "online"),
				options.fetcher,
				options,
			);
		},
	};
}
