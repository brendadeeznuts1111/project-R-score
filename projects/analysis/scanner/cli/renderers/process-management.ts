// process-management.ts
// Complete Bun Process Management System

// ═══════════════════════════════════════════════════════════════
// STREAM OPTIONS CONFIGURATION
// ═══════════════════════════════════════════════════════════════

type StreamOption = 'inherit' | 'pipe' | 'null';
type IPCSerialization = 'json' | 'advanced';

interface SpawnOptions {
	// ── Working directory & environment ──
	cwd?: string; // Default: process.cwd()  [8 sites]
	env?: Record<string, string | undefined>; // Default: process.env    [inherits]

	// ── Stream routing ──
	stdio?: [StreamOption, StreamOption, StreamOption]; // Low-level [stdin, stdout, stderr] override
	stdin?: StreamOption; // Default: "inherit"
	stdout?: StreamOption; // Default: "inherit"     [13 sites]
	stderr?: StreamOption; // Default: "inherit"     [13 sites]

	// ── Lifecycle callbacks ──
	onExit?: (proc: Subprocess, exitCode: number, signal: number, error?: Error) => void;

	// ── IPC ──
	ipc?: (message: unknown, proc: Subprocess) => void; // IPC message handler
	serialization?: IPCSerialization; // Default: "json"

	// ── Windows ──
	windowsHide?: boolean; // Default: true
	windowsVerbatimArguments?: boolean; // Default: false

	// ── Command identity ──
	argv0?: string; // Default: command[0]

	// ── Cancellation & timeouts ──
	signal?: AbortSignal; // AbortController integration
	timeout?: number; // Max ms before kill
	killSignal?: string | number; // Default: SIGTERM

	// ── Sync limits ──
	maxBuffer?: number; // Max buffer for spawnSync

	// ── PTY (POSIX) ──
	terminal?: TerminalOptions; // Attach pseudo-terminal
}

// ═══════════════════════════════════════════════════════════════
// STREAM CAPTURE MATRIX
// ═══════════════════════════════════════════════════════════════

const BUN_STREAM_CONFIG = {
	// To capture output, use "pipe"
	capture: {
		stdout: {option: 'stdout' as const, prop: 'stdout' as const, method: 'text' as const},
		stderr: {option: 'stderr' as const, prop: 'stderr' as const, method: 'text' as const},
	},
	// To send input, use "pipe"
	input: {
		stdin: {option: 'stdin' as const, prop: 'stdin' as const},
	},
	// Default behavior
	inherit: {
		stdout: 'inherit' as const,
		stderr: 'inherit' as const,
		stdin: 'inherit' as const,
	},
};

// ═══════════════════════════════════════════════════════════════
// SUBPROCESS INTERFACE
// ═══════════════════════════════════════════════════════════════

interface FileSink {
	write(data: string | ArrayBufferView | ArrayBuffer): number;
	flush(): void;
	end(): void;
}

interface Subprocess {
	// ── Streams ──
	readonly stdin: FileSink | number | undefined | null; // Writable when "pipe"
	readonly stdout: ReadableStream<Uint8Array> | number | undefined | null; // Readable when "pipe"
	readonly stderr: ReadableStream<Uint8Array> | number | undefined | null; // Readable when "pipe"
	readonly readable: ReadableStream<Uint8Array> | number | undefined | null; // Combined readable

	// ── PTY ──
	terminal: Terminal | undefined; // PTY terminal (read/write)

	// ── Identity & lifecycle ──
	readonly pid: number; // Process ID
	readonly exited: Promise<number>; // Resolves with exit code
	readonly exitCode: number | null; // Exit status (null while running)
	readonly signalCode: NodeJS.Signals | null; // Signal if killed
	readonly killed: boolean; // Was kill() called?

	// ── Methods ──
	kill(signal?: number | NodeJS.Signals): void; // Terminate process
	ref(): void; // Keep event loop alive
	unref(): void; // Allow event loop to exit

	// ── IPC ──
	send(message: unknown): void; // Send IPC message
	disconnect(): void; // Close IPC channel

	// ── Diagnostics ──
	resourceUsage(): ResourceUsage | undefined; // getrusage(2) stats
}

// ═══════════════════════════════════════════════════════════════
// PROCESS SPAWN FACTORY
// ═══════════════════════════════════════════════════════════════

interface SpawnResult {
	stdout: string;
	stderr: string;
	exitCode: number | null;
	signal: string | null;
}

async function spawnCapture(
	cmd: string[],
	options?: {cwd?: string; env?: Record<string, string>},
): Promise<SpawnResult> {
	const proc = Bun.spawn(cmd, {
		...options,
		stdout: 'pipe',
		stderr: 'pipe',
	});

	const [stdout, stderr] = await Promise.all([proc.stdout.text(), proc.stderr.text()]);

	await proc.exited;

	return {
		stdout,
		stderr,
		exitCode: proc.exitCode,
		signal: proc.signal,
	};
}

