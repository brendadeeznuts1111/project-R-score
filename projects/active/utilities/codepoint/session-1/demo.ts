#!/usr/bin/env bun

// Demo script for HMR Event Tracker
import { demonstrateHMRTracking, exportHMRData } from "./hmr-event-tracker";

console.info("🚀 HMR Event Tracker Demo");
console.info("========================\n");

// Run the main demonstration
const { servers, devServer } = demonstrateHMRTracking();

// Additional real-time simulation
console.info("\n🔄 Simulating Real-time HMR Events...");
console.info("=====================================");

let eventCount = 0;
const maxEvents = 10;

const simulationInterval = setInterval(() => {
  if (eventCount >= maxEvents) {
    clearInterval(simulationInterval);
    console.info("\n✅ Simulation complete!");

    // Final export demonstration
    console.info("\n📤 Final Data Export:");
    console.info(exportHMRData(devServer, "json"));
    return;
  }

  // Simulate random HMR events
  const eventTypes = [
    "ws:connect",
    "beforeUpdate",
    "afterUpdate",
    "invalidate",
    "ws:disconnect",
  ];
  const randomEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)];

  devServer.logHMREvent(randomEvent as any, {
    module: `module-${Math.floor(Math.random() * 10)}.js`,
    duration: Math.floor(Math.random() * 200),
  });

  eventCount++;

  // Update display every 2 events
  if (eventCount % 2 === 0) {
    console.info(`\n📊 Update ${eventCount / 2}:`);
    console.info(`Total Events: ${devServer.hmrEvents.length}`);
    console.info(
      `Last Event: ${devServer.hmrEvents[devServer.hmrEvents.length - 1].name}`
    );
  }
}, 1000);

console.info("📡 Monitoring HMR events... (will run for 10 seconds)");
