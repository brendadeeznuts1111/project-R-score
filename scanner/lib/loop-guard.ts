// lib/loop-guard.ts - Intelligent loop detection for Tier-1380

interface LoopContext {
	lastCommand: string;
	lastOutput: string;
	repetitionCount: number;
	timestamp: number;
}

export class LoopGuard {
	private readonly history: LoopContext[] = [];
	private readonly maxRepetitions = 2;
	private readonly similarityThreshold = 0.85;

	check(command: string, output: string): {shouldContinue: boolean; reason?: string} {
		const now = Date.now();

		// Check for exact command repetition
		const recent = this.history.slice(-3);
		const sameCommand = recent.filter(h => this.similarity(h.lastCommand, command) > this.similarityThreshold);

		if (sameCommand.length >= this.maxRepetitions) {
			return {
				shouldContinue: false,
				reason: `Detected ${sameCommand.length + 1} similar commands in sequence`,
			};
		}

		// Check for identical output
		const sameOutput = recent.filter(h => this.similarity(h.lastOutput, output) > 0.95);

		if (sameOutput.length >= 2) {
			return {
				shouldContinue: false,
				reason: `Output repetition detected (${sameOutput.length} times)`,
			};
		}

		// Store context
		this.history.push({
			lastCommand: command,
			lastOutput: output,
			repetitionCount: sameCommand.length,
			timestamp: now,
		});
		if (this.history.length > 10) this.history.shift();

		return {shouldContinue: true};
	}

	private similarity(a: string, b: string): number {
		if (a === b) return 1.0;
		const longer = a.length > b.length ? a : b;
		if (longer.length === 0) return 1.0;
		const distance = this.levenshtein(a, b);
		return (longer.length - distance) / longer.length;
	}

	private levenshtein(a: string, b: string): number {
		const matrix = Array(b.length + 1)
			.fill(null)
			.map(() => Array(a.length + 1).fill(null));
		for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
		for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
		for (let j = 1; j <= b.length; j++) {
			for (let i = 1; i <= a.length; i++) {
				const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
				matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + indicator);
			}
		}
		return matrix[b.length][a.length];
	}

	getStatus(): string {
		const last = this.history.at(-1);
		return `LoopGuard: ${this.history.length} contexts tracked${last ? `, last: ${last.lastCommand.slice(0, 30)}...` : ''}`;
	}
}

// Singleton export for global use
export const loopGuard = new LoopGuard();
