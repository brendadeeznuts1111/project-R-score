/**
 * Specific Element Integration Example
 * Demonstrates how to use the XPath: /html/body/div[3]/div[5]/div/div[4]/div[7]/div
 */

import { Fantasy42AgentClient } from '../src/api/fantasy42-agent-client';
import {
  createSpecificElementManager,
  Fantasy42SpecificElementManager,
  SpecificElementConfig,
} from '../core/integrations/fantasy42-specific-element-integration';
import { handleSpecificElement, findSpecificElement } from '../core/ui/xpath-element-handler';

// Example 1: Basic usage with the pre-configured manager
async function basicUsageExample() {
  console.log('🚀 Basic Specific Element Integration Example');

  // Create a Fantasy42 client (you'll need to configure this)
  const client = new Fantasy42AgentClient({
    baseURL: 'https://api.fantasy42.com',
    token: 'your-api-token',
  });

  // Create the element manager with default configuration
  const elementManager = createSpecificElementManager(client);

  // Initialize the integration
  const success = await elementManager.initialize();

  if (success) {
    console.log('✅ Element integration initialized successfully');

    // Get current element
    const element = elementManager.getCurrentElement();
    console.log('🎯 Current element:', element?.tagName);

    // Get current data
    const data = elementManager.getCurrentData();
    console.log('📊 Current data:', data);

    // Check if ready
    console.log('🔍 Integration ready:', elementManager.isReady());
  } else {
    console.log('❌ Failed to initialize element integration');
  }
}

// Example 2: Advanced usage with custom configuration
async function advancedUsageExample() {
  console.log('⚡ Advanced Specific Element Integration Example');

  const client = new Fantasy42AgentClient({
    baseURL: 'https://api.fantasy42.com',
    token: 'your-api-token',
  });

  // Custom configuration
  const customConfig: SpecificElementConfig = {
    xpath: '/html/body/div[3]/div[5]/div/div[4]/div[7]/div',
    action: 'read',
    autoUpdate: true,
    updateInterval: 3000, // Check every 3 seconds
    validation: {
      required: true,
      minLength: 1,
    },
    onDataChange: (newData, element) => {
      console.log('🔄 Data changed:', newData);
      console.log('📍 Element:', element.tagName);

      // You can add custom logic here, like:
      // - Send data to your backend
      // - Trigger notifications
      // - Update other UI elements
      // - Log changes for analytics
    },
    onElementFound: element => {
      console.log('🎯 Element found:', element.tagName);
      console.log('📋 Element attributes:', element.attributes);
      console.log('📝 Element content:', element.textContent);

      // You can add custom logic here, like:
      // - Setup additional event listeners
      // - Modify the element's appearance
      // - Extract initial data
    },
  };

  const elementManager = new Fantasy42SpecificElementManager(client, customConfig);
  const success = await elementManager.initialize();

  if (success) {
    console.log('✅ Custom element integration initialized');

    // Demonstrate different operations
    setTimeout(async () => {
      // Read current data
      const currentData = elementManager.getCurrentData();
      console.log('📖 Read data:', currentData);

      // Write new data (if the element supports it)
      const writeSuccess = elementManager.writeElementData('New content from integration');
      console.log('✏️ Write operation:', writeSuccess ? 'Success' : 'Failed');
    }, 5000);
  }
}

// Example 3: Direct XPath handler usage
async function directHandlerExample() {
  console.log('🔧 Direct XPath Handler Example');

  // Wait for page to load
  if (document.readyState !== 'complete') {
    await new Promise(resolve => window.addEventListener('load', resolve));
  }

  // Find the element directly
  const element = findSpecificElement();
  if (element) {
    console.log('✅ Element found directly:', element.tagName);
    console.log('📋 Element details:', {
      tagName: element.tagName,
      id: element.id,
      className: element.className,
      textContent: element.textContent?.substring(0, 100) + '...',
    });

    // Handle the element with different actions
    const readResult = await handleSpecificElement('read');
    console.log('📖 Read result:', readResult);

    if (readResult.success && readResult.data) {
      console.log('📊 Element data:', readResult.data);
    }
  } else {
    console.log('❌ Element not found');

    // You might want to retry or use the integration manager
    console.log(
      '💡 Tip: Use the integration manager for automatic element detection and monitoring'
    );
  }
}

// Example 4: Real-time monitoring setup
async function monitoringExample() {
  console.log('👀 Real-time Monitoring Example');

  const client = new Fantasy42AgentClient({
    baseURL: 'https://api.fantasy42.com',
    token: 'your-api-token',
  });

  const monitoringConfig: SpecificElementConfig = {
    xpath: '/html/body/div[3]/div[5]/div/div[4]/div[7]/div',
    action: 'update',
    autoUpdate: true,
    updateInterval: 2000,
    onDataChange: (newData, element) => {
      console.log('🔄 Real-time update detected!');
      console.log('📊 New data:', newData);
      console.log('🕒 Timestamp:', new Date().toISOString());

      // Example: Send to backend for processing
      sendDataToBackend(newData);

      // Example: Update dashboard metrics
      updateDashboardMetrics(newData);

      // Example: Trigger alerts for specific changes
      checkForAlerts(newData);
    },
  };

  const monitor = new Fantasy42SpecificElementManager(client, monitoringConfig);
  const success = await monitor.initialize();

  if (success) {
    console.log('✅ Real-time monitoring started');

    // Monitor for 30 seconds as example
    setTimeout(() => {
      console.log('⏹️ Stopping monitoring example');
      monitor.cleanup();
    }, 30000);
  }
}

// Helper functions for the examples
function sendDataToBackend(data: any) {
  console.log('📤 Sending data to backend:', data);
  // Add your backend integration logic here
}

function updateDashboardMetrics(data: any) {
  console.log('📈 Updating dashboard metrics with:', data);
  // Add your dashboard update logic here
}

function checkForAlerts(data: any) {
  console.log('🚨 Checking for alerts in:', data);
  // Add your alert checking logic here
}

// Main example runner
export async function runSpecificElementExamples() {
  console.log('🎯 Running Specific Element Integration Examples');
  console.log('='.repeat(50));

  try {
    // Run examples sequentially
    await basicUsageExample();
    console.log('-'.repeat(30));

    await directHandlerExample();
    console.log('-'.repeat(30));

    // Uncomment to run advanced examples
    // await advancedUsageExample();
    // console.log('-'.repeat(30));

    // await monitoringExample();

    console.log('✅ All examples completed successfully');
  } catch (error) {
    console.error('❌ Example execution failed:', error);
  }
}

// Quick start function for immediate use
export async function quickStartSpecificElementIntegration() {
  console.log('🚀 Quick Start: Specific Element Integration');

  const client = new Fantasy42AgentClient({
    baseURL: 'https://api.fantasy42.com',
    token: 'your-api-token',
  });

  const manager = createSpecificElementManager(client);
  const success = await manager.initialize();

  if (success) {
    console.log('✅ Quick start successful!');
    console.log(
      '💡 You can now monitor the element at: /html/body/div[3]/div[5]/div/div[4]/div[7]/div'
    );

    // Return the manager for further use
    return manager;
  } else {
    console.log('❌ Quick start failed - element not found');
    return null;
  }
}

// Export everything for external use
export { basicUsageExample, advancedUsageExample, directHandlerExample, monitoringExample };
