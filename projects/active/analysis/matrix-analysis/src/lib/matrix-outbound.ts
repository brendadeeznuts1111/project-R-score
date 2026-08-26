import type {
	OutboundFetch,
	OutboundNetworkMode,
	OutboundReplayClass,
} from "../../../../../../lib/http/outbound-policy.ts";
import {
	fetchWithPolicy,
	isNormalizedLoopbackHostname,
	type OutboundEndpointPolicy,
} from "../../../../../../lib/http/outbound-policy.ts";
import {
	fetchPublicResource,
	type PublicResourceOptions,
} from "../../../../../../lib/http/public-resource-client.ts";

const DEFAULT_RESPONSE_BYTE_LIMIT = 2_000_000;
const DEFAULT_TIMEOUT_MS = 10_000;

export interface MatrixPublicResourceOptions
	extends Omit<PublicResourceOptions, "networkMode"> {
	/** Explicit mode wins over MATRIX_NETWORK_MODE and MATRIX_OFFLINE. */
	readonly networkMode?: OutboundNetworkMode;
	readonly environment?: Readonly<Record<string, string | undefined>>;
	readonly fetcher?: OutboundFetch;
}

export interface MatrixGrantedEndpoint {
	readonly name: string;
	readonly origin: string;
	readonly authority: "public-https" | "loopback";
	readonly allowedMethods: readonly string[];
	readonly credentialHeaders?: readonly string[];
	readonly replayClass: OutboundReplayClass;
	readonly responseByteLimit?: number;
	readonly timeoutMs?: number;
}

export interface MatrixGrantedResourceOptions extends MatrixPublicResourceOptions {}

function parseGrantedUrl(input: string | URL, grant: MatrixGrantedEndpoint): URL {
	let url: URL;
	let origin: URL;
	try {
		url = new URL(input.toString());
		origin = new URL(grant.origin);
	} catch {
		throw new TypeError(`Matrix endpoint ${grant.name} requires valid URLs`);
	}
	if (
		origin.origin !== grant.origin ||
		origin.pathname !== "/" ||
		origin.search ||
		origin.hash
	) {
		throw new TypeError(`Matrix endpoint ${grant.name} requires a canonical origin`);
	}
	if (url.origin !== grant.origin) {
		throw new Error(`Matrix endpoint origin is not allowed by ${grant.name}`);
	}
	if (grant.authority === "public-https" && url.protocol !== "https:") {
		throw new Error(`Matrix public endpoint ${grant.name} must use HTTPS`);
	}
	if (
		grant.authority === "loopback" &&
		((url.protocol !== "http:" && url.protocol !== "https:") ||
			!isNormalizedLoopbackHostname(url.hostname))
	) {
		throw new Error(`Matrix loopback endpoint ${grant.name} must remain loopback`);
	}
	return url;
}

function parseNetworkMode(
	environment: Readonly<Record<string, string | undefined>>,
): OutboundNetworkMode {
	const declared = environment.MATRIX_NETWORK_MODE?.trim();
	if (declared !== undefined && declared !== "") {
		if (
			declared === "online" ||
			declared === "cached-only" ||
			declared === "offline-no-socket"
		) {
			return declared;
		}
		throw new TypeError(`Unsupported MATRIX_NETWORK_MODE: ${declared}`);
	}

	const offline = environment.MATRIX_OFFLINE?.trim();
	if (offline === undefined || offline === "" || offline === "0") return "online";
	if (offline === "1") return "offline-no-socket";
	throw new TypeError("MATRIX_OFFLINE must be 0 or 1");
}

/**
 * Matrix Analysis public, tokenless read boundary.
 *
 * The root client owns HTTPS-only public authority, redirect denial, ambient
 * credential denial, direct-route enforcement, deadlines, and bounded bodies.
 * Callers can inject transport and DNS seams for deterministic proof.
 */
export function fetchMatrixPublicResource(
	input: string | URL,
	init: BunFetchRequestInit = {},
	options: MatrixPublicResourceOptions = {},
): Promise<Response> {
	const environment = options.environment ?? Bun.env;
	return fetchPublicResource(input, init, {
		...options,
		environment,
		networkMode: options.networkMode ?? parseNetworkMode(environment),
		responseByteLimit: options.responseByteLimit ?? DEFAULT_RESPONSE_BYTE_LIMIT,
		timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
	});
}

/** Exact-origin service boundary for credentialed or mutating operations. */
export function fetchMatrixGrantedResource(
	input: string | URL,
	init: BunFetchRequestInit,
	grant: MatrixGrantedEndpoint,
	options: MatrixGrantedResourceOptions = {},
): Promise<Response> {
	const url = parseGrantedUrl(input, grant);
	const environment = options.environment ?? Bun.env;
	const timeoutMs = grant.timeoutMs ?? options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const policy: OutboundEndpointPolicy = {
		name: grant.name,
		allowedOrigins: [grant.origin],
		allowedMethods: grant.allowedMethods,
		credentialMode: grant.credentialHeaders?.length ? "scoped" : "forbid",
		credentialHeaders: grant.credentialHeaders,
		redirect: "error",
		timeoutMs,
		totalDeadlineMs: timeoutMs,
		responseByteLimit:
			grant.responseByteLimit ??
			options.responseByteLimit ??
			DEFAULT_RESPONSE_BYTE_LIMIT,
		route: { mode: "direct" },
		networkMode: options.networkMode ?? parseNetworkMode(environment),
		protocol: { allowed: ["auto"], default: "auto" },
		ipAuthority: {
			mode: grant.authority === "public-https" ? "public-only" : "allow-non-public",
			enforcement: "resolve-before-connect",
		},
		replayClass: grant.replayClass,
	};
	return fetchWithPolicy(url, init, policy, options.fetcher, {
		resolver: options.resolver,
		environment,
	});
}

export function fetchMatrixLoopbackRead(
	input: string | URL,
	init: BunFetchRequestInit = {},
	options: MatrixGrantedResourceOptions = {},
): Promise<Response> {
	const url = new URL(input.toString());
	return fetchMatrixGrantedResource(
		url,
		init,
		{
			name: "matrix-loopback-read",
			origin: url.origin,
			authority: "loopback",
			allowedMethods: ["GET", "HEAD"],
			replayClass: "safe",
			responseByteLimit: 2_000_000,
			timeoutMs: 5_000,
		},
		options,
	);
}

export function fetchMatrixLoopbackWrite(
	input: string | URL,
	init: BunFetchRequestInit,
	options: MatrixGrantedResourceOptions & {
		readonly credentialHeaders?: readonly string[];
	} = {},
): Promise<Response> {
	const url = new URL(input.toString());
	return fetchMatrixGrantedResource(
		url,
		init,
		{
			name: "matrix-loopback-write",
			origin: url.origin,
			authority: "loopback",
			allowedMethods: ["POST"],
			credentialHeaders: options.credentialHeaders,
			replayClass: "unsafe",
			responseByteLimit: 2_000_000,
			timeoutMs: 5_000,
		},
		options,
	);
}
