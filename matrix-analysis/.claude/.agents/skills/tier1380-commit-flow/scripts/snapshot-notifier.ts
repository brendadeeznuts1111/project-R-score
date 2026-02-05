#!/usr/bin/env bun
/**
 * Tier-1380 OMEGA Snapshot Notifier
 * SSE live notifications for snapshot events
 */

interface SnapshotEvent {
	type: "created" | "extracted" | "verified" | "deleted";
	tenant: string;
	filename: string;
	sha256: string;
	size: number;
	timestamp: string;
	meta?: Record<string, unknown>;
}

class SnapshotNotifier {
	private clients: Set<ReadableStreamDefaultController> = new Set();
	private port: number;

	constructor(port = 3336) {
		this.port = port;
	}

	start(): void {
		Bun.serve({
			port: this.port,
			fetch: (req) => this.handleRequest(req),
		});

		console.log(`📡 Snapshot notifier running on http://localhost:${this.port}`);
		console.log(`   SSE endpoint: http://localhost:${this.port}/events`);
	}

	private handleRequest(req: Request): Response {
		const url = new URL(req.url);

		if (url.pathname === "/events") {
			return this.handleSSE(req);
		}

		if (url.pathname === "/health") {
			return Response.json({ status: "ok", clients: this.clients.size });
		}

		return new Response("Not Found", { status: 404 });
	}

	private handleSSE(req: Request): Response {
		const stream = new ReadableStream({
			start: (controller) => {
				this.clients.add(controller);

				// Send initial connected message
				controller.enqueue(
					`data: ${JSON.stringify({ type: "connected", timestamp: new Date().toISOString() })}\n\n`,
				);

				// Cleanup on close
				req.signal.addEventListener("abort", () => {
					this.clients.delete(controller);
				});
			},
		});

		return new Response(stream, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		});
	}

	broadcast(event: SnapshotEvent): void {
		const message = `data: ${JSON.stringify(event)}\n\n`;

		for (const client of this.clients) {
			try {
				client.enqueue(message);
			} catch {
				// Client disconnected
				this.clients.delete(client);
			}
		}

		// Also log to console (Col-89 safe)
		const logLine = `Snapshot ${event.type}: ${event.tenant}/${event.filename.slice(0, 30)}`;
		console.log(logLine.length > 89 ? `${logLine.slice(0, 86)}…` : logLine);
	}

	notifyCreated(tenant: string, filename: string, sha256: string, size: number): void {
		this.broadcast({
			type: "created",
			tenant,
			filename,
			sha256,
			size,
			timestamp: new Date().toISOString(),
		});
	}

	notifyExtracted(tenant: string, filename: string, fileCount: number): void {
		this.broadcast({
			type: "extracted",
			tenant,
			filename,
			sha256: "",
			size: fileCount,
			timestamp: new Date().toISOString(),
			meta: { fileCount },
		});
	}

	notifyVerified(tenant: string, filename: string, valid: boolean): void {
		this.broadcast({
			type: "verified",
			tenant,
			filename,
			sha256: "",
			size: 0,
			timestamp: new Date().toISOString(),
			meta: { valid },
		});
	}
}

// CLI mode: start the server
if (import.meta.main) {
	const args = Bun.argv.slice(2);
	const port = parseInt(
		args.find((a) => a.startsWith("--port="))?.split("=")[1] || "3336",
		10,
	);

	console.log("╔════════════════════════════════════════════════════════╗");
	console.log("║     Tier-1380 OMEGA Snapshot Notifier                  ║");
	console.log("╚════════════════════════════════════════════════════════╝");
	console.log();

	const notifier = new SnapshotNotifier(port);
	notifier.start();

	// Keep alive
	setInterval(() => {}, 1000);
}

export { SnapshotNotifier, type SnapshotEvent };
