#!/usr/bin/env bash
# Migrate legacy /tmp/pass-agent-* sessions → ~/.factorywager/pass-sessions/<project>
# and heal ssh-agent daemon session drift.
#
# Usage:
#   bash scripts/proton-session-migrate.sh
#   bun run proton:session:migrate
#
# @see https://protonpass.github.io/pass-cli/get-started/configuration/
# @see docs/harness/tenants/proton-integration.md

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib/pass-session.sh
. "$SCRIPT_DIR/lib/pass-session.sh"

echo "== proton session migrate =="
echo "Stable root: $(pass_session_root)"
echo ""

echo "-- wipe legacy /tmp sessions --"
pass_legacy_tmp_wipe

echo ""
echo "-- re-login factorywager agent --"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/agent-env.sh" factorywager
if ! pass_session_ready; then
  echo "❌ session still not ready after migrate" >&2
  exit 1
fi
echo "✓ PAT=$(pass_session_pat_name)"
echo "✓ SESSION_DIR=$PROTON_PASS_SESSION_DIR"
echo "✓ vaults: $(pass_vault_list_names | tr '\n' ' ')"

echo ""
echo "-- ssh daemon heal (if needed) --"
if pass_ssh_daemon_needs_heal; then
  pass_ssh_daemon_heal
else
  echo "  (daemon log clean or absent — skip heal)"
  pass_ssh_export_sock || true
fi

echo ""
echo "✅ migrate complete"
echo "   Next: bun run proton:check && bun run vault:health:bake"
echo "   SSH:  bun run proton:ssh:doctor"
