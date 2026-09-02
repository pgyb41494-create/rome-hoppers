import { GAME_H, GAME_W, Palette, SkinTones } from "../core/constants";
import {
  OUTLINE,
  drawArenaFloor,
  drawBleachers,
  drawDistantArch,
  drawFace,
  drawHelmet,
  drawLimb,
  drawPillar,
  drawSandShadow,
  drawShield,
  drawSword,
  fillRect,
  outlinedRect,
  shade,
} from "./PixelArt";

export function viewportLayout(canvasW: number, canvasH: number, stretch = false) {
  if (stretch) {
    const scaleX = canvasW / GAME_W;
    const scaleY = canvasH / GAME_H;
    return { scale: scaleX, scaleY, dw: canvasW, dh: canvasH, ox: 0, oy: 0 };
  }
  const scale = Math.max(canvasW / GAME_W, canvasH / GAME_H);
  const dw = GAME_W * scale;
  const dh = GAME_H * scale;
  return {
    scale,
    scaleY: scale,
    dw,
    dh,
    ox: (canvasW - dw) / 2,
    oy: (canvasH - dh) / 2,
  };
}

export function screenToWorld(
  mouseX: number,
  mouseY: number,
  canvasW: number,
  canvasH: number,
  camX: number,
  camY: number,
  zoom: number,
  stretch = false,
) {
  const { scale, scaleY, ox, oy } = viewportLayout(canvasW, canvasH, stretch);
  const bx = (mouseX - ox) / scale;
  const by = (mouseY - oy) / scaleY;
  return {
    x: camX + (bx - GAME_W / 2) / zoom,
    y: camY + (by - GAME_H / 2) / zoom,
  };
}

export function drawMenuArt(canvas: HTMLCanvasElement, t: number) {
  const c = canvas.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  const W = canvas.width;
  const H = canvas.height;
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#2a1c12");
  g.addColorStop(0.6, "#6b3a28");
  g.addColorStop(1, "#c9a56a");
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);

  const ground = H * 0.68;
  const scale = W / 640;
  for (let i = -1; i < Math.ceil(W / 72) + 2; i++) drawDistantArch(c, i * 72 * scale + 20, ground - 40, 60 * scale, "#5c3824");
  for (let i = 0; i < Math.ceil(W / 54) + 2; i++) drawPillar(c, 30 + i * 54 * scale, ground, (80 + (i % 3) * 15) * scale);
  drawBleachers(c, ground, t * 12, W);
  drawArenaFloor(c, ground, W);

  const bob = Math.sin(t * 2) * 5 * scale;
  drawGladiatorPreview(c, W * 0.33, ground - 22 + bob, "#8b1e2d", "#c4843a", 1, 0.2);
  drawGladiatorPreview(c, W * 0.67, ground - 18 - bob, "#1a4a4f", "#8aa0b3", -1, 0.5);
}

export function drawPreview(
  canvas: HTMLCanvasElement,
  skin: number,
  primary: string,
  hairColor: string,
  height: number,
  width: number,
) {
  const c = canvas.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  c.fillStyle = "#1a120e";
  c.fillRect(0, 0, canvas.width, canvas.height);
  drawBleachers(c, 300, 0, canvas.width);
  drawArenaFloor(c, 300, canvas.width);
  c.save();
  c.translate(canvas.width / 2, 170);
  c.scale(width, height);
  drawGladiatorPreview(c, 0, 40, primary, "#c4843a", 1, 0);
  c.restore();
  c.save();
  c.translate(canvas.width / 2, 92);
  drawHelmet(c, 18, "#8aa0b3", primary, "crest");
  c.restore();
}

export function drawGladiatorPreview(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  primary: string,
  metal: string,
  facing: number,
  sway: number,
) {
  c.save();
  c.translate(x, y);
  drawSandShadow(c, 0, 34, 18);
  drawLimb(c, "foot", 14, 6, "#c4a574");
  drawLimb(c, "leg", 10, 20, "#e0b48a", metal);
  drawLimb(c, "torso", 22, 28, primary, metal);
  drawLimb(c, "arm", 8, 18, "#e0b48a");
  c.translate(facing * 10, -8 + sway * 4);
  drawSword(c, 5, 42, "#d8e2ea", metal, "#6b4423");
  c.translate(-facing * 22, 0);
  drawShield(c, 22, 26, shade(primary, 20), metal, "#e8c547");
  c.translate(facing * 12, -24);
  drawHelmet(c, 12, metal, primary, facing > 0 ? "open" : "grill");
  c.restore();
}
