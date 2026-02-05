# Enhanced DuoPlus ADB Integration

## Overview

This document describes the enhanced ADB command integration for DuoPlus cloud phones, based on the official DuoPlus documentation. The implementation provides comprehensive ADB command support through a TypeScript interface and React components.

## Features

### 🔧 **Core ADB Command Execution**

- Execute any ADB command on cloud phones
- Background command execution support
- Command history tracking
- Error handling and logging

### 📁 **File Transfer Operations**

- Download files from URLs to cloud phones
- Upload files from cloud phones to relay stations
- Local file transfer (push/pull)
- Screenshot capture
- Upload progress monitoring

### 📱 **Application Management**

- List installed applications
- Install/uninstall APK files
- Start/stop applications
- Clear application data
- Grant runtime permissions

### ♿ **Accessibility Services**

- Get current accessibility services
- Set accessibility permissions
- AutoJs automation setup
- Multiple service management

### 🎮 **Device Control**

- Simulate key presses
- Touch screen interactions (tap, swipe)
- Device information retrieval
- System log management

## API Reference

### EnhancedADBManager Class

#### Constructor

```typescript
const manager = new EnhancedADBManager(apiKey: string);
```

#### Core Methods

##### Command Execution

```typescript
// Execute any ADB command
const response = await manager.executeCommand(
  phoneId: string,
  command: string,
  options?: ADBCommandOptions
);

// Background execution
await manager.executeCommand(phoneId, 'long_running_command', {
  background: true
});
```

##### Accessibility Services

```typescript
// Get current services
const services = await manager.getAccessibilityServices(phoneId);

// Set accessibility service
await manager.setAccessibilityServices(phoneId, "com.app/com.app.Service");

// Setup AutoJs for automation
await manager.setupAutoJsAccessibility(phoneId);
```

##### File Operations

```typescript
// Download from URL
await manager.downloadFromURL(phoneId, "https://example.com/app.apk");

// Upload to relay station
const logPath = await manager.uploadToRelayStation(phoneId, "/sdcard/file.txt");

// Check upload progress
const progress = await manager.getUploadProgress(phoneId, logPath);

// Take screenshot
await manager.captureScreenshot(phoneId, "my_screenshot.png");
```

##### Application Management

```typescript
// List installed apps
const packages = await manager.getInstalledPackages(phoneId);

// Install APK
await manager.installApplication(phoneId, "/sdcard/app.apk");

// Uninstall app
await manager.uninstallApplication(phoneId, "com.example.app");

// Start/stop apps
await manager.startApplication(phoneId, "com.example.app");
await manager.stopApplication(phoneId, "com.example.app");

// Clear app data
await manager.clearApplicationData(phoneId, "com.example.app");

// Grant permissions
await manager.grantPermission(phoneId, "com.example.app", "CAMERA");
```

##### Device Control

```typescript
// Device information
const info = await manager.getDeviceInfo(phoneId);

// Key presses
await manager.pressKey(phoneId, 3); // Home button

// Touch interactions
await manager.tapScreen(phoneId, 500, 500);
await manager.swipeScreen(phoneId, 100, 100, 500, 500, 300);

// System operations
await manager.clearSystemLogs(phoneId);
const logFile = await manager.uploadSystemLogs(phoneId);
```

### React Components

#### ADBCommandPanel

```typescript
import { ADBCommandPanel } from '@/components';

<ADBCommandPanel
  phones={phones}
  selectedPhone={selectedPhone}
  onPhoneSelect={handlePhoneSelect}
/>
```

Features:

- **Quick Commands**: Device info, screenshot, logs, accessibility
- **File Transfer**: Download/upload operations with progress tracking
- **App Management**: Install, uninstall, control applications
- **Custom Commands**: Execute any ADB command with history
- **Command History**: Track all executed commands with results

## Usage Examples

### Basic Setup

```typescript
import { enhancedADBManager } from "@/utils/duoplus";

// Execute a simple command
const response = await enhancedADBManager.executeCommand("phone-123", "getprop ro.product.model");
console.log(response.output); // Device model
```

### File Download and Install

```typescript
// Download and install an APK
await enhancedADBManager.downloadAndInstallAPK(
  "phone-123",
  "https://example.com/app.apk",
  "com.example.app"
);
```

### Automation Setup