async function spawnSuccess(
	cmd: string[],
	options?: {cwd?: string; env?: Record<string, string>},
): Promise<{stdout: string}> {
	const result = await spawnCapture(cmd, options);
	if (result.exitCode !== 0) {
		throw new Error(`Exit code ${result.exitCode}: ${result.stderr}`);
	}
	return {stdout: result.stdout};
}

// ═══════════════════════════════════════════════════════════════
// SHELL EXECUTION WRAPPERS
// ═══════════════════════════════════════════════════════════════

interface ExecOptions {
	cwd?: string;
	env?: Record<string, string>;
	timeout?: number; // ms
	encoding?: 'utf8' | 'buffer';
}

async function exec(
	command: string,
	options?: ExecOptions,
): Promise<{
	stdout: string;
	stderr: string;
	exitCode: number;
}> {
	const proc = Bun.spawn(['sh', '-c', command], {
		cwd: options?.cwd,
		env: options?.env,
		stdout: 'pipe',
		stderr: 'pipe',
	});

	const [stdout, stderr] = await Promise.all([proc.stdout.text(), proc.stderr.text()]);

	await proc.exited;

	return {stdout, stderr, exitCode: proc.exitCode ?? 0};
}

function execSync(command: string): string {
	const proc = Bun.spawnSync(['sh', '-c', command]);
	return proc.stdout.toString();
}

// ═══════════════════════════════════════════════════════════════
// STDIN UTILITIES
// ═══════════════════════════════════════════════════════════════

async function readStdin(): Promise<string> {
	return await Bun.stdin.text();
}

async function readStdinLines(): Promise<string[]> {
	return (await readStdin()).split('\n').filter(Boolean);
}

async function readStdinTrimmed(): Promise<string> {
	return (await readStdin()).trim();
}

interface PromptOptions {
	prefix?: string;
	default?: string;
}

async function prompt(question: string, options?: PromptOptions): Promise<string> {
	process.stdout.write(`${options?.prefix ?? ''}${question}: `);
	const answer = await readStdinTrimmed();
	return answer ?? options?.default ?? '';
}

// ═══════════════════════════════════════════════════════════════
// TERMINAL (Bun.Terminal)
// ═══════════════════════════════════════════════════════════════

interface TerminalOptions {
	cols?: number; // Columns (default: 80)
	rows?: number; // Rows (default: 24)
	name?: string; // Terminal type (default: xterm-color)
	data?: (terminal: Terminal, data: Uint8Array) => void;
	exit?: (terminal: Terminal, exitCode: number, signal: string | null) => void;
	drain?: (terminal: Terminal) => void;
}

interface Terminal extends AsyncDisposable {
	readonly stdin: number;
	readonly stdout: number;
	readonly closed: boolean;
	write(data: string | ArrayBufferView | ArrayBuffer): number;
	resize(cols: number, rows: number): void;
	setRawMode(enabled: boolean): void;
	ref(): void;
	unref(): void;
	close(): void;
}

function createTerminal(cmd: string[], options?: TerminalOptions): Terminal {
	// @ts-expect-error Bun.Terminal is not yet in @types/bun
	return new Bun.Terminal(cmd, options);
}

// ═══════════════════════════════════════════════════════════════
// SIGNAL HANDLING UTILITIES
// ═══════════════════════════════════════════════════════════════

type SignalHandler = (signal: string, code: number | null) => void;

function onSignal(signal: string, handler: SignalHandler): void {
	process.on(signal, code => handler(signal, code));
}

const SIGNAL_CODES: Record<string, number> = {SIGINT: 2, SIGTERM: 15};

function setupGracefulShutdown(handlers: (() => Promise<void> | void)[]): void {
	const shutdown = async (signal: string) => {
		console.log(`\nReceived ${signal}. Shutting down...`);
		for (const handler of handlers) {
			await handler();
		}
		process.exit(128 + (SIGNAL_CODES[signal] ?? 1));
	};

	onSignal('SIGINT', shutdown);
	onSignal('SIGTERM', shutdown);
}

// ═══════════════════════════════════════════════════════════════
// ENVIRONMENT UTILITIES
// ═══════════════════════════════════════════════════════════════

function getEnv(key: string, fallback?: string): string | undefined {
	return process.env[key] ?? fallback;
}

function setEnv(key: string, value: string): void {
	process.env[key] = value;
}

function setEnvs(entries: Record<string, string>): void {
	Object.assign(process.env, entries);
}

function unsetEnv(key: string): void {
	delete process.env[key];
}

function envKeys(): string[] {
	return Object.keys(process.env);
}

function envEntries(): [string, string][] {
	return Object.entries(process.env as Record<string, string>);
}

// ═══════════════════════════════════════════════════════════════
// CLI ARGUMENT PARSING
// ═══════════════════════════════════════════════════════════════

interface ParseArgsOptions {
	boolean?: string[];
	string?: string[];
	alias?: Record<string, string>;
}

