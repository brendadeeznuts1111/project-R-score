/**
 * @fileoverview NEXUS Tick Processing Module
 * @description High-performance tick processing with line movement, velocity, latency, and profiling
 * @module ticks
 */

// Tick Processor
export {
	createTickProcessor,
	globalTickProcessor,
	TickProcessor,
} from "./processor";
// Profiler
export {
	benchmark,
	createProfiler,
	globalProfiler,
	TickProfiler,
} from "./profiler";
// Storage
export {
	createTickStorage,
	getTickStorage,
	setTickStorage,
	TickStorage,
} from "./storage";
// Types
export type {
	LatencyStats,
	LineMovement,
	MovementAlert,
	ProcessedTick,
	ProfileSample,
	ProfilingReport,
	RawTick,
	TickBuffer,
	TickProcessorCallbacks,
	TickProcessorConfig,
	TickStats,
	VelocityWindow,
} from "./types";
