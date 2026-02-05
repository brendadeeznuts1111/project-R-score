// Feed Project - Types
// Based on field-mapping/System.md specification

export type MetaTag =
  | "DOMAIN"
  | "DYNAMIC"
  | "RELATIVE"
  | "ACTIVE"
  | "CATEGORY"
  | "VERSION"
  | "DESCRIPTION"
  | "TAGS";

export interface FieldMapping {
  field: string;
  pre: string | null;
  post: string;
  metaTag: MetaTag;
  hslColor: string;
}

export interface DashboardConfig {
  id: string;
  path: string;
  template: string;
  status: string;
  category: string;
  version: string;
  name: string;
  description: string;
  tags: string[];
}

export interface EnhancedDashboardConfig extends DashboardConfig {
  _fieldMappings: Record<string, { color: string; metaTag: string }>;
}

// HSL Color Palette from System.md
export const HSL_COLORS = {
  CORE_BLUE: "#3A86FF",
  COMMAND_CH1: "#00FFFF",
  DATA_ORANGE: "#FB5607",
  EVENT_CH3: "#FF00FF",
  CATEGORY_PURPLE: "#8338EC",
  VERSION_TEAL: "#06FFA5",
  DESCRIPTION_YELLOW: "#FFBE0B",
  TAGS_PINK: "#FF006E",
} as const;

// Field to color/tag mapping
export const FIELD_MAPPINGS: FieldMapping[] = [
  { field: "id", pre: null, post: "asia-sports-feed", metaTag: "DOMAIN", hslColor: HSL_COLORS.CORE_BLUE },
  { field: "path", pre: "Static", post: "$env:DASH_ROOT/dashboard", metaTag: "DYNAMIC", hslColor: HSL_COLORS.COMMAND_CH1 },
  { field: "template", pre: "Absolute", post: "$env:DASH_ROOT/src/templates/...", metaTag: "RELATIVE", hslColor: HSL_COLORS.DATA_ORANGE },
  { field: "status", pre: null, post: "active", metaTag: "ACTIVE", hslColor: HSL_COLORS.EVENT_CH3 },
  { field: "category", pre: null, post: "core", metaTag: "CATEGORY", hslColor: HSL_COLORS.CATEGORY_PURPLE },
  { field: "version", pre: null, post: "1.8.0", metaTag: "VERSION", hslColor: HSL_COLORS.VERSION_TEAL },
  { field: "name", pre: null, post: "Asia Sports Feed", metaTag: "DOMAIN", hslColor: HSL_COLORS.CORE_BLUE },
  { field: "description", pre: null, post: "Dev Dashboard...", metaTag: "DESCRIPTION", hslColor: HSL_COLORS.DESCRIPTION_YELLOW },
  { field: "tags", pre: null, post: '["sports", "core"]', metaTag: "TAGS", hslColor: HSL_COLORS.TAGS_PINK },
];
