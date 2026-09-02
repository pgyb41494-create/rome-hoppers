import { clamp, lerp } from "../core/math";
import { GAME_H, GAME_W } from "../core/constants";

export class Camera {
  x = 0;
  y = 0;
  zoom = 1;
  shake = 0;
  punch = { x: 0, y: 0 };
  private tx = 0;
  private ty = 0;
  private bounds = { x: 0, y: 0, w: 1600, h: 700 };

  setBounds(x: number, y: number, w: number, h: number) {
    this.bounds = { x, y, w, h };
  }

  follow(ax: number, ay: number, bx: number, by: number, dt: number) {
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2 - 18;
    const dist = Math.hypot(bx - ax, by - ay);
    this.zoom = clamp(1.02 - dist / 1600, 0.68, 1.05);
    this.tx = mx;
    this.ty = my;
    this.x = lerp(this.x, this.tx, 1 - Math.pow(0.012, dt));
    this.y = lerp(this.y, this.ty, 1 - Math.pow(0.018, dt));
    const viewW = GAME_W / this.zoom;
    const viewH = GAME_H / this.zoom;
    this.x = clamp(this.x, this.bounds.x + viewW / 2, this.bounds.x + this.bounds.w - viewW / 2);
    this.y = clamp(this.y, this.bounds.y + viewH / 2, this.bounds.y + this.bounds.h - viewH / 2);
    this.shake = Math.max(0, this.shake - dt * 18);
    this.punch.x = lerp(this.punch.x, 0, 8 * dt);
    this.punch.y = lerp(this.punch.y, 0, 8 * dt);
  }

  impact(power: number, dirX = 0, dirY = 0, shakeMul = 1) {
    this.shake = Math.min(14, this.shake + power * 0.35 * shakeMul);
    this.punch.x += dirX * power * 0.08;
    this.punch.y += dirY * power * 0.05;
  }

  worldToScreen(wx: number, wy: number) {
    const sx = (wx - this.x) * this.zoom + GAME_W / 2 + this.offsetX();
    const sy = (wy - this.y) * this.zoom + GAME_H / 2 + this.offsetY();
    return { x: sx, y: sy };
  }

  offsetX() {
    return this.punch.x + (Math.random() - 0.5) * this.shake;
  }

  offsetY() {
    return this.punch.y + (Math.random() - 0.5) * this.shake;
  }
}
