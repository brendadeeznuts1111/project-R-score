// EMERGENCY STUB - Migration in progress
export const VERSION = "1.0.0";
export class LoggerStub {
	info(m: string, meta?: any) {
		console.info(`[INFO] ${m}`, meta || "");
	}
	error(m: string, meta?: any) {
		console.error(`[ERROR] ${m}`, meta || "");
	}
	debug(m: string, meta?: any) {
		console.info(`[DEBUG] ${m}`, meta || "");
	}
	warn(m: string, meta?: any) {
		console.warn(`[WARN] ${m}`, meta || "");
	}
	success(m: string, meta?: any) {
		console.info(`[SUCCESS] ${m}`, meta || "");
	}
}
export const getLogger = () => new LoggerStub();
export const resetLogger = () => {};
export const isInternalIP = (url: string) =>
	/^(192\.168\.|10\.|127\.|0\.0\.0\.0|localhost|::1)/i.test(url);
export interface ProfileConfig {
	name: string;
	version?: string;
}
export interface LogEntry {
	level: string;
	message: string;
	timestamp?: string;
	meta?: any;
}
export interface RSSFeedConfig {
	id: string;
	url: string;
	title?: string;
}
export interface BridgeOptions {
	strict?: boolean;
	timeout?: number;
}
export class SecurityError extends Error {}
