/**
 * This example demonstrates basic Bun runtime information APIs.
 * Reference: https://bun.com/docs/runtime#runtime-%26-process-control
 */

console.info("--- Bun Runtime Info ---");
console.info(`Bun version:  ${Bun.version}`);
console.info(`Bun revision: ${Bun.revision}`);
console.info(`Entry point:  ${Bun.main}`);
console.info(`Arguments:    ${JSON.stringify(Bun.argv)}`);

// Bun.env is a proxy to process.env but faster
console.info(`Environment:  ${Bun.env.NODE_ENV || "development"}`);

// Check if we are running in a specific environment
if (Bun.env.USER) {
  console.info(`Current User: ${Bun.env.USER}`);
}

console.info("\n--- Process Memory Usage ---");
console.info(process.memoryUsage());

console.info("\n--- CPU Usage ---");
console.info(process.cpuUsage());
