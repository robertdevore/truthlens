export const AI_THRESHOLD = 0.65;
export const REAL_THRESHOLD = 0.35;
export const MODEL_AI_BOUNDARY = 0.08231209963560104;

const AI_THRESHOLD_LOGIT = Math.log(AI_THRESHOLD / (1 - AI_THRESHOLD));
const MODEL_BOUNDARY_LOGIT = Math.log(MODEL_AI_BOUNDARY / (1 - MODEL_AI_BOUNDARY));

export function sigmoid(value: number): number {
  if (value >= 0) {
    const z = Math.exp(-value);
    return 1 / (1 + z);
  }
  const z = Math.exp(value);
  return z / (1 + z);
}

export function artificialProbability(realLogit: number, artificialLogit: number): number {
  const maximum = Math.max(artificialLogit, realLogit);
  const artificialExp = Math.exp(artificialLogit - maximum);
  return artificialExp / (artificialExp + Math.exp(realLogit - maximum));
}

export function calibrateAiConfidence(modelAiProbability: number): { aiConfidence: number; realProbability: number } {
  const bounded = Math.max(Number.EPSILON, Math.min(1 - Number.EPSILON, modelAiProbability));
  const modelLogit = Math.log(bounded / (1 - bounded));
  const aiConfidence = sigmoid(modelLogit - MODEL_BOUNDARY_LOGIT + AI_THRESHOLD_LOGIT);
  const realProbability = 1 - modelAiProbability;
  return { aiConfidence, realProbability };
}

export function verdictFor(aiConfidence: number): 'ai' | 'real' | 'uncertain' {
  if (aiConfidence >= AI_THRESHOLD) return 'ai';
  if (aiConfidence <= REAL_THRESHOLD) return 'real';
  return 'uncertain';
}
