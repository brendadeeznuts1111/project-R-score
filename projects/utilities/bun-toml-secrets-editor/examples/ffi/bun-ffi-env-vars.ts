import { cc } from "bun:ffi";

// This example demonstrates the new C_INCLUDE_PATH and LIBRARY_PATH support
// in Bun's built-in C compiler (bun:ffi)

const {
	symbols: { hello },
} = cc({
	source: "./examples/hello.c",
	symbols: {
		hello: {
			returns: "int",
		},
	},
});

// Call the C function
const result = hello();
console.log(`C function returned: ${result}`);

// On NixOS, set C_INCLUDE_PATH and LIBRARY_PATH to point to your Nix store paths:
// C_INCLUDE_PATH=/nix/store/...-gcc-.../include LIBRARY_PATH=/nix/store/...-gcc-.../lib bun run examples/bun-ffi-env-vars.ts

// On other systems with non-standard paths:
// C_INCLUDE_PATH=/opt/custom/include LIBRARY_PATH=/opt/custom/lib bun run examples/bun-ffi-env-vars.ts

// Multiple paths are supported (colon-separated):
// C_INCLUDE_PATH=/path1/include:/path2/include LIBRARY_PATH=/path1/lib:/path2/lib bun run examples/bun-ffi-env-vars.ts
