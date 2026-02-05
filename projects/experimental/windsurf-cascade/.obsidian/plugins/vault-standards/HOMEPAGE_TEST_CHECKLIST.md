# Homepage Setup Test Checklist

## ✅ Installation Verification

### 1. Plugin Installation
- [ ] Homepage plugin by deathau installed
- [ ] Plugin is enabled in Community Plugins
- [ ] Plugin appears in Settings menu

### 2. Configuration Import
- [ ] Open Settings → Homepage
- [ ] Click "Import settings from JSON"
- [ ] Copy contents from `homepage-config.json`
- [ ] Successfully imported without errors
- [ ] Multiple homepages visible in configuration

### 3. File Structure
- [ ] `Templates/Homepages/` folder created in vault
- [ ] All template files copied to vault:
  - [ ] `Dashboard-Template.md`
  - [ ] `Mobile-Dashboard-Template.md`
  - [ ] `Work-Dashboard-Template.md`
  - [ ] `Personal-Dashboard-Template.md`
  - [ ] `Weekly-Review.md`
- [ ] Dashboard files created:
  - [ ] `00 - Dashboard.md`
  - [ ] `00 - Mobile-Dashboard.md`
  - [ ] `00 - Work-Dashboard.md`
  - [ ] `00 - Personal-Dashboard.md`
  - [ ] `01 - Projects/Project-Index.md`

## 🧪 Functionality Testing

### 4. Command Palette Testing
Press **Ctrl/Cmd + P** and test these commands:
- [ ] `Homepage: Open Main Homepage` - Should open `00 - Dashboard.md`
- [ ] `Homepage: Open Daily Dashboard` - Should open `00 - Dashboard.md`
- [ ] `Homepage: Open Weekly Review` - Should open `Templates/Weekly-Review.md`
- [ ] `Homepage: Open Project Overview` - Should open `01 - Projects/Project-Index.md`
- [ ] `Homepage: Open Work Hours` - Should open `00 - Work-Dashboard.md`
- [ ] `Homepage: Open Weekend` - Should open `00 - Personal-Dashboard.md`

### 5. Startup Behavior
- [ ] Close and reopen Obsidian
- [ ] Main homepage (`00 - Dashboard.md`) opens automatically
- [ ] Dashboard replaces all open notes (as configured)
- [ ] Dataview queries attempt to load (may show "No results" initially)

### 6. Mobile Testing
- [ ] Enable "Separate mobile" in Homepage settings
- [ ] Test on mobile device or mobile view
- [ ] Mobile dashboard (`00 - Mobile-Dashboard.md`) loads correctly
- [ ] Mobile interface is simplified and optimized

### 7. Dataview Integration
- [ ] Install and enable Dataview plugin
- [ ] Dataview queries in dashboards execute without errors
- [ ] Query results update when files are added/modified
- [ ] Auto-refresh works (5-minute intervals)

### 8. Command Execution
- [ ] Commands run from dashboard buttons
- [ ] "Refresh Dataview" command updates queries
- [ ] "Open Daily Note" command works (if Daily Notes plugin installed)
- [ ] Custom commands execute without errors

## 🔧 Advanced Testing

### 9. Time-Based Activation
- [ ] Work dashboard activates during business hours (9-5, Mon-Fri)
- [ ] Personal dashboard activates on weekends
- [ ] Time-based switching works correctly
- [ ] Manual override still possible

### 10. Context Switching
- [ ] Switching between homepages works smoothly
- [ ] Open notes are preserved when configured
- [ ] View modes apply correctly (reading vs editing)
- [ ] Pin functionality works

### 11. Performance
- [ ] Dashboards load quickly
- [ ] Dataview queries don't slow down vault
- [ ] Auto-refresh doesn't impact performance
- [ ] Mobile version loads faster than desktop

### 12. Integration Testing
- [ ] Works with other plugins (Tasks, Calendar, etc.)
- [ ] Links between dashboards work correctly
- [ ] Templates are accessible from new note creation
- [ ] Backlinks to dashboards function properly

## 🐛 Troubleshooting Common Issues

### Dashboard Not Appearing
1. Check plugin is enabled
2. Verify file paths in configuration
3. Ensure dashboard files exist
4. Check for syntax errors in configuration JSON

### Dataview Queries Not Working
1. Install Dataview plugin
2. Enable Dataview in Community Plugins
3. Check query syntax
4. Verify folder paths match your vault structure

### Mobile Dashboard Not Loading
1. Enable "Separate mobile" option
2. Check mobile-specific file path
3. Ensure mobile template exists
4. Test on actual mobile device

### Time-Based Rules Not Working
1. Verify system time is correct
2. Check weekday numbers (0=Sunday, 6=Saturday)
3. Ensure time format is HH:MM
4. Test manual switching first

## ✅ Success Criteria

Your homepage setup is successful when:

- ✅ All commands in command palette work
- ✅ Main dashboard opens on Obsidian startup
- ✅ Dataview queries display your actual data
- ✅ Mobile dashboard works on mobile devices
- ✅ Time-based switching activates correctly
- ✅ All dashboards can be accessed manually
- ✅ Template system is functional
- ✅ Integration with other plugins works

## 🎉 Next Steps

Once everything is working:

1. **Customize templates** to match your specific workflow
2. **Add custom commands** for your frequently used actions
3. **Adjust time-based rules** for your schedule
4. **Create additional dashboards** for specific contexts
5. **Set up backup** of your configuration
6. **Document your customizations** for future reference

---

**Configuration Version**: 1.0 | **Last Updated**: 2024-01-15

*Run through this checklist after completing the setup to ensure everything works correctly.*
