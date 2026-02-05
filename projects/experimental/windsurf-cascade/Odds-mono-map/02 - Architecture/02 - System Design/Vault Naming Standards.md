---
type: naming-standards
title: 📋 Vault Naming Standards & Conventions
version: "2.0.0"
category: standards
priority: high
status: active
tags:
  - naming-standards
  - conventions
  - file-organization
  - consistency
  - vault-standards
created: 2025-11-18T19:30:00Z
updated: 2025-11-18T19:30:00Z
author: system
template_version: "2.0.0"
validation_rules:
  - required-frontmatter
  - naming-structure
  - convention-consistency
  - standard-validation
---

# 📋 Vault Naming Standards & Conventions

> **Complete guide to consistent naming patterns and organizational standards for the Odds Protocol vault**

---

## 🎯 Overview & Philosophy

### **Naming Principles**
1. **Consistency First** - Same patterns across all content types
2. **Clarity & Readability** - Names should be self-explanatory
3. **Scalability** - Patterns that work for small and large vaults
4. **Searchability** - Easy to find content through naming
5. **Automation Friendly** - Compatible with automation scripts

### **Benefits of Standards**
- **Improved Navigation**: Intuitive file location and naming
- **Better Search**: Predictable naming enhances searchability
- **Automation**: Scripts can reliably parse and process files
- **Collaboration**: Team members understand organization instantly
- **Maintenance**: Easier to organize and maintain content

---

## 📁 Directory Naming Standards

### **Primary Directory Structure**
```
## - Directory Name/
```

**Pattern Rules**:
- **Numeric Prefix**: `## - ` (two digits, space, hyphen, space)
- **Descriptive Name**: PascalCase with spaces
- **Trailing Slash**: Always end with `/`
- **Ordering**: Use sequential numbers for logical ordering

### **Standard Directories**
| Number | Directory | Purpose | Content Types |
|--------|-----------|---------|---------------|
| 00 | 00 - Dashboard/ | Main vault overview | Dashboards, overviews |
| 01 | 01 - Daily Notes/ | Time-based content | Daily notes, journals |
| 02 | 02 - Architecture/ | System architecture | Design docs, specifications |
| 03 | 03 - Development/ | Development content | Code, testing, tools |
| 04 | 04 - Documentation/ | User docs | Guides, manuals |
| 05 | 05 - Assets/ | Media files | Images, diagrams |
| 06 | 06 - Templates/ | Template library | All templates |
| 07 | 07 - Archive/ | Archived content | Completed projects |
| 08 | 08 - Logs/ | System logs | Activity logs |
| 09 | 09 - Testing/ | Test documentation | Test results |
| 10 | 10 - Benchmarking/ | Performance data | Metrics, benchmarks |
| 11 | 11 - Workshop/ | Interactive content | Tutorials, exercises |

---

### **Subdirectory Standards**
```
subdirectory-name/
```

**Pattern Rules**:
- **Lowercase**: All lowercase letters
- **Hyphen Separated**: Use hyphens instead of spaces
- **Descriptive**: Clear indication of content
- **No Numbers**: Avoid numeric prefixes in subdirectories

**Examples**:
```
01 - Daily Notes/
├── 01 - reports/
├── 02 - journals/
└── 03 - actions/

02 - Architecture/
├── 01 - data-models/
├── 02 - system-design/
└── 03 - patterns/
```

---

## 📄 File Naming Standards

### **Daily Notes**
```
YYYY-MM-DD.md
```

**Examples**:
- `2025-11-18.md`
- `2025-12-25.md`
- `2026-01-01.md`

**Rules**:
- **ISO 8601 Format**: Year-Month-Day
- **No Spaces**: Use hyphens only
- **.md Extension**: Always include markdown extension
- **Date Validity**: Must be valid calendar dates

---

### **Project Files**
```
## - Project Name.md
```

**Examples**:
- `00 - Enhanced Dashboard.md`
- `01 - API Gateway.md`
- `02 - User Authentication.md`

**Rules**:
- **Numeric Prefix**: Two digits for ordering
- **Space Hyphen Space**: `## - ` pattern
- **PascalCase**: Project name in PascalCase with spaces
- **Descriptive**: Clear project identification
- **.md Extension**: Always include markdown extension

---

### **Template Files**
```
## - Template Type.md
```

**Examples**:
- `00 - Enhanced Daily Note.md`
- `01 - Enhanced Project.md`
- `02 - Enhanced Meeting.md`

**Rules**:
- **Numeric Prefix**: Two digits for ordering
- **Space Hyphen Space**: `## - ` pattern
- **Descriptive Type**: Clear template purpose
- **Enhanced Prefix**: Use "Enhanced" for improved versions
- **.md Extension**: Always include markdown extension

---

### **Documentation Files**
```
Descriptive-Name.md
```

**Examples**:
- `API-Reference-Guide.md`
- `User-Onboarding-Manual.md`
- `System-Architecture-Overview.md`

**Rules**:
- **PascalCase with Hyphens**: Capitalize words, separate with hyphens
- **Descriptive**: Clear content indication
- **No Numbers**: Avoid numeric prefixes
- **.md Extension**: Always include markdown extension

