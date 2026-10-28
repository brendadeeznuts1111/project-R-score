#!/usr/bin/env bash
# Launch official GitHub MCP over stdio; PAT from `gh auth` (git remotes stay SSH).
#
# Logs go to a file — the Go server writes INFO to stderr, and Cursor's MCP host
# labels every stderr line as [error], which looks like a failure even when
# connect_success / session initialized already happened.
set -euo pipefail

TOKEN="$(gh auth token 2>/dev/null || true)"
if [[ -z "${TOKEN}" ]]; then
  echo "github-mcp-stdio: no token from \`gh auth token\`" >&2
  exit 1
fi

BIN="${GITHUB_MCP_SERVER_BIN:-$(command -v github-mcp-server || true)}"
if [[ ! -x "${BIN}" ]]; then
  echo "github-mcp-stdio: set GITHUB_MCP_SERVER_BIN or install github-mcp-server on PATH" >&2
  exit 1
fi

LOG_DIR="${GITHUB_MCP_LOG_DIR:-${HOME}/.cursor/github-mcp-logs}"
mkdir -p "${LOG_DIR}"
LOG_FILE="${LOG_DIR}/github-mcp-server.log"

export GITHUB_PERSONAL_ACCESS_TOKEN="${TOKEN}"
# Keep MCP JSON-RPC on stdout; park slog/banner on a rotating-ish append log.
exec "${BIN}" stdio "$@" 2>>"${LOG_FILE}"
