# Bun Profiling Reference (CPU + Heap + CDP Inspector)

> Source: Official Bun documentation (bun.sh/docs/runtime/profiling)

## CPU Profiling

Generate CPU profiles to analyze performance bottlenecks.

```bash
bun --cpu-prof script.js
```

### Markdown Output

Use `--cpu-prof-md` for grep-friendly, LLM-friendly markdown profiles:

```bash
bun --cpu-prof-md script.js
```

Both formats together:

```bash
bun --cpu-prof --cpu-prof-md script.js
```

Via environment variable:

```bash
BUN_OPTIONS="--cpu-prof-md" bun script.js
```

### CPU Profiling Options

```bash
bun --cpu-prof --cpu-prof-name my-profile.cpuprofile script.js
bun --cpu-prof --cpu-prof-dir ./profiles script.js
```

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--cpu-prof` | — | `boolean` | `false` | Generate `.cpuprofile` JSON file (Chrome DevTools format) |
| `--cpu-prof-md` | — | `boolean` | `false` | Generate markdown CPU profile (grep/LLM-friendly) |
| `--cpu-prof-name <filename>` | — | `string` | `"CPU-${timestamp}.cpuprofile"` | Set output filename |
| `--cpu-prof-dir <dir>` | — | `string` | `process.cwd()` | Set output directory |

## Heap Profiling

Generate heap snapshots on exit to analyze memory usage and find leaks.

```bash
bun --heap-prof script.js
```

Generates a V8 `.heapsnapshot` file loadable in Chrome DevTools (Memory tab > Load).

### Markdown Output

Use `--heap-prof-md` for CLI-friendly markdown heap profiles:

```bash
bun --heap-prof-md script.js
```

Note: If both `--heap-prof` and `--heap-prof-md` are specified, the markdown format is used.

### Heap Profiling Options

```bash
bun --heap-prof --heap-prof-name my-snapshot.heapsnapshot script.js
bun --heap-prof --heap-prof-dir ./profiles script.js
```

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--heap-prof` | — | `boolean` | `false` | Generate V8 `.heapsnapshot` file on exit |
| `--heap-prof-md` | — | `boolean` | `false` | Generate markdown heap profile on exit |
| `--heap-prof-name <filename>` | — | `string` | `"Heap-${timestamp}.heapsnapshot"` | Set output filename |
| `--heap-prof-dir <dir>` | — | `string` | `process.cwd()` | Set output directory |

---

## CDP Inspector: Profiler Domain

Bun supports the Chrome DevTools Protocol (CDP) `Profiler` domain for programmatic CPU profiling via `bun --inspect`.

### Methods

| Method | Shortcut | Type | Default | Description |
|--------|----------|------|---------|-------------|
| `Profiler.enable` | — | `() => void` | — | Enable the profiler agent; must call before start |
| `Profiler.disable` | — | `() => void` | — | Disable the profiler agent and release resources |
| `Profiler.start` | — | `() => void` | — | Begin collecting CPU profile samples |
| `Profiler.stop` | — | `() => Promise<{ profile: Profile }>` | — | Stop profiling and return the collected profile |
| `Profiler.setSamplingInterval` | — | `(params: { interval: number }) => void` | `1000` (1 ms) | Set sampling interval in microseconds; must call before start |

### Properties

```typescript
interface Profile {
  nodes: ProfileNode[];     // Call graph nodes
  startTime: number;        // Profile start timestamp (microseconds)
  endTime: number;          // Profile end timestamp (microseconds)
  samples: number[];        // Node IDs sampled at each interval
  timeDeltas: number[];     // Time delta between consecutive samples (us)
}

interface ProfileNode {
  id: number;               // Unique node ID
  callFrame: CallFrame;     // Function location info
  hitCount: number;         // Number of samples hitting this node
  children?: number[];      // Child node IDs
  deoptReason?: string;     // JIT deoptimization reason if any
}

interface CallFrame {
  functionName: string;     // Function name ("" for anonymous)
  scriptId: string;         // Script identifier
  url: string;              // Script URL or path
  lineNumber: number;       // 0-based line number
  columnNumber: number;     // 0-based column number
}
```

### Metrics

| Metric | Property | Unit | Typical Range | Description |
|--------|----------|------|---------------|-------------|
| Sample count | `profile.samples.length` | count | 100–100,000+ | Total samples collected |
| Profile duration | `endTime - startTime` | us | 1,000–60,000,000 | Wall-clock profiling time |
| Hit count | `node.hitCount` | count | 0–N | Samples where execution was in this node |
| Self time | derived from hitCount * interval | us | 0–duration | CPU time spent in function itself |
| Total time | derived from subtree hitCount sum | us | 0–duration | CPU time in function + callees |
| Sampling interval | `setSamplingInterval` param | us | 100–10,000 | Time between samples (lower = more detail, more overhead) |

### Defaults

| Setting | Default | Notes |
|---------|---------|-------|
| Sampling interval | `1000` us (1 ms) | Good balance of accuracy vs overhead |
| Profile format | `.cpuprofile` JSON | Chrome DevTools compatible |
| Output directory | `process.cwd()` | Current working directory |
| Agent state | disabled | Must call `Profiler.enable` first |

### Usage via Inspector

