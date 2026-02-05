/**
 * Phone Profile Validator with Scope Analysis
 *
 * Integrates Levenshtein similarity scanning with BunX phone management entities
 * Prevents configuration conflicts and naming issues across multi-account system
 */

import type { ResourceBundleConfig } from "../resource-bundle/types";
import { coreLogger as logger } from "../shared/logger.js";
import { type ScannerConfig, ScopeScanner, type ScopeScanResult } from "./scope-scanner";

export interface PhoneProfile {
	id: string;
	resourceBundle: ResourceBundleConfig;
	metadata?: {
		accountType: string;
		region: string;
		createdAt: string;
	};
}

export interface ValidationReport {
	profileId: string;
	isValid: boolean;
	conflicts: Array<{
		var1: { name: string; line: number };
		var2: { name: string; line: number };
		similarity: number;
	}>;
	recommendation: string;
	scanTime: number;
	variableCount: number;
}

export class PhoneProfileValidator {
	private scopeScanner: ScopeScanner;

	constructor(
		config: ScannerConfig = {
			similarityThreshold: 0.25, // Stricter for critical config
			minNameLength: 4,
			ignorePatterns: [/^_/, /^temp_/, /^tmp_/, /^debug_/],
			ignoreTypes: ["any", "unknown"],
		},
	) {
		this.scopeScanner = new ScopeScanner(config);
	}

	// Validate your PhoneProfile entity
	async validatePhoneProfile(profile: PhoneProfile): Promise<ValidationReport> {
		const startTime = performance.now();

		this.scopeScanner.enterScope(`PhoneProfile_${profile.id}`);

		// Scan configuration keys for similarity
		const configKeys = Object.keys(profile.resourceBundle);
		for (let idx = 0; idx < configKeys.length; idx++) {
			this.scopeScanner.addVariable({
				name: configKeys[idx],
				scope: "method",
				line: idx + 1,
				type: "config",
			});
		}

		// Scan nested objects in resource bundle
		if (profile.resourceBundle.proxy) {
			const proxyKeys = Object.keys(profile.resourceBundle.proxy);
			for (let idx = 0; idx < proxyKeys.length; idx++) {
				this.scopeScanner.addVariable({
					name: `proxy_${proxyKeys[idx]}`,
					scope: "method",
					line: configKeys.length + idx + 1,
					type: "proxy",
				});
			}
		}

		if (profile.resourceBundle.email) {
			const emailKeys = Object.keys(profile.resourceBundle.email);
			for (let idx = 0; idx < emailKeys.length; idx++) {
				this.scopeScanner.addVariable({
					name: `email_${emailKeys[idx]}`,
					scope: "method",
					line: configKeys.length + idx + 1,
					type: "email",
				});
			}
		}

		// Check for potential resource bundle conflicts
		const result = this.scopeScanner.scanCurrentScope();
		const scanTime = performance.now() - startTime;

		this.scopeScanner.exitScope();

		return {
			profileId: profile.id,
			isValid: !result.hasConflicts,
			conflicts: result.conflicts.map((c) => ({
				var1: { name: c.var1.name, line: c.var1.line },
				var2: { name: c.var2.name, line: c.var2.line },
				similarity: c.similarity,
			})),
			recommendation: result.hasConflicts
				? "Rename configuration keys to reduce confusion risk in multi-account environment"
				: "No naming conflicts detected - profile is safe for deployment",
			scanTime,
			variableCount: result.variableCount,
		};
	}

	// Batch validate multiple profiles (optimized for Bun performance)
	async batchValidateProfiles(profiles: PhoneProfile[]): Promise<ValidationReport[]> {
		logger.info(`🔍 Starting batch validation of ${profiles.length} phone profiles...`);

		const results = await Promise.all(
			profiles.map(async (profile) => {
				// CPU-intensive work runs on Bun's fast JSC engine
				return this.validatePhoneProfile(profile);
			}),
		);

		// Performance metrics
		const totalTime = results.reduce((sum, r) => sum + r.scanTime, 0);
		const avgTime = totalTime / results.length;
		const problematicProfiles = results.filter((r) => !r.isValid);

		logger.info(`\n📊 Batch Validation Results:`);
		logger.info(`  - Total profiles: ${results.length}`);
		logger.info(`  - Problematic: ${problematicProfiles.length}`);
		logger.info(`  - Average scan time: ${avgTime.toFixed(2)}ms`);
		logger.info(`  - Total time: ${totalTime.toFixed(2)}ms`);

		return results;
	}

	// Validate specific configuration sections
	validateConfigSection(
		config: Record<string, any>,
		sectionName: string,
	): ScopeScanResult {
		this.scopeScanner.enterScope(`ConfigSection_${sectionName}`);

		const keys = Object.keys(config);
		for (let idx = 0; idx < keys.length; idx++) {
			this.scopeScanner.addVariable({
				name: keys[idx],
				scope: "method",
				line: idx + 1,
				type: sectionName,
			});
		}

		const result = this.scopeScanner.scanCurrentScope();
		this.scopeScanner.exitScope();

		return result;
	}

	// Generate recommendations for problematic profiles
	generateRecommendations(report: ValidationReport): string[] {
		const recommendations: string[] = [];

		if (report.conflicts.length > 0) {
			recommendations.push("🔧 Configuration Naming Issues:");

			for (const conflict of report.conflicts) {
				const similarity = (conflict.similarity * 100).toFixed(1);
				recommendations.push(
					`   • "${conflict.var1.name}" and "${conflict.var2.name}" are ${similarity}% similar`,
				);
				recommendations.push(
					`     Suggestion: Rename to be more descriptive (e.g., "primaryProxy" vs "backupProxy")`,
				);
			}

			recommendations.push("\n💡 Best Practices:");
			recommendations.push(
				"   • Use descriptive prefixes (primary_, backup_, fallback_)",
			);
			recommendations.push("   • Avoid similar suffixes (_config, _settings, _options)");
			recommendations.push(
				"   • Consider domain-specific naming (sms_, email_, proxy_)",
			);
		}

		return recommendations;
	}

	// Export validation report to JSON for CI/CD integration
	exportReport(report: ValidationReport): string {
		return JSON.stringify(
			{
				timestamp: new Date().toISOString(),
				profile: report.profileId,
				status: report.isValid ? "PASS" : "FAIL",
				metrics: {
					variableCount: report.variableCount,
					scanTime: report.scanTime,
					conflictCount: report.conflicts.length,
				},
				conflicts: report.conflicts,
				recommendation: report.recommendation,
			},
			null,
			2,
		);
	}
}
