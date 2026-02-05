/**
 * @fileoverview 1.1.1.1.3.1.1: Main Audit Orchestrator Class
 * @description Main orchestrator coordinating all audit components
 * @module audit/comprehensive-audit-orchestrator
 *
 * Components:
 * - 1.1.1.1.3.1.2: Pattern Matching Engine
 * - 1.1.1.1.3.1.3: Documentation Number Extractor
 * - 1.1.1.1.3.1.4: Cross-Reference Index Builder
 * - 1.1.1.1.3.1.5: Orphan Detection Logic
 * - 1.1.1.1.3.1.6: Real-Time File Watcher
 * - 1.1.1.1.3.1.7: Event Emitter Interface
 */

import { EventEmitter } from "events";
import {
	PatternMatchingEngine,
	type PatternMatch,
} from "./pattern-matching-engine";
import {
	DocumentationNumberExtractor,
	type ExtractedDocNumber,
} from "./documentation-number-extractor";
import {
	CrossReferenceIndexBuilder,
	type CrossReferenceIndex,
} from "./cross-reference-index-builder";
import {
	EnhancedOrphanDetector,
	type OrphanDetectionResult,
} from "./enhanced-orphan-detector";
import {
	RealTimeFileWatcher,
	type FileChangeEvent,
} from "./real-time-file-watcher";
import { promises as fs } from "fs";
import { join, relative } from "path";

/**
 * Audit configuration
 */
export interface AuditConfig {
	patterns: string[];
	directories: string[];
	docDirectories?: string[];
	codeDirectories?: string[];
	fileExtensions?: string[];
	timeout?: number;
	watchMode?: boolean;
	excludeDirs?: string[];
}

/**
 * Audit match result
 */
export interface AuditMatch {
	pattern: string;
	file: string;
	line: number;
	column: number;
	context: string;
	timestamp: number;
}

/**
 * Orphaned documentation number
 */
export interface OrphanedNumber {
	number: string;
	type: "documented-unreferenced" | "referenced-undocumented";
	location?: string;
	line?: number;
}

/**
 * Audit result
 */
export interface AuditResult {
	totalMatches: number;
	totalOrphans: number;
	matches: AuditMatch[];
	orphans: OrphanedNumber[];
	scannedFiles: number;
	executionTimeMs: number;
	documentationNumbers?: ExtractedDocNumber[];
	crossReferenceIndex?: CrossReferenceIndex;
	orphanDetection?: OrphanDetectionResult;
	statistics?: {
		totalDocs: number;
		brokenRefs: number;
		duration: number;
	};
}

/**
 * 1.1.1.1.3.1.1: Main Audit Orchestrator Class
 *
 * Coordinates all audit components for comprehensive documentation audit.
 * Implements EventEmitter interface (1.1.1.1.3.1.7) for real-time event handling.
 */
export class ComprehensiveAuditOrchestrator extends EventEmitter {
	private patternEngine: PatternMatchingEngine;
	private docExtractor: DocumentationNumberExtractor;
	private indexBuilder: CrossReferenceIndexBuilder;
	private orphanDetector: EnhancedOrphanDetector;
	private fileWatcher: RealTimeFileWatcher | null = null;
	private activeAudits: Set<Promise<AuditResult>> = new Set();
	private isMonitoring: boolean = false;

	private readonly DEFAULT_PATTERNS = [
		/1\.\d+\.\d+\.\d+\.\d+\.\d+\.\d+/g, // Main documentation numbers
		/7\.\d+\.\d+\.\d+\.\d+\.\d+\.\d+/g, // Hidden movement detection
		/9\.\d+\.\d+\.\d+\.\d+\.\d+\.\d+/g, // Architecture/status
	];

	constructor(private config: AuditConfig) {
		super();
		this.patternEngine = new PatternMatchingEngine();
		this.docExtractor = new DocumentationNumberExtractor();
		this.indexBuilder = new CrossReferenceIndexBuilder();
		this.orphanDetector = new EnhancedOrphanDetector();

		// Set up event forwarding
		this.setupEventForwarding();
	}

