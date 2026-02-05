/**
 * @fileoverview Enhanced Real-Time File Watcher
 * @description Intelligent file watching with content analysis
 * @module audit/enhanced/file-watcher
 */

import { EventEmitter } from "events";
import { promises as fs } from "fs";
import { watch } from "fs";
import type { Stats } from "fs";

/**
 * Watch options
 */
export interface WatchOptions {
	directory: string;
	exclude?: string[];
	depth?: number;
	patterns?: RegExp[];
	analyzers?: ContentAnalyzer[];
}

/**
 * Watch subscription
 */
export interface WatchSubscription {
	watcher: ReturnType<typeof watch>;
	analyzer: FileContentAnalyzer;
	stop: () => Promise<void>;
}

/**
 * File change
 */
export interface FileChange {
	path: string;
	type: "add" | "change" | "unlink";
	timestamp: number;
	content?: string;
	delta?: ContentDelta;
	impact?: number;
}

/**
 * Content delta
 */
export interface ContentDelta {
	added: string[];
	removed: string[];
	modified: string[];
}

/**
 * Change correlation
 */
export interface ChangeCorrelation {
	isRelated: boolean;
	relatedFiles: string[];
	correlationScore: number;
}

/**
 * Content analyzer interface
 */
export interface ContentAnalyzer {
	name: string;
	analyze(content: string, path: string): Promise<any>;
}

/**
 * Content structure analyzer
 */
export class ContentStructureAnalyzer implements ContentAnalyzer {
	name = "structure";

	async analyze(content: string, path: string): Promise<any> {
		return {
			lines: content.split("\n").length,
			characters: content.length,
			hasImports: content.includes("import"),
			hasExports: content.includes("export"),
		};
	}
}

/**
 * Semantic analyzer
 */
export class SemanticAnalyzer implements ContentAnalyzer {
	name = "semantic";

	async analyze(content: string, path: string): Promise<any> {
		// Placeholder for semantic analysis
		return {
			topics: [],
			entities: [],
		};
	}
}

/**
 * Dependency analyzer
 */
export class DependencyAnalyzer implements ContentAnalyzer {
	name = "dependency";

	async analyze(content: string, path: string): Promise<any> {
		const imports: string[] = [];
		const importRegex = /import\s+.*?\s+from\s+['"](.+?)['"]/g;
		let match;
		while ((match = importRegex.exec(content)) !== null) {
			imports.push(match[1]);
		}
		return { imports };
	}
}

/**
 * File content analyzer
 */
export class FileContentAnalyzer {
	constructor(
		private options: { patterns?: RegExp[]; analyzers?: ContentAnalyzer[] },
	) {}

	async analyze(content: string, path: string): Promise<any> {
		const results: Record<string, any> = {};

		if (this.options.analyzers) {
			for (const analyzer of this.options.analyzers) {
				results[analyzer.name] = await analyzer.analyze(content, path);
			}
		}

		return results;
	}
}

/**
 * Enhanced Real-Time File Watcher
 */
export class RealTimeFileWatcher extends EventEmitter {
	private watchers: Map<string, ReturnType<typeof watch>> = new Map();
	private eventQueue: FileChange[] = [];
	private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
	private contentCache: Map<string, string> = new Map();

	/**
	 * Watch with analysis
	 */
	async watchWithAnalysis(options: WatchOptions): Promise<WatchSubscription> {
		const watcher = watch(
			options.directory,
			{ recursive: true },
			async (eventType, filename) => {
				if (!filename) return;

				const filePath = `${options.directory}/${filename}`;

				// Check if file should be watched
				if (!this.shouldWatch(filePath, options)) {
					return;
				}

				// Handle file events
				if (eventType === "rename") {
					await this.handleFileAdd(filePath);
				} else if (eventType === "change") {
					await this.handleFileChange(filePath);
				}
			},
		);

		this.watchers.set(options.directory, watcher);

		// Content-aware analysis pipeline
		const analyzer = new FileContentAnalyzer({
			patterns: options.patterns,
			analyzers: options.analyzers || [
				new ContentStructureAnalyzer(),
				new SemanticAnalyzer(),
				new DependencyAnalyzer(),
			],
		});

		return {
			watcher,
			analyzer,
			stop: async () => await this.stopWatching(watcher),
		};
	}

	/**
	 * Handle file add
	 */
	private async handleFileAdd(path: string): Promise<void> {
		try {
			const content = await fs.readFile(path, "utf-8");
			this.contentCache.set(path, content);
			this.emit("fileAdd", { path, content, timestamp: Date.now() });
		} catch (error) {
			// File might not exist yet
		}
	}

