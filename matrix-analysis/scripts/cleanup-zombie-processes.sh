#!/usr/bin/env bash
# List zombie processes and optionally kill their parents so they get reaped.
# Usage: ./cleanup-zombie-processes.sh [--list] [--kill]
#   --list  (default) Show zombie PIDs and their parent PIDs
#   --kill  Send SIGTERM to parent of each zombie (use with care)

set -e

RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

usage() {
  echo "Usage: $0 [--list] [--kill]"
  echo "  --list  (default) List zombie processes (PID, PPID, STAT, COMM)"
  echo "  --kill  Send SIGTERM to parent(s) of zombies so they get reaped"
  echo ""
  echo "Zombies are reaped when their parent exits or waits. Killing the parent"
  echo "usually clears the zombies. Use --kill only when you're sure."
}

do_list() {
  # ps -eo pid,ppid,stat,comm: zombie state is Z (or Z+ etc)
  out=$(ps -eo pid,ppid,stat,comm 2>/dev/null | awk 'NR==1 { print; next } $3 ~ /Z/ { print; n++ } END { print n+0 }')
  count=$(echo "$out" | tail -1)
  echo "$out" | sed '$d'
  if [[ "$count" -gt 0 ]]; then
    echo -e "${YELLOW}Zombies: $count (parent PIDs in PPID column)${NC}" >&2
  else
    echo "No zombie processes found."
  fi
}

do_kill() {
  # Collect unique parent PIDs of zombies (macOS-safe: no xargs -r)
  ppids=$(ps -eo ppid,stat 2>/dev/null | awk '$2 ~ /Z/ { print $1 }' | sort -u)
  if [[ -z "$ppids" ]]; then
    echo "No zombie processes found; nothing to kill."
    return 0
  fi
  for ppid in $ppids; do
    # Skip PID 1 (init) and ourselves
    [[ "$ppid" -eq 1 ]] && continue
    [[ "$ppid" -eq $$ ]] && continue
    echo "Sending SIGTERM to parent PID $ppid (of zombie(s))"
    kill -TERM "$ppid" 2>/dev/null || true
  done
}

case "${1:-}" in
  -h|--help) usage; exit 0 ;;
  --kill)   do_kill; exit 0 ;;
  --list|"") do_list; exit 0 ;;
  *)        echo -e "${RED}Unknown option: $1${NC}" >&2; usage >&2; exit 1 ;;
esac
