// factory-wager/tabular/parser-v45.ts
// FactoryWager YAML-Native Tabular v4.5 - Enhanced Parser with Nexus Detection

import { YAML } from "bun";
import type { YAMLNode, DocStats } from "./types-v45";

export class YAMLTabularParserV45 {
  private anchors = new Map<string, { value: any; docIndex: number; author?: string }>();
  private currentLine = 0;
  private currentDoc = 0;
  private currentPath = "";

  parseWithStats(yamlText: string): { rows: YAMLNode[]; stats: DocStats } {
    const lines = yamlText.split('\n');
    const rawDocs = yamlText.split(/^---$/m);
    const rows: YAMLNode[] = [];
    const stats: DocStats = {
      totalDocs: rawDocs.length,
      totalNodes: 0,
      anchorsDefined: 0,
      aliasesResolved: 0,
      interpolated: 0,
      maxDepth: 0
    };

    rawDocs.forEach((docContent, docIndex) => {
      if (!docContent.trim()) return;

      this.currentDoc = docIndex;

      try {
        const doc = YAML.parse(docContent);
        const docRows = this.flattenDocument(doc, docIndex, "", 0, stats);

        // Post-process: detect Nexus fields
        const enrichedRows = this.detectNexusFields(docRows, docContent);
        rows.push(...enrichedRows);

      } catch (e) {
        rows.push(this.createErrorNode(docIndex, e as Error));
      }
    });

    stats.totalNodes = rows.length;
    return { rows, stats };
  }

  private flattenDocument(
    obj: any,
    docIndex: number,
    prefix: string,
    depth: number,
    stats: DocStats,
    inheritedAuthor?: string
  ): YAMLNode[] {
    const rows: YAMLNode[] = [];
    stats.maxDepth = Math.max(stats.maxDepth, depth);

    // Update current path for merge key detection
    this.currentPath = prefix;

    if (typeof obj !== 'object' || obj === null) {
      return [this.createNode(docIndex, prefix, obj, depth, stats, inheritedAuthor)];
    }

    for (const [key, value] of Object.entries(obj)) {
      this.currentLine++;
      const fullKey = prefix ? `${prefix}.${key}` : key;

      // Handle merge key detection
      if (key === '<<') {
        const mergeNode = this.handleMergeKey(value, fullKey, docIndex, depth, stats, inheritedAuthor);
        if (mergeNode) rows.push(mergeNode);
        continue;
      }

      // Update current path for nested processing
      this.currentPath = fullKey;

      // Anchor detection
      let anchor: string | undefined;
      let cleanKey = key;
      if (key.includes('&')) {
        const match = key.match(/&(\w+)/);
        if (match) {
          anchor = match[1];
          cleanKey = key.replace(/&\w+/, '').trim();
          stats.anchorsDefined++;

          // Track author inheritance
          if (key === 'author' || key.includes('author')) {
            this.anchors.set(anchor, { value, docIndex, author: String(value) });
          } else {
            this.anchors.set(anchor, { value, docIndex, author: inheritedAuthor });
          }
        }
      }

      // Inheritance tracking
      let currentAuthor = inheritedAuthor;
      if (cleanKey === 'author') currentAuthor = String(value);

      // Interpolation detection
      const isInterpolated = typeof value === 'string' && /\$\{[^}]+\}/.test(value);
      if (isInterpolated) stats.interpolated++;

      rows.push(this.createNode(
        docIndex,
        cleanKey,
        value,
        depth,
        stats,
        currentAuthor,
        { anchor, interpolated: isInterpolated, key: fullKey }
      ));

      // Recursion
      const yamlType = this.detectYAMLType(value);
      if (yamlType === 'mapping' && value !== null) {
        rows.push(...this.flattenDocument(value, docIndex, fullKey, depth + 1, stats, currentAuthor));
      }

      if (yamlType === 'sequence' && Array.isArray(value)) {
        value.forEach((item: any, idx: number) => {
          if (typeof item === 'object' && item !== null) {
            rows.push(...this.flattenDocument(item, docIndex, `${fullKey}[${idx}]`, depth + 1, stats, currentAuthor));
          } else {
            rows.push(this.createNode(docIndex, `${fullKey}[${idx}]`, item, depth + 1, stats, currentAuthor));
          }
        });
      }
    }

