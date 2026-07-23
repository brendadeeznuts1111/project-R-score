# Bun Surgical Dashboard Plugins

This directory contains plugins for the Bun Surgical Dashboard Plugin System.

## Available Plugins

### Git Integration Plugin (`git-integration.js`)

A hybrid plugin combining **UI**, **Hook**, and **Integration** characteristics that monitors local Git repositories, displays status, and tracks Git operations.

**Features**:
- Automatic Git CLI detection
- Repository scanning and status monitoring
- Real-time UI widget with repository information
- Command execution tracking
- Dashboard refresh integration

**Usage**:
The plugin is automatically loaded by the PluginSystem when placed in this directory.

**Configuration**:
- Priority: 10 (executes after core initialization)
- Requires: Git CLI in PATH (optional, operates in limited mode if unavailable)

## Creating New Plugins

See `../PLUGIN_SYSTEM.md` for complete documentation on:
- Plugin architecture
- Hook system
- Plugin types (UI, Hook, Service, Integration, Tool)
- Best practices
- Examples

## Plugin Structure

Each plugin should export a default object with:
- `id`: Unique plugin identifier
- `name`: Human-readable name
- `version`: Semantic version
- `priority`: Execution priority (lower = higher priority)
- `init()`: Initialization function
- `teardown()`: Cleanup function
- Hook handlers and other plugin-specific methods

## Installation

Plugins are automatically discovered and loaded from this directory. Simply place your plugin file here and restart the dashboard.