	/**
	 * 1.1.1.1.3.2.1: Hybrid Audit Orchestrator Method
	 *
	 * Performs hybrid audit: static scan + orphan detection
	 */
	async hybridAudit(): Promise<AuditResult> {
		const startTime = Date.now();
		const results: AuditResult = {
			totalMatches: 0,
			totalOrphans: 0,
			matches: [],
			orphans: [],
			scannedFiles: 0,
			executionTimeMs: 0,
		};

		this.emit("auditStart", { config: this.config });

		try {
			// 1.1.1.1.3.2.2: Directory Scanner
			const files = await this.scanDirectory(
				this.config.directories[0] || "src/",
				this.config.fileExtensions || [".ts", ".tsx", ".md", ".yaml", ".yml"],
				["node_modules", "dist", ".git"],
			);

			results.scannedFiles = files.length;

			// 1.1.1.1.3.2.3: Multi-Pattern Matcher
			const patterns = this.config.patterns.map((p) => new RegExp(p, "g"));

			// 1.1.1.1.3.2.4: Timeout Handler
			const scanPromise = this.scanFilesWithPatterns(files, patterns);
			const timeoutPromise = this.createTimeoutPromise(
				this.config.timeout || 30000,
			);

			const matches = await Promise.race([scanPromise, timeoutPromise]);
			results.matches = matches as AuditMatch[];
			results.totalMatches = results.matches.length;

			// 1.1.1.1.3.2.5: Result Aggregation
			results.orphans = await this.detectOrphans(results.matches);
			results.totalOrphans = results.orphans.length;

			results.executionTimeMs = Date.now() - startTime;

			this.emit("auditComplete", results);
			return results;
		} catch (error) {
			this.emit("audit-error", error);
			throw error;
		}
	}

	/**
	 * Start real-time audit mode
	 *
	 * Returns cleanup function for graceful shutdown
	 */
	async startRealTimeMonitoring(
		options?: Partial<AuditConfig>,
	): Promise<() => Promise<void>> {
		if (this.isMonitoring) {
			throw new Error("Monitoring already active");
		}

		const watchDir =
			options?.directories?.[0] || this.config.directories[0] || "src/";
		const patterns =
			options?.patterns ||
			this.config.patterns ||
			this.DEFAULT_PATTERNS.map((p) => p.source);

		// 1.1.1.1.3.1.6: Real-Time File Watcher
		this.fileWatcher = new RealTimeFileWatcher({
			directory: watchDir,
			onFileChange: this.handleFileChange.bind(this),
			patterns: patterns.map((p) => new RegExp(p, "g")),
			extensions: this.config.fileExtensions,
			exclude: ["node_modules", ".git", "dist"],
			debounceMs: 500,
		});

		this.fileWatcher.on("fileChange", async (event: FileChangeEvent) => {
			this.emit("fileChange", event);
		});

		await this.fileWatcher.start();
		this.isMonitoring = true;
		this.emit("watchModeStarted");

		// 1.1.1.1.3.2.6: Cleanup Resource Manager
		return async () => {
			await this.stopMonitoring();
		};
	}

	/**
	 * Start watch mode (alias for compatibility)
	 */
	startWatchMode(): void {
		this.startRealTimeMonitoring().catch((error) => {
			this.emit("error", error);
		});
	}

	/**
	 * Stop real-time audit mode
	 */
	private async stopMonitoring(): Promise<void> {
		if (this.fileWatcher) {
			this.fileWatcher.stop();
			this.fileWatcher = null;
			this.isMonitoring = false;
			this.emit("watchModeStopped");
		}
	}

	/**
	 * Stop watch mode (public alias)
	 */
	stopWatchMode(): void {
		this.stopMonitoring().catch(console.error);
	}

