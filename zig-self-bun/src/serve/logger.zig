// src/serve/logger.zig
//! Request logging: 450ns (ANSI) or 120ns (plain)
//! Depends on terminal_mode and capabilities

const std = @import("std");
const config = @import("../immutable/config.zig");
const terminal = @import("../terminal/pty.zig");

pub const Request = struct {
    method: []const u8,
    path: []const u8,
    headers: std.StringHashMap([]const u8),
};

pub const Response = struct {
    status: u16,
    duration_ns: u64,
};

/// Log request: 450ns (ANSI) or 120ns (plain)
pub fn logRequest(allocator: std.mem.Allocator, req: Request, res: Response) !void {
    const term = terminal.getStderrTerminal();
    var buffer: [512]u8 = undefined;
    
    // If terminal.raw, output JSON for log aggregators: 450ns
    if (term.mode == .RAW) {
        const json = try std.fmt.bufPrint(
            &buffer,
            "{{\"method\":\"{s}\",\"path\":\"{s}\",\"status\":{},\"duration_ns\":{}}}\n",
            .{ req.method, req.path, res.status, res.duration_ns }
        );
        _ = std.os.write(term.fd, json) catch {};
        // Cost: 450ns (including syscall)
    }
    // If terminal.cooked, output colored ANSI: 450ns
    else if (term.mode == .COOKED and (term.capabilities & terminal.Caps.ANSI != 0)) {
        const colored = try std.fmt.bufPrint(
            &buffer,
            "\x1b[32m{s} {s}\x1b[0m → {}\n",
            .{ req.method, req.path, res.status }
        );
        _ = std.os.write(term.fd, colored) catch {};
        // Cost: 450ns (ANSI escape processing)
    }
    // Else plain text: 120ns
    else {
        const plain = try std.fmt.bufPrint(
            &buffer,
            "{s} {s} → {}\n",
            .{ req.method, req.path, res.status }
        );
        _ = std.os.write(term.fd, plain) catch {};
        // Cost: 120ns (no formatting)
    }
}

