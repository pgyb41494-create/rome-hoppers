import { GAME_H, GAME_W, Palette, SkinTones } from "../core/constants";

export function screenToWorld(
  mouseX: number,
  mouseY: number,
  canvasW: number,
  canvasH: number,
  camX: number,
  camY: number,
  zoom: number,
) {
  const scale = Math.max(canvasW / GAME_W, canvasH / GAME_H);
  const dw = GAME_W * scale;
  const dh = GAME_H * scale;
  const ox = (canvasW - dw) / 2;
  const oy = (canvasH - dh) / 2;
  const bx = (mouseX - ox) / scale;
  const by = (mouseY - oy) / scale;
  return {
    x: camX + (bx - GAME_W / 2) / zoom,
    y: camY + (by - GAME_H / 2) / zoom,
  };
}

export function drawMenuArt(canvas: HTMLCanvasElement, t: number) {
  const c = canvas.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  c.fillStyle = "#1a120e";
  c.fillRect(0, 0, 640, 360);
  c.fillStyle = "#3a2218";
  c.fillRect(0, 220, 640, 140);
  c.fillStyle = "#c4a574";
  c.fillRect(0, 250, 640, 110);
  c.fillStyle = "#6b3a28";
  for (let i = 0; i < 10; i++) c.fillRect(20 + i * 64, 80, 28, 170);
  c.fillStyle = "#c4843a";
  c.fillRect(0, 70, 640, 16);
  const bob = Math.sin(t * 2) * 4;
  gladiator(c, 220, 210 + bob, "#8b1e2d", 1);
  gladiator(c, 400, 214 - bob, "#1a4a4f", -1);
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
  c.fillStyle = Palette.ink;
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = "#c4a574";
  c.fillRect(0, 300, canvas.width, 60);
  const x = canvas.width / 2;
  const s = SkinTones[skin] ?? SkinTones[2];
  const h = height;
  const w = width;
  rect(c, x - 10 * w, 110, 20 * w, 26 * h, primary);
  rect(c, x - 9 * w, 136, 18 * w, 12 * h, primary);
  circ(c, x, 96, 11 * w, s);
  rect(c, x - 18 * w, 114, 8 * w, 18 * h, s);
  rect(c, x + 10 * w, 114, 8 * w, 18 * h, s);
  rect(c, x - 8 * w, 148, 8 * w, 22 * h, s);
  rect(c, x + 2 * w, 148, 8 * w, 22 * h, s);
  c.fillStyle = hairColor;
  c.fillRect(x - 11 * w, 82, 22 * w, 6);
  c.fillStyle = Palette.gold;
  c.fillRect(x + 12 * w, 108, 6, 48);
}

function gladiator(c: CanvasRenderingContext2D, x: number, y: number, color: string, facing: number) {
  c.fillStyle = color;
  c.fillRect(x - 10, y - 28, 20, 28);
  c.fillStyle = "#e0b48a";
  c.beginPath();
  c.arc(x, y - 36, 10, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#c5d0d8";
  c.fillRect(x + facing * 8, y - 20, facing * 28, 5);
  c.fillStyle = color;
  c.fillRect(x - 14, y, 10, 24);
  c.fillRect(x + 4, y, 10, 24);
}

function rect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  c.fillStyle = "#1a120e";
  c.fillRect(Math.round(x) - 1, Math.round(y) - 1, Math.round(w) + 2, Math.round(h) + 2);
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function circ(c: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  c.fillStyle = color;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}
