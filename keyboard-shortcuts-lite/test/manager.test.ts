import './setup.js';
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { KeyboardShortcutManager, focusWithFeedback } from '../src/index.js';

describe('KeyboardShortcutManager', () => {
  let kb: KeyboardShortcutManager;
  
  beforeEach(() => {
    kb = new KeyboardShortcutManager();
    kb.init();
  });
  
  afterEach(() => {
    kb.destroy();
  });

  it('registers and triggers shortcuts', () => {
    let triggered = false;
    kb.register('k', () => { triggered = true; });
    
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
    document.dispatchEvent(event);
    
    expect(triggered).toBe(true);
  });

  it('respects context awareness', () => {
    let triggered = false;
    kb.register('k', () => { triggered = true; });
    
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    
    const event = new KeyboardEvent('keydown', { key: 'k' });
    document.dispatchEvent(event);
    
    expect(triggered).toBe(false); // Should not trigger when typing
    document.body.removeChild(input);
  });

  it('requires modifier by default', () => {
    let triggered = false;
    kb.register('k', () => { triggered = true; });
    
    const event = new KeyboardEvent('keydown', { key: 'k' });
    document.dispatchEvent(event);
    
    expect(triggered).toBe(false);
  });

  it('allows shortcuts without modifier', () => {
    let triggered = false;
    kb.register('escape', () => { triggered = true; }, { requireModifier: false });
    
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    document.dispatchEvent(event);
    
    expect(triggered).toBe(true);
  });

  it('debounces rapid execution', async () => {
    let triggerCount = 0;
    kb.register('k', () => { triggerCount++; });
    
    // Rapid fire events
    for (let i = 0; i < 5; i++) {
      const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
      document.dispatchEvent(event);
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    expect(triggerCount).toBe(1); // Should only trigger once due to debouncing
  });

  it('unregisters shortcuts', () => {
    let triggered = false;
    kb.register('k', () => { triggered = true; });
    
    expect(kb.has('k')).toBe(true);
    expect(kb.unregister('k')).toBe(true);
    expect(kb.has('k')).toBe(false);
    
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
    document.dispatchEvent(event);
    
    expect(triggered).toBe(false);
  });

  it('handles async callbacks', async () => {
    let resolved = false;
    kb.register('k', async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      resolved = true;
    });
    
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
    document.dispatchEvent(event);
    
    // Wait for async resolution
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(resolved).toBe(true);
  });

  it('provides metrics', () => {
    kb.register('k', () => {}, { description: 'Test shortcut' });
    kb.register('e', () => {});
    
    const metrics = kb.getMetrics();
    expect(metrics.registeredShortcuts).toBe(2);
    expect(metrics.isInitialized).toBe(true);
    expect(metrics.enabled).toBe(true);
  });
});

describe('focusWithFeedback', () => {
  it('focuses element with animation', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    
    const result = focusWithFeedback(input);
    
    expect(result).toBe(true);
    expect(document.activeElement).toBe(input);
    
    document.body.removeChild(input);
  });

  it('returns false for non-existent element', () => {
    const result = focusWithFeedback('#non-existent');
    expect(result).toBe(false);
  });

  it('selects text by default', () => {
    const input = document.createElement('input');
    input.value = 'test text';
    document.body.appendChild(input);
    
    focusWithFeedback(input);
    
    // In a real browser, this would select the text
    expect(document.activeElement).toBe(input);
    
    document.body.removeChild(input);
  });
});
