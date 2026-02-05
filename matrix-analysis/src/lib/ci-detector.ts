#!/usr/bin/env bun
/**
 * CI Environment Detector
 *
 * Detects various CI/CD environments and provides appropriate configurations.
 *
 * Supported CI platforms:
 * - GitHub Actions
 * - GitLab CI
 * - CircleCI
 * - Travis CI
 * - Jenkins
 * - Azure Pipelines
 * - Bitbucket Pipelines
 * - AppVeyor
 * - Buildkite
 * - Codeship
 * - Drone CI
 * - Semaphore
 * - Wercker
 */

interface CIEnvironment {
	name: string;
	isCI: boolean;
	isGitHubActions: boolean;
	isPR: boolean;
	branch?: string;
	tag?: string;
	commit?: string;
	buildNumber?: string;
	buildUrl?: string;
	annotations: {
		enabled: boolean;
		format: "github" | "generic";
	};
}

class CIDetector {
	private static instance: CIDetector | null = null;
	private static initializing: boolean = false;
	private static initPromise: Promise<CIDetector> | null = null;
	private env: Record<string, string | undefined>;
	private cachedResult: CIEnvironment | null = null;
	private cacheTimestamp: number = 0;
	private readonly CACHE_TTL = 60000; // 1 minute cache TTL
	private cacheMutex: Promise<void> = Promise.resolve();

	constructor(env: Record<string, string | undefined> = process.env) {
		this.env = env;
	}

	static async getInstance(
		env?: Record<string, string | undefined>,
	): Promise<CIDetector> {
		// If instance already exists, return it
		if (CIDetector.instance) {
			return CIDetector.instance;
		}

		// If initialization is in progress, wait for it
		if (CIDetector.initializing && CIDetector.initPromise) {
			return CIDetector.initPromise;
		}

		// Start initialization
		CIDetector.initializing = true;
		CIDetector.initPromise = new Promise((resolve) => {
			// Create instance in next tick to ensure atomicity
			setTimeout(() => {
				if (!CIDetector.instance) {
					CIDetector.instance = new CIDetector(env);
				}
				CIDetector.initializing = false;
				CIDetector.initPromise = null;
				resolve(CIDetector.instance);
			}, 0);
		});

		return CIDetector.initPromise;
	}

	static getInstanceSync(env?: Record<string, string | undefined>): CIDetector {
		if (!CIDetector.instance) {
			CIDetector.instance = new CIDetector(env);
		}
		return CIDetector.instance;
	}

	/**
	 * Refresh environment and clear cache
	 *
	 * CRITICAL FOR TEST RELIABILITY: This method prevents flaky test behavior by resetting
	 * cached CI detection results. Without calling this method after environment changes,
	 * subsequent detect() or detectSync() calls would return stale cached data.
	 *
	 * Important notes:
	 * - Does NOT re-detect the environment - only resets internal state
	 * - MUST call detect() or detectSync() afterward to get updated results
	 * - Essential in test suites where process.env is mutated between tests
	 * - cacheMutex = Promise.resolve() ensures pending async detection completes
	 *   before new detection begins, preventing race conditions
	 *
	 * @param env Optional custom environment object (defaults to process.env)
	 */
	refreshEnvironment(env?: Record<string, string | undefined>): void {
		this.env = env || process.env;
		this.cachedResult = null;
		this.cacheTimestamp = 0;
		this.cacheMutex = Promise.resolve();
	}

