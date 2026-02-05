# Processes Examples

This directory contains examples of child process management using Bun's `Bun.spawn()` API and related process operations.

## Files

- `basic-spawn.ts` - Simple child process spawning examples
- `process-config.ts` - Spawn configuration options (cwd, env, onExit, etc.)
- `stdout-stderr.ts` - Working with process output streams
- `parent.ts` & `child.ts` - IPC (Inter-Process Communication) between parent and child processes, includes SIGINT (Ctrl+C) handling and edge case management
- `sigint-demo.ts` - Comprehensive signal handling with SIGINT, beforeExit, and exit events
- `process-lifecycle-demo.ts` - Dedicated demonstration of beforeExit and exit process lifecycle events
- `signal-comparison-demo.ts` - Compares when to use specific signals vs catch-all lifecycle events
- `nanoseconds-timing-demo.ts` - Demonstrates Bun.nanoseconds() for precise process timing and benchmarking
- `edge-cases-demo.ts` - Comprehensive testing of IPC serialization, process lifecycle, and error conditions

## Bun.spawn() Overview

Bun's `Bun.spawn()` provides a powerful way to execute child processes with:

- Simple API: `Bun.spawn(["command", "arg1", "arg2"])`
- Async completion: `await proc.exited`
- Event handling: `onExit` callback
- Environment control: Custom `cwd` and `env`
- Stream handling: Readable `stdout` and `stderr`

See [Bun.spawn documentation](https://bun.sh/docs/runtime/child-process) for complete details.
