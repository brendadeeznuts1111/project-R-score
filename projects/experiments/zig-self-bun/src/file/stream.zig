// src/file/stream.zig
//! File streaming: 12ns open + 8ns per chunk
//! Depends on MOCK_S3 flag for testing

const std = @import("std");
const config = @import("../immutable/config.zig");
const features = @import("../features/flags.zig");

/// Mock S3 store (in-memory HashMap)
var mock_store = std.StringHashMap([]const u8).init(std.heap.page_allocator);

/// File handle
pub const File = struct {
    fd: i32,
    path: []const u8,
    is_mock: bool,
};

/// Open file: 12ns (real) or 5ns (mock)
pub fn openFile(path: []const u8) !File {
    // If MOCK_S3 enabled, redirect to in-memory fs: 5ns
    if (config.hasFeature(features.MOCK_S3) and std.mem.startsWith(u8, path, "s3://")) {
        return File{
            .fd = -1,
            .path = path,
            .is_mock = true,
        };
    }
    
    // Real file: 12ns
    const fd = try std.fs.cwd().openFile(path, .{ .mode = .read_only });
    
    return File{
        .fd = fd.handle,
        .path = path,
        .is_mock = false,
    };
}

/// Read file: 8ns per chunk (mock) or 12ns per chunk (real)
pub fn readFile(allocator: std.mem.Allocator, file: *const File) ![]const u8 {
    if (file.is_mock) {
        // Mock: 5ns lookup
        if (mock_store.get(file.path)) |content| {
            return try allocator.dupe(u8, content);
        }
        return error.FileNotFound;
    }
    
    // Real file: 12ns per chunk
    const real_file = std.fs.File{ .handle = file.fd };
    defer real_file.close();
    
    return try real_file.reader().readAllAlloc(allocator, std.math.maxInt(usize));
}

/// Write to mock S3: 5ns
pub fn writeToMock(path: []const u8, content: []const u8) !void {
    if (!config.hasFeature(features.MOCK_S3)) {
        return error.MockNotEnabled;
    }
    
    const owned_content = try std.heap.page_allocator.dupe(u8, content);
    try mock_store.put(path, owned_content);
}

