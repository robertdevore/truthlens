import { describe, expect, it } from 'vitest';
import { imagePriority } from '../src/image-priority';

describe('image scheduling priority', () => {
  it('prioritizes images inside the viewport over nearby offscreen images', () => {
    const visible = { top: 100, right: 500, bottom: 500, left: 100, width: 400, height: 400 };
    const nearby = { top: 810, right: 500, bottom: 1010, left: 100, width: 400, height: 200 };
    expect(imagePriority(visible, 1000, 800)).toBeLessThan(imagePriority(nearby, 1000, 800));
  });

  it('prioritizes larger visible image area', () => {
    const large = { top: 100, right: 600, bottom: 600, left: 100, width: 500, height: 500 };
    const small = { top: 300, right: 550, bottom: 450, left: 400, width: 150, height: 150 };
    expect(imagePriority(large, 1000, 800)).toBeLessThan(imagePriority(small, 1000, 800));
  });
});
