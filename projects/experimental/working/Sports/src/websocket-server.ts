/**
 * WebSocket Server for Real-Time Sports Betting Data Streaming
 * Integrates Bun.serve with fractal dimension analysis and color mapping
 */

import { concatArrayBuffers, deflateSync, inflateSync, randomUUIDv7 } from "bun";
import { computeFD, fdToColor, getRGBAArray, getANSIColor, calculateIntensity } from "./color-mapping";

// Simulated odds data structure
interface OddsPacket {
  timestamp: number;
  sport: string;
  market: string;
  odds: number[];
  volatility: number;
  playerId?: string;
  correlationId?: string;
}

interface LatticeNode {
  glyph: string;
  color: string;
  rgbaArray: [number, number, number, number];
  fd: number;
  intensity: number;
  ansi: string;
  metadata: {
    sport: string;
    market: string;
    timestamp: number;
  };
}

// Cache for session management
const sessionCache = new Map<string, LatticeNode[]>();

// WebSocket data interface for type safety
interface WebSocketData {
  sessionId: string;
  connectedAt: number;
}

/**
 * Process binary odds stream and compute fractal dimensions
 */
export async function processOddsStream(binaryPackets: Uint8Array[]): Promise<LatticeNode[]> {
  try {
    // For demo/simulated data, generate time-series directly
    if (binaryPackets.length === 1 && binaryPackets[0].length === 0) {
      // Empty packet means generate simulated data
      const data = new Float32Array(100);
      for (let i = 0; i < data.length; i++) {
        const base = 1.5 + Math.sin(i * 0.1) * 0.3;
        const noise = (Math.random() - 0.5) * 0.2;
        const trend = i > 70 ? 0.5 : 0;
        data[i] = base + noise + trend;
      }
      const timeSeries = data;
      
      // Generate sub-nodes for lattice (fractal subsets)
      const numNodes = Math.min(10, Math.floor(timeSeries.length / 10));
      const nodes: LatticeNode[] = [];
      
      for (let i = 0; i < numNodes; i++) {
        // Extract subset for this node
        const subsetStart = i * Math.floor(timeSeries.length / numNodes);
        const subset = Array.from(timeSeries.slice(subsetStart, subsetStart + 50));
        
        // Compute fractal dimension
        const fd = computeFD(subset);
        
        // Determine base color based on context
        let baseColor = "#900C3F"; // Default phaseLocked
        if (fd > 2.3) baseColor = "#FF5733"; // structuralDrift
        else if (fd > 1.9) baseColor = "#C70039"; // dependencyGuard
        else if (fd < 0.5) baseColor = "#FFC300"; // rollbackTrigger
        
        // Map to color
        const colorHex = fdToColor(fd, baseColor);
        const rgbaArray = getRGBAArray(colorHex);
        const ansi = getANSIColor(colorHex);
        const intensity = calculateIntensity(fd);
        
        // Determine glyph based on FD regime
        let glyph = "▵⟂经济技术"; // Default
        if (fd > 2.7) glyph = "⚠️⬛"; // Black swan
        else if (fd > 2.3) glyph = "🔥▲"; // High chaos
        else if (fd > 1.9) glyph = "⚡▵"; // High volatility
        else if (fd > 1.5) glyph = "📈⟳"; // Persistent
        else if (fd > 1.2) glyph = "📊▵"; // Brownian
        else if (fd < 0.5) glyph = "🔒⊟"; // Ultra-stable
        
        nodes.push({
          glyph,
          color: colorHex,
          rgbaArray,
          fd,
          intensity,
          ansi,
          metadata: {
            sport: "NFL", // Would come from packet
            market: "player_props",
            timestamp: Date.now()
          }
        });
      }
      
      return nodes;
    }
    
    // Real binary processing path
    // Concatenate incoming binary data
    const buffers: ArrayBuffer[] = [];
    for (const packet of binaryPackets) {
      // Ensure we have an ArrayBuffer (not SharedArrayBuffer)
      const buffer = packet.buffer;
      if (buffer instanceof ArrayBuffer) {
        buffers.push(buffer);
      } else {
        // Convert SharedArrayBuffer to ArrayBuffer
        const arrayBuffer = new ArrayBuffer(buffer.byteLength);
        const view = new Uint8Array(arrayBuffer);
        view.set(new Uint8Array(buffer));
        buffers.push(arrayBuffer);
      }
    }
    const combined = concatArrayBuffers(buffers);
    
    // Decompress if needed (simulated - in production check header)
    let decompressed: Uint8Array;
    if (binaryPackets.length > 0 && binaryPackets[0][0] === 0x78) { // zlib header detection
      decompressed = inflateSync(new Uint8Array(combined));
    } else {
      decompressed = new Uint8Array(combined);
    }

    // Parse to time-series data (Float32Array of odds/volatility)
    const timeSeries = new Float32Array(decompressed.buffer);
    
    // Generate sub-nodes for lattice (fractal subsets)
    const numNodes = Math.min(10, Math.floor(timeSeries.length / 10));
    const nodes: LatticeNode[] = [];
    
    for (let i = 0; i < numNodes; i++) {
      // Extract subset for this node
      const subsetStart = i * Math.floor(timeSeries.length / numNodes);
      const subset = Array.from(timeSeries.slice(subsetStart, subsetStart + 50));
      
      // Compute fractal dimension
      const fd = computeFD(subset);
      
      // Determine base color based on context
      let baseColor = "#900C3F"; // Default phaseLocked
      if (fd > 2.3) baseColor = "#FF5733"; // structuralDrift
      else if (fd > 1.9) baseColor = "#C70039"; // dependencyGuard
      else if (fd < 0.5) baseColor = "#FFC300"; // rollbackTrigger
      
      // Map to color
      const colorHex = fdToColor(fd, baseColor);
      const rgbaArray = getRGBAArray(colorHex);
      const ansi = getANSIColor(colorHex);
      const intensity = calculateIntensity(fd);
      
      // Determine glyph based on FD regime
      let glyph = "▵⟂经济技术"; // Default
      if (fd > 2.7) glyph = "⚠️⬛"; // Black swan
      else if (fd > 2.3) glyph = "🔥▲"; // High chaos
      else if (fd > 1.9) glyph = "⚡▵"; // High volatility
      else if (fd > 1.5) glyph = "📈⟳"; // Persistent
      else if (fd > 1.2) glyph = "📊▵"; // Brownian
      else if (fd < 0.5) glyph = "🔒⊟"; // Ultra-stable
      
      nodes.push({
        glyph,
        color: colorHex,
        rgbaArray,
        fd,
        intensity,
        ansi,
        metadata: {
          sport: "NFL", // Would come from packet
          market: "player_props",
          timestamp: Date.now()
        }
      });
    }
    
    return nodes;
  } catch (error) {
    console.error("Stream processing error:", error);
    return [];
  }
}

