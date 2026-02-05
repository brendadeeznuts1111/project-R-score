/**
 * @fileoverview File Watcher Implementation
 * @description Real-time file watching for audit system
 * @module audit/file-watcher
 */

import { watch } from "fs";
import { EventEmitter } from "events";

/**
 * Watcher options
 */
export interface WatcherOptions {
	directory: string;
	onFileChange: (filePath: string, content: string) => Promise<void>;
	patterns: RegExp[];
	debounceMs?: number;
}

/**
 * File watcher interface
 */
export interface Watcher {
	start(): Promise<void>;
	stop(): Promise<void>;
}

/**
 * Create file watcher
 *
 * Uses Node.js fs.watch for cross-platform file watching
 */
export function createWatcher(options: WatcherOptions): Watcher {
	return new FileWatcherImpl(options);
}

/**
 * File watcher implementation
 */
class FileWatcherImpl extends EventEmitter implements Watcher {
	private watcher: ReturnType<typeof watch> | null = null;
	private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
	private isWatching: boolean = false;

	constructor(private options: WatcherOptions) {
		super();
	}

	async start(): Promise<void> {
		if (this.isWatching) {
			return;
		}

		this.watcher = watch(
			this.options.directory,
			{ recursive: true },
			async (eventType, filename) => {
				if (!filename) return;

				const filePath = `${this.options.directory}/${filename}`;

				// Check if file matches patterns
				if (!this.shouldWatch(filePath)) {
					return;
				}

				// Debounce rapid changes
				this.debounceFileChange(filePath);
			},
		);

		this.isWatching = true;
	}

	async stop(): Promise<void> {
		if (this.watcher) {
			this.watcher.close();
			this.watcher = null;
		}

		// Clear debounce timers
		for (const timer of this.debounceTimers.values()) {
			clearTimeout(timer);
		}
		this.debounceTimers.clear();

		this.isWatching = false;
	}

	/**
	 * Check if file should be watched
	 */
	private shouldWatch(filePath: string): boolean {
		// Check file extension
		const ext = filePath.split(".").pop()?.toLowerCase();
		const validExtensions = [
			".ts",
			".tsx",
			".js",
			".jsx",
			".md",
			".yaml",
			".yml",
		];

		if (!ext || !validExtensions.includes(`.${ext}`)) {
			return false;
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
	 * Debounce file change events
	 */
	private debounceFileChange(filePath: string): void {
		const existingTimer = this.debounceTimers.get(filePath);
		if (existingTimer) {
			clearTimeout(existingTimer);
		}

		const debounceMs = this.options.debounceMs || 500;

		const timer = setTimeout(async () => {
			this.debounceTimers.delete(filePath);

			try {
				const file = Bun.file(filePath);
				if (await file.exists()) {
					const content = await file.text();
					await this.options.onFileChange(filePath, content);
				}
			} catch (error) {
				this.emit("error", { file: filePath, error });
			}
		}, debounceMs);

		this.debounceTimers.set(filePath, timer);
	}
}
