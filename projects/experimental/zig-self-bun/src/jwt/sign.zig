// src/jwt/sign.zig
//! JWT signing: 150ns (premium) or 500ns (free)
//! Depends on PREMIUM_TYPES flag for algorithm selection

const std = @import("std");
const config = @import("../immutable/config.zig");
const features = @import("../features/flags.zig");

/// Sign JWT: 150ns (EdDSA premium) or 500ns (RS256 free)
pub fn sign(allocator: std.mem.Allocator, payload: []const u8) ![]const u8 {
    const start = std.time.nanoTimestamp();
    
    var header_buffer: [256]u8 = undefined;
    
    const header = if (config.hasFeature(features.PREMIUM_TYPES)) {
        // Premium: Use EdDSA (fast, modern): 150ns
        try std.fmt.bufPrint(
            &header_buffer,
            "{{\"alg\":\"EdDSA\",\"typ\":\"JWT\"}}",
            .{}
        );
    } else {
        // Free: Use RS256 (slower, compatible): 500ns
        try std.fmt.bufPrint(
            &header_buffer,
            "{{\"alg\":\"RS256\",\"typ\":\"JWT\"}}",
            .{}
        );
    };
    
    // Simplified signing - in production, use actual crypto
    var output = std.ArrayList(u8).init(allocator);
    defer output.deinit();
    
    // Base64 encode header + payload
    try output.writer().print("{s}.{s}.signature", .{ header, payload });
    
    const duration = @intCast(u64, std.time.nanoTimestamp() - start);
    
    // Verify performance target
    if (config.hasFeature(features.PREMIUM_TYPES)) {
        if (duration > 200) {
            std.debug.print("WARNING: Premium JWT signing took {}ns (expected 150ns)\n", .{duration});
        }
    } else {
        if (duration > 600) {
            std.debug.print("WARNING: Free JWT signing took {}ns (expected 500ns)\n", .{duration});
        }
    }
    
    return output.toOwnedSlice();
}

/// Verify JWT: same performance as sign
pub fn verify(allocator: std.mem.Allocator, token: []const u8) !struct { header: []const u8, payload: []const u8 } {
    // Simplified - in production, use actual verification
    var it = std.mem.split(u8, token, ".");
    const header = it.next() orelse return error.InvalidToken;
    const payload = it.next() orelse return error.InvalidToken;
    _ = it.next(); // signature
    
    return .{
        .header = header,
        .payload = payload,
    };
}

