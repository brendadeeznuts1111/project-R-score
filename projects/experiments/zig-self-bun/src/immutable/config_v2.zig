// src/immutable/config_v2.zig
//! Future version of config (14 bytes total, extended from v1)
//! Forward compatibility migration example

const std = @import("std");
const v1 = @import("config.zig");

/// 14-byte packed struct (extended from v1's 13 bytes)
pub const ImmutableConfigV2 = packed struct {
    /// Byte 0: CONFIG_VERSION = 2
    version: u8 = 2,
    
    /// Bytes 1-4: MurmurHash3 of registry URL (same as v1)
    registry_hash: u32 = 0x3b8b5a5a,
    
    /// Bytes 5-8: Feature flag bitmask (same as v1)
    feature_flags: u32 = 0x00000000,
    
    /// Byte 9: TERMINAL_MODE_* (same as v1)
    terminal_mode: u8 = 0b00000001,
    
    /// Byte 10: Terminal rows (same as v1)
    rows: u8 = 24,
    
    /// Byte 11: Terminal cols (same as v1)
    cols: u8 = 80,
    
    /// Byte 12: Reserved (was reserved in v1)
    reserved: u8 = 0,
    
    /// Byte 13: NEW - Pool size (u8)
    pool_size: u8 = 100,
    
    /// Must be 64-byte aligned
    comptime {
        std.debug.assert(@sizeOf(ImmutableConfigV2) == 14);
    }
};

/// Global v2 instance
pub var global_v2: ImmutableConfigV2 = undefined;

/// Migrate from v1 to v2
pub fn migrateFromV1(v1_config: *v1.ImmutableConfig) ImmutableConfigV2 {
    return ImmutableConfigV2{
        .version = 2,
        .registry_hash = v1_config.registry_hash,
        .feature_flags = v1_config.feature_flags,
        .terminal_mode = v1_config.terminal_mode,
        .rows = v1_config.rows,
        .cols = v1_config.cols,
        .reserved = v1_config.reserved,
        .pool_size = 100, // Default for new field
    };
}

/// Load v2 config from lockfile
pub fn load() !void {
    const fd = try std.fs.cwd().openFile("bun.lockb", .{ .mode = .read_only });
    defer fd.close();
    
    // Read version first to determine which struct to use
    var version_byte: [1]u8 = undefined;
    _ = try fd.pread(&version_byte, 4);
    
    const version = version_byte[0];
    
    if (version == 1) {
        // Load v1 and migrate
        var v1_config: v1.ImmutableConfig = undefined;
        _ = try fd.pread(@as(*[13]u8, @ptrCast(&v1_config))[0..13], 4);
        
        global_v2 = migrateFromV1(&v1_config);
    } else if (version == 2) {
        // Load v2 directly
        const bytes_read = try fd.pread(@as(*[14]u8, @ptrCast(&global_v2))[0..14], 4);
        if (bytes_read != 14) return error.InvalidLockfile;
    } else {
        return error.UnsupportedVersion;
    }
    
    // Validate checksum (would need to recalculate for v2)
    // Simplified for now
}

/// Save v2 config to lockfile
pub fn save() !void {
    const fd = try std.fs.cwd().openFile("bun.lockb", .{ .mode = .write_only });
    defer fd.close();
    
    // Write 14 bytes at offset 4
    const bytes_written = try fd.pwrite(@as(*const [14]u8, @ptrCast(&global_v2))[0..14], 4);
    if (bytes_written != 14) return error.IOError;
    
    // Update checksum (simplified - would need proper CRC64 for v2)
    try fd.sync();
}

// Accessors
pub inline fn getVersion() u8 {
    return global_v2.version;
}

pub inline fn getPoolSize() u8 {
    return global_v2.pool_size;
}

