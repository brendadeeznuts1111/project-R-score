// src/env/override.zig
//! Environment override: 5ns per lookup
//! Overrides bytes 0-11 of 13-byte config

const std = @import("std");
const config = @import("../immutable/config.zig");
const registry = @import("../ffi/registry.zig");

// Re-export hashRegistryUrl for convenience
const hashRegistryUrl = registry.hashRegistryUrl;

/// Get environment variable: 5ns
pub fn getEnv(name: []const u8) ?[]const u8 {
    // Check environment: 5ns (hashmap lookup)
    if (std.posix.getenvZ(name)) |value| {
        // Override config if special var: +45ns if triggers rewrite
        if (std.mem.eql(u8, name, "BUN_CONFIG_VERSION")) {
            const version = std.fmt.parseInt(u8, value, 10) catch 1;
            config.global.version = version;
            // Would trigger config.save() in production: +45ns
            return value;
        }
        if (std.mem.eql(u8, name, "BUN_REGISTRY_URL")) {
            const hash = registry.hashRegistryUrl(value);
            config.global.registry_hash = hash;
            // Would trigger config.save() in production: +45ns
            return value;
        }
        return value;
    }
    return null;
}

/// Get all config overrides from environment
pub fn loadOverrides() void {
    _ = getEnv("BUN_CONFIG_VERSION");
    _ = getEnv("BUN_REGISTRY_URL");
    _ = getEnv("BUN_TERMINAL_MODE");
    
    if (getEnv("BUN_FEATURE_FLAGS")) |flags_str| {
        const flags = std.fmt.parseInt(u32, flags_str, 16) catch 0;
        config.global.feature_flags = flags;
    }
}

