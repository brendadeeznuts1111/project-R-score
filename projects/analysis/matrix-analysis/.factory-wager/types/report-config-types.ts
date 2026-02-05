/**
 * FactoryWager Report Configuration Types
 * TypeScript interfaces matching the comprehensive TOML configuration
 */

// Column configuration types
export interface ColumnConfig {
  name: string;
  type: ColumnType;
  min_width: number;
  width_ratio: number;
  weight: number;
  align: Alignment;
  sortable: boolean;
  filterable: boolean;
  export: boolean;
  description: string;
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

// Enum value types
export interface StatusEnumValue {
  color: string;
  icon: string;
}

export interface PriorityEnumValue {
  color: string;
  icon: string;
  order: number;
}

export interface TrendEnumValue {
  icon: string;
  meaning: string;
}

export interface SeverityEnumValue {
  color: string;
  response: string;
}

export interface RiskEnumValue {
  color: string;
  impact: string;
  probability: string;
}

export interface EffortEnumValue {
  points: number;
  complexity: string;
}

// Enum configurations
export interface EnumsConfig {
  status: Record<string, StatusEnumValue>;
  priority: Record<string, PriorityEnumValue>;
  trend: Record<string, TrendEnumValue>;
  severity: Record<string, SeverityEnumValue>;
  risk: Record<string, RiskEnumValue>;
  effort: Record<string, EffortEnumValue>;
}

// View configuration
export interface ViewConfig {
  default: {
    columns: string[];
  };
  pinned: {
    left: string[];
  };
  hidden: {
    columns: string[];
  };
}

// Sort configuration
export interface SortColumnConfig {
  column: string;
  direction: 'asc' | 'desc';
}

export interface SortConfig {
  nulls: 'first' | 'last';
  columns: SortColumnConfig[];
}

// Filter configuration
export interface FilterPresetConfig {
  column: string;
  operator: 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte' | 'in' | 'contains';
  value: string | string[] | number;
}

export interface FilterConfig {
  presets: Record<string, FilterPresetConfig>;
}

// Grouping configuration
export interface GroupingPresetConfig {
  column: string;
  collapsed: boolean;
}

export interface GroupingConfig {
  presets: Record<string, GroupingPresetConfig>;
}

// Export configuration
export interface ExportConfig {
  csv: {
    enabled: boolean;
    delimiter: string;
    quote: string;
    headers: boolean;
  };
  json: {
    enabled: boolean;
  };
  markdown: {
    enabled: boolean;
  };
  excel: {
    enabled: boolean;
  };
}

// Theme configuration
export interface ThemeColors {
  text: string;
  border: string;
  header_bg: string;
  row_hover: string;
  row_alt: string;
  status: {
    pending: string;
    in_progress: string;
    review: string;
    completed: string;
    blocked: string;
  };
  priority: {
    P0: string;
    P1: string;
    P2: string;
    P3: string;
    P4: string;
  };
}

export interface ThemeConfig {
  mode: 'light' | 'dark';
  colors: ThemeColors;
}

// Typography configuration
export interface TypographyFonts {
  sans: string[];
  mono: string[];
}

export interface TypographyConfig {
  font_size: string;
  line_height: number;
  cell_padding_x: number;
  cell_padding_y: number;
  fonts: TypographyFonts;
}

// Performance configuration
export interface PerformanceConfig {
  render_max_ms: number;
  filter_sort_max_ms: number;
  virtual_scroll_fps: number;
}

export interface VirtualScrollConfig {
  item_height: number;
  overscan: number;
  container_height: number;
}

// Accessibility configuration
export interface AccessibilityConfig {
  enabled: boolean;
  keyboard_nav: boolean;
  announce_changes: boolean;
  reduced_motion: boolean;
}

// Use case configuration
export interface UseCaseConfig {
  columns: string[];
}

// Schema configuration
export interface SchemaRowConfig {
  required: string[];
  status?: {
    enum: string[];
  };
  priority?: {
    pattern: string;
  };
  progress?: {
    min: number;
    max: number;
  };
}

export interface SchemaConfig {
  version: string;
  row: SchemaRowConfig;
}

// Main report configuration interface
export interface ReportConfig {
  columns: Record<string, ColumnConfig>;
  enums: EnumsConfig;
  view: ViewConfig;
  sort: SortConfig;
  filter: FilterConfig;
  grouping: GroupingConfig;
  export: ExportConfig;
  theme: ThemeConfig;
  typography: TypographyConfig;
  performance: PerformanceConfig;
  virtual_scroll: VirtualScrollConfig;
  a11y: AccessibilityConfig;
  use_cases: Record<string, UseCaseConfig>;
  schema: SchemaConfig;
}

// Utility functions for working with the configuration
export class ReportConfigManager {
  private config: ReportConfig;

