export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const approach = (cur: number, target: number, maxDelta: number) => {
  const d = target - cur;
  if (Math.abs(d) <= maxDelta) return target;
  return cur + Math.sign(d) * maxDelta;
};
export const len = (x: number, y: number) => Math.hypot(x, y);
export const norm = (x: number, y: number) => {
  const l = Math.hypot(x, y) || 1;
  return { x: x / l, y: y / l };
};
export const ang = (x: number, y: number) => Math.atan2(y, x);
export const wrapAng = (a: number) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};
export const angDiff = (a: number, b: number) => wrapAng(a - b);
export const px = (v: number) => Math.round(v);
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const pick = <T>(arr: readonly T[]) => arr[(Math.random() * arr.length) | 0];
export const chance = (p: number) => Math.random() < p;
