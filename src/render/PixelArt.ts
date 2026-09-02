import { px } from "../core/math";

export const OUTLINE = "#1a120e";
export const SHADOW = "#00000044";

export function shade(hex: string, amt: number) {
  const n = hex.replace("#", "");
  const r = Math.max(0, Math.min(255, parseInt(n.slice(0, 2), 16) + amt));
  const g = Math.max(0, Math.min(255, parseInt(n.slice(2, 4), 16) + amt));
  const b = Math.max(0, Math.min(255, parseInt(n.slice(4, 6), 16) + amt));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function fillRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  c.fillStyle = color;
  c.fillRect(px(x), px(y), px(w), px(h));
}

export function outlinedRect(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  outline = OUTLINE,
  thick = 2,
) {
  fillRect(c, x - thick, y - thick, w + thick * 2, h + thick * 2, outline);
  fillRect(c, x, y, w, h, fill);
  fillRect(c, x, y, w, 2, shade(fill, 28));
  fillRect(c, x, y + h - 2, w, 2, shade(fill, -28));
}

export function outlinedRound(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  fill: string,
  outline = OUTLINE,
) {
  c.fillStyle = outline;
  c.beginPath();
  c.arc(px(x), px(y), r + 2, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = fill;
  c.beginPath();
  c.arc(px(x), px(y), r, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = shade(fill, 24);
  c.beginPath();
  c.arc(px(x) - r * 0.2, px(y) - r * 0.25, r * 0.55, 0, Math.PI * 2);
  c.fill();
}

export function drawLimb(
  c: CanvasRenderingContext2D,
  kind: "arm" | "leg" | "torso" | "pelvis" | "hand" | "foot",
  w: number,
  h: number,
  fill: string,
  trim?: string,
) {
  const hw = w / 2;
  const hh = h / 2;
  if (kind === "torso") {
    outlinedRect(c, -hw, -hh, w, h, fill);
    for (let i = 0; i < 4; i++) {
      fillRect(c, -hw + 2, -hh + 4 + i * 5, w - 4, 2, trim ?? shade(fill, -18));
    }
    fillRect(c, -hw + 1, -hh + 2, 3, h - 4, shade(fill, -22));
    fillRect(c, hw - 4, -hh + 2, 3, h - 4, shade(fill, -22));
    return;
  }
  if (kind === "pelvis") {
    outlinedRect(c, -hw, -hh, w, h, fill);
    fillRect(c, -hw + 2, hh - 5, w - 4, 3, trim ?? shade(fill, -20));
    return;
  }
  if (kind === "arm") {
    outlinedRect(c, -hw, -hh, w, h, fill, OUTLINE, 2);
    fillRect(c, -hw + 1, -hh + 3, w - 2, 2, shade(fill, 18));
    if (trim) fillRect(c, -hw, hh - 4, w, 3, trim);
    return;
  }
  if (kind === "leg") {
    outlinedRect(c, -hw, -hh, w, h, fill);
    fillRect(c, -hw + 1, -hh + 2, 2, h - 4, shade(fill, 20));
    if (trim) {
      fillRect(c, -hw, -hh + 2, w, 4, trim);
      fillRect(c, -hw, hh - 6, w, 4, trim);
    }
    return;
  }
  if (kind === "hand") {
    outlinedRound(c, 0, 0, Math.max(w, h) / 2, fill);
    fillRect(c, -2, -2, 4, 4, shade(fill, -15));
    return;
  }
  if (kind === "foot") {
    outlinedRect(c, -hw, -hh + 1, w, h - 2, fill);
    fillRect(c, -hw + 2, -hh + 1, w - 4, 2, shade(fill, 22));
    fillRect(c, -hw + 3, 0, 3, hh - 1, trim ?? shade(fill, -25));
    fillRect(c, hw - 6, 0, 3, hh - 1, trim ?? shade(fill, -25));
  }
}

export function drawHelmet(
  c: CanvasRenderingContext2D,
  r: number,
  metal: string,
  crest: string,
  style: "open" | "grill" | "crest" | "bucket",
) {
  outlinedRound(c, 0, 0, r, metal);
  fillRect(c, -r + 2, -r + 1, r * 2 - 4, r * 0.55, shade(metal, 18));
  if (style === "crest" || style === "open") {
    for (let i = -3; i <= 3; i++) {
      fillRect(c, i * 2 - 1, -r - 8, 3, 9, crest);
      fillRect(c, i * 2, -r - 9, 2, 3, shade(crest, 30));
    }
  }
  if (style === "grill" || style === "bucket") {
    fillRect(c, -r * 0.55, -r * 0.15, r * 1.1, r * 0.75, shade(metal, -35));
    for (let i = 0; i < 4; i++) fillRect(c, -r * 0.45 + i * 4, -r * 0.1, 2, r * 0.65, shade(metal, 10));
  }
  if (style === "open") {
    fillRect(c, -r * 0.35, r * 0.05, r * 0.7, r * 0.45, "#e0b48a");
    fillRect(c, -r * 0.2, r * 0.2, 3, 3, OUTLINE);
    fillRect(c, r * 0.1, r * 0.2, 3, 3, OUTLINE);
  }
}

export function drawFace(c: CanvasRenderingContext2D, r: number, skin: string, face: number, dir: number) {
  outlinedRound(c, 0, 0, r, skin);
  c.fillStyle = OUTLINE;
  c.fillRect(px(dir * 2), px(-2), 3, 3);
  c.fillRect(px(dir * 7), px(-2), 3, 3);
  if (face === 1) {
    fillRect(c, -r * 0.35, r * 0.15, r * 0.75, 2, "#8b1e2d");
  }
  if (face === 2) {
    fillRect(c, -r, -r * 0.75, r * 2, 4, "#8b1e2d");
    fillRect(c, -r, -r * 0.55, r * 2, 2, "#c4843a");
  }
  if (face === 3) {
    fillRect(c, -r * 0.3, r * 0.35, r * 0.6, 3, shade(skin, -40));
  }
}

export function drawShield(c: CanvasRenderingContext2D, w: number, h: number, face: string, rim: string, boss: string) {
  outlinedRound(c, 0, 0, Math.max(w, h) / 2, face);
  c.strokeStyle = rim;
  c.lineWidth = 3;
  c.beginPath();
  c.arc(0, 0, Math.max(w, h) / 2 - 3, 0, Math.PI * 2);
  c.stroke();
  outlinedRound(c, 0, 0, Math.max(w, h) / 6, boss);
  fillRect(c, -2, -h / 2 + 4, 4, h - 8, rim);
}

export function drawSword(c: CanvasRenderingContext2D, w: number, len: number, blade: string, guard: string, grip: string) {
  outlinedRect(c, -w / 2, -len / 2, w, len * 0.72, blade);
  fillRect(c, -len * 0.08, -len * 0.05, len * 0.16, 3, guard);
  outlinedRect(c, -w / 2 + 1, len * 0.18, w - 2, len * 0.32, grip);
  fillRect(c, -1, len * 0.46, 3, 5, "#e8c547");
}

export function drawSpear(c: CanvasRenderingContext2D, w: number, len: number, tip: string, haft: string) {
  outlinedRect(c, -w / 2, -len / 2, w, len * 0.82, haft);
  fillRect(c, -w, -len / 2 - 2, w * 2, 8, tip);
  fillRect(c, -1, -len / 2 - 6, 3, 6, shade(tip, -20));
}

export function drawAxe(c: CanvasRenderingContext2D, w: number, len: number, head: string, haft: string) {
  outlinedRect(c, -2, -len / 2, 4, len, haft);
  outlinedRect(c, -w / 2, -len / 2 - 2, w, 12, head);
  fillRect(c, -w / 2 + 2, -len / 2, w - 6, 4, shade(head, 24));
}

export function drawMace(c: CanvasRenderingContext2D, w: number, len: number, head: string, haft: string) {
  outlinedRect(c, -2, -len / 2 + 8, 4, len - 8, haft);
  outlinedRound(c, 0, -len / 2 + 2, w / 2, head);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    fillRect(c, Math.cos(a) * w * 0.35 - 1, -len / 2 + Math.sin(a) * w * 0.2 - 1, 3, 3, shade(head, -30));
  }
}

export function drawHammer(c: CanvasRenderingContext2D, w: number, len: number, head: string, haft: string) {
  outlinedRect(c, -2, -len / 2 + 10, 4, len - 10, haft);
  outlinedRect(c, -w / 2, -len / 2 - 4, w, 14, head);
  fillRect(c, -w / 2 + 2, -len / 2 - 2, w - 4, 3, shade(head, 20));
}

export function drawBow(c: CanvasRenderingContext2D, len: number, wood: string, stringCol: string) {
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4;
  c.beginPath();
  c.arc(0, 0, len / 2, -1.1, 1.1);
  c.stroke();
  c.strokeStyle = wood;
  c.lineWidth = 3;
  c.beginPath();
  c.arc(0, 0, len / 2 - 1, -1.1, 1.1);
  c.stroke();
  c.strokeStyle = stringCol;
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(0, -len / 2 + 4);
  c.lineTo(0, len / 2 - 4);
  c.stroke();
}

export function drawCrowdRow(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  colors: string[],
  scroll: number,
) {
  const cols = Math.ceil(w / 10) + 2;
  for (let i = 0; i < cols; i++) {
    const cx = x + i * 10 - (scroll % 10);
    const col = colors[(i + Math.floor(scroll / 10)) % colors.length];
    fillRect(c, cx, y, 6, 8, col);
    fillRect(c, cx + 1, y - 5, 4, 5, shade(col, -15));
    fillRect(c, cx, y + 8, 6, 3, shade(col, -35));
  }
}

export function drawStoneWall(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  outlinedRect(c, x, y, w, h, "#8a7a68");
  for (let row = 0; row < h / 8; row++) {
    const off = row % 2 ? 6 : 0;
    for (let col = -1; col < w / 14 + 2; col++) {
      const bx = x + col * 14 + off;
      const by = y + row * 8;
      fillRect(c, bx, by, 12, 6, row % 2 ? "#9a8a76" : "#7d6f5e");
      fillRect(c, bx, by, 12, 1, "#b0a090");
    }
  }
}

export function drawBleachers(c: CanvasRenderingContext2D, groundY: number, camX: number, w: number) {
  const scroll = camX * 0.08;
  const crowdColors = ["#6b4423", "#8b1e2d", "#1a4a4f", "#c4843a", "#4a5560", "#3d5a3a", "#5c3824"];
  for (let tier = 0; tier < 5; tier++) {
    const ty = groundY - 58 - tier * 14;
    drawCrowdRow(c, -20, ty, w + 40, crowdColors, scroll + tier * 17);
    fillRect(c, 0, ty + 10, w, 4, shade("#6b5a48", -tier * 8));
  }
  drawStoneWall(c, 0, groundY - 42, w, 18);
  fillRect(c, 0, groundY - 44, w, 4, "#8b1e2d");
  fillRect(c, 0, groundY - 40, w, 2, "#c4843a");
}

export function drawArenaFloor(c: CanvasRenderingContext2D, y: number, w: number) {
  // warm sand base with vertical depth gradient
  const g = c.createLinearGradient(0, y, 0, y + 120);
  g.addColorStop(0, "#d8b578");
  g.addColorStop(0.35, "#c9a56a");
  g.addColorStop(1, "#a8865012");
  c.fillStyle = g;
  c.fillRect(0, px(y), w, 120);
  // bright lip where sand meets wall shadow
  fillRect(c, 0, y, w, 3, "#e6c488");
  fillRect(c, 0, y + 3, w, 2, "#00000022");
  // scattered grain + pebbles for texture
  for (let i = 0; i < w; i += 5) {
    const shadeAmt = (i % 12 === 0 ? -12 : 8) + ((i * 7) % 6);
    fillRect(c, i, y + 6 + (i % 11), 3, 2, shade("#c9a56a", shadeAmt));
    if (i % 23 === 0) fillRect(c, i + 2, y + 14 + (i % 7), 2, 2, "#8a6a40");
  }
  // faint raked lines
  for (let i = 0; i < w; i += 16) fillRect(c, i, y + 2, 10, 1, "#b89258");
}

export function drawDistantArch(c: CanvasRenderingContext2D, x: number, y: number, h: number, color: string) {
  outlinedRect(c, x, y - h, 18, h, color);
  outlinedRect(c, x + 22, y - h * 0.85, 14, h * 0.85, shade(color, -12));
  c.fillStyle = shade(color, -30);
  c.beginPath();
  c.arc(px(x + 9), px(y - h), 10, Math.PI, 0);
  c.fill();
}

export function drawPillar(c: CanvasRenderingContext2D, x: number, y: number, h: number) {
  outlinedRect(c, x - 7, y - h, 14, h, "#a89070");
  fillRect(c, x - 5, y - h + 4, 10, h - 8, "#bca488");
  outlinedRect(c, x - 10, y - h - 6, 20, 8, "#c4843a");
  outlinedRect(c, x - 8, y - 4, 16, 6, "#8a7a68");
}

export function drawSandShadow(c: CanvasRenderingContext2D, x: number, y: number, w: number) {
  c.fillStyle = "#00000040";
  c.beginPath();
  c.ellipse(px(x), px(y), w, 4, 0, 0, Math.PI * 2);
  c.fill();
}

export function drawCape(c: CanvasRenderingContext2D, color: string, sway: number) {
  outlinedRect(c, -8 + sway, 2, 16, 22, color);
  fillRect(c, -6 + sway, 6, 12, 3, shade(color, -20));
  fillRect(c, -6 + sway, 14, 12, 3, shade(color, -20));
}

export function drawHairStrand(c: CanvasRenderingContext2D, style: number, color: string, zoom: number) {
  const z = 9 * zoom;
  if (style === 0) fillRect(c, -z, -z - 2, z * 2, 4, color);
  if (style === 1) {
    fillRect(c, -z, -z - 2, z * 2, 5, color);
    fillRect(c, -z + 1, -z - 6, z * 2 - 2, 4, shade(color, 10));
  }
  if (style === 2) {
    fillRect(c, -2, -z - 10, 4, 12, color);
    fillRect(c, -3, -z - 12, 6, 4, shade(color, 20));
  }
  if (style === 3) {
    fillRect(c, -z, -z - 2, z * 2, 4, color);
    fillRect(c, z - 2, -z, 5, 10, color);
  }
  if (style === 4) fillRect(c, -z, -2, z * 2, z + 8, color);
  if (style === 5) {
    fillRect(c, -z, -z, z * 2, 4, "#e8c547");
    fillRect(c, -z + 2, -z - 2, z * 2 - 4, 3, "#3d5a3a");
  }
}
