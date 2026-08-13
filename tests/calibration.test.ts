import { describe, expect, it } from 'vitest';
import { AI_THRESHOLD, MODEL_AI_BOUNDARY, artificialProbability, calibrateAiConfidence, verdictFor } from '../src/calibration';

describe('score calibration', () => {
  it('maps the held-out model boundary to the bounty 65% threshold', () => {
    expect(calibrateAiConfidence(MODEL_AI_BOUNDARY).aiConfidence).toBeCloseTo(AI_THRESHOLD, 10);
  });
  it('preserves monotonic model ordering', () => {
    expect(calibrateAiConfidence(0.9).aiConfidence).toBeGreaterThan(calibrateAiConfidence(0.1).aiConfidence);
  });
  it('classifies the confidence bands', () => {
    expect(verdictFor(0.9)).toBe('ai');
    expect(verdictFor(0.5)).toBe('uncertain');
    expect(verdictFor(0.1)).toBe('real');
  });
  it('converts two-class logits into an artificial probability', () => {
    expect(artificialProbability(2, -2)).toBeCloseTo(0.0179862, 6);
    expect(artificialProbability(-2, 2)).toBeCloseTo(0.9820138, 6);
  });
});
