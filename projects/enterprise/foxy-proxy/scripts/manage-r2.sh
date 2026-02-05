#!/bin/bash

# R2 Bucket Management Script
# List, download, and manage files in foxy-proxy-storage

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
BUCKET_NAME="foxy-proxy-storage"

echo -e "${BLUE}🗂️  R2 Bucket Management${NC}"
echo -e "${BLUE}=======================${NC}"
echo ""

# Function to list files
list_files() {
    echo -e "${CYAN}📋 Files in bucket: $BUCKET_NAME${NC}"
    echo ""
    
    if wrangler r2 object list "$BUCKET_NAME" --remote; then
        echo ""
        echo -e "${GREEN}✅ File list retrieved successfully${NC}"
    else
        echo -e "${RED}❌ Failed to list files${NC}"
        exit 1
    fi
}

# Function to download file
download_file() {
    local remote_name="$1"
    local local_path="${2:-$(basename "$remote_name")}"
    
    echo -e "${CYAN}📥 Downloading: $remote_name${NC}"
    echo -e "${CYAN}📁 To: $local_path${NC}"
    echo ""
    
    if wrangler r2 object get "$BUCKET_NAME/$remote_NAME" --file="$local_path"; then
        echo -e "${GREEN}✅ Download successful: $local_path${NC}"
    else
        echo -e "${RED}❌ Download failed${NC}"
        exit 1
    fi
}

# Function to delete file
delete_file() {
    local remote_name="$1"
    
    echo -e "${YELLOW}🗑️  Deleting: $remote_name${NC}"
    echo ""
    
    if wrangler r2 object delete "$BUCKET_NAME/$remote_name"; then
        echo -e "${GREEN}✅ File deleted successfully${NC}"
    else
        echo -e "${RED}❌ Delete failed${NC}"
        exit 1
    fi
}

# Function to show bucket info
bucket_info() {
    echo -e "${CYAN}📊 Bucket Information: $BUCKET_NAME${NC}"
    echo ""
    
    # Get bucket info
    echo -e "${BLUE}Basic Info:${NC}"
    echo -e "   • Name: $BUCKET_NAME"
    echo -e "   • Account ID: 7a470541a704caaf91e71efccc78fd36"
    echo -e "   • Endpoint: https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com"
    echo ""
    
    # List files to show usage
    echo -e "${BLUE}Contents:${NC}"
    if wrangler r2 object list "$BUCKET_NAME" | grep -q "Key:"; then
        local file_count=$(wrangler r2 object list "$BUCKET_NAME" | grep -c "Key:" || echo "0")
        echo -e "   • Files: $file_count objects"
    else
        echo -e "   • Files: Bucket is empty"
    fi
    echo ""
}

# Show usage
show_usage() {
    echo -e "${YELLOW}Usage: ./scripts/manage-r2.sh [command] [options]${NC}"
    echo ""
    echo "Commands:"
    echo "  list                    - List all files in bucket"
    echo "  download <remote> [local] - Download a file"
    echo "  delete <remote>         - Delete a file"
    echo "  info                    - Show bucket information"
    echo ""
    echo "Examples:"
    echo "  ./scripts/manage-r2.sh list"
    echo "  ./scripts/manage-r2.sh download test-upload.txt"
    echo "  ./scripts/manage-r2.sh download folder/data.txt local-copy.txt"
    echo "  ./scripts/manage-r2.sh delete old-file.txt"
    echo "  ./scripts/manage-r2.sh info"
    echo ""
}

# Main logic
case "${1:-help}" in
    "list")
        list_files
        ;;
    "download")
        if [ $# -lt 2 ]; then
            echo -e "${RED}❌ Please specify remote file name${NC}"
            show_usage
            exit 1
        fi
        download_file "$2" "$3"
        ;;
    "delete")
        if [ $# -lt 2 ]; then
            echo -e "${RED}❌ Please specify remote file name${NC}"
            show_usage
            exit 1
        fi
        echo -e "${RED}⚠️  Are you sure you want to delete '$2'? (y/N)${NC}"
        read -r confirm
        if [[ "$confirm" =~ ^[Yy]$ ]]; then
            delete_file "$2"
        else
            echo -e "${YELLOW}❌ Delete cancelled${NC}"
        fi
        ;;
    "info")
        bucket_info
        ;;
    "help"|*)
        show_usage
        ;;
esac

echo ""
echo -e "${BLUE}🌐 View in web interface: http://localhost:5173${NC}"