	/**
	 * Detect the current CI environment
	 */
	async detect(): Promise<CIEnvironment> {
		// Acquire cache mutex lock
		await this.cacheMutex;

		// Release function for the mutex
		const releaseMutex = () => {
			this.cacheMutex = this.cacheMutex.then(
				() => {},
				() => {},
			);
		};

		try {
			// Check if cache is still valid
			const now = Date.now();
			if (this.cachedResult && now - this.cacheTimestamp < this.CACHE_TTL) {
				releaseMutex();
				return this.cachedResult;
			}

			// Generate new result
			const ci = this.detectCIPlatform();

			this.cachedResult = {
				name: ci.name,
				isCI: ci.isCI,
				isGitHubActions: ci.name === "GitHub Actions",
				isPR: this.isPullRequest(),
				branch: this.getBranch(),
				tag: this.getTag(),
				commit: this.getCommit(),
				buildNumber: this.getBuildNumber(),
				buildUrl: this.getBuildUrl(),
				annotations: {
					enabled: this.shouldEmitAnnotations(),
					format: ci.name === "GitHub Actions" ? "github" : "generic",
				},
			};

			// Update cache timestamp
			this.cacheTimestamp = now;

			releaseMutex();
			return this.cachedResult;
		} catch (error) {
			releaseMutex();
			throw error;
		}
	}

	/**
	 * Synchronous detect method (for backward compatibility)
	 */
	detectSync(): CIEnvironment {
		// Check if cache is still valid
		const now = Date.now();
		if (this.cachedResult && now - this.cacheTimestamp < this.CACHE_TTL) {
			return this.cachedResult;
		}

		// Generate new result synchronously
		const ci = this.detectCIPlatform();

		this.cachedResult = {
			name: ci.name,
			isCI: ci.isCI,
			isGitHubActions: ci.name === "GitHub Actions",
			isPR: this.isPullRequest(),
			branch: this.getBranch(),
			tag: this.getTag(),
			commit: this.getCommit(),
			buildNumber: this.getBuildNumber(),
			buildUrl: this.getBuildUrl(),
			annotations: {
				enabled: this.shouldEmitAnnotations(),
				format: ci.name === "GitHub Actions" ? "github" : "generic",
			},
		};

		// Update cache timestamp
		this.cacheTimestamp = now;

		return this.cachedResult;
	}

	/**
	 * Detect which CI platform we're running on
	 */
	private detectCIPlatform(): { name: string; isCI: boolean } {
		// GitHub Actions
		if (this.env.GITHUB_ACTIONS) {
			return { name: "GitHub Actions", isCI: true };
		}

		// GitLab CI
		if (this.env.GITLAB_CI) {
			return { name: "GitLab CI", isCI: true };
		}

		// CircleCI
		if (this.env.CIRCLECI) {
			return { name: "CircleCI", isCI: true };
		}

		// Travis CI
		if (this.env.TRAVIS) {
			return { name: "Travis CI", isCI: true };
		}

		// Jenkins
		if (this.env.JENKINS_URL) {
			return { name: "Jenkins", isCI: true };
		}

		// Azure Pipelines
		if (this.env.TF_BUILD) {
			return { name: "Azure Pipelines", isCI: true };
		}

		// Bitbucket Pipelines
		if (this.env.BITBUCKET_BUILD_NUMBER) {
			return { name: "Bitbucket Pipelines", isCI: true };
		}

		// AppVeyor
		if (this.env.APPVEYOR) {
			return { name: "AppVeyor", isCI: true };
		}

		// Buildkite
		if (this.env.BUILDKITE) {
			return { name: "Buildkite", isCI: true };
		}

		// Codeship
		if (this.env.CI_NAME === "codeship") {
			return { name: "Codeship", isCI: true };
		}

		// Drone CI
		if (this.env.DRONE) {
			return { name: "Drone CI", isCI: true };
		}

		// Semaphore
		if (this.env.SEMAPHORE) {
			return { name: "Semaphore", isCI: true };
		}

		// Wercker
		if (this.env.WERCKER) {
			return { name: "Wercker", isCI: true };
		}

		// Generic CI detection
		if (this.env.CI) {
			return { name: "Unknown CI", isCI: true };
		}

		return { name: "Local", isCI: false };
	}

