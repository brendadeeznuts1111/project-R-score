#!/usr/bin/env bun
/**
 * @fileoverview Demo: Bun Console Depth Features
 * @description Demonstrates Bun's --console-depth CLI argument and Bun.inspect.custom for arrays
 *              for debugging complex Hyper-Bun data structures.
 * @module examples/demos/demo-console-depth
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-EXAMPLE@7.0.0.0.0.0.0;instance-id=EXAMPLE-CONSOLE-DEPTH-001;version=7.0.0.0.0.0.0}]
 * [PROPERTIES:{example={value:"Console Depth Demo";@root:"ROOT-EXAMPLES";@chain:["BP-EXAMPLES","BP-DEMO"];@version:"7.0.0.0.0.0.0"}}]
 * [CLASS:ConsoleDepthDemo][#REF:v-7.0.0.0.0.0.0.BP.EXAMPLES.DEMO.1.0.A.1.1.EXAMPLE.1.1]]
 * 
 * Version: 7.0.0.0.0.0.0
 * Ripgrep Pattern: 7\.0\.0\.0\.0\.0\.0|EXAMPLE-CONSOLE-DEPTH-001|BP-EXAMPLE@7\.0\.0\.0\.0\.0\.0
 * 
 * Features:
 * - Demonstrates --console-depth CLI argument
 * - Shows custom array inspection with Bun.inspect.custom
 * - Examples with Hyper-Bun data structures
 * 
 * @example 7.0.0.0.0.0.0.1: Console Depth with Nested Objects
 * // Test Formula:
 * // 1. Create deeply nested object structure
 * // 2. Use console.log() with different --console-depth values
 * // 3. Observe how depth affects output visibility
 * // Expected Result: Deeper depth shows more nested levels
 * //
 * // Snippet:
 * ```bash
 * bun --console-depth=3 run examples/demos/demo-console-depth.ts
 * bun --console-depth=7 run examples/demos/demo-console-depth.ts
 * ```
 * 
 * @example 7.0.0.0.0.0.0.2: Custom Array Inspector
 * // Test Formula:
 * // 1. Create class with Bun.inspect.custom for array-like objects
 * // 2. Log instance with console.log()
 * // 3. Verify custom formatting is applied
 * // Expected Result: Custom array formatting displays correctly
 * //
 * // Snippet:
 * ```typescript
 * class MarketDataArray {
 *   [Bun.inspect.custom](depth: number, options: any): string {
 *     return `Custom formatted: ${this.items.length} items`;
 *   }
 * }
 * ```
 * 
 * // Ripgrep: 7.0.0.0.0.0.0
 * // Ripgrep: EXAMPLE-CONSOLE-DEPTH-001
 * // Ripgrep: BP-EXAMPLE@7.0.0.0.0.0.0
 */


// ============================================================================
// DEMONSTRATION 1: Console Depth with Nested Objects
// ============================================================================

function demonstrateConsoleDepth() {
  console.log("\n" + "=".repeat(80));
  console.log("📊 DEMONSTRATION 1: Console Depth with Nested Objects");
  console.log("=".repeat(80));
  
  // Simulate Hyper-Bun market intelligence graph structure
  const marketIntelligenceNode = {
    nodeId: "betfair:12345",
    bookmaker: "betfair",
    analysis: {
      marketHealth: {
        riskLevel: "low",
        confidence: 0.95,
        factors: {
          liquidity: {
            score: 0.9,
            trend: "increasing",
            historical: {
              last24h: { avg: 0.85, min: 0.7, max: 0.95 },
              last7d: { avg: 0.82, min: 0.65, max: 0.98 }
            }
          },
          volatility: {
            score: 0.3,
            trend: "stable",
            metrics: {
              stdDev: 0.15,
              coefficient: 0.25
            }
          }
        }
      },
      recommendations: [
        {
          type: "monitor",
          priority: "high",
          reason: "liquidity-trend",
          action: {
            threshold: 0.8,
            alert: true
          }
        },
        {
          type: "alert",
          priority: "medium",
          reason: "volatility-change",
          action: {
            threshold: 0.4,
            alert: false
          }
        }
      ]
    }
  };

  console.log("\n🔍 Market Intelligence Node Structure:");
  console.log("Note: The --console-depth flag controls how many levels are displayed");
  console.log("\nCurrent console depth setting affects this output:");
  console.log(marketIntelligenceNode);
  
  console.log("\n💡 Try running with different depths:");
  console.log("  bun --console-depth=3 run examples/demos/demo-console-depth.ts");
  console.log("  bun --console-depth=5 run examples/demos/demo-console-depth.ts");
  console.log("  bun --console-depth=7 run examples/demos/demo-console-depth.ts");
}