	/**
	 * Audit a single file
	 */
	async auditFile(filePath: string): Promise<{
		docs: ExtractedDocNumber[];
		matches: AuditMatch[];
	}> {
		try {
			const file = Bun.file(filePath);
			const content = await file.text();

			const docs = await this.docExtractor.extractFromFile(filePath);
			const patterns = this.config.patterns.map((p) => new RegExp(p, "g"));
			const matches = await this.extractMatchesFromContent(
				filePath,
				content,
				patterns,
			);

			this.emit("fileAudited", { file: filePath, docs, matches });

			return { docs, matches };
		} catch (error) {
			this.emit("file-read-error", { file: filePath, error });
			return { docs: [], matches: [] };
		}
	}

	/**
	 * 1.1.1.1.3.2.2: Directory Scanner
	 *
	 * Scans directories for files matching criteria
	 */
	private async scanDirectory(
		dir: string,
		extensions: string[],
		excludeDirs: string[],
	): Promise<string[]> {
		const files: string[] = [];

		const scan = async (currentPath: string) => {
			try {
				const entries = await fs.readdir(currentPath, { withFileTypes: true });

				for (const entry of entries) {
					const fullPath = join(currentPath, entry.name);

					if (entry.isDirectory()) {
						if (!excludeDirs.includes(entry.name)) {
							await scan(fullPath);
						}
					} else if (entry.isFile()) {
						if (extensions.some((ext) => entry.name.endsWith(ext))) {
							files.push(fullPath);
						}
					}
				}
			} catch (error) {
				this.emit("directory-scan-error", { directory: currentPath, error });
			}
		};

		await scan(dir);
		return files;
	}

	/**
	 * 1.1.1.1.3.1.5: Orphan Detection Logic
	 *
	 * Detects orphaned documentation numbers
	 */
	private async detectOrphans(
		matches: AuditMatch[],
	): Promise<OrphanedNumber[]> {
		const orphans: OrphanedNumber[] = [];

		// Get documented numbers
		const documentedNumbers = await this.getDocumentedNumbers();
		const referencedNumbers = new Set(matches.map((m) => m.pattern));

		// Find documented but not referenced
		for (const docNum of documentedNumbers) {
			if (!referencedNumbers.has(docNum.number)) {
				orphans.push({
					number: docNum.number,
					type: "documented-unreferenced",
					location: docNum.location,
				});
			}
		}

		// Find referenced but not documented
		for (const refNum of referencedNumbers) {
			if (!documentedNumbers.some((d) => d.number === refNum)) {
				orphans.push({
					number: refNum,
					type: "referenced-undocumented",
				});
			}
		}

		return orphans;
	}

	/**
	 * Get documented numbers from index file
	 */
	private async getDocumentedNumbers(): Promise<
		Array<{ number: string; location: string }>
	> {
		try {
			const docFile = Bun.file("docs/numbering-index.md");
			if (!(await docFile.exists())) {
				return [];
			}

			const content = await docFile.text();
			const numbers: Array<{ number: string; location: string }> = [];

			const lines = content.split("\n");
			for (const line of lines) {
				const match = line.match(
					/^(1\.\d+\.\d+\.\d+\.\d+\.\d+\.\d+|7\.\d+\.\d+\.\d+\.\d+\.\d+\.\d+|9\.\d+\.\d+\.\d+\.\d+\.\d+\.\d+)\s*-\s*(.+)$/,
				);
				if (match) {
					numbers.push({
						number: match[1],
						location: match[2],
					});
				}
			}

			return numbers;
		} catch {
			return [];
		}
	}

	/**
	 * 1.1.1.1.3.2.3: Multi-Pattern Matcher
	 *
	 * Matches multiple patterns across files
	 */
	private async scanFilesWithPatterns(
		files: string[],
		patterns: RegExp[],
	): Promise<AuditMatch[]> {
		const allMatches: AuditMatch[] = [];

		for (const file of files) {
			try {
				const content = await fs.readFile(file, "utf-8");
				const matches = await this.extractMatchesFromContent(
					file,
					content,
					patterns,
				);
				allMatches.push(...matches);
			} catch (error) {
				this.emit("file-read-error", { file, error });
			}
		}

		return allMatches;
	}

