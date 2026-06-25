# Documentation Link Validation Report

Generated: 2026-01-09T14:20:59.717Z

## Summary

- **Total Links**: 568
- **Valid Links**: 153 ✅
- **Broken Links**: 126 ❌
- **External Links**: 148 🔗
- **Anchor-Only Links**: 141 #
- **Internal Links (to verify)**: 279

## Broken Links (126)

| File | Link Text | Destination | Line | Error |
|------|-----------|-------------|------|-------|
| /docs/runtime/TERMINAL_API_INTEGRATION.md | `2J\x1b[;H"); // Clear screen, move cursor

  drawHeader("📊 Geelark Monitoring Dashboard", cols);
  renderMetricRow("⏱️", "Uptime", `${state.uptime}s`, cols);
  renderMetricRow("💾", "Memory Used", `${state.memory.toFixed(2)} MB`, cols);
  renderMetricRow("📊", "CPU Usage", `${state.cpu.toFixed(1)}%`, cols);
  // ...
}

// Keyboard input handling
term.setRawMode(true);
term.data = (chunk: Uint8Array) => {
  const input = new TextDecoder().decode(chunk);
  if (input === "\x1b[A") { // Up arrow
    state.selectedRow = Math.max(0, state.selectedRow - 1);
    renderDashboard(term.cols, term.rows);
  }
  // ...
};
```text

**Run it**:
```bash
bun run examples/terminal-dashboard-example.ts
```text

---

## Real-World Usage

### Files Updated

| File | Changes | Impact |
|------|---------|--------|
| `/dev-hq/servers/dashboard-server.ts` | Added Terminal API, Unicode-aware padding | Better terminal output |
| `/examples/terminal-dashboard-example.ts` | Created interactive dashboard example | Reference implementation |

### Before & After Comparison

**Before** (manual padding with `.padEnd()`):
```
╔════════════════════════════════════════════════════════════╗
║  Environment: development                                   ║
╚════════════════════════════════════════════════════════════╝
```text

**Issue**: If environment name contains emoji or wide characters, alignment breaks.

**After** (using `Bun.stringWidth()`):
```
╔════════════════════════════════════════════════════════════╗
║  Environment: 🇺🇸 production                                ║
╚════════════════════════════════════════════════════════════╝
```text

**Result**: Proper alignment regardless of characters used.

---

## Performance Benefits

### Spawn Attach Performance

| Method | Time | Improvement |
|--------|------|-------------|
| Manual stdin setup | 144ns | Baseline |
| Bun.Terminal attach | 12ns | **92% faster** |

### Memory Usage

| Method | Memory | Improvement |
|--------|--------|-------------|
| Manual implementation | 128B | Baseline |
| Bun.Terminal | 64B | **50% less** |

### Code Size

| Method | Lines | Improvement |
|--------|-------|-------------|
| Manual stdin parsing | 200 lines | Baseline |
| Bun.Terminal | 80 lines | **60% less** |

---

## Best Practices

### 1. Always Use `Bun.stringWidth()` for Padding

❌ **Bad**:
```typescript
console.log(`${emoji} ${label.padEnd(20)} ${value}`);
```text

✅ **Good**:
```typescript
const labelWidth = Bun.stringWidth(label);
const padding = Math.max(0, 20 - labelWidth);
console.log(`${emoji} ${label}${" ".repeat(padding)} ${value}`);
```text

### 2. Handle Terminal Resize

❌ **Bad** (static output):
```typescript
console.log(drawBox(80));
```text

✅ **Good** (resize-aware):
```typescript
const term = new Terminal({
  resize(cols, rows) {
    console.log(drawBox(cols)); // Re-render on resize
  }
});
```text

### 3. Use Helper Functions for Consistency

✅ **Good**:
```typescript
function padWithWidth(str: string, totalWidth: number): string {
  const strWidth = Bun.stringWidth(str);
  const padding = Math.max(0, totalWidth - strWidth);
  return str + " ".repeat(padding);
}

// Use everywhere
padWithWidth(ENVIRONMENT_VALUE, 50);
padWithWidth(uploadConfig.provider, 20);
```text

### 4. Clear Screen Properly

❌ **Bad**:
```typescript
term.write("\x1b[2J"); // Doesn't move cursor
```text

✅ **Good**:
```typescript
term.write("\x1b[2J\x1b[;H"); // Clear screen AND move cursor to top-left
```text

### 5. Use Box-Drawing Characters

✅ **Good**:
```typescript
const BOX = {
  TL: "╔", TR: "╗", BL: "╚", BR: "╝",
  H: "═", V: "║",
  L: "╠", R: "╣", T: "╦", B: "╩"
};

function drawBox(cols: number, rows: number) {
  term.write(BOX.TL + BOX.H.repeat(cols - 2) + BOX.TR + "\n");
  for (let i = 0; i < rows - 2; i++) {
    term.write(BOX.V + " ".repeat(cols - 2) + BOX.V + "\n");
  }
  term.write(BOX.BL + BOX.H.repeat(cols - 2) + BOX.BR + "\n");
}
```text

---

## Running the Examples

### Dashboard Server (Production)

```bash
bun run dev-hq/servers/dashboard-server.ts
```text

Output:
```
╔════════════════════════════════════════════════════════════╗
║           🎨 Geelark Feature Flag Dashboard                ║
╠════════════════════════════════════════════════════════════╣
║  📊 Dashboard:  http://localhost:3000/dashboard             ║
║  🔌 API:        http://localhost:3000/api                   ║
║  📈 Telemetry:  http://localhost:3000/api/telemetry         ║
╠════════════════════════════════════════════════════════════╣
║  Environment: production                                    ║
╚════════════════════════════════════════════════════════════╝
```text

