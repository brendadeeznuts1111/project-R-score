// LSP Dashboard Types

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Diagnostic {
  range: Range;
  severity: 'error' | 'warning' | 'info' | 'hint';
  code?: string;
  source?: string;
  message: string;
  relatedInformation?: DiagnosticRelatedInformation[];
  tags?: DiagnosticTag[];
}

export interface DiagnosticRelatedInformation {
  location: Location;
  message: string;
}

export interface Location {
  uri: string;
  range: Range;
}

export enum DiagnosticTag {
  Unnecessary = 1,
  Deprecated = 2,
}

export interface CompletionItem {
  label: string;
  kind: CompletionItemKind;
  detail?: string;
  documentation?: string;
  insertText?: string;
  filterText?: string;
  sortText?: string;
  additionalTextEdits?: TextEdit[];
}

export enum CompletionItemKind {
  Text = 1,
  Method = 2,
  Function = 3,
  Constructor = 4,
  Field = 5,
  Variable = 6,
  Class = 7,
  Interface = 8,
  Module = 9,
  Property = 10,
  Unit = 11,
  Value = 12,
  Enum = 13,
  Keyword = 14,
  Snippet = 15,
  Color = 16,
  File = 17,
  Reference = 18,
  Folder = 19,
  EnumMember = 20,
  Constant = 21,
  Struct = 22,
  Event = 23,
  Operator = 24,
  TypeParameter = 25,
}

export interface TextEdit {
  range: Range;
  newText: string;
}

export interface LSPPerformance {
  responseTime: number; // in milliseconds
  memoryUsage: number; // in bytes
  cpuUsage: number; // percentage
  requestCount: number;
  errorCount: number;
}

export interface ThemeConfig {
  mode: 'light' | 'dark';
  primaryColor: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
}

export interface LSPClientConfig {
  serverCommand: string[];
  serverArgs: string[];
  initializationOptions?: Record<string, any>;
  workspaceFolders?: string[];
}

export interface LSPCapabilities {
  textDocumentSync?: number;
  completionProvider?: {
    resolveProvider?: boolean;
    triggerCharacters?: string[];
  };
  diagnosticProvider?: {
    interFileDependencies?: boolean;
    workspaceDiagnostics?: boolean;
  };
  codeActionProvider?: boolean;
  formattingProvider?: boolean;
}

export interface LSPServerInfo {
  name: string;
  version?: string;
  capabilities: LSPCapabilities;
}

export interface QuickFix {
  title: string;
  edit: WorkspaceEdit;
  kind?: string;
  isPreferred?: boolean;
}

export interface WorkspaceEdit {
  changes?: Record<string, TextEdit[]>;
  documentChanges?: TextDocumentEdit[];
}

export interface TextDocumentEdit {
  textDocument: OptionalVersionedTextDocumentIdentifier;
  edits: TextEdit[];
}

export interface OptionalVersionedTextDocumentIdentifier {
  uri: string;
  version?: number;
}

export interface LSPEvent {
  type: 'diagnostic' | 'completion' | 'performance' | 'error';
  data: any;
  timestamp: number;
}

export interface LSPClientState {
  isConnected: boolean;
  isInitialized: boolean;
  serverInfo?: LSPServerInfo;
  activeFile?: string;
  lastActivity: number;
}