	/**
	 * Extract matches from file content
	 */
	private async extractMatchesFromContent(
		file: string,
		content: string,
		patterns: RegExp[],
	): Promise<AuditMatch[]> {
		const matches: AuditMatch[] = [];
		const lines = content.split("\n");

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			for (const pattern of patterns) {
				pattern.lastIndex = 0; // Reset regex state
				let match: RegExpExecArray | null;

				while ((match = pattern.exec(line)) !== null) {
					matches.push({
						pattern: match[0],
						file: relative(process.cwd(), file),
						line: i + 1,
						column: match.index + 1,
						context: this.getContext(lines, i),
						timestamp: Date.now(),
					});
				}
			}
		}

		return matches;
	}

	/**
	 * Get context around a line
	 */
	private getContext(
		lines: string[],
		index: number,
		contextLines: number = 2,
	): string {
		const start = Math.max(0, index - contextLines);
		const end = Math.min(lines.length, index + contextLines + 1);
		return lines.slice(start, end).join("\n");
	}

	/**
	 * 1.1.1.1.3.2.4: Timeout Handler
	 *
	 * Creates timeout promise for audit operations
	 */
	private createTimeoutPromise(timeoutMs: number): Promise<never> {
		return new Promise((_, reject) => {
			setTimeout(
				() => reject(new Error(`Audit timeout after ${timeoutMs}ms`)),
				timeoutMs,
			);
		});
	}

	/**
	 * 1.1.1.1.3.2.5: Result Aggregation
	 *
	 * Aggregates results from multiple audit operations
	 */
	async aggregateResults(results: AuditResult[]): Promise<AuditResult> {
		const aggregated: AuditResult = {
			totalMatches: 0,
			totalOrphans: 0,
			matches: [],
			orphans: [],
			scannedFiles: 0,
			executionTimeMs: 0,
		};

		for (const result of results) {
			aggregated.matches.push(...result.matches);
			aggregated.orphans.push(...result.orphans);
			aggregated.scannedFiles += result.scannedFiles;
			aggregated.executionTimeMs += result.executionTimeMs;
		}

		aggregated.totalMatches = aggregated.matches.length;
		aggregated.totalOrphans = aggregated.orphans.length;

		return aggregated;
	}

	/**
	 * 1.1.1.1.3.2.6: Cleanup Resource Manager
	 *
	 * Cleans up resources and cancels active operations
	 */
	async cleanup(): Promise<void> {
		// Cancel pattern matching
		this.patternEngine.cancelAll();

		// Stop file watcher
		this.stopWatchMode();

		// Wait for active audits to complete or timeout
		const cleanupPromises = Array.from(this.activeAudits).map(
			async (auditPromise) => {
				try {
					await Promise.race([
						auditPromise,
						new Promise((_, reject) =>
							setTimeout(() => reject(new Error("Audit timeout")), 5000),
						),
					]);
				} catch {
					// Timeout or error - continue cleanup
				}
			},
		);

		await Promise.allSettled(cleanupPromises);
		this.activeAudits.clear();

		this.emit("cleanupComplete");
	}

	/**
	 * 1.1.1.1.3.2.7: Real-Time Match Handler
	 *
	 * Handles file changes and extracts matches in real-time
	 */
	private async handleFileChange(
		filePath: string,
		content: string,
	): Promise<void> {
		const patterns = this.config.patterns.map((p) => new RegExp(p, "g"));
		const matches = await this.extractMatchesFromContent(
			filePath,
			content,
			patterns,
		);

		for (const match of matches) {
			// Emit real-time match event
			this.emit("real-time-match", {
				pattern: match.pattern,
				file: match.file,
				line: match.line,
				column: match.column,
				timestamp: Date.now(),
			});
		}
	}

	/**
	 * Setup event forwarding from components
	 */
	private setupEventForwarding(): void {
		this.patternEngine.on("match", (match: PatternMatch) => {
			this.emit("match", match);
		});

		this.patternEngine.on("error", (error: Error) => {
			this.emit("error", error);
		});
	}
}
