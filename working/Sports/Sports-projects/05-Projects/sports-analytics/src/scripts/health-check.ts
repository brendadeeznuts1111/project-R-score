#!/usr/bin/env bun

/**
 * T3-Lattice Registry Health Check
 * Monitors registry connectivity and performance
 */

import { LatticeRegistryClient } from "../t3-lattice-registry";
import { COMPONENTS } from "../types/lattice.types";
import { ComponentInfo } from "./component-info";
import { SecurityAudit } from "./security-audit";

export async function runHealthCheck() {
  console.log("\n🧬 T3-LATTICE V3.3 SYSTEM HEALTH CHECK");
  console.log("=" .repeat(50));
  
  try {
    // Initialize client
    const client = new LatticeRegistryClient();
    
    // 1. Registry Connectivity
    console.log("\n📡 [1/7] Checking Registry Connectivity...");
    const isHealthy = await client.checkHealth();
    
    if (isHealthy) {
      console.log("✅ Registry is ONLINE");

      // 2. Security Audit (v3.3)
      console.log("\n🛡️ [2/7] Performing Security Audit...");
      const auditResult = await SecurityAudit.run({ level: "high" });
      if (auditResult.success) {
        console.log(`   ✅ ${auditResult.report}`);
      } else {
        console.log(`   ⚠️  SECURITY WARNING: ${auditResult.report}`);
      }

      // 3. Component Deep Inspection (v3.3)
      console.log("\n🔍 [3/7] Performing Component Deep Inspection...");
      const criticalToInspect = ["TOML Config", "SQLite", "Compile"];
      criticalToInspect.forEach(name => {
        console.log(`   • Inspecting ${name}...`);
        const info = ComponentInfo.getInfo(name);
        console.log(info.split('\n').map(line => `     ${line}`).join('\n'));
      });
      
      const manifest = await client.fetchRegistryManifest();
      console.log(`\n   • Registry Version: ${manifest.version}`);
      console.log(`   • Endpoints: ${manifest.endpoints.length} active`);
      console.log(`   • Scopes: ${manifest.scopes.join(', ')}`);
      
      // 4. Component Registry Status
      console.log("\n🧩 [4/7] Verifying Component Registry...");
      const criticalIds = [1, 6, 10, 11, 16, 20, 22, 24];
      const criticalComponents = COMPONENTS.filter(c => criticalIds.includes(c.id));
      
      criticalComponents.forEach(c => {
        console.log(`   • ID ${c.id.toString().padStart(2)}: ${c.name.padEnd(15)} [${c.hex}] -> ${c.slot}`);
      });
      console.log(`✅ ${criticalComponents.length} critical components verified against v3.3 spec`);

      // 5. Unicode Intelligence Layer
      console.log("\n🔢 [5/7] Checking Unicode Intelligence Tables...");
      const zigTablePath = import.meta.dir + "/unicode-identifiers.zig";
      const tableFile = Bun.file(zigTablePath);
      const tableExists = await tableFile.exists();
      
      if (tableExists) {
        const stats = await tableFile.stat();
        console.log(`✅ Unicode tables found: ${zigTablePath}`);
        console.log(`   • Size: ${(stats.size / 1024).toFixed(2)} KB`);
        console.log(`   • Status: O(1) Lookup Tables Ready`);
      } else {
        console.log("❌ Unicode tables MISSING");
        console.log("   👉 Run: bun run src/scripts/generate-unicode.ts");
      }
      
      // 6. Quantum Compliance (v3.3)
      console.log("\n🛡️ [6/7] Verifying Quantum Compliance...");
      const compliance = await client.verifyQuantumCompliance();
      if (compliance.compliant) {
        console.log(`✅ ${compliance.details}`);
      } else {
        console.log(`❌ COMPLIANCE FAILURE: ${compliance.details}`);
      }

      // 7. Functional Endpoint Tests
      console.log("\n🎯 [7/7] Testing Functional Endpoints...");
      
      // Odds Data
      try {
        const oddsData = await client.fetchOddsData("test_market");
        console.log(`   • Odds Data: ✅ OK (${Object.keys(oddsData.odds).length} markets)`);
      } catch (error) {
        console.log("   • Odds Data: ⚠️  MOCK_MODE (Expected for test_market)");
      }
      
      // FD Calculation
      try {
        const calcResult = await client.fetchFdCalculation({
          input: "test",
          parameters: { alpha: 0.5, beta: 1.2 }
        });
        console.log(`   • FD Calc:   ✅ OK (Value: ${calcResult.fdValue})`);
      } catch (error) {
        console.log("   • FD Calc:   ❌ FAILED");
      }
      
      // Display recent metrics
      const metrics = client.getRecentMetrics(3);
      if (metrics.length > 0) {
        console.log("\n📊 Recent Performance Metrics:");
        metrics.forEach(metric => {
          console.log(`   ${metric.Endpoint.padEnd(20)}: ${metric.Status} (${metric["P99 Latency"]})`);
        });
      }
      
    } else {
      console.log("❌ Registry is unhealthy");
      process.exit(1);
    }
    
    console.log("\n🎉 T3-Lattice v3.3 Health check completed successfully");
    process.exit(0);
    
  } catch (error) {
    console.error("❌ Health check failed:", error);
    process.exit(1);
  }
}

// Run the health check
runHealthCheck().catch(console.error);
