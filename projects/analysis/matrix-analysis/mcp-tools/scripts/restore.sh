#!/bin/bash
# Restore automation script for Enhanced Multi-Tenant Dashboard

set -euo pipefail

# Source environment variables
source "$(dirname "$0")/../setup-paths.sh"

# Default values
BACKUP_FILE=""
FORCE=false
VERBOSE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --from-backup)
            BACKUP_FILE="$2"
            shift 2
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            echo "Usage: $0 --from-backup BACKUP_FILE [OPTIONS]"
            echo "Options:"
            echo "  --from-backup FILE  Backup file to restore from"
            echo "  --force             Force restore (overwrite existing)"
            echo "  --verbose           Show detailed output"
            echo "  --help              Show this help"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate backup file
if [ -z "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file required. Use --from-backup FILE"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Check if force is needed
if [ "$FORCE" = false ]; then
    if [ -n "$(find "$DASHBOARD_DATA_DIR" -name "*.db" -type f 2>/dev/null)" ]; then
        echo "⚠️  Warning: Existing databases found. Use --force to overwrite."
        exit 1
    fi
fi

if [ "$VERBOSE" = true ]; then
    echo "🔧 Starting restore from backup..."
    echo "📁 Backup file: $BACKUP_FILE"
    echo "📂 Target directory: $DASHBOARD_BASE_DIR"
fi

# Create temporary restore directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Extract backup
echo "📦 Extracting backup..."
if [[ "$BACKUP_FILE" == *.tar.gz ]]; then
    tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"
else
    echo "❌ Error: Unsupported backup format. Expected .tar.gz file."
    exit 1
fi

# Find metadata file
METADATA_FILE=$(find "$TEMP_DIR" -name "metadata_*.json" | head -1)
if [ -z "$METADATA_FILE" ]; then
    echo "❌ Error: Backup metadata not found."
    exit 1
fi

# Read backup metadata
if [ "$VERBOSE" = true ]; then
    echo "📋 Backup metadata:"
    cat "$METADATA_FILE" | jq '.'
fi

# Restore databases
echo "💾 Restoring databases..."
find "$TEMP_DIR" -name "*.db" -type f | while read -r db_file; do
    if [ "$VERBOSE" = true ]; then
        echo "  📄 Restoring: $db_file -> $DASHBOARD_DATA_DIR"
    fi
    cp "$db_file" "$DASHBOARD_DATA_DIR/"
done

# Restore configuration
echo "⚙️ Restoring configuration..."
CONFIG_DIR=$(find "$TEMP_DIR" -name "config_*" -type d | head -1)
if [ -n "$CONFIG_DIR" ] && [ -d "$CONFIG_DIR" ]; then
    if [ "$VERBOSE" = true ]; then
        echo "  📁 Restoring config: $CONFIG_DIR -> $DASHBOARD_CONFIG_DIR"
    fi
    cp -r "$CONFIG_DIR"/* "$DASHBOARD_CONFIG_DIR/"
fi

# Restore snapshots
echo "📸 Restoring snapshots..."
SNAPSHOTS_DIR=$(find "$TEMP_DIR" -name "snapshots_*" -type d | head -1)
if [ -n "$SNAPSHOTS_DIR" ] && [ -d "$SNAPSHOTS_DIR" ]; then
    if [ "$VERBOSE" = true ]; then
        echo "  📁 Restoring snapshots: $SNAPSHOTS_DIR -> $DASHBOARD_SNAPSHOTS_DIR"
    fi
    cp -r "$SNAPSHOTS_DIR"/* "$DASHBOARD_SNAPSHOTS_DIR/"
fi

# Restore audit data
echo "🔍 Restoring audit data..."
AUDIT_DIR=$(find "$TEMP_DIR" -name "audit_*" -type d | head -1)
if [ -n "$AUDIT_DIR" ] && [ -d "$AUDIT_DIR" ]; then
    if [ "$VERBOSE" = true ]; then
        echo "  📁 Restoring audit: $AUDIT_DIR -> $DASHBOARD_AUDIT_DIR"
    fi
    cp -r "$AUDIT_DIR"/* "$DASHBOARD_AUDIT_DIR/"
fi

# Set proper permissions
echo "🔐 Setting permissions..."
chmod -R 755 "$DASHBOARD_DATA_DIR"
chmod -R 644 "$DASHBOARD_DATA_DIR"/*.db
chmod -R 755 "$DASHBOARD_CONFIG_DIR"
chmod -R 755 "$DASHBOARD_SNAPSHOTS_DIR"
chmod -R 755 "$DASHBOARD_AUDIT_DIR"

# Verify restore
echo "✅ Verifying restore..."
DB_COUNT=$(find "$DASHBOARD_DATA_DIR" -name "*.db" -type f | wc -l)
if [ "$DB_COUNT" -eq 0 ]; then
    echo "⚠️  Warning: No databases found after restore."
else
    echo "📊 Restored $DB_COUNT database(s)"
fi

if [ "$VERBOSE" = true ]; then
    echo "📋 Restored files:"
    find "$DASHBOARD_DATA_DIR" -name "*.db" -exec basename {} \;
fi

echo "🎉 Restore completed successfully!"
echo "📂 Restored from: $BACKUP_FILE"
echo "📊 Databases restored: $DB_COUNT"
