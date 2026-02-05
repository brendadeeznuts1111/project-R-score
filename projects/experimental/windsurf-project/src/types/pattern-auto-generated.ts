  /**
   * Basic keyboard shortcut pattern
   * @category core
   * @complexity simple
   * @example
   * ```typescript
   * registerShortcut("ctrl+s", () => saveFile());
   * ```
   */
  export type BasicShortcut = (key: string, callback: Function, options?: ShortcutOptions) => void;

  /**
   * Multi-key sequence pattern
   * @category advanced
   * @complexity intermediate
   * @example
   * ```typescript
   * registerSequence(["g", "i"], () => gotoInbox());
   * ```
   */
  export type KeySequence = (keys: string[], callback: Function, timeout?: number) => void;

  /**
   * Shortcut that executes based on conditions
   * @category advanced
   * @complexity advanced
   * @example
   * ```typescript
   * registerConditional("ctrl+shift+p", [isEditorFocused], openCommandPalette);
   * ```
   */
  export type ConditionalShortcut = (key: string, conditions: ShortcutCondition[], callback: Function) => void;

  /**
   * Quantum-enhanced shortcut with superposition
   * @category quantum
   * @complexity expert
   * @example
   * ```typescript
   * registerQuantum(["ctrl+s", "cmd+s"], saveFile, { superposition: true });
   * ```
   */
  export type QuantumShortcut = (keys: string[], callback: Function, quantumOptions?: QuantumOptions) => void;

  /**
   * AI-powered shortcut that learns from user behavior
   * @category ai
   * @complexity expert
   * @example
   * ```typescript
   * registerNeural("ctrl+k", { learning: true, adaptive: true }, smartSearch);
   * ```
   */
  export type NeuralShortcut = (baseKey: string, neuralOptions: NeuralOptions, callback: Function) => void;