	/**
	 * Check if we're in a pull request
	 */
	private isPullRequest(): boolean {
		// GitHub Actions
		if (this.env.GITHUB_EVENT_NAME === "pull_request") {
			return true;
		}

		// GitLab CI
		if (this.env.CI_MERGE_REQUEST_ID) {
			return true;
		}

		// CircleCI
		if (this.env.CIRCLE_PULL_REQUEST) {
			return true;
		}

		// Travis CI
		if (this.env.TRAVIS_PULL_REQUEST !== "false") {
			return true;
		}

		// AppVeyor
		if (this.env.APPVEYOR_PULL_REQUEST_NUMBER) {
			return true;
		}

		// Buildkite
		if (this.env.BUILDKITE_PULL_REQUEST) {
			return true;
		}

		return false;
	}

	/**
	 * Get the current branch name
	 */
	private getBranch(): string | undefined {
		// GitHub Actions
		if (this.env.GITHUB_REF_NAME) {
			return this.env.GITHUB_REF_NAME;
		}

		// GitLab CI
		if (this.env.CI_COMMIT_REF_NAME) {
			return this.env.CI_COMMIT_REF_NAME;
		}

		// CircleCI
		if (this.env.CIRCLE_BRANCH) {
			return this.env.CIRCLE_BRANCH;
		}

		// Travis CI
		if (this.env.TRAVIS_BRANCH) {
			return this.env.TRAVIS_BRANCH;
		}

		// Jenkins
		if (this.env.GIT_BRANCH) {
			return this.env.GIT_BRANCH;
		}

		// Bitbucket Pipelines
		if (this.env.BITBUCKET_BRANCH) {
			return this.env.BITBUCKET_BRANCH;
		}

		// AppVeyor
		if (this.env.APPVEYOR_REPO_BRANCH) {
			return this.env.APPVEYOR_REPO_BRANCH;
		}

		return undefined;
	}

	/**
	 * Get tag name with consistent error handling
	 */
	private getTag(): string | undefined {
		return (
			this.env.GITHUB_REF?.replace("refs/tags/", "") ||
			this.env.CI_COMMIT_TAG ||
			this.env.TRAVIS_TAG ||
			undefined
		);
	}

	/**
	 * Get commit hash with consistent error handling
	 */
	private getCommit(): string | undefined {
		return (
			this.env.GITHUB_SHA ||
			this.env.CI_COMMIT_SHA ||
			this.env.CIRCLE_SHA1 ||
			this.env.TRAVIS_COMMIT ||
			this.env.COMMIT ||
			this.env.GIT_COMMIT ||
			this.env.BITBUCKET_COMMIT ||
			this.env.APPVEYOR_REPO_COMMIT ||
			undefined
		);
	}

	/**
	 * Get the build number
	 */
	private getBuildNumber(): string | undefined {
		// GitHub Actions
		if (this.env.GITHUB_RUN_NUMBER) {
			return this.env.GITHUB_RUN_NUMBER;
		}

		// GitLab CI
		if (this.env.CI_JOB_ID) {
			return this.env.CI_JOB_ID;
		}

		// CircleCI
		if (this.env.CIRCLE_BUILD_NUM) {
			return this.env.CIRCLE_BUILD_NUM;
		}

		// Travis CI
		if (this.env.TRAVIS_BUILD_NUMBER) {
			return this.env.TRAVIS_BUILD_NUMBER;
		}

		// Jenkins
		if (this.env.BUILD_NUMBER) {
			return this.env.BUILD_NUMBER;
		}

		// Azure Pipelines
		if (this.env.BUILD_BUILDID) {
			return this.env.BUILD_BUILDID;
		}

		// Bitbucket Pipelines
		if (this.env.BITBUCKET_BUILD_NUMBER) {
			return this.env.BITBUCKET_BUILD_NUMBER;
		}

		// AppVeyor
		if (this.env.APPVEYOR_BUILD_NUMBER) {
			return this.env.APPVEYOR_BUILD_NUMBER;
		}

		// Buildkite
		if (this.env.BUILDKITE_BUILD_NUMBER) {
			return this.env.BUILDKITE_BUILD_NUMBER;
		}

		return undefined;
	}