---

### **Meeting Files**
```
YYYY-MM-DD - Meeting Type - Topic.md
```

**Examples**:
- `2025-11-18 - Standup - Team Sync.md`
- `2025-11-20 - Planning - Sprint Review.md`
- `2025-11-25 - Review - Architecture Discussion.md`

**Rules**:
- **Date Prefix**: ISO 8601 date
- **Space Hyphen Space**: ` - ` separator
- **Meeting Type**: Standup, Planning, Review, etc.
- **Topic**: Specific meeting topic
- **.md Extension**: Always include markdown extension

---

### **Research Files**
```
YYYY-MM-DD - Research - Topic.md
```

**Examples**:
- `2025-11-18 - Research - Machine Learning Study.md`
- `2025-11-20 - Research - User Behavior Analysis.md`
- `2025-11-25 - Research - Performance Optimization.md`

**Rules**:
- **Date Prefix**: ISO 8601 date
- **Space Hyphen Space**: ` - ` separator
- **Research Prefix**: Always include "Research"
- **Topic**: Specific research topic
- **.md Extension**: Always include markdown extension

---

## 🏷️ Tagging Standards

### **Tag Format**
```
#primary-tag #secondary-tag #contextual-tag
```

**Tag Categories**:

#### **Content Type Tags**
- `#daily-note` - Daily journal entries
- `#project` - Project documentation
- `#meeting` - Meeting documentation
- `#research` - Research documentation
- `#template` - Template files
- `#documentation` - General documentation

#### **Status Tags**
- `#active` - Currently active content
- `#archived` - Archived content
- `#draft` - Draft content
- `#completed` - Completed items
- `#in-progress` - Work in progress

#### **Priority Tags**
- `#high` - High priority
- `#medium` - Medium priority
- `#low` - Low priority
- `#urgent` - Urgent items

#### **Domain Tags**
- `#development` - Development related
- `#architecture` - System architecture
- `#design` - Design and UX
- `#testing` - Testing and QA
- `#documentation` - Documentation

#### **Temporal Tags**
- `#YYYY-MM-DD` - Specific dates
- `#YYYY-MM` - Specific months
- `#YYYY` - Specific years
- `#Q1`, `#Q2`, `#Q3`, `#Q4` - Quarters

---

### **Tagging Best Practices**
1. **Be Specific**: Use descriptive tags
2. **Be Consistent**: Same tags for similar content
3. **Use Hierarchies**: Broad to specific tag order
4. **Limit Quantity**: 3-7 tags per file
5. **Standard Categories**: Use predefined categories

---

## 📝 Frontmatter Standards

### **Required Fields**
```yaml
---
type: content-type
title: 🎯 Descriptive Title
version: "2.0.0"
category: content-category
priority: high|medium|low
status: active|archived|draft
tags:
  - primary-tag
  - secondary-tag
  - contextual-tag
created: YYYY-MM-DDTHH:mm:ssZ
updated: YYYY-MM-DDTHH:mm:ssZ
author: author-name
template_version: "2.0.0"
validation_rules:
  - rule-1
  - rule-2
---
```

### **Field Standards**
- **type**: Content type (lowercase, hyphen-separated)
- **title**: Descriptive title with emoji
- **version**: Semantic versioning in quotes
- **category**: Content category (lowercase)
- **priority**: One of: high, medium, low
- **status**: One of: active, archived, draft
- **tags**: Array of tags (lowercase, hyphen-separated)
- **created**: ISO 8601 timestamp with Z timezone
- **updated**: ISO 8601 timestamp with Z timezone
- **author**: Author name (lowercase, hyphen-separated)
- **template_version**: Template semantic version
- **validation_rules**: Array of validation rule names

---

## 🔗 Linking Standards

### **Internal Links**
```markdown
[[File Name]]                    # Basic link
[[File Name|Display Text]]       # Link with custom text
[[Directory/File Name]]          # Link to file in directory
[[#Section Header]]              # Link to section
[[File Name#Section Header]]     # Link to section in file
```

### **Link Formatting Rules**
1. **Use Exact File Names**: Match file names exactly
2. **Include Spaces**: Preserve spaces in file names
3. **Use Display Text**: For clarity when needed
4. **Section Links**: Use `#` for section headers
5. **Directory Links**: Include full path for files in subdirectories

---

### **External Links**
```markdown
[Link Text](URL)                  # Basic external link
[Link Text](URL "Hover Text")     # With hover text
<URL>                            # Bare URL
```

**External Link Standards**:
- **Use Descriptive Text**: Don't just show URLs
- **Include HTTPS**: Use https:// when available
- **Check Validity**: Ensure links work
- **Add Context**: Explain what the link contains

---

## 📊 File Organization Patterns

### **Project Structure**
```
02 - Architecture/
├── 00 - Project Name.md
├── 01 - System Design.md
├── 02 - Data Models.md
└── 03 - Integration Patterns.md

03 - Development/
├── 00 - Project Name Development.md
├── 01 - Implementation Guide.md
├── 02 - Test Suite.md
└── 03 - Deployment Guide.md

04 - Documentation/
├── 00 - Project Name Documentation.md
├── 01 - User Guide.md
└── 02 - API Reference.md
```