/**
 * Compress and prepare data for WebSocket transmission
 */
export function prepareWebSocketPayload(nodes: LatticeNode[]): string {
  return JSON.stringify({
    type: "lattice_update",
    timestamp: Date.now(),
    nodes: nodes.map(n => ({
      g: n.glyph,
      c: n.color,
      fd: n.fd.toFixed(3),
      i: n.intensity,
      ansi: n.ansi,
      meta: n.metadata
    }))
  });
}

/**
 * Generate simulated binary odds packet for testing
 */
export function generateSimulatedPacket(): Uint8Array {
  // Generate random time-series data
  const data = new Float32Array(100);
  for (let i = 0; i < data.length; i++) {
    // Simulate odds volatility with some patterns
    const base = 1.5 + Math.sin(i * 0.1) * 0.3;
    const noise = (Math.random() - 0.5) * 0.2;
    const trend = i > 70 ? 0.5 : 0; // Late game spike
    data[i] = base + noise + trend;
  }
  
  // Compress
  const compressed = deflateSync(new Uint8Array(data.buffer));
  return compressed;
}

/**
 * WebSocket server with Bun.serve
 */
export function startWebSocketServer(port: number = 3000) {
  console.log(`🚀 Starting WebSocket server on port ${port}...`);
  
  const server = Bun.serve<WebSocketData>({
    port,
    fetch(req, server) {
      const url = new URL(req.url);
      
      // Health check
      if (url.pathname === "/health") {
        return Response.json({ 
          status: "ok", 
          timestamp: Date.now(),
          sessions: sessionCache.size 
        });
      }
      
      // WebSocket upgrade
      if (url.pathname === "/ws") {
        const success = server.upgrade(req, {
          data: {
            sessionId: randomUUIDv7("hex"),
            connectedAt: Date.now()
          }
        });
        return success ? undefined : new Response("WebSocket upgrade failed", { status: 400 });
      }
      
      // HTTP fallback
      return new Response("Sports Betting WebSocket Server", { 
        status: 200,
        headers: { "Content-Type": "text/plain" }
      });
    },
    
    websocket: {
      // WebSocket connection handler
      open(ws) {
        const sessionId = ws.data.sessionId;
        
        console.log(`📡 Client connected: ${sessionId}`);
        
        // Initialize session cache
        sessionCache.set(sessionId, []);
        
        // Send welcome message
        ws.send(JSON.stringify({
          type: "welcome",
          sessionId,
          message: "Connected to Sports Betting Fractal Dashboard",
          features: ["real-time-odds", "fd-analysis", "color-mapping", "lattice-visualization"]
        }));
        
        // Start simulated data stream
        startDataStream(ws, sessionId);
      },
      
      // Message handler
      message(ws, message) {
        try {
          const sessionId = ws.data.sessionId;
          
          // Handle client messages (e.g., subscription updates)
          if (typeof message === "string") {
            const data = JSON.parse(message);
            
            if (data.type === "subscribe") {
              ws.send(JSON.stringify({
                type: "subscribed",
                markets: data.markets,
                timestamp: Date.now()
              }));
            } else if (data.type === "ping") {
              ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
            }
          } else {
            // Binary message - process as odds packet
            const buffer = message instanceof Buffer ? message.buffer : message;
            const packets = [new Uint8Array(buffer as ArrayBuffer)];
            processOddsStream(packets).then(nodes => {
              // Update cache
              sessionCache.set(sessionId, nodes);
              
              // Send color-mapped update
              const payload = prepareWebSocketPayload(nodes);
              ws.send(payload);
            });
          }
        } catch (error) {
          console.error("Message processing error:", error);
          ws.send(JSON.stringify({ 
            type: "error", 
            message: "Failed to process message" 
          }));
        }
      },
      
      // Close handler
      close(ws) {
        const sessionId = ws.data.sessionId;
        
        console.log(`🔌 Client disconnected: ${sessionId}`);
        sessionCache.delete(sessionId);
      }
    }
  });
  
  return server;
}

