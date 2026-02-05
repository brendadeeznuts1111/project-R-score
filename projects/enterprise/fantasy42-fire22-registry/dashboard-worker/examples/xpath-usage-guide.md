# XPath Integration Usage Guide

## Overview

You've provided the XPath `/html/body/div[3]/div[5]/div/div[4]/div[7]/div` for
integration into your Fantasy42 dashboard system. This guide shows you how to
use this XPath with your existing infrastructure.

## Quick Start

### 1. Basic Usage

```typescript
import { createSpecificElementManager } from '../core/integrations/fantasy42-specific-element-integration';
import { Fantasy42AgentClient } from '../src/api/fantasy42-agent-client';

// Create client
const client = new Fantasy42AgentClient({
  baseURL: 'https://api.fantasy42.com',
  token: 'your-token',
});

// Create and initialize
const manager = createSpecificElementManager(client);
await manager.initialize();

// Use it
const element = manager.getCurrentElement();
const data = manager.getCurrentData();
```

### 2. Direct XPath Handler

```typescript
import {
  findSpecificElement,
  handleSpecificElement,
} from '../core/ui/xpath-element-handler';

// Find the element
const element = findSpecificElement();
if (element) {
  console.log('Element found:', element.tagName);
}

// Handle the element
const result = await handleSpecificElement('read');
console.log('Element data:', result.data);
```

## Integration Options

### Option 1: Pre-configured Manager (Recommended)

```typescript
import { createSpecificElementManager } from '../core/integrations/fantasy42-specific-element-integration';

const manager = createSpecificElementManager(client);
await manager.initialize();

// The manager will automatically:
// - Find your XPath element
// - Setup monitoring if enabled
// - Handle data changes
// - Provide easy access methods
```

### Option 2: Custom Configuration

```typescript
import { Fantasy42SpecificElementManager } from '../core/integrations/fantasy42-specific-element-integration';

const customManager = new Fantasy42SpecificElementManager(client, {
  xpath: '/html/body/div[3]/div[5]/div/div[4]/div[7]/div',
  action: 'read',
  autoUpdate: true,
  updateInterval: 5000,
  onDataChange: (newData, element) => {
    console.log('Data changed:', newData);
    // Handle your data change logic
  },
  onElementFound: element => {
    console.log('Element found:', element.tagName);
    // Setup additional handlers
  },
});

await customManager.initialize();
```

### Option 3: Direct XPath Handler

```typescript
import { XPathElementHandler } from '../core/ui/xpath-element-handler';

const handler = XPathElementHandler.getInstance();

// Direct element finding
const element = handler.findElementByXPath(
  '/html/body/div[3]/div[5]/div/div[4]/div[7]/div'
);

// Direct element handling
const result = await handler.handleXPathElement({
  xpath: '/html/body/div[3]/div[5]/div/div[4]/div[7]/div',
  action: 'read',
});
```

## Common Use Cases

### 1. Monitor Element Content Changes

```typescript
const monitor = createSpecificElementManager(client);

// Setup monitoring
await monitor.initialize();

// The manager will automatically detect content changes
// and call your onDataChange callback
```

### 2. Extract Data on Demand

```typescript
const manager = createSpecificElementManager(client);
await manager.initialize();

// Get current data
const currentData = manager.readElementData();
console.log('Current content:', currentData.content);
console.log('Attributes:', currentData.attributes);
```

### 3. Update Element Content

```typescript
const manager = createSpecificElementManager(client);
await manager.initialize();

// Update content
manager.writeElementData('New content for the element');

// Update with structured data
manager.writeElementData({
  content: 'New content',
  attributes: {
    'data-status': 'updated',
    class: 'highlight',
  },
});
```

### 4. Handle User Interactions

```typescript
const interactiveManager = new Fantasy42SpecificElementManager(client, {
  xpath: '/html/body/div[3]/div[5]/div/div[4]/div[7]/div',
  action: 'click',
  onElementFound: element => {
    // Add custom click handler
    element.addEventListener('dblclick', () => {
      console.log('Double-clicked!');
    });
  },
});

await interactiveManager.initialize();
```