  constructor(config: ReportConfig) {
    this.config = config;
  }

  // Get column configuration by name
  getColumn(name: string): ColumnConfig | undefined {
    return this.config.columns[name];
  }

  // Get all visible columns (not in hidden list)
  getVisibleColumns(): ColumnConfig[] {
    const hiddenColumns = new Set(this.config.view.hidden.columns);
    return Object.values(this.config.columns).filter(col => !hiddenColumns.has(col.name));
  }

  // Get columns for a specific use case
  getUseCaseColumns(useCase: string): ColumnConfig[] {
    const useCaseConfig = this.config.use_cases[useCase];
    if (!useCaseConfig) return this.getVisibleColumns();

    return useCaseConfig.columns.map(name => this.getColumn(name)).filter(Boolean) as ColumnConfig[];
  }

  // Get enum value with styling
  getEnumValue(enumType: keyof EnumsConfig, value: string): any {
    return this.config.enums[enumType]?.[value];
  }

  // Get sort configuration
  getSortConfig(): SortConfig {
    return this.config.sort;
  }

  // Get filter presets
  getFilterPresets(): FilterConfig {
    return this.config.filter;
  }

  // Get theme colors
  getThemeColors(): ThemeColors {
    return this.config.theme.colors;
  }

  // Validate data against schema
  validateRow(data: Record<string, any>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const schema = this.config.schema.row;

    // Check required fields
    for (const field of schema.required) {
      if (!data[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate status enum
    if (data.status && schema.status?.enum) {
      if (!schema.status.enum.includes(data.status)) {
        errors.push(`Invalid status: ${data.status}`);
      }
    }

    // Validate priority pattern
    if (data.priority && schema.priority?.pattern) {
      const regex = new RegExp(schema.priority.pattern);
      if (!regex.test(data.priority)) {
        errors.push(`Invalid priority format: ${data.priority}`);
      }
    }

    // Validate progress range
    if (data.progress !== undefined && schema.progress) {
      const progress = Number(data.progress);
      if (progress < schema.progress.min || progress > schema.progress.max) {
        errors.push(`Progress must be between ${schema.progress.min} and ${schema.progress.max}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Get column width calculation
  calculateColumnWidth(columnName: string, totalWidth: number): number {
    const column = this.getColumn(columnName);
    if (!column) return 100;

    const visibleColumns = this.getVisibleColumns();
    const totalRatio = visibleColumns.reduce((sum, col) => sum + col.width_ratio, 0);

    return Math.floor((column.width_ratio / totalRatio) * totalWidth);
  }

  // Format cell value based on column type and enum configuration
  formatCellValue(columnName: string, value: any): string {
    const column = this.getColumn(columnName);
    if (!column) return String(value);

    switch (column.type) {
      case 'enum':
        if (columnName === 'status') {
          const enumValue = this.getEnumValue('status', value);
          return enumValue ? `${enumValue.icon} ${value}` : String(value);
        }
        if (columnName === 'priority') {
          const enumValue = this.getEnumValue('priority', value);
          return enumValue ? `${enumValue.icon} ${value}` : String(value);
        }
        return String(value);

      case 'percent':
        const progress = Number(value);
        const filled = Math.round(progress / 10);
        const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
        return `${bar} ${progress}%`;

      case 'trend':
        const trendValue = this.getEnumValue('trend', value);
        return trendValue ? trendValue.icon : '→';

      case 'severity':
        const severityValue = this.getEnumValue('severity', value);
        return severityValue ? `${value}` : String(value);

      case 'risk':
        const riskValue = this.getEnumValue('risk', value);
        return riskValue ? `${value}` : String(value);

      case 'fibonacci':
        return `${value}sp`;

      case 'date':
      case 'datetime':
        return new Date(value).toLocaleDateString();

      case 'array':
        return Array.isArray(value) ? value.join(', ') : String(value);

      default:
        return String(value);
    }
  }
}

// Default configuration loader
export async function loadReportConfig(configPath: string = './.factory-wager/config/report-config.toml'): Promise<ReportConfig> {
  try {
    // Import TOML configuration using Bun's native TOML support
    const config = await import(configPath, { with: { type: 'toml' } }) as { default: ReportConfig };
    return config.default;
  } catch (error) {
    throw new Error(`Failed to load report configuration: ${error}`);
  }
}
