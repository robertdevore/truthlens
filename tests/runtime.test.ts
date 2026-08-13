import { describe, expect, it } from 'vitest';
import { errorMessage, LruCache } from '../src/runtime';

describe('runtime helpers', () => {
  it('normalizes thrown values', () => {
    expect(errorMessage(new Error('broken'))).toBe('broken');
    expect(errorMessage('broken')).toBe('broken');
  });

  it('expires and evicts least-recently-used results', () => {
    const cache = new LruCache<string, number>(2, 10);
    cache.set('a', 1, 0);
    cache.set('b', 2, 0);
    expect(cache.get('a', 1)).toBe(1);
    cache.set('c', 3, 1);
    expect(cache.get('b', 1)).toBeUndefined();
    expect(cache.get('a', 10)).toBeUndefined();
    expect(cache.get('c', 10)).toBe(3);
  });
});
