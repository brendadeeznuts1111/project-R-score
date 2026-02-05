#!/bin/bash
# Open NEXUS Dev Dashboard in default browser

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DASHBOARD_FILE="$PROJECT_ROOT/dashboard/index.html"

if [ ! -f "$DASHBOARD_FILE" ]; then
    echo "❌ Dashboard not found at: $DASHBOARD_FILE"
    exit 1
fi

echo "🚀 Opening NEXUS Dev Dashboard..."
echo "   File: $DASHBOARD_FILE"

# Detect OS and open accordingly
case "$(uname -s)" in
    Darwin*)
        open "$DASHBOARD_FILE"
        ;;
    Linux*)
        if command -v xdg-open > /dev/null; then
            xdg-open "$DASHBOARD_FILE"
        elif command -v gnome-open > /dev/null; then
            gnome-open "$DASHBOARD_FILE"
        else
            echo "❌ No suitable command found to open browser"
            exit 1
        fi
        ;;
    MINGW*|MSYS*|CYGWIN*)
        start "$DASHBOARD_FILE"
        ;;
    *)
        echo "❌ Unsupported OS"
        exit 1
        ;;
esac

echo "✅ Dashboard opened in browser"
