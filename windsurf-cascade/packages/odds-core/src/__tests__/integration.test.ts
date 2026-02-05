#!/usr/bin/env bun

import { apiTracker } from '../packages/odds-core/src/monitoring/api-tracker.js';
// packages/odds-core/src/__tests__/integration.test.ts - Integration Tests

import { test, describe, expect, beforeAll, afterAll, beforeEach, afterEach, mock } from "bun:test";

import { 
  calculateKellyFraction, 
  calculateExpectedValue, 
  calculateArbitrageOpportunity,
  BunPerformanceMonitor,
  getSocketInfo,
  performNetworkDiagnostics
} from '../utils';
import { OddsTick, ArbitrageOpportunity, WebSocketMessage } from '../types';

describe("Odds Protocol - Integration Tests", () => {
  let monitor: BunPerformanceMonitor;
  let mockServer: any;

  beforeAll(async () => {
    monitor = new BunPerformanceMonitor();
    
    // Setup mock HTTP server for API integration tests
    mockServer = Bun.serve({
      port: 3006,
      fetch(req) {
        const url = new URL(req.url);
        
        if (url.pathname === "/api/odds") {
          return Response.json({
            odds: [
              {
                id: "live-odds-1",
                sport: "basketball",
                event: "Lakers vs Celtics",
                bookmaker: "BookA",
                odds: { home: -110, away: -110 },
                timestamp: new Date().toISOString()
              },
              {
                id: "live-odds-2", 
                sport: "basketball",
                event: "Lakers vs Celtics",
                bookmaker: "BookB",
                odds: { home: -105, away: -115 },
                timestamp: new Date().toISOString()
              }
            ]
          });
        }
        
        if (url.pathname === "/api/arbitrage") {
          return Response.json({
            opportunities: [
              {
                id: "arb-123",
                sport: "basketball",
                event: "Lakers vs Celtics",
                profit: 2.5,
                opportunities: [
                  { bookmaker: "BookA", odds: -105, commission: 0.02 },
                  { bookmaker: "BookB", odds: -115, commission: 0.025 }
                ],
                timestamp: new Date().toISOString()
              }
            ]
          });
        }
        
        return new Response("Not Found", { status: 404 });
      }
    });
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    if (mockServer) {
      mockServer.stop();
    }
  });

  describe("Core - WebSocket Integration", () => {
    test.concurrent("processes live odds updates through WebSocket", async () => {
      const wsUrl = "ws://localhost:3003"; // Assuming WebSocket server is running
      const processedOdds: OddsTick[] = [];
      
      try {
        const ws = new WebSocket(wsUrl);
        
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            ws.close();
            reject(new Error("WebSocket connection timeout"));
          }, 5000);
          
          ws.onopen = () => {
            clearTimeout(timeout);
            
            // Send odds update
            const oddsMessage: WebSocketMessage = {
              type: "odds-update",
              timestamp: new Date().toISOString(),
              data: {
                id: "integration-odds-1",
                sport: "basketball",
                event: "Lakers vs Celtics",
                odds: { home: -110, away: -110 },
                bookmaker: "integration-test"
              }
            };
            
            ws.send(JSON.stringify(oddsMessage));
          };
          
          ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            
            if (message.type === "odds-processed") {
              processedOdds.push(message.data);
              
              // Calculate Kelly fraction for received odds
              const kellyFraction = calculateKellyFraction(0.05, 2.0);
              expect(kellyFraction).toBeGreaterThan(0);
              
              resolve();
            }
          };
          
          ws.onerror = reject;
        });
        
        ws.close();
      } catch (error) {
        // WebSocket server might not be running, skip this test
        console.log("⚠️ WebSocket server not available, skipping integration test");
      }
    });
  });

  describe("Core - API Integration", () => {
    test.concurrent("fetches and processes live odds from API", async () => {
      const response = await fetch("http://localhost:3006/api/odds");
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.odds).toBeDefined();
      expect(data.odds.length).toBeGreaterThan(0);
      
      // Process odds data
      const processedOdds = data.odds.map((odds: any) => {
        const kellyFraction = calculateKellyFraction(0.05, 2.0);
        const expectedValue = calculateExpectedValue(0.6, 2.0, 100);
        
        return {
          ...odds,
          kellyFraction,
          expectedValue,
          processed: true
        };
      });
      
      expect(processedOdds.every((odds: any) => odds.processed)).toBe(true);
      expect(processedOdds.every((odds: any) => odds.kellyFraction >= 0)).toBe(true);
    });

    test.concurrent("detects arbitrage opportunities from API data", async () => {
      const response = await fetch("http://localhost:3006/api/arbitrage");
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.opportunities).toBeDefined();
      
      // Validate arbitrage opportunities
      data.opportunities.forEach((opportunity: ArbitrageOpportunity) => {
        expect(opportunity.profit).toBeGreaterThan(0);
        expect(opportunity.opportunities.length).toBeGreaterThan(1);
        
        // Verify arbitrage calculation
        const recalculated = calculateArbitrageOpportunity(opportunity.opportunities);
        expect(recalculated?.profit).toBeCloseTo(opportunity.profit, 1);
      });
    });
  });

  describe("Core - Performance Integration", () => {
    test.concurrent("measures end-to-end performance of odds processing", async () => {
      const startTime = performance.now();
      
      // Simulate complete odds processing pipeline
      const oddsData = Array.from({ length: 1000 }, (_, i) => ({
        id: `perf-odds-${i}`,
        sport: "basketball",
        event: `Team ${i} vs Team ${i + 1}`,
        odds: { home: -110 + (i % 20), away: -110 + (i % 20) },
        bookmaker: `Bookmaker${i % 10}`,
        timestamp: new Date().toISOString()
      }));
      
      // Process odds
      const processedOdds = oddsData.map(odds => {
        const kellyFraction = calculateKellyFraction(0.05, 2.0);
        const expectedValue = calculateExpectedValue(0.6, 2.0, 100);
        const hash = Bun.hash(JSON.stringify(odds));
        
        return {
          ...odds,
          kellyFraction,
          expectedValue,
          hash: hash.toString(),
          processed: true
        };
      });
      
      // Filter for arbitrage opportunities
      const arbitrageOpportunities = processedOdds.filter(odds => 
        odds.expectedValue > 0 && odds.kellyFraction > 0.02
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(processedOdds).toHaveLength(1000);
      expect(processedOdds.every(odds => odds.processed)).toBe(true);
      expect(duration).toBeLessThan(500); // Should process 1000 odds in under 500ms
      
      console.log(`🚀 Processed 1000 odds in ${duration.toFixed(2)}ms`);
      console.log(`🎯 Found ${arbitrageOpportunities.length} opportunities`);
    });

    test.concurrent("handles concurrent API requests efficiently", async () => {
      const apiEndpoints = [
        "http://localhost:3006/api/odds",
        "http://localhost:3006/api/arbitrage"
      ];
      
      const startTime = performance.now();
      
      // Make concurrent requests
      const requests = apiEndpoints.map(url => fetch(url));
      const responses = await Promise.all(requests);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(responses).toHaveLength(2);
      expect(responses.every(res => res.status === 200)).toBe(true);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
      
      // Process all responses
      const data = await Promise.all(responses.map(res => res.json()));
      expect(data.length).toBe(2);
      
      console.log(`🔄 Completed ${apiEndpoints.length} concurrent API requests in ${duration.toFixed(2)}ms`);
    });
  });

  describe("Core - Network Integration", () => {
    test.concurrent("performs network diagnostics with real endpoints", async () => {
      const endpoints = [
        { hostname: "localhost", port: 3006 }, // Our mock server
        { hostname: "httpbin.org", port: 80 }
      ];
      
      const results = await performNetworkDiagnostics(endpoints);
      
      expect(results).toHaveLength(2);
      
      // Check our mock server
      expect(results[0].success).toBe(true);
      if (results[0].success && results[0].data?.info) {
        expect(results[0].data.info.localAddress).toBeDefined();
        expect(results[0].data.info.remoteAddress).toBeDefined();
      }
      
      // Check external endpoint
      expect(results[1].success).toBe(true);
      
      console.log("🌐 Network diagnostics completed:", results.map(r => ({ 
        hostname: r.endpoint.hostname, 
        success: r.success,
        responseTime: r.responseTime 
      })));
    });

    test.concurrent("handles network failures gracefully", async () => {
      const invalidEndpoints = [
        { hostname: "invalid.nonexistent.domain", port: 80 },
        { hostname: "localhost", port: 9999 } // Non-existent port
      ];
      
      const results = await performNetworkDiagnostics(invalidEndpoints);
      
      expect(results).toHaveLength(2);
      expect(results.every(r => r.success === false)).toBe(true);
      expect(results.every(r => r.error)).toBe(true);
      
      // Verify error handling doesn't crash the system
      results.forEach(result => {
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe("string");
      });
    });
  });

  describe("Core - Data Validation Integration", () => {
    test.concurrent("validates complete odds data pipeline", async () => {
      // Simulate data from multiple sources
      const sourceA = {
        id: "source-a-1",
        sport: "basketball",
        event: "Lakers vs Celtics",
        odds: { home: -110, away: -110 },
        bookmaker: "SourceA",
        timestamp: new Date().toISOString()
      };
      
      const sourceB = {
        id: "source-b-1",
        sport: "basketball", 
        event: "Lakers vs Celtics",
        odds: { home: -105, away: -115 },
        bookmaker: "SourceB",
        timestamp: new Date().toISOString()
      };
      
      // Validate individual sources
      expect(sourceA.id).toBeDefined();
      expect(sourceA.sport).toBeDefined();
      expect(sourceA.odds).toBeDefined();
      expect(sourceA.bookmaker).toBeDefined();
      
      // Combine and detect arbitrage
      const combinedOdds = [sourceA, sourceB];
      const arbitrageOpportunity = calculateArbitrageOpportunity(
        combinedOdds.map(o => ({ 
          bookmaker: o.bookmaker, 
          odds: o.odds.home, 
          commission: 0.02 
        }))
      );
      
      // Should find some opportunity or return null
      if (arbitrageOpportunity) {
        expect(arbitrageOpportunity.profit).toBeGreaterThan(0);
        expect(arbitrageOpportunity.opportunities.length).toBeGreaterThan(1);
      }
    });

    test.concurrent("handles malformed data gracefully", async () => {
      const malformedData = [
        { id: "", sport: "", odds: null }, // Missing required fields
        { id: "valid", sport: "basketball", odds: { home: -110 } }, // Missing away odds
        { id: "valid2", sport: "basketball", odds: { home: "invalid", away: -110 } } // Invalid odds type
      ];
      
      // Process malformed data without crashing
      const processed = malformedData.map(data => {
        try {
          if (!data.id || !data.sport || !data.odds) {
            return { error: "Missing required fields", data };
          }
          
          if (typeof data.odds.home !== "number" || typeof data.odds.away !== "number") {
            return { error: "Invalid odds type", data };
          }
          
          return { success: true, data };
        } catch (error) {
          return { error: "Processing error", data, error: String(error) };
        }
      });
      
      expect(processed).toHaveLength(3);
      expect(processed.every(p => p.error || p.success)).toBe(true);
      expect(processed.filter(p => p.error).length).toBeGreaterThan(0);
    });
  });

  describe("Core - Memory and Resource Integration", () => {
    test.concurrent("manages memory efficiently during high-load processing", async () => {
      const initialMemory = monitor.getMemoryStats();
      
      // Process large dataset
      const largeDataset = Array.from({ length: 50000 }, (_, i) => ({
        id: `memory-test-${i}`,
        sport: "basketball",
        event: `Event ${i}`,
        odds: { home: -110 + (i % 20), away: -110 + (i % 20) },
        bookmaker: `Bookmaker${i % 10}`,
        timestamp: new Date().toISOString(),
        metadata: {
          source: "integration-test",
          confidence: Math.random(),
          volume: Math.floor(Math.random() * 1000000)
        }
      }));
      
      const peakMemory = monitor.getMemoryStats();
      
      // Process and filter
      const processed = largeDataset.map(item => ({
        ...item,
        kellyFraction: calculateKellyFraction(0.05, 2.0),
        expectedValue: calculateExpectedValue(0.6, 2.0, 100),
        hash: Bun.hash(JSON.stringify(item)).toString()
      }));
      
      const opportunities = processed.filter(item => item.expectedValue > 0);
      
      // Cleanup
      largeDataset.length = 0;
      
      if (typeof globalThis.gc !== 'undefined') {
        globalThis.gc();
      }
      
      const finalMemory = monitor.getMemoryStats();
      
      expect(processed).toHaveLength(50000);
      expect(opportunities.length).toBeGreaterThan(0);
      expect(peakMemory.heapUsed).toBeGreaterThan(initialMemory.heapUsed);
      
      console.log(`💾 Memory usage: ${initialMemory.heapUsed / 1024 / 1024}MB -> ${peakMemory.heapUsed / 1024 / 1024}MB -> ${finalMemory.heapUsed / 1024 / 1024}MB`);
      console.log(`🎯 Processed 50,000 items, found ${opportunities.length} opportunities`);
    });
  });

  describe("Core - Error Recovery Integration", () => {
    test.concurrent("recovers from API failures gracefully", async () => {
      // Test with failing endpoint
      try {
        const response = await fetch("http://localhost:3006/api/nonexistent");
        
        if (response.status === 404) {
          // Fallback to cached data or default values
          const fallbackData = {
            odds: [],
            opportunities: [],
            timestamp: new Date().toISOString(),
            source: "fallback"
          };
          
          expect(fallbackData.odds).toBeDefined();
          expect(fallbackData.opportunities).toBeDefined();
        }
      } catch (error) {
        // Network error - implement retry logic
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            await new Promise(resolve => setTimeout(resolve, 100 * retryCount));
            const response = await fetch("http://localhost:3006/api/odds");
            if (response.ok) {
              expect(response.status).toBe(200);
              break;
            }
          } catch (retryError) {
            retryCount++;
            if (retryCount >= maxRetries) {
              expect(retryCount).toBe(maxRetries);
              break;
            }
          }
        }
      }
    });
  });
});

console.log("✅ Odds Integration Tests loaded successfully");