	/**
	 * Handle file change with debounce
	 */
	private async handleFileChange(path: string, stats?: Stats): Promise<void> {
		// Clear existing debounce timer
		if (this.debounceTimers.has(path)) {
			clearTimeout(this.debounceTimers.get(path)!);
		}

		// Set new debounce timer
		const timer = setTimeout(async () => {
			try {
				const content = await fs.readFile(path, "utf-8");
				const previousContent = this.contentCache.get(path) || "";

				const delta = this.calculateContentDelta(previousContent, content);
				const impact = this.assessChangeImpact(delta);

				if (impact > 0.3) {
					// Only process significant changes
					await this.processSignificantChange(path, content, delta, impact);
				}

				this.contentCache.set(path, content);
				this.debounceTimers.delete(path);
			} catch (error) {
				// File might have been deleted
				this.contentCache.delete(path);
			}
		}, 500); // 500ms debounce

		this.debounceTimers.set(path, timer);
	}

	/**
	 * Calculate content delta
	 */
	private calculateContentDelta(
		previous: string,
		current: string,
	): ContentDelta {
		const prevLines = previous.split("\n");
		const currLines = current.split("\n");

		const added: string[] = [];
		const removed: string[] = [];
		const modified: string[] = [];

		// Simple diff algorithm
		const maxLen = Math.max(prevLines.length, currLines.length);
		for (let i = 0; i < maxLen; i++) {
			if (i >= currLines.length) {
				removed.push(prevLines[i]);
			} else if (i >= prevLines.length) {
				added.push(currLines[i]);
			} else if (prevLines[i] !== currLines[i]) {
				modified.push(currLines[i]);
			}
		}

		return { added, removed, modified };
	}

	/**
	 * Assess change impact
	 */
	private assessChangeImpact(delta: ContentDelta): number {
		let impact = 0;
		impact += delta.added.length * 0.1;
		impact += delta.removed.length * 0.1;
		impact += delta.modified.length * 0.05;
		return Math.min(impact, 1.0);
	}

	/**
	 * Process significant change
	 */
	private async processSignificantChange(
		path: string,
		content: string,
		delta: ContentDelta,
		impact: number,
	): Promise<void> {
		this.emit("fileChange", {
			path,
			type: "change",
			timestamp: Date.now(),
			content,
			delta,
			impact,
		});
	}

	/**
	 * Process batch changes
	 */
	private async processBatchChanges(changes: FileChange[]): Promise<void> {
		const correlation = await this.analyzeChangeCorrelation(changes);

		if (correlation.isRelated) {
			await this.handleRelatedChanges(changes, correlation);
		} else {
			await Promise.all(
				changes.map((change) => this.handleIndependentChange(change)),
			);
		}
	}

	/**
	 * Analyze change correlation
	 */
	private async analyzeChangeCorrelation(
		changes: FileChange[],
	): Promise<ChangeCorrelation> {
		// Simple correlation: if files are in same directory, they're related
		const directories = new Set(
			changes.map((c) => c.path.split("/").slice(0, -1).join("/")),
		);
		const isRelated = directories.size < changes.length;

		return {
			isRelated,
			relatedFiles: changes.map((c) => c.path),
			correlationScore: isRelated ? 0.8 : 0.2,
		};
	}

	/**
	 * Handle related changes
	 */
	private async handleRelatedChanges(
		changes: FileChange[],
		correlation: ChangeCorrelation,
	): Promise<void> {
		this.emit("batchChange", { changes, correlation });
	}

	/**
	 * Handle independent change
	 */
	private async handleIndependentChange(change: FileChange): Promise<void> {
		this.emit("fileChange", change);
	}

	/**
	 * Check if file should be watched
	 */
	private shouldWatch(filePath: string, options: WatchOptions): boolean {
		// Check exclude patterns
		if (options.exclude) {
			for (const pattern of options.exclude) {
				if (filePath.includes(pattern)) {
					return false;
				}
			}
		}

		// Exclude common directories
		const excludeDirs = ["node_modules", ".git", "dist", "build", ".next"];
		for (const dir of excludeDirs) {
			if (filePath.includes(dir)) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Stop watching
	 */
	private async stopWatching(watcher: ReturnType<typeof watch>): Promise<void> {
		watcher.close();
		for (const timer of this.debounceTimers.values()) {
			clearTimeout(timer);
		}
		this.debounceTimers.clear();
		this.contentCache.clear();
	}
}
