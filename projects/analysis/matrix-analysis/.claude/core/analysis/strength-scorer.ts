/**
 * Strength Scorer for /analyze
 *
 * Combines multiple code quality metrics into a single "strength" score:
 * - Complexity (cyclomatic complexity)
 * - Test coverage (test file presence)
 * - Documentation (JSDoc/comments)
 * - Dependency health (cycles, orphans)
 */

import { ComplexityAnalyzer, type ComplexityReport } from "./complexity-analyzer";
import { DependencyAnalyzer, type DependencyReport } from "./dep-analyzer";
import { style } from "./output";

// ============================================================================
// Types
// ============================================================================

export interface StrengthMetrics {
	complexity: {
		score: number;
		avgComplexity: number;
		highComplexityCount: number;
		totalFunctions: number;
	};
	testCoverage: {
		score: number;
		testFiles: number;
		sourceFiles: number;
		ratio: number;
	};
	documentation: {
		score: number;
		documentedFiles: number;
		totalFiles: number;
		ratio: number;
	};
	dependencies: {
		score: number;
		cycles: number;
		orphans: number;
		avgDependencies: number;
	};
}

export interface StrengthReport {
	overallScore: number;
	grade: "A" | "B" | "C" | "D" | "F";
	metrics: StrengthMetrics;
	recommendations: string[];
	summary: {
		filesAnalyzed: number;
		totalIssues: number;
	};
}

// ============================================================================
// Score Weights
// ============================================================================

const WEIGHTS = {
	complexity: 0.3,
	testCoverage: 0.25,
	documentation: 0.2,
	dependencies: 0.25,
};

// ============================================================================
// Thresholds
// ============================================================================

const THRESHOLDS = {
	complexity: {
		excellent: 5, // avg complexity <= 5 = 100 score
		good: 10, // avg complexity <= 10 = 75 score
		acceptable: 15, // avg complexity <= 15 = 50 score
	},
	testRatio: {
		excellent: 0.8, // 80% test coverage
		good: 0.5,
		acceptable: 0.25,
	},
	docRatio: {
		excellent: 0.7,
		good: 0.4,
		acceptable: 0.2,
	},
};

// ============================================================================
// Strength Scorer Class
// ============================================================================

export class StrengthScorer {
	private complexityAnalyzer: ComplexityAnalyzer;
	private dependencyAnalyzer: DependencyAnalyzer;

	constructor() {
		this.complexityAnalyzer = new ComplexityAnalyzer();
		this.dependencyAnalyzer = new DependencyAnalyzer();
	}

	/**
	 * Analyze a directory and generate strength report
	 */
	async analyzeDirectory(dirPath: string): Promise<StrengthReport> {
		// Run sub-analyzers
		const complexityReport = await this.complexityAnalyzer.analyzeDirectory(dirPath);
		const depReport = await this.dependencyAnalyzer.analyzeDirectory(dirPath);

		// Gather file stats
		const fileStats = await this.gatherFileStats(dirPath);

		// Calculate individual scores
		const complexityMetrics = this.scoreComplexity(complexityReport);
		const testMetrics = this.scoreTestCoverage(fileStats);
		const docMetrics = this.scoreDocumentation(dirPath, fileStats);
		const depMetrics = this.scoreDependencies(depReport);

		// Calculate overall score
		const overallScore = Math.round(
			complexityMetrics.score * WEIGHTS.complexity +
				testMetrics.score * WEIGHTS.testCoverage +
				docMetrics.score * WEIGHTS.documentation +
				depMetrics.score * WEIGHTS.dependencies,
		);

		const metrics: StrengthMetrics = {
			complexity: complexityMetrics,
			testCoverage: testMetrics,
			documentation: docMetrics,
			dependencies: depMetrics,
		};

		const recommendations = this.generateRecommendations(metrics);

		return {
			overallScore,
			grade: this.scoreToGrade(overallScore),
			metrics,
			recommendations,
			summary: {
				filesAnalyzed: fileStats.sourceFiles + fileStats.testFiles,
				totalIssues: this.countIssues(metrics),
			},
		};
	}

	/**
	 * Gather file statistics
	 */
	private async gatherFileStats(dirPath: string): Promise<{
		sourceFiles: number;
		testFiles: number;
		documentedFiles: number;
	}> {
		const glob = new Bun.Glob("**/*.{ts,tsx,js,jsx}");
		let sourceFiles = 0;
		let testFiles = 0;
		let documentedFiles = 0;

		for await (const file of glob.scan({ cwd: dirPath, absolute: true })) {
			if (file.includes("node_modules") || file.includes("/.")) continue;

			const isTest =
				file.includes(".test.") ||
				file.includes(".spec.") ||
				file.includes("__tests__") ||
				file.includes("__test__");

			if (isTest) {
				testFiles++;
			} else {
				sourceFiles++;

				// Check for documentation (JSDoc comments)
				const content = await Bun.file(file)
					.text()
					.catch(() => null);
				if (
					content &&
					(content.includes("/**") ||
						content.includes("@param") ||
						content.includes("@returns"))
				) {
					documentedFiles++;
				}
			}
		}

		return { sourceFiles, testFiles, documentedFiles };
	}

