/**
 * CLI Framework
 * 
 * Unified command-line interface framework with:
 * - Argument parsing
 * - Progress indicators
 * - Colored output
 * - Plugin system
 */

export {
  UnifiedCLI,
  createCLI,
  ProgressBar,
  Spinner,
  renderTable,
  type CLIConfig,
  type CommandDefinition,
  type OptionDefinition,
  type ArgumentDefinition,
  type CommandContext,
  type CLIMiddleware,
  type ColorName,
} from './framework';

export { UnifiedCLI as default } from './framework';
