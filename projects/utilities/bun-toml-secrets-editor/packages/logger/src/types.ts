/**
 * Enterprise logging types for Bun v1.3.7 JSONL integration
 */

import type { LogEntry, LoggerConfig, LogLevel } from "./index";

export interface LoggerMetrics {
	totalLogs: number;
	logsByLevel: Record<LogLevel, number>;
	errorRate: number;
	averageLogSize: number;
	bufferUtilization: number;
	lastFlushTime: string;
}

export interface LogBuffer {
	entries: LogEntry[];
	maxSize: number;
	flushInterval: number;
	lastFlush: number;
	isFlushing: boolean;
}

export interface LogFilter {
	levels?: LogLevel[];
	services?: string[];
	timeRange?: {
		start: string;
		end: string;
	};
	correlationId?: string;
	userId?: string;
	metadata?: Record<string, any>;
}

export interface LogSearchResult {
	entries: LogEntry[];
	total: number;
	page: number;
	pageSize: number;
	hasMore: boolean;
}

export interface LogFormatter {
	format: "json" | "text" | "jsonl" | "custom";
	colors?: boolean;
	timestamp?: boolean;
	metadata?: boolean;
	custom?: (entry: LogEntry) => string;
}

export interface LogTransport {
	type: "file" | "console" | "http" | "websocket" | "database";
	config: Record<string, any>;
	enabled: boolean;
	level: LogLevel;
}

export interface LogRotation {
	enabled: boolean;
	maxSize: number;
	maxFiles: number;
	compress: boolean;
	pattern: string;
}

export interface LoggerOptions extends LoggerConfig {
	transports?: LogTransport[];
	rotation?: LogRotation;
	buffer?: LogBuffer;
	formatter?: LogFormatter;
	metrics?: boolean;
	correlationId?: boolean;
	structured?: boolean;
}

export * from "./index";
