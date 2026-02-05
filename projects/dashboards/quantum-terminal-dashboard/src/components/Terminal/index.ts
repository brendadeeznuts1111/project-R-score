/**
 * Terminal Components - Index
 * Export all terminal-related components and utilities
 */

export { PTYManager, ptyManager } from './PTYManager';
export type {
  TerminalDimensions,
  TerminalOptions,
  ManagedTerminal,
  TerminalEvent
} from './PTYManager';

export { FinancialTerminal } from './FinancialTerminal';
export type { FinancialTerminalProps } from './FinancialTerminal';

export { WebSocketTerminal } from './WebSocketTerminal';
export type {
  WebSocketTerminalProps,
  WebSocketTerminalHandle
} from './WebSocketTerminal';
