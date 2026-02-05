/**
 * Enterprise-grade type definitions for Bun v1.3.7 examples
 * Provides comprehensive type safety and validation
 */

// ============================================================================
// LOGGING TYPES
// ============================================================================

export enum LogLevel {
	DEBUG = "debug",
	INFO = "info",
	WARN = "warn",
	ERROR = "error",
	SUCCESS = "success",
}

export interface LogEntry {
	timestamp: string;
	level: LogLevel;
	message: string;
	metadata?: Record<string, any>;
	correlationId?: string;
	userId?: string;
	sessionId?: string;
	service?: string;
	version?: string;
}

export interface LogSession {
	timestamp: string;
	type: "log_session_start" | "log_session_end";
	version: string;
	bun_version: string;
	node_env: string;
	sessionId: string;
}

export interface LoggerConfig {
	logFile?: string;
	terminal?: boolean;
	level?: LogLevel;
	service?: string;
	enableColors?: boolean;
	enableMetrics?: boolean;
	bufferSize?: number;
	flushInterval?: number;
}

// ============================================================================
// PROFILING TYPES
// ============================================================================

export interface ProfileData {
	id: string;
	type: "cpu" | "heap" | "memory" | "performance";
	timestamp: string;
	duration: number;
	samples: number;
	data: any;
	metadata?: ProfileMetadata;
}

export interface ProfileMetadata {
	environment: string;
	service: string;
	version: string;
	systemInfo: SystemInfo;
	customFields?: Record<string, any>;
}

export interface SystemInfo {
	platform: string;
	arch: string;
	cpuCount: number;
	totalMemory: number;
	freeMemory: number;
	nodeVersion: string;
	bunVersion: string;
}

export interface BundleConfig {
	outputDir?: string;
	compression?: boolean;
	includeMetadata?: boolean;
	maxSize?: number;
	retention?: {
		maxAge: number;
		maxFiles: number;
	};
}

export interface ProfileBundle {
	id: string;
	name: string;
	createdAt: string;
	profiles: ProfileData[];
	metadata: BundleMetadata;
	size: number;
	compressed: boolean;
}

export interface BundleMetadata {
	version: string;
	environment: string;
	systemInfo: SystemInfo;
	profileCount: number;
	totalSize: number;
	compression: boolean;
	checksum: string;
	description?: string;
	tags?: string[];
	createdAt: string;
	createdBy: string;
}

// ============================================================================
// INSPECTOR TYPES
// ============================================================================

export interface InspectorConfig {
	port?: number;
	host?: string;
	enabled?: boolean;
	breakpoints?: boolean;
	console?: boolean;
	profiling?: boolean;
	security?: {
		allowedHosts?: string[];
		requireAuth?: boolean;
		token?: string;
	};
}

export interface DebugSession {
	id: string;
	startTime: string;
	status: "active" | "paused" | "completed";
	breakpoints: Breakpoint[];
	variables: Map<string, any>;
	callStack: CallFrame[];
}

export interface Breakpoint {
	id: string;
	scriptId: string;
	lineNumber: number;
	columnNumber?: number;
	condition?: string;
	enabled: boolean;
}

export interface CallFrame {
	functionName: string;
	scriptId: string;
	lineNumber: number;
	columnNumber: number;
	url: string;
	scopeChain: Scope[];
}

export interface Scope {
	type: "local" | "closure" | "catch" | "global" | "with";
	object: RemoteObject;
}

export interface RemoteObject {
	type: string;
	subtype?: string;
	className?: string;
	value?: any;
	description?: string;
}

// ============================================================================
// TERMINAL TYPES
// ============================================================================

export interface TerminalConfig {
	enabled?: boolean;
	historySize?: number;
	prompt?: string;
	colors?: boolean;
	autoComplete?: boolean;
	shortcuts?: Record<string, string>;
	security?: {
		allowCommands?: string[];
		blockCommands?: string[];
		requireAuth?: boolean;
	};
}

export interface TerminalCommand {
	command: string;
	args: string[];
	timestamp: string;
	userId?: string;
	sessionId: string;
	result?: CommandResult;
}

export interface CommandResult {
	success: boolean;
	output?: string;
	error?: string;
	duration: number;
	exitCode?: number;
}

export interface TerminalSession {
	id: string;
	startTime: string;
	lastActivity: string;
	commands: TerminalCommand[];
	environment: Record<string, string>;
	workingDirectory: string;
}

// ============================================================================
// MONITORING TYPES
// ============================================================================

export interface MetricsConfig {
	enabled?: boolean;
	interval?: number;
	endpoint?: string;
	headers?: Record<string, string>;
	bufferSize?: number;
	flushInterval?: number;
}

export interface SystemMetrics {
	timestamp: string;
	cpu: {
		usage: number;
		loadAverage: number[];
	};
	memory: {
		used: number;
		free: number;
		total: number;
		heapUsed: number;
		heapTotal: number;
	};
	disk: {
		used: number;
		free: number;
		total: number;
	};
	network: {
		bytesIn: number;
		bytesOut: number;
		connections: number;
	};
	process: {
		pid: number;
		uptime: number;
		version: string;
	};
}

export interface AlertRule {
	id: string;
	name: string;
	condition: string;
	threshold: number;
	operator: ">" | "<" | ">=" | "<=" | "==" | "!=";
	enabled: boolean;
	severity: "low" | "medium" | "high" | "critical";
	actions: AlertAction[];
}

export interface AlertAction {
	type: "log" | "webhook" | "email" | "slack";
	config: Record<string, any>;
}

export interface Alert {
	id: string;
	ruleId: string;
	timestamp: string;
	severity: "low" | "medium" | "high" | "critical";
	message: string;
	data: any;
	resolved: boolean;
	resolvedAt?: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface AppError extends Error {
	code: string;
	statusCode?: number;
	details?: Record<string, any>;
	timestamp: string;
	correlationId?: string;
	service?: string;
}

export interface ValidationError {
	field: string;
	message: string;
	value?: any;
	constraint?: string;
}

export interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
	data?: any;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface EnterpriseConfig {
	logging: LoggerConfig;
	profiling: BundleConfig;
	inspector: InspectorConfig;
	terminal: TerminalConfig;
	metrics: MetricsConfig;
	security: {
		encryption: boolean;
		authentication: boolean;
		rateLimit: boolean;
		cors: boolean;
	};
	features: {
		jsonl: boolean;
		wrapAnsi: boolean;
		archive: boolean;
		inspector: boolean;
		terminal: boolean;
	};
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> &
	Partial<Pick<T, K>>;

export type EventHandler<T = any> = (event: T) => void | Promise<void>;

export type AsyncFunction<T = any, R = any> = (...args: T[]) => Promise<R>;

export type Constructor<T = {}> = new (...args: any[]) => T;

// ============================================================================
// EXPORTS
// ============================================================================

export * from "./logging";
export * from "./validation";
