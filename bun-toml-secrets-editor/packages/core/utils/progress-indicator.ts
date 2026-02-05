/**
 * Progress Indicator Utilities for CLI Operations
 * Provides visual feedback for long-running operations
 */

export interface ProgressOptions {
	total?: number;
	width?: number;
	showPercentage?: boolean;
	showETA?: boolean;
	showRate?: boolean;
	theme?: "default" | "minimal" | "dots" | "spinner";
}

export class ProgressIndicator {
	private current = 0;
	private total: number;
	private width: number;
	private showPercentage: boolean;
	private showETA: boolean;
	private showRate: boolean;
	private theme: string;
	private startTime: bigint; // Enhanced with nanosecond precision
	private isActive = false;
	private interval?: NodeJS.Timeout;

	// Public getters for external access
	public get progress(): number {
		return this.current;
	}
	public get maxProgress(): number {
		return this.total;
	}

	// Enhanced timing getters
	public get elapsedMs(): number {
		return Number(BigInt(Bun.nanoseconds()) - this.startTime) / 1_000_000;
	}

	public get elapsedSeconds(): number {
		return Number(BigInt(Bun.nanoseconds()) - this.startTime) / 1_000_000_000;
	}

	constructor(options: ProgressOptions = {}) {
		this.total = options.total || 100;
		this.width = options.width || 40;
		this.showPercentage = options.showPercentage !== false;
		this.showETA = options.showETA !== false;
		this.showRate = options.showRate !== false;
		this.theme = options.theme || "default";
		this.startTime = BigInt(Bun.nanoseconds()); // Enhanced precision
		this.lastUpdate = BigInt(Bun.nanoseconds()); // Enhanced precision
	}

	/**
	 * Start the progress indicator
	 */
	start(): void {
		if (this.isActive) return;

		this.isActive = true;
		this.startTime = BigInt(Bun.nanoseconds()); // Enhanced precision
		this.lastUpdate = BigInt(Bun.nanoseconds()); // Enhanced precision

		if (this.theme === "spinner") {
			this.startSpinner();
		} else {
			this.render();
		}
	}

	/**
	 * Update progress to a specific value
	 */
	update(value: number, message?: string): void {
		if (!this.isActive) return;

		this.current = Math.max(0, Math.min(value, this.maxProgress));
		this.lastUpdate = BigInt(Bun.nanoseconds()); // Enhanced precision

		if (this.theme === "spinner") {
			// Spinner updates are handled by the interval
			if (message) {
				process.stdout.write(` ${message}`);
			}
		} else {
			this.render(message);
		}
	}

	/**
	 * Increment progress by a specific amount
	 */
	increment(amount: number = 1, message?: string): void {
		this.update(this.progress + amount, message);
	}

	/**
	 * Complete the progress indicator
	 */
	complete(message?: string): void {
		if (!this.isActive) return;

		this.current = this.maxProgress;
		this.isActive = false;

		if (this.interval) {
			clearInterval(this.interval);
			this.interval = undefined;
		}

		// Clear current line and show completion
		process.stdout.write(`\r${" ".repeat(process.stdout.columns || 80)}\r`);

		if (message) {
			console.log(`✅ ${message}`);
		} else {
			console.log("✅ Complete!");
		}
	}

	/**
	 * Fail the progress indicator
	 */
	fail(message?: string): void {
		if (!this.isActive) return;

		this.isActive = false;

		if (this.interval) {
			clearInterval(this.interval);
			this.interval = undefined;
		}

		// Clear current line and show failure
		process.stdout.write(`\r${" ".repeat(process.stdout.columns || 80)}\r`);

		if (message) {
			console.log(`❌ ${message}`);
		} else {
			console.log("❌ Failed!");
		}
	}

	private render(message?: string): void {
		const percentage = (this.progress / this.maxProgress) * 100;
		const filled = Math.round((this.progress / this.maxProgress) * this.width);
		const empty = this.width - filled;

		let bar = "";

		switch (this.theme) {
			case "minimal":
				bar = `[${"=".repeat(filled)}${" ".repeat(empty)}]`;
				break;
			case "dots":
				bar = `[${"●".repeat(filled)}${"○".repeat(empty)}]`;
				break;
			default: {
				// default theme
				const filledChars = "█";
				const emptyChars = "░";
				bar = `[${filledChars.repeat(filled)}${emptyChars.repeat(empty)}]`;
				break;
			}
		}

		let output = `\r${bar}`;

		if (this.showPercentage) {
			output += ` ${percentage.toFixed(1)}%`;
		}

		if (this.showETA && this.progress > 0) {
			const elapsed = this.elapsedSeconds; // Enhanced precision
			const rate = this.progress / elapsed;
			const remaining = (this.maxProgress - this.progress) / rate;
			const eta = Math.round(remaining);
			output += ` (${eta}s remaining)`;
		}

		if (this.showRate && this.progress > 0) {
			const elapsed = this.elapsedSeconds; // Enhanced precision
			const rate = this.progress / elapsed;
			output += ` ${rate.toFixed(1)}/s`;
		}

		if (message) {
			output += ` ${message}`;
		}

		process.stdout.write(output);
	}

