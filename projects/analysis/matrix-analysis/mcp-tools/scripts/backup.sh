#!/bin/bash
# Backup automation script for Enhanced Multi-Tenant Dashboard

set -euo pipefail

# Source environment variables
source "$(dirname "$0")/../setup-paths.sh"

# Default values
BACKUP_TYPE="incremental"
COMPRESS=true
VERBOSE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --full)
            BACKUP_TYPE="full"
            shift
            ;;
        --incremental)
            BACKUP_TYPE="incremental"
            shift
            ;;
        --no-compress)
            COMPRESS=false
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --full         Create full backup"
            echo "  --incremental  Create incremental backup (default)"
            echo "  --no-compress  Skip compression"
            echo "  --verbose      Show detailed output"
            echo "  --help         Show this help"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Create backup directory with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="$DASHBOARD_BACKUPS_DIR/$BACKUP_TYPE/$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"

if [ "$VERBOSE" = true ]; then
    echo "🔧 Starting $BACKUP_TYPE backup..."
    echo "📁 Backup directory: $BACKUP_DIR"
    echo "⏰ Timestamp: $TIMESTAMP"
fi

# Backup databases
echo "💾 Backing up databases..."
find "$DASHBOARD_DATA_DIR" -name "*.db" -type f | while read -r db_file; do
    db_name=$(basename "$db_file" .db)
    backup_file="$BACKUP_DIR/${db_name}_${TIMESTAMP}.db"
    
    if [ "$VERBOSE" = true ]; then
        echo "  📄 Backing up: $db_file -> $backup_file"
    fi
    
    cp "$db_file" "$backup_file"
done

# Backup configuration files
echo "⚙️ Backing up configuration files..."
if [ -d "$DASHBOARD_CONFIG_DIR" ]; then
    cp -r "$DASHBOARD_CONFIG_DIR" "$BACKUP_DIR/config_${TIMESTAMP}"
fi

# Backup snapshots
echo "📸 Backing up snapshots..."
if [ -d "$DASHBOARD_SNAPSHOTS_DIR" ]; then
    cp -r "$DASHBOARD_SNAPSHOTS_DIR" "$BACKUP_DIR/snapshots_${TIMESTAMP}"
fi

# Backup audit data
echo "🔍 Backing up audit data..."
if [ -d "$DASHBOARD_AUDIT_DIR" ]; then
    cp -r "$DASHBOARD_AUDIT_DIR" "$BACKUP_DIR/audit_${TIMESTAMP}"
fi

# Create backup metadata
cat > "$BACKUP_DIR/metadata_${TIMESTAMP}.json" << EOF
{
    "backup_type": "$BACKUP_TYPE",
    "timestamp": "$TIMESTAMP",
    "created_at": "$(date -Iseconds)",
    "databases": $(find "$DASHBOARD_DATA_DIR" -name "*.db" -type f | wc -l),
    "compressed": $COMPRESS,
    "source_directory": "$DASHBOARD_BASE_DIR"
}
EOF

# Compress backup if requested
if [ "$COMPRESS" = true ]; then
    echo "🗜️ Compressing backup..."
    tar -czf "$BACKUP_DIR/backup_${TIMESTAMP}.tar.gz" -C "$BACKUP_DIR" \
        *.db config_${TIMESTAMP} snapshots_${TIMESTAMP} audit_${TIMESTAMP} metadata_${TIMESTAMP}.json
    
    # Remove uncompressed files
    rm -f "$BACKUP_DIR"/*.db
    rm -rf "$BACKUP_DIR"/config_*
    rm -rf "$BACKUP_DIR"/snapshots_*
    rm -rf "$BACKUP_DIR"/audit_*
    rm -f "$BACKUP_DIR"/metadata_*.json
fi

# Cleanup old backups (keep 7 days)
echo "🧹 Cleaning up old backups..."
find "$DASHBOARD_BACKUPS_DIR" -name "*.tar.gz" -mtime +7 -delete
find "$DASHBOARD_BACKUPS_DIR" -type d -empty -delete

if [ "$VERBOSE" = true ]; then
    echo "✅ Backup completed successfully!"
    echo "📊 Backup size: $(du -sh "$BACKUP_DIR" | cut -f1)"
fi

echo "🎉 $BACKUP_TYPE backup completed: $BACKUP_DIR"
