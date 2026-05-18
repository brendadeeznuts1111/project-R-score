// lib/interactive-cli.ts - Interactive confirmation layer for Tier-1380

import {LoopGuard} from './loop-guard';

export class InteractiveTier1380 {
	private readonly guard = new LoopGuard();
	private readonly isCI = process.env.CI === 'true';

	async execute<T>(command: string, executor: () => Promise<T>): Promise<T> {
		const startTime = performance.now();
		const result = await executor();
		const duration = performance.now() - startTime;

		// Convert result to string for comparison
		const resultStr = typeof result === 'string' ? result : JSON.stringify(result);

		const check = this.guard.check(command, resultStr);

		if (!check.shouldContinue && !this.isCI) {
			// Interactive confirmation
			console.info(`\n⚠️  Loop detected: ${check.reason}`);
			console.info(`Command: ${command.slice(0, 60)}...`);
			console.info(`Duration: ${duration.toFixed(2)}ms`);

			const response = await this.prompt('Continue? [y/N/s(tatus)/d(iff)]: ');

			if (response.toLowerCase() === 'y') {
				console.info('🚀 Continuing...');
				return result;
			} else if (response.toLowerCase() === 's') {
				console.info(this.guard.getStatus());
				return this.execute(command, executor); // Retry with info
			} else if (response.toLowerCase() === 'd') {
				this.showDiff(command, resultStr);
				return this.execute(command, executor);
			} else {
				console.info('🛑 Stopped by user');
				process.exit(0);
			}
		}

		if (!check.shouldContinue && this.isCI) {
			console.error(`❌ Loop detected in CI mode: ${check.reason}`);
			process.exit(1);
		}

		return result;
	}

	private async prompt(question: string): Promise<string> {
		process.stdout.write(question + ' ');
		const buf = Buffer.alloc(1024);
		const n = await Bun.stdin.read(buf);
		return buf.toString('utf8', 0, n ?? 0).trim();
	}

	private showDiff(command: string, current: string) {
		const history = (this.guard as unknown as {history: {lastCommand: string; lastOutput: string}[]}).history;
		const last = history.at(-1);
		if (last) {
			console.info('\n📊 Diff from previous execution:');
			console.info('Command delta:', this.diffStrings(last.lastCommand, command));
			console.info('Output delta:', this.diffStrings(last.lastOutput.slice(0, 200), current.slice(0, 200)));
		}
	}

	private diffStrings(a: string, b: string): string {
		return a === b ? 'IDENTICAL' : `Changed ${a.length}→${b.length} chars`;
	}
}

// Singleton export
export const interactive = new InteractiveTier1380();
