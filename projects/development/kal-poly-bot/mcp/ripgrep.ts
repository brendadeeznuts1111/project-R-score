// mcp/ripgrep.ts - Machine Coding Protocol for CodeSearch
export interface RipgrepMCP {
  command: 'codesearch';
  version: '1.0';
  params: {
    query: string;
    path?: string;
    type?: 'ts' | 'js' | 'md' | 'all';
    context?: number;  // lines of context
    maxResults?: number;
  };
  result: {
    matches: CodeMatch[];
    stats: SearchStats;
    files: string[];
  };
}

export interface CodeMatch {
  file: string;
  line: number;
  column: number;
  content: string;
  context: { before: string[]; after: string[] };
}

export interface SearchStats {
  filesSearched: number;
  matchesFound: number;
  timeMs: number;
}

// Ripgrep JSON output types
interface RgMatch {
  type: 'match';
  data: {
    path: { text: string };
    line_number: number;
    absolute_offset: number;
    submatches: Array<{
      match: { text: string };
      start: number;
      end: number;
    }>;
    lines: { text: string };
    context_pre?: Array<{ text: string }>;
    context_post?: Array<{ text: string }>;
  };
}

interface RgSummary {
  type: 'summary';
  data: {
    stats: {
      elapsed: { secs: number; nanos: number; human: string };
      searches: number;
      searches_with_match: number;
      bytes_searched: number;
      bytes_printed: number;
      matched_lines: number;
      matches: number;
    };
  };
}

export type RgOutput = RgMatch | RgSummary;