### Interactive Dashboard (Example)

```bash
bun run examples/terminal-dashboard-example.ts
```text

Features:
- ⬆️⬇️ Arrow keys to navigate menu
- ⏎ Enter to select
- `q` to quit
- 📱 Resizes with terminal window

---

## Troubleshooting

### Issue: Emoji Misaligned

**Problem**: Text overflows box borders.

**Solution**: Use `Bun.stringWidth()` instead of `.length`:
```typescript
// ❌ Bad
const width = str.length;

// ✅ Good
const width = Bun.stringWidth(str);
```text

### Issue: Resize Not Working

**Problem**: Dashboard doesn't re-render when terminal is resized.

**Solution**: Ensure resize callback is registered:
```typescript
const term = new Terminal({
  resize(cols, rows) {
    renderDashboard(cols, rows); // Must re-render
  }
});
```text

### Issue: Input Not Working

**Problem**: Keyboard input not being received.

**Solution**: Set raw mode and register data callback:
```typescript
term.setRawMode(true);
term.data = (chunk: Uint8Array) => {
  const input = new TextDecoder().decode(chunk);
  // Handle input
};
```text

---

## Next Steps

1. **Update monitoring dashboards** - Add real-time metrics with Terminal API
2. **Add interactive CLI** - Create command-line tools with keyboard navigation
3. **Spawn processes with PTY** - Attach terminals to child processes
4. **Add progress bars** - Use `term.write()` with `\r` for updating progress

---

## References

