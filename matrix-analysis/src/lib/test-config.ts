import { TIMER_10S, TIMER_30S } from "../constants";
import { CIDetector } from "./ci-detector";

/**
 * CI-aware test configuration
 *
 * Automatically adjusts test behavior based on the CI environment.
 */

export class TestConfig {
	private ci: ReturnType<CIDetector["detect"]>;

	constructor() {
		this.ci = CIDetector.getInstanceSync().detectSync();
	}

	/**
	 * Get test timeout based on environment
	 */
	getTimeout(): number {
		if (this.ci.isCI) {
			// CI environments might need longer timeouts
			return TIMER_30S;
		}

		// Local development - faster feedback
		return TIMER_10S;
	}

	/**
	 * Get retry count for flaky tests
	 */
	getRetryCount(): number {
		if (this.ci.isCI) {
			// Retry flaky tests in CI
			return 2;
		}

		// No retries locally for faster feedback
		return 0;
	}

	/**
	 * Get concurrency settings
	 */
	getConcurrency(): number {
		if (this.ci.isCI) {
			// Limit concurrency in CI to avoid resource issues
			return 4;
		}

		// Use all available cores locally
		return require("os").cpus().length;
	}

	/**
	 * Determine if coverage should be enabled
	 */
	shouldEnableCoverage(): boolean {
		if (this.ci.isCI) {
			// Always enable coverage in CI
			return true;
		}

		// Enable coverage locally only if explicitly requested
		return process.env.COVERAGE === "true";
	}

	/**
	 * Get reporter configuration
	 */
	getReporter(): string[] {
		const reporters: string[] = [];

		if (this.ci.isCI) {
			// Use verbose reporter in CI for better debugging
			reporters.push("verbose");

			// Add JUnit reporter for CI integration
			if (this.ci.isGitHubActions) {
				reporters.push("junit");
			}
		} else {
			// Use default reporter locally
			reporters.push("default");
		}

		return reporters;
	}

	/**
	 * Get test patterns based on environment
	 */
	getTestPatterns(): string[] {
		const patterns: string[] = ["src", ".claude"];

		if (this.ci.isPR) {
			// In PRs, focus on changed files
			const changedFiles = this.getChangedFiles();
			if (changedFiles.length > 0) {
				patterns.push(
					...changedFiles.filter((f) => f.includes(".test.") || f.includes(".spec.")),
				);
			}
		}

		return patterns;
	}

	/**
	 * Get changed files (simplified implementation)
	 */
	private getChangedFiles(): string[] {
		// This is a simplified implementation
		// In a real scenario, you'd use git commands or CI-specific APIs
		return [];
	}

	/**
	 * Configure test environment variables
	 */
	configureEnvironment(): void {
		if (this.ci.isCI) {
			// CI-specific environment setup
			process.env.NODE_ENV = "test";
			process.env.CI = "true";

			// Disable animations and color output in CI
			process.env.FORCE_COLOR = "0";
			process.env.NO_COLOR = "1";

			// Configure Bun for CI
			if (this.ci.isGitHubActions) {
				// Bun automatically emits GitHub Actions annotations
				process.env.BUN_GITHUB_ACTIONS_ANNOTATIONS = "1";
			}
		}

		// Apply frozen lockfile in CI
		if (this.ci.isCI) {
			process.env.BUN_FROZEN_LOCKFILE = "1";
		}
	}

	/**
	 * Emit CI-specific annotations
	 */
	emitTestStart(testFile: string): void {
		if (this.ci.isGitHubActions) {
			console.log(`::group::Running tests in ${testFile}`);
		}
	}

	emitTestEnd(testFile: string, passed: boolean, duration: number): void {
		if (this.ci.isGitHubActions) {
			console.log(`::endgroup::`);

			if (!passed) {
				CIDetector.getInstanceSync().emitAnnotation("error", "Tests failed", {
					file: testFile,
					title: "Test Failure",
				});
			}
		}
	}

	/**
	 * Get the full configuration object
	 */
	getConfig() {
		return {
			timeout: this.getTimeout(),
			retryCount: this.getRetryCount(),
			concurrency: this.getConcurrency(),
			coverage: this.shouldEnableCoverage(),
			reporters: this.getReporter(),
			patterns: this.getTestPatterns(),
			ci: this.ci,
		};
	}
}

// Export singleton instance
export const testConfig = new TestConfig();
export default testConfig;
