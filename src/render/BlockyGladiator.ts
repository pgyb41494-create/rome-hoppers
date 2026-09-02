import type { Fighter } from "../character/Fighter";
import { armorById } from "../armor/catalog";
import { SkinTones } from "../core/constants";
import {
  OUTLINE,
  drawHelmet,
  drawShield,
  drawSpear,
  drawSword,
  drawAxe,
  drawMace,
  fillRect,
  outlinedRect,
  shade,
} from "./PixelArt";

/** Side-view stiff gladiator — Gladihoppers-style blocky silhouette. */
export function drawBlockyGladiator(
  c: CanvasRenderingContext2D,
  f: Fighter,
  sx: number,
  sy: number,
  zoom: number,
  time: number,
) {
  const face = f.facing;
  const skin = SkinTones[f.appearance.skin] ?? SkinTones[2];
  const primary = f.flash > 0 ? "#fff4dc" : f.appearance.primary;
  const metal = f.appearance.secondary;
  const z = zoom;
  const hop = f.state === "run" ? Math.abs(Math.sin(time * 14)) * 3 * z : 0;

  c.save();
  c.translate(sx, sy - hop);
  c.scale(face, 1);

  const torsoAng = f.torso.angle * face;
  c.rotate(torsoAng * 0.15);

  // Legs — stiff blocks
  const legW = 10 * z;
  const legH = 22 * z;
  const legY = 18 * z;
  outlinedRect(c, -14 * z, legY, legW, legH, shade(skin, -8));
  outlinedRect(c, 4 * z, legY, legW, legH, shade(skin, -12));
  // Sandals
  fillRect(c, -15 * z, legY + legH - 2 * z, 12 * z, 4 * z, "#6b4423");
  fillRect(c, 3 * z, legY + legH - 2 * z, 12 * z, 4 * z, "#6b4423");

  // Loincloth / skirt
  outlinedRect(c, -16 * z, 4 * z, 32 * z, 16 * z, primary, OUTLINE, 2);
  fillRect(c, -14 * z, 6 * z, 28 * z, 3 * z, shade(primary, 22));

  // Torso block
  const chest = armorById(f.loadout.armor.chest);
  const torsoCol = chest && !chest.id.includes("leather") && !chest.id.includes("harness") ? chest.color : primary;
  outlinedRect(c, -18 * z, -28 * z, 36 * z, 34 * z, torsoCol);
  fillRect(c, -16 * z, -26 * z, 6 * z, 28 * z, shade(torsoCol, -20));
  fillRect(c, 10 * z, -26 * z, 6 * z, 28 * z, shade(torsoCol, -20));
  if (chest?.id.includes("scale") || chest?.id.includes("muscle")) {
    for (let i = 0; i < 4; i++) fillRect(c, -14 * z, -22 * z + i * 7 * z, 28 * z, 3 * z, metal);
  }

  // Head + helmet
  c.save();
  c.translate(0, -34 * z);
  c.rotate(f.head.angle * face * 0.2);
  const helm = armorById(f.loadout.armor.helmet);
  const helmStyle = helm?.id.includes("crest") ? "crest" : helm?.id.includes("ridge") ? "grill" : "open";
  if (helm && !helm.id.includes("cloth")) {
    drawHelmet(c, 14 * z, helm.color, metal, helmStyle as "open" | "grill" | "crest");
  } else {
    outlinedRect(c, -12 * z, -14 * z, 24 * z, 24 * z, skin);
    fillRect(c, -4 * z, -4 * z, 3 * z, 3 * z, OUTLINE);
    fillRect(c, 2 * z, -4 * z, 3 * z, 3 * z, OUTLINE);
  }
  c.restore();

  // Shield arm (left) — mostly static
  c.save();
  c.translate(-16 * z, -18 * z);
  c.rotate(f.ragdoll.bodies.upperArmL.angle * face);
  outlinedRect(c, -4 * z, -4 * z, 8 * z, 20 * z, skin);
  c.translate(0, 16 * z);
  c.rotate(f.ragdoll.bodies.forearmL.angle * face);
  outlinedRect(c, -3 * z, 0, 6 * z, 16 * z, skin);
  if (f.shield) {
    c.translate(0, 10 * z);
    const sd = f.shield.def;
    drawShield(c, sd.width * z * 1.8, sd.length * z * 1.8, sd.blade, sd.haft, shade(sd.blade, -25));
  }
  c.restore();

  // Weapon arm (right) — swings freely
  c.save();
  c.translate(16 * z, -18 * z);
  c.rotate(f.ragdoll.bodies.upperArmR.angle * face);
  outlinedRect(c, -4 * z, -4 * z, 8 * z, 22 * z, skin);
  c.translate(0, 18 * z);
  c.rotate(f.ragdoll.bodies.forearmR.angle * face);
  outlinedRect(c, -3 * z, 0, 6 * z, 18 * z, skin);
  c.translate(0, 14 * z);
  if (f.weapon) {
    const def = f.weapon.def;
    const lw = def.width * z * 1.6;
    const lh = def.length * z * 1.6;
    if (def.category === "spear" || def.category === "halberd") drawSpear(c, lw, lh, def.blade, def.haft);
    else if (def.category === "axe") drawAxe(c, lw, lh, def.blade, def.haft);
    else if (def.category === "mace") drawMace(c, lw, lh, def.blade, def.haft);
    else drawSword(c, lw, lh, def.blade, shade(def.haft, 30), def.haft);
  }
  c.restore();

  c.restore();
}

export function drawBlockyPortrait(
  c: CanvasRenderingContext2D,
  slotId: string,
  primary: string,
  w: number,
  h: number,
) {
  c.fillStyle = "#2a1c12";
  c.fillRect(0, 0, w, h);
  const cx = w / 2;
  const z = w / 120;
  c.save();
  c.translate(cx, h * 0.72);
  c.scale(z, z);

  const loadout =
    slotId === "lancer" || slotId === "spearman" ? "spear" : slotId === "crusher" ? "mace" : slotId === "axeman" ? "axe" : "gladius";
  const hasShield = slotId === "swordsman" || slotId === "lancer" || slotId === "crusher";

  outlinedRect(c, -14, 8, 10, 22, "#c48a5a");
  outlinedRect(c, 4, 8, 10, 22, "#c48a5a");
  outlinedRect(c, -16, -8, 32, 18, primary);
  outlinedRect(c, -18, -32, 36, 26, primary);
  drawHelmet(c, 14, "#8aa0b3", "#c4843a", slotId === "crusher" ? "grill" : "crest");

  if (hasShield) {
    c.save();
    c.translate(-20, -12);
    drawShield(c, 28, 34, shade(primary, 10), "#8aa0b3", "#e8c547");
    c.restore();
  }

  c.save();
  c.translate(18, -8);
  c.rotate(0.4);
  if (loadout === "spear") drawSpear(c, 4, 42, "#d8e2ea", "#6b4423");
  else if (loadout === "mace") drawMace(c, 8, 36, "#8aa0b3", "#6b4423");
  else if (loadout === "axe") drawAxe(c, 8, 36, "#8aa0b3", "#6b4423");
  else drawSword(c, 6, 38, "#d8e2ea", "#c4843a", "#6b4423");
  c.restore();

  c.restore();
}
