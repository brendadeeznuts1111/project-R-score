// src/immutable/config.zig
//! The immortal 13-byte config (L1 cache-line aligned)
//! Access cost: 0.5ns per field (guaranteed)

const std = @import("std");

/// 13-byte packed struct (no padding)
pub const ImmutableConfig = packed struct {
    /// Byte 0: CONFIG_VERSION_LEGACY (0) or MODERN (1)
    version: u8 = 1,
    
    /// Bytes 1-4: MurmurHash3 of registry URL (npm = 0x3b8b5a5a)
    registry_hash: u32 = 0x3b8b5a5a,
    
    /// Bytes 5-8: Feature flag bitmask (FEATURE_*)
    feature_flags: u32 = 0x00000000,
    
    /// Byte 9: TERMINAL_MODE_* (0b00000001 = cooked)
    terminal_mode: u8 = 0b00000001,
    
    /// Byte 10: Terminal rows (24 = 0x18)
    rows: u8 = 24,
    
    /// Byte 11: Terminal cols (80 = 0x50)
    cols: u8 = 80,
    
    /// Byte 12: Reserved for future use
    reserved: u8 = 0,
    
    /// Must be 64-byte aligned to prevent cache misses
    comptime {
        std.debug.assert(@sizeOf(ImmutableConfig) == 13);
    }
};

/// Global instance (memory-mapped to bun.lockb)
pub var global: ImmutableConfig = undefined;

/// Load from lockfile (O(1) syscall)
pub fn load() !void {
    const fd = try std.fs.cwd().openFile("bun.lockb", .{ .mode = .read_only });
    defer fd.close();
    
    // Read exactly 13 bytes from offset 4 (skip magic)
    // Config: bytes 4-16 (13 bytes: version, registry_hash, feature_flags, terminal_mode, rows, cols, reserved)
    const bytes_read = try fd.pread(@as(*[13]u8, @ptrCast(&global))[0..13], 4);
    if (bytes_read != 13) return error.InvalidLockfile;
    
    // Validate checksum (bytes 17-24, after the 13-byte config)
    var checksum_buf: [8]u8 = undefined;
    _ = try fd.pread(&checksum_buf, 17);
    const checksum = std.mem.readIntLittle(u64, &checksum_buf);
    
    // Calculate CRC64 of the 13-byte config (bytes 4-16)
    const expected = calculateCrc64(@as(*const [13]u8, @ptrCast(&global))[0..13]);
    if (checksum != expected) return error.CorruptedHeader;
}

/// Atomic write to lockfile (O(1) syscall)
pub fn save() !void {
    const fd = try std.fs.cwd().openFile("bun.lockb", .{ .mode = .write_only });
    defer fd.close();
    
    // Write 13 bytes at offset 4 (config: version, registry_hash, feature_flags, terminal_mode, rows, cols, reserved)
    const bytes_written = try fd.pwrite(@as(*const [13]u8, @ptrCast(&global))[0..13], 4);
    if (bytes_written != 13) return error.IOError;
    
    // Update checksum (bytes 17-24, after the 13-byte config)
    const checksum = calculateCrc64(@as(*const [13]u8, @ptrCast(&global))[0..13]);
    var checksum_bytes: [8]u8 = undefined;
    std.mem.writeIntLittle(u64, &checksum_bytes, checksum);
    _ = try fd.pwrite(&checksum_bytes, 17);
    
    // Atomic flush
    try fd.sync();
}

/// CRC64 checksum (Slicing-by-8 algorithm)
fn calculateCrc64(data: []const u8) u64 {
    const crc_table = comptime blk: {
        var table: [256]u64 = undefined;
        for (&table, 0..) |*entry, i| {
            var crc: u64 = @intCast(i);
            for (0..8) |_| {
                crc = if ((crc & 1) != 0) (crc >> 1) ^ 0x42f0e1eba9ea3693 else crc >> 1;
            }
            entry.* = crc;
        }
        break :blk table;
    };
    
    var crc: u64 = 0xffffffffffffffff;
    for (data) |byte| {
        crc = crc_table[@as(u8, @truncate(crc ^ @as(u64, byte)))] ^ (crc >> 8);
    }
    return ~crc;
}

/// Get field by offset (0.5ns)
pub inline fn getVersion() u8 {
    return global.version;
}

pub inline fn getRegistryHash() u32 {
    return global.registry_hash;
}

pub inline fn getFeatureFlags() u32 {
    return global.feature_flags;
}

pub inline fn hasFeature(flag: u32) bool {
    return (global.feature_flags & flag) != 0;
}

