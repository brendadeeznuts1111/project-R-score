/**
 * Fantasy402 XPath Integration - Handles the specific player notes element
 * Integrates with: /html/body/div[3]/div[5]/div/div[5]/section/section/div/div/div/div[2]/div/div
 */

import {
  XPathElementHandler,
  handleFantasy402Element,
  findFantasy402Element,
} from '../ui/xpath-element-handler';
import { Fantasy402AgentClient } from '../../src/api/fantasy402-agent-client';

export interface Fantasy402NotesIntegration {
  client: Fantasy402AgentClient;
  xpathHandler: XPathElementHandler;
  elementPath: string;
}

export class Fantasy402NotesManager {
  private client: Fantasy402AgentClient;
  private xpathHandler: XPathElementHandler;
  private elementPath: string;
  private isInitialized: boolean = false;

  constructor(client: Fantasy402AgentClient) {
    this.client = client;
    this.xpathHandler = XPathElementHandler.getInstance();
    this.elementPath =
      '/html/body/div[3]/div[5]/div/div[5]/section/section/div/div/div/div[2]/div/div';
  }

  /**
   * Initialize the Fantasy402 notes integration
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🎯 Initializing Fantasy402 Notes Integration...');

      // Wait for the page to be fully loaded
      if (document.readyState !== 'complete') {
        await new Promise(resolve => {
          window.addEventListener('load', resolve);
          // Fallback timeout
          setTimeout(resolve, 5000);
        });
      }

      // Check if the element exists
      const element = findFantasy402Element();
      if (!element) {
        console.warn('⚠️ Fantasy402 notes element not found, will retry on DOM changes');
        this.setupDOMWatcher();
        return false;
      }

      // Setup event listeners
      this.setupElementListeners(element);

      // Load initial notes if customer is available
      await this.loadInitialNotes();

      this.isInitialized = true;
      console.log('✅ Fantasy402 Notes Integration initialized successfully');

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Fantasy402 Notes Integration:', error);
      return false;
    }
  }

  /**
   * Setup DOM watcher for when the element appears
   */
  private setupDOMWatcher(): void {
    const observer = new MutationObserver(async mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          const element = findFantasy402Element();
          if (element && !this.isInitialized) {
            console.log('🎯 Fantasy402 notes element found via DOM watcher');
            observer.disconnect();
            await this.initialize();
            break;
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Fallback: check periodically
    const checkInterval = setInterval(async () => {
      const element = findFantasy402Element();
      if (element && !this.isInitialized) {
        console.log('🎯 Fantasy402 notes element found via interval check');
        clearInterval(checkInterval);
        await this.initialize();
      }
    }, 1000);

    // Clear interval after 30 seconds
    setTimeout(() => clearInterval(checkInterval), 30000);
  }

  /**
   * Setup event listeners for the notes element
   */
  private setupElementListeners(element: Element): void {
    // Handle input changes
    element.addEventListener('input', this.handleNotesInput.bind(this));
    element.addEventListener('change', this.handleNotesChange.bind(this));

    // Handle focus/blur for auto-save
    element.addEventListener('focus', this.handleNotesFocus.bind(this));
    element.addEventListener('blur', this.handleNotesBlur.bind(this));

    // Handle keyboard shortcuts
    element.addEventListener('keydown', this.handleNotesKeydown.bind(this));

    console.log('✅ Event listeners setup for Fantasy402 notes element');
  }

  /**
   * Load initial notes data
   */
  private async loadInitialNotes(): Promise<void> {
    try {
      // Get current customer ID from the page context
      const customerId = this.extractCustomerIdFromPage();

      if (customerId) {
        console.log(`📝 Loading notes for customer: ${customerId}`);

        const notesResult = await this.client.getPlayerNotes(customerId);

        if (notesResult.success) {
          // Update the element with the notes
          await handleFantasy402Element('write', notesResult.playerNotes);

          console.log('✅ Initial notes loaded into Fantasy402 element');
        } else {
          console.warn('⚠️ Failed to load initial notes:', notesResult.error);
        }
      } else {
        console.log('ℹ️ No customer ID found, skipping initial notes load');
      }
    } catch (error) {
      console.error('❌ Failed to load initial notes:', error);
    }
  }

  /**
   * Handle notes input changes
   */
  private async handleNotesInput(event: Event): Promise<void> {
    const target = event.target as HTMLTextAreaElement;
    const notes = target.value;

    // Update character count if available
    this.updateCharacterCount(notes.length);

    // Auto-save after a delay
    this.scheduleAutoSave(notes);
  }

  /**
   * Handle notes change events
   */
  private async handleNotesChange(event: Event): Promise<void> {
    const target = event.target as HTMLTextAreaElement;
    const notes = target.value;

    console.log(`📝 Notes changed (${notes.length} characters)`);

    // Immediate validation
    const validation = this.validateNotes(notes);
    this.showValidationStatus(validation);

    // Save if valid
    if (validation.isValid) {
      await this.saveNotes(notes);
    }
  }

  /**
   * Handle notes focus
   */
  private handleNotesFocus(event: Event): void {
    console.log('📝 Notes element focused');
    // Could highlight the element or show additional controls
  }

  /**
   * Handle notes blur
   */
  private async handleNotesBlur(event: Event): Promise<void> {
    const target = event.target as HTMLTextAreaElement;
    const notes = target.value;

    console.log('📝 Notes element blurred');

    // Save on blur if changed
    if (this.hasNotesChanged(notes)) {
      await this.saveNotes(notes);
    }
  }

  /**
   * Handle keyboard shortcuts
   */
  private async handleNotesKeydown(event: KeyboardEvent): Promise<void> {
    const target = event.target as HTMLTextAreaElement;

    // Ctrl+S to save
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      const notes = target.value;
      await this.saveNotes(notes);
    }

    // Ctrl+Z to undo (if we implement undo functionality)
    if (event.ctrlKey && event.key === 'z') {
      event.preventDefault();
      this.undoLastChange();
    }
  }

  /**
   * Save notes to Fantasy402
   */
  private async saveNotes(notes: string): Promise<void> {
    try {
      const customerId = this.extractCustomerIdFromPage();

      if (!customerId) {
        console.warn('⚠️ No customer ID available for saving notes');
        return;
      }

      console.log(`💾 Saving notes for customer: ${customerId}`);

      // Determine category based on content analysis
      const category = this.determineNotesCategory(notes);

      const result = await this.client.updatePlayerNotes(customerId, notes, category);

      if (result.success) {
        console.log('✅ Notes saved successfully');
        this.showSaveStatus('success', 'Notes saved successfully');

        // Update last saved timestamp
        this.updateLastSavedTime();
      } else {
        console.error('❌ Failed to save notes:', result.error);
        this.showSaveStatus('error', result.error || 'Failed to save notes');
      }
    } catch (error) {
      console.error('❌ Error saving notes:', error);
      this.showSaveStatus('error', 'Error saving notes');
    }
  }

  /**
   * Schedule auto-save
   */
  private scheduleAutoSave(notes: string): void {
    // Clear existing timer
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    // Schedule new auto-save
    this.autoSaveTimer = setTimeout(async () => {
      if (this.hasNotesChanged(notes)) {
        await this.saveNotes(notes);
      }
    }, 3000); // 3 second delay
  }

  private autoSaveTimer: NodeJS.Timeout | null = null;

  /**
   * Check if notes have changed
   */
  private hasNotesChanged(notes: string): boolean {
    // This would compare with the last saved version
    // For now, we'll assume they changed
    return true;
  }

  /**
   * Validate notes content
   */
  private validateNotes(notes: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (notes.length > 5000) {
      errors.push('Notes cannot exceed 5000 characters');
    }

    // Check for inappropriate content (basic check)
    const inappropriateWords = ['spam', 'scam', 'fraud'];
    const lowerNotes = notes.toLowerCase();
    for (const word of inappropriateWords) {
      if (lowerNotes.includes(word)) {
        errors.push(`Potentially inappropriate content detected: ${word}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Determine notes category based on content
   */
  private determineNotesCategory(
    notes: string
  ): 'general' | 'complaint' | 'praise' | 'warning' | 'suspension' | 'vip' | 'risk' | 'lottery' {
    const lowerNotes = notes.toLowerCase();

    if (
      lowerNotes.includes('complaint') ||
      lowerNotes.includes('unhappy') ||
      lowerNotes.includes('problem')
    ) {
      return 'complaint';
    }

    if (
      lowerNotes.includes('excellent') ||
      lowerNotes.includes('great') ||
      lowerNotes.includes('wonderful') ||
      lowerNotes.includes('amazing')
    ) {
      return 'praise';
    }

    if (
      lowerNotes.includes('warning') ||
      lowerNotes.includes('caution') ||
      lowerNotes.includes('attention') ||
      lowerNotes.includes('monitor')
    ) {
      return 'warning';
    }

    if (
      lowerNotes.includes('suspend') ||
      lowerNotes.includes('suspension') ||
      lowerNotes.includes('blocked')
    ) {
      return 'suspension';
    }

    if (
      lowerNotes.includes('vip') ||
      lowerNotes.includes('premium') ||
      lowerNotes.includes('gold') ||
      lowerNotes.includes('platinum')
    ) {
      return 'vip';
    }

    if (
      lowerNotes.includes('risk') ||
      lowerNotes.includes('fraud') ||
      lowerNotes.includes('suspicious')
    ) {
      return 'risk';
    }

    if (
      lowerNotes.includes('lottery') ||
      lowerNotes.includes('lotto') ||
      lowerNotes.includes('powerball') ||
      lowerNotes.includes('mega')
    ) {
      return 'lottery';
    }

    return 'general';
  }

  /**
   * Extract customer ID from the page
   */
  private extractCustomerIdFromPage(): string | null {
    // Try different methods to find customer ID

    // 1. Look for data attributes
    const element = findFantasy402Element();
    if (element) {
      const customerId =
        element.getAttribute('data-customer-id') ||
        element.getAttribute('data-player-id') ||
        element.closest('[data-customer-id]')?.getAttribute('data-customer-id');
      if (customerId) return customerId;
    }

    // 2. Look for customer ID in URL
    const urlParams = new URLSearchParams(window.location.search);
    const customerId =
      urlParams.get('customerId') || urlParams.get('playerId') || urlParams.get('id');
    if (customerId) return customerId;

    // 3. Look for customer ID in form fields
    const customerIdField = document.querySelector(
      'input[name="customerId"], input[name="playerId"], input[name="customer_id"]'
    ) as HTMLInputElement;
    if (customerIdField && customerIdField.value) {
      return customerIdField.value;
    }

    // 4. Look for customer ID in page title or headings
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    for (const heading of headings) {
      const text = heading.textContent || '';
      const match =
        text.match(/Customer[:\s]+([A-Z0-9]+)/i) || text.match(/Player[:\s]+([A-Z0-9]+)/i);
      if (match) return match[1];
    }

    return null;
  }

  /**
   * Update character count display
   */
  private updateCharacterCount(count: number): void {
    const counterElement = document.querySelector('#notes-character-count');
    if (counterElement) {
      counterElement.textContent = `${count}/5000`;

      // Update styling based on count
      counterElement.classList.remove('text-warning', 'text-danger');
      if (count > 4500) {
        counterElement.classList.add('text-warning');
      }
      if (count > 4800) {
        counterElement.classList.add('text-danger');
      }
    }
  }

  /**
   * Show validation status
   */
  private showValidationStatus(validation: { isValid: boolean; errors: string[] }): void {
    const element = findFantasy402Element();
    if (!element) return;

    // Remove existing validation classes
    element.classList.remove('is-valid', 'is-invalid');

    // Add appropriate class
    element.classList.add(validation.isValid ? 'is-valid' : 'is-invalid');

    // Show/hide error messages
    const errorContainer = element.parentElement?.querySelector('.notes-errors');
    if (errorContainer) {
      if (validation.errors.length > 0) {
        errorContainer.innerHTML = validation.errors
          .map(error => `<div class="text-danger">${error}</div>`)
          .join('');
        errorContainer.style.display = 'block';
      } else {
        errorContainer.style.display = 'none';
      }
    }
  }

  /**
   * Show save status
   */
  private showSaveStatus(type: 'success' | 'error', message: string): void {
    const statusElement = document.querySelector('#notes-save-status');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `alert alert-${type === 'success' ? 'success' : 'danger'}`;
      statusElement.style.display = 'block';

      // Hide after 3 seconds
      setTimeout(() => {
        statusElement.style.display = 'none';
      }, 3000);
    }
  }

  /**
   * Update last saved time
   */
  private updateLastSavedTime(): void {
    const timeElement = document.querySelector('#notes-last-saved');
    if (timeElement) {
      const now = new Date();
      timeElement.textContent = `Last saved: ${now.toLocaleTimeString()}`;
    }
  }

  /**
   * Undo last change (placeholder for future implementation)
   */
  private undoLastChange(): void {
    console.log('🔄 Undo functionality not yet implemented');
    // Future: implement undo/redo functionality
  }

  /**
   * Get integration status
   */
  getStatus(): {
    isInitialized: boolean;
    elementFound: boolean;
    customerId: string | null;
    lastActivity: string;
  } {
    return {
      isInitialized: this.isInitialized,
      elementFound: findFantasy402Element() !== null,
      customerId: this.extractCustomerIdFromPage(),
      lastActivity: new Date().toISOString(),
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    this.xpathHandler.cleanup();
    console.log('🧹 Fantasy402 Notes Manager cleaned up');
  }
}

// Convenience functions
export const createFantasy402NotesManager = (
  client: Fantasy402AgentClient
): Fantasy402NotesManager => {
  return new Fantasy402NotesManager(client);
};

export const initializeFantasy402Notes = async (
  client: Fantasy402AgentClient
): Promise<boolean> => {
  const manager = new Fantasy402NotesManager(client);
  return await manager.initialize();
};

// Export types
export type { Fantasy402NotesIntegration };
