// src/terminal.zig - Terminal config (144ns init)
const std = @import("std");
const immuconfig = @import("immuconfig.zig");

pub const TerminalMode = enum(u8) {
    raw = 0x00,
    cooked = 0x01,
};

pub const TerminalConfig = struct {
    mode: TerminalMode,
    rows: u8,
    cols: u8,
};

// Initialize terminal config from global config (144ns)
pub fn init() TerminalConfig {
    return TerminalConfig{
        .mode = if (immuconfig.global_config.terminal_mode == 0x01) .cooked else .raw,
        .rows = immuconfig.global_config.rows,
        .cols = immuconfig.global_config.cols,
    };
}

// Get terminal dimensions
pub fn getDimensions() struct { rows: u8, cols: u8 } {
    return .{
        .rows = immuconfig.global_config.rows,
        .cols = immuconfig.global_config.cols,
    };
}

