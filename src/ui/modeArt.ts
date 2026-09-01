import { drawGladiatorPreview } from "../render/DrawUtil";

export function drawModeTile(canvas: HTMLCanvasElement, mode: string) {
  const c = canvas.getContext("2d")!;
  c.imageSmoothingEnabled = false;
  const g = c.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, "#d8c4a0");
  g.addColorStop(1, "#b89258");
  c.fillStyle = g;
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = "#00000018";
  for (let i = 0; i < canvas.width; i += 8) c.fillRect(i, 0, 4, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height * 0.62;
  if (mode === "campaign" || mode === "quick") {
    drawGladiatorPreview(c, cx - 28, cy, "#8b1e2d", "#c4843a", 1, 0);
    drawGladiatorPreview(c, cx + 28, cy, "#1a4a4f", "#8aa0b3", -1, 0.2);
  } else if (mode === "training") {
    c.fillStyle = "#6b4423";
    c.fillRect(cx - 6, cy - 40, 12, 50);
    c.fillStyle = "#e8d7b5";
    c.beginPath();
    c.arc(cx, cy - 44, 14, 0, Math.PI * 2);
    c.fill();
    drawGladiatorPreview(c, cx, cy + 8, "#8b1e2d", "#c4843a", 1, 0);
  } else if (mode === "versus") {
    drawGladiatorPreview(c, cx - 36, cy, "#c4843a", "#8aa0b3", 1, 0);
    drawGladiatorPreview(c, cx + 36, cy, "#8b1e2d", "#c4843a", -1, 0);
  } else {
    drawGladiatorPreview(c, cx, cy, "#8b1e2d", "#c4843a", 1, Math.sin(Date.now() / 400) * 0.15);
  }
}

export function paintModeTiles(root: ParentNode) {
  root.querySelectorAll<HTMLCanvasElement>("canvas[data-mode-art]").forEach((cv) => {
    if (cv.dataset.modeArt) drawModeTile(cv, cv.dataset.modeArt);
  });
}
