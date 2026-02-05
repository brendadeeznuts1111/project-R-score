/**
 * @dynamic-spy/kit v9.0 - Enhanced Socket Connection Utility
 * 
 * Bun.connect() with enhanced network information for monitoring and telemetry
 */

import { connect, Socket } from "bun";

export interface SocketInfo {
	localAddress: string;
	localPort: number;
	localFamily: 'IPv4' | 'IPv6';
	remoteAddress: string;
	remotePort: number;
	remoteFamily: 'IPv4' | 'IPv6';
}

export interface SocketConnectionOptions {
	hostname: string;
	port: number;
	family?: 'IPv4' | 'IPv6';
	tls?: boolean;
	timeout?: number;
}

/**
 * Enhanced socket connection with network information
 */
export async function connectWithInfo(
	options: SocketConnectionOptions,
	onClose?: (socket: Socket) => void
): Promise<{ socket: Socket; info: SocketInfo }> {
	const socket = await connect({
		hostname: options.hostname,
		port: options.port,
		socket: {
			data: () => {},
			open: () => {},
			error: () => {},
			close: (sock) => {
				if (onClose) {
					onClose(sock);
				}
			},
			drain: () => {},
		},
	});

	// Extract enhanced socket information
	const info: SocketInfo = {
		localAddress: socket.localAddress || '',
		localPort: socket.localPort || 0,
		localFamily: socket.localFamily || 'IPv4',
		remoteAddress: socket.remoteAddress || options.hostname,
		remotePort: socket.remotePort || options.port,
		remoteFamily: socket.remoteFamily || options.family || 'IPv4',
	};

	return { socket, info };
}

/**
 * Format socket info for logging
 * Format: ${localAddress}:${localPort} → ${remoteAddress}:${remotePort} (${remoteFamily})
 */
export function formatSocketInfo(info: SocketInfo): string {
	return `${info.localAddress}:${info.localPort} → ${info.remoteAddress}:${info.remotePort} (${info.remoteFamily})`;
}

/**
 * Check if socket is IPv6
 */
export function isIPv6(info: SocketInfo): boolean {
	return info.localFamily === 'IPv6' || info.remoteFamily === 'IPv6';
}

/**
 * Get socket connection metrics
 */
export function getSocketMetrics(info: SocketInfo): {
	isIPv6: boolean;
	isLocalhost: boolean;
	isPrivateIP: boolean;
	connectionType: string;
} {
	const isLocalhost = info.remoteAddress === '127.0.0.1' || 
	                   info.remoteAddress === '::1' ||
	                   info.remoteAddress === 'localhost';
	
	const isPrivateIP = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/.test(info.remoteAddress) ||
	                   info.remoteAddress.startsWith('fc00:') ||
	                   info.remoteAddress.startsWith('fd00:');
	
	const connectionType = isIPv6(info) ? 'IPv6' : 'IPv4';
	
	return {
		isIPv6: isIPv6(info),
		isLocalhost,
		isPrivateIP,
		connectionType,
	};
}

/**
 * Monitor socket connection with telemetry
 */
export class SocketMonitor {
	private connections: Map<Socket, SocketInfo> = new Map();
	
	async connect(options: SocketConnectionOptions): Promise<Socket> {
		const { socket, info } = await connectWithInfo(options, (sock) => {
			// Handle disconnect
			const connInfo = this.connections.get(sock);
			if (connInfo) {
				console.log(`🔌 Socket disconnected: ${formatSocketInfo(connInfo)}`);
				this.connections.delete(sock);
			}
		});
		
		// Store connection info
		this.connections.set(socket, info);
		
		// Log connection
		console.log(`🔌 Socket connected: ${formatSocketInfo(info)}`);
		
		return socket;
	}
	
	getInfo(socket: Socket): SocketInfo | null {
		return this.connections.get(socket) || null;
	}
	
	getAllConnections(): SocketInfo[] {
		return Array.from(this.connections.values());
	}
	
	getStats(): {
		totalConnections: number;
		ipv4Connections: number;
		ipv6Connections: number;
		localhostConnections: number;
	} {
		const all = this.getAllConnections();
		return {
			totalConnections: all.length,
			ipv4Connections: all.filter(info => info.localFamily === 'IPv4').length,
			ipv6Connections: all.filter(info => info.localFamily === 'IPv6').length,
			localhostConnections: all.filter(info => 
				info.remoteAddress === '127.0.0.1' || info.remoteAddress === '::1'
			).length,
		};
	}
}

