// src/registry.zig - Registry hash system (15ns hash)
const std = @import("std");

// MurmurHash3 32-bit implementation
pub fn murmurHash3(data: []const u8) u32 {
    const c1: u32 = 0xcc9e2d51;
    const c2: u32 = 0x1b873593;
    var h1: u32 = 0xdeadbeef;
    const nblocks = data.len / 4;
    
    // Process 4-byte blocks
    var i: usize = 0;
    while (i < nblocks) : (i += 1) {
        var k1: u32 = std.mem.readInt(u32, data[i * 4 ..][0..4], .little);
        
        k1 = std.math.rotl(u32, k1 *% c1, 15);
        k1 = k1 *% c2;
        
        h1 ^= k1;
        h1 = std.math.rotl(u32, h1, 13);
        h1 = h1 *% 5 +% 0xe6546b64;
    }
    
    // Handle remaining bytes
    const tail = data[nblocks * 4..];
    var k1: u32 = 0;
    
    if (tail.len >= 3) k1 ^= @as(u32, tail[2]) << 16;
    if (tail.len >= 2) k1 ^= @as(u32, tail[1]) << 8;
    if (tail.len >= 1) {
        k1 ^= tail[0];
        k1 = std.math.rotl(u32, k1 *% c1, 15);
        k1 = k1 *% c2;
        h1 ^= k1;
    }
    
    // Finalization
    h1 ^= @as(u32, @intCast(data.len));
    h1 ^= h1 >> 16;
    h1 = h1 *% 0x85ebca6b;
    h1 ^= h1 >> 13;
    h1 = h1 *% 0xc2b2ae35;
    h1 ^= h1 >> 16;
    
    return h1;
}

// Hash registry URL (15ns)
pub fn hashRegistryUrl(url: []const u8) u32 {
    return murmurHash3(url);
}

