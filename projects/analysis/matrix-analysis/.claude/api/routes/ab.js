#!/usr/bin/env bun
// routes/ab.js — A/B Variant API routes (cookies, variant, snapshot, tenant, persist, status)
// Extracted from api-server.js to reduce god-object complexity.
//
// Dependencies injected via createABRouter({ ... })
// Each handler returns Response or null (not-my-route).

/**
 * @param {{
 *   getABVariant: Function,
 *   getABPoolSize: Function,
 *   snapshotCookies: Function,
 *   restoreSnapshot: Function,
 *   compressState: Function,
 *   decompressState: Function,
 *   createSnapshotFromCookies: Function,
 *   resolveTenantFromRequest: Function,
 *   tenantPrefix: Function,
 *   parseTenantCookieMap: Function,
 *   getPoolSize: Function,
 *   recordABEvent: Function,
 *   broadcastABEvent: Function,
 *   persistSnapshot: Function,
 *   loadSnapshotAsync: Function,
 *   abEventSubs: Set,
 *   abMetricSubs: Set,
 *   abMetrics: object,
 *   AB_PROTOCOLS: string[],
 *   getServerPort: () => number,
 * }} deps
 */
export function createABRouter(deps) {
	const {
		getABVariant,
		getABPoolSize,
		snapshotCookies,
		restoreSnapshot,
		compressState,
		decompressState,
		createSnapshotFromCookies,
		resolveTenantFromRequest,
		tenantPrefix,
		parseTenantCookieMap,
		getPoolSize,
		recordABEvent,
		broadcastABEvent,
		persistSnapshot,
		loadSnapshotAsync,
		abEventSubs,
		abMetricSubs,
		abMetrics,
		AB_PROTOCOLS,
		getServerPort,
	} = deps;

	/**
	 * @param {Request} req
	 * @param {URL} url
	 * @param {Map<string, string>} cookies
	 * @param {Record<string, string>} corsHeaders
	 * @returns {Promise<Response> | Response | null}
	 */
	return async function handleAB(req, url, cookies, corsHeaders) {
		switch (url.pathname) {
			case "/api/cookies": {
				return Response.json(Object.fromEntries(cookies), {
					headers: corsHeaders,
				});
			}

			case "/api/ab/variant": {
				const { variant, source } = getABVariant(cookies);
				const poolSize = getABPoolSize(variant, cookies);

				// Broadcast to WS event subscribers + record metrics
				const sessionId = cookies.get("sessionId") || crypto.randomUUID();
				recordABEvent(variant, poolSize, source, null);
				broadcastABEvent({
					type: "variant",
					variant,
					poolSize,
					source,
					sessionId: sessionId.slice(0, 8),
					ts: Date.now(),
				});

				// Offload persistence to worker (fire-and-forget)
				persistSnapshot(sessionId, {
					variant,
					poolSize,
					cookies: [...cookies],
					timestamp: Date.now(),
					sessionId,
				});

				return Response.json({ variant, poolSize, source }, { headers: corsHeaders });
			}

			case "/api/ab/snapshot": {
				const { variant, source } = getABVariant(cookies);
				const compressed = snapshotCookies(cookies, variant, source);
				const rawSize = JSON.stringify({
					variant,
					source,
					cookies: [...cookies],
					ts: Date.now(),
				}).length;

				// Also create a typed snapshot via the module
				const cookieHeader = req.headers.get("cookie") || "";
				const format = url.searchParams.get("format") || "zstd";
				let moduleSnapshot = null;
				if (["zstd", "deflate", "gzip"].includes(format)) {
					const state = createSnapshotFromCookies(cookieHeader);
					const result = compressState(state, { format });
					moduleSnapshot = {
						format: result.format,
						compressedBytes: result.data.byteLength,
					};
				}

				recordABEvent(variant, 0, source, null);

				return Response.json(
					{
						rawBytes: rawSize,
						zstdBytes: compressed.byteLength,
						shrink: ((1 - compressed.byteLength / rawSize) * 100).toFixed(1) + "%",
						snapshot: Buffer.from(compressed).toString("base64"),
						...(moduleSnapshot && { moduleSnapshot }),
					},
					{ headers: corsHeaders },
				);
			}

			case "/api/ab/restore": {
				if (req.method !== "POST") {
					return Response.json(
						{ error: "Method not allowed" },
						{ status: 405, headers: corsHeaders },
					);
				}
				const body = await req.json();
				if (!body.snapshot) {
					return Response.json(
						{ error: "snapshot (base64) is required" },
						{ status: 400, headers: corsHeaders },
					);
				}

				// Support format field for multi-format restore
				if (body.format && ["deflate", "gzip"].includes(body.format)) {
					const binary = atob(body.snapshot);
					const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
					const restored = decompressState(bytes, body.format);
					return Response.json(restored, { headers: corsHeaders });
				}

				const restored = restoreSnapshot(Buffer.from(body.snapshot, "base64"));
				return Response.json(restored, { headers: corsHeaders });
			}

			// ── Multi-tenant variant resolution ────────────────────────
			case "/api/ab/tenant": {
				const tenantId =
					resolveTenantFromRequest(req) || url.searchParams.get("tenant") || "default";
				const cookieHeader = req.headers.get("cookie") || "";
				const prefix = tenantPrefix(tenantId);
				const tenantCookies = parseTenantCookieMap(cookieHeader, prefix);

				let tenantVariant = "control";
				if (tenantCookies.size > 0) {
					tenantVariant = [...tenantCookies.values()][0];
				}
				const tenantPoolSize = getPoolSize(tenantVariant, tenantCookies);

				recordABEvent(tenantVariant, tenantPoolSize, "tenant", tenantId);
				broadcastABEvent({
					type: "tenant-variant",
					tenantId,
					variant: tenantVariant,
					poolSize: tenantPoolSize,
					ts: Date.now(),
				});

				return Response.json(
					{
						tenantId,
						prefix,
						variant: tenantVariant,
						poolSize: tenantPoolSize,
						cookies: Object.fromEntries(tenantCookies),
					},
					{ headers: corsHeaders },
				);
			}

			// ── Persist snapshot (worker-backed) ───────────────────────
			case "/api/ab/persist": {
				if (req.method === "POST") {
					const body = await req.json().catch(() => null);
					const sid = body?.sessionId || crypto.randomUUID();
					const { variant, source } = getABVariant(cookies);
					const poolSize = getABPoolSize(variant, cookies);

					const state = {
						variant,
						poolSize,
						cookies: [...cookies],
						timestamp: Date.now(),
						sessionId: sid,
					};
					persistSnapshot(sid, state);

					return Response.json(
						{ sessionId: sid, variant, poolSize, status: "persisting" },
						{ status: 202, headers: corsHeaders },
					);
				}
				return Response.json(
					{ error: "Method not allowed" },
					{ status: 405, headers: corsHeaders },
				);
			}

			// ── WebSocket status info (non-upgrade, for polling) ───────
			case "/api/ab/status": {
				return Response.json(
					{
						subscribers: {
							events: abEventSubs.size,
							metrics: abMetricSubs.size,
						},
						metrics: {
							impressions: abMetrics.impressions,
							variants: { ...abMetrics.variants },
							pools: { ...abMetrics.pools },
							tenants: { ...abMetrics.tenants },
							windowMs: Date.now() - abMetrics.lastReset,
						},
						protocols: AB_PROTOCOLS,
						wsUrl: `ws://localhost:${getServerPort()}/api/ab/status`,
					},
					{ headers: corsHeaders },
				);
			}

			default: {
				// ── Parameterized: GET /api/ab/persist/:sessionId ───
				if (url.pathname.startsWith("/api/ab/persist/") && req.method === "GET") {
					const sid = decodeURIComponent(url.pathname.slice("/api/ab/persist/".length));
					if (!sid) {
						return Response.json(
							{ error: "sessionId is required" },
							{ status: 400, headers: corsHeaders },
						);
					}
					try {
						const snapshot = await loadSnapshotAsync(sid);
						if (!snapshot) {
							return Response.json(
								{ error: "Snapshot not found", sessionId: sid },
								{ status: 404, headers: corsHeaders },
							);
						}
						return Response.json({ sessionId: sid, snapshot }, { headers: corsHeaders });
					} catch (err) {
						return Response.json(
							{ error: err.message },
							{ status: 500, headers: corsHeaders },
						);
					}
				}

				return null;
			}
		}
	};
}
