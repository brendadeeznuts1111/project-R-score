/**
 * @dynamic-spy/kit v9.0 - Feed Connection Monitor
 * 
 * Connection monitoring & debugging using Bun 1.3 enhanced socket information
 */

import { connect, Socket } from "bun";
import type { EnhancedFeedPattern } from "./feed-registry-loader";
import { formatSocketInfo } from "./socket-connection";

export interface ConnectionInfo {
	feedId: string;
	socket: Socket;
	localEndpoint: string;
	remoteEndpoint: string;
	family: 'IPv4' | 'IPv6';
	connectedAt: number;
}

/**
 * Monitor connections to multiple feeds
 */
export async function monitorConnections(
	feeds: EnhancedFeedPattern[]
): Promise<ConnectionInfo[]> {
	const sockets: ConnectionInfo[] = [];

	for (const feed of feeds) {
		try {
			const socket = await connect({
				hostname: feed.hostname || 'localhost',
				port: feed.port || 443,
				tls: feed.port === 443 || feed.hostname?.includes('https'),
				socket: {
					data: () => {},
					open: () => {},
					error: () => {},
					close: () => {},
					drain: () => {},
				},
			});

			const info: ConnectionInfo = {
				feedId: feed.id,
				socket,
				localEndpoint: `${socket.localAddress}:${socket.localPort}`,
				remoteEndpoint: `${socket.remoteAddress}:${socket.remotePort}`,
				family: socket.remoteFamily,
				connectedAt: Date.now(),
			};

			console.log(`✅ Connected to ${feed.id}:`);
			console.log(`  Local: ${info.localEndpoint}`);
			console.log(`  Remote: ${info.remoteEndpoint}`);
			console.log(`  Type: ${feed.type} (Priority: ${feed.priority})`);
			console.log(`  Format: ${formatSocketInfo({
				localAddress: socket.localAddress,
				localPort: socket.localPort,
				localFamily: socket.localFamily,
				remoteAddress: socket.remoteAddress,
				remotePort: socket.remotePort,
				remoteFamily: socket.remoteFamily,
			})}`);

			sockets.push(info);
		} catch (error) {
			console.error(`❌ Failed to connect to ${feed.id}: ${(error as Error).message}`);
		}
	}

	return sockets;
}



