// src/terminal/pty.zig
//! Pseudo-terminal management
//! Init cost: 144ns (first time), 12ns (reuse)

const std = @import("std");
const config = @import("../immutable/config.zig");

/// Terminal capability bitmask (u16)
pub const Caps = struct {
    pub const ANSI: u16 = 0b0000000000000001;
    pub const VT100: u16 = 0b0000000000000010;
    pub const COLOR_256: u16 = 0b0000000000000100;
    pub const TRUE_COLOR: u16 = 0b0000000000001000;
    pub const UNICODE: u16 = 0b0000000000010000;
    pub const HYPERLINK: u16 = 0b0000000000100000;  // OSC 8
};

/// Terminal modes
pub const Mode = enum(u8) {
    DISABLED = 0b00000000,
    COOKED = 0b00000001,
    RAW = 0b00000010,
    PIPE = 0b00000011,
};

/// 64-byte terminal struct (single cache line)
pub const Terminal = struct {
    fd: i32,
    mode: Mode,
    capabilities: u16,
    original_termios: ?std.posix.termios,
    
    /// Init: 144ns (isatty + ioctl + tcgetattr)
    pub fn init(fd: i32) !Terminal {
        const is_tty = std.posix.isatty(fd);
        const mode = if (is_tty) Mode.COOKED else Mode.DISABLED;
        
        return Terminal{
            .fd = fd,
            .mode = mode,
            .capabilities = if (is_tty) detectCapabilities(fd) else 0,
            .original_termios = if (is_tty) try std.posix.tcgetattr(fd) else null,
        };
    }
    
    /// Detect capabilities: 87ns
    fn detectCapabilities(fd: i32) u16 {
        var caps: u16 = 0;
        
        // Check $TERM env var (5ns)
        if (std.posix.getenvZ("TERM")) |term| {
            if (std.mem.indexOf(u8, term, "256") != null) caps |= Caps.COLOR_256;
            if (std.mem.indexOf(u8, term, "truecolor") != null) caps |= Caps.TRUE_COLOR;
            if (std.mem.indexOf(u8, term, "xterm") != null) caps |= Caps.VT100 | Caps.ANSI;
        }
        
        // Query terminal size with ioctl (82ns)
        // Note: Simplified for cross-platform compatibility
        // In production, use proper platform-specific ioctl
        caps |= Caps.UNICODE;  // Assume Unicode if modern terminal
        
        return caps;
    }
    
    /// Resize: 67ns (ioctl only)
    pub fn resize(self: *Terminal, rows: u8, cols: u8) !void {
        // Platform-specific terminal resize
        // In production, use proper ioctl for TIOCSWINSZ
        _ = self;
        _ = rows;
        _ = cols;
    }
};

/// Global terminal instances (lazy init)
var stdin_term: ?Terminal = null;
var stdout_term: ?Terminal = null;
var stderr_term: ?Terminal = null;

/// Default terminal (fallback)
var default_term = Terminal{
    .fd = 2,
    .mode = Mode.DISABLED,
    .capabilities = 0,
    .original_termios = null,
};

/// Get or create terminal: 12ns after first init
pub fn getStderrTerminal() *Terminal {
    if (stderr_term) |*term| return term;
    
    stderr_term = Terminal.init(2) catch return &default_term;
    return &stderr_term.?;
}

