/**
 * Tier-1380 OMEGA: Matrix Service Worker
 * Caching strategy for 90-column matrix dashboard
 *
 * @version 1.0.0
 */

const CACHE_NAME = "matrix-cache-v1";
const STATIC_CACHE = "matrix-static-v1";

// Precache critical resources on install
const PRECACHE_URLS = [
	"/",
	"/grid",
	"/static/matrix-styles.css",
	"/static/zone-colors.css",
	"/static/matrix-grid.js",
	"/static/favicon.ico",
];

// Install: Precache critical resources
self.addEventListener("install", (event) => {
	event.waitUntil(
		caches
			.open(STATIC_CACHE)
			.then((cache) => cache.addAll(PRECACHE_URLS))
			.then(() => self.skipWaiting()),
	);
});

// Activate: Clean up old caches
self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((cacheNames) => {
				return Promise.all(
					cacheNames
						.filter((name) => name.startsWith("matrix-") && name !== STATIC_CACHE)
						.map((name) => caches.delete(name)),
				);
			})
			.then(() => self.clients.claim()),
	);
});

// Fetch: Cache strategies
self.addEventListener("fetch", (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// Skip non-GET requests
	if (request.method !== "GET") return;

	// Skip profiles (no cache)
	if (url.pathname.includes("/profiles/")) return;

	// Strategy: Stale-while-revalidate for grid API
	if (url.pathname === "/api/matrix/grid") {
		event.respondWith(staleWhileRevalidate(request, 60)); // 60s max age
		return;
	}

	// Strategy: Cache-first for zone data
	if (url.pathname.startsWith("/api/matrix/zone/")) {
		event.respondWith(cacheFirst(request, 300)); // 5 min max age
		return;
	}

	// Strategy: Cache-first for team data
	if (url.pathname.startsWith("/api/team/")) {
		event.respondWith(cacheFirst(request, 3600)); // 1 hour max age
		return;
	}

	// Strategy: Network-first for RSS feeds
	if (url.pathname.includes("/rss")) {
		event.respondWith(networkFirst(request, 60)); // 1 min max age
		return;
	}

	// Strategy: Cache-first for static assets
	if (url.pathname.startsWith("/static/")) {
		event.respondWith(cacheFirst(request, 86400)); // 1 day max age
		return;
	}

	// Default: Network with cache fallback
	event.respondWith(networkWithCacheFallback(request));
});

// ═════════════════════════════════════════════════════════════════════════════
// CACHE STRATEGIES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Stale-while-revalidate: Serve from cache, refresh in background
 */
async function staleWhileRevalidate(request, maxAgeSeconds) {
	const cache = await caches.open(CACHE_NAME);
	const cached = await cache.match(request);

	// Check if cache is fresh
	if (cached) {
		const dateHeader = cached.headers.get("sw-date");
		if (dateHeader) {
			const age = (Date.now() - new Date(dateHeader).getTime()) / 1000;
			if (age < maxAgeSeconds) {
				// Refresh in background
				fetchAndCache(request, cache);
				return cached;
			}
		}
	}

	// Fetch fresh
	try {
		const response = await fetchAndCache(request, cache);
		return response;
	} catch (error) {
		return cached || new Response("Network error", { status: 503 });
	}
}

/**
 * Cache-first: Serve from cache if available
 */
async function cacheFirst(request, maxAgeSeconds) {
	const cache = await caches.open(CACHE_NAME);
	const cached = await cache.match(request);

	if (cached) {
		const dateHeader = cached.headers.get("sw-date");
		if (dateHeader) {
			const age = (Date.now() - new Date(dateHeader).getTime()) / 1000;
			if (age < maxAgeSeconds) {
				return cached;
			}
		}
	}

	try {
		return await fetchAndCache(request, cache);
	} catch (error) {
		return cached || new Response("Network error", { status: 503 });
	}
}

/**
 * Network-first: Try network, fallback to cache
 */
async function networkFirst(request, maxAgeSeconds) {
	const cache = await caches.open(CACHE_NAME);

	try {
		const networkResponse = await fetchAndCache(request, cache);
		return networkResponse;
	} catch (error) {
		const cached = await cache.match(request);
		if (cached) return cached;
		throw error;
	}
}

/**
 * Network with cache fallback
 */
async function networkWithCacheFallback(request) {
	const cache = await caches.open(CACHE_NAME);

	try {
		return await fetch(request);
	} catch (error) {
		const cached = await cache.match(request);
		if (cached) return cached;
		throw error;
	}
}

/**
 * Fetch and cache response
 */
async function fetchAndCache(request, cache) {
	const response = await fetch(request);

	if (response.status === 200) {
		// Clone response to add timestamp
		const cloned = response.clone();
		const headers = new Headers(cloned.headers);
		headers.set("sw-date", new Date().toUTCString());

		const modifiedResponse = new Response(cloned.body, {
			status: cloned.status,
			statusText: cloned.statusText,
			headers,
		});

		cache.put(request, modifiedResponse);
	}

	return response;
}

// ═════════════════════════════════════════════════════════════════════════════
// BACKGROUND SYNC (for offline form submissions)
// ═════════════════════════════════════════════════════════════════════════════

self.addEventListener("sync", (event) => {
	if (event.tag === "matrix-update") {
		event.waitUntil(syncMatrixUpdates());
	}
});

async function syncMatrixUpdates() {
	// Retry failed updates when back online
	const db = await openDB("matrix-offline", 1);
	const updates = await db.getAll("pending");

	for (const update of updates) {
		try {
			await fetch(update.url, {
				method: update.method,
				body: JSON.stringify(update.data),
				headers: { "Content-Type": "application/json" },
			});
			await db.delete("pending", update.id);
		} catch (error) {
			console.error("Failed to sync:", update.id);
		}
	}
}

// ═════════════════════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS (for anomaly alerts)
// ═════════════════════════════════════════════════════════════════════════════

self.addEventListener("push", (event) => {
	const data = event.data.json();

	if (data.type === "anomaly-alert") {
		event.waitUntil(
			self.registration.showNotification("Matrix Anomaly Detected", {
				body: `Score: ${data.score} in ${data.zone}`,
				icon: "/static/icon-alert.png",
				badge: "/static/badge-alert.png",
				data: { url: data.url },
				actions: [
					{ action: "view", title: "View Details" },
					{ action: "dismiss", title: "Dismiss" },
				],
			}),
		);
	}
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();

	if (event.action === "view") {
		event.waitUntil(clients.openWindow(event.notification.data.url));
	}
});
