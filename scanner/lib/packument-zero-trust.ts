import {BunInfoResponseSchema, type NpmPackument} from '../scan';

export interface PackumentError {
	code: 'SPAWN_FAILED' | 'NON_ZERO_EXIT' | 'INVALID_JSON' | 'VALIDATION_FAILED';
	message: string;
	cause?: unknown;
}

export type PackumentResult = {ok: true; data: NpmPackument} | {ok: false; error: PackumentError};

export class ZeroTrustPackumentResolver {
	private readonly cwd: string;
	private readonly timeout: number;

	constructor(options?: {cwd?: string; timeout?: number}) {
		this.cwd = options?.cwd ?? process.cwd();
		this.timeout = options?.timeout ?? 15_000;
	}

	async resolve(name: string): Promise<NpmPackument> {
		const result = await this.safeResolve(name);
		if (!result.ok) throw new Error(result.error.message, {cause: result.error.cause});
		return result.data;
	}

	async safeResolve(name: string): Promise<PackumentResult> {
		// 1. Validate input
		if (!name?.trim()) {
			return {
				ok: false,
				error: {code: 'SPAWN_FAILED', message: `Invalid package name: "${name}"`},
			};
		}

		// 2. Spawn `bun info <name> --json`
		let proc: ReturnType<typeof Bun.spawn>;
		try {
			proc = Bun.spawn(['bun', 'info', name.trim(), '--json'], {
				cwd: this.cwd,
				stdout: 'pipe',
				stderr: 'pipe',
			});
		} catch (err) {
			return {
				ok: false,
				error: {code: 'SPAWN_FAILED', message: `Failed to spawn bun process`, cause: err},
			};
		}

		// 3. Race against timeout
		let timedOut = false;
		const timer = setTimeout(() => {
			timedOut = true;
			proc.kill();
		}, this.timeout);

		try {
			const exitCode = await proc.exited;
			clearTimeout(timer);

			if (timedOut) {
				return {
					ok: false,
					error: {code: 'SPAWN_FAILED', message: `Timed out after ${this.timeout}ms resolving "${name}"`},
				};
			}

			// 4. Check exit code
			if (exitCode !== 0) {
				const stderr = await new Response(proc.stderr).text();
				return {
					ok: false,
					error: {
						code: 'NON_ZERO_EXIT',
						message: `bun info exited with code ${exitCode} for "${name}": ${stderr.trim()}`,
					},
				};
			}

			// 5. JSON.parse stdout
			const stdout = await new Response(proc.stdout).text();
			let raw: unknown;
			try {
				raw = JSON.parse(stdout);
			} catch (err) {
				return {
					ok: false,
					error: {
						code: 'INVALID_JSON',
						message: `Failed to parse JSON from bun info for "${name}"`,
						cause: err,
					},
				};
			}

			// 6. Zero-trust boundary: validate through schema
			const parsed = BunInfoResponseSchema.safeParse(raw);
			if (!parsed.success) {
				return {
					ok: false,
					error: {
						code: 'VALIDATION_FAILED',
						message: `Schema validation failed for "${name}": ${parsed.error.message}`,
						cause: parsed.error,
					},
				};
			}

			// 7. Return validated data
			return {ok: true, data: parsed.data};
		} catch (err) {
			clearTimeout(timer);
			return {
				ok: false,
				error: {code: 'SPAWN_FAILED', message: `Unexpected error resolving "${name}"`, cause: err},
			};
		}
	}
}
