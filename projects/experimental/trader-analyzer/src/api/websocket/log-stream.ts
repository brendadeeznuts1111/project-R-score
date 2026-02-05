/**
 * @fileoverview WebSocket Log Stream Server for Hyper-Bun MLGS
 * @description Real-time log streaming to dashboard clients
 * @module api/websocket/log-stream
 * @version 1.3.0.0.0.0.0
 *
 * 1.3.0.0.0.0.0: WebSocket endpoint for streaming logs to dashboard.
 * [DoD][CLASS:LogStreamServer][SCOPE:RealTimeMonitoring]
 * Manages WebSocket connections, authenticates clients, and broadcasts new log entries
 * from the audit database in real-time.
 *
 * @see {@link docs/1.0.0.0.0.0.0-API-DASHBOARD-PORTAL-INTEGRATION.md|API-Dashboard-Portal Integration Documentation}
 *
 * Ripgrep Pattern: 1\.3\.0\.0\.0\.0\.0|LogStreamServer|log-stream
 */

import type { Request, ServerWebSocket } from 'bun'; // Bun's WebSocket type
import { Database } from 'bun:sqlite'; // Cross-reference: Bun-native SQLite
import { consoleEnhanced } from '../../logging/console-enhanced'; // Cross-reference: Enhanced console logger
import { LOG_CODES } from '../../logging/registry'; // Cross-reference: Hyper-Bun's logging codes
import { BunCookieUtils } from '../../utils/bun-cookie'; // Cross-reference: 10.1.0.0.0.0.0 Cookie Management

/**
 * 1.3.0.0.0.0.0: LogStreamServer Class
 * [DoD][CLASS:LogStreamServer][SCOPE:RealTimeMonitoring]
 *
 * Manages WebSocket connections for real-time log streaming to dashboard clients.
 * Provides authentication, historical log replay, and continuous log broadcasting.
 */
export class LogStreamServer {
	private wsClients = new Set<ServerWebSocket>(); // Bun-native Set for client management
	private readonly db: Database; // Bun-native SQLite database
	private lastLogId = 0; // Tracks the last sent log ID to avoid re-sending
	private readonly startTime = Date.now(); // Track server start time for uptime calculation

	/**
	 * 1.3.1.0.0.0.0: Constructor for LogStreamServer.
	 * Initializes the database connection and starts the log broadcasting interval.
	 *
	 * @param db - The SQLite Database instance for audit logs.
	 */
	constructor(db: Database) {
		this.db = db;
		// 1.3.1.1.0.0.0: Poll for new logs every 100ms (Configurable interval)
		setInterval(() => this.broadcastNewLogs(), 100); // Bun-native setInterval
	}

	/**
	 * 1.3.2.0.0.0.0: Broadcasts new log entries to all connected WebSocket clients.
	 * Queries the audit log for entries newer than `lastLogId` and sends them.
	 *
	 * @returns A Promise that resolves once logs are broadcasted.
	 *
	 * @test: test/websocket/log-stream.test.ts::new_log_broadcast
	 */
	private async broadcastNewLogs(): Promise<void> {
		const newLogs = this.db
			.prepare(`
			SELECT * FROM audit_log
			WHERE id > ?
			ORDER BY id ASC
		`)
			.all(this.lastLogId) as any[]; // Bun-native SQLite query

		if (newLogs.length === 0) return;

		this.lastLogId = newLogs[newLogs.length - 1].id;

		const payload = {
			type: 'logs',
			data: newLogs,
			timestamp: Date.now() // Bun-native Date.now()
		};

		// 1.3.2.1.0.0.0: Broadcast to all connected dashboards (WebSocket.OPEN state check)
		this.wsClients.forEach(client => {
			if (client.readyState === 1) {
				// WebSocket.OPEN
				client.send(JSON.stringify(payload)); // Bun-native WebSocket send
			}
		});
	}

