import { describe, expect, it } from 'vitest';
import { CHANNEL_MEAN, CHANNEL_STD, centerCropSource, rgbaToChw } from '../src/preprocess';

describe('image preprocessing', () => {
  it('converts RGBA pixels to normalized planar RGB', () => {
    const result = rgbaToChw(new Uint8ClampedArray([255, 128, 0, 255]), 1, 1);
    expect(result[0]).toBeCloseTo((1 - CHANNEL_MEAN[0]) / CHANNEL_STD[0]);
    expect(result[1]).toBeCloseTo((128 / 255 - CHANNEL_MEAN[1]) / CHANNEL_STD[1]);
    expect(result[2]).toBeCloseTo((0 - CHANNEL_MEAN[2]) / CHANNEL_STD[2]);
  });
  it('rejects malformed input', () => {
    expect(() => rgbaToChw(new Uint8ClampedArray(3), 1, 1)).toThrow(/Expected 4/);
  });
  it('matches resize-short-side then center-crop geometry', () => {
    expect(centerCropSource(1600, 900)).toEqual({ x: 400, y: 50, size: 800 });
  });
});
