export interface F402Config {
  api_key: string;
  endpoint: string;
}

export interface F402Params {
  sport?: string;
  league?: string;
  game_id?: string;
  market?: string;
  status?: string;
  date?: string;
  period?: string;
  view?: string;
  threshold?: number;
  sports?: string[];
  games?: string[];
}

export interface APIResponse {
  content?: string;
  metadata?: Record<string, unknown>;
  error?: boolean;
  status?: number;
  message?: string;
}
