#!/usr/bin/env bash
# proton-vault-check.sh — prove env.template pass:// refs resolve without leaking secrets
# Usage:
#   bash scripts/proton-vault-check.sh              # all known templates
#   bash scripts/proton-vault-check.sh factorywager
#   bash scripts/proton-vault-check.sh --list-only  # print refs only (no network)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LIST_ONLY=0
FILTER=""

for arg in "$@"; do
  case "$arg" in
    --list-only) LIST_ONLY=1 ;;
    factorywager|bet-ticker|cascade-mover|scanner|cloudflare) FILTER="$arg" ;;
    -h|--help)
      echo "Usage: $0 [factorywager|bet-ticker|cascade-mover|scanner] [--list-only]"
      exit 0
      ;;
    *)
      echo "Unknown arg: $arg" >&2
      exit 1
      ;;
  esac
done

# project → agent, template
declare -a PROJECTS=()
add_project() {
  PROJECTS+=("$1|$2|$3")
}
add_project factorywager factorywager "$ROOT/env.template"
add_project bet-ticker bet-ticker "$ROOT/projects/active/enterprise/bet-ticker-worker-v1.1/env.template"
add_project cascade-mover cascade-mover "$ROOT/projects/active/enterprise/cascade-mover-v3/env.template"
add_project scanner factorywager "$ROOT/projects/active/analysis/scanner/env.template"

extract_refs() {
  local file="$1"
  # Active lines only (ignore # comments). {{ pass://vault/item/field }}
  grep -vE '^[[:space:]]*#' "$file" 2>/dev/null \
    | grep -oE '\{\{ *pass://[^}]+ *\}\}' \
    | sed -E 's/\{\{ *//; s/ *\}\}//' \
    | sort -u
}

parse_ref() {
  # pass://vault/item.../field  → vault, item (may have slashes? usually not), field
  local ref="$1"
  local rest="${ref#pass://}"
  local vault="${rest%%/*}"
  rest="${rest#*/}"
  local field="${rest##*/}"
  local item="${rest%/*}"
  printf '%s\t%s\t%s\n' "$vault" "$item" "$field"
}

echo "== Proton vault check =="
echo "Root: $ROOT"
echo ""

FAIL=0
CHECKED=0

for entry in "${PROJECTS[@]}"; do
  IFS='|' read -r proj agent template <<<"$entry"
  if [ -n "$FILTER" ] && [ "$FILTER" != "$proj" ] && ! { [ "$FILTER" = "cloudflare" ] && [ "$proj" = "factorywager" ]; }; then
    continue
  fi
  if [ ! -f "$template" ]; then
    echo "❌ $proj: template missing ($template)"
    FAIL=1
    continue
  fi

  echo "── $proj  agent=$agent"
  echo "   template: ${template#$ROOT/}"
  refs=()
  while IFS= read -r r; do
    [ -n "$r" ] && refs+=("$r")
  done < <(extract_refs "$template")

  if [ "${#refs[@]}" -eq 0 ]; then
    echo "   (no pass:// refs)"
    echo ""
    continue
  fi

  for ref in "${refs[@]}"; do
    IFS=$'\t' read -r vault item field <<<"$(parse_ref "$ref")"
    echo "   • $ref"
    echo "       vault=$(printf '%q' "$vault") item=$(printf '%q' "$item") field=$(printf '%q' "$field")"
  done

  if [ "$LIST_ONLY" -eq 1 ]; then
    echo ""
    continue
  fi

  # shellcheck source=agent-env.sh
  if ! source "$SCRIPT_DIR/agent-env.sh" "$agent" >/dev/null; then
    echo "   ❌ agent-env failed for $agent"
    FAIL=1
    echo ""
    continue
  fi

  tmp_out="$(mktemp "${TMPDIR:-/tmp}/proton-vault-XXXXXX.env")"
  chmod 600 "$tmp_out"
  if PROTON_PASS_AGENT_REASON="Vault check inject for $proj" \
    pass-cli inject --in-file "$template" --out-file "$tmp_out" --force >/dev/null 2>"${tmp_out}.err"; then
    # Validate: every KEY that had a pass ref is non-empty and not a raw template
    ok=1
    while IFS= read -r line; do
      case "$line" in
        \#*|"") continue ;;
        *=*)
          k="${line%%=*}"
          v="${line#*=}"
          if [[ "$v" == *"{{"* ]] || [[ "$v" == pass://* ]]; then
            echo "   ❌ $k still unresolved"
            ok=0
          fi
          if [ -z "$v" ]; then
            echo "   ❌ $k empty after inject"
            ok=0
          fi
          # Never print values — length only for secret-ish keys
          if [[ "$k" == *TOKEN* || "$k" == *SECRET* || "$k" == *PASSWORD* || "$k" == *KEY* || "$k" == *BOT* ]]; then
            echo "   ✓ $k resolved (len=${#v})"
          else
            echo "   ✓ $k set"
          fi
          ;;
      esac
    done < "$tmp_out"

    # Account-token verify when CF present
    if grep -q '^CLOUDFLARE_API_TOKEN=' "$tmp_out"; then
      # shellcheck disable=SC1090
      set -a
      # shellcheck source=/dev/null
      source "$tmp_out"
      set +a
      ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-7a470541a704caaf91e71efccc78fd36}"
      if [[ "${CLOUDFLARE_API_TOKEN:-}" == cfat_* ]]; then
        url="https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/tokens/verify"
      else
        url="https://api.cloudflare.com/client/v4/user/tokens/verify"
      fi
      body=$(curl -sS -m 15 -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" "$url" || true)
      if echo "$body" | grep -q '"success":true'; then
        echo "   ✓ CLOUDFLARE_API_TOKEN verifies (account/user path)"
      else
        echo "   ❌ CLOUDFLARE_API_TOKEN verify failed"
        echo "      $(echo "$body" | head -c 160)"
        ok=0
      fi
      unset CLOUDFLARE_API_TOKEN CLOUDFLARE_DNS_API_TOKEN R2_SECRET_ACCESS_KEY || true
    fi

    if [ "$ok" -eq 1 ]; then
      echo "   ✅ inject OK"
      CHECKED=$((CHECKED + 1))
    else
      FAIL=1
    fi
  else
    echo "   ❌ inject failed:"
    sed 's/^/      /' "${tmp_out}.err" | head -20
    FAIL=1
  fi
  rm -f "$tmp_out" "${tmp_out}.err"
  echo ""
done

if [ "$LIST_ONLY" -eq 1 ]; then
  exit 0
fi

if [ "$FAIL" -ne 0 ]; then
  echo "❌ proton vault check FAILED"
  exit 1
fi
echo "✅ proton vault check passed ($CHECKED project template(s))"
