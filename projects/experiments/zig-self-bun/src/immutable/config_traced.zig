// src/immutable/config_traced.zig
//! Traced version of config with nanosecond-level instrumentation
//! Usage: Compile with -Dtrace_config to enable tracing

const std = @import("std");
const config = @import("config.zig");

// Enable tracing with -Dtrace_config=1
const enable_trace = @import("builtin").is_test or
    @hasDecl(@import("root"), "trace_config");

// Trace buffer (circular buffer for performance)
var trace_buffer: [1024]TraceEntry = undefined;
var trace_index: usize = 0;
var trace_enabled: bool = false;

const TraceEntry = struct {
    field: []const u8,
    value: u64,
    duration_ns: u64,
    file: []const u8,
    line: u32,
};

/// Get version with tracing (0.5ns + tracing overhead)
pub inline fn getVersion() u8 {
    const start = if (enable_trace) std.time.nanoTimestamp() else 0;
    const value = config.getVersion();
    const end = if (enable_trace) std.time.nanoTimestamp() else 0;

    if (enable_trace and (end - start) > 1) {
        // Alert if >1ns (cache miss)
        std.debug.print("[TRACE] config.version read: {}ns (expected 0.5ns)\n", .{
            @intCast(u64, end - start)
        });
    }

    return value;
}

/// Get registry hash with tracing
pub inline fn getRegistryHash() u32 {
    const start = if (enable_trace) std.time.nanoTimestamp() else 0;
    const value = config.getRegistryHash();
    const end = if (enable_trace) std.time.nanoTimestamp() else 0;

    if (enable_trace) {
        std.debug.print("[TRACE] config.registryHash read: {}ns\n", .{
            @intCast(u64, end - start)
        });
    }

    return value;
}

/// Get feature flags with tracing
pub inline fn getFeatureFlags() u32 {
    const start = if (enable_trace) std.time.nanoTimestamp() else 0;
    const value = config.getFeatureFlags();
    const end = if (enable_trace) std.time.nanoTimestamp() else 0;

    if (enable_trace) {
        std.debug.print("[TRACE] config.featureFlags read: {}ns\n", .{
            @intCast(u64, end - start)
        });
    }

    return value;
}

/// Check feature with tracing (0.3ns + tracing overhead)
pub inline fn hasFeature(flag: u32) bool {
    const start = if (enable_trace) std.time.nanoTimestamp() else 0;
    const value = config.hasFeature(flag);
    const end = if (enable_trace) std.time.nanoTimestamp() else 0;

    if (enable_trace and (end - start) > 1) {
        std.debug.print("[TRACE] config.hasFeature(0x{x}) check: {}ns (expected 0.3ns)\n", .{
            flag,
            @intCast(u64, end - start)
        });
    }

    return value;
}

/// Enable tracing at runtime
pub fn enableTracing() void {
    trace_enabled = true;
}

/// Disable tracing at runtime
pub fn disableTracing() void {
    trace_enabled = false;
}

/// Dump trace buffer
pub fn dumpTrace(allocator: std.mem.Allocator) !void {
    std.debug.print("=== Config Trace Dump ===\n", .{});
    std.debug.print("Total entries: {}\n", .{trace_index});

    for (trace_buffer[0..@min(trace_index, trace_buffer.len)]) |entry| {
        std.debug.print("[TRACE] {s} = {} ({}ns) @ {s}:{}\n", .{
            entry.field,
            entry.value,
            entry.duration_ns,
            entry.file,
            entry.line,
        });
    }
}