// ============================================================================
// DEMONSTRATION 2: Performance Statistics with Deep Nesting
// ============================================================================

function demonstratePerformanceStats() {
  console.log("\n" + "=".repeat(80));
  console.log("📈 DEMONSTRATION 2: Performance Statistics");
  console.log("=".repeat(80));

  const performanceStats = {
    operation: "market-scan",
    timestamp: Date.now(),
    statistics: {
      mean: 125.5,
      median: 120.0,
      p95: 250.0,
      p99: 400.0,
      distribution: {
        buckets: [
          { range: "0-50ms", count: 100, percentage: 20 },
          { range: "50-100ms", count: 250, percentage: 50 },
          { range: "100-200ms", count: 150, percentage: 30 }
        ],
        anomalies: {
          detected: 5,
          details: [
            {
              timestamp: 1234567890,
              duration: 500,
              reason: "network-latency",
              context: {
                endpoint: "/api/markets",
                statusCode: 200,
                retries: 2
              }
            }
          ]
        }
      }
    }
  };

  console.log("\n🔍 Performance Statistics Structure:");
  console.log(performanceStats);
  console.log("\n💡 With --console-depth=6, you'll see full distribution and anomaly details");
}

// ============================================================================
// DEMONSTRATION 3: Custom Array Inspector
// ============================================================================

class MarketScanResults {
  constructor(
    private markets: Array<{
      bookmaker: string;
      nodeId: string;
      analysis?: {
        riskLevel: string;
        recommendations: Array<{ type: string; priority: string }>;
      };
    }>
  ) {}

  [Bun.inspect.custom](depth: number, options: any): string {
    if (depth < 0) {
      return `[${this.markets.length} markets]`;
    }

    const lines: string[] = [
      `📊 Market Scan Results (${this.markets.length} markets):`,
    ];

    const maxItems = depth > 5 ? 15 : depth > 3 ? 10 : 5;
    const displayMarkets = this.markets.slice(0, maxItems);

    displayMarkets.forEach((market, i) => {
      const risk = market.analysis?.riskLevel || 'unknown';
      const recs = market.analysis?.recommendations?.length || 0;
      const status = market.analysis ? '✅' : '⏳';
      lines.push(
        `  ${status} [${i}] ${market.bookmaker}:${market.nodeId} - Risk: ${risk}, Recommendations: ${recs}`
      );
    });

    if (this.markets.length > maxItems) {
      lines.push(`  ... and ${this.markets.length - maxItems} more markets`);
    }

    if (depth > 3) {
      lines.push(`\n  Summary:`);
      lines.push(`    Total Markets: ${this.markets.length}`);
      const analyzed = this.markets.filter(m => m.analysis).length;
      lines.push(`    Analyzed: ${analyzed}`);
      lines.push(`    Pending: ${this.markets.length - analyzed}`);
    }

    return lines.join('\n');
  }
}

