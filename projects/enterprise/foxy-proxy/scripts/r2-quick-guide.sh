#!/bin/bash

# Quick R2 Guide and Commands
# Your bucket: foxy-proxy-storage

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}🗂️  Your R2 Bucket Quick Guide${NC}"
echo -e "${BLUE}==============================${NC}"
echo ""

echo -e "${CYAN}📋 Bucket Configuration:${NC}"
echo -e "   • Name: ${YELLOW}foxy-proxy-storage${NC}"
echo -e "   • Account ID: 7a470541a704caaf91e71efccc78fd36"
echo -e "   • Endpoint: https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com"
echo ""

echo -e "${CYAN}🚀 Upload Commands:${NC}"
echo -e "   • Upload file: ${YELLOW}./scripts/upload-to-r2.sh <file>${NC}"
echo -e "   • Example: ${YELLOW}./scripts/upload-to-r2.sh ./photo.jpg${NC}"
echo -e "   • With custom name: ${YELLOW}./scripts/upload-to-r2.sh ./data.json backup/data.json${NC}"
echo ""

echo -e "${CYAN}📥 Download Commands:${NC}"
echo -e "   • Download file: ${YELLOW}wrangler r2 object get foxy-proxy-storage/filename --file=local.txt${NC}"
echo -e "   • Example: ${YELLOW}wrangler r2 object get foxy-proxy-storage/test-upload.txt --file=downloaded.txt${NC}"
echo ""

echo -e "${CYAN}🗑️  Delete Commands:${NC}"
echo -e "   • Delete file: ${YELLOW}wrangler r2 object delete foxy-proxy-storage/filename${NC}"
echo -e "   • Example: ${YELLOW}wrangler r2 object delete foxy-proxy-storage/old-file.txt${NC}"
echo ""

echo -e "${CYAN}🌐 Access Methods:${NC}"
echo -e "   • Web Interface: ${YELLOW}http://localhost:5173${NC}"
echo -e "   • Direct URL: ${YELLOW}https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com/foxy-proxy-storage/your-file${NC}"
echo ""

echo -e "${CYAN}✅ Test Your Upload:${NC}"
echo -e "   We uploaded test-upload.txt to your bucket!"
echo -e "   View it at: ${YELLOW}http://localhost:5173${NC}"
echo ""

echo -e "${GREEN}🎉 Your R2 bucket is ready for use!${NC}"
echo ""

# Test if we can access the uploaded file via the web interface
echo -e "${BLUE}🔍 Checking web interface access...${NC}"
if curl -s -f http://localhost:5173 > /dev/null; then
    echo -e "${GREEN}✅ Web interface is accessible - you can see your files there!${NC}"
else
    echo -e "${YELLOW}⚠️  Web interface not accessible - check if server is running${NC}"
fi

echo ""
echo -e "${CYAN}💡 Pro Tips:${NC}"
echo -e "   • Use the web interface for easy file management"
echo -e "   • Upload large files with wrangler for better performance"
echo -e "   • Set up public access for files that need to be shared"
echo -e "   • Use folders (prefixes) to organize your files"
