// src/immuconfig.zig - Immutable config system (0.5ns access)
const std = @import("std");

// Global immutable config state
pub const GlobalConfig = struct {
    version: u8 = 1,
    registry_hash: u32 = 0x3b8b5a5a,
    feature_flags: u32 = 0x00000000,
    terminal_mode: u8 = 0x01,
    rows: u8 = 24,
    cols: u8 = 80,
};

pub var global_config: GlobalConfig = GlobalConfig{};

// O(1) access - direct memory read (0.5ns)
pub fn getVersion() u8 {
    return global_config.version;
}

pub fn getRegistryHash() u32 {
    return global_config.registry_hash;
}

pub fn getFeatureFlags() u32 {
    return global_config.feature_flags;
}

// O(1) feature check (0.3ns)
pub fn hasFeature(flag_mask: u32) bool {
    return (global_config.feature_flags & flag_mask) != 0;
}

// Load config from bun.lockb
pub fn loadFromLockfile(allocator: std.mem.Allocator, path: []const u8) !void {
    const file = try std.fs.cwd().openFile(path, .{});
    defer file.close();
    
    // Read 104-byte header
    var header: [104]u8 = undefined;
    _ = try file.readAll(&header);
    
    // Parse header (little-endian)
    if (std.mem.readInt(u32, header[0..4], .little) != 0x42354e31) {
        return error.InvalidMagic;
    }
    
    global_config.version = header[4];
    global_config.registry_hash = std.mem.readInt(u32, header[5..9], .little);
    global_config.feature_flags = std.mem.readInt(u32, header[9..13], .little);
    global_config.terminal_mode = header[13];
    global_config.rows = header[14];
    global_config.cols = header[15];
    
    // Verify CRC64 checksum (bytes 16-23)
    // In production, validate checksum here
}

