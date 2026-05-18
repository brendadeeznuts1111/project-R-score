/**
 * @dynamic-spy/kit v9.0 - Enhanced Bun Type Definitions
 * 
 * Fixed TypeScript definitions for industrial DX
 */

/// <reference types="bun-types" />

/**
 * BunLockFile - Lockfile format with documented configVersion
 */
interface BunLockFile {
	/** Lockfile format version - increment when breaking changes */
	configVersion: number;
	modules?: Record<string, any>;
	[key: string]: any;
}

/**
 * Loader types - All supported loaders including CSS/JSONC/YAML/HTML
 */
type Loader =
	| 'js' | 'jsx' | 'ts' | 'tsx'
	| 'json' | 'jsonc'     // ✅ JSONC support
	| 'css'                // ✅ CSS loader
	| 'yaml' | 'yml'       // ✅ YAML loader
	| 'html'               // ✅ HTML loader
	| 'file' | 'text' | 'napi';

/**
 * Basketball Market Types
 */
interface BasketballMarket {
	market: string;
	odds: {
		home: number;
		away: number;
	};
	timestamp: number;
	league?: string;
}

/**
 * Compression Format Types
 */
type CompressionFormat = 'gzip' | 'deflate' | 'brotli' | 'zstd';

/**
 * Compression Stats
 */
interface CompressionStats {
	format: CompressionFormat;
	originalSize: number;
	compressedSize: number;
	compressionRatio: number;
	savingsMB: number;
}

declare global {
	// Extend Bun global if needed
	namespace Bun {
		interface BuildConfig {
			loader?: Record<string, Loader>;
		}
	}
}

export {};



