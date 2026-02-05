/**
 * FactoryWager Column Configuration Types
 * TypeScript interfaces matching the TOML column configuration
 */

export interface ColumnConfig {
  name: string;
  type: ColumnType;
  minWidth: string;
  widthRatio: number;
  weight: number;
  align: Alignment;
  sortable: boolean;
  filterable: boolean;
  export: boolean;
  description: string;
  hidden?: boolean; // New field for visibility control
}

export interface ColumnVisibilityConfig {
  hidden: string[];
}

export type ColumnType =
  | 'identifier'
  | 'enum'
  | 'taxonomy'
  | 'owner'
  | 'text'
  | 'percent'
  | 'numeric'
  | 'trend'
  | 'severity'
  | 'array'
  | 'string'
  | 'duration'
  | 'fibonacci'
  | 'risk'
  | 'date'
  | 'datetime'
  | 'origin'
  | 'flags';

export type Alignment = 'left' | 'center' | 'right';

export interface ColumnConfiguration {
  columns: ColumnConfig[];
}

// Column type definitions with their specific behaviors
export interface ColumnTypeBehaviors {
  // Basic types
  identifier: {
    format: 'code';
    validation: '^[a-zA-Z0-9-]+$';
    examples: string[];
  };
  enum: {
    options: string[];
    colors: Record<string, string>;
    icons: Record<string, string>;
  };
  taxonomy: {
    hierarchy: boolean;
    multiSelect: boolean;
    autocomplete: boolean;
  };
  owner: {
    lookup: boolean;
    avatar: boolean;
    contact: boolean;
  };
  text: {
    multiline: boolean;
    maxLength: number;
    searchable: boolean;
  };
  percent: {
    min: number;
    max: number;
    showBar: boolean;
    thresholds: Record<string, number>;
  };
  numeric: {
    format: string;
    decimals: number;
    unit?: string;
  };
  trend: {
    values: Array<'↑' | '→' | '↓' | '↗' | '↘' | '◇'>;
    colors: Record<string, string>;
  };
  severity: {
    levels: Array<'critical' | 'high' | 'medium' | 'low' | 'info'>;
    colors: Record<string, string>;
    weights: Record<string, number>;
  };
  array: {
    separator: string;
    maxItems: number;
    unique: boolean;
  };
  string: {
    maxLength: number;
    pattern?: string;
    caseSensitive: boolean;
  };
  duration: {
    format: 'human' | 'iso' | 'seconds';
    allowEstimates: boolean;
  };
  fibonacci: {
    values: number[];
    showLabel: boolean;
  };
  risk: {
    levels: Array<'high' | 'medium' | 'low' | 'none'>;
    colors: Record<string, string>;
    impact: Record<string, string>;
  };
  date: {
    format: string;
    timezone: string;
    relative: boolean;
  };
  datetime: {
    format: string;
    timezone: string;
    relative: boolean;
    showTime: boolean;
  };
  origin: {
    types: Array<'manual' | 'api' | 'import' | 'sync'>;
    traceable: boolean;
  };
  flags: {
    maxFlags: number;
    predefined: string[];
    custom: boolean;
  };
}

// FactoryWager specific column configurations
export const FACTORYWAGER_COLUMNS: ColumnConfiguration = {
  columns: [
    {
      name: "id",
      type: "identifier",
      minWidth: "14ch",
      widthRatio: 1.0,
      weight: 600,
      align: "left",
      sortable: true,
      filterable: true,
      export: true,
      description: "Unique identifier"
    },
    {
      name: "status",
      type: "enum",
      minWidth: "10ch",
      widthRatio: 0.8,
      weight: 500,
      align: "center",
      sortable: true,
      filterable: true,
      export: true,
      description: "Current status"
    },
    {
      name: "priority",
      type: "enum",
      minWidth: "6ch",
      widthRatio: 0.5,
      weight: 500,
      align: "center",
      sortable: true,
      filterable: true,
      export: true,
      description: "Priority level"
    },
    {
      name: "category",
      type: "taxonomy",
      minWidth: "12ch",
      widthRatio: 1.0,
      weight: 400,
      align: "left",
      sortable: true,
      filterable: true,
      export: true,
      description: "Category classification"
    },
    {
      name: "owner",
      type: "owner",
      minWidth: "14ch",
      widthRatio: 1.2,
      weight: 400,
      align: "left",
      sortable: true,
      filterable: true,
      export: true,
      description: "Responsible party"
    },
    {
      name: "title",
      type: "text",
      minWidth: "30ch",
      widthRatio: 2.5,
      weight: 400,
      align: "left",
      sortable: true,
      filterable: true,
      export: true,
      description: "Summary title"
    },
    {
      name: "progress",
      type: "percent",
      minWidth: "8ch",
      widthRatio: 0.6,
      weight: 400,
      align: "right",
      sortable: true,
      filterable: true,
      export: true,
      description: "Completion percentage"
    },
    {
      name: "metric",
      type: "numeric",
      minWidth: "12ch",
      widthRatio: 1.0,
      weight: 400,
      align: "right",
      sortable: true,
      filterable: true,
      export: true,
      description: "Key metric value"
    },
    {
      name: "trend",
      type: "trend",
      minWidth: "6ch",
      widthRatio: 0.4,
      weight: 400,
      align: "center",
      sortable: true,
      filterable: true,
      export: true,
      description: "Trend direction"
    },
    {
      name: "severity",
      type: "severity",
      minWidth: "8ch",
      widthRatio: 0.6,
      weight: 500,
      align: "center",
      sortable: true,
      filterable: true,
      export: true,
      description: "Severity level"
    },
    {
      name: "tags",
      type: "array",
      minWidth: "18ch",
      widthRatio: 1.5,
      weight: 400,
      align: "left",
      sortable: true,
      filterable: true,
      export: true,
      description: "Associated tags"
    },
    {
      name: "component",
      type: "string",
      minWidth: "14ch",
      widthRatio: 1.2,
      weight: 400,
      align: "left",
      sortable: true,
      filterable: true,
      export: true,
      description: "Component name"
    },
    {
      name: "duration",
      type: "duration",
      minWidth: "10ch",
      widthRatio: 0.8,
      weight: 400,
      align: "right",
      sortable: true,
      filterable: true,
      export: true,
      description: "Time duration"
    },
    {
      name: "effort",
      type: "fibonacci",
      minWidth: "6ch",
      widthRatio: 0.4,
      weight: 400,
      align: "center",
      sortable: true,
      filterable: true,
      export: true,
      description: "Effort estimate"
    },
    {
      name: "risk",
      type: "risk",
      minWidth: "6ch",
      widthRatio: 0.4,
      weight: 400,
      align: "center",
      sortable: true,
      filterable: true,
      export: true,
      description: "Risk level"
    },
    {
      name: "dueDate",
      type: "date",
      minWidth: "11ch",
      widthRatio: 0.9,
      weight: 400,
      align: "right",
      sortable: true,
      filterable: true,
      export: true,
      description: "Due date"
    },
    {
      name: "created",
      type: "datetime",
      minWidth: "16ch",
      widthRatio: 1.4,
      weight: 400,
      align: "right",
      sortable: true,
      filterable: true,
      export: true,
      description: "Creation timestamp"
    },
    {
      name: "updated",
      type: "datetime",
      minWidth: "16ch",
      widthRatio: 1.4,
      weight: 400,
      align: "right",
      sortable: true,
      filterable: true,
      export: true,
      description: "Last update timestamp"
    },
    {
      name: "source",
      type: "origin",
      minWidth: "14ch",
      widthRatio: 1.2,
      weight: 400,
      align: "left",
      sortable: true,
      filterable: true,
      export: true,
      description: "Source origin"
    },
    {
      name: "flags",
      type: "flags",
      minWidth: "14ch",
      widthRatio: 1.2,
      weight: 400,
      align: "left",
      sortable: true,
      filterable: true,
      export: true,
      description: "Status flags"
    }
  ]
};

