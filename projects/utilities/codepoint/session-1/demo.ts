#!/usr/bin/env bun

// Demo script for HMR Event Tracker
import { demonstrateHMRTracking, exportHMRData } from "./hmr-event-tracker";

console.log("🚀 HMR Event Tracker Demo");
console.log("========================\n");

// Run the main demonstration
const { servers, devServer } = demonstrateHMRTracking();

// Additional real-time simulation
console.log("\n🔄 Simulating Real-time HMR Events...");
console.log("=====================================");

let eventCount = 0;
const maxEvents = 10;

const simulationInterval = setInterval(() => {
  if (eventCount >= maxEvents) {
    clearInterval(simulationInterval);
    console.log("\n✅ Simulation complete!");

    // Final export demonstration
    console.log("\n📤 Final Data Export:");
    console.log(exportHMRData(devServer, "json"));
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
    console.log(`\n📊 Update ${eventCount / 2}:`);
    console.log(`Total Events: ${devServer.hmrEvents.length}`);
    console.log(
      `Last Event: ${devServer.hmrEvents[devServer.hmrEvents.length - 1].name}`
    );
  }
}, 1000);

console.log("📡 Monitoring HMR events... (will run for 10 seconds)");