	private startSpinner(): void {
		const spinners = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
		let index = 0;

		this.interval = setInterval(() => {
			if (!this.isActive) return;

			const spinner = spinners[index % spinners.length];
			const percentage = (this.progress / this.maxProgress) * 100;

			process.stdout.write(`\r${spinner} ${percentage.toFixed(1)}%`);

			index++;
		}, 100);
	}

	/**
	 * Create a simple indeterminate progress indicator
	 */
	static indeterminate(message?: string): ProgressIndicator {
		const progress = new ProgressIndicator({
			total: 0,
			theme: "spinner",
			showPercentage: false,
		});

		if (message) {
			console.log(`${message}...`);
		}

		progress.start();
		return progress;
	}

	/**
	 * Create a step-based progress indicator
	 */
	static steps(totalSteps: number, message?: string): ProgressIndicator {
		const progress = new ProgressIndicator({
			total: totalSteps,
			width: 20,
			theme: "dots",
		});

		if (message) {
			console.log(`${message}...`);
		}

		progress.start();
		return progress;
	}
}

/**
 * Performance monitoring utility with nanosecond precision
 */
export class PerformanceMonitor {
	private startTime: bigint;
	private operations: number = 0;

	constructor() {
		this.startTime = BigInt(Bun.nanoseconds());
	}

	/**
	 * Record an operation
	 */
	recordOperation(): void {
		this.operations++;
	}

	/**
	 * Get elapsed time in milliseconds with nanosecond precision
	 */
	get elapsedMs(): number {
		return Number(BigInt(Bun.nanoseconds()) - this.startTime) / 1_000_000;
	}

	/**
	 * Get operations per second
	 */
	get opsPerSecond(): number {
		const elapsedSeconds = this.elapsedMs / 1000;
		return elapsedSeconds > 0 ? this.operations / elapsedSeconds : 0;
	}

	/**
	 * Get performance summary
	 */
	getSummary(): {
		operations: number;
		elapsedMs: number;
		opsPerSecond: number;
	} {
		return {
			operations: this.operations,
			elapsedMs: this.elapsedMs,
			opsPerSecond: this.opsPerSecond,
		};
	}

	/**
	 * Reset the monitor
	 */
	reset(): void {
		this.startTime = BigInt(Bun.nanoseconds());
		this.operations = 0;
	}
}

/**
 * Utility functions for common progress scenarios
 */
export class ProgressUtils {
	/**
	 * Create a simple indeterminate progress indicator
	 */
	static indeterminate(message?: string): ProgressIndicator {
		const progress = new ProgressIndicator({
			total: 0,
			theme: "spinner",
			showPercentage: false,
		});

		if (message) {
			console.log(`${message}...`);
		}

		progress.start();
		return progress;
	}

	/**
	 * Show progress for a file download/upload
	 */
	static fileTransfer(
		totalBytes: number,
		filename?: string,
	): ProgressIndicator {
		const progress = new ProgressIndicator({
			total: totalBytes,
			width: 30,
			showRate: true,
			showETA: true,
		});

		const message = filename ? `Transferring ${filename}` : "Transferring file";
		console.log(`${message}...`);
		progress.start();

		return progress;
	}

	/**
	 * Show progress for a batch operation
	 */
	static batchOperation(
		totalItems: number,
		operation: string,
	): ProgressIndicator {
		const progress = new ProgressIndicator({
			total: totalItems,
			width: 25,
			theme: "minimal",
			showPercentage: true,
		});

		console.log(`${operation} (${totalItems} items)...`);
		progress.start();

		return progress;
	}

	/**
	 * Show progress for a timed operation
	 */
	static timed(
		operation: string,
		timeoutSeconds: number = 30,
	): ProgressIndicator {
		const progress = new ProgressIndicator({
			total: timeoutSeconds * 10, // Update every 100ms
			width: 20,
			theme: "dots",
			showETA: false,
			showRate: false,
		});

		console.log(`${operation}...`);
		progress.start();

		// Auto-increment every 100ms
		const interval = setInterval(() => {
			if (progress.progress < progress.maxProgress) {
				progress.increment();
			} else {
				clearInterval(interval);
			}
		}, 100);

		return progress;
	}
}
