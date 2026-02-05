#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║ tension-god-aliases.sh — Sourceable aliases for tension-field-god          ║
# ║ Usage: source tension-god-aliases.sh                                       ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

# ── Guard ────────────────────────────────────────────────────────────────────
if ! command -v bun &>/dev/null; then
  echo "tension-god-aliases: bun not found, skipping" >&2
  return 2>/dev/null || exit 1
fi

# ── Project Root ─────────────────────────────────────────────────────────────
# Set TENSION_ROOT to override; defaults to $HOME
TENSION_ROOT="${TENSION_ROOT:-$HOME}"

# ── Quick Status & Validation ────────────────────────────────────────────────

# Validate GOV/TENSION headers (show only errors)
alias t:validate='rg -c "\[TENSION\-[A-Z]+\-" --type=ts "$TENSION_ROOT"'
alias t:errors='rg "\[TENSION\-[A-Z]+\-" --type=ts "$TENSION_ROOT" | grep -i "❌"'

# Header statistics by scope
alias t:headers='rg -o "\[([A-Z]+)\-" --type=ts "$TENSION_ROOT" | sort | uniq -c | sort -nr | head -20'

# Find all REQUIRED tension rules
alias t:required='rg -l "\[.*REQUIRED.*\]" "$TENSION_ROOT" | xargs rg -l "\[TENSION" | sort'

# ── Development & Live Reload ────────────────────────────────────────────────

# Dev server with debug logging
alias t:dev='TENSION_DEBUG=true bun --hot "$TENSION_ROOT/src/index.ts"'

# Dev server + auto-open browser
alias t:devopen='bun dev & sleep 1 && open -a "Google Chrome" http://localhost:3000'

# ── Matrix CLI Shortcuts ─────────────────────────────────────────────────────

alias t:matrix='bun run "$TENSION_ROOT/src/cli.ts"'
alias t:profiles='bun run "$TENSION_ROOT/src/cli.ts" profile list'
alias t:use='bun run "$TENSION_ROOT/src/cli.ts" profile use'
alias t:diff='bun run "$TENSION_ROOT/src/cli.ts" profile diff'

# ── Grep & Search Arsenal ───────────────────────────────────────────────────

# Find anomaly thresholds
alias t:thresholds='rg -C 3 "0\.9|boostThreshold|convergenceThreshold" "$TENSION_ROOT/src"'

# Find high-tension conditions
alias t:high='rg -n ">\s*0\.8" "$TENSION_ROOT/src" --type=ts'

# Count inertia references
alias t:inertia='rg -c inertia "$TENSION_ROOT/src" --type=ts'

# Find legacy bridge/compat code
alias t:legacy='rg -i "legacy|bridge|compat" "$TENSION_ROOT/src" --type=ts'

# Find all process.* anti-patterns (should be Bun.*)
alias t:antipatterns='rg "process\.(argv|env)" "$TENSION_ROOT/src" --type=ts'

# ── Testing & Benchmarks ────────────────────────────────────────────────────

alias t:test='bun test "$TENSION_ROOT/src"'
alias t:testq='CLAUDECODE=1 bun test --bail --timeout=5000 "$TENSION_ROOT/src"'

# ── Cleanup & Maintenance ───────────────────────────────────────────────────

# Kill all bun watchers/dev processes
alias t:killall='pkill -f "bun.*(watch|propagate|dev)" 2>/dev/null && echo "Watchers terminated" || echo "No watchers running"'

# Clean snapshots older than 7 days
alias t:clean='find "$TENSION_ROOT/tension-snapshots" -name "*.json" -mtime +7 -delete 2>/dev/null; echo "Stale snapshots purged"'

# ── Functions (multi-step commands) ──────────────────────────────────────────

# Full project health check
t:health() {
  echo "── Bun ──"
  bun --version
  echo ""

  echo "── Tests ──"
  CLAUDECODE=1 bun test "$TENSION_ROOT/src" --bail --timeout=5000 2>&1 | tail -5
  echo ""

  echo "── Headers ──"
  local count
  count=$(rg -c '\[TENSION\-[A-Z]+\-' --type=ts "$TENSION_ROOT" 2>/dev/null | awk -F: '{s+=$2}END{print s+0}')
  echo "TENSION headers: $count"
  echo ""

  echo "── Anti-patterns ──"
  local ap
  ap=$(rg -c 'process\.(argv|env)' "$TENSION_ROOT/src" --type=ts 2>/dev/null | awk -F: '{s+=$2}END{print s+0}')
  echo "process.* refs in src/: $ap"
  echo ""

  echo "── Git ──"
  git -C "$TENSION_ROOT" log --oneline -3
  echo ""
  echo "Tension-god status: ACTIVE"
}

# Snapshot current tension field output
t:snapshot() {
  local dir="$TENSION_ROOT/tension-snapshots"
  mkdir -p "$dir"
  local file="$dir/tension-$(date +%s).json"
  if [ -f "$TENSION_ROOT/src/tension-field/core.ts" ]; then
    bun "$TENSION_ROOT/src/tension-field/core.ts" "${1:-demo}" > "$file"
    echo "Snapshot saved: $file"
  else
    echo "src/tension-field/core.ts not found — stub snapshot"
    echo '{"status":"stub","timestamp":'$(date +%s)'}' > "$file"
    echo "Stub saved: $file"
  fi
}

# Show latest snapshot
t:latest() {
  local latest
  latest=$(ls -t "$TENSION_ROOT/tension-snapshots/"*.json 2>/dev/null | head -1)
  if [ -n "$latest" ]; then
    echo "Latest: $latest"
    if command -v jq &>/dev/null; then
      jq -C . "$latest"
    else
      cat "$latest"
    fi
  else
    echo "No snapshots found"
  fi
}

# Quick inline benchmark (N iterations)
t:bench() {
  local n="${1:-100}"
  echo "Running $n iterations..."
  bun -e "
    const start = Bun.nanoseconds();
    for (let i = 0; i < $n; i++) {
      await import('./src/cli.ts');
    }
    const ms = (Bun.nanoseconds() - start) / 1e6;
    console.log(\`$n iterations: \${ms.toFixed(1)}ms (\${(ms/$n).toFixed(2)}ms/iter)\`);
  "
}

echo "tension-god-aliases loaded (TENSION_ROOT=$TENSION_ROOT)"
