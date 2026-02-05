#!/usr/bin/env bun
/**
 * Component #141: Parser-Formatters
 * Primary API: Bun.semver (primary)
 * Secondary API: Bun.TOML.parse (secondary)
 * Performance SLA: <1ms parse
 * Parity Lock: 1k2l...3m4n
 * Status: ACTIVE
 */

import { feature } from "bun:bundle";

export class ParserFormatters {
  private static instance: ParserFormatters;

  private constructor() {}

  static getInstance(): ParserFormatters {
    if (!this.instance) {
      this.instance = new ParserFormatters();
    }
    return this.instance;
  }

  semverCompare(v1: string, v2: string): number {
    if (!feature("PARSER_FORMATTERS")) {
      return v1.localeCompare(v2);
    }

    return Bun.semver.order(v1, v2);
  }

  semverSatisfies(version: string, range: string): boolean {
    if (!feature("PARSER_FORMATTERS")) {
      return version === range;
    }

    return Bun.semver.satisfies(version, range);
  }

  parseTOML(toml: string): any {
    if (!feature("PARSER_FORMATTERS")) {
      return {};
    }

    return Bun.TOML.parse(toml);
  }

  stringifyTOML(value: any): string {
    if (!feature("PARSER_FORMATTERS")) {
      return "";
    }

    return Bun.TOML.stringify(value);
  }
}

export const parserFormatters = feature("PARSER_FORMATTERS")
  ? ParserFormatters.getInstance()
  : {
      semverCompare: (v1: string, v2: string) => v1.localeCompare(v2),
      semverSatisfies: (version: string, range: string) => version === range,
      parseTOML: () => ({}),
      stringifyTOML: () => "",
    };

export default parserFormatters;
