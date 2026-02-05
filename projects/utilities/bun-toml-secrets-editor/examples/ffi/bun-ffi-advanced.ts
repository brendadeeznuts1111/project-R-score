import { cc } from "bun:ffi";

// Advanced example showing complex usage with custom headers and libraries
// This demonstrates how C_INCLUDE_PATH and LIBRARY_PATH enable compilation
// on systems like NixOS that don't use standard FHS paths

const {
	symbols: { complex_example },
} = cc({
	source: "./examples/complex.c",
	symbols: {
		complex_example: {
			returns: "int",
		},
	},
	// You can also specify additional libraries to link against
	// libraries: ["m"],  // Link with math library
});

// Call the complex C function
const result = complex_example();
console.log(`Complex C function returned: ${result}`);

// Environment variables usage examples:

// 1. NixOS example (most common use case):
// export C_INCLUDE_PATH="/nix/store/abcd1234-gcc-11.3.0/include:/nix/store/efgh5678-glibc-2.35/include"
// export LIBRARY_PATH="/nix/store/abcd1234-gcc-11.3.0/lib:/nix/store/efgh5678-glibc-2.35/lib"
// bun run examples/bun-ffi-advanced.ts

// 2. Custom development environment:
// export C_INCLUDE_PATH="/opt/dev/include:/usr/local/include"
// export LIBRARY_PATH="/opt/dev/lib:/usr/local/lib"
// bun run examples/bun-ffi-advanced.ts

// 3. Cross-compilation setup:
// export C_INCLUDE_PATH="/usr/aarch64-linux-gnu/include"
// export LIBRARY_PATH="/usr/aarch64-linux-gnu/lib"
// bun run examples/bun-ffi-advanced.ts

// 4. Docker/containerized environment:
// export C_INCLUDE_PATH="/container/include"
// export LIBRARY_PATH="/container/lib"
// bun run examples/bun-ffi-advanced.ts

console.log("Environment variables are automatically read by bun:ffi");
console.log("C_INCLUDE_PATH:", process.env.C_INCLUDE_PATH || "not set");
console.log("LIBRARY_PATH:", process.env.LIBRARY_PATH || "not set");