```typescript
// Setup phone for automation
await enhancedADBManager.setupAutoJsAccessibility("phone-123");

// Install automation app
await enhancedADBManager.downloadFromURL(
  "phone-123",
  "https://github.com/autojs/autojs/releases/download/v6.0.4/autojs_6.0.4.apk"
);
```

### Batch Operations

```typescript
// Perform operations on multiple phones
const phones = ["phone-1", "phone-2", "phone-3"];

for (const phoneId of phones) {
  await enhancedADBManager.captureScreenshot(phoneId);
  await enhancedADBManager.clearSystemLogs(phoneId);
}
```

## Configuration

### Environment Variables

```bash
# Required for API authentication
DUOPLUS_API_KEY=your_api_key_here

# Optional: Custom API base URL
DUOPLUS_API_BASE_URL=https://openapi.duoplus.cn/api/v1
```

### TypeScript Types

```typescript
interface ADBCommandOptions {
  background?: boolean;
  timeout?: number;
  logPath?: string;
}

interface FileTransferOptions {
  source: string;
  destination: string;
  background?: boolean;
  logProgress?: boolean;
}

interface AppManagementOptions {
  packageName: string;
  permission?: string;
  force?: boolean;
}
```

## Security Considerations

### API Key Management

- Store API keys securely in environment variables
- Never expose API keys in client-side code
- Use HTTPS for all API communications

### Command Execution

- Validate all user inputs before command execution
- Implement rate limiting for command execution
- Log all commands for audit purposes

### File Operations

- Validate file paths to prevent directory traversal
- Limit file sizes for uploads/downloads
- Scan uploaded files for malware

## Error Handling

### Common Error Types

```typescript
try {
  await enhancedADBManager.executeCommand(phoneId, command);
} catch (error) {
  if (error.message.includes("timeout")) {
    // Handle timeout
  } else if (error.message.includes("unauthorized")) {
    // Handle authentication error
  } else if (error.message.includes("not found")) {
    // Handle phone not found
  }
}
```

### Best Practices

- Always wrap ADB operations in try-catch blocks
- Implement retry logic for network operations
- Provide user-friendly error messages
- Log errors for debugging

## Performance Optimization

### Background Operations

```typescript
// Execute long-running commands in background
await enhancedADBManager.executeCommand(phoneId, command, {
  background: true,
  timeout: 60000 // 60 seconds
});
```

### Batch Processing

```typescript
// Process multiple commands efficiently
const commands = ["pm list packages", "getprop ro.product.model", "wm size"];

const results = await Promise.all(
  commands.map((cmd) => enhancedADBManager.executeCommand(phoneId, cmd))
);
```

### Caching

```typescript
// Cache device information
const deviceInfo = await enhancedADBManager.getDeviceInfo(phoneId);
// Store in local state for reuse
```

## Troubleshooting

### Common Issues

#### Command Timeout

- Increase timeout value for long-running operations
- Use background execution for file downloads/uploads

#### Authentication Errors

- Verify API key is correct and active
- Check API key permissions

#### Phone Not Found

- Verify phone ID is correct
- Check phone is online and accessible

#### File Transfer Failures

- Check file paths are valid
- Verify sufficient storage space
- Check network connectivity

### Debug Mode

```typescript
// Enable debug logging
const manager = new EnhancedADBManager(apiKey);
manager.setDebugMode(true);
```

## Integration Examples

### With Unified Profiles

```typescript
// Execute ADB commands on unified profile phones
const profiles = unifiedProfileManager.getAllProfiles();

for (const profile of profiles) {
  if (profile.phoneId) {
    await enhancedADBManager.setupAutoJsAccessibility(profile.phoneId);
  }
}
```

### With CLI Tools

```bash
# Execute ADB command via CLI
bun run adb:execute --phone phone-123 --command "getprop ro.product.model"

# Install APK on multiple phones
bun run adb:install --phones phone-1,phone-2,phone-3 --apk /path/to/app.apk
```

## Future Enhancements

### Planned Features

- Real-time command streaming
- Command scheduling and automation
- Advanced file synchronization
- Device group management
- Performance monitoring dashboard

### API Extensions

- WebSocket support for real-time updates
- Batch command execution API
- File streaming API
- Device monitoring API

## Support

For issues and questions:

1. Check the [DuoPlus Documentation](https://help.duoplus.net)
2. Review the command reference above
3. Check error logs for detailed information
4. Contact support with API key and error details

## License

This integration follows the same license as the main Foxy Proxy project.
