import { feature } from "bun:bundle";

// ✅ Correct: Only one argument
if (feature("DEBUG")) {
  console.log("✅ Debug mode is ENABLED");
} else {
  console.log("❌ Debug mode is DISABLED (eliminated)");
}

// ✅ Correct: Ternary (feature() returns boolean)
const debugStatus = feature("DEBUG") ? "ENABLED" : "DISABLED";
console.log(`Debug status: ${debugStatus}`);

// ✅ Correct: Conditional expression
const message = feature("DEBUG")
  ? "Full debug output enabled"
  : "Minimal output (debug code eliminated)";

console.log(message);