    return rows;
  }

  private handleMergeKey(
    value: any,
    fullKey: string,
    docIndex: number,
    depth: number,
    stats: DocStats,
    inheritedAuthor?: string
  ): YAMLNode | undefined {
    // The "<<" key is special - it indicates merge inheritance
    try {
      let alias: string | undefined;
      let resolvedValue = value;

      // Check if merge key references an alias
      if (typeof value === 'string' && value.startsWith('*')) {
        alias = value.slice(1);
        const anchorData = this.anchors.get(alias);
        if (anchorData) {
          resolvedValue = anchorData.value;
          stats.aliasesResolved++;
        }
      }

      return {
        docIndex,
        key: fullKey,  // Show as "development.<<"
        value: String(value),  // "<<: *defaults"
        yamlType: 'merge',  // NEW: Special type
        jsType: this.inferJSType(value),
        alias,
        isMerge: true,  // Flag for visual "M" badge
        inheritanceChain: this.resolveInheritance(resolvedValue), // Track what gets merged
        inheritance: this.formatInheritanceDisplay(alias, this.resolveInheritance(resolvedValue)), // NEW: Enhanced display
        interpolated: false,
        author: inheritedAuthor,
        _rawValue: value,
        _depth: depth,
        _lineNumber: this.currentLine,
        _truncated: String(value).length > 28
      };
    } catch (e) {
      // Fallback for error cases
      return undefined;
    }
  }

  private resolveInheritance(value: any): string[] {
    // Track what gets merged in the inheritance chain
    const chain: string[] = [];

    if (typeof value === 'string' && value.startsWith('*')) {
      chain.push(value.slice(1)); // Add alias name
    } else if (typeof value === 'object' && value !== null) {
      // If it's an object, extract all anchor references
      for (const [k, v] of Object.entries(value)) {
        if (typeof v === 'string' && v.startsWith('*')) {
          chain.push(v.slice(1));
        }
      }
    }

    return chain;
  }

  private formatInheritanceDisplay(alias?: string, chain?: string[]): string {
    // Format inheritance chain for display (e.g., "→defaults+ovrd")
    if (!alias && (!chain || chain.length === 0)) {
      return "";
    }

    const parts: string[] = [];

    if (alias) {
      parts.push(`→${alias}`);
    }

    if (chain && chain.length > 0) {
      // Check if there are overrides by comparing with alias
      const hasOverrides = alias && chain.length > 1;
      if (hasOverrides) {
        parts.push("+ovrd");
      }
    }

    return parts.join("");
  }

  private createNode(
    docIndex: number,
    key: string,
    value: any,
    depth: number,
    stats: DocStats,
    author?: string,
    meta: { anchor?: string; interpolated?: boolean; alias?: string; key?: string } = {}
  ): YAMLNode {
    // Alias resolution
    let resolvedValue = value;
    let alias = meta.alias;

    if (typeof value === 'string' && value.startsWith('*')) {
      alias = value.slice(1);
      const anchorData = this.anchors.get(alias);
      if (anchorData) {
        resolvedValue = anchorData.value;
        stats.aliasesResolved++;
        if (anchorData.author) author = anchorData.author; // Inherit from anchor
      }
    }

    const yamlType = this.detectYAMLType(value);
    const jsType = this.inferJSType(resolvedValue);
    const stringValue = this.formatValue(resolvedValue);

    // Metadata extraction
    const cleanKey = meta.key || key;
    const isVer = cleanKey === 'version' || cleanKey.endsWith('.version');
    const isBun = cleanKey === 'bun' || cleanKey === 'bunVersion';
    const isStatus = cleanKey === 'status';

    return {
      docIndex,
      key: cleanKey,
      value: stringValue,
      yamlType,
      jsType,
      anchor: meta.anchor,
      alias,
      version: isVer ? String(resolvedValue) : undefined,
      bun: isBun ? String(resolvedValue) : undefined,
      interpolated: meta.interpolated || false,
      author,
      status: isStatus ? String(resolvedValue) : undefined,
      // NEW: Nexus fields (detected in post-processing)
      registryId: undefined,
      r2Bucket: undefined,
      domainEndpoint: undefined,
      // Internal
      _rawValue: value,
      _depth: depth,
      _lineNumber: this.currentLine,
      _truncated: stringValue.includes('…')
    };
  }

  private detectNexusFields(rows: YAMLNode[], rawContent: string): YAMLNode[] {
    // Detect registry references
    const hasRegistry = rows.some(r => r.key.includes('registry') || r.key.includes('package'));
    const hasR2 = rows.some(r => r.key.includes('r2') || r.key.includes('bucket'));
    const hasDomain = rows.some(r => r.key.includes('domain') || r.key.includes('endpoint'));

    return rows.map(row => {
      if (hasRegistry && !row.registryId) {
        if (row.key === 'name' || row.key === 'package') {
          row.registryId = `FACTORY-${row.value.slice(0, 8).toUpperCase()}-001`;
        }
      }
      if (hasR2 && !row.r2Bucket && row.key.includes('bucket')) {
        row.r2Bucket = String(row._rawValue);
      }
      if (hasDomain && !row.domainEndpoint && row.key.includes('endpoint')) {
        row.domainEndpoint = String(row._rawValue);
      }
      return row;
    });
  }

  private formatValue(value: any): string {
    if (value === null) return 'null';
    if (typeof value === 'object') {
      const str = JSON.stringify(value);
      return str.length > 28 ? str.slice(0, 27) + '…' : str;
    }
    const str = String(value);
    return str.length > 28 ? str.slice(0, 27) + '…' : str;
  }

  private createErrorNode(docIndex: number, error: Error): YAMLNode {
    return {
      docIndex,
      key: "❌ PARSE_ERROR",
      value: error.message.slice(0, 28),
      yamlType: 'scalar',
      jsType: 'error',
      interpolated: false,
      _rawValue: error,
      _depth: 0,
      _lineNumber: this.currentLine,
      _truncated: error.message.length > 28
    };
  }

  private detectYAMLType(value: any): 'scalar' | 'alias' | 'anchor' | 'mapping' | 'sequence' {
    if (Array.isArray(value)) return 'sequence';
    if (typeof value === 'object' && value !== null) return 'mapping';
    return 'scalar';
  }

  private inferJSType(value: any): 'string' | 'number' | 'boolean' | 'object' | 'null' | 'array' | 'date' | 'error' {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (value instanceof Date) return 'date';
    if (value instanceof Error) return 'error';

    const typeOf = typeof value;
    switch (typeOf) {
      case 'string':
      case 'number':
      case 'boolean':
      case 'object':
        return typeOf;
      case 'bigint':
      case 'symbol':
      case 'undefined':
      case 'function':
        // For unsupported types, return 'object' as a safe fallback
        return 'object';
      default:
        return 'object';
    }
  }
}
