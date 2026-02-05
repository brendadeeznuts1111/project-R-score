/**
 * @fileoverview 1.1.1.1.3.1.6: Real-Time File Watcher
 * @description Watches files for changes and triggers audit events
 * @module audit/real-time-file-watcher
 */

import { EventEmitter } from "events";
import { watch, readFileSync } from "fs";
import { relative, resolve } from "path";

/**
 * File change event
 */
export interface FileChangeEvent {
	type: "created" | "modified" | "deleted";
	file: string;
	timestamp: number;
}

/**
 * File watcher options
 */
export interface FileWatcherOptions {
	directory: string;
	onFileChange: (filePath: string, content: string) => Promise<void>;
	patterns?: RegExp[];
	debounceMs?: number;
	extensions?: string[];
	exclude?: string[];
}

/**
 * 1.1.1.1.3.1.6: Real-Time File Watcher
 *
 * Watches files for changes and emits events for real-time audit
 */
export class RealTimeFileWatcher extends EventEmitter {
	private watchers: Map<string, ReturnType<typeof watch>> = new Map();
	private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
	private readonly DEFAULT_DEBOUNCE_MS = 500;

	constructor(private options: FileWatcherOptions) {
		super();
	}

	/**
	 * Start watching files
	 */
	async start(): Promise<void> {
		await this.watchDirectory(this.options.directory);
	}

	/**
	 * Stop watching files
	 */
	stop(): void {
		for (const [path, watcher] of this.watchers) {
			watcher.close();
			this.watchers.delete(path);
		}

		for (const timer of this.debounceTimers.values()) {
			clearTimeout(timer);
		}
		this.debounceTimers.clear();
	}

	/**
	 * Watch a directory
	 */
	private async watchDirectory(directory: string): Promise<void> {
		try {
			const watcher = watch(
				directory,
				{ recursive: true },
				async (eventType, filename) => {
					if (!filename) return;

					const filePath = resolve(directory, filename);

					// Check if file should be watched
					if (!this.shouldWatch(filePath)) {
						return;
					}

					// Read file content and call handler
					try {
						const content = readFileSync(filePath, "utf-8");
						await this.options.onFileChange(filePath, content);
					} catch (error) {
						// File might have been deleted
						if (eventType === "rename") {
							await this.options.onFileChange(filePath, "");
						}
					}

					// Debounce rapid changes
					this.debounceFileChange(filePath, eventType);
				},
			);

			this.watchers.set(directory, watcher);
			this.emit("watching", { directory });
		} catch (error) {
			this.emit("error", { directory, error });
		}
	}

	/**
	 * Check if file should be watched
	 */
	private shouldWatch(filePath: string): boolean {
		// Check extensions
		if (this.options.extensions) {
			const ext = filePath.split(".").pop()?.toLowerCase();
			if (!ext || !this.options.extensions.includes(ext)) {
				return false;
			}
		}

		// Check exclude patterns
		if (this.options.exclude) {
			for (const pattern of this.options.exclude) {
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
	 * Debounce file change events
	 */
	private debounceFileChange(filePath: string, eventType: string): void {
		const existingTimer = this.debounceTimers.get(filePath);
		if (existingTimer) {
			clearTimeout(existingTimer);
		}

		const debounceMs = this.options.debounceMs || this.DEFAULT_DEBOUNCE_MS;

		const timer = setTimeout(async () => {
			this.debounceTimers.delete(filePath);

			// Determine change type
			let changeType: "created" | "modified" | "deleted" = "modified";

			try {
				const file = Bun.file(filePath);
				if (!(await file.exists())) {
					changeType = "deleted";
				} else {
					// Check if file is new (simplified: assume modified if exists)
					changeType = "modified";
				}
			} catch {
				changeType = "deleted";
			}

			const event: FileChangeEvent = {
				type: changeType,
				file: filePath,
				timestamp: Date.now(),
			};

			this.emit("fileChange", event);
		}, debounceMs);

		this.debounceTimers.set(filePath, timer);
	}

	/**
	 * Get watched directories
	 */
	getWatchedDirectories(): string[] {
		return Array.from(this.watchers.keys());
	}
}