function demonstrateCustomArrayInspector() {
  console.log("\n" + "=".repeat(80));
  console.log("🎨 DEMONSTRATION 3: Custom Array Inspector");
  console.log("=".repeat(80));

  const scanResults = new MarketScanResults([
    {
      bookmaker: "betfair",
      nodeId: "12345",
      analysis: {
        riskLevel: "low",
        recommendations: [
          { type: "monitor", priority: "high" },
          { type: "alert", priority: "medium" }
        ]
      }
    },
    {
      bookmaker: "pinnacle",
      nodeId: "67890",
      analysis: {
        riskLevel: "medium",
        recommendations: [
          { type: "monitor", priority: "low" }
        ]
      }
    },
    {
      bookmaker: "draftkings",
      nodeId: "11111",
      // No analysis yet
    },
    {
      bookmaker: "bet365",
      nodeId: "22222",
      analysis: {
        riskLevel: "high",
        recommendations: [
          { type: "alert", priority: "high" },
          { type: "monitor", priority: "high" }
        ]
      }
    },
    {
      bookmaker: "william-hill",
      nodeId: "33333",
      analysis: {
        riskLevel: "low",
        recommendations: []
      }
    }
  ]);

  console.log("\n🔍 Custom Array Inspector Output:");
  console.log("Note: Bun.inspect.custom respects --console-depth setting");
  console.log("\n" + scanResults.toString());
  
  console.log("\n💡 Try with different depths:");
  console.log("  bun --console-depth=3 run examples/demos/demo-console-depth.ts");
  console.log("  bun --console-depth=7 run examples/demos/demo-console-depth.ts");
}

// ============================================================================
// DEMONSTRATION 4: Arbitrage Opportunity Structure
// ============================================================================

function demonstrateArbitrageStructure() {
  console.log("\n" + "=".repeat(80));
  console.log("💰 DEMONSTRATION 4: Arbitrage Opportunity Structure");
  console.log("=".repeat(80));

  const arbitrageOpportunity = {
    id: "arb-001",
    timestamp: Date.now(),
    markets: {
      source: {
        venue: "betfair",
        market: {
          id: "bf-123",
          type: "back-lay",
          odds: {
            back: { price: 2.5, size: 100, commission: 0.05 },
            lay: { price: 2.4, size: 150, commission: 0.05 }
          },
          metadata: {
            event: "Premier League Match",
            selection: "Home Win"
          }
        }
      },
      target: {
        venue: "pinnacle",
        market: {
          id: "pin-456",
          type: "back",
          odds: {
            back: { price: 2.6, size: 200, commission: 0.0 }
          },
          metadata: {
            event: "Premier League Match",
            selection: "Home Win"
          }
        }
      }
    },
    calculation: {
      profit: {
        percentage: 2.5,
        absolute: 5.0,
        afterCommission: 4.5
      },
      risk: {
        exposure: 100,
        mitigation: "hedge-available",
        hedgeOptions: [
          { venue: "betfair", cost: 2.0, coverage: 0.95 },
          { venue: "pinnacle", cost: 1.5, coverage: 0.90 }
        ]
      }
    }
  };

  console.log("\n🔍 Arbitrage Opportunity Structure:");
  console.log(arbitrageOpportunity);
  console.log("\n💡 With --console-depth=7, you'll see full profit/risk calculations");
}

// ============================================================================
// MAIN DEMONSTRATION
// ============================================================================

async function main() {
  console.log("\n" + "╔".repeat(40));
  console.log("║".padEnd(79) + "║");
  console.log("║" + "  Bun Console Depth Features Demo (7.0.0.0.0.0.0)".padEnd(77) + "║");
  console.log("║".padEnd(79) + "║");
  console.log("╚".repeat(40));
  
  console.log("\n📖 This demo shows how --console-depth affects object inspection");
  console.log("   and demonstrates custom array inspectors for Hyper-Bun data.\n");

  // Run all demonstrations
  demonstrateConsoleDepth();
  demonstratePerformanceStats();
  demonstrateCustomArrayInspector();
  demonstrateArbitrageStructure();
  demonstrateDeepConsoleLog();

  console.log("\n" + "=".repeat(80));
  console.log("✅ Demo Complete!");
  console.log("=".repeat(80));
  console.log("\n📚 For more information, see:");
  console.log("   docs/7.0.0.0.0.0.0-CONSOLE-DEPTH-DEBUGGING.md");
  console.log("\n🔍 Ripgrep patterns:");
  console.log("   rg '7\\.0\\.0\\.0\\.0\\.0\\.0'");
  console.log("   rg 'console-depth|--console-depth'");
  console.log("   rg 'inspect\\.custom\\.bun\\.array'");
  console.log("   rg 'deepConsoleLog|HyperBunInspectContext'");
  console.log();
}

// Run the demo
if (import.meta.main) {
  main().catch(console.error);
}