	/**
	 * Get the build URL
	 */
	private getBuildUrl(): string | undefined {
		// GitHub Actions
		if (
			this.env.GITHUB_SERVER_URL &&
			this.env.GITHUB_REPOSITORY &&
			this.env.GITHUB_RUN_ID
		) {
			return `${this.env.GITHUB_SERVER_URL}/${this.env.GITHUB_REPOSITORY}/actions/runs/${this.env.GITHUB_RUN_ID}`;
		}

		// GitLab CI
		if (this.env.CI_PROJECT_URL && this.env.CI_JOB_ID) {
			return `${this.env.CI_PROJECT_URL}/-/jobs/${this.env.CI_JOB_ID}`;
		}

		// CircleCI
		if (this.env.CIRCLE_BUILD_URL) {
			return this.env.CIRCLE_BUILD_URL;
		}

		// Travis CI
		if (this.env.TRAVIS_BUILD_WEB_URL) {
			return this.env.TRAVIS_BUILD_WEB_URL;
		}

		// Jenkins
		if (this.env.BUILD_URL) {
			return this.env.BUILD_URL;
		}

		// Azure Pipelines
		if (
			this.env.SYSTEM_TEAMFOUNDATIONSERVERURI &&
			this.env.SYSTEM_TEAMPROJECT &&
			this.env.BUILD_BUILDID
		) {
			return `${this.env.SYSTEM_TEAMFOUNDATIONSERVERURI}/${this.env.SYSTEM_TEAMPROJECT}/_build/results?buildId=${this.env.BUILD_BUILDID}`;
		}

		return undefined;
	}

	/**
	 * Determine if we should emit annotations
	 */
	private shouldEmitAnnotations(): boolean {
		// GitHub Actions automatically supports annotations
		if (this.env.GITHUB_ACTIONS) {
			return true;
		}

		// Other CI platforms might need explicit configuration
		return this.env.CI_ANNOTATIONS === "true" || this.env.ENABLE_ANNOTATIONS === "true";
	}

	/**
	 * Emit a GitHub Actions annotation
	 */
	emitAnnotation(
		type: "error" | "warning" | "notice",
		message: string,
		options?: {
			file?: string;
			line?: number;
			col?: number;
			title?: string;
		},
	): void {
		const ci = this.detectSync();

		if (!ci.annotations.enabled) {
			return;
		}

		if (ci.annotations.format === "github") {
			let annotation = `::${type} `;

			if (options?.title) {
				annotation += `title=${options.title},`;
			}

			if (options?.file) {
				annotation += `file=${options.file},`;
			}

			if (options?.line) {
				annotation += `line=${options.line},`;
			}

			if (options?.col) {
				annotation += `col=${options.col},`;
			}

			// Remove trailing comma
			annotation = annotation.replace(/,$/, "");

			console.log(`${annotation}::${message}`);
		} else {
			// Generic annotation format
			console.log(`[${type.toUpperCase()}] ${message}`);

			if (options?.file) {
				console.log(`  File: ${options.file}${options.line ? `:${options.line}` : ""}`);
			}

			if (options?.title) {
				console.log(`  Title: ${options.title}`);
			}
		}
	}

	/**
	 * Emit a group annotation (GitHub Actions only)
	 */
	startGroup(name: string): void {
		const ci = this.detectSync();

		if (ci.isGitHubActions) {
			console.log(`::group::${name}`);
		} else {
			console.log(`--- ${name} ---`);
		}
	}

	/**
	 * End a group annotation (GitHub Actions only)
	 */
	endGroup(): void {
		const ci = this.detectSync();

		if (ci.isGitHubActions) {
			console.log("::endgroup::");
		} else {
			console.log("--- End group ---");
		}
	}
}

// Export the detector
export { CIDetector };
export type { CIEnvironment };

// Create a singleton instance for easy use
const ciDetector = CIDetector.getInstance();
export default ciDetector;
