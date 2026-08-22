export type LayoutRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type Placement = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

export function clampedOffset(
  rect: LayoutRect,
  s: Placement,
  viewportWidth: number,
): { x: number; y: number } {
  const rad = (s.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const halfW = ((rect.width * cos + rect.height * sin) * s.scale) / 2;
  const halfH = ((rect.width * sin + rect.height * cos) * s.scale) / 2;
  const cx = rect.left + rect.width / 2 + s.x;
  const cy = rect.top + rect.height / 2 + s.y;
  const fits = halfW * 2 <= viewportWidth;
  const minCx = fits ? halfW : 0;
  const maxCx = fits ? viewportWidth - halfW : viewportWidth;
  const clampedCx = Math.min(maxCx, Math.max(minCx, cx));
  const clampedCy = Math.max(halfH, cy);
  return { x: s.x + (clampedCx - cx), y: s.y + (clampedCy - cy) };
}
