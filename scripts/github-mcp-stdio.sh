#!/usr/bin/env bash
# Launch official GitHub MCP over stdio.
#
# Keychain access is blocked. This script never runs `gh` or `security`.
# A token has to already be in the environment. Remove
# ~/.local/share/keychain-block before restoring `gh auth token`.
#
# Logs go to a file — the Go server writes INFO to stderr, and Cursor's MCP host
# labels every stderr line as [error], which looks like a failure even when
# connect_success / session initialized already happened.
set -euo pipefail

if [[ -f "${HOME}/.local/share/keychain-block" ]]; then
  echo "github-mcp-stdio: keychain access is blocked. Not calling gh." >&2
  exit 1
fi

TOKEN="${GITHUB_PERSONAL_ACCESS_TOKEN:-${GITHUB_TOKEN:-${GH_TOKEN:-}}}"
if [[ -z "${TOKEN}" ]]; then
  echo "github-mcp-stdio: no GITHUB_PERSONAL_ACCESS_TOKEN, GITHUB_TOKEN, or GH_TOKEN in the environment. Not calling gh." >&2
  exit 1
fi

BIN="${GITHUB_MCP_SERVER_BIN:-/Users/nolarose/go/bin/github-mcp-server}"
if [[ ! -x "${BIN}" ]]; then
  echo "github-mcp-stdio: missing binary at ${BIN} (go install github.com/github/github-mcp-server/cmd/github-mcp-server@latest)" >&2
  exit 1
fi

LOG_DIR="${GITHUB_MCP_LOG_DIR:-${HOME}/.cursor/github-mcp-logs}"
mkdir -p "${LOG_DIR}"
LOG_FILE="${LOG_DIR}/github-mcp-server.log"

export GITHUB_PERSONAL_ACCESS_TOKEN="${TOKEN}"
# Keep MCP JSON-RPC on stdout; park slog/banner on a rotating-ish append log.
exec "${BIN}" stdio "$@" 2>>"${LOG_FILE}"
