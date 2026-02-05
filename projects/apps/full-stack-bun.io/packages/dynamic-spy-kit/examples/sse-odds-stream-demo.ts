#!/usr/bin/env bun
/**
 * @dynamic-spy/kit v7.2 - SSE ODDS STREAM DEMO 📡
 * 
 * Real-time Server-Sent Events for live odds streaming:
 * - SSE server with Bun.serve()
 * - Live odds updates (moneyline, spread, total)
 * - Market correlations
 * - Client consumption patterns
 * 
 * Usage:
 *   bun run examples/sse-odds-stream-demo.ts
 *   
 * Then connect:
 *   curl -N http://localhost:3001/stream
 */

import { hash } from "bun";

// =============================================================================
// Types
// =============================================================================
interface OddsUpdate {
	game: string;
	moneyline?: Record<string, number>;
	spread?: Record<string, number>;
	total?: Record<string, number>;
	timestamp?: number;
}

interface CorrelationUpdate {
	game: string;
	correlations: Array<{
		markets: string[];
		correlation: number;
	}>;
}

type SSEData = OddsUpdate | CorrelationUpdate;

// =============================================================================
// Sample Data Generators
// =============================================================================
const GAMES = [
	"Lakers-Celtics",
	"Nuggets-Heat",
	"Warriors-Suns",
	"Bucks-76ers",
	"Mavericks-Clippers"
];

const BOOKIES = ["pinnacle", "betfair", "draftkings", "fanduel", "bet365"];

function generateOddsUpdate(): OddsUpdate {
	const game = GAMES[Math.floor(Math.random() * GAMES.length)];
	const bookie = BOOKIES[Math.floor(Math.random() * BOOKIES.length)];
	
	return {
		game,
		moneyline: { [bookie]: 1.8 + Math.random() * 0.4 },
		spread: { [bookie]: 1.85 + Math.random() * 0.2 },
		timestamp: Date.now()
	};
}

function generateCorrelationUpdate(): CorrelationUpdate {
	const game = GAMES[Math.floor(Math.random() * GAMES.length)];
	
	return {
		game,
		correlations: [
			{ markets: ["moneyline", "spread"], correlation: 0.8 + Math.random() * 0.19 },
			{ markets: ["spread", "total"], correlation: 0.3 + Math.random() * 0.4 }
		]
	};
}

// =============================================================================
// SSE Encoder
// =============================================================================
function encodeSSE(data: SSEData, event?: string, id?: string): string {
	let message = "";
	
	if (id) {
		message += `id: ${id}\n`;
	}
	
	if (event) {
		message += `event: ${event}\n`;
	}
	
	message += `data: ${JSON.stringify(data)}\n\n`;
	
	return message;
}

