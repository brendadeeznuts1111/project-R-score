/**
 * This example demonstrates Process Title and Unhandled Rejections.
 * Flags: 
 * - --title <string>: Set initial process title
 * - --unhandled-rejections <strict|throw|warn|none>: Control rejection behavior
 */

console.log(`Current Process Title: ${process.title}`);

// Demonstrating Unhandled Rejections
console.log("\nTriggering an unhandled rejection in 100ms...");
setTimeout(() => {
  Promise.reject(new Error("This is an unhandled rejection demonstration"));
}, 100);

// If running with --unhandled-rejections=throw or strict, this will crash the process.
// If running with --unhandled-rejections=warn (default), it will print a warning.

process.on("unhandledRejection", (reason) => {
  console.log("Caught unhandled rejection via event listener:", reason.message);
});

// Demonstrating Title Change
process.title = "My Bun App";
console.log(`New Process Title: ${process.title}`);

console.log("\nWaiting for rejection to trigger...");
await new Promise(resolve => setTimeout(resolve, 500));
console.log("Finished demonstration.");
