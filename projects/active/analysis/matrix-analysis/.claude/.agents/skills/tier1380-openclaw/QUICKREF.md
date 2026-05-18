# Tier-1380 OpenClaw CLI Quick Reference

Quick reference for all `kimi` CLI commands.

---

## 🚀 Getting Started

```bash
kimi setup              # Run quick setup wizard
kimi test               # Run integration tests (25 tests)
kimi integration        # View integration status
```

---

## 📡 Topics

```bash
kimi topic list                    # List all Telegram topics
kimi topic super                   # Show super topics
kimi topic routing                 # Display routing rules
kimi topic route "message"         # Test message routing
```

**Topics:**
- `1` - General 📢 (default)
- `2` - Alerts 🚨
- `5` - Logs 📊
- `7` - Development 💻

---

## 📁 Projects

```bash
kimi project list                  # List all projects
kimi project groups                # Show project groups
kimi project show <name>           # Show project details
kimi project current               # Show current project
kimi project route <msg>           # Test project routing
kimi project notify <event>        # Send test notification
```

**Projects:**
- `nolarose-mcp-config` → Topic 7
- `openclaw` → Topic 1
- `matrix-agent` → Topic 7

---

## 🔗 Git Hooks

```bash
kimi hooks install                 # Install for all projects
kimi hooks install <project>       # Install for specific project
kimi hooks list                    # Show installed hooks
kimi hooks uninstall               # Remove all hooks
```

**Auto-routing patterns:**
- `feat:` → Development (7)
- `fix:` → Alerts (2)
- `docs:` → General (1)
- `test:` → Development (7)

---

## 👁️ File Watch

```bash
kimi watch start                   # Watch all projects
kimi watch start <project>         # Watch specific project
kimi watch status                  # Show watch status
```

---

## 🌐 GitHub Webhooks

```bash
kimi webhook test                  # Test all event types
kimi webhook simulate push <repo>  # Simulate push event
kimi webhook simulate pr <repo>    # Simulate PR event
kimi webhook server <port>         # Start webhook server
```

---

## 🔔 Notifications

```bash
kimi notify rules                  # Show notification rules
kimi notify enable <p> <e>         # Enable event
kimi notify disable <p> <e>        # Disable event
kimi notify test <p> <e>           # Test notification
```

**Events:** commit, push, merge, pr, issue, release, file_change, test_failure, deploy

---

## 📊 Channels

```bash
kimi channel dashboard             # Real-time dashboard
kimi channel watch                 # Watch mode
kimi channel stats                 # Statistics
```

---

## ⚡ Performance (JSC)

```bash
kimi perf memory                   # JSC memory report
kimi perf gc                       # Force garbage collection
kimi perf profile                  # Run profiler test
kimi perf monitor [file]           # Monitor file read
kimi perf timezone [tz]            # Get/set timezone
kimi perf describe [value]         # Describe value
kimi perf snapshot                 # Full JSON snapshot
kimi perf drain                    # Drain microtasks
```

---

## 🎨 Color Utility

```bash
kimi color convert <c> <fmt>       # Convert color format
kimi color rgba <color>            # Get RGBA channels
kimi color ansi <color>            # Show ANSI code
kimi color contrast <bg> <fg>      # WCAG contrast check
kimi color lighten <c> [amt]       # Lighten color
kimi color darken <c> [amt]        # Darken color
kimi color topics                  # Show topic colors
```

**Formats:** css, hex, HEX, rgb, rgba, hsl, number, {rgb}, {rgba}, [rgb], [rgba], ansi

---

## 🧪 Testing

```bash
kimi test                          # Run all integration tests
```

---

## 📋 Common Workflows

### Daily Development
```bash
kimi integration                   # Check status
# ... make changes ...
git commit -m "feat: new feature"  # Auto-routes to Topic 7
git push                           # Triggers notification
```

### Adding a Project
```bash
# Edit config/project-topics.yaml
kimi hooks install my-project      # Install hooks
kimi project show my-project       # Verify
```

### Checking Colors
```bash
kimi color topics                  # Show all topic colors
kimi color contrast "#4CAF50" white  # Check readability
```

### Performance Check
```bash
kimi perf memory                   # Check memory
kimi perf gc                       # Force GC
kimi perf snapshot | jq .          # Full stats
```

---

## 🔧 Configuration Files

```
~/.kimi/skills/tier1380-openclaw/
├── config/
│   ├── telegram-topics.yaml       # Topic definitions
│   └── project-topics.yaml        # Project mappings
└── logs/
    ├── topic-routing.jsonl        # Routing log
    ├── file-watch.jsonl           # Watch log
    └── notifications.jsonl        # Notification log
```

---

## 🆘 Troubleshooting

```bash
# Hooks not working
kimi hooks list                    # Check installation
kimi hooks install                 # Reinstall

# Wrong routing
kimi topic route "your message"    # Test routing
kimi project route <p> "message"   # Test project routing

# Large files
bun scripts/lib/bytes.ts info <file>
bun scripts/lib/bytes.ts stream <file> 100
```

---

## 📚 Documentation

- `README.md` - Full documentation
- `INTEGRATION-SUMMARY.md` - Status overview
- `QUICKREF.md` - This file
- `docs/TOPICS-CHANNELS.md` - Topics guide
- `docs/PROJECT-INTEGRATION.md` - Projects guide

---

**Version:** Tier-1380 OpenClaw v1.0.0
