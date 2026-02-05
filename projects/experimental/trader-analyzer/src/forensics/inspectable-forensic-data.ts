/**
 * @fileoverview 9.1.5.24.0.0.0: Inspectable Forensic Binary Data
 * @description Forensic binary data wrapper with advanced Bun.inspect integration
 * @module forensics/inspectable-forensic-data
 *
 * Cross-Reference Hub:
 * - @see 7.1.2.3.1 → Bun.inspect.custom documentation
 * - @see 9.1.5.7.0.0.0 → Orphan Detection System
 * - @see docs/FORENSIC-LOGGING.md → Forensic logging system
 */

import { inspect } from "bun";

/**
 * Base class for inspectable binary data
 */
export class InspectableBinaryData {
	constructor(
		public readonly data: Uint8Array,
		public readonly metadata: Record<string, unknown>,
	) {}

	/**
	 * Custom Bun inspection method
	 */
	[inspect.custom](depth: number, options: any): string {
		if (depth < 0) {
			return options.stylize(`[InspectableBinaryData]`, "special");
		}

		const size = this.data.byteLength;
		const lines = [
			`${options.stylize("InspectableBinaryData", "special")}`,
			`  ${options.stylize("size", "string")}: ${options.stylize(`${size} bytes`, "number")}`,
		];

		// Show metadata
		if (Object.keys(this.metadata).length > 0) {
			lines.push(`  ${options.stylize("metadata", "string")}:`);
			for (const [key, value] of Object.entries(this.metadata)) {
				const valueStr =
					typeof value === "object"
						? JSON.stringify(value).slice(0, 50)
						: String(value);
				lines.push(
					`    ${key}: ${valueStr}${valueStr.length > 50 ? "..." : ""}`,
				);
			}
		}

		return options.colors
			? lines.join("\n")
			: lines.map((l) => l.replace(/\u001b\[\d+m/g, "")).join("\n");
	}
}

/**
 * 9.1.5.24.0.0.0: Forensic Binary Data Wrapper
 *
 * Provides advanced inspection for forensic binary data with metadata,
 * threat level detection, and compression analysis.
 */
export class ForensicBinaryData extends InspectableBinaryData {
	constructor(
		data: Uint8Array,
		metadata: {
			auditId: number;
			bookmaker: string;
			eventId: string;
			captureTimestamp: number;
			urlSignature: string;
			threatLevel: "none" | "suspicious" | "malicious";
			originalSize?: number;
		},
	) {
		super(data, metadata);
	}

	/**
	 * 9.1.5.24.1.0.0: Custom inspection for forensic context
	 */
	[inspect.custom](depth: number, options: any): string {
		if (depth < 0) {
			return options.stylize(
				`[ForensicData #${this.metadata.auditId}`,
				"special",
			);
		}

		const size = this.data.byteLength;
		const threatLevel = this.metadata.threatLevel as string;
		const threatColor =
			threatLevel === "malicious"
				? "regex"
				: threatLevel === "suspicious"
					? "undefined"
					: "boolean";

		const lines = [
			`${options.stylize("ForensicBinaryData", "special")} #${this.metadata.auditId}`,
			`  ${options.stylize("bookmaker", "string")}: ${options.stylize(this.metadata.bookmaker as string, "string")}`,
			`  ${options.stylize("eventId", "string")}: ${options.stylize(this.metadata.eventId as string, "string")}`,
			`  ${options.stylize("size", "string")}: ${options.stylize(`${size} bytes`, "number")}`,
			`  ${options.stylize("threat", "string")}: ${options.stylize(threatLevel.toUpperCase(), threatColor)}`,
			`  ${options.stylize("captured", "string")}: ${new Date(this.metadata.captureTimestamp as number).toISOString()}`,
		];

		// Add hex preview for small data
		if (size < 256) {
			const preview = Array.from(this.data.slice(0, 32))
				.map((b) => b.toString(16).padStart(2, "0"))
				.join(" ");
			lines.push(
				`  ${options.stylize("hex", "string")}: ${preview}${size > 32 ? "..." : ""}`,
			);
		}

		// Show compression analysis if depth allows
		if (depth > 0) {
			try {
				const compression = this.analyzeCompressionRatio();
				lines.push(
					`  ${options.stylize("compression", "string")}: ${compression.ratio.toFixed(2)}x (${compression.original} → ${compression.compressed} bytes)`,
				);
			} catch {
				// Ignore compression errors
			}
		}

		return options.colors
			? lines.join("\n")
			: lines.map((l) => l.replace(/\u001b\[\d+m/g, "")).join("\n");
	}

	/**
	 * 9.1.5.24.2.0.0: Analyze compression ratio
	 */
	analyzeCompressionRatio(): {
		original: number;
		compressed: number;
		ratio: number;
	} {
		const original =
			(this.metadata.originalSize as number) || this.data.byteLength;
		// Create a new ArrayBuffer copy for compression
		const bufferCopy = this.data.slice();
		const compressed = Bun.gzipSync(bufferCopy).byteLength;

		return {
			original,
			compressed,
			ratio: compressed / original,
		};
	}

	/**
	 * 9.1.5.24.3.0.0: Decode as JSON
	 */
	decodeAsJson(): any {
		try {
			// Create a copy for decompression
			const bufferCopy = this.data.slice();
			const decompressed = Bun.gunzipSync(bufferCopy);
			return JSON.parse(new TextDecoder().decode(decompressed));
		} catch {
			// If not compressed, try direct decode
			return JSON.parse(new TextDecoder().decode(this.data));
		}
	}
}