## Data Structure

When you read data from your XPath element, you'll get:

```typescript
interface ElementData {
  content: string; // Text content of the element
  attributes: {
    // All element attributes
    [key: string]: string;
  };
  children: ElementData[]; // Child elements (simplified)
  timestamp: string; // When data was extracted
  xpath: string; // Your XPath for reference
}
```

## Integration with Existing Systems

### With Customer Info System

```typescript
import { Fantasy42CustomerInfo } from '../core/integrations/fantasy42-customer-info';

// Use both systems together
const customerInfo = new Fantasy42CustomerInfo(/* config */);
const elementManager = createSpecificElementManager(client);

await Promise.all([customerInfo.initialize(), elementManager.initialize()]);

// Now both systems are monitoring their respective elements
```

### With Dashboard Actions

```typescript
// Add to your dashboard action handlers
const actionHandlers = {
  'get-transactions': () => {
    // Your existing transaction handler
  },
  'monitor-specific-element': () => {
    const manager = createSpecificElementManager(client);
    manager.initialize().then(() => {
      console.log('Specific element monitoring started');
    });
  },
};
```

## Testing Your Integration

### 1. Basic Test

```typescript
// Test if your XPath works
const testElement = document.evaluate(
  '/html/body/div[3]/div[5]/div/div[4]/div[7]/div',
  document,
  null,
  XPathResult.FIRST_ORDERED_NODE_TYPE,
  null
).singleNodeValue;

if (testElement) {
  console.log('✅ XPath found element:', testElement.tagName);
} else {
  console.log('❌ XPath did not find element');
}
```

### 2. Integration Test

```typescript
import { runSpecificElementExamples } from '../examples/specific-element-integration-example';

// Run the example to test your integration
await runSpecificElementExamples();
```

### 3. Quick Start Test

```typescript
import { quickStartSpecificElementIntegration } from '../examples/specific-element-integration-example';

const manager = await quickStartSpecificElementIntegration();
if (manager) {
  console.log('✅ Integration working!');
} else {
  console.log('❌ Integration failed');
}
```

## Troubleshooting

### Element Not Found

1. **Check XPath accuracy**: Use browser dev tools to verify the XPath
2. **Timing issues**: Element might load after your script runs
3. **Dynamic content**: Element might be created by JavaScript

**Solution**: Use the integration manager which includes automatic retry and DOM
watching.

### Data Not Updating

1. **Auto-update disabled**: Make sure `autoUpdate: true`
2. **Wrong action type**: Use `'update'` action for monitoring
3. **Content not changing**: Verify the element content actually changes

**Solution**: Enable auto-update with appropriate interval.

### Permission Errors

1. **API token invalid**: Check your client configuration
2. **Network issues**: Verify API endpoint accessibility
3. **CORS issues**: Check cross-origin headers

**Solution**: Validate API credentials and network connectivity.

## Performance Tips

1. **Use appropriate intervals**: Don't check too frequently
2. **Cache results**: Store data to avoid unnecessary API calls
3. **Batch operations**: Group multiple element operations
4. **Cleanup resources**: Always call cleanup when done

## Next Steps

1. **Test your XPath** in the browser developer tools
2. **Configure your API client** with proper credentials
3. **Run the examples** to verify functionality
4. **Customize the configuration** for your specific needs
5. **Integrate with your existing workflows**

## Support

If you encounter issues:

1. Check the browser console for error messages
2. Verify your XPath is correct
3. Test with the provided examples
4. Review the README documentation
5. Check API connectivity and permissions

Your XPath `/html/body/div[3]/div[5]/div/div[4]/div[7]/div` is now fully
integrated into your Fantasy42 system with comprehensive monitoring, data
extraction, and interaction capabilities! 🎯
