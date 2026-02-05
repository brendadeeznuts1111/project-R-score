# 🎹 ShortcutRegistry Web Manager

A beautiful, modern web-based interface for managing your keyboard shortcuts with the ShortcutRegistry system.

## 🚀 Quick Start

```bash
# Start the web application
bun run web-app.ts

# Open in your browser
open http://localhost:8080
```

## ✨ Features

### 📊 **Dashboard**
- **Statistics Overview**: Total shortcuts, profiles, conflicts, and usage metrics
- **Quick Actions**: Fast access to common operations
- **Usage Charts**: Visual representation of shortcut usage patterns

### ⌨️ **Shortcuts Management**
- **Visual Editor**: Add, edit, and delete shortcuts with an intuitive form
- **Category Organization**: Group shortcuts by purpose (general, development, IDE, browser, etc.)
- **Cross-Platform Support**: Define different key combinations for macOS and Windows/Linux
- **Real-time Updates**: Changes reflect immediately in the interface

### 👤 **Profile Management**
- **Multiple Profiles**: Create different shortcut configurations for different workflows
- **Profile Switching**: Change active profiles with one click
- **Inheritance**: Base new profiles on existing ones
- **Custom Overrides**: Set profile-specific key combinations

### 🎬 **Macro System**
- **Sequence Builder**: Create automated shortcut sequences
- **Visual Editor**: Drag-and-drop macro creation interface
- **Timing Control**: Set delays between macro steps
- **Execution**: Run macros with a single keypress

### 📈 **Analytics & Insights**
- **Usage Statistics**: Track which shortcuts you use most
- **Performance Metrics**: Monitor system responsiveness
- **Interactive Charts**: Visualize usage patterns with Chart.js
- **Historical Data**: View usage trends over time

### ⚠️ **Conflict Detection**
- **Real-time Scanning**: Automatically detect conflicting shortcuts
- **Severity Levels**: High, medium, and low priority conflicts
- **Auto-Resolution**: Suggest fixes for conflicting key combinations
- **Visual Alerts**: Clear indicators for problematic shortcuts

## 🎨 **Modern UI/UX**

- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Dark/Light Themes**: Automatic theme detection and manual switching
- **Smooth Animations**: Polished transitions and micro-interactions
- **Accessibility**: Full keyboard navigation and screen reader support
- **Progressive Web App**: Installable as a standalone application

## 🔧 **Technical Features**

### **REST API Integration**
```javascript
// Get all shortcuts
fetch('/api/shortcuts')
  .then(r => r.json())
  .then(shortcuts => console.log(shortcuts));

// Create a new shortcut
fetch('/api/shortcuts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 'my.shortcut',
    action: 'custom-action',
    description: 'My Custom Shortcut',
    category: 'general',
    default: { primary: 'Ctrl+Shift+X' },
    enabled: true,
    scope: 'global'
  })
});
```

### **Database Seeding via HTTP**
```bash
# Seed with test data
curl -H "X-Seed-Data: true" -H "X-Seed-Mode: full" \
     http://localhost:8080/api/shortcuts
```

### **Real-time Updates**
- WebSocket connections for live updates
- Automatic UI refresh on data changes
- Conflict detection with instant feedback

## 📱 **Screenshots & Demo**

The web application includes:

1. **Dashboard**: Overview with statistics and quick actions
2. **Shortcuts Grid**: Visual cards showing all shortcuts
3. **Profile Manager**: Create and switch between profiles
4. **Macro Builder**: Step-by-step macro creation
5. **Analytics Dashboard**: Charts and usage statistics
6. **Conflict Resolver**: Identify and fix shortcut conflicts

## 🛠️ **Development**

### **Project Structure**
```
web-app.ts           # Main web server
src/
├── core/registry.ts    # Core shortcut management
├── database/          # SQLite database operations
├── api/server.ts      # REST API endpoints
└── macros/            # Build-time macro system
```

### **Key Technologies**
- **Bun**: Runtime and bundler with macros
- **SQLite**: Embedded database for persistence
- **Chart.js**: Interactive data visualizations
- **Vanilla JS**: No frameworks, pure web standards
- **CSS Grid/Flexbox**: Modern responsive layouts

### **API Endpoints**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/shortcuts` | List all shortcuts |
| POST | `/api/shortcuts` | Create new shortcut |
| GET | `/api/shortcuts/:id` | Get specific shortcut |
| DELETE | `/api/shortcuts/:id` | Delete shortcut |
| GET | `/api/profiles` | List all profiles |
| POST | `/api/profiles` | Create new profile |
| PUT | `/api/profiles/:id/active` | Set active profile |
| GET | `/api/conflicts` | Detect conflicts |
| GET | `/api/stats/usage` | Get usage statistics |

## 🎯 **Use Cases**

### **IDE Integration**
- VS Code extension for shortcut management
- IntelliJ IDEA plugin
- Custom editor integrations

### **Application Shortcuts**
- Browser extensions
- Desktop applications
- Mobile apps with keyboard shortcuts

### **Team Collaboration**
- Shared shortcut profiles
- Company-wide shortcut standards
- Training and onboarding tools

### **Accessibility Tools**
- Custom keyboard layouts
- Voice-activated shortcuts
- Alternative input methods

## 🚀 **Next Steps**

1. **Try the Web App**: Run `bun run web-app.ts` and explore the interface
2. **Add Custom Shortcuts**: Use the web interface to create your own shortcuts
3. **Create Profiles**: Set up different profiles for work/home/development
4. **Build Macros**: Automate common workflows with macro sequences
5. **Monitor Usage**: Check analytics to optimize your shortcut usage

## 📚 **Learn More**

- [ShortcutRegistry Core Documentation](../README.md)
- [API Reference](./api/README.md)
- [Macro System Guide](./macros/README.md)
- [Database Schema](./database/README.md)

---

**Ready to manage your shortcuts like a pro?** 🚀

The web application provides everything you need to create, manage, and optimize your keyboard shortcuts with a beautiful, modern interface!