// Utility functions for column configuration
export function getColumnByName(name: string): ColumnConfig | undefined {
  return FACTORYWAGER_COLUMNS.columns.find(col => col.name === name);
}

export function getColumnsByType(type: ColumnType): ColumnConfig[] {
  return FACTORYWAGER_COLUMNS.columns.filter(col => col.type === type);
}

export function getSortableColumns(): ColumnConfig[] {
  return FACTORYWAGER_COLUMNS.columns.filter(col => col.sortable);
}

export function getFilterableColumns(): ColumnConfig[] {
  return FACTORYWAGER_COLUMNS.columns.filter(col => col.filterable);
}

export function getExportableColumns(): ColumnConfig[] {
  return FACTORYWAGER_COLUMNS.columns.filter(col => col.export);
}

// Visibility management functions
export function getVisibleColumns(hiddenColumns?: string[]): ColumnConfig[] {
  const hidden = hiddenColumns || [];
  return FACTORYWAGER_COLUMNS.columns.filter(col => !hidden.includes(col.name));
}

export function getHiddenColumns(hiddenColumns?: string[]): ColumnConfig[] {
  const hidden = hiddenColumns || [];
  return FACTORYWAGER_COLUMNS.columns.filter(col => hidden.includes(col.name));
}

export function applyColumnVisibility(columns: ColumnConfig[], hiddenColumns: string[]): ColumnConfig[] {
  return columns.map(col => ({
    ...col,
    hidden: hiddenColumns.includes(col.name)
  }));
}

// Default visibility configuration
export const DEFAULT_HIDDEN_COLUMNS = [
  "category",
  "owner",
  "metric",
  "trend",
  "tags",
  "duration",
  "effort",
  "risk",
  "created",
  "updated",
  "source"
];

// Get columns with default visibility applied
export function getDefaultVisibleColumns(): ColumnConfig[] {
  return getVisibleColumns(DEFAULT_HIDDEN_COLUMNS);
}

// Get columns with default visibility flags applied
export function getColumnsWithDefaultVisibility(): ColumnConfig[] {
  return applyColumnVisibility(FACTORYWAGER_COLUMNS.columns, DEFAULT_HIDDEN_COLUMNS);
}

// Column formatting utilities
export function formatColumnValue(columnName: string, value: any): string {
  const column = getColumnByName(columnName);
  if (!column) return String(value);

  switch (column.type) {
    case 'percent':
      return `${value}%`;
    case 'fibonacci':
      return `${value}sp`;
    case 'date':
      return new Date(value).toLocaleDateString();
    case 'datetime':
      return new Date(value).toLocaleString();
    case 'trend':
      return value || '→';
    case 'severity':
      return value || 'medium';
    case 'risk':
      return value || 'none';
    default:
      return String(value);
  }
}

export function getColumnAlignment(columnName: string): Alignment {
  const column = getColumnByName(columnName);
  return column?.align || 'left';
}

export function getColumnWidth(columnName: string, totalWidth: number): number {
  const column = getColumnByName(columnName);
  if (!column) return 100;

  const totalRatio = FACTORYWAGER_COLUMNS.columns.reduce((sum, col) => sum + col.widthRatio, 0);
  return Math.floor((column.widthRatio / totalRatio) * totalWidth);
}
