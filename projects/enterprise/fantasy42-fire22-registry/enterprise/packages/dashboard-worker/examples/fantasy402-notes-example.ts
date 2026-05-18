/**
 * Fantasy402 Player Notes Integration Example
 * Demonstrates how to use the XPath handler to interact with Fantasy402 player notes element
 */

import { createFantasy402NotesManager } from '../core/integrations/fantasy402-xpath-integration';
import { Fantasy402AgentClient } from '../src/api/fantasy402-agent-client';
import { handleFantasy402Element, findFantasy402Element } from '../core/ui/xpath-element-handler';

/**
 * Example: Basic Fantasy402 Player Notes Integration
 */
export async function basicFantasy402NotesExample() {
  console.info('🎯 Fantasy402 Player Notes Integration Example');

  // Initialize Fantasy402 client
  const client = new Fantasy402AgentClient('your-username', 'your-password');
  const initialized = await client.initialize();

  if (!initialized) {
    console.error('❌ Failed to initialize Fantasy402 client');
    return;
  }

  // Create notes manager
  const notesManager = createFantasy402NotesManager(client);

  // Initialize the integration
  const integrationReady = await notesManager.initialize();

  if (integrationReady) {
    console.info('✅ Fantasy402 Notes Integration Ready');
  } else {
    console.info(
      '⚠️ Fantasy402 element not found, integration will initialize when element appears'
    );
  }

  return notesManager;
}

/**
 * Example: Direct XPath Element Interaction
 */
export async function directXPathInteractionExample() {
  console.info('🎯 Direct XPath Element Interaction Example');

  // Wait for element to be available
  const waitForElement = () => {
    return new Promise<Element | null>(resolve => {
      const checkElement = () => {
        const element = findFantasy402Element();
        if (element) {
          resolve(element);
        } else {
          setTimeout(checkElement, 1000);
        }
      };
      checkElement();

      // Timeout after 10 seconds
      setTimeout(() => resolve(null), 10000);
    });
  };

  const element = await waitForElement();

  if (!element) {
    console.error('❌ Fantasy402 notes element not found within timeout');
    return;
  }

  console.info('✅ Fantasy402 notes element found:', element);

  // Example: Read current notes
  const readResult = await handleFantasy402Element('read');
  if (readResult.success) {
    console.info('📖 Current notes:', readResult.data);
  }

  // Example: Write new notes
  const newNotes = `Player Notes - Updated at ${new Date().toISOString()}

Key Information:
• VIP Gold status
• Excellent payment history
• Active lottery player
• Monitor spending patterns

Last Updated: ${new Date().toLocaleString()}`;

  const writeResult = await handleFantasy402Element('write', newNotes);
  if (writeResult.success) {
    console.info('✍️ Notes updated successfully');
  } else {
    console.error('❌ Failed to update notes:', writeResult.error);
  }

  // Example: Validate the content
  const validateResult = await handleFantasy402Element('validate', {
    required: true,
    minLength: 10,
    maxLength: 5000,
  });

  console.info('🔍 Validation result:', validateResult);
}

/**
 * Example: Fantasy402 Notes with Agent Workflow
 */
export async function fantasy402AgentWorkflowExample() {
  console.info('🎯 Fantasy402 Agent Workflow Example');

  // Initialize client and manager
  const client = new Fantasy402AgentClient('agent-username', 'agent-password');
  await client.initialize();

  const notesManager = createFantasy402NotesManager(client);

  // Simulate agent workflow
  const customerId = 'BBB9901'; // Bob's customer ID

  // 1. Load existing notes
  console.info('📝 Step 1: Loading existing notes...');
  const notesResult = await client.getPlayerNotes(customerId);

  if (notesResult.success) {
    console.info('📋 Current notes:', notesResult.playerNotes);
    console.info('📊 Notes history:', notesResult.noteHistory.length, 'entries');

    // Update the Fantasy402 element
    await handleFantasy402Element('write', notesResult.playerNotes);
  }

  // 2. Add a new note
  console.info('📝 Step 2: Adding new note...');
  const newNote = `Agent Session - ${new Date().toISOString()}

• Reviewed player's lottery activity
• Confirmed VIP Gold status
• Updated spending limits to $500 daily
• Player expressed satisfaction with service

Next Follow-up: Review lottery performance after next draw`;

  const addResult = await client.addPlayerNote(customerId, newNote, 'lottery');

  if (addResult.success) {
    console.info('✅ Note added successfully, ID:', addResult.noteId);

    // Update the element with the new note
    const updatedNotes = `${notesResult.playerNotes}\n\n--- New Entry ---\n${newNote}`;
    await handleFantasy402Element('write', updatedNotes);
  }

  // 3. Search for specific content
  console.info('🔍 Step 3: Searching notes...');
  const searchResult = await client.searchPlayerNotes('lottery', {
    customerID: customerId,
    limit: 5,
  });

  if (searchResult.success) {
    console.info('🔍 Found', searchResult.totalCount, 'matches');
    searchResult.results.forEach((result, index) => {
      console.info(`${index + 1}. ${result.customerName}: ${result.note.substring(0, 100)}...`);
    });
  }

  // 4. Get notes by category
  console.info('📊 Step 4: Getting notes by category...');
  const categoryResult = await client.getNotesByCategory('lottery', {
    customerID: customerId,
    limit: 10,
  });

  if (categoryResult.success) {
    console.info('🎲 Lottery-related notes:', categoryResult.totalCount);
  }

  console.info('✅ Agent workflow completed successfully');
}

/**
 * Example: Real-time Fantasy402 Element Monitoring
 */
export async function realTimeFantasy402MonitoringExample() {
  console.info('🎯 Real-time Fantasy402 Element Monitoring Example');

  // Monitor the element for changes
  const monitorElement = () => {
    const element = findFantasy402Element();

    if (element) {
      // Add event listeners for real-time monitoring
      element.addEventListener('input', e => {
        const target = e.target as HTMLTextAreaElement;
        console.info('📝 Real-time input:', target.value.length, 'characters');

        // Auto-save or validate in real-time
        if (target.value.length > 4800) {
          console.warn('⚠️ Approaching character limit');
        }
      });

      element.addEventListener('focus', () => {
        console.info('🎯 Element focused - starting session');
      });

      element.addEventListener('blur', async () => {
        console.info('🎯 Element blurred - auto-saving...');

        // Auto-save on blur
        const target = element as HTMLTextAreaElement;
        if (target.value.trim()) {
          const result = await handleFantasy402Element('read');
          if (result.success) {
            console.info('💾 Auto-saved notes');
          }
        }
      });

      console.info('✅ Real-time monitoring activated');
      return true;
    } else {
      console.info('⏳ Element not found, retrying...');
      return false;
    }
  };

  // Try to monitor immediately
  if (!monitorElement()) {
    // If not found, wait and retry
    const monitorInterval = setInterval(() => {
      if (monitorElement()) {
        clearInterval(monitorInterval);
      }
    }, 1000);

    // Stop after 30 seconds
    setTimeout(() => {
      clearInterval(monitorInterval);
      console.info('⏰ Stopped monitoring - element not found');
    }, 30000);
  }
}

/**
 * Example: Fantasy402 Element Integration with Dashboard
 */
export async function fantasy402DashboardIntegrationExample() {
  console.info('🎯 Fantasy402 Dashboard Integration Example');

  // This example shows how to integrate the Fantasy402 element
  // with a larger dashboard system

  const integrationConfig = {
    elementPath: '/html/body/div[3]/div[5]/div/div[5]/section/section/div/div/div/div[2]/div/div',
    features: {
      autoSync: true,
      realTimeUpdates: true,
      validation: true,
      auditTrail: true,
    },
    callbacks: {
      onChange: async (newValue: string) => {
        console.info('📝 Notes changed:', newValue.length, 'characters');

        // Validate content
        if (newValue.length > 5000) {
          console.warn('⚠️ Character limit exceeded');
          return false;
        }

        // Auto-save to backend
        const customerId = 'BBB9901'; // Get from context
        const client = new Fantasy402AgentClient('username', 'password');
        await client.initialize();

        const result = await client.updatePlayerNotes(customerId, newValue, 'general');
        return result.success;
      },
      onFocus: () => {
        console.info('🎯 Notes field focused - showing additional controls');
        // Could show character counter, save button, etc.
      },
      onBlur: () => {
        console.info('🎯 Notes field blurred - hiding additional controls');
        // Could hide additional controls
      },
      onSave: (success: boolean) => {
        if (success) {
          console.info('✅ Notes saved successfully');
        } else {
          console.error('❌ Failed to save notes');
        }
      },
    },
  };

  // Setup the integration
  const setupIntegration = async () => {
    const element = findFantasy402Element();

    if (element) {
      // Add event listeners based on config
      if (integrationConfig.features.autoSync) {
        element.addEventListener('input', async e => {
          const target = e.target as HTMLTextAreaElement;
          const success = await integrationConfig.callbacks.onChange(target.value);
          if (!success) {
            // Handle validation failure
            target.classList.add('is-invalid');
          } else {
            target.classList.remove('is-invalid');
          }
        });
      }

      if (integrationConfig.callbacks.onFocus) {
        element.addEventListener('focus', integrationConfig.callbacks.onFocus);
      }

      if (integrationConfig.callbacks.onBlur) {
        element.addEventListener('blur', integrationConfig.callbacks.onBlur);
      }

      console.info('✅ Fantasy402 dashboard integration complete');
      return true;
    } else {
      console.info('⏳ Element not found, integration will retry');
      return false;
    }
  };

  // Try to setup integration
  if (!(await setupIntegration())) {
    // Retry mechanism
    const retryInterval = setInterval(async () => {
      if (await setupIntegration()) {
        clearInterval(retryInterval);
      }
    }, 2000);

    setTimeout(() => {
      clearInterval(retryInterval);
      console.info('⏰ Integration setup timeout');
    }, 30000);
  }
}

/**
 * Example: Complete Fantasy402 Workflow
 */
export async function completeFantasy402WorkflowExample() {
  console.info('🎯 Complete Fantasy402 Workflow Example');

  try {
    // 1. Initialize components
    console.info('🚀 Step 1: Initializing components...');
    const notesManager = await basicFantasy402NotesExample();

    // 2. Setup direct interaction
    console.info('🔧 Step 2: Setting up direct interaction...');
    await directXPathInteractionExample();

    // 3. Run agent workflow
    console.info('👨‍💼 Step 3: Running agent workflow...');
    await fantasy402AgentWorkflowExample();

    // 4. Enable real-time monitoring
    console.info('📊 Step 4: Enabling real-time monitoring...');
    await realTimeFantasy402MonitoringExample();

    // 5. Integrate with dashboard
    console.info('🎛️ Step 5: Integrating with dashboard...');
    await fantasy402DashboardIntegrationExample();

    console.info('✅ Complete Fantasy402 workflow finished successfully!');
  } catch (error) {
    console.error('❌ Complete workflow failed:', error);
  }
}

// Export all examples for use
export {
  basicFantasy402NotesExample,
  directXPathInteractionExample,
  fantasy402AgentWorkflowExample,
  realTimeFantasy402MonitoringExample,
  fantasy402DashboardIntegrationExample,
  completeFantasy402WorkflowExample,
};
