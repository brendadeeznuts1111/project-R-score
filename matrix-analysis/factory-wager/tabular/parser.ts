// factory-wager/tabular/parser.ts
// FactoryWager YAML-Native Tabular v4.4 - Multi-Doc Parser with Alias Resolution

import { YAML } from "bun";
import type { YAMLNode } from "./types";

export class YAMLTabularParser {
  private anchors = new Map<string, { value: any; docIndex: number }>();

  /**
   * Parse multi-document YAML string into a flattened table structure
   */
  parseMultiDoc(yamlText: string): YAMLNode[] {
    // Reset anchors for each parse
    this.anchors.clear();

    // Extract only YAML sections (between --- delimiters)
    const yamlDocs = this.extractYAMLDocuments(yamlText);

    return yamlDocs.flatMap((docContent, docIndex) => {
      if (!docContent.trim()) return [];

      let doc;
      try {
        doc = YAML.parse(docContent);
      } catch (e) {
        console.error(`Error parsing document ${docIndex}:`, e);
        return [];
      }

      return this.flattenDocument(doc, docIndex, "");
    });
  }

  /**
   * Extract pure YAML documents from mixed YAML/Markdown content
   */
  private extractYAMLDocuments(text: string): string[] {
    const docs: string[] = [];
    const lines = text.split('\n');
    let currentDoc: string[] = [];
    let inYAMLSection = false;

    for (const line of lines) {
      // Check for document delimiter
      if (line.trim() === '---') {
        if (inYAMLSection && currentDoc.length > 0) {
          docs.push(currentDoc.join('\n'));
          currentDoc = [];
        }
        inYAMLSection = true;
        continue;
      }

      // Skip markdown content
      if (line.startsWith('#') || line.startsWith('```') || line.startsWith('<!--')) {
        continue;
      }

      // Collect YAML content
      if (inYAMLSection && line.trim()) {
        currentDoc.push(line);
      }
    }

    // Add last document if exists
    if (currentDoc.length > 0) {
      docs.push(currentDoc.join('\n'));
    }

    return docs;
  }

  private flattenDocument(
    obj: any,
    docIndex: number,
    prefix: string
  ): YAMLNode[] {
    const rows: YAMLNode[] = [];

    if (typeof obj !== 'object' || obj === null) {
      return [{
        docIndex,
        key: prefix,
        value: String(obj),
        yamlType: 'scalar',
        jsType: typeof obj,
        interpolated: false
      }];
    }

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      // Check for anchor definition in key (e.g. "&author")
      let anchor = undefined;
      let cleanKey = key;
      if (key.includes('&')) {
        const match = key.match(/&(\w+)/);
        if (match) {
          anchor = match[1];
          cleanKey = key.replace(/&\w+/, '').trim();
        }
      }

      // Track anchors for alias resolution
      if (anchor) {
        this.anchors.set(anchor, { value, docIndex });
      }

      // Detect interpolation
      const isInterpolated = typeof value === 'string' && /\$\{[^}]+\}/.test(value);

      // Resolve Aliases (*name)
      let alias = undefined;
      let resolvedValue = value;
      if (typeof value === 'string' && value.startsWith('*')) {
        alias = value.slice(1);
        const anchorData = this.anchors.get(alias);
        if (anchorData) {
          resolvedValue = anchorData.value;
        }
      }

      const yamlType = this.detectYAMLType(value);
      const jsType = this.inferJSType(resolvedValue);

      // Extract Metadata Fields
      const version = (key === 'version' || fullKey.endsWith('.version')) ? String(resolvedValue) : undefined;
      const bun = (key === 'bun') ? String(resolvedValue) : undefined;
      const author = (key === 'author') ? String(resolvedValue) : undefined;
      const status = (key === 'status') ? String(resolvedValue) : undefined;

      rows.push({
        docIndex,
        key: fullKey.replace(/&\w+\s*/, '').trim(), // Clean key for display
        value: this.formatValue(resolvedValue),
        yamlType,
        jsType,
        anchor: anchor,
        alias: alias,
        version,
        bun,
        interpolated: isInterpolated,
        author,
        status
      });

      // Recursion for nested objects
      if (yamlType === 'mapping' && resolvedValue !== null) {
        rows.push(...this.flattenDocument(resolvedValue, docIndex, fullKey));
      }

      // Expand sequences
      if (yamlType === 'sequence' && Array.isArray(resolvedValue)) {
        resolvedValue.forEach((item: any, idx: number) => {
          if (typeof item === 'object' && item !== null) {
            rows.push(...this.flattenDocument(item, docIndex, `${fullKey}[${idx}]`));
          } else {
            rows.push({
              docIndex,
              key: `${fullKey}[${idx}]`,
              value: String(item),
              yamlType: 'scalar',
              jsType: typeof item,
              interpolated: typeof item === 'string' && /\$\{[^}]+\}/.test(item),
            });
          }
        });
      }
    }

    return rows;
  }

  private detectYAMLType(value: any): 'scalar' | 'alias' | 'anchor' | 'mapping' | 'sequence' {
    if (Array.isArray(value)) return 'sequence';
    if (typeof value === 'object' && value !== null) return 'mapping';
    return 'scalar';
  }

  private inferJSType(value: any): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (value instanceof Date) return 'date';
    return typeof value;
  }

  private formatValue(value: any): string {
    if (value === null) return 'null';
    if (typeof value === 'object') return JSON.stringify(value).slice(0, 40);
    return String(value).slice(0, 40);
  }
}
