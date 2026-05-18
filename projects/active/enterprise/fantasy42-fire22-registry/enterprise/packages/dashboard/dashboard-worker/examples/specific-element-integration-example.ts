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
  console.info('🚀 Basic Specific Element Integration Example');

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
    console.info('✅ Element integration initialized successfully');

    // Get current element
    const element = elementManager.getCurrentElement();
    console.info('🎯 Current element:', element?.tagName);

    // Get current data
    const data = elementManager.getCurrentData();
    console.info('📊 Current data:', data);

    // Check if ready
    console.info('🔍 Integration ready:', elementManager.isReady());
  } else {
    console.info('❌ Failed to initialize element integration');
  }
}

// Example 2: Advanced usage with custom configuration
async function advancedUsageExample() {
  console.info('⚡ Advanced Specific Element Integration Example');

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
      console.info('🔄 Data changed:', newData);
      console.info('📍 Element:', element.tagName);

      // You can add custom logic here, like:
      // - Send data to your backend
      // - Trigger notifications
      // - Update other UI elements
      // - Log changes for analytics
    },
    onElementFound: element => {
      console.info('🎯 Element found:', element.tagName);
      console.info('📋 Element attributes:', element.attributes);
      console.info('📝 Element content:', element.textContent);

      // You can add custom logic here, like:
      // - Setup additional event listeners
      // - Modify the element's appearance
      // - Extract initial data
    },
  };

  const elementManager = new Fantasy42SpecificElementManager(client, customConfig);
  const success = await elementManager.initialize();

  if (success) {
    console.info('✅ Custom element integration initialized');

    // Demonstrate different operations
    setTimeout(async () => {
      // Read current data
      const currentData = elementManager.getCurrentData();
      console.info('📖 Read data:', currentData);

      // Write new data (if the element supports it)
      const writeSuccess = elementManager.writeElementData('New content from integration');
      console.info('✏️ Write operation:', writeSuccess ? 'Success' : 'Failed');
    }, 5000);
  }
}

// Example 3: Direct XPath handler usage
async function directHandlerExample() {
  console.info('🔧 Direct XPath Handler Example');

  // Wait for page to load
  if (document.readyState !== 'complete') {
    await new Promise(resolve => window.addEventListener('load', resolve));
  }

  // Find the element directly
  const element = findSpecificElement();
  if (element) {
    console.info('✅ Element found directly:', element.tagName);
    console.info('📋 Element details:', {
      tagName: element.tagName,
      id: element.id,
      className: element.className,
      textContent: element.textContent?.substring(0, 100) + '...',
    });

    // Handle the element with different actions
    const readResult = await handleSpecificElement('read');
    console.info('📖 Read result:', readResult);

    if (readResult.success && readResult.data) {
      console.info('📊 Element data:', readResult.data);
    }
  } else {
    console.info('❌ Element not found');

    // You might want to retry or use the integration manager
    console.info(
      '💡 Tip: Use the integration manager for automatic element detection and monitoring'
    );
  }
}

// Example 4: Real-time monitoring setup
async function monitoringExample() {
  console.info('👀 Real-time Monitoring Example');

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
      console.info('🔄 Real-time update detected!');
      console.info('📊 New data:', newData);
      console.info('🕒 Timestamp:', new Date().toISOString());

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
    console.info('✅ Real-time monitoring started');

    // Monitor for 30 seconds as example
    setTimeout(() => {
      console.info('⏹️ Stopping monitoring example');
      monitor.cleanup();
    }, 30000);
  }
}

// Helper functions for the examples
function sendDataToBackend(data: any) {
  console.info('📤 Sending data to backend:', data);
  // Add your backend integration logic here
}

function updateDashboardMetrics(data: any) {
  console.info('📈 Updating dashboard metrics with:', data);
  // Add your dashboard update logic here
}

function checkForAlerts(data: any) {
  console.info('🚨 Checking for alerts in:', data);
  // Add your alert checking logic here
}

// Main example runner
export async function runSpecificElementExamples() {
  console.info('🎯 Running Specific Element Integration Examples');
  console.info('='.repeat(50));

  try {
    // Run examples sequentially
    await basicUsageExample();
    console.info('-'.repeat(30));

    await directHandlerExample();
    console.info('-'.repeat(30));

    // Uncomment to run advanced examples
    // await advancedUsageExample();
    // console.info('-'.repeat(30));

    // await monitoringExample();

    console.info('✅ All examples completed successfully');
  } catch (error) {
    console.error('❌ Example execution failed:', error);
  }
}

// Quick start function for immediate use
export async function quickStartSpecificElementIntegration() {
  console.info('🚀 Quick Start: Specific Element Integration');

  const client = new Fantasy42AgentClient({
    baseURL: 'https://api.fantasy42.com',
    token: 'your-api-token',
  });

  const manager = createSpecificElementManager(client);
  const success = await manager.initialize();

  if (success) {
    console.info('✅ Quick start successful!');
    console.info(
      '💡 You can now monitor the element at: /html/body/div[3]/div[5]/div/div[4]/div[7]/div'
    );

    // Return the manager for further use
    return manager;
  } else {
    console.info('❌ Quick start failed - element not found');
    return null;
  }
}

// Export everything for external use
export { basicUsageExample, advancedUsageExample, directHandlerExample, monitoringExample };
