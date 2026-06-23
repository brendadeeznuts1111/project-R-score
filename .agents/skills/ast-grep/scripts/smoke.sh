#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="$(cd "$ROOT/../../.." && pwd)"
HELPER="$ROOT/scripts/ast_grep_helper.py"
SG="$ROOT/scripts/sg.sh"
TARGET="${1:-$REPO/kimi-plugin/sports-odds-plugin/scripts/lib/f402.ts}"

if [[ ! -f "$TARGET" ]]; then
  TARGET="$ROOT/scripts/ast_grep_helper.py"
fi

cd "$REPO"

echo "== doctor =="
if command -v bun >/dev/null 2>&1; then
  bun "$ROOT/scripts/bun-cli.ts" doctor
else
  python3 "$HELPER" doctor
fi
echo ""
echo "== map --list (zones) =="
python3 "$HELPER" -q map --list 2>&1 | head -20
echo ""
echo "== map --compact --zone kimi =="
python3 "$HELPER" -q map --compact --zone kimi
echo ""
echo "== map --heatmap =="
python3 "$HELPER" -q map --heatmap 2>&1 | head -12
echo ""
echo "== zones --stats =="
python3 "$HELPER" -q zones --stats 2>&1 | head -20
echo ""
echo "== index (summary) =="
python3 "$HELPER" -q index --refresh 2>&1 | head -15
echo ""
echo "== index --name fetch --zone kimi =="
python3 "$HELPER" -q index --name fetch --zone kimi 2>&1 | head -12
echo ""
echo "== nav --zone kimi =="
python3 "$HELPER" -q nav --zone kimi 2>&1 | head -25
echo ""
echo "== index --status =="
python3 "$HELPER" -q index --status 2>&1 | head -6
echo ""
echo "== anchors --zone kimi =="
python3 "$HELPER" -q anchors --zone kimi 2>&1 | head -20
echo ""
echo "== exports --zone kimi =="
python3 "$HELPER" -q exports --zone kimi 2>&1 | head -15
echo ""
echo "== collisions (kimi) =="
python3 "$HELPER" -q collisions --zone kimi 2>&1 | head -10
echo ""
echo "== graph --zone kimi =="
python3 "$HELPER" -q graph --zone kimi 2>&1 | head -12
echo ""
echo "== jump --name f402Fetch =="
python3 "$HELPER" -q jump --name f402Fetch --zone kimi 2>&1 | head -10
echo ""
echo "== bun docs =="
python3 "$HELPER" -q bun docs 2>&1 | head -20
echo ""
echo "== bun roadmap (high) =="
python3 "$HELPER" -q bun roadmap --priority high 2>&1 | head -12
echo ""
echo "== bun bundles =="
python3 "$HELPER" -q bun bundles 2>&1 | head -12
echo ""
echo "== bun score (sports-terminal) =="
python3 "$HELPER" -q bun score --zone sports-terminal 2>&1 | head -8
echo ""
echo "== bun report (sports-terminal) =="
python3 "$HELPER" -q bun report --zone sports-terminal 2>&1 | head -18
echo ""
echo "== bun patterns (core) =="
python3 "$HELPER" -q bun patterns --tier core 2>&1 | head -15
echo ""
echo "== bun matrix (sports-terminal) =="
python3 "$HELPER" -q bun matrix --zone sports-terminal 2>&1 | head -12
echo ""
echo "== bun heatmap (core) =="
python3 "$HELPER" -q bun heatmap --zone sports-terminal --tier core 2>&1 | head -12
echo ""
echo "== bun inventory (sports-terminal) =="
python3 "$HELPER" -q bun inventory --zone sports-terminal --group http 2>&1 | head -12
echo ""
echo "== bun search bun-serve =="
python3 "$HELPER" -q bun search bun-serve --zone sports-terminal 2>&1 | head -8
echo ""
echo "== map (kimi only, digest sample) =="
python3 "$HELPER" map --only kimi-f402 2>&1 | head -20
echo ""
echo "== outline --zone agents =="
python3 "$HELPER" -q outline --zone agents --view names 2>&1 | head -15
echo ""
echo "== outline (helper) =="
python3 "$HELPER" outline "$TARGET" --view names
echo ""
echo "== search =="
python3 "$HELPER" -q search 'fetch($$$)' --path "$TARGET" --lang ts
echo ""
echo "== files =="
python3 "$HELPER" -q files 'console.$METHOD($$$)' --path "$TARGET" --lang ts
echo ""
echo "== scan (no-console on f402) =="
python3 "$HELPER" -q scan --path "$TARGET" --rule "$ROOT/rules/no-console-log.yml" 2>&1 | head -8
echo ""
echo "== scan hardcoded URL (sports-terminal sample) =="
python3 "$HELPER" -q scan --path projects/active/sports-terminal-os/src/services/ai-risk-service.ts --rule "$ROOT/rules/hardcoded-fetch-url.yml" 2>&1 | head -6
echo ""
echo "== fix dry-run (no-as-any) =="
python3 "$HELPER" -q fix --path "$TARGET" --dry-run 2>&1 | head -6
echo ""
echo "== rules =="
python3 "$HELPER" -q rules
echo ""
echo "== audit (kimi only) =="
python3 "$HELPER" -q audit --only kimi 2>&1 | head -25
echo ""
echo "== audit profile ci (verbose sample) =="
python3 "$HELPER" -q audit --profile ci --only kimi-mcp -v 2>&1 | head -12
echo ""
echo "== codemods =="
python3 "$HELPER" -q codemods
echo ""
echo "== codemod dry-run =="
python3 "$HELPER" -q codemod strip-as-any --only kimi-mcp 2>&1 | head -8
echo ""
echo "== rule tests =="
python3 "$HELPER" -q test
if command -v bun >/dev/null 2>&1; then
  echo ""
  echo "== mcp doctor =="
  AST_GREP_REPO_ROOT="$REPO" bun "$ROOT/mcp/ast-grep-mcp.ts" <<< '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"ast_grep_doctor","arguments":{}}}' 2>/dev/null | tail -1 | grep -q outline
fi
echo "smoke OK"