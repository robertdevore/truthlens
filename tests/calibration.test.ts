import { describe, expect, it } from 'vitest';
import { AI_THRESHOLD, MODEL_FAKE_BOUNDARY, MODEL_REAL_BOUNDARY, REAL_THRESHOLD, TEMPERATURE, calibrateAiConfidence, verdictFor } from '../src/calibration';

const logitForProbability = (probability: number) => Math.log(probability / (1 - probability)) * TEMPERATURE;

describe('score calibration', () => {
  it('maps the model fake boundary to the bounty 65% threshold', () => {
    expect(calibrateAiConfidence(logitForProbability(MODEL_FAKE_BOUNDARY)).aiConfidence).toBeCloseTo(AI_THRESHOLD, 10);
  });
  it('maps the model real boundary to the symmetric threshold', () => {
    expect(calibrateAiConfidence(logitForProbability(MODEL_REAL_BOUNDARY)).aiConfidence).toBeCloseTo(REAL_THRESHOLD, 10);
  });
  it('classifies the confidence bands', () => {
    expect(verdictFor(0.9)).toBe('ai');
    expect(verdictFor(0.5)).toBe('uncertain');
    expect(verdictFor(0.1)).toBe('real');
  });
});

