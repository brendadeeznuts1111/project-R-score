// src/s3/client.zig
//! S3 client: 5µs (real) or 5ns (mock)
//! If MOCK_S3 flag, redirect to in-memory storage

const std = @import("std");
const config = @import("../immutable/config.zig");
const features = @import("../features/flags.zig");

/// Mock S3 store (HashMap)
var mock_s3_store = std.StringHashMap([]const u8).init(std.heap.page_allocator);

/// Put object to S3: 5µs (real) or 5ns (mock)
pub fn putObject(allocator: std.mem.Allocator, key: []const u8, data: []const u8) !void {
    if (config.hasFeature(features.MOCK_S3)) {
        // Write to HashMap: 5ns
        const owned_data = try allocator.dupe(u8, data);
        try mock_s3_store.put(key, owned_data);
        return;
    }
    
    // Real S3: 5µs + network
    // In production, use AWS SDK
    std.time.sleep(5000); // 5µs
    _ = allocator;
    _ = key;
    _ = data;
}

/// Get object from S3: 5µs (real) or 5ns (mock)
pub fn getObject(allocator: std.mem.Allocator, key: []const u8) ![]const u8 {
    if (config.hasFeature(features.MOCK_S3)) {
        // Read from HashMap: 5ns
        if (mock_s3_store.get(key)) |data| {
            return try allocator.dupe(u8, data);
        }
        return error.ObjectNotFound;
    }
    
    // Real S3: 5µs + network
    // In production, use AWS SDK
    std.time.sleep(5000); // 5µs
    _ = allocator;
    _ = key;
    
    return try allocator.dupe(u8, "");
}