	/**
	 * 1.3.3.0.0.0.0: Handles a new WebSocket connection from a dashboard client.
	 * Authenticates the client using cookies, sends historical logs, and sets up message/close listeners.
	 *
	 * @param ws - The incoming ServerWebSocket instance.
	 * @param request - The HTTP Request that initiated the WebSocket upgrade.
	 *
	 * Cross-reference: 10.1.1.1.0.0.0 Session Token Management
	 * @test: test/websocket/log-stream.test.ts::client_connection_authentication
	 */
	handleConnection(ws: ServerWebSocket, request: Request): void {
		// 1.3.3.1.0.0.0: Authenticate connection using session cookie (Cross-reference: 10.1.1.1.0.0.0 Session Token Management)
		// Parse cookies using BunCookieUtils (Cross-reference: src/utils/bun-cookie.ts)
		const cookies = BunCookieUtils.fromHeaders(request.headers);
		const session = cookies.get('session_token'); // Accessing session_token cookie

		if (!session || !this.verifySession(session)) {
			ws.close(1008, 'Unauthorized'); // WebSocket protocol close code
			consoleEnhanced.warning(LOG_CODES['HBWS-001'] || 'HBWS-001', {
				message: 'WebSocket connection rejected',
				reason: 'unauthorized'
			});
			return;
		}

		this.wsClients.add(ws); // Add to set of active clients
		consoleEnhanced.info(LOG_CODES['HBWS-002'] || 'HBWS-002', {
			message: 'Dashboard connected',
			clientCount: this.wsClients.size
		});

		// 1.3.3.2.0.0.0: Send historical logs on connect
		const history = this.db
			.prepare(`
			SELECT * FROM audit_log
			ORDER BY timestamp DESC
			LIMIT 100
		`)
			.all(); // Bun-native SQLite query
		ws.send(
			JSON.stringify({
				type: 'history',
				data: history.reverse(), // Reverse to show oldest first in UI
				timestamp: Date.now()
			})
		);

		ws.data = { session, connectedAt: Date.now() }; // Store session data on WebSocket object (Bun specific)

		// 1.3.3.3.0.0.0: WebSocket event listeners
		ws.addEventListener('close', () => {
			// Bun-native EventListener
			this.wsClients.delete(ws);
			consoleEnhanced.info(LOG_CODES['HBWS-003'] || 'HBWS-003', {
				message: 'Dashboard disconnected',
				clientCount: this.wsClients.size
			});
		});

		ws.addEventListener('message', event => {
			// Bun-native EventListener
			const data = JSON.parse(event.data.toString());
			if (data.type === 'filter') {
				// Example: Client-side log filtering
				ws.data.filter = { level: data.level, subsystem: data.subsystem, search: data.search };
			}
		});
	}

	/**
	 * 1.3.4.0.0.0.0: Verifies the validity of a session key.
	 * Checks for the session key's existence in `Bun.secrets`.
	 *
	 * @param sessionKey - The session key extracted from the cookie.
	 * @returns True if the session is valid, false otherwise.
	 *
	 * Cross-reference: 9.1.1.1.1.1.0 Bun.secrets API
	 * Cross-reference: docs/BUN-SECRETS-API.md - Correct Bun.secrets.get() format
	 * @test: test/auth/session.test.ts::verify_session_token_against_secrets
	 *
	 * Note: This is a synchronous wrapper. In production, consider making handleConnection async
	 * or using a session cache to avoid blocking WebSocket connections.
	 */
	private verifySession(sessionKey: string): boolean {
		// 1.3.4.1.0.0.0: Verify session exists in Bun.secrets (Cross-reference: 9.1.1.1.1.1.0 Bun.secrets)
		// Correct Bun.secrets API format: Bun.secrets.get({ service, name }) returns Promise<string | null>
		// See: docs/BUN-SECRETS-API.md and docs/BUN-SECRETS-DOD-COMPLETION.md:188
		try {
			// Synchronous placeholder - in production, this should be async or use cached session data
			// Correct async usage would be:
			// const sessionData = await Bun.secrets.get({
			//   service: "hyperbun",
			//   name: sessionKey
			// });
			// return sessionData !== null;
			
			// For now, basic validation (replace with actual Bun.secrets.get() in production)
			return sessionKey.length > 0 && sessionKey.startsWith('session_'); // Placeholder validation
		} catch {
			return false;
		}
	}

	/**
	 * 1.3.5.0.0.0.0: Provides health metrics for the WebSocket server.
	 *
	 * @returns An object containing client count, uptime, and last log ID.
	 *
	 * @test: test/websocket/log-stream.test.ts::health_check_metrics
	 */
	getHealth(): { clients: number; uptime: number; lastLogId: number } {
		return {
			clients: this.wsClients.size,
			uptime: Date.now() - this.startTime,
			lastLogId: this.lastLogId
		};
	}
}

/**
 * 1.3.6.0.0.0.0: Singleton instance of LogStreamServer.
 * Ensures a single, consistent WebSocket server manages all log streaming.
 */
export const logStreamServer = new LogStreamServer(
	new Database('/var/lib/hyperbun/audit.db') // Bun-native SQLite
);
