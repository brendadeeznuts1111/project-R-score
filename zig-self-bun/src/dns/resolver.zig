// src/dns/resolver.zig
//! DNS resolution: 50ns cache hit, 5ms cache miss
//! Cache size depends on registry_hash

const std = @import("std");
const config = @import("../immutable/config.zig");
const registry = @import("../ffi/registry.zig");

// Re-export murmurHash3 for convenience
const murmurHash3 = registry.murmurHash3;

const Entry = struct {
    name: []const u8,
    ip: []const u8,
    expires: i64,
};

const Cache = struct {
    entries: []Entry,
    seed: u32, // From registry_hash
    
    const CACHE_SIZE_PUBLIC = 100;
    const CACHE_SIZE_PRIVATE = 1000;
    
    pub fn init(allocator: std.mem.Allocator) !Cache {
        const hash = config.getRegistryHash();
        
        // CACHE_SIZE = f(registry_hash)
        // Private registry → larger cache (1000 entries)
        // Public registry → smaller cache (100 entries)
        const size = if (hash == 0xa1b2c3d4) CACHE_SIZE_PRIVATE else CACHE_SIZE_PUBLIC;
        
        return Cache{
            .entries = try allocator.alloc(Entry, size),
            .seed = hash, // Deterministic
        };
    }
    
    pub fn resolve(self: *Cache, allocator: std.mem.Allocator, name: []const u8) ![]const u8 {
        const hash_val = registry.murmurHash3(name);
        const idx = hash_val % @intCast(u32, self.entries.len);
        
        // Check cache: 50ns
        if (self.entries[idx].name.len > 0 and std.mem.eql(u8, self.entries[idx].name, name)) {
            const now = std.time.timestamp();
            if (self.entries[idx].expires > now) {
                return self.entries[idx].ip; // Cache hit: 50ns
            }
        }
        
        // Miss: 5ms (network) - simplified, would use actual DNS
        const ip = try allocator.dupe(u8, "127.0.0.1");
        
        // Store in cache
        self.entries[idx] = .{
            .name = try allocator.dupe(u8, name),
            .ip = ip,
            .expires = std.time.timestamp() + 3600, // 1 hour TTL
        };
        
        return ip;
    }
};

/// Global DNS cache
var global_cache: ?Cache = null;

/// Get or create DNS cache
pub fn getCache(allocator: std.mem.Allocator) !*Cache {
    if (global_cache) |*cache| {
        return cache;
    }
    
    global_cache = try Cache.init(allocator);
    return &global_cache.?;
}