	/**
	 * Score complexity metrics
	 */
	private scoreComplexity(report: ComplexityReport): StrengthMetrics["complexity"] {
		const avg = report.summary.avgComplexity;
		let score: number;

		if (avg <= THRESHOLDS.complexity.excellent) {
			score = 100;
		} else if (avg <= THRESHOLDS.complexity.good) {
			score =
				75 +
				(25 * (THRESHOLDS.complexity.good - avg)) /
					(THRESHOLDS.complexity.good - THRESHOLDS.complexity.excellent);
		} else if (avg <= THRESHOLDS.complexity.acceptable) {
			score =
				50 +
				(25 * (THRESHOLDS.complexity.acceptable - avg)) /
					(THRESHOLDS.complexity.acceptable - THRESHOLDS.complexity.good);
		} else {
			score = Math.max(0, 50 - (avg - THRESHOLDS.complexity.acceptable) * 2);
		}

		// Penalize high complexity functions
		score -= report.summary.highComplexityCount * 5;

		return {
			score: Math.max(0, Math.min(100, Math.round(score))),
			avgComplexity: avg,
			highComplexityCount: report.summary.highComplexityCount,
			totalFunctions: report.summary.totalFunctions,
		};
	}

	/**
	 * Score test coverage
	 */
	private scoreTestCoverage(stats: {
		sourceFiles: number;
		testFiles: number;
	}): StrengthMetrics["testCoverage"] {
		const ratio = stats.sourceFiles > 0 ? stats.testFiles / stats.sourceFiles : 0;
		let score: number;

		if (ratio >= THRESHOLDS.testRatio.excellent) {
			score = 100;
		} else if (ratio >= THRESHOLDS.testRatio.good) {
			score =
				75 +
				(25 * (ratio - THRESHOLDS.testRatio.good)) /
					(THRESHOLDS.testRatio.excellent - THRESHOLDS.testRatio.good);
		} else if (ratio >= THRESHOLDS.testRatio.acceptable) {
			score =
				50 +
				(25 * (ratio - THRESHOLDS.testRatio.acceptable)) /
					(THRESHOLDS.testRatio.good - THRESHOLDS.testRatio.acceptable);
		} else {
			score = ratio * (50 / THRESHOLDS.testRatio.acceptable);
		}

		return {
			score: Math.max(0, Math.min(100, Math.round(score))),
			testFiles: stats.testFiles,
			sourceFiles: stats.sourceFiles,
			ratio,
		};
	}

	/**
	 * Score documentation
	 */
	private scoreDocumentation(
		_dirPath: string,
		stats: { documentedFiles: number; sourceFiles: number },
	): StrengthMetrics["documentation"] {
		const ratio = stats.sourceFiles > 0 ? stats.documentedFiles / stats.sourceFiles : 0;
		let score: number;

		if (ratio >= THRESHOLDS.docRatio.excellent) {
			score = 100;
		} else if (ratio >= THRESHOLDS.docRatio.good) {
			score =
				75 +
				(25 * (ratio - THRESHOLDS.docRatio.good)) /
					(THRESHOLDS.docRatio.excellent - THRESHOLDS.docRatio.good);
		} else if (ratio >= THRESHOLDS.docRatio.acceptable) {
			score =
				50 +
				(25 * (ratio - THRESHOLDS.docRatio.acceptable)) /
					(THRESHOLDS.docRatio.good - THRESHOLDS.docRatio.acceptable);
		} else {
			score = ratio * (50 / THRESHOLDS.docRatio.acceptable);
		}

		return {
			score: Math.max(0, Math.min(100, Math.round(score))),
			documentedFiles: stats.documentedFiles,
			totalFiles: stats.sourceFiles,
			ratio,
		};
	}

	/**
	 * Score dependency health
	 */
	private scoreDependencies(report: DependencyReport): StrengthMetrics["dependencies"] {
		let score = 100;

		// Penalize cycles heavily
		score -= report.cycles.length * 15;

		// Penalize orphan files
		score -= Math.min(report.orphans.length * 2, 20);

		// Penalize high average dependencies
		if (report.summary.avgDependencies > 10) {
			score -= (report.summary.avgDependencies - 10) * 2;
		}

		return {
			score: Math.max(0, Math.min(100, Math.round(score))),
			cycles: report.cycles.length,
			orphans: report.orphans.length,
			avgDependencies: report.summary.avgDependencies,
		};
	}

	/**
	 * Convert score to letter grade
	 */
	private scoreToGrade(score: number): "A" | "B" | "C" | "D" | "F" {
		if (score >= 90) return "A";
		if (score >= 80) return "B";
		if (score >= 70) return "C";
		if (score >= 60) return "D";
		return "F";
	}

