#!/usr/bin/env bun

/**
 * T3-Lattice Registry Client Application
 * Main entry point for the registry client
 */

import { LatticeRegistryClient } from "../t3-lattice-registry";
import { demonstrateLatticeClient } from "../t3-lattice-registry";

async function main() {
  console.info("🌐 T3-Lattice Registry Client v1.2.1");
  console.info("=" .repeat(50));
  
  try {
    // Check if we have the required environment variables
    if (!process.env.LATTICE_TOKEN) {
      console.error("❌ Error: LATTICE_TOKEN environment variable is required");
      console.info("Please set your LATTICE_TOKEN in the .env.lattice file");
      process.exit(1);
    }

    // Show configuration
    console.info("⚙️  Configuration:");
    console.info(`  Registry URL: ${process.env.LATTICE_REGISTRY_URL || "https://registry.lattice.internal/v1"}`);
    console.info(`  Max HTTP Requests: ${process.env.BUN_CONFIG_MAX_HTTP_REQUESTS || "256"}`);
    console.info(`  CSRF Enabled: ${process.env.LATTICE_CSRF_ENABLED !== "false"}`);
    console.info(`  Quantum Audit: ${process.env.LATTICE_QUANTUM_AUDIT_ENABLED !== "false"}`);
    console.info(`  Compression: ${process.env.LATTICE_COMPRESSION !== "false"}`);
    console.info();

    // Initialize client
    const client = new LatticeRegistryClient();
    
    // Run demonstration
    await demonstrateLatticeClient();
    
    console.info("\n🎉 Client demonstration completed successfully!");
    
  } catch (error) {
    console.error("❌ Application failed:", error);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case "health":
    // Run health check
    import("./health-check.js").then(module => {
      module.runHealthCheck().catch(console.error);
    }).catch(console.error);
    break;
    
  case "metrics":
    // Run metrics dashboard
    import("./metrics-dashboard.js").then(module => {
      module.runMetricsDashboard().catch(console.error);
    }).catch(console.error);
    break;
    
  case "audit":
    // Run audit review
    import("./audit-review.js").then(module => {
      module.runAuditReview().catch(console.error);
    }).catch(console.error);
    break;
    
  case "demo":
    // Run demonstration
    main().catch(console.error);
    break;
    
  default:
    // Default to running the main application
    main().catch(console.error);
    break;
}
