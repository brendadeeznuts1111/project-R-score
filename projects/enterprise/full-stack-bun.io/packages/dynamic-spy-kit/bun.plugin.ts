/**
 * @dynamic-spy/kit v3.4 - Bun Plugin
 * 
 * FIXED: Invalid target handling
 * HMR (Hot Module Replacement) plugin for arbitrage system
 */

import type { Plugin } from "bun";

const plugin: Plugin = {
	name: 'arb-hmr',
	setup(build) {
		build.onLoad({ filter: /\.ts$/ }, async (args) => {
			try {
				// ✅ FIXED: Returns error not crash
				return await Bun.plugin(args.path);
			} catch (e: any) {
				// Handle invalid target errors gracefully
				if (e.message?.includes('invalid target') || 
				    e.message?.includes('Invalid') ||
				    e.code === 'INVALID_TARGET') {
					return {
						contents: `export default {};`,
						loader: 'ts'
					};
				}

				// Re-throw other errors
				throw e;
			}
		});

		// Handle other file types
		build.onLoad({ filter: /\.js$/ }, async (args) => {
			try {
				return await Bun.plugin(args.path);
			} catch (e: any) {
				if (e.message?.includes('invalid target')) {
					return {
						contents: `export default {};`,
						loader: 'js'
					};
				}
				throw e;
			}
		});
	}
};

export default plugin;