### **Daily Notes Structure**
```
01 - Daily Notes/
├── 2025-11-18.md
├── 2025-11-19.md
├── 2025-11-20.md
└── 01 - reports/
    ├── 2025-11-18 - Weekly Report.md
    └── 2025-11-25 - Monthly Report.md
```

### **Meeting Structure**
```
01 - Daily Notes/
├── 02 - journals/
│   ├── 2025-11-18 - Standup - Team Sync.md
│   ├── 2025-11-20 - Planning - Sprint Review.md
│   └── 2025-11-25 - Review - Architecture Discussion.md
└── 03 - actions/
    ├── 2025-11-18 - Action Items.md
    └── 2025-11-25 - Follow-up Tasks.md
```

---

## 🛠️ Automation Integration

### **Script-Friendly Naming**
All naming patterns are designed to work with automation scripts:

```bash
# Extract date from daily note
date=$(basename "$file" .md)

# Get project number from project file
project_num=$(echo "$file" | grep -o '^[0-9]\{2\}')

# Find templates
find . -name "## - *.md" -path "*/06 - Templates/*"

# Validate naming patterns
validate_filename() {
    local file="$1"
    # Pattern validation logic
}
```

### **Validation Rules**
```yaml
validation_rules:
  - filename-format
  - directory-structure
  - frontmatter-completeness
  - tag-consistency
  - link-validity
```

---

## 📋 Quality Checklist

### **File Naming Checklist**
- [ ] Follows correct pattern for content type
- [ ] Uses proper case conventions
- [ ] Includes appropriate extensions
- [ ] No special characters except hyphens
- [ ] Descriptive and meaningful

### **Directory Structure Checklist**
- [ ] Uses numeric prefix pattern
- [ ] Follows hierarchy standards
- [ ] Consistent subdirectory naming
- [ ] Logical organization
- [ ] Proper trailing slashes

### **Tagging Checklist**
- [ ] Uses standard tag categories
- [ ] Consistent tag formatting
- [ ] Appropriate number of tags
- [ ] Relevant to content
- [ ] Follows naming conventions

### **Frontmatter Checklist**
- [ ] All required fields present
- [ ] Proper field formatting
- [ ] Valid date formats
- [ ] Consistent version numbers
- [ ] Appropriate validation rules

---

## 🔍 Common Naming Mistakes

### **File Naming Errors**
❌ `my file.md` → ✅ `My-File.md`  
❌ `file.txt` → ✅ `File.md`  
❌ `01_file.md` → ✅ `01 - File.md`  
❌ `File (1).md` → ✅ `File-Version-1.md`  

### **Directory Naming Errors**
❌ `my folder/` → ✅ `my-folder/`  
❌ `Folder/` → ✅ `01 - Folder/`  
❌ `folder_name/` → ✅ `folder-name/`  
❌ `FOLDER/` → ✅ `folder/`  

### **Tagging Errors**
❌ `#MyTag` → ✅ `#my-tag`  
❌ `#tag_with_underscores` → ✅ `#tag-with-hyphens`  
❌ `#tagwithspaces` → ✅ `#tag-with-spaces`  
❌ `#TOOMANYTAGS` → ✅ `#focused-tagging`  

---

## 🚀 Implementation Guide

### **Phase 1: Assessment (Week 1)**
- [ ] Audit existing file names
- [ ] Identify naming violations
- [ ] Create renaming plan
- [ ] Backup current structure

### **Phase 2: Renaming (Week 2)**
- [ ] Rename directories first
- [ ] Update internal links
- [ ] Rename files systematically
- [ ] Validate links after renaming

### **Phase 3: Validation (Week 3)**
- [ ] Run validation scripts
- [ ] Fix remaining issues
- [ ] Update automation scripts
- [ ] Document any exceptions

### **Phase 4: Maintenance (Ongoing)**
- [ ] Set up automated validation
- [ ] Create naming guidelines
- [ ] Train team members
- [ ] Monitor compliance

---

## 🏷️ Tags and Categories

`#naming-standards` `#conventions` `#file-organization` `#consistency` `#vault-standards` `#best-practices` `#automation`

---

## 🔗 Quick Links

- **[[VAULT_ORGANIZATION_GUIDE]]** - Complete structure guide
- **[[TEMPLATE_MASTER_INDEX]]** - Template naming conventions
- **[[VAULT_SCAFFOLDING_GUIDE]]** - Automation and setup
- **[[QUICK_START_GUIDE]]** - Getting started with standards

---

## 📋 Template Metadata

**Template Version**: 2.0.0  
**Created**: 2025-11-18T19:30:00Z  
**Updated**: 2025-11-18T19:30:00Z  
**Author**: system  
**Validation**: ✅ Passed  
**Processing Time**: <50ms  

---

*These naming standards ensure consistency, searchability, and automation compatibility across your entire vault. Following these patterns will make your knowledge base more maintainable and user-friendly.*