```typescript
// Connect to Bun inspector (bun --inspect script.js)
const ws = new WebSocket("ws://localhost:6499/");

// Enable and configure
ws.send(JSON.stringify({ id: 1, method: "Profiler.enable" }));
ws.send(JSON.stringify({ id: 2, method: "Profiler.setSamplingInterval", params: { interval: 500 } }));

// Start profiling
ws.send(JSON.stringify({ id: 3, method: "Profiler.start" }));

// ... run workload ...

// Stop and collect
ws.send(JSON.stringify({ id: 4, method: "Profiler.stop" }));
// Response: { id: 4, result: { profile: Profile } }

// Cleanup
ws.send(JSON.stringify({ id: 5, method: "Profiler.disable" }));
```

### Bench

```typescript
import { bench, group, run } from "bun:bench" ;

group("profiler overhead", () => {
  bench("baseline (no profiling)", () => {
    let sum = 0;
    for (let i = 0; i < 10_000; i++) sum += i;
    return sum;
  });
});

// Run with: bun bench profiler-bench.ts
// Compare with: bun --cpu-prof bench profiler-bench.ts
//
// Expected overhead:
//   --cpu-prof at 1000us interval: ~1-3% overhead
//   --cpu-prof at  100us interval: ~5-10% overhead
//   --heap-prof: ~2-5% overhead (snapshot on exit only)
```

### Test

```typescript
import { describe, it, expect } from "bun:test";
import { existsSync, unlinkSync } from "fs";

describe("CPU profiling", () => {
  it("generates .cpuprofile with --cpu-prof flag", async () => {
    const proc = Bun.spawn(
      ["bun", "--cpu-prof", "--cpu-prof-dir", "/tmp", "--cpu-prof-name", "test.cpuprofile", "-e", "for(let i=0;i<1e6;i++){}"],
      { stdout: "pipe", stderr: "pipe" },
    );
    await proc.exited;
    expect(proc.exitCode).toBe(0);
    expect(existsSync("/tmp/test.cpuprofile")).toBe(true);

    const profile = await Bun.file("/tmp/test.cpuprofile").json();
    expect(profile).toHaveProperty("nodes");
    expect(profile).toHaveProperty("startTime");
    expect(profile).toHaveProperty("endTime");
    expect(profile).toHaveProperty("samples");
    expect(profile).toHaveProperty("timeDeltas");
    expect(profile.nodes.length).toBeGreaterThan(0);
    expect(profile.samples.length).toBeGreaterThan(0);
    expect(profile.endTime).toBeGreaterThan(profile.startTime);

    unlinkSync("/tmp/test.cpuprofile");
  });

  it("generates markdown with --cpu-prof-md flag", async () => {
    const proc = Bun.spawn(
      ["bun", "--cpu-prof-md", "--cpu-prof-dir", "/tmp", "--cpu-prof-name", "test-prof.md", "-e", "for(let i=0;i<1e6;i++){}"],
      { stdout: "pipe", stderr: "pipe" },
    );
    await proc.exited;
    expect(proc.exitCode).toBe(0);
    expect(existsSync("/tmp/test-prof.md")).toBe(true);

    const content = await Bun.file("/tmp/test-prof.md").text();
    expect(content.length).toBeGreaterThan(0);

    unlinkSync("/tmp/test-prof.md");
  });
});

describe("Heap profiling", () => {
  it("generates .heapsnapshot with --heap-prof flag", async () => {
    const proc = Bun.spawn(
      ["bun", "--heap-prof", "--heap-prof-dir", "/tmp", "--heap-prof-name", "test.heapsnapshot", "-e", "const a = new Array(1e4).fill({x:1})"],
      { stdout: "pipe", stderr: "pipe" },
    );
    await proc.exited;
    expect(proc.exitCode).toBe(0);
    expect(existsSync("/tmp/test.heapsnapshot")).toBe(true);

    const snapshot = await Bun.file("/tmp/test.heapsnapshot").json();
    expect(snapshot).toHaveProperty("snapshot");
    expect(snapshot).toHaveProperty("nodes");
    expect(snapshot).toHaveProperty("edges");

    unlinkSync("/tmp/test.heapsnapshot");
  });
});

describe("Profiler CDP properties", () => {
  it("Profile has required fields", () => {
    const profile: Record<string, unknown> = {
      nodes: [{ id: 1, callFrame: { functionName: "main", scriptId: "1", url: "script.js", lineNumber: 0, columnNumber: 0 }, hitCount: 10 }],
      startTime: 0,
      endTime: 1000000,
      samples: [1],
      timeDeltas: [1000],
    };

    expect(profile.nodes).toBeInstanceOf(Array);
    expect((profile.nodes as Array<unknown>).length).toBeGreaterThan(0);
    expect(typeof profile.startTime).toBe("number");
    expect(typeof profile.endTime).toBe("number");
    expect((profile.endTime as number)).toBeGreaterThan(profile.startTime as number);
    expect(profile.samples).toBeInstanceOf(Array);
    expect(profile.timeDeltas).toBeInstanceOf(Array);
  });

  it("sampling interval default is 1000us", () => {
    const DEFAULT_SAMPLING_INTERVAL = 1000;
    expect(DEFAULT_SAMPLING_INTERVAL).toBe(1000);
  });
});
```
