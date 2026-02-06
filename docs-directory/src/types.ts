export interface DocItem {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  tags?: string[];
  icon?: string;
  popular?: boolean;
  new?: boolean;
}

export interface DocCategory {
  id: string;
  name: string;
  description?: string;
  items: DocItem[];
}

export interface SearchResult {
  item: DocItem;
  category: string;
  score: number;
}