/**
 * Start continuous data stream for testing/demo
 */
function startDataStream(ws: any, sessionId: string) {
  let interval: Timer;
  
  const sendUpdate = () => {
    if (ws.readyState !== 1) { // OPEN
      clearInterval(interval);
      return;
    }
    
    // Generate simulated packet
    const packet = generateSimulatedPacket();
    
    // Process and get nodes
    processOddsStream([packet]).then(nodes => {
      // Update cache
      sessionCache.set(sessionId, nodes);
      
      // Send update
      const payload = prepareWebSocketPayload(nodes);
      ws.send(payload);
      
      // Log for demo
      const highChaos = nodes.filter(n => n.fd > 2.0);
      if (highChaos.length > 0) {
        console.log(`🚨 High chaos detected: ${highChaos.length} nodes`);
      }
    });
  };
  
  // Send initial update
  sendUpdate();
  
  // Set up interval (every 2 seconds for demo)
  interval = setInterval(sendUpdate, 2000);
}

/**
 * Get session statistics
 */
export function getSessionStats(sessionId: string) {
  const nodes = sessionCache.get(sessionId);
  if (!nodes) return null;
  
  const avgFD = nodes.reduce((sum, n) => sum + n.fd, 0) / nodes.length;
  const maxFD = Math.max(...nodes.map(n => n.fd));
  const chaoticNodes = nodes.filter(n => n.fd > 2.0).length;
  
  return {
    sessionId,
    nodeCount: nodes.length,
    averageFD: avgFD,
    maxFD,
    chaoticNodes,
    lastUpdate: Date.now()
  };
}

/**
 * Get all active sessions
 */
export function getAllSessions() {
  const stats: any[] = [];
  sessionCache.forEach((nodes, sessionId) => {
    const stat = getSessionStats(sessionId);
    if (stat) stats.push(stat);
  });
  return stats;
}