// =============================================================================
// SSE Server
// =============================================================================
function createSSEServer(port: number) {
	const clients = new Set<ReadableStreamDefaultController<Uint8Array>>();
	let messageId = 0;
	
	// Broadcast to all connected clients
	function broadcast(data: SSEData, event?: string) {
		messageId++;
		const id = hash.rapidhash(`${messageId}-${Date.now()}`).toString(16);
		const message = encodeSSE(data, event, id);
		const encoded = new TextEncoder().encode(message);
		
		for (const controller of clients) {
			try {
				controller.enqueue(encoded);
			} catch {
				clients.delete(controller);
			}
		}
	}
	
	// Start odds stream (simulated)
	const oddsInterval = setInterval(() => {
		broadcast(generateOddsUpdate(), "odds");
	}, 500);
	
	// Start correlation stream (less frequent)
	const corrInterval = setInterval(() => {
		broadcast(generateCorrelationUpdate(), "correlation");
	}, 2000);
	
	const server = Bun.serve({
		port,
		fetch(req) {
			const url = new URL(req.url);
			
			// SSE Stream endpoint
			if (url.pathname === "/stream") {
				const stream = new ReadableStream<Uint8Array>({
					start(controller) {
						clients.add(controller);
						
						// Send initial connection message
						const welcome = encodeSSE(
							{ game: "CONNECTED", moneyline: {}, timestamp: Date.now() },
							"connected"
						);
						controller.enqueue(new TextEncoder().encode(welcome));
					},
					cancel() {
						// Client disconnected
					}
				});
				
				return new Response(stream, {
					headers: {
						"Content-Type": "text/event-stream",
						"Cache-Control": "no-cache",
						"Connection": "keep-alive",
						"Access-Control-Allow-Origin": "*"
					}
				});
			}
			
			// Stats endpoint
			if (url.pathname === "/stats") {
				return Response.json({
					clients: clients.size,
					messagesTotal: messageId,
					uptime: process.uptime()
				});
			}
			
			// Demo page
			if (url.pathname === "/" || url.pathname === "/demo") {
				return new Response(`<!DOCTYPE html>
<html>
<head>
  <title>SSE Odds Stream Demo</title>
  <style>
    body { font-family: monospace; background: #1a1a2e; color: #eee; padding: 20px; }
    h1 { color: #00ff88; }
    .event { padding: 8px; margin: 4px 0; border-radius: 4px; }
    .odds { background: #16213e; border-left: 3px solid #00ff88; }
    .correlation { background: #1a1a2e; border-left: 3px solid #ff6b6b; }
    .connected { background: #0f3460; border-left: 3px solid #4da8da; }
    pre { margin: 0; }
  </style>
</head>
<body>
  <h1>📡 SSE Odds Stream</h1>
  <p>Connected clients: <span id="clients">0</span></p>
  <div id="events"></div>
  <script>
    const events = document.getElementById('events');
    const es = new EventSource('/stream');
    
    es.addEventListener('connected', (e) => {
      addEvent('connected', e.data);
    });
    
    es.addEventListener('odds', (e) => {
      addEvent('odds', e.data);
    });
    
    es.addEventListener('correlation', (e) => {
      addEvent('correlation', e.data);
    });
    
    function addEvent(type, data) {
      const div = document.createElement('div');
      div.className = 'event ' + type;
      div.innerHTML = '<pre>' + type + ': ' + data + '</pre>';
      events.insertBefore(div, events.firstChild);
      if (events.children.length > 50) events.lastChild.remove();
    }
    
    // Update client count
    setInterval(async () => {
      const res = await fetch('/stats');
      const stats = await res.json();
      document.getElementById('clients').textContent = stats.clients;
    }, 1000);
  </script>
</body>
</html>`, {
					headers: { "Content-Type": "text/html" }
				});
			}
			
			return new Response("Not found", { status: 404 });
		}
	});
	
	return {
		server,
		broadcast,
		stop() {
			clearInterval(oddsInterval);
			clearInterval(corrInterval);
			server.stop();
		},
		get clientCount() {
			return clients.size;
		}
	};
}

// =============================================================================
// SSE Client Demo
// =============================================================================
async function demoSSEClient(url: string, duration: number = 5000) {
	console.log("\n" + "=".repeat(60));
	console.log("📡 SSE CLIENT - Consuming odds stream");
	console.log("=".repeat(60));
	
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), duration);
	
	try {
		const response = await fetch(url, {
			signal: controller.signal,
			headers: { "Accept": "text/event-stream" }
		});
		
		const reader = response.body?.getReader();
		if (!reader) throw new Error("No reader");
		
		const decoder = new TextDecoder();
		let eventCount = 0;
		
		console.log(`\n🔌 Connected to ${url}`);
		console.log(`⏱️ Streaming for ${duration / 1000}s...\n`);
		
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			
			const text = decoder.decode(value);
			const lines = text.split("\n");
			
			for (const line of lines) {
				if (line.startsWith("data: ")) {
					eventCount++;
					const data = line.slice(6);
					console.log(`   ${eventCount}. data: ${data}`);
				}
			}
		}
	} catch (e: any) {
		if (e.name === "AbortError") {
			console.log(`\n✅ Stream closed after ${duration / 1000}s`);
		} else {
			throw e;
		}
	} finally {
		clearTimeout(timeout);
	}
}

