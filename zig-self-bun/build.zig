// build.zig - Zig build configuration
const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    // Build immutable config library
    const config_lib = b.addStaticLibrary(.{
        .name = "immuconfig",
        .root_source_file = b.path("src/immutable/config.zig"),
        .target = target,
        .optimize = optimize,
    });

    b.installArtifact(config_lib);

    // Build features library
    const features_lib = b.addStaticLibrary(.{
        .name = "features",
        .root_source_file = b.path("src/features/flags.zig"),
        .target = target,
        .optimize = optimize,
    });

    b.installArtifact(features_lib);

    // Build terminal library
    const terminal_lib = b.addStaticLibrary(.{
        .name = "terminal",
        .root_source_file = b.path("src/terminal/pty.zig"),
        .target = target,
        .optimize = optimize,
    });

    terminal_lib.linkLibrary(config_lib);
    b.installArtifact(terminal_lib);

    // Build feature integration libraries
    const cookies_lib = b.addStaticLibrary(.{
        .name = "cookies",
        .root_source_file = b.path("src/cookies/parser.zig"),
        .target = target,
        .optimize = optimize,
    });
    cookies_lib.linkLibrary(config_lib);
    b.installArtifact(cookies_lib);

    const fetch_lib = b.addStaticLibrary(.{
        .name = "fetch",
        .root_source_file = b.path("src/fetch/proxy.zig"),
        .target = target,
        .optimize = optimize,
    });
    fetch_lib.linkLibrary(config_lib);
    b.installArtifact(fetch_lib);

    const serve_lib = b.addStaticLibrary(.{
        .name = "serve",
        .root_source_file = b.path("src/serve/logger.zig"),
        .target = target,
        .optimize = optimize,
    });
    serve_lib.linkLibrary(config_lib);
    b.installArtifact(serve_lib);

    const file_lib = b.addStaticLibrary(.{
        .name = "file",
        .root_source_file = b.path("src/file/stream.zig"),
        .target = target,
        .optimize = optimize,
    });
    file_lib.linkLibrary(config_lib);
    b.installArtifact(file_lib);

    const dns_lib = b.addStaticLibrary(.{
        .name = "dns",
        .root_source_file = b.path("src/dns/resolver.zig"),
        .target = target,
        .optimize = optimize,
    });
    dns_lib.linkLibrary(config_lib);
    b.installArtifact(dns_lib);

    const crypto_lib = b.addStaticLibrary(.{
        .name = "crypto",
        .root_source_file = b.path("src/crypto/password.zig"),
        .target = target,
        .optimize = optimize,
    });
    crypto_lib.linkLibrary(config_lib);
    b.installArtifact(crypto_lib);

    const jwt_lib = b.addStaticLibrary(.{
        .name = "jwt",
        .root_source_file = b.path("src/jwt/sign.zig"),
        .target = target,
        .optimize = optimize,
    });
    jwt_lib.linkLibrary(config_lib);
    b.installArtifact(jwt_lib);

    const sql_lib = b.addStaticLibrary(.{
        .name = "sql",
        .root_source_file = b.path("src/sql/driver.zig"),
        .target = target,
        .optimize = optimize,
    });
    sql_lib.linkLibrary(config_lib);
    b.installArtifact(sql_lib);

    const s3_lib = b.addStaticLibrary(.{
        .name = "s3",
        .root_source_file = b.path("src/s3/client.zig"),
        .target = target,
        .optimize = optimize,
    });
    s3_lib.linkLibrary(config_lib);
    b.installArtifact(s3_lib);

    // Build test executable
    const tests = b.addTest(.{
        .root_source_file = b.path("tests/config_test.zig"),
        .target = target,
        .optimize = optimize,
    });
    
    tests.linkLibrary(config_lib);
    
    const run_tests = b.addRunArtifact(tests);
    const test_step = b.step("test", "Run unit tests");
    test_step.dependOn(&run_tests.step);
}

