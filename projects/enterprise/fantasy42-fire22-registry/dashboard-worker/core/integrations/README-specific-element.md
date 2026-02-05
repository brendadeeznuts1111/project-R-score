# Fantasy42 Specific Element Integration

## Overview

This integration targets a specific DOM element using the XPath:
`/html/body/div[3]/div[5]/div/div[4]/div[7]/div`

## Features

- 🎯 **Precise Targeting**: Uses XPath to locate the exact element
- 🔄 **Real-time Monitoring**: Optional automatic data change detection
- 📊 **Data Extraction**: Read element content, attributes, and structure
- ✏️ **Data Writing**: Update element content and attributes
- 🎣 **Event Handling**: Handle clicks, form submissions, and custom events
- 🛡️ **Error Handling**: Robust error handling and recovery
- 📝 **TypeScript Support**: Full type safety and IntelliSense

## Quick Start

```typescript
import { createSpecificElementManager } from './fantasy42-specific-element-integration';
import { Fantasy42AgentClient } from '../../src/api/fantasy42-agent-client';

// Create client
const client = new Fantasy42AgentClient({
  baseURL: 'https://api.fantasy42.com',
  token: 'your-token',
});

// Create and initialize manager
const manager = createSpecificElementManager(client);
await manager.initialize();

// Use the manager
const element = manager.getCurrentElement();
const data = manager.getCurrentData();
```

## Configuration Options

```typescript
interface SpecificElementConfig {
  xpath: string; // The XPath to target
  action: 'read' | 'write' | 'update' | 'click' | 'submit' | 'validate';
  data?: any; // Data for write operations
  autoUpdate?: boolean; // Enable real-time monitoring
  updateInterval?: number; // Monitoring interval (ms)
  validation?: {
    // Data validation rules
    required?: boolean;
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
  };
  onDataChange?: (newData: any, element: Element) => void;
  onElementFound?: (element: Element) => void;
}
```

## Usage Examples

### Basic Reading

```typescript
const config: SpecificElementConfig = {
  xpath: '/html/body/div[3]/div[5]/div/div[4]/div[7]/div',
  action: 'read',
  onDataChange: (data, element) => {
    console.log('Element data:', data);
  },
};

const manager = new Fantasy42SpecificElementManager(client, config);
await manager.initialize();
```

### Real-time Monitoring

```typescript
const config: SpecificElementConfig = {
  xpath: '/html/body/div[3]/div[5]/div/div[4]/div[7]/div',
  action: 'update',
  autoUpdate: true,
  updateInterval: 5000,
  onDataChange: (newData, element) => {
    // Handle data changes
    sendToBackend(newData);
    updateUI(newData);
  },
};
```

### Click Handling

```typescript
const config: SpecificElementConfig = {
  xpath: '/html/body/div[3]/div[5]/div/div[4]/div[7]/div',
  action: 'click',
  onElementFound: element => {
    // Element found, can add additional listeners
    element.addEventListener('dblclick', handleDoubleClick);
  },
};
```

### Data Writing

```typescript
const manager = createSpecificElementManager(client);
await manager.initialize();

// Write new content
const success = manager.writeElementData('New content');

// Write structured data
const structuredData = {
  content: 'New text content',
  attributes: {
    'data-status': 'updated',
    class: 'highlight',
  },
};

manager.writeElementData(structuredData);
```

## Direct XPath Handler Usage

```typescript
import {
  findSpecificElement,
  handleSpecificElement,
} from '../ui/xpath-element-handler';

// Find element
const element = findSpecificElement();
if (element) {
  console.log('Element found:', element.tagName);
}

// Handle element
const result = await handleSpecificElement('read');
if (result.success) {
  console.log('Element data:', result.data);
}
```

## Data Structure

The integration extracts the following data from the target element:

```typescript
interface ElementData {
  content: string; // Text content
  attributes: Record<string, string>; // Element attributes
  children: ElementData[]; // Child elements (simplified)
  timestamp: string; // When data was extracted
  xpath: string; // The XPath used
}
```

## Error Handling

The integration includes comprehensive error handling:

- **Element Not Found**: Automatic retry with DOM watcher
- **Network Errors**: Graceful fallback and retry logic
- **Invalid Data**: Validation with detailed error messages
- **Permission Errors**: Clear authorization error reporting

## Integration with Existing Systems

This integration works seamlessly with your existing Fantasy42 systems:

### With Customer Info Integration

```typescript
import { Fantasy42CustomerInfo } from './fantasy42-customer-info';
import { Fantasy42SpecificElementManager } from './fantasy42-specific-element-integration';

// Use both integrations together
const customerInfo = new Fantasy42CustomerInfo(/* config */);
const elementManager = createSpecificElementManager(client);

// Initialize both
await Promise.all([customerInfo.initialize(), elementManager.initialize()]);
```

### With P2P Automation

```typescript
import { Fantasy42P2PAutomation } from './fantasy42-p2p-automation';

// Connect element changes to P2P automation
const config: SpecificElementConfig = {
  xpath: '/html/body/div[3]/div[5]/div/div[4]/div[7]/div',
  action: 'update',
  onDataChange: (data, element) => {
    // Trigger P2P automation based on element changes
    p2pAutomation.handleElementUpdate(data);
  },
};
```

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## Performance Considerations

- **Memory Usage**: Minimal footprint with automatic cleanup
- **Network Requests**: Efficient caching and batching
- **CPU Usage**: Lightweight monitoring with configurable intervals
- **DOM Queries**: Optimized XPath evaluation

## Troubleshooting

### Element Not Found

```typescript
// Check if XPath is correct
const testElement = document.evaluate(
  '/html/body/div[3]/div[5]/div/div[4]/div[7]/div',
  document,
  null,
  XPathResult.FIRST_ORDERED_NODE_TYPE,
  null
).singleNodeValue;

console.log('Test result:', testElement);
```

### Data Not Updating

```typescript
// Check if auto-update is enabled
console.log('Auto update enabled:', manager.config.autoUpdate);
console.log('Update interval:', manager.config.updateInterval);

// Manually trigger update
const data = manager.readElementData();
console.log('Manual read:', data);
```

### Permission Errors

```typescript
// Check API token and permissions
console.log('Token valid:', await client.validateToken());
console.log(
  'Has permissions:',
  await client.checkPermissions(['element.read'])
);
```

## API Reference

### Fantasy42SpecificElementManager

#### Methods

- `initialize()`: Initialize the integration
- `getCurrentElement()`: Get the current DOM element
- `getCurrentData()`: Get the last read data
- `writeElementData(data)`: Write data to the element
- `updateConfig(config)`: Update integration configuration
- `isReady()`: Check if integration is ready
- `cleanup()`: Clean up resources

#### Events

- `onElementFound`: Fired when target element is found
- `onDataChange`: Fired when element data changes

## Support

For issues or questions about this integration:

1. Check the troubleshooting section above
2. Review the example implementations
3. Ensure your XPath is correct and the element exists
4. Verify API credentials and permissions

## Changelog

### v1.0.0

- Initial release
- Basic element targeting and monitoring
- Data extraction and writing capabilities
- Real-time update support
- TypeScript support

---

## 🎯 Next Steps

1. **Configure your API credentials** in the client setup
2. **Test the XPath** in your browser's developer tools
3. **Run the examples** to verify functionality
4. **Integrate with your existing workflows**
5. **Customize the configuration** for your specific needs

This integration provides a solid foundation for monitoring and interacting with
specific elements on the Fantasy42 platform. Customize it further based on your
specific requirements and use cases.