// =============================================================================
// Parse SSE Data
// =============================================================================
function parseSSELine(line: string): { event?: string; data?: any; id?: string } | null {
	if (line.startsWith("event: ")) {
		return { event: line.slice(7) };
	}
	if (line.startsWith("data: ")) {
		try {
			return { data: JSON.parse(line.slice(6)) };
		} catch {
			return { data: line.slice(6) };
		}
	}
	if (line.startsWith("id: ")) {
		return { id: line.slice(4) };
	}
	return null;
}

// =============================================================================
// Demo: Manual SSE Encoding
// =============================================================================
function demoSSEEncoding() {
	console.log("=".repeat(60));
	console.log("1. SSE MESSAGE ENCODING");
	console.log("=".repeat(60));
	
	// Example 1: Odds update
	const oddsData: OddsUpdate = {
		game: "Lakers-Celtics",
		moneyline: { pinnacle: 1.94 },
		spread: { pinnacle: 1.91 }
	};
	
	console.log("\n📦 Odds Update:");
	console.log(encodeSSE(oddsData, "odds", "msg-001"));
	
	// Example 2: Correlation update  
	const corrData: CorrelationUpdate = {
		game: "Nuggets-Heat",
		correlations: [
			{ markets: ["moneyline", "spread"], correlation: 0.89 }
		]
	};
	
	console.log("📦 Correlation Update:");
	console.log(encodeSSE(corrData, "correlation", "msg-002"));
}

// =============================================================================
// Demo: Hash-based Message IDs
// =============================================================================
function demoMessageIds() {
	console.log("=".repeat(60));
	console.log("2. RAPIDHASH MESSAGE IDs");
	console.log("=".repeat(60));
	
	const messages = [
		{ game: "Lakers-Celtics", type: "odds" },
		{ game: "Nuggets-Heat", type: "correlation" },
		{ game: "Warriors-Suns", type: "odds" }
	];
	
	console.log("\n📋 Message IDs using Bun.hash.rapidhash():");
	messages.forEach((msg, i) => {
		const id = hash.rapidhash(`${i}-${msg.game}-${Date.now()}`).toString(16);
		console.log(`   ${msg.game}: id=${id.slice(0, 16)}...`);
	});
}

// =============================================================================
// Main
// =============================================================================
async function main() {
	console.log("\n⚡ @dynamic-spy/kit v7.2 - SSE ODDS STREAM DEMO 📡\n");
	
	const args = Bun.argv.slice(2);
	const serverOnly = args.includes("--server");
	const port = 3001;
	
	// Demo encoding
	demoSSEEncoding();
	demoMessageIds();
	
	// Start server
	console.log("\n" + "=".repeat(60));
	console.log("3. SSE SERVER");
	console.log("=".repeat(60));
	
	const sse = createSSEServer(port);
	console.log(`\n🚀 SSE server running on http://localhost:${port}`);
	console.log(`   Stream: http://localhost:${port}/stream`);
	console.log(`   Demo:   http://localhost:${port}/demo`);
	console.log(`   Stats:  http://localhost:${port}/stats`);
	
	if (serverOnly) {
		console.log(`\n📡 Server mode - press Ctrl+C to stop`);
		console.log(`\nTest with:`);
		console.log(`   curl -N http://localhost:${port}/stream`);
		return;
	}
	
	// Demo client
	await Bun.sleep(500); // Let server start
	await demoSSEClient(`http://localhost:${port}/stream`, 3000);
	
	// Cleanup
	sse.stop();
	
	console.log("\n" + "=".repeat(60));
	console.log("✅ SSE DEMO COMPLETE");
	console.log("=".repeat(60));
	console.log(`
📡 SSE Format:
   event: odds
   id: abc123
   data: {"game":"Lakers-Celtics","moneyline":{"pinnacle":1.94}}

🔧 Features:
   - Real-time odds streaming
   - Event types (odds, correlation)
   - Rapidhash message IDs
   - Multi-client broadcast
   - Auto-reconnect support
`);
}

if (import.meta.main) {
	main().catch(console.error);
}

