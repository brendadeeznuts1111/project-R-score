/**
 * @dynamic-spy/kit v9.0 - Enhanced Socket Information Demo
 * 
 * Demonstrates Bun.connect() enhanced socket properties
 */

import { connect } from "bun";
import { connectWithInfo, formatSocketInfo, getSocketMetrics, SocketMonitor } from "../src/utils/socket-connection";

async function demoBasicSocketInfo() {
	console.log("🔌 Basic Socket Information Demo\n");
	
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
	
	console.log("Socket Information:");
	console.log({
		localAddress: socket.localAddress,    // Local IP address
		localPort: socket.localPort,          // Local port number
		localFamily: socket.localFamily,      // 'IPv4' or 'IPv6'
		remoteAddress: socket.remoteAddress, // Remote IP address
		remotePort: socket.remotePort,        // Remote port number
		remoteFamily: socket.remoteFamily,    // 'IPv4' or 'IPv6'
	});
	
	// Simple formatted output (canonical format)
	console.log(`\nFormatted: ${socket.localAddress}:${socket.localPort} → ${socket.remoteAddress}:${socket.remotePort} (${socket.remoteFamily})`);
	
	socket.end();
}

async function demoConnectWithInfo() {
	console.log("\n🔌 Connect with Info Utility\n");
	
	const { socket, info } = await connectWithInfo({
		hostname: "example.com",
		port: 80,
	});
	
	console.log("Formatted Socket Info:");
	console.log(formatSocketInfo(info));
	
	console.log("\nSocket Metrics:");
	console.log(getSocketMetrics(info));
	
	socket.end();
}

async function demoSocketMonitor() {
	console.log("\n🔌 Socket Monitor Demo\n");
	
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
	
	console.log("\nMonitor Stats:");
	console.log(monitor.getStats());
	
	console.log("\nAll Connections:");
	monitor.getAllConnections().forEach((info, i) => {
		console.log(`  ${i + 1}. ${formatSocketInfo(info)}`);
	});
	
	// Close sockets
	socket1.end();
	socket2.end();
	
	// Wait a bit for disconnect events
	await Bun.sleep(100);
	
	console.log("\nFinal Stats:");
	console.log(monitor.getStats());
}

async function demoIPv6Connection() {
	console.log("\n🔌 IPv6 Connection Demo\n");
	
	try {
		const { socket, info } = await connectWithInfo({
			hostname: "ipv6.google.com",
			port: 80,
			family: "IPv6",
		});
		
		console.log("IPv6 Socket Info:");
		console.log(formatSocketInfo(info));
		console.log("Is IPv6:", info.localFamily === 'IPv6' || info.remoteFamily === 'IPv6');
		
		socket.end();
	} catch (error) {
		console.log("IPv6 connection failed (expected if IPv6 not available):", error);
	}
}

async function main() {
	console.log("=".repeat(60));
	console.log("Enhanced Socket Information Demo");
	console.log("=".repeat(60));
	
	await demoBasicSocketInfo();
	await demoConnectWithInfo();
	await demoSocketMonitor();
	await demoIPv6Connection();
	
	console.log("\n" + "=".repeat(60));
	console.log("Demo Complete!");
	console.log("=".repeat(60));
}

if (import.meta.main) {
	main().catch(console.error);
}

