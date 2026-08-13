export interface RectLike {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
}

export function imagePriority(rect: RectLike, viewportWidth: number, viewportHeight: number): number {
  const visibleWidth = Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0));
  const visibleHeight = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
  const visibleArea = visibleWidth * visibleHeight;
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const distanceSquared = (centerX - viewportWidth / 2) ** 2 + (centerY - viewportHeight / 2) ** 2;
  return (visibleArea > 0 ? 0 : 1e12) + distanceSquared - visibleArea * 1000;
}