- [Bun Terminal API Guide` | `./BUN_TERMINAL_API_GUIDE.md` | 215 | File not found: /Users/nolarose/geelark/docs/runtime/BUN_TERMINAL_API_GUIDE.md |
| /docs/runtime/TERMINAL_API_INTEGRATION.md | `examples/terminal-dashboard-example.ts` | `../examples/terminal-dashboard-example.ts` | 469 | File not found: /Users/nolarose/geelark/docs/examples/terminal-dashboard-example.ts |
| /docs/runtime/TERMINAL_API_INTEGRATION.md | `dev-hq/servers/dashboard-server.ts` | `../dev-hq/servers/dashboard-server.ts` | 470 | File not found: /Users/nolarose/geelark/docs/dev-hq/servers/dashboard-server.ts |
| /docs/runtime/bun/BUN_UTILITIES_SUMMARY.md | ``docs/BUN_INSPECT_TABLE.md`` | `file:///Users/nolarose/geelark/docs/BUN_INSPECT_TABLE.md` | 24 | File not found: /Users/nolarose/geelark/docs/runtime/bun/file:/Users/nolarose/geelark/docs/BUN_INSPECT_TABLE.md |
| /docs/runtime/bun/BUN_UTILITIES_SUMMARY.md | ``docs/BUN_UTILS_DASHBOARD.md`` | `file:///Users/nolarose/geelark/docs/BUN_UTILS_DASHBOARD.md` | 25 | File not found: /Users/nolarose/geelark/docs/runtime/bun/file:/Users/nolarose/geelark/docs/BUN_UTILS_DASHBOARD.md |
| /docs/runtime/bun/BUN_UTILITIES_SUMMARY.md | ``docs/QUICK_START_UTILS.md`` | `file:///Users/nolarose/geelark/docs/QUICK_START_UTILS.md` | 26 | File not found: /Users/nolarose/geelark/docs/runtime/bun/file:/Users/nolarose/geelark/docs/QUICK_START_UTILS.md |
| /docs/runtime/bun/BUN_UTILITIES_SUMMARY.md | ``docs/BUN_FILE_IO.md`` | `file:///Users/nolarose/geelark/docs/BUN_FILE_IO.md` | 27 | File not found: /Users/nolarose/geelark/docs/runtime/bun/file:/Users/nolarose/geelark/docs/BUN_FILE_IO.md |
| /docs/runtime/bun/BUN_UTILITIES_SUMMARY.md | ``dev-hq/servers/dashboard-server-enhanced.ts`` | `file:///Users/nolarose/geelark/dev-hq/servers/dashboard-server-enhanced.ts` | 33 | File not found: /Users/nolarose/geelark/docs/runtime/bun/file:/Users/nolarose/geelark/dev-hq/servers/dashboard-server-enhanced.ts |
| /docs/runtime/bun/BUN_UTILITIES_SUMMARY.md | ``examples/bun-utils-examples.ts`` | `file:///Users/nolarose/geelark/examples/bun-utils-examples.ts` | 34 | File not found: /Users/nolarose/geelark/docs/runtime/bun/file:/Users/nolarose/geelark/examples/bun-utils-examples.ts |
| /docs/runtime/bun/BUN_UTILITIES_SUMMARY.md | ``examples/file-io-examples.ts`` | `file:///Users/nolarose/geelark/examples/file-io-examples.ts` | 35 | File not found: /Users/nolarose/geelark/docs/runtime/bun/file:/Users/nolarose/geelark/examples/file-io-examples.ts |
| /docs/runtime/bun/BUN_UTILITIES_SUMMARY.md | `Quick Start` | `./QUICK_START_UTILS.md` | 402 | File not found: /Users/nolarose/geelark/docs/runtime/bun/QUICK_START_UTILS.md |
| /docs/runtime/bun/BUN_UTILITIES_SUMMARY.md | `Integration Guide` | `./BUN_UTILS_DASHBOARD.md` | 403 | File not found: /Users/nolarose/geelark/docs/runtime/bun/BUN_UTILS_DASHBOARD.md |
| /docs/runtime/bun/BUN_IMPROVEMENTS_SUMMARY.md | `bunfig.toml` | `./bunfig.toml` | 114 | File not found: /Users/nolarose/geelark/docs/runtime/bun/bunfig.toml |
| /docs/runtime/bun/BUN_IMPROVEMENTS_SUMMARY.md | `VSCode Launch Config` | `./.vscode/launch.json` | 115 | File not found: /Users/nolarose/geelark/docs/runtime/bun/.vscode/launch.json |
| /docs/runtime/bun/BUN_FILE_INTEGRATION.md | ``docs/BUN_FILE_IO.md`` | `file:///Users/nolarose/geelark/docs/BUN_FILE_IO.md` | 15 | File not found: /Users/nolarose/geelark/docs/runtime/bun/file:/Users/nolarose/geelark/docs/BUN_FILE_IO.md |
| /docs/runtime/bun/BUN_FILE_INTEGRATION.md | ``docs/BUN_RUN_STDIN.md`` | `file:///Users/nolarose/geelark/docs/BUN_RUN_STDIN.md` | 16 | File not found: /Users/nolarose/geelark/docs/runtime/bun/file:/Users/nolarose/geelark/docs/BUN_RUN_STDIN.md |
| /docs/runtime/bun/BUN_FILE_INTEGRATION.md | ``docs/BUN_RUN_STDIN_QUICKREF.md`` | `file:///Users/nolarose/geelark/docs/BUN_RUN_STDIN_QUICKREF.md` | 17 | File not found: /Users/nolarose/geelark/docs/runtime/bun/file:/Users/nolarose/geelark/docs/BUN_RUN_STDIN_QUICKREF.md |
| /docs/runtime/bun/BUN_FILE_INTEGRATION.md | ``dashboard-react/src/components/StreamPanel.tsx`` | `file:///Users/nolarose/geelark/dashboard-react/src/components/StreamPanel.tsx` | 23 | File not found: /Users/nolarose/geelark/docs/runtime/bun/file:/Users/nolarose/geelark/dashboard-react/src/components/StreamPanel.tsx |
| /docs/runtime/bun/BUN_FILE_INTEGRATION.md | ``dashboard-react/src/components/StreamPanel.css`` | `file:///Users/nolarose/geelark/dashboard-react/src/components/StreamPanel.css` | 24 | File not found: /Users/nolarose/geelark/docs/runtime/bun/file:/Users/nolarose/geelark/dashboard-react/src/components/StreamPanel.css |
| /docs/runtime/bun/BUN_FILE_INTEGRATION.md | ``dev-hq/servers/stream-api.ts`` | `file:///Users/nolarose/geelark/dev-hq/servers/stream-api.ts` | 30 | File not found: /Users/nolarose/geelark/docs/runtime/bun/file:/Users/nolarose/geelark/dev-hq/servers/stream-api.ts |
| /docs/runtime/bun/BUN_FILE_INTEGRATION.md | ``examples/file-io-examples.ts`` | `file:///Users/nolarose/geelark/examples/file-io-examples.ts` | 36 | File not found: /Users/nolarose/geelark/docs/runtime/bun/file:/Users/nolarose/geelark/examples/file-io-examples.ts |
| /docs/runtime/bun/BUN_FILE_INTEGRATION.md | `BUN_FILE_IO.md` | `file:///Users/nolarose/geelark/docs/BUN_FILE_IO.md` | 345 | File not found: /Users/nolarose/geelark/docs/runtime/bun/file:/Users/nolarose/geelark/docs/BUN_FILE_IO.md |
| /docs/runtime/bun/BUN_FILE_INTEGRATION.md | `BUN_RUN_STDIN.md` | `file:///Users/nolarose/geelark/docs/BUN_RUN_STDIN.md` | 346 | File not found: /Users/nolarose/geelark/docs/runtime/bun/file:/Users/nolarose/geelark/docs/BUN_RUN_STDIN.md |
| /docs/runtime/bun/BUN_FILE_INTEGRATION.md | `BUN_RUN_STDIN_QUICKREF.md` | `file:///Users/nolarose/geelark/docs/BUN_RUN_STDIN_QUICKREF.md` | 347 | File not found: /Users/nolarose/geelark/docs/runtime/bun/file:/Users/nolarose/geelark/docs/BUN_RUN_STDIN_QUICKREF.md |
| /docs/runtime/bun/BUN_RUN_STDIN_QUICKREF.md | `Feature Flags Guide` | `./ENV_CHEATSHEET.md#-feature-flags` | 187 | File not found: /Users/nolarose/geelark/docs/runtime/bun/ENV_CHEATSHEET.md |
| /docs/runtime/BUN_CONSTANTS.md | ``src/constants/features/compile-time.ts`` | `../src/constants/features/compile-time.ts` | 325 | File not found: /Users/nolarose/geelark/docs/src/constants/features/compile-time.ts |
| /docs/runtime/BUN_CONSTANTS.md | ``meta.json`` | `../meta.json` | 326 | File not found: /Users/nolarose/geelark/docs/meta.json |
| /docs/runtime/BUN_CONSTANTS.md | ``bunfig.toml`` | `../bunfig.toml` | 327 | File not found: /Users/nolarose/geelark/docs/bunfig.toml |
| /docs/runtime/BUN_UTILS_DASHBOARD.md | ``dev-hq/servers/dashboard-server-enhanced.ts`` | `file:///Users/nolarose/geelark/dev-hq/servers/dashboard-server-enhanced.ts` | 27 | File not found: /Users/nolarose/geelark/docs/runtime/file:/Users/nolarose/geelark/dev-hq/servers/dashboard-server-enhanced.ts |
| /docs/runtime/BUN_UTILS_DASHBOARD.md | ``examples/bun-utils-examples.ts`` | `file:///Users/nolarose/geelark/examples/bun-utils-examples.ts` | 28 | File not found: /Users/nolarose/geelark/docs/runtime/file:/Users/nolarose/geelark/examples/bun-utils-examples.ts |
| /docs/runtime/BUN_UTILS_DASHBOARD.md | ``docs/BUN_INSPECT_TABLE.md`` | `file:///Users/nolarose/geelark/docs/BUN_INSPECT_TABLE.md` | 29 | File not found: /Users/nolarose/geelark/docs/runtime/file:/Users/nolarose/geelark/docs/BUN_INSPECT_TABLE.md |
| /docs/README.md | `test-coverage.md` | `../testing/test-coverage.md` | 37 | File not found: /Users/nolarose/geelark/testing/test-coverage.md |
| /docs/README.md | `FEATURE_FLAGS_PRO_TIPS.md` | `guides/features/FEATURE_FLAGS_PRO_TIPS.md` | 42 | File not found: /Users/nolarose/geelark/docs/guides/features/FEATURE_FLAGS_PRO_TIPS.md |
| /docs/README.md | `FEATURE_FLAGS_PRO_TIPS.md` | `guides/features/FEATURE_FLAGS_PRO_TIPS.md` | 229 | File not found: /Users/nolarose/geelark/docs/guides/features/FEATURE_FLAGS_PRO_TIPS.md |
| /docs/README.md | `test-coverage.md` | `../testing/test-coverage.md` | 237 | File not found: /Users/nolarose/geelark/testing/test-coverage.md |
| /docs/architecture/ORGANIZATION_COMPLETE.md | `Documentation Index` | `README.md` | 211 | File not found: /Users/nolarose/geelark/docs/architecture/README.md |
| /docs/architecture/ORGANIZATION_COMPLETE.md | `Examples Guide` | `../examples/README.md` | 212 | File not found: /Users/nolarose/geelark/docs/examples/README.md |
| /docs/architecture/ORGANIZATION_COMPLETE.md | `Scripts Guide` | `../scripts/README.md` | 213 | File not found: /Users/nolarose/geelark/docs/scripts/README.md |
| /docs/architecture/ORGANIZATION_COMPLETE.md | `Tests Guide` | `../tests/README.md` | 214 | File not found: /Users/nolarose/geelark/docs/tests/README.md |
| /docs/getting-started/DEPLOYMENT.md | `docs/` | `../` | 493 | File not found: /Users/nolarose/geelark/docs |
| /docs/guides/features/FEATURE_MATRIX.md | `BUN_CONSTANTS.md` | `../runtime/BUN_CONSTANTS.md` | 198 | File not found: /Users/nolarose/geelark/docs/guides/runtime/BUN_CONSTANTS.md |
| /docs/guides/features/FEATURE_MATRIX.md | `CLI_REFERENCE.md` | `../api/CLI_REFERENCE.md` | 199 | File not found: /Users/nolarose/geelark/docs/guides/api/CLI_REFERENCE.md |
| /docs/guides/features/FEATURE_MATRIX.md | `BUN_RUNTIME_FEATURES.md` | `../runtime/BUN_RUNTIME_FEATURES.md` | 200 | File not found: /Users/nolarose/geelark/docs/guides/runtime/BUN_RUNTIME_FEATURES.md |
| /docs/guides/features/FEATURE_MATRIX.md | `src/constants/index.ts` | `../src/constants/index.ts` | 201 | File not found: /Users/nolarose/geelark/docs/guides/src/constants/index.ts |
| /docs/guides/features/FEATURE_MATRIX.md | `src/constants/features/compile-time.ts` | `../src/constants/features/compile-time.ts` | 202 | File not found: /Users/nolarose/geelark/docs/guides/src/constants/features/compile-time.ts |
| /docs/guides/features/FLAG_FLOW_DIAGRAM.md | `Flags Reference` | `../api/flags-reference.md` | 390 | File not found: /Users/nolarose/geelark/docs/guides/api/flags-reference.md |
| /docs/guides/features/FLAG_FLOW_DIAGRAM.md | `Testing Alignment` | `../guides/testing/TESTING_ALIGNMENT.md` | 391 | File not found: /Users/nolarose/geelark/docs/guides/guides/testing/TESTING_ALIGNMENT.md |
| /docs/guides/features/FLAG_FLOW_DIAGRAM.md | `Bun Runtime Features` | `../runtime/BUN_RUNTIME_FEATURES.md` | 392 | File not found: /Users/nolarose/geelark/docs/guides/runtime/BUN_RUNTIME_FEATURES.md |
| /docs/guides/testing/TESTING_ALIGNMENT.md | `Process Lifecycle Guide` | `../runtime/PROCESS_LIFECYCLE.md` | 211 | File not found: /Users/nolarose/geelark/docs/guides/runtime/PROCESS_LIFECYCLE.md |
| /docs/guides/testing/TESTING_ALIGNMENT.md | `Runtime Controls Guide` | `../runtime/RUNTIME_CONTROLS.md` | 212 | File not found: /Users/nolarose/geelark/docs/guides/runtime/RUNTIME_CONTROLS.md |
| /docs/guides/testing/TESTING_ALIGNMENT.md | `expectTypeOf() Guide` | `./expectTypeOf-pro-tips.md` | 213 | File not found: /Users/nolarose/geelark/docs/guides/testing/expectTypeOf-pro-tips.md |
| /docs/guides/testing/TESTING_ALIGNMENT.md | `Feature Flags Testing` | `../../tests/README.md` | 214 | File not found: /Users/nolarose/geelark/docs/tests/README.md |
| /docs/guides/api/LOCAL_TEMPLATES.md | `docs/CONFIGURATION.md` | `docs/CONFIGURATION.md` | 296 | File not found: /Users/nolarose/geelark/docs/guides/api/docs/CONFIGURATION.md |
| /docs/guides/api/LOCAL_TEMPLATES.md | `Bun Create Docs` | `./BUN_CREATE.md` | 504 | File not found: /Users/nolarose/geelark/docs/guides/api/BUN_CREATE.md |
| /docs/guides/api/LOCAL_TEMPLATES.md | `Force Flag Guide` | `./BUN_CREATE_FORCE.md` | 505 | File not found: /Users/nolarose/geelark/docs/guides/api/BUN_CREATE_FORCE.md |
| /docs/guides/api/LOCAL_TEMPLATES.md | `Environment Config` | `./ENV_CONFIGURATION.md` | 506 | File not found: /Users/nolarose/geelark/docs/guides/api/ENV_CONFIGURATION.md |
| /docs/guides/type-checking/EXPECTTYPEOF_GUIDE.md | `Testing Alignment` | `./testing/TESTING_ALIGNMENT.md` | 527 | File not found: /Users/nolarose/geelark/docs/guides/type-checking/testing/TESTING_ALIGNMENT.md |
| /docs/guides/type-checking/EXPECTTYPEOF_GUIDE.md | `BUN_RUNTIME_FEATURES` | `../runtime/BUN_RUNTIME_FEATURES.md` | 528 | File not found: /Users/nolarose/geelark/docs/guides/runtime/BUN_RUNTIME_FEATURES.md |
| /docs/guides/QUICK_START_UTILS.md | `Bun Utilities Dashboard Integration` | `./BUN_UTILS_DASHBOARD.md` | 167 | File not found: /Users/nolarose/geelark/docs/guides/BUN_UTILS_DASHBOARD.md |
| /docs/guides/QUICK_START_UTILS.md | `Bun.inspect.table() Guide` | `./BUN_INSPECT_TABLE.md` | 168 | File not found: /Users/nolarose/geelark/docs/guides/BUN_INSPECT_TABLE.md |
| /docs/guides/QUICK_START_UTILS.md | `Bun File I/O Guide` | `./BUN_FILE_IO.md` | 169 | File not found: /Users/nolarose/geelark/docs/guides/BUN_FILE_IO.md |
| /docs/guides/QUICK_START_UTILS.md | `bun run - Guide` | `./BUN_RUN_STDIN.md` | 170 | File not found: /Users/nolarose/geelark/docs/guides/BUN_RUN_STDIN.md |
| /docs/guides/QUICK_START_UTILS.md | `BUN_UTILS_DASHBOARD.md` | `./BUN_UTILS_DASHBOARD.md` | 326 | File not found: /Users/nolarose/geelark/docs/guides/BUN_UTILS_DASHBOARD.md |
| /docs/api/SERVER_API.md | `Security Headers` | `../security/Headers.ts` | 582 | File not found: /Users/nolarose/geelark/docs/security/Headers.ts |
| /docs/api/SERVER_API.md | `Route Decorators` | `../decorators/Route.ts` | 583 | File not found: /Users/nolarose/geelark/docs/decorators/Route.ts |
| /docs/api/SERVER_API.md | `Middleware Decorators` | `../decorators/Middleware.ts` | 584 | File not found: /Users/nolarose/geelark/docs/decorators/Middleware.ts |
| /docs/reference/BROKEN_LINKS_REPORT.md | `LICENSE` | `LICENSE` | 54 | File not found: /Users/nolarose/geelark/docs/reference/LICENSE |
| /docs/reference/GEELARK_COMPLETE_GUIDE.md | `Feature Flags Guide` | `./FEATURE_FLAGS_VERIFICATION.md` | 1181 | File not found: /Users/nolarose/geelark/docs/reference/FEATURE_FLAGS_VERIFICATION.md |
| /docs/reference/GEELARK_COMPLETE_GUIDE.md | `DCE Annotations` | `./BUN_DCE_ANNOTATIONS.md` | 1182 | File not found: /Users/nolarose/geelark/docs/reference/BUN_DCE_ANNOTATIONS.md |
| /docs/reference/GEELARK_COMPLETE_GUIDE.md | `Performance Stress Test` | `./BUN_PERFORMANCE_STRESS_TEST.md` | 1183 | File not found: /Users/nolarose/geelark/docs/reference/BUN_PERFORMANCE_STRESS_TEST.md |
| /docs/reference/GEELARK_COMPLETE_GUIDE.md | `File I/O Guide` | `./BUN_FILE_IO.md` | 1184 | File not found: /Users/nolarose/geelark/docs/reference/BUN_FILE_IO.md |
| /docs/reference/GEELARK_COMPLETE_GUIDE.md | `Environment Cheatsheet` | `./ENV_CHEATSHEET.md` | 1185 | File not found: /Users/nolarose/geelark/docs/reference/ENV_CHEATSHEET.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Dashboard & Frontend Guide` | `./DASHBOARD_FRONTEND_GUIDE.md` | 88 | File not found: /Users/nolarose/geelark/docs/reference/DASHBOARD_FRONTEND_GUIDE.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Quick Reference` | `./QUICK_REFERENCE.md` | 114 | File not found: /Users/nolarose/geelark/docs/reference/QUICK_REFERENCE.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `TypeScript Enhancement Guide` | `./TYPESCRIPT_ENHANCEMENT_GUIDE.md` | 134 | File not found: /Users/nolarose/geelark/docs/reference/TYPESCRIPT_ENHANCEMENT_GUIDE.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Feature Flags Verification` | `./FEATURE_FLAGS_VERIFICATION.md` | 193 | File not found: /Users/nolarose/geelark/docs/reference/FEATURE_FLAGS_VERIFICATION.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `DCE Annotations Guide` | `./BUN_DCE_ANNOTATIONS.md` | 208 | File not found: /Users/nolarose/geelark/docs/reference/BUN_DCE_ANNOTATIONS.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `DCE Quick Reference` | `./DCE_ANNOTATIONS_QUICKREF.md` | 223 | File not found: /Users/nolarose/geelark/docs/reference/DCE_ANNOTATIONS_QUICKREF.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Performance Stress Test` | `./BUN_PERFORMANCE_STRESS_TEST.md` | 239 | File not found: /Users/nolarose/geelark/docs/reference/BUN_PERFORMANCE_STRESS_TEST.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Bun Utilities Summary` | `./BUN_UTILITIES_SUMMARY.md` | 296 | File not found: /Users/nolarose/geelark/docs/reference/BUN_UTILITIES_SUMMARY.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Bun Utils Dashboard` | `./BUN_UTILS_DASHBOARD.md` | 312 | File not found: /Users/nolarose/geelark/docs/reference/BUN_UTILS_DASHBOARD.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Inspect Table Guide` | `./BUN_INSPECT_TABLE.md` | 326 | File not found: /Users/nolarose/geelark/docs/reference/BUN_INSPECT_TABLE.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Bun Terminal API Integration` | `./TERMINAL_API_INTEGRATION.md` | 340 | File not found: /Users/nolarose/geelark/docs/reference/TERMINAL_API_INTEGRATION.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Bun Terminal API Guide` | `./BUN_TERMINAL_API_GUIDE.md` | 355 | File not found: /Users/nolarose/geelark/docs/reference/BUN_TERMINAL_API_GUIDE.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Production Deployment Guide` | `./PRODUCTION_DEPLOYMENT_GUIDE.md` | 373 | File not found: /Users/nolarose/geelark/docs/reference/PRODUCTION_DEPLOYMENT_GUIDE.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Network-Aware Config Stack` | `./NETWORK_AWARE_CONFIG_STACK.md` | 391 | File not found: /Users/nolarose/geelark/docs/reference/NETWORK_AWARE_CONFIG_STACK.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Proxy Validation Guide` | `./PROXY_VALIDATION_GUIDE.md` | 409 | File not found: /Users/nolarose/geelark/docs/reference/PROXY_VALIDATION_GUIDE.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Proxy Validation Summary` | `./PROXY_VALIDATION_SUMMARY.md` | 431 | File not found: /Users/nolarose/geelark/docs/reference/PROXY_VALIDATION_SUMMARY.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Environment Cheatsheet` | `./ENV_CHEATSHEET.md` | 453 | File not found: /Users/nolarose/geelark/docs/reference/ENV_CHEATSHEET.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Environment Configuration` | `./ENV_CONFIGURATION.md` | 469 | File not found: /Users/nolarose/geelark/docs/reference/ENV_CONFIGURATION.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Deployment Guide` | `./getting-started/DEPLOYMENT.md` | 512 | File not found: /Users/nolarose/geelark/docs/reference/getting-started/DEPLOYMENT.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Bun Create Guide` | `./BUN_CREATE.md` | 529 | File not found: /Users/nolarose/geelark/docs/reference/BUN_CREATE.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Bun Create Force` | `./BUN_CREATE_FORCE.md` | 542 | File not found: /Users/nolarose/geelark/docs/reference/BUN_CREATE_FORCE.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Bun Run STDIN Guide` | `./BUN_RUN_STDIN.md` | 554 | File not found: /Users/nolarose/geelark/docs/reference/BUN_RUN_STDIN.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Bun Run STDIN Quickref` | `./BUN_RUN_STDIN_QUICKREF.md` | 567 | File not found: /Users/nolarose/geelark/docs/reference/BUN_RUN_STDIN_QUICKREF.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Quick Start Utils` | `./QUICK_START_UTILS.md` | 574 | File not found: /Users/nolarose/geelark/docs/reference/QUICK_START_UTILS.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Organization Complete` | `./ORGANIZATION_COMPLETE.md` | 583 | File not found: /Users/nolarose/geelark/docs/reference/ORGANIZATION_COMPLETE.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Root Organization` | `./ROOT_ORGANIZATION.md` | 596 | File not found: /Users/nolarose/geelark/docs/reference/ROOT_ORGANIZATION.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Local Templates` | `./LOCAL_TEMPLATES.md` | 603 | File not found: /Users/nolarose/geelark/docs/reference/LOCAL_TEMPLATES.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Server API` | `./api/SERVER_API.md` | 612 | File not found: /Users/nolarose/geelark/docs/reference/api/SERVER_API.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Geelark API` | `./api/GEELARK_API.md` | 626 | File not found: /Users/nolarose/geelark/docs/reference/api/GEELARK_API.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `expectTypeOf Pro Tips` | `./guides/expectTypeOf-pro-tips.md` | 635 | File not found: /Users/nolarose/geelark/docs/reference/guides/expectTypeOf-pro-tips.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `ExpectTypeOf Guide` | `./guides/EXPECTTYPEOF_GUIDE.md` | 642 | File not found: /Users/nolarose/geelark/docs/reference/guides/EXPECTTYPEOF_GUIDE.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `User Guide` | `./getting-started/USER_GUIDE.md` | 649 | File not found: /Users/nolarose/geelark/docs/reference/getting-started/USER_GUIDE.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Unhandled Rejections` | `./errors/UNHANDLED_REJECTIONS.md` | 658 | File not found: /Users/nolarose/geelark/docs/reference/errors/UNHANDLED_REJECTIONS.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Process Lifecycle` | `./runtime/PROCESS_LIFECYCLE.md` | 667 | File not found: /Users/nolarose/geelark/docs/reference/runtime/PROCESS_LIFECYCLE.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Dashboard & Frontend Guide` | `./DASHBOARD_FRONTEND_GUIDE.md` | 680 | File not found: /Users/nolarose/geelark/docs/reference/DASHBOARD_FRONTEND_GUIDE.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Server API` | `./api/SERVER_API.md` | 686 | File not found: /Users/nolarose/geelark/docs/reference/api/SERVER_API.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Performance Stress Test` | `./BUN_PERFORMANCE_STRESS_TEST.md` | 691 | File not found: /Users/nolarose/geelark/docs/reference/BUN_PERFORMANCE_STRESS_TEST.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `DCE Annotations` | `./BUN_DCE_ANNOTATIONS.md` | 692 | File not found: /Users/nolarose/geelark/docs/reference/BUN_DCE_ANNOTATIONS.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Feature Flags Verification` | `./FEATURE_FLAGS_VERIFICATION.md` | 697 | File not found: /Users/nolarose/geelark/docs/reference/FEATURE_FLAGS_VERIFICATION.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `DCE Quick Reference` | `./DCE_ANNOTATIONS_QUICKREF.md` | 698 | File not found: /Users/nolarose/geelark/docs/reference/DCE_ANNOTATIONS_QUICKREF.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Environment Cheatsheet` | `./ENV_CHEATSHEET.md` | 699 | File not found: /Users/nolarose/geelark/docs/reference/ENV_CHEATSHEET.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `expectTypeOf Pro Tips` | `./guides/expectTypeOf-pro-tips.md` | 704 | File not found: /Users/nolarose/geelark/docs/reference/guides/expectTypeOf-pro-tips.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Test Examples` | `./TESTING_GUIDE.md#writing-tests` | 705 | File not found: /Users/nolarose/geelark/docs/reference/TESTING_GUIDE.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Deployment Guide` | `./getting-started/DEPLOYMENT.md` | 709 | File not found: /Users/nolarose/geelark/docs/reference/getting-started/DEPLOYMENT.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Environment Configuration` | `./ENV_CONFIGURATION.md` | 710 | File not found: /Users/nolarose/geelark/docs/reference/ENV_CONFIGURATION.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Feature Flags Verification` | `./FEATURE_FLAGS_VERIFICATION.md` | 770 | File not found: /Users/nolarose/geelark/docs/reference/FEATURE_FLAGS_VERIFICATION.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Deployment Guide` | `./getting-started/DEPLOYMENT.md` | 771 | File not found: /Users/nolarose/geelark/docs/reference/getting-started/DEPLOYMENT.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `DCE Annotations` | `./BUN_DCE_ANNOTATIONS.md` | 772 | File not found: /Users/nolarose/geelark/docs/reference/BUN_DCE_ANNOTATIONS.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Performance Stress Test` | `./BUN_PERFORMANCE_STRESS_TEST.md` | 773 | File not found: /Users/nolarose/geelark/docs/reference/BUN_PERFORMANCE_STRESS_TEST.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Performance Stress Test` | `./BUN_PERFORMANCE_STRESS_TEST.md` | 808 | File not found: /Users/nolarose/geelark/docs/reference/BUN_PERFORMANCE_STRESS_TEST.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `DCE Annotations` | `./BUN_DCE_ANNOTATIONS.md` | 809 | File not found: /Users/nolarose/geelark/docs/reference/BUN_DCE_ANNOTATIONS.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Feature Flags Verification` | `./FEATURE_FLAGS_VERIFICATION.md` | 810 | File not found: /Users/nolarose/geelark/docs/reference/FEATURE_FLAGS_VERIFICATION.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Server API` | `./api/SERVER_API.md` | 816 | File not found: /Users/nolarose/geelark/docs/reference/api/SERVER_API.md |
| /docs/reference/DOCUMENTATION_INDEX.md | `Deployment Guide` | `./getting-started/DEPLOYMENT.md` | 818 | File not found: /Users/nolarose/geelark/docs/reference/getting-started/DEPLOYMENT.md |

## Valid Internal Links (153)

| File | Link Text | Destination | Line |
|------|-----------|-------------|------|
| /docs/runtime/RUNTIME_CONTROLS.md | `Unhandled Rejections Guide` | `../errors/UNHANDLED_REJECTIONS.md` | 100 |
| /docs/runtime/RUNTIME_CONTROLS.md | `Testing Alignment Guide` | `../guides/testing/TESTING_ALIGNMENT.md` | 307 |
| /docs/runtime/BUN_DEPENDENCIES_TRANSPIRATION.md | `BUN_RUNTIME_FEATURES` | `./BUN_RUNTIME_FEATURES.md` | 335 |
| /docs/runtime/BUN_DEPENDENCIES_TRANSPIRATION.md | `ARCHITECTURE` | `../architecture/ARCHITECTURE.md` | 336 |
| /docs/runtime/BUN_DEPENDENCIES_TRANSPIRATION.md | `CLI_REFERENCE` | `../api/CLI_REFERENCE.md` | 337 |
| /docs/runtime/bun/BUN_UTILITIES_SUMMARY.md | `inspect.table Guide` | `./BUN_INSPECT_TABLE.md` | 404 |
| /docs/runtime/bun/BUN_UTILITIES_SUMMARY.md | `File I/O Guide` | `./BUN_FILE_IO.md` | 405 |
| /docs/runtime/bun/BUN_IMPROVEMENTS_SUMMARY.md | `CLI Usage Guide` | `./BUN_CLI_GUIDE.md` | 113 |
| /docs/runtime/bun/BUN_DEV_WORKFLOW.md | `CLI Usage Guide` | `./BUN_CLI_GUIDE.md` | 436 |
| /docs/runtime/bun/BUN_DEV_WORKFLOW.md | `Improvements Summary` | `./BUN_IMPROVEMENTS_SUMMARY.md` | 437 |
| /docs/runtime/bun/BUN_RUN_STDIN_QUICKREF.md | `Full Documentation` | `./BUN_RUN_STDIN.md` | 185 |
| /docs/runtime/BUN_CONSTANTS.md | `Feature Flags Guide` | `../guides/FEATURE_FLAGS_PRO_TIPS.md` | 336 |
| /docs/runtime/PROCESS_LIFECYCLE.md | `Watch Mode` | `../guides/testing/TESTING_ALIGNMENT.md` | 464 |
| /docs/runtime/PROCESS_LIFECYCLE.md | `Benchmarking` | `./RUNTIME_CONTROLS.md` | 465 |
| /docs/runtime/BUN_RUNTIME_FEATURES.md | `Process Lifecycle` | `./PROCESS_LIFECYCLE.md` | 390 |
| /docs/runtime/BUN_RUNTIME_FEATURES.md | `Runtime Controls` | `./RUNTIME_CONTROLS.md` | 391 |
| /docs/README.md | `main project README` | `../README.md` | 5 |
| /docs/README.md | `SETUP.md` | `getting-started/SETUP.md` | 17 |
| /docs/README.md | `USER_GUIDE.md` | `getting-started/USER_GUIDE.md` | 18 |
| /docs/README.md | `DEPLOYMENT.md` | `getting-started/DEPLOYMENT.md` | 19 |

... and 133 more valid links.

## External Links (148)

| File | Link Text | Destination |
|------|-----------|-------------|
| /docs/runtime/RUNTIME_CONTROLS.md | `Runtime & Process Control` | `https://bun.com/docs/runtime#runtime-%26-process-control` |
| /docs/runtime/RUNTIME_CONTROLS.md | `Bun Runtime - Unhandled Rejections` | `https://bun.com/docs/runtime#param-unhandled-rejections` |
| /docs/runtime/RUNTIME_CONTROLS.md | `Bun Runtime Documentation` | `https://bun.com/docs/runtime#runtime-%26-process-control` |
| /docs/runtime/RUNTIME_CONTROLS.md | `Bun Test Documentation` | `https://bun.sh/docs/test` |
| /docs/runtime/BUN_DEPENDENCIES_TRANSPIRATION.md | `Bun Dependency Resolution` | `https://bun.sh/docs/runtime/dependency-resolution` |
| /docs/runtime/BUN_DEPENDENCIES_TRANSPIRATION.md | `Bun Transpilation` | `https://bun.sh/docs/runtime/transpilation` |
| /docs/runtime/BUN_DEPENDENCIES_TRANSPIRATION.md | `Bun Docs - Dependency Resolution` | `https://bun.sh/docs/runtime/dependency-resolution` |
| /docs/runtime/BUN_DEPENDENCIES_TRANSPIRATION.md | `Bun Docs - Transpilation` | `https://bun.sh/docs/runtime/transpilation` |
| /docs/runtime/bun/BUN_UTILITIES_SUMMARY.md | `Bun.inspect.table` | `https://bun.com/reference/bun/inspect/table` |
| /docs/runtime/bun/BUN_UTILITIES_SUMMARY.md | `Bun.inspect.custom` | `https://bun.com/docs/runtime/utils#bun-inspect-custom` |
| /docs/runtime/bun/BUN_UTILITIES_SUMMARY.md | `Bun.deepEquals` | `https://bun.com/docs/runtime/utils#bun-deepequals` |
| /docs/runtime/bun/BUN_UTILITIES_SUMMARY.md | `Bun.escapeHTML` | `https://bun.com/docs/runtime/utils#bun-escapehtml` |
| /docs/runtime/bun/BUN_UTILITIES_SUMMARY.md | `Bun.stringWidth` | `https://bun.com/docs/runtime/utils#bun-stringwidth` |
| /docs/runtime/bun/BUN_UTILITIES_SUMMARY.md | `Bun Utils` | `https://bun.com/docs/runtime/utils` |
| /docs/runtime/bun/BUN_UTILITIES_SUMMARY.md | `Bun.inspect.table` | `https://bun.com/reference/bun/inspect/table` |

... and 133 more external links.

## Anchor-Only Links (141)

Anchor-only links found: 141
These are internal page anchors that link to sections within the same file.

## Recommendations

1. Review and fix broken links listed above
2. Update relative paths that no longer exist
3. Check file reorganization impact on internal links
4. Consider using absolute paths for consistency
5. Add link validation to CI/CD pipeline

