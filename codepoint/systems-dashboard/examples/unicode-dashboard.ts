// examples/unicode-dashboard.ts

import { ScoringInspector } from "../inspectors/ScoringInspector";
import { ScoringService } from "../services/ScoringService";
import type { Config13Byte } from "../types/api.types";

// Create services
const scoringService = new ScoringService();
const inspector = new ScoringInspector(scoringService);

// Create sample config
const config: Config13Byte = {
  version: 1,
  registryHash: 305419896,
  featureFlags: 0b11111001,
  terminalMode: 2,
  rows: 48,
  cols: 80,
  reserved: 0,
};

// Render full Unicode dashboard
console.log(inspector.inspectConfig(config));
console.log("\n\n");
console.log(inspector.inspectSystem());

// Simulate some calculations
setInterval(() => {
  const metrics = {
    performance: Math.random() * 0.3 + 0.7,
    reliability: Math.random() * 0.2 + 0.8,
    security: Math.random() * 0.25 + 0.75,
    scalability: Math.random() * 0.35 + 0.65,
  };

  const { score, fromCache } = scoringService.calculate(metrics);

  // Update dashboard
  inspector.renderDashboard();

  console.log(
    `\nLatest Score: ${score.toFixed(3)} ${fromCache ? "[CACHED]" : ""}`
  );
}, 5000);