	/**
	 * Count total issues
	 */
	private countIssues(metrics: StrengthMetrics): number {
		return (
			metrics.complexity.highComplexityCount +
			metrics.dependencies.cycles +
			metrics.dependencies.orphans
		);
	}

	/**
	 * Generate recommendations based on metrics
	 */
	private generateRecommendations(metrics: StrengthMetrics): string[] {
		const recommendations: string[] = [];

		// Complexity recommendations
		if (metrics.complexity.score < 70) {
			recommendations.push(
				`Reduce complexity in ${metrics.complexity.highComplexityCount} functions with high cyclomatic complexity`,
			);
		}

		// Test coverage recommendations
		if (metrics.testCoverage.score < 70) {
			const targetTests = Math.ceil(
				metrics.testCoverage.sourceFiles * 0.5 - metrics.testCoverage.testFiles,
			);
			if (targetTests > 0) {
				recommendations.push(`Add ${targetTests} test files to reach 50% test coverage`);
			}
		}

		// Documentation recommendations
		if (metrics.documentation.score < 70) {
			const undocumented =
				metrics.documentation.totalFiles - metrics.documentation.documentedFiles;
			recommendations.push(
				`Add JSDoc comments to ${undocumented} undocumented source files`,
			);
		}

		// Dependency recommendations
		if (metrics.dependencies.cycles > 0) {
			recommendations.push(
				`Fix ${metrics.dependencies.cycles} circular dependency issues`,
			);
		}
		if (metrics.dependencies.orphans > 5) {
			recommendations.push(
				`Review ${metrics.dependencies.orphans} orphan files (not imported anywhere)`,
			);
		}

		if (recommendations.length === 0) {
			recommendations.push("Codebase is in good health. Continue maintaining quality!");
		}

		return recommendations;
	}
}

// ============================================================================
// Display Functions
// ============================================================================

const GRADE_COLORS: Record<string, (s: string) => string> = {
	A: style.success,
	B: style.green,
	C: style.yellow,
	D: style.warn,
	F: style.error,
};

/**
 * Display strength report
 */
export function displayStrengthReport(report: StrengthReport): void {
	console.log("\n💪 Code Strength Analysis\n");

	// Overall score with big grade
	const gradeColor = GRADE_COLORS[report.grade] || style.gray;
	console.log(
		`  Overall Score: ${style.bold(report.overallScore.toString())}/100  Grade: ${gradeColor(style.bold(report.grade))}\n`,
	);

	// Score breakdown
	console.log(
		Bun.inspect.table(
			[
				{
					Category: "Complexity",
					Score: report.metrics.complexity.score,
					Bar: renderScoreBar(report.metrics.complexity.score),
					Details: `Avg: ${report.metrics.complexity.avgComplexity.toFixed(1)}, High: ${report.metrics.complexity.highComplexityCount}`,
				},
				{
					Category: "Test Coverage",
					Score: report.metrics.testCoverage.score,
					Bar: renderScoreBar(report.metrics.testCoverage.score),
					Details: `${report.metrics.testCoverage.testFiles} tests / ${report.metrics.testCoverage.sourceFiles} source`,
				},
				{
					Category: "Documentation",
					Score: report.metrics.documentation.score,
					Bar: renderScoreBar(report.metrics.documentation.score),
					Details: `${report.metrics.documentation.documentedFiles} / ${report.metrics.documentation.totalFiles} documented`,
				},
				{
					Category: "Dependencies",
					Score: report.metrics.dependencies.score,
					Bar: renderScoreBar(report.metrics.dependencies.score),
					Details: `${report.metrics.dependencies.cycles} cycles, ${report.metrics.dependencies.orphans} orphans`,
				},
			],
			{ colors: true },
		),
	);

	// Recommendations
	if (report.recommendations.length > 0) {
		console.log("\n💡 Recommendations\n");
		for (const rec of report.recommendations) {
			console.log(`  • ${rec}`);
		}
		console.log();
	}

	// Summary
	console.log(
		`📊 Summary: ${report.summary.filesAnalyzed} files analyzed, ${report.summary.totalIssues} issues found\n`,
	);
}

/**
 * Render a simple score bar
 */
function renderScoreBar(score: number): string {
	const width = 20;
	const filled = Math.round((score / 100) * width);
	const empty = width - filled;

	const bar = "█".repeat(filled) + "░".repeat(empty);

	if (score >= 80) return style.success(bar);
	if (score >= 60) return style.yellow(bar);
	return style.error(bar);
}

// ============================================================================
// CLI
// ============================================================================

if (import.meta.main) {
	const args = Bun.argv.slice(2);
	const path = args[0] || ".";

	const scorer = new StrengthScorer();

	console.log(`Analyzing code strength in ${path}...`);

	scorer
		.analyzeDirectory(path)
		.then((report) => {
			displayStrengthReport(report);
			// Exit with code 1 if grade is F
			if (report.grade === "F") {
				process.exit(1);
			}
		})
		.catch((err) => {
			console.error(err);
			process.exit(1);
		});
}
