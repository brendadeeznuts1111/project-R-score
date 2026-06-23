#!/usr/bin/env bash
# Smoke-test MCP server via initialize + tools/list + ast_grep_doctor
set -euo pipefail

SKILL="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="$(cd "$SKILL/../../.." && pwd)"
MCP="$SKILL/mcp/ast-grep-mcp.ts"
export AST_GREP_REPO_ROOT="$REPO"

payload='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0"}}}
{"jsonrpc":"2.0","id":2,"method":"tools/list"}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"ast_grep_doctor","arguments":{}}}'

out="$(printf '%s\n' "$payload" | bun "$MCP" 2>/dev/null | tail -3)"
echo "$out" | grep -q ast_grep_outline
echo "$out" | grep -q ast_grep_fix
echo "$out" | grep -q ast_grep_audit
echo "$out" | grep -q 'autofix rules'
echo "mcp OK"