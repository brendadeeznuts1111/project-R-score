#!/usr/bin/env bash
# pass-session.sh — shared Proton Pass CLI session helpers.
# Grounded in: https://protonpass.github.io/pass-cli/get-started/configuration/
#              https://protonpass.github.io/pass-cli/commands/info/
#              https://protonpass.github.io/pass-cli/commands/test/
#              https://protonpass.github.io/pass-cli/help/troubleshoot/
#
# shellcheck shell=bash
# Sourced by agent-env.sh / ssh-vault.sh / proton-run.sh — not executed alone.

# Stable per-project session root (survives reboot; mode 0700).
# Override: PROTON_PASS_SESSION_ROOT or full PROTON_PASS_SESSION_DIR.
pass_session_root() {
  printf '%s' "${PROTON_PASS_SESSION_ROOT:-${HOME}/.factorywager/pass-sessions}"
}

# Resolve session dir for a project slug (factorywager, bet-ticker, …).
pass_session_dir_for() {
  local project="$1"
  printf '%s/%s' "$(pass_session_root)" "$project"
}

# Ensure session directory exists with tight perms.
pass_session_prepare() {
  local dir="$1"
  mkdir -p "$dir"
  chmod 700 "$dir" 2>/dev/null || true
  mkdir -p "$dir/.session"
  chmod 700 "$dir/.session" 2>/dev/null || true
}

# Key provider policy (official: keyring default; fs for headless/agents).
# Agents use fs by default for multi-PAT isolation under distinct SESSION_DIRs.
# Opt into OS keyring: PASS_USE_KEYRING=1
# Force fs explicitly: PASS_FORCE_FS_KEY=1 (default agent path)
pass_key_provider_for_agent() {
  if [ "${PASS_USE_KEYRING:-0}" = "1" ]; then
    printf 'keyring'
  else
    printf 'fs'
  fi
}

# Print PAT name from info JSON (empty on failure). No secret values.
pass_session_pat_name() {
  pass-cli info --output json 2>/dev/null | sed -n 's/.*"personal_access_token_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1
}

# True when pass-cli info --output json reports a real PAT session.
# Official: info shows personal_access_token_name; test is connectivity only.
# @see https://protonpass.github.io/pass-cli/commands/info/
pass_session_ready() {
  command -v pass-cli >/dev/null 2>&1 || return 1
  local name
  name="$(pass_session_pat_name)"
  [ -n "$name" ] && [ "$name" != "N/A" ]
}

# Materialize inject-style template ({{ pass://… }}) into a run-style dotenv
# (bare pass://…) for `pass-cli run --env-file`. Official run scans bare URIs.
# Writes to $1 path; mode 0600.
pass_template_to_run_env() {
  local in_file="$1"
  local out_file="$2"
  if [ ! -f "$in_file" ]; then
    echo "pass_template_to_run_env: missing template: $in_file" >&2
    return 1
  fi
  # Strip handlebars wrappers; leave non-secret lines intact; drop pure comments optional keep.
  sed -E \
    -e 's/\{\{[[:space:]]*(pass:\/\/[^}]+)[[:space:]]*\}\}/\1/g' \
    "$in_file" >"$out_file"
  chmod 600 "$out_file"
}

# Agent-reachable SSH vault. factorywager-bot cannot open Personal.
# Override: PASS_SSH_VAULT. Personal only when using interactive / agent-work PAT.
# Shell default for monorepo operator SSH (keys duplicated under factorywager).
pass_ssh_vault_default() {
  printf '%s' "${PASS_SSH_VAULT:-${FACTORYWAGER_VAULT:-factorywager}}"
}

# PAT-aware SSH vault when a session is active (override PASS_SSH_VAULT wins).
# Mirrors lib/security/pass-session.ts defaultSshVaultForPat.
pass_ssh_vault_for_session() {
  if [ -n "${PASS_SSH_VAULT:-}" ]; then
    printf '%s' "$PASS_SSH_VAULT"
    return 0
  fi
  if [ -n "${FACTORYWAGER_VAULT:-}" ]; then
    printf '%s' "$FACTORYWAGER_VAULT"
    return 0
  fi
  local name
  name="$(pass_session_pat_name 2>/dev/null || true)"
  case "$(printf '%s' "$name" | tr '[:upper:]' '[:lower:]')" in
    *factorywager*) printf 'factorywager' ;;
    *bet-ticker*|*betticker*) printf 'bet-ticker' ;;
    *cascade*) printf 'cascade-mover' ;;
    *kalshi*) printf 'kalshi-bot' ;;
    *partner*) printf 'partners' ;;
    *cloudflare*) printf 'factorywager' ;;
    '') printf 'factorywager' ;;
    *) printf 'Personal' ;;
  esac
}

# Export SSH_AUTH_SOCK from Proton Pass daemon sock when unset.
pass_ssh_export_sock() {
  local sock="${HOME}/.ssh/proton-pass-agent.sock"
  if [ -z "${SSH_AUTH_SOCK:-}" ] && [ -S "$sock" ]; then
    export SSH_AUTH_SOCK="$sock"
    return 0
  fi
  return 1
}

# True when daemon log recently shows "No active session" (stale daemon vs PAT session).
pass_ssh_daemon_needs_heal() {
  local log="${HOME}/.ssh/proton-pass-agent.log"
  [ -f "$log" ] || return 1
  # Last ~40 lines; match official/agent error text.
  tail -n 40 "$log" 2>/dev/null | grep -q 'No active session'
}

# Restart Pass SSH agent daemon so it picks up the current pass-cli session.
# @see https://protonpass.github.io/pass-cli/help/troubleshoot/
pass_ssh_daemon_heal() {
  echo "  🔧 Healing ssh-agent daemon (No active session / session drift)…"
  pass-cli ssh-agent daemon stop 2>/dev/null || true
  sleep 0.5
  pass-cli ssh-agent daemon start
  pass_ssh_export_sock || true
  echo "  ✓ daemon restarted; SSH_AUTH_SOCK=${SSH_AUTH_SOCK:-unset}"
}

# Wipe legacy /tmp/pass-agent-* session dirs (obsolete after stable session root).
pass_legacy_tmp_wipe() {
  local d
  for d in /tmp/pass-agent-factorywager /tmp/pass-agent-cloudflare /tmp/pass-agent-bet-ticker \
    /tmp/pass-agent-cascade /tmp/pass-agent-partners /tmp/pass-agent-kalshi-bot /tmp/pass-agent-admin; do
    if [ -d "$d" ]; then
      echo "  🧹 Removing legacy session: $d"
      rm -rf "$d"
    fi
  done
}

# Vault names visible to current session (one per line). Empty on failure.
pass_vault_list_names() {
  pass-cli vault list --output json 2>/dev/null | python3 -c '
import json,sys
try:
  d=json.load(sys.stdin)
except Exception:
  sys.exit(0)
arr=d if isinstance(d,list) else (d.get("vaults") or [])
for v in arr:
  if isinstance(v,dict):
    n=v.get("name") or v.get("title")
    if n: print(n)
' 2>/dev/null
}
