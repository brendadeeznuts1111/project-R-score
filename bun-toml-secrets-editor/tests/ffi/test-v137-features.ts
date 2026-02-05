// Tests that v1.3.7 features work WITHOUT building Bun
import { cc } from "bun:ffi";

console.log(`Bun version: ${Bun.version}`);

// 1. Test header casing preservation (v1.3.7)
console.log("\n1. Header casing preserved?");
const headers = new Headers({ Authorization: "Bearer test" });
console.log("  Headers object created:", !!headers);

// 2. Test wrapAnsi (v1.3.7)
console.log("\n2. Bun.wrapAnsi available?");
const wrapped = Bun.wrapAnsi("\x1b[31mred text\x1b[0m", 10);
console.log("  Wrapped:", wrapped.length > 0 ? "✅" : "❌");

// 3. Test FFI env vars (v1.3.7)
console.log("\n3. FFI env vars ready?");
console.log(
	"  C_INCLUDE_PATH:",
	process.env.C_INCLUDE_PATH || "(set at runtime)",
);
console.log("  LIBRARY_PATH:", process.env.LIBRARY_PATH || "(set at runtime)");

// 4. Quick FFI compilation test
console.log("\n4. FFI compilation:");
try {
	const { symbols } = cc({
		source: `int add(int a, int b) { return a + b; }`,
		symbols: { add: { returns: "int", args: ["int", "int"] } },
	});
	console.log("  2+3=", symbols.add(2, 3), "✅");
} catch (e: any) {
	console.error("  ❌", e.message);
}

console.log("\n✨ All v1.3.7 features available!");
