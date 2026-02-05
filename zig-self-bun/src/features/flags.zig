// src/features/flags.zig
//! Compile-time feature flag constants
//! Check cost: 0.3ns (bitwise AND)

const std = @import("std");

/// Bit 0: Enable premium TypeScript types (file sizes, advanced introspection)
pub const PREMIUM_TYPES: u32 = 0x00000001;

/// Bit 1: Use private registry for @mycompany/* packages
pub const PRIVATE_REGISTRY: u32 = 0x00000002;

/// Bit 2: Enable debug logs and assertions
pub const DEBUG: u32 = 0x00000004;

/// Bit 3: Enable beta API routes (unstable endpoints)
pub const BETA_API: u32 = 0x00000008;

/// Bit 4: Disable native binary linking (use npm style)
pub const DISABLE_BINLINKING: u32 = 0x00000010;

/// Bit 5: Disable script ignoring (always run postinstall)
pub const DISABLE_IGNORE_SCRIPTS: u32 = 0x00000020;

/// Bit 6: Force PTY raw mode (no line buffering)
pub const TERMINAL_RAW: u32 = 0x00000040;

/// Bit 7: Disable isolated linker (use hoisted even with workspaces)
pub const DISABLE_ISOLATED_LINKER: u32 = 0x00000080;

/// Bits 8-31: Reserved for future features (must be 0 in v1.3.5)
/// Custom flags (e.g., @mycompany/TYPES_MYCOMPANY) start at bit 8
pub const TYPES_MYCOMPANY: u32 = 0x00000100;
pub const MOCK_S3: u32 = 0x00000200;
pub const FAST_CACHE: u32 = 0x00000400;

/// Get mask by name (5ns hash lookup)
pub fn getMask(name: []const u8) ?u32 {
    const Map = std.ComptimeStringMap(u32, .{
        .{ "PREMIUM_TYPES", PREMIUM_TYPES },
        .{ "PRIVATE_REGISTRY", PRIVATE_REGISTRY },
        .{ "DEBUG", DEBUG },
        .{ "BETA_API", BETA_API },
        .{ "DISABLE_BINLINKING", DISABLE_BINLINKING },
        .{ "DISABLE_IGNORE_SCRIPTS", DISABLE_IGNORE_SCRIPTS },
        .{ "TERMINAL_RAW", TERMINAL_RAW },
        .{ "DISABLE_ISOLATED_LINKER", DISABLE_ISOLATED_LINKER },
        .{ "TYPES_MYCOMPANY", TYPES_MYCOMPANY },
        .{ "MOCK_S3", MOCK_S3 },
        .{ "FAST_CACHE", FAST_CACHE },
    });
    return Map.get(name);
}