function parseArgs(
	args: string[] = Bun.argv.slice(1),
	opts?: ParseArgsOptions,
): {
	_: string[];
	[key: string]: string | boolean | string[];
} {
	const result: Record<string, string | boolean | string[]> & {_: string[]} = {_: []};
	const seen = new Set<string>();

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		if (!arg.startsWith('-')) {
			result._.push(arg);
			continue;
		}

		// Handle --flag=value
		const eqIdx = arg.indexOf('=');
		const key = eqIdx > 0 ? arg.slice(2, eqIdx) : arg.slice(2);
		const value = eqIdx > 0 ? arg.slice(eqIdx + 1) : null;

		// Resolve alias
		const resolvedKey = opts?.alias?.[key] ?? key;
		seen.add(resolvedKey);

		if (value !== null) {
			result[resolvedKey] = value;
		} else if (opts?.boolean?.includes(resolvedKey)) {
			result[resolvedKey] = true;
		} else if (opts?.string?.includes(resolvedKey)) {
			result[resolvedKey] = args[++i] ?? '';
		} else {
			result[resolvedKey] = args[++i] ?? true;
		}
	}

	return result;
}

// ═══════════════════════════════════════════════════════════════
// PROCESS INFO & UTILITIES
// ═══════════════════════════════════════════════════════════════

interface ProcessInfo {
	pid: number;
	ppid: number;
	cwd: string;
	argv: string[];
	platform: string;
	arch: string;
	nodeVersion: string;
	bunVersion: string;
	uptime: number; // seconds
}

function getProcessInfo(): ProcessInfo {
	return {
		pid: process.pid,
		ppid: process.ppid ?? 0,
		cwd: process.cwd(),
		argv: Bun.argv,
		platform: process.platform,
		arch: process.arch,
		nodeVersion: process.version,
		bunVersion: Bun.version,
		uptime: Bun.nanoseconds() / 1e9,
	};
}

function formatUptime(seconds: number): string {
	const units = [
		{name: 'd', secs: 86400},
		{name: 'h', secs: 3600},
		{name: 'm', secs: 60},
		{name: 's', secs: 1},
	];

	const parts: string[] = [];
	let remaining = seconds;

	for (const {name, secs} of units) {
		const count = Math.floor(remaining / secs);
		if (count > 0) {
			parts.push(`${count}${name}`);
			remaining %= secs;
		}
	}

	return parts.length > 0 ? parts.join(' ') : '0s';
}

// ═══════════════════════════════════════════════════════════════
// RESOURCE USAGE
// ═══════════════════════════════════════════════════════════════

interface ResourceUsage {
	contextSwitches: {
		voluntary: number; // Context switches requested by process
		involuntary: number; // Context switches by OS
	};
	cpuTime: {
		user: number; // User-mode CPU time (ms)
		system: number; // Kernel-mode CPU time (ms)
		total: number; // Sum
	};
	maxRSS: number; // Max resident set size (bytes)
	messages: {
		sent: number; // IPC messages sent
		received: number; // IPC messages received
	};
	ops: {
		in: number; // File system read ops
		out: number; // File system write ops
	};
	shmSize: number; // Shared memory size (bytes)
	signalCount: number; // Signals received
	swapCount: number; // Swap operations
}

function getResourceUsage(): ResourceUsage {
	const ru = process.resourceUsage();
	const userMs = ru.userCPUTime / 1000;
	const systemMs = ru.systemCPUTime / 1000;
	return {
		contextSwitches: {
			voluntary: ru.voluntaryContextSwitches,
			involuntary: ru.involuntaryContextSwitches,
		},
		cpuTime: {
			user: userMs,
			system: systemMs,
			total: userMs + systemMs,
		},
		maxRSS: ru.maxRSS * 1024, // getrusage reports KB on most platforms
		messages: {
			sent: ru.ipcSent ?? 0,
			received: ru.ipcReceived ?? 0,
		},
		ops: {
			in: ru.fsRead,
			out: ru.fsWrite,
		},
		shmSize: ru.sharedMemorySize,
		signalCount: ru.signalsCount,
		swapCount: ru.swappedOut,
	};
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export {
	// Spawn utilities
	spawnCapture,
	spawnSuccess,

	// Shell execution
	exec,
	execSync,

	// Stdin utilities
	readStdin,
	readStdinLines,
	readStdinTrimmed,
	prompt,

	// Terminal
	createTerminal,

	// Signal handling
	onSignal,
	setupGracefulShutdown,

	// Environment
	getEnv,
	setEnv,
	setEnvs,
	unsetEnv,
	envKeys,
	envEntries,

	// CLI args
	parseArgs,

	// Process info
	getProcessInfo,
	formatUptime,
	getResourceUsage,

	// Constants
	BUN_STREAM_CONFIG,

	// Types
	type SpawnOptions,
	type SpawnResult,
	type ExecOptions,
	type ProcessInfo,
	type ParseArgsOptions,
	type ResourceUsage,
	type TerminalOptions,
	type Terminal,
	type Subprocess,
	type FileSink,
};
