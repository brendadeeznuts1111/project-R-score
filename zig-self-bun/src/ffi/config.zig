// src/ffi/config.zig
// FFI bridge for Bun config system
// In production, this would use Bun's FFI layer to expose Zig functions to JavaScript
const immuconfig = @import("immuconfig.zig");
const std = @import("std");

// FFI exports for JavaScript access
// These would be called via Bun's FFI system in production

// Get config version (0.5ns access)
export fn BunConfigGetVersion() u8 {
    return immuconfig.getVersion();
}

// Get registry hash
export fn BunConfigGetRegistryHash() u32 {
    return immuconfig.getRegistryHash();
}

// Get feature flags
export fn BunConfigGetFeatureFlags() u32 {
    return immuconfig.getFeatureFlags();
}

// Check if feature is enabled (0.3ns check)
export fn BunConfigHasFeature(flag_mask: u32) bool {
    return immuconfig.hasFeature(flag_mask);
}

// Feature flag masks
pub const FeatureFlags = struct {
    pub const DEBUG: u32 = 0x00000001;
    pub const PREMIUM_TYPES: u32 = 0x00000002;
    pub const PREMIUM: u32 = 0x00000004;
    pub const EXPERIMENTAL: u32 = 0x00000008;
};

// Get terminal mode
export fn BunConfigGetTerminalMode() u8 {
    return immuconfig.global_config.terminal_mode;
}

// Get terminal rows
export fn BunConfigGetTerminalRows() u8 {
    return immuconfig.global_config.rows;
}

// Get terminal cols
export fn BunConfigGetTerminalCols() u8 {
    return immuconfig.global_config.cols;
}

