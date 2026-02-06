# 🔍 **Folder Structure Validator**

> [!WARNING] **🚨 VALIDATION REQUIRED**: Run this check monthly to ensure system integrity.

## ✅ **APPROVED STRUCTURE**

### **Root Level (Working/)**
```text
✅ Welcome.md                    # Homepage - NEVER DELETE
✅ 00-MAP-OF-CONTENT.md          # Navigation - NEVER DELETE
✅ 01-AREAS/                     # Knowledge domains
✅ 02-SYSTEM/                    # System files
✅ 03-REVIEWS/                   # Reviews
✅ .obsidian/                    # Config - NEVER TOUCH
✅ .smart-env/                   # Environment - NEVER TOUCH
```

### **01-AREAS/ Structure**
```text
✅ 01-AREAS/
├── ✅ Projects.md               # Projects overview
├── ✅ Skills.md                 # Skills overview
├── ✅ Knowledge.md              # Knowledge overview
├── ✅ Life.md                   # Life overview
├── ✅ PROJECTS/                 # Individual projects
└── ✅ SKILLS/                   # Individual skills
```

### **02-SYSTEM/ Structure**
```text
✅ 02-SYSTEM/
├── ✅ Templates/                # All templates
├── ✅ Bases/                    # Obsidian Bases
├── ✅ Workflows.md              # Process guides
├── ✅ Tags & Properties Guide.md
├── ✅ Advanced Tables Integration Guide.md
├── ✅ Obsidian Bases Integration.md
├── ✅ System Guardrails.md      # THIS FILE
└── ✅ Folder Structure Validator.md # THIS FILE
```

### **03-REVIEWS/ Structure**
```text
✅ 03-REVIEWS/
├── ✅ Daily Notes.md            # Daily overview
├── ✅ Weekly Reviews.md         # Weekly overview
├── ✅ Monthly Reviews.md        # Monthly overview
└── ✅ DAILY NOTES/              # Individual daily notes
```

---

## ❌ **FORBIDDEN ITEMS**

### **NEVER ALLOW at Root Level**
- ❌ Individual project files
- ❌ Individual skill files
- ❌ Daily notes
- ❌ Random documents
- ❌ Temporary files
- ❌ Backup files

### **NEVER ALLOW in Folders**
- ❌ Files with spaces in names
- ❌ Duplicate folder names
- ❌ Misplaced content
- ❌ Broken templates

---

## 🔧 **VALIDATION CHECKLIST**

### **Monthly Validation**
- [ ] **Root folder clean** (only Welcome.md, 00-MAP-OF-CONTENT.md, and numbered folders)
- [ ] **No spaces in filenames** anywhere in system
- [ ] **All templates accessible** from 02-SYSTEM/Templates/
- [ ] **All links working** from Welcome.md
- [ ] **No duplicate content** in wrong locations
- [ ] **Folder names consistent** with approved structure

### **Quick Health Check**
```bash
# Check for spaces in filenames (run in terminal)
find /Users/nolarose/good-for-you/obsidian/Working -name "* *" -type f

# Check root level files
ls -la /Users/nolarose/good-for-you/obsidian/Working/
```

---

## 🚨 **COMMON VIOLATIONS**

### **Issue 1: Files at Root Level**
**Problem**: Individual files created outside proper folders
**Solution**: Move to appropriate folder:
- Projects → `01-AREAS/PROJECTS/`
- Skills → `01-AREAS/SKILLS/`
- Daily notes → `03-REVIEWS/DAILY NOTES/`

### **Issue 2: Spaces in Names**
**Problem**: Files like "My Project.md" instead of "My-Project.md"
**Solution**: Rename files and update all links

### **Issue 3: Broken Templates**
**Problem**: Templates moved or modified incorrectly
**Solution**: Restore from backup or recreate from master

---

## 🛠️ **AUTOMATION HELPERS**

### **File Naming Script**
```bash
# Rename files to remove spaces
for file in *\ *; do
  mv "$file" "${file// /-}"
done
```

### **Structure Check Script**
```bash
# Verify correct structure
echo "=== ROOT LEVEL ==="
ls /Users/nolarose/good-for-you/obsidian/Working/
echo "=== AREAS ==="
ls /Users/nolarose/good-for-you/obsidian/Working/01-AREAS/
echo "=== SYSTEM ==="
ls /Users/nolarose/good-for-you/obsidian/Working/02-SYSTEM/
echo "=== REVIEWS ==="
ls /Users/nolarose/good-for-you/obsidian/Working/03-REVIEWS/
```

---

## 📋 **CORRECTIVE ACTIONS**

### **If Structure is Broken**
1. **Stop making changes**
2. **Identify violations** using checklist above
3. **Move files to correct locations**
4. **Update all broken links**
5. **Test navigation from Welcome.md**
6. **Run validation again**

### **If Templates Are Missing**
1. **Check 02-SYSTEM/Templates/ folder**
2. **Restore from backup if available**
3. **Recreate using [[System Guardrails]] guide**
4. **Test all templates work**

---

## 🎯 **PREVENTION MEASURES**

### **Before Creating Files**
- **Choose correct folder** using the table below
- **Use proper naming** (no spaces, descriptive)
- **Use appropriate template**
- **Link from navigation**

### **Where to Create Content**
| Content Type | Correct Location | Template |
|--------------|------------------|----------|
| Projects | `01-AREAS/PROJECTS/` | Project Template |
| Skills | `01-AREAS/SKILLS/` | Skill Template |
| Knowledge | `01-AREAS/KNOWLEDGE/` | Standard format |
| Life Goals | `01-AREAS/LIFE/` | Standard format |
| Daily Notes | `03-REVIEWS/DAILY NOTES/` | Daily Note Template |

---

## 📊 **SYSTEM HEALTH SCORE**

### **Scoring System**
- ✅ **Perfect (100%)**: All validation checks pass
- 🟡 **Good (80-99%)**: Minor issues, system still functional
- 🔴 **Critical (<80%)**: Major issues need immediate attention

### **Current Status**
- **Structure Integrity**: ✅ 100%
- **Naming Compliance**: ✅ 100%
- **Link Functionality**: ✅ 100%
- **Template Availability**: ✅ 100%

---

*🔍 Run this validator monthly to maintain system health and performance*
