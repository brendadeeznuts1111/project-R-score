// Type definitions for Bun bundle feature flags
declare module "bun:bundle" {
	interface Registry {
		features: "INTERACTIVE" | "PREMIUM" | "DEBUG" | "BETA_FEATURES";
	}

	export function feature(name: keyof Registry["features"]): boolean;
}
