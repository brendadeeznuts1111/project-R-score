# Claudian - Vault Deployment Guide

## Plugin Information

| Property | Value |
|----------|-------|
| **Plugin ID** | claudian |
| **Plugin Name** | Claudian |
| **Version** | 1.3.42 |
| **Author** | Brenda Williams |
| **Repository** | https://github.com/brendadeeznuts1111/obsidian-claude |
| **License** | MIT |
| **Desktop Only** | Yes |
| **Min Obsidian Version** | 1.0.0 |

## Installation Methods

### Method 1: Manual Installation (Recommended for Testing)

1. **Create plugin folder**:
   ```bash
   mkdir -p /path/to/vault/.obsidian/plugins/claudian
   ```

2. **Copy build artifacts**:
   ```bash
   cp main.js manifest.json styles.css /path/to/vault/.obsidian/plugins/claudian/
   ```

3. **Enable in Obsidian**:
   - Open Obsidian Settings
   - Go to Community plugins
   - Find "Claudian" and enable it

### Method 2: BRAT Installation (For Beta Testing)

1. Install BRAT plugin from Community Plugins
2. In BRAT settings, click "Add Beta plugin"
3. Enter: `https://github.com/brendadeeznuts1111/obsidian-claude`
4. BRAT will install and auto-update the plugin

### Method 3: From GitHub Releases

1. Download latest release from: https://github.com/brendadeeznuts1111/obsidian-claude/releases
2. Extract `main.js`, `manifest.json`, `styles.css`
3. Create folder: `/path/to/vault/.obsidian/plugins/claudian/`
4. Copy files into the folder
5. Enable in Obsidian

## Pre-Deployment Checklist

### Build Verification
- [x] `bun run build` completes successfully
- [x] `main.js` generated (4.9 MB)
- [x] `styles.css` generated (93 KB)
- [x] `manifest.json` present and valid
- [x] Type checking passes (`bun run typecheck`)

### Configuration
- [x] Plugin ID: `claudian`
- [x] Author: `Brenda Williams`
- [x] Repository URL: `https://github.com/brendadeeznuts1111/obsidian-claude`
- [x] Version: `1.3.42`
- [x] Min Obsidian: `1.0.0`

### Documentation
- [x] README.md updated with new repository
- [x] Installation instructions current
- [x] Troubleshooting guide included
- [x] Architecture documentation (CLAUDE.md)

## Required Files for Vault

```text
.obsidian/plugins/claudian/
├── main.js          (4.9 MB) - Compiled plugin
├── manifest.json    (316 B)  - Plugin metadata
└── styles.css       (93 KB)  - Plugin styles
```

## System Requirements

- **Obsidian**: 1.0.0 or later
- **Platform**: macOS, Linux, Windows (Desktop only)
- **Claude CLI**: Required for agent functionality
- **API Key**: Anthropic API key for Claude access

## First-Time Setup

After enabling the plugin:

1. **Configure Claude CLI path** (if not auto-detected):
   - Settings → Claudian → Advanced → Claude CLI path
   - Set to your Claude CLI installation path

2. **Set API Key**:
   - Ensure `ANTHROPIC_API_KEY` environment variable is set
   - Or configure in Claude CLI settings

3. **Test Connection**:
   - Open Claudian sidebar
   - Send a test message to verify connection

## Troubleshooting

### Plugin Not Appearing
- Restart Obsidian
- Check `.obsidian/plugins/claudian/` folder exists
- Verify `manifest.json` is valid JSON

### Claude CLI Not Found
- Check Claude CLI is installed: `which claude`
- Set path in Settings → Claudian → Advanced
- Restart Obsidian

### API Errors
- Verify `ANTHROPIC_API_KEY` is set
- Check API key is valid
- Ensure internet connection is active

## Build & Deploy

### Development Build
```bash
bun run dev
```

### Production Build
```bash
bun run build
```

### Deploy to Vault
```bash
cp main.js manifest.json styles.css /path/to/vault/.obsidian/plugins/claudian/
```

## Support

- **Issues**: https://github.com/brendadeeznuts1111/obsidian-claude/issues
- **Documentation**: See CLAUDE.md for architecture details
- **Build System**: See BUN_MIGRATION.md for build setup

## Version History

- **1.3.42** - Current version with bun build system
- See GitHub releases for full history

