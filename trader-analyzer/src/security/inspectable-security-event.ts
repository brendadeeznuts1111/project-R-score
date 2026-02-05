/**
 * @fileoverview 9.1.5.25.0.0.0: Inspectable Security Event
 * @description Security threat inspection with advanced Bun.inspect integration
 * @module security/inspectable-security-event
 *
 * Cross-Reference Hub:
 * - @see 7.1.2.3.1 → Bun.inspect.custom documentation
 * - @see 9.1.5.24.0.0.0 → Forensic Binary Data
 * - @see src/security/ → Security monitoring system
 */

import { inspect } from "bun";
import { InspectableBinaryData } from "../forensics/inspectable-forensic-data";

/**
 * 9.1.5.25.0.0.0: Inspectable Security Threat
 *
 * Provides advanced inspection for security threats with severity levels,
 * context analysis, and threat classification.
 */
export class InspectableSecurityThreat extends InspectableBinaryData {
	constructor(
		data: Uint8Array,
		metadata: {
			threatId: string;
			threatType: string;
			severity: number;
			context: any;
			detectedAt: number;
			bookmaker?: string;
			url?: string;
		},
	) {
		super(data, metadata);
	}

	/**
	 * 9.1.5.25.1.0.0: Custom inspection for security threats
	 */
	[inspect.custom](depth: number, options: any): string {
		if (depth < 0) {
			return options.stylize(`[Threat:${this.metadata.threatType}]`, "regex");
		}

		const lines = [
			`${options.stylize("SECURITY THREAT", "regex")} #${this.metadata.threatId}`,
			`  ${options.stylize("type", "string")}: ${options.stylize(this.metadata.threatType as string, "string")}`,
			`  ${options.stylize("severity", "string")}: ${this.formatSeverity(options)}`,
			`  ${options.stylize("bookmaker", "string")}: ${options.stylize((this.metadata.bookmaker as string) || "system", "string")}`,
			`  ${options.stylize("detected", "string")}: ${new Date(this.metadata.detectedAt as number).toISOString()}`,
		];

		if (this.metadata.url) {
			const urlPreview =
				(this.metadata.url as string).length > 60
					? (this.metadata.url as string).substring(0, 60) + "..."
					: (this.metadata.url as string);
			lines.push(`  ${options.stylize("url", "string")}: ${urlPreview}`);
		}

		// Show context summary
		if (this.metadata.context && depth > 0) {
			lines.push(`  ${options.stylize("context", "string")}:`);
			const contextStr = Bun.inspect(this.metadata.context, {
				...options,
				depth: depth - 1,
			}).replace(/\n/g, "\n    ");
			lines.push(`    ${contextStr}`);
		}

		return options.colors
			? lines.join("\n")
			: lines.map((l) => l.replace(/\u001b\[\d+m/g, "")).join("\n");
	}

	/**
	 * Format severity level with color coding
	 */
	private formatSeverity(options: any): string {
		const sev = this.metadata.severity as number;
		if (sev >= 9) return options.stylize("CRITICAL", "regex");
		if (sev >= 7) return options.stylize("HIGH", "special");
		if (sev >= 5) return options.stylize("MEDIUM", "undefined");
		return options.stylize("LOW", "boolean");
	}
}
