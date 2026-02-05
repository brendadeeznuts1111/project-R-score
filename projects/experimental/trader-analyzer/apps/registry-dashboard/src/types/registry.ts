/**
 * @fileoverview Registry Dashboard Type Definitions
 * @description Type definitions for package registry dashboard
 * @module apps/registry-dashboard/src/types/registry
 */

export interface Package {
	name: string;
	version: string;
	timestamp: number;
	published_by: string;
	package_json: string;
	tarball: ArrayBuffer;
}

export interface BenchmarkData {
	package_name: string;
	version: string;
	timestamp: number;
	benchmark_data: string;
	metadata: string;
}

export interface VersionHistory {
	version: string;
	timestamp: number;
	published_by: string;
	package_json: string;
}

export interface TeamOwnership {
	package: string;
	team: string;
	lead: string;
	maintainer: string;
	telegramHandle?: string;
	supergroup?: string;
	topic?: string;
}
