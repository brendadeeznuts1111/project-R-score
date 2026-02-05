#!/bin/bash

# Project Update Script
# Scans for outdated projects and updates them

echo "🔄 Project Update Script"
echo "======================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Check if projects directory exists
if [ ! -d "projects" ]; then
    echo -e "${RED}❌ Projects directory not found${NC}"
    exit 1
fi

# Check if there are any projects
project_count=$(find projects/ -maxdepth 1 -type d | wc -l)
if [ $project_count -le 1 ]; then
    echo -e "${YELLOW}⚠️  No projects found in projects/ directory${NC}"
    exit 0
fi

echo -e "${BLUE}📦 Scanning projects for updates...${NC}"

# Function to check if a project needs updates
check_project_updates() {
    local project_dir="$1"
    local project_name=$(basename "$project_dir")
    
    if [ ! -f "$project_dir/package.json" ]; then
        return 1
    fi
    
    # Check for outdated dependencies
    cd "$project_dir"
    outdated=$(bun pm outdated 2>/dev/null | grep -c "UPDATE" || echo "0")
    cd - > /dev/null
    
    if [ "$outdated" -gt 0 ]; then
        echo "UPDATE $project_name"
        return 0
    fi
    
    return 1
}

# Function to update a project
update_project() {
    local project_dir="$1"
    local project_name=$(basename "$project_dir")
    
    echo -e "${YELLOW}🔄 Updating $project_name...${NC}"
    
    cd "$project_dir"
    
    # Update dependencies
    if bun pm update; then
        echo -e "${GREEN}✅ $project_name updated successfully${NC}"
        cd - > /dev/null
        return 0
    else
        echo -e "${RED}❌ Failed to update $project_name${NC}"
        cd - > /dev/null
        return 1
    fi
}

# Main execution
updated_count=0
failed_count=0

# Scan all projects
echo ""
echo -e "${BLUE}🔍 Scanning for outdated projects...${NC}"

for project_dir in projects/*/; do
    if [ -d "$project_dir" ] && [ -f "$project_dir/package.json" ]; then
        if check_project_updates "$project_dir"; then
            echo -e "${YELLOW}📦 Found outdated project: $(basename "$project_dir")${NC}"
            
            # Update the project
            if update_project "$project_dir"; then
                ((updated_count++))
            else
                ((failed_count++))
            fi
        fi
    fi
done

# Summary
echo ""
echo "=================================="
echo -e "${BLUE}📊 Update Summary:${NC}"
echo -e "   ${GREEN}✅ Updated: $updated_count projects${NC}"
echo -e "   ${RED}❌ Failed: $failed_count projects${NC}"

if [ $updated_count -gt 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 Project updates completed successfully!${NC}"
fi

if [ $failed_count -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Some projects failed to update. Check the logs above.${NC}"
fi

echo ""
echo -e "${BLUE}🚀 Script completed!${NC}"
