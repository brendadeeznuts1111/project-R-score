/**
 * DDD-Aware Scope Analyzer for BunX Phone Management System
 *
 * Provides semantic analysis of variables within specific bounded contexts (DDD)
 * Integrates with ScopeScanner and UnicodeAwareComparator for high-precision detection
 */

import { ScopeScanner, type VariableInfo } from "./scope-scanner";
import { UnicodeAwareComparator } from "./unicode-similarity";

export interface BoundedContextConfig {
	entities: string[];
	valueObjects: string[];
	aggregateRoots: string[];
}

export interface SimilarityViolation {
	name1: string;
	name2: string;
	similarity: number;
	context: string;
	risk: "low" | "medium" | "high";
}

export interface AnalysisResult {
	domainViolations: string[];
	similarityViolations: SimilarityViolation[];
	recommendations: string[];
}

export class DDDScopeAnalyzer {
	private scanners = new Map<string, ScopeScanner>();
	private unicodeComparator = new UnicodeAwareComparator();

	// Analyze AccountAgent aggregate root
	analyzeAccountAgent(source: string): AnalysisResult {
		const scanner = this.getScanner("AccountManagement");
		scanner.enterScope("AccountAgent");

		const ast = this.parseTypeScript(source);
		const variables = this.extractVariables(ast);

		// Domain-specific rules for AccountAgent
		const domainViolations = this.checkDomainRules(variables, "AccountAgent");

		// Enhanced similarity check with domain context
		const similarityViolations = this.domainAwareSimilarityCheck(
			variables,
			"AccountAgent",
		);

		scanner.exitScope();

		return {
			domainViolations,
			similarityViolations,
			recommendations: this.generateRecommendations(
				domainViolations,
				similarityViolations,
			),
		};
	}

	// Analyze a source file within a DDD context
	analyzeContext(
		source: string,
		contextName: string,
		aggregateRoot: string,
	): AnalysisResult {
		const scanner = this.getScanner(contextName);
		scanner.enterScope(aggregateRoot);

		// Extract variables
		const variables = this.extractVariablesFromSource(source);

		// Domain-specific rules for the context
		const domainViolations = this.checkDomainRules(variables, aggregateRoot);

		// Enhanced similarity check with domain context
		const similarityViolations = this.domainAwareSimilarityCheck(
			variables,
			aggregateRoot,
		);

		scanner.exitScope();

		return {
			domainViolations,
			similarityViolations,
			recommendations: this.generateRecommendations(
				domainViolations,
				similarityViolations,
			),
		};
	}

	private parseTypeScript(source: string): any {
		// Simplified AST parsing for BunX environment
		return {
			source,
			lines: source.split("\n"),
		};
	}

	private extractVariables(ast: any): VariableInfo[] {
		return this.extractVariablesFromSource(ast.source);
	}

	private getScanner(contextName: string): ScopeScanner {
		if (!this.scanners.has(contextName)) {
			this.scanners.set(contextName, new ScopeScanner());
		}
		return this.scanners.get(contextName)!;
	}

