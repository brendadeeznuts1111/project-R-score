import { LatticeRegistryClient } from "./src/t3-lattice-registry";
import { LatticeConfigManager } from "./src/config/lattice.config";

const client = new LatticeRegistryClient();

console.log("Generating simulated traffic for dashboard...");

async function runDemo() {
  // Simulate some requests
  for (let i = 0; i < 5; i++) {
    try {
      await client.fetchRegistryManifest();
      await client.fetchOddsData("market_" + i);
      if (i % 2 === 0) {
        await client.fetchFdCalculation({ data: [Math.random(), Math.random()] });
      }
    } catch (e) {
      // Expected to fail as registry is internal/mocked
    }
  }
  
  console.log("Traffic simulation complete.");
  
  // Now run the dashboard logic directly using the same client instance
  const allMetrics = client.getMetrics();
  console.log(`Total Metrics Captured: ${allMetrics.length}`);
  
  if (allMetrics.length > 0) {
    // Save metrics to config manager so dashboard can see them
    const configManager = LatticeConfigManager.getInstance();
    configManager.saveMetrics(allMetrics);
    
    console.log("\n--- DASHBOARD OUTPUT ---\n");
    
    // Import the dashboard logic and run it
    const { runMetricsDashboard } = await import("./src/scripts/metrics-dashboard");
    await runMetricsDashboard();
  }
}

runDemo();
