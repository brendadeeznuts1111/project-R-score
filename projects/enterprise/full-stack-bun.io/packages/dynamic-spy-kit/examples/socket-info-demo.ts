/**
 * @dynamic-spy/kit v9.0 - Enhanced Socket Information Demo
 * 
 * Demonstrates Bun.connect() enhanced socket properties
 */

import { connect } from "bun";
import { connectWithInfo, formatSocketInfo, getSocketMetrics, SocketMonitor } from "../src/utils/socket-connection";

async function demoBasicSocketInfo() {
	console.info("🔌 Basic Socket Information Demo\n");
	
	const socket = await connect({
		hostname: "ai-odds.stream",
		port: 443,
		socket: {
			data: () => {},
			open: () => {},
			error: () => {},
			close: () => {},
			drain: () => {},
		},
	});
	
	console.info("Socket Information:");
	console.info({
		localAddress: socket.localAddress,    // Local IP address
		localPort: socket.localPort,          // Local port number
		localFamily: socket.localFamily,      // 'IPv4' or 'IPv6'
		remoteAddress: socket.remoteAddress, // Remote IP address
		remotePort: socket.remotePort,        // Remote port number
		remoteFamily: socket.remoteFamily,    // 'IPv4' or 'IPv6'
	});
	
	// Simple formatted output (canonical format)
	console.info(`\nFormatted: ${socket.localAddress}:${socket.localPort} → ${socket.remoteAddress}:${socket.remotePort} (${socket.remoteFamily})`);
	
	socket.end();
}

async function demoConnectWithInfo() {
	console.info("\n🔌 Connect with Info Utility\n");
	
	const { socket, info } = await connectWithInfo({
		hostname: "example.com",
		port: 80,
	});
	
	console.info("Formatted Socket Info:");
	console.info(formatSocketInfo(info));
	
	console.info("\nSocket Metrics:");
	console.info(getSocketMetrics(info));
	
	socket.end();
}

async function demoSocketMonitor() {
	console.info("\n🔌 Socket Monitor Demo\n");
	
	const monitor = new SocketMonitor();
	
	// Connect multiple sockets
	const socket1 = await monitor.connect({
		hostname: "example.com",
		port: 80,
	});
	
	const socket2 = await monitor.connect({
		hostname: "google.com",
		port: 80,
	});
	
	console.info("\nMonitor Stats:");
	console.info(monitor.getStats());
	
	console.info("\nAll Connections:");
	monitor.getAllConnections().forEach((info, i) => {
		console.info(`  ${i + 1}. ${formatSocketInfo(info)}`);
	});
	
	// Close sockets
	socket1.end();
	socket2.end();
	
	// Wait a bit for disconnect events
	await Bun.sleep(100);
	
	console.info("\nFinal Stats:");
	console.info(monitor.getStats());
}

async function demoIPv6Connection() {
	console.info("\n🔌 IPv6 Connection Demo\n");
	
	try {
		const { socket, info } = await connectWithInfo({
			hostname: "ipv6.google.com",
			port: 80,
			family: "IPv6",
		});
		
		console.info("IPv6 Socket Info:");
		console.info(formatSocketInfo(info));
		console.info("Is IPv6:", info.localFamily === 'IPv6' || info.remoteFamily === 'IPv6');
		
		socket.end();
	} catch (error) {
		console.info("IPv6 connection failed (expected if IPv6 not available):", error);
	}
}

async function main() {
	console.info("=".repeat(60));
	console.info("Enhanced Socket Information Demo");
	console.info("=".repeat(60));
	
	await demoBasicSocketInfo();
	await demoConnectWithInfo();
	await demoSocketMonitor();
	await demoIPv6Connection();
	
	console.info("\n" + "=".repeat(60));
	console.info("Demo Complete!");
	console.info("=".repeat(60));
}

if (import.meta.main) {
	main().catch(console.error);
}

