export const AI_THRESHOLD = 0.65;
export const REAL_THRESHOLD = 0.35;
export const MODEL_FAKE_BOUNDARY = 0.91;
export const MODEL_REAL_BOUNDARY = 0.93;
export const TEMPERATURE = 0.594889223575592;

const MIDPOINT = (MODEL_FAKE_BOUNDARY + MODEL_REAL_BOUNDARY) / 2;
const SCALE = Math.log(AI_THRESHOLD / (1 - AI_THRESHOLD)) / (MIDPOINT - MODEL_FAKE_BOUNDARY);

export function sigmoid(value: number): number {
  if (value >= 0) {
    const z = Math.exp(-value);
    return 1 / (1 + z);
  }
  const z = Math.exp(value);
  return z / (1 + z);
}

export function calibrateAiConfidence(rawLogit: number): { aiConfidence: number; realProbability: number } {
  const realProbability = sigmoid(rawLogit / TEMPERATURE);
  const aiConfidence = sigmoid((MIDPOINT - realProbability) * SCALE);
  return { aiConfidence, realProbability };
}

export function verdictFor(aiConfidence: number): 'ai' | 'real' | 'uncertain' {
  if (aiConfidence >= AI_THRESHOLD) return 'ai';
  if (aiConfidence <= REAL_THRESHOLD) return 'real';
  return 'uncertain';
}

