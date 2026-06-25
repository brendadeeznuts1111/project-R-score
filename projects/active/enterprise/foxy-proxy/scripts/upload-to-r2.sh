#!/bin/bash

# R2 File Upload Script
# Upload files to your foxy-proxy-storage bucket

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BUCKET_NAME="foxy-proxy-storage"
ACCOUNT_ID="7a470541a704caaf91e71efccc78fd36"

echo -e "${BLUE}📤 R2 File Upload Script${NC}"
echo -e "${BLUE}========================${NC}"
echo ""

# Check if file path provided
if [ $# -eq 0 ]; then
    echo -e "${YELLOW}Usage: ./scripts/upload-to-r2.sh <file-path> [remote-name]${NC}"
    echo ""
    echo "Examples:"
    echo "  ./scripts/upload-to-r2.sh ./document.pdf"
    echo "  ./scripts/upload-to-r2.sh ./image.png my-photo.png"
    echo "  ./scripts/upload-to-r2.sh ./data.json backup/data.json"
    echo ""
    exit 1
fi

FILE_PATH="$1"
REMOTE_NAME="${2:-$(basename "$FILE_PATH")}"

# Check if file exists
if [ ! -f "$FILE_PATH" ]; then
    echo -e "${RED}❌ File not found: $FILE_PATH${NC}"
    exit 1
fi

echo -e "${GREEN}📁 Local file: $FILE_PATH${NC}"
echo -e "${GREEN}🌐 Bucket: $BUCKET_NAME${NC}"
echo -e "${GREEN}📝 Remote name: $REMOTE_NAME${NC}"
echo ""

# Upload using Wrangler
echo -e "${BLUE}🚀 Uploading to R2...${NC}"
if wrangler r2 object put "$BUCKET_NAME/$REMOTE_NAME" --file="$FILE_PATH"; then
    echo ""
    echo -e "${GREEN}✅ Upload successful!${NC}"
    echo ""
    
    # Get file info
    FILE_SIZE=$(stat -f%z "$FILE_PATH" 2>/dev/null || stat -c%s "$FILE_PATH" 2>/dev/null || echo "unknown")
    
    echo -e "${BLUE}📊 File Details:${NC}"
    echo -e "   • Name: $REMOTE_NAME"
    echo -e "   • Size: $FILE_SIZE bytes"
    echo -e "   • Bucket: $BUCKET_NAME"
    echo -e "   • URL: https://$ACCOUNT_ID.r2.cloudflarestorage.com/$BUCKET_NAME/$REMOTE_NAME"
    echo ""
    
    echo -e "${BLUE}🌐 Access Options:${NC}"
    echo -e "   • Web Interface: http://localhost:5173"
    echo -e "   • Public URL: https://$ACCOUNT_ID.r2.cloudflarestorage.com/$BUCKET_NAME/$REMOTE_NAME"
    echo ""
    
    echo -e "${YELLOW}💡 Tip: View your uploaded file in the bucket visualization at http://localhost:5173${NC}"
else
    echo -e "${RED}❌ Upload failed${NC}"
    exit 1
fi
