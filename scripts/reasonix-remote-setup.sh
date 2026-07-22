#!/usr/bin/env bash
# reasonix-remote-setup.sh — bootstrap Reasonix Remote SSH + CLI PATH
# Run: bash scripts/reasonix-remote-setup.sh
set -euo pipefail

echo "== Step 1: Install reasonix CLI in PATH =="
ln -sf /Applications/Reasonix.app/Contents/MacOS/reasonix ~/.local/bin/reasonix 2>/dev/null &&
  echo "  ✅ Symlinked to ~/.local/bin/reasonix" ||
  echo "  ⚠️  Could not symlink — try: sudo ln -s /Applications/Reasonix.app/Contents/MacOS/reasonix /usr/local/bin/reasonix"

echo ""
echo "== Step 2: Import SSH hosts =="
if command -v reasonix &>/dev/null; then
  reasonix remote import --all && echo "  ✅ Hosts imported" || echo "  ⚠️  Import failed"
else
  echo "  ⚠️  reasonix not in PATH yet. After fixing PATH, run:"
  echo "     reasonix remote import --all"
fi

echo ""
echo "== Step 3: Test connections =="
if command -v reasonix &>/dev/null; then
  echo "  Run: reasonix remote test <hostname>"
  echo "  Then: reasonix remote connect <hostname> --open"
fi

echo ""
echo "== Quick reference =="
echo "  reasonix remote list                              # show all remotes"
echo "  reasonix remote test <name>                       # dial + auth check"
echo "  reasonix remote connect <name> --open             # tunnel + web UI"
echo "  reasonix remote add <name> <user@host> --workspace '~/path'"
echo "  reasonix remote serve status <name>               # check remote serve"
echo "  reasonix remote fs ls <name>:'~/path'             # SFTP browse"
echo ""
echo "✅ Setup script complete. You may need to open a new terminal for PATH changes."
