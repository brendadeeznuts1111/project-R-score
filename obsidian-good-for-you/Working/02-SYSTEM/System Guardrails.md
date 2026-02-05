# 🛡️ **System Guardrails & Organization Rules**

> [!IMPORTANT] **🚨 CRITICAL**: Follow these rules to maintain system integrity and performance.

## 📋 **Core Organization Principles**

### **🎯 File Naming Convention**
- **NO SPACES** - Use hyphens (-) or underscores (_)
- **Consistent prefixes** - Use numbers for ordering (01-, 02-, 03-)
- **Descriptive names** - Clear, concise, and meaningful
- **Lowercase preferred** - Except for proper nouns

### **📁 Folder Structure Rules**
```
Working/
├── 00-MAP-OF-CONTENT.md          # Main navigation (ALWAYS keep at root)
├── Welcome.md                    # Homepage (ALWAYS keep at root)
├── 01-AREAS/                     # Core knowledge domains
├── 02-SYSTEM/                    # Templates, guides, configuration
├── 03-REVIEWS/                   # Review and analytics
├── .obsidian/                    # Obsidian config (NEVER modify manually)
└── .smart-env/                   # Environment config (NEVER modify manually)
```

---

## 🚫 **RESTRICTED ACTIONS**

### **❌ NEVER DO These Things**
- [ ] **Create files at root level** (except Welcome.md and 00-MAP-OF-CONTENT.md)
- [ ] **Use spaces in file names** - breaks links and compatibility
- [ ] **Delete system files** - 00-MAP-OF-CONTENT.md, Welcome.md, or templates
- [ ] **Modify .obsidian folder** - use Obsidian settings instead
- [ ] **Create duplicate folders** - use existing structure
- [ ] **Move files between domains** - breaks internal links

### **⚠️ HIGH RISK ACTIONS**
- [ ] **Rename existing files** - updates all links first
- [ ] **Delete templates** - breaks system functionality
- [ ] **Modify core navigation** - updates all references

---

## ✅ **APPROVED ACTIONS**

### **🎯 SAFE TO DO**
- [x] **Create content in appropriate folders**
- [x] **Use templates for new notes**
- [x] **Follow naming conventions**
- [x] **Link to existing content**
- [x] **Add new skills and projects**
- [x] **Create daily notes**

### **📁 WHERE TO CREATE CONTENT**

| Content Type | Location | Template |
|--------------|----------|----------|
| **Projects** | `01-AREAS/PROJECTS/` | [[02-SYSTEM/Templates/Project Template]] |
| **Skills** | `01-AREAS/SKILLS/` | [[02-SYSTEM/Templates/Skill Template]] |
| **Knowledge** | `01-AREAS/KNOWLEDGE/` | Standard format |
| **Life Goals** | `01-AREAS/LIFE/` | Standard format |
| **Daily Notes** | `03-REVIEWS/DAILY NOTES/` | [[02-SYSTEM/Templates/Daily Note Template]] |
| **Reviews** | `03-REVIEWS/` | Appropriate review template |

---

## 🔍 **QUALITY CHECKLIST**

### **Before Creating New Content**
- [ ] **Check if similar content exists**
- [ ] **Choose correct folder location**
- [ ] **Use appropriate template**
- [ ] **Follow naming conventions**
- [ ] **Link to related content**

### **After Creating Content**
- [ ] **Verify all links work**
- [ ] **Add proper tags and properties**
- [ ] **Update relevant dashboards**
- [ ] **Test navigation from homepage**

---

## 🚨 **TROUBLESHOOTING**

### **Common Issues & Solutions**

| Issue | Cause | Solution |
|-------|-------|----------|
| **Broken links** | File moved/renamed | Update all references |
| **Files not showing** | Wrong folder | Move to correct location |
| **Template not working** | Missing properties | Copy from master template |
| **Navigation broken** | Homepage links outdated | Update Welcome.md |

---

## 📊 **SYSTEM HEALTH MONITORING**

### **Weekly Maintenance Tasks**
- [ ] **Check for broken links** using graph view
- [ ] **Clean up unused files** (archive, don't delete)
- [ ] **Verify all templates work** correctly
- [ ] **Update system metrics** in dashboard

### **Monthly Reviews**
- [ ] **Audit folder structure** compliance
- [ ] **Review naming conventions** consistency
- [ ] **Update guardrails** based on usage
- [ ] **Backup critical system files**

---

## 🎯 **ESSENTIAL REMINDERS**

### **💡 Golden Rules**
1. **When in doubt, use templates**
2. **Always check existing structure first**
3. **Keep the root folder clean**
4. **Test links after changes**
5. **Document exceptions**

### **🔧 Emergency Procedures**
- **System broken?** → Restore from backup
- **Lost files?** → Check graph view for connections
- **Links not working?** → Verify file names match exactly
- **Template missing?** → Copy from 02-SYSTEM/Templates/

---

## 📞 **GETTING HELP**

### **Self-Service Resources**
- [[00-MAP-OF-CONTENT]] - Main navigation
- [[02-SYSTEM/Workflows]] - Process guides
- [[02-SYSTEM/Tags & Properties Guide]] - Organization help

### **System Status**
- **Version**: v2.0 Enhanced
- **Last Updated**: {{date}}
- **Health**: ✅ All systems operational

---

*🛡️ These guardrails ensure system integrity and optimal performance. Follow them strictly!*
