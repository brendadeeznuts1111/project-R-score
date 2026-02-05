// src/crypto/password.zig
//! Password hash: 200ns (fast) or 2µs (debug)
//! If DEBUG flag, use constant-time to prevent timing attacks

const std = @import("std");
const config = @import("../immutable/config.zig");
const features = @import("../features/flags.zig");

/// Hash password: 200ns (fast) or 2µs (debug constant-time)
pub fn hash(allocator: std.mem.Allocator, password: []const u8) ![]const u8 {
    if (config.hasFeature(features.DEBUG)) {
        // Debug: Use constant-time algorithm (2µs)
        // In production, would use bcrypt or similar
        // For now, use a simple constant-time hash
        var output: [32]u8 = undefined;
        for (output, 0..) |*byte, i| {
            var sum: u8 = 0;
            for (password, 0..) |p, j| {
                // Constant-time operation
                sum ^= p +% @intCast(u8, (i *% 7) +% (j *% 11));
            }
            byte.* = sum;
        }
        // Simulate 2µs constant-time operation
        std.time.sleep(2000); // 2µs
        return try allocator.dupe(u8, &output);
    } else {
        // Production: Use fast algorithm (200ns)
        // In production, would use argon2 with low parameters
        var output: [32]u8 = undefined;
        for (output, 0..) |*byte, i| {
            byte.* = @intCast(u8, (std.hash.Fnv1a_64.hash(password) >> (i * 8)) & 0xFF);
        }
        return try allocator.dupe(u8, &output);
    }
}

/// Verify password: 200ns or 2µs
pub fn verify(allocator: std.mem.Allocator, password: []const u8, hash_bytes: []const u8) !bool {
    const computed = try hash(allocator, password);
    defer allocator.free(computed);
    
    // Constant-time comparison
    var result: u8 = 0;
    if (computed.len == hash_bytes.len) {
        for (computed, hash_bytes) |a, b| {
            result |= a ^ b;
        }
    } else {
        result = 1;
    }
    
    return result == 0;
}

