# Homepage Plugin Setup Guide

## Overview

This enhanced homepage configuration provides a systematic, context-aware dashboard experience that integrates seamlessly with your vault standards and workflow consistency goals.

## 🚀 Quick Installation

### 1. Install Homepage Plugin
1. Go to **Settings → Community Plugins → Browse**
2. Search for **"Homepage"** by deathau
3. Install and enable the plugin

### 2. Import Configuration
1. Copy the contents of `homepage-config.json`
2. Go to **Settings → Homepage**
3. Click **"Import settings from JSON"**
4. Paste the configuration and save

### 3. Create Template Folder Structure
```
Templates/
├── Homepages/
│   ├── Dashboard-Template.md
│   ├── Mobile-Dashboard-Template.md
│   ├── Work-Dashboard-Template.md
│   └── Personal-Dashboard-Template.md
└── Weekly-Review.md
```

## 📋 Configuration Features

### Multiple Contextual Homepages

| Homepage | Purpose | Auto-Creation | Mobile Support |
|----------|---------|---------------|----------------|
| **Main Homepage** | Primary dashboard | ✅ | ✅ Separate mobile |
| **Daily Dashboard** | Quick daily overview | ✅ | ✅ |
| **Weekly Review** | Structured weekly review | ❌ | ✅ |
| **Project Overview** | Project management hub | ✅ | ✅ |
| **Work Hours** | Work-focused dashboard | ✅ | ❌ |
| **Weekend** | Personal time dashboard | ✅ | ❌ |

### Smart Features

- **🕒 Time-based activation**: Different homepages for work hours vs. weekends
- **📱 Mobile optimization**: Separate mobile dashboard with simplified interface
- **🔄 Auto-refresh**: Dataview queries update automatically every 5 minutes
- **🎯 Context awareness**: System detects time and day for appropriate homepage
- **📊 Analytics integration**: Built-in metrics and progress tracking
- **🔗 Quick navigation**: Consistent navigation structure across all dashboards

## 🛠️ Customization Guide

### Adding New Homepages

1. **Create Template**: Add new template to `Templates/Homepages/`
2. **Update Config**: Add entry to `homepage-config.json`:

```json
"Custom Homepage": {
  "value": "path/to/your/file",
  "kind": "File",
  "openOnStartup": false,
  "autoCreate": true,
  "commands": [
    {
      "id": "your-command-id",
      "name": "Command Name"
    }
  ]
}
```

### Modifying Time-Based Rules

Edit the `conditions` section in the configuration:

```json
"conditions": {
  "timeRange": {
    "start": "09:00",
    "end": "17:00", 
    "weekdays": [1, 2, 3, 4, 5]  // Mon-Fri
  }
}
```

### Customizing Dataview Queries

Each dashboard template contains Dataview queries. Modify them to match your vault structure:

- Change folder paths in `FROM` clauses
- Adjust field names in `TABLE` definitions
- Modify filtering criteria in `WHERE` clauses
- Update sorting in `SORT` clauses

## 📁 Folder Structure Requirements

### Required Folders
```
00 - Dashboard.md          # Main dashboard file
01 - Projects/
│   └── Project-Index.md   # Project overview
02 - Areas/                # Areas of responsibility
03 - Knowledge/            # Knowledge base
Templates/
└── Homepages/             # Dashboard templates
```

### Optional Folders
```
00 - Mobile-Dashboard.md   # Mobile-specific dashboard
00 - Work-Dashboard.md     # Work-specific dashboard  
00 - Personal-Dashboard.md # Personal/weekend dashboard
```

## 🔧 Command Integration

### Built-in Commands
- **Refresh Dataview**: Updates all dashboard queries
- **Open Daily Note**: Quick access to today's note
- **Open Calendar**: Launch calendar view
- **Reset Daily Planner**: Clear daily progress

### Adding Custom Commands
1. Find command IDs in **Settings → Command Palette**
2. Add to homepage configuration:
```json
"commands": [
  {
    "id": "your-plugin:command-name",
    "name": "Display Name"
  }
]
```

## 📊 Dashboard Metrics

### Automatic Tracking
- Tasks completed today
- Notes created this week  
- Active projects count
- Recent activity summary
- Learning progress

### Custom Metrics
Add custom Dataview queries to track:
- Habit completion rates
- Project milestones
- Learning goals progress
- Health and wellness metrics

## 🔄 Backup and Sync

### Configuration Backup
- Settings are automatically backed up
- Templates are version controlled
- Cross-device synchronization enabled

### Manual Backup
```bash
# Export current settings
cp .obsidian/plugins/homepage/data.json homepage-backup-$(date +%Y%m%d).json
```

## 🐛 Troubleshooting

### Common Issues

**Dashboard not appearing**
1. Check plugin is enabled
2. Verify file paths in configuration
3. Ensure templates exist in correct folders

**Dataview queries not working**
1. Install and enable Dataview plugin
2. Check query syntax for typos
3. Verify folder paths match your vault

**Mobile dashboard not loading**
1. Enable "Separate mobile" in settings
2. Check mobile-specific file path
3. Ensure mobile template exists

**Time-based rules not activating**
1. Verify system time is correct
2. Check weekday numbers (0=Sunday, 6=Saturday)
3. Ensure time format is HH:MM

### Debug Mode

Enable debug logging in **Settings → Homepage → Advanced**:
- Track homepage activation
- Monitor command execution
- View template loading status

## 🎯 Best Practices

### Consistency Standards
1. **Naming Convention**: Use `## - Name` format for dashboard files
2. **Metadata Standards**: Include required tags and properties
3. **Template Versioning**: Update version numbers when making changes
4. **Regular Reviews**: Use weekly review template consistently

### Performance Optimization
1. **Limit Query Results**: Use `LIMIT` in Dataview queries
2. **Optimize Filters**: Specific `WHERE` clauses improve performance  
3. **Refresh Intervals**: Balance freshness vs. performance
4. **File Organization**: Keep dashboard files in dedicated folders

### Workflow Integration
1. **Daily Rituals**: Start each day with dashboard review
2. **Weekly Reviews**: Use structured weekly review template
3. **Project Tracking**: Link project updates to dashboard
4. **Goal Alignment**: Connect daily tasks to weekly goals

## 📚 Advanced Features

### Conditional Homepages
Create context-aware dashboards based on:
- Time of day
- Day of week  
- Vault properties
- Custom conditions

### Dynamic Templates
Use template variables for:
- Current date/time
- User preferences
- Vault statistics
- External data sources

### Integration with Other Plugins
- **Tasks Plugin**: Enhanced task management
- **Calendar Plugin**: Visual calendar integration
- **Kanban Plugin**: Project board views
- **Tracker Plugin**: Habit and goal tracking

---

## 🎉 Getting Started

1. **Install the Homepage plugin**
2. **Import the configuration** from `homepage-config.json`
3. **Create the template folder structure**
4. **Copy template files** to appropriate locations
5. **Test each homepage** using the command palette
6. **Customize queries** to match your vault structure
7. **Set up daily rituals** using the dashboard

Your enhanced homepage system is now ready to provide a consistent, context-aware vault experience!
