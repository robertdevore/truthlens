export type Verdict = 'ai' | 'real' | 'uncertain' | 'error';

export interface AnalysisResult {
  requestId: string;
  verdict: Verdict;
  aiConfidence: number;
  realProbability: number;
  inferenceMs: number;
  backend: string;
  cacheHit?: boolean;
  error?: string;
}

export interface Settings {
  enabled: boolean;
  minimumPixels: number;
  showRealScores: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  minimumPixels: 128,
  showRealScores: true
};
