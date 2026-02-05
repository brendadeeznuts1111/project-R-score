# Test Process Management

This guide explains how to gracefully and immediately stop test execution processes.

## 🎯 Quick Reference

### Graceful Termination

```bash
# Send SIGTERM (graceful shutdown)
kill -SIGTERM <pid>

# Using the process manager
bun run test:process:kill <pid>
./scripts/kill-test.sh <pid>
```

### Immediate Termination

```bash
# Send SIGKILL (immediate shutdown)
kill -SIGKILL <pid>

# Using the process manager with force
bun run test:process:kill <pid> --signal=SIGKILL
./scripts/kill-test.sh <pid> --force
```

## 🛠️ Available Tools

### 1. Test Process Manager (TypeScript)

Advanced process management with monitoring and batch operations.

```bash
# Kill a specific process
bun run test:process:kill <pid> [--signal=SIGTERM|SIGKILL]

# List running processes
bun run test:process:list [--tests-only]

# Monitor test processes continuously
bun run test:process:monitor

# Graceful shutdown with timeout
bun run test:process:graceful <pid> [--timeout=5000]

# Kill all test processes
bun run test:process:kill-all [--signal=SIGTERM]
```

### 2. Quick Kill Script (Bash)

Simple shell wrapper for quick process termination.

```bash
# Graceful kill
./scripts/kill-test.sh <pid>

# Force kill
./scripts/kill-test.sh <pid> --force

# Kill all test processes
./scripts/kill-test.sh all
./scripts/kill-test.sh all --force
```

### 3. Native Commands

Direct system commands for process control.

```bash
# Check if process exists
kill -0 <pid>

# Send specific signal
kill -<signal> <pid>

# List all processes
ps aux | grep test

# List test processes only
ps aux | grep -E "(bun test|npm test|jest|vitest)"
```

## 📡 Signal Types

| Signal | Name      | Effect                | Use Case                     |
| ------ | --------- | --------------------- | ---------------------------- |
| SIGTERM| Termination| Graceful shutdown     | Default, allows cleanup      |
| SIGKILL| Kill       | Immediate termination | Force quit, no cleanup       |
| SIGINT | Interrupt  | Ctrl+C equivalent     | Interactive cancellation      |
| SIGHUP | Hang up    | Reload configuration  | Config reload                |

## 🔍 Finding Test Processes

### Using Process Manager

```bash
# List all test processes
bun run test:process:list --tests-only

# Monitor continuously
bun run test:process:monitor
```

### Using Shell Commands

```bash
# Find bun test processes
ps aux | grep "bun test" | grep -v grep

# Find all test-related processes
ps aux | grep -E "(bun test|npm test|yarn test|pnpm test|jest|vitest|mocha)" | grep -v grep

# Find process by name
pgrep -f "bun test"

# Find process tree
pstree -p <pid>
```

## ⚡ Common Scenarios

### Stuck Test Process

```bash
# 1. Try graceful shutdown first
bun run test:process:graceful <pid>

# 2. If stuck, force kill
bun run test:process:kill <pid> --signal=SIGKILL

# 3. Or use the quick script
./scripts/kill-test.sh <pid> --force
```

### Multiple Test Processes

```bash
# List all test processes
bun run test:process:list --tests-only

# Kill all gracefully
bun run test:process:kill-all

# Kill all forcefully
bun run test:process:kill-all --signal=SIGKILL

# Or use shell script
./scripts/kill-test.sh all --force
```

### Long-running Tests

```bash
# Start test with timeout
bun test --timeout 30000

# Monitor progress
bun run test:process:monitor

# Stop if needed
./scripts/kill-test.sh <pid>
```

## 🚨 Safety Precautions

### Before Killing

1. **Verify the process**: Ensure you're killing the right process

   ```bash
   ps -p <pid> -o pid,ppid,command
   ```

2. **Check for children**: Look for child processes

   ```bash
   pgrep -P <pid>  # Find child processes
   ```

3. **Save work**: Ensure no important work will be lost

### Graceful Shutdown Best Practices

1. Always try SIGTERM first
2. Wait for graceful termination (1-5 seconds)
3. Use SIGKILL only if process is stuck
4. Check for orphaned processes after killing

## 📊 Monitoring Process Status

### Real-time Monitoring

```bash
# Continuous monitoring
bun run test:process:monitor

# One-time check
bun run test:process:list --tests-only

# With process details
ps aux | grep test | grep -v grep
```

### Process Health Check

```bash
# Check if process is running
kill -0 <pid> && echo "Process running" || echo "Process not running"

# Check process status
ps -p <pid> -o pid,stat,time,command

# Check resource usage
top -p <pid>
```

## 🔧 Advanced Usage

### Custom Timeout

```bash
# Custom graceful shutdown timeout
bun run test:process:graceful <pid> --timeout=10000
```

### Signal Chaining

```bash
# Send SIGTERM, wait, then SIGKILL
kill -SIGTERM <pid> && sleep 2 && kill -SIGKILL <pid>
```

### Batch Operations

```bash
# Kill multiple PIDs
for pid in 1234 5678 9012; do
  ./scripts/kill-test.sh $pid
done

# Kill processes by pattern
pkill -f "bun test.*specific-pattern"
```

## 🐛 Troubleshooting

### Process Won't Die

```bash
# Check if process is zombie
ps aux | grep Z

# Check if in uninterruptible sleep
ps -p <pid> -o stat

# Try different signals
kill -SIGINT <pid>
kill -SIGHUP <pid>
kill -SIGKILL <pid>
```

### Permission Denied

```bash
# Check ownership
ps -p <pid> -o user

# Use sudo if necessary (caution!)
sudo kill -SIGKILL <pid>
```

### Process Not Found

```bash
# Verify PID exists
ps -p <pid>

# Search for similar processes
ps aux | grep -i test
```

## 📚 Additional Resources

- [Linux Signals Reference](https://man7.org/linux/man-pages/man7/signal.7.html)
- [Process Management in Unix](https://www.gnu.org/software/libc/manual/html_node/Process-Creation.html)
- [Bun Test Documentation](https://bun.com/docs/test/configuration)