	private extractVariablesFromSource(source: string): VariableInfo[] {
		const variables: VariableInfo[] = [];
		const lines = source.split("\n");

		const patterns = [
			/\b(?:const|let|var)\s+([a-zA-Z_]\w*)\s*[:=]/,
			/\b(?:private|public|protected)?\s*([a-zA-Z_]\w*)\s*:/,
			/\bfunction\s+([a-zA-Z_]\w*)\s*\(/,
		];

		for (let index = 0; index < lines.length; index++) {
			const line = lines[index];
			for (const pattern of patterns) {
				const match = line.match(pattern);
				if (match) {
					variables.push({
						name: match[1],
						scope: "method",
						line: index + 1,
					});
				}
			}
		}

		return variables;
	}

	private checkDomainRules(variables: VariableInfo[], aggregateRoot: string): string[] {
		const violations: string[] = [];
		const varNames = variables.map((v) => v.name);

		// Rule: Aggregate roots should avoid generic names
		if (varNames.includes("data") || varNames.includes("info")) {
			violations.push(
				`[${aggregateRoot}] Avoid generic names like 'data' or 'info' in domain logic`,
			);
		}

		// Rule: Specific prefixes for domain-critical variables
		const criticalPrefixes = ["auth", "proxy", "phone"];
		const hasCritical = varNames.some((name) =>
			criticalPrefixes.some((p) => name.startsWith(p)),
		);

		if (!hasCritical && aggregateRoot === "AccountAgent") {
			violations.push(
				`[${aggregateRoot}] Expected domain-specific prefixes (auth, proxy, phone) missing`,
			);
		}

		return violations;
	}

	private getContextIgnorePatterns(context: string): RegExp[] {
		// Common loop variables and domain-specific ignores
		const basePatterns = [/_$/, /^i$/, /^j$/, /^k$/, /^idx$/];

		if (context === "AccountAgent") {
			return [...basePatterns, /^temp_/, /^tmp_/];
		}

		return basePatterns;
	}

	private domainAwareSimilarityCheck(
		variables: VariableInfo[],
		context: string,
	): SimilarityViolation[] {
		const violations: SimilarityViolation[] = [];
		const varNames = variables.map((v) => v.name);

		// Get domain-specific ignore patterns
		const ignorePatterns = this.getContextIgnorePatterns(context);
		const filteredNames = varNames.filter(
			(name) => !ignorePatterns.some((pattern) => pattern.test(name)),
		);

		// Compare each pair with domain awareness
		const lenFiltered = filteredNames.length; // ✅ Cache length for nested loops
		for (let i = 0; i < lenFiltered; i++) {
			for (let j = i + 1; j < lenFiltered; j++) {
				const name1 = filteredNames[i];
				const name2 = filteredNames[j];

				// Check if they're in the same semantic group
				if (this.areInSameSemanticGroup(name1, name2, context)) {
					const similarity =
						this.unicodeComparator.graphemeLevenshtein(
							name1.toLowerCase(),
							name2.toLowerCase(),
						) / Math.max(name1.length, name2.length);

					if (similarity < 0.25) {
						// High similarity threshold for domain
						violations.push({
							name1,
							name2,
							similarity: 1 - similarity,
							context,
							risk: this.assessConfusionRisk(name1, name2, context),
						});
					}
				}
			}
		}

		return violations;
	}

	private areInSameSemanticGroup(
		name1: string,
		name2: string,
		context: string,
	): boolean {
		const groups = this.getSemanticGroups(context);

		for (const [_group, patterns] of Object.entries(groups)) {
			const inGroup1 = patterns.some((p) => p.test(name1));
			const inGroup2 = patterns.some((p) => p.test(name2));

			if (inGroup1 && inGroup2) {
				return true;
			}
		}

		return false;
	}

	private getSemanticGroups(context: string): Record<string, RegExp[]> {
		const groups: Record<string, Record<string, RegExp[]>> = {
			AccountAgent: {
				authentication: [/^auth/, /^login/, /^token/, /^credential/],
				proxy: [/proxy$/i, /^proxy/, /gateway$/i],
				phone: [/phone$/i, /^phone/, /sim$/i, /^imei/],
				configuration: [/config$/i, /^config/, /settings$/i, /^option/],
			},
			ResourceBundle: {
				resource: [/resource$/i, /^res/, /bundle$/i],
				configuration: [/config$/i, /^cfg/, /setting/],
				template: [/template$/i, /^tpl/, /pattern$/i],
			},
		};

		return groups[context] || {};
	}

	private assessConfusionRisk(
		name1: string,
		name2: string,
		context: string,
	): "low" | "medium" | "high" {
		const groups = this.getSemanticGroups(context);
		let maxGroupOverlap = 0;

		for (const [_group, patterns] of Object.entries(groups)) {
			const matches1 = patterns.filter((p) => p.test(name1)).length;
			const matches2 = patterns.filter((p) => p.test(name2)).length;
			const overlap = Math.min(matches1, matches2);
			maxGroupOverlap = Math.max(maxGroupOverlap, overlap);
		}

		if (maxGroupOverlap >= 2) return "high";
		if (maxGroupOverlap === 1) return "medium";
		return "low";
	}

	private generateRecommendations(
		domainViolations: string[],
		similarityViolations: SimilarityViolation[],
	): string[] {
		const recs: string[] = [];

		for (const v of domainViolations) {
			recs.push(`Refactor: ${v}`);
		}

		for (const v of similarityViolations) {
			if (v.risk === "high") {
				recs.push(
					`Critical: '${v.name1}' and '${v.name2}' are semantically ambiguous in the ${v.context} context.`,
				);
			} else if (v.risk === "medium") {
				recs.push(
					`Warning: '${v.name1}' and '${v.name2}' share domain-specific prefixes/suffixes.`,
				);
			}
		}

		return recs;
	}
}
