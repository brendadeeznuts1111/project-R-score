import { feature } from "bun:bundle";

// ✅ Correct: Only one argument
if (feature("DEBUG")) {
  console.info("✅ Debug mode is ENABLED");
} else {
  console.info("❌ Debug mode is DISABLED (eliminated)");
}

// ✅ Correct: Ternary (feature() returns boolean)
const debugStatus = feature("DEBUG") ? "ENABLED" : "DISABLED";
console.info(`Debug status: ${debugStatus}`);

// ✅ Correct: Conditional expression
const message = feature("DEBUG")
  ? "Full debug output enabled"
  : "Minimal output (debug code eliminated)";

console.info(message);
