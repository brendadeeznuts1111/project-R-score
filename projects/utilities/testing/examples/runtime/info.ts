/**
 * This example demonstrates basic Bun runtime information APIs.
 * Reference: https://bun.com/docs/runtime#runtime-%26-process-control
 */

console.log("--- Bun Runtime Info ---");
console.log(`Bun version:  ${Bun.version}`);
console.log(`Bun revision: ${Bun.revision}`);
console.log(`Entry point:  ${Bun.main}`);
console.log(`Arguments:    ${JSON.stringify(Bun.argv)}`);

// Bun.env is a proxy to process.env but faster
console.log(`Environment:  ${Bun.env.NODE_ENV || "development"}`);

// Check if we are running in a specific environment
if (Bun.env.USER) {
  console.log(`Current User: ${Bun.env.USER}`);
}

console.log("\n--- Process Memory Usage ---");
console.log(process.memoryUsage());

console.log("\n--- CPU Usage ---");
console.log(process.cpuUsage());
