import type { Fighter } from "../character/Fighter";
import { armorById } from "../armor/catalog";
import { HairColors, SkinTones } from "../core/constants";
import {
  OUTLINE,
  drawAxe,
  drawHammer,
  drawMace,
  drawShield,
  drawSpear,
  drawSword,
  fillRect,
  outlinedRect,
  outlinedRound,
  shade,
} from "./PixelArt";
import { swingArmAngles } from "../physics/Pose";

type WeaponKind = "sword" | "spear" | "axe" | "mace" | "hammer";
type ChestKind = "none" | "plate" | "scale" | "leather" | "muscle";

interface BodyOpts {
  skin: string;
  primary: string;
  secondary: string;
  chest: ChestKind;
  chestColor: string;
  chestTrim: string;
  helmet: { color: string; style: "open" | "grill" | "crest" } | null;
  hairStyle: number;
  hairColor: string;
  beard: boolean;
  weapon: { kind: WeaponKind; blade: string; haft: string; w: number; len: number } | null;
  shield: { face: string; rim: string; boss: string; size: number } | null;
  weaponUpper: number;
  weaponFore: number;
  legSwing: number;
  legBend: number;
  crouch: boolean;
  lean: number;
  bob: number;
  flash: boolean;
}

/** Shaded, rounded muscle block: outline + top light + bottom shade + side volume. */
function muscle(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  outlinedRect(c, x, y, w, h, color);
  fillRect(c, x, y + 2, 2, h - 4, shade(color, 16));
  fillRect(c, x + w - 2, y + 2, 2, h - 4, shade(color, -30));
}

function drawLeg(
  c: CanvasRenderingContext2D,
  hipX: number,
  swing: number,
  bend: number,
  skin: string,
  back: boolean,
) {
  const s = back ? -12 : 0;
  const thigh = shade(skin, s - 4);
  const shin = shade(skin, s - 10);
  c.save();
  c.translate(hipX, 3);
  c.rotate(swing);
  muscle(c, -4, 0, 8, 14, thigh);
  c.translate(0, 12);
  c.rotate(bend);
  muscle(c, -4, 0, 7, 15, shin);
  fillRect(c, -4, 5, 2, 8, shade(skin, s - 22));
  c.translate(0, 14);
  // sandal + ankle straps
  fillRect(c, -5, -1, 11, 5, "#5a3a1e");
  fillRect(c, -5, -1, 11, 1, "#8a5a2e");
  fillRect(c, -3, -6, 2, 6, "#6b4423");
  fillRect(c, 1, -6, 2, 6, "#6b4423");
  c.restore();
}

function drawRomanHelmet(
  c: CanvasRenderingContext2D,
  metal: string,
  crest: string,
  style: "open" | "grill" | "crest",
  skin: string,
) {
  // dome
  outlinedRound(c, 0, -2, 12, metal);
  fillRect(c, -9, -9, 14, 5, shade(metal, 22));
  // brow band
  fillRect(c, -12, -3, 24, 3, shade(metal, -18));
  fillRect(c, -12, -3, 24, 1, shade(metal, 24));
  // face opening
  fillRect(c, 2, 0, 10, 9, skin);
  fillRect(c, 2, 0, 10, 1, shade(skin, -18));
  // eye
  fillRect(c, 7, 2, 2, 3, OUTLINE);
  // cheek guard
  outlinedRect(c, -1, 1, 4, 9, shade(metal, -6), OUTLINE, 1);
  // nose / grill
  if (style === "grill") {
    fillRect(c, 8, 0, 2, 9, shade(metal, -20));
    fillRect(c, 5, 0, 2, 9, shade(metal, -20));
  }
  // crest plume
  if (style === "crest" || style === "open") {
    for (let i = 0; i < 9; i++) {
      const px0 = -6 + i * 1.6;
      const hh = 8 - Math.abs(i - 4) * 0.6;
      fillRect(c, px0, -12 - i * 0.2, 2, -hh, crest);
      fillRect(c, px0, -12 - i * 0.2 - hh, 2, 2, shade(crest, 26));
    }
    fillRect(c, -6, -12, 15, 2, shade(crest, -24));
  }
}

function drawFace(
  c: CanvasRenderingContext2D,
  skin: string,
  hairColor: string,
  hairStyle: number,
  beard: boolean,
) {
  // head
  outlinedRound(c, 0, 0, 11, skin);
  // ear (back)
  fillRect(c, -10, -1, 4, 6, shade(skin, -14));
  fillRect(c, -9, 0, 2, 3, shade(skin, -30));
  // cheek/jaw shading toward front
  fillRect(c, 6, 3, 5, 6, shade(skin, -12));
  // brow
  fillRect(c, 3, -4, 8, 2, shade(skin, -38));
  // eye
  fillRect(c, 6, -1, 3, 3, "#f3efe6");
  fillRect(c, 7, 0, 2, 2, "#2a1c14");
  // nose (protruding front)
  fillRect(c, 10, 1, 3, 3, shade(skin, -6));
  fillRect(c, 12, 1, 1, 3, shade(skin, -24));
  // mouth
  fillRect(c, 5, 6, 5, 1, shade(skin, -34));
  // beard
  if (beard) {
    fillRect(c, 2, 5, 10, 6, hairColor);
    fillRect(c, 4, 8, 8, 3, shade(hairColor, -14));
    fillRect(c, 10, 4, 3, 4, hairColor);
  }
  // hair (top + back), varies by style
  fillRect(c, -11, -12, 22, 6, hairColor);
  fillRect(c, -11, -12, 22, 2, shade(hairColor, 22));
  fillRect(c, -11, -8, 5, 8, hairColor); // back of head
  if (hairStyle === 2) {
    // top knot / mohawk
    fillRect(c, -2, -18, 5, 8, hairColor);
    fillRect(c, -2, -18, 5, 2, shade(hairColor, 24));
  } else if (hairStyle === 4) {
    // long hair down the back
    fillRect(c, -12, -6, 5, 16, hairColor);
    fillRect(c, -12, -6, 2, 16, shade(hairColor, 18));
  } else if (hairStyle === 5) {
    // laurel / band
    fillRect(c, -11, -11, 22, 2, "#e8c547");
    fillRect(c, -11, -9, 22, 1, "#3d5a3a");
  }
}

function drawWeapon(c: CanvasRenderingContext2D, w: BodyOpts["weapon"]) {
  if (!w) return;
  const lw = w.w * 1.4;
  const lh = w.len * 1.4;
  if (w.kind === "spear") drawSpear(c, lw, lh, w.blade, w.haft);
  else if (w.kind === "axe") drawAxe(c, lw, lh, w.blade, w.haft);
  else if (w.kind === "mace") drawMace(c, lw, lh, w.blade, w.haft);
  else if (w.kind === "hammer") drawHammer(c, lw, lh, w.blade, w.haft);
  else drawSword(c, lw, lh, w.blade, shade(w.haft, 34), w.haft);
}

/** Core figure used by both live rendering and menu portraits. */
export function drawBody(c: CanvasRenderingContext2D, o: BodyOpts) {
  const skin = o.flash ? shade(o.skin, 80) : o.skin;
  const primary = o.flash ? shade(o.primary, 80) : o.primary;

  // ---- Legs (drawn first, behind) ----
  drawLeg(c, -3, -o.legSwing - (o.crouch ? 0.3 : 0.14), o.legBend + (o.crouch ? 0.5 : 0.12), skin, true);
  drawLeg(c, 4, o.legSwing + (o.crouch ? 0.35 : 0.16), o.legBend + (o.crouch ? 0.4 : 0.1), skin, false);

  // ---- Loincloth / pteruges skirt ----
  const skirt = shade(primary, -8);
  outlinedRect(c, -13, -2, 26, 12, skirt);
  fillRect(c, -13, -2, 26, 3, "#4a2e18");
  fillRect(c, -13, -1, 26, 1, "#8a5a2e");
  for (let i = 0; i < 5; i++) {
    const sx = -12 + i * 5;
    fillRect(c, sx, 6, 4, 6, shade(primary, i % 2 ? -18 : 6));
    fillRect(c, sx, 11, 4, 1, shade(primary, -28));
  }

  // ---- Upper body (leaning group) ----
  c.save();
  c.translate(0, o.bob);
  c.rotate(o.lean);

  // Torso
  const isArmor = o.chest === "plate" || o.chest === "scale" || o.chest === "muscle";
  const torsoCol = o.flash ? shade(o.chestColor, 80) : isArmor ? o.chestColor : skin;
  outlinedRect(c, -12, -24, 24, 27, torsoCol);
  if (isArmor) {
    // pauldron highlight + rivets + banding
    fillRect(c, -10, -22, 20, 3, shade(torsoCol, 22));
    if (o.chest === "scale") {
      for (let r = 0; r < 4; r++)
        for (let col = 0; col < 5; col++)
          fillRect(c, -10 + col * 4, -19 + r * 6, 3, 4, shade(o.chestTrim, r % 2 ? -6 : 8));
    } else if (o.chest === "muscle") {
      // sculpted muscle cuirass
      fillRect(c, -9, -21, 8, 7, shade(torsoCol, 16));
      fillRect(c, 1, -21, 8, 7, shade(torsoCol, 16));
      fillRect(c, -1, -20, 2, 20, shade(torsoCol, -26));
      for (let i = 0; i < 3; i++) fillRect(c, -8, -10 + i * 4, 16, 2, shade(torsoCol, -18));
    } else {
      for (let i = 0; i < 3; i++) fillRect(c, -10, -20 + i * 7, 20, 3, shade(o.chestTrim, 6));
      fillRect(c, -11, -3, 22, 3, o.chestTrim);
    }
    fillRect(c, -1, -24, 2, 27, shade(torsoCol, -24));
  } else {
    // bare muscular chest + abs
    fillRect(c, -10, -22, 9, 8, shade(skin, 14));
    fillRect(c, 1, -22, 9, 8, shade(skin, 14));
    fillRect(c, -10, -14, 9, 2, shade(skin, -20));
    fillRect(c, 1, -14, 9, 2, shade(skin, -20));
    fillRect(c, -1, -22, 2, 24, shade(skin, -22));
    for (let i = 0; i < 3; i++) {
      fillRect(c, -8, -9 + i * 5, 7, 3, shade(skin, -14));
      fillRect(c, 1, -9 + i * 5, 7, 3, shade(skin, -14));
    }
    if (o.chest === "leather") {
      // leather harness straps
      fillRect(c, -10, -22, 4, 25, shade(o.chestColor, -6));
      fillRect(c, -11, -6, 22, 4, o.chestColor);
      fillRect(c, -11, -6, 22, 1, shade(o.chestColor, 20));
    }
  }
  // neck
  fillRect(c, -3, -26, 6, 4, shade(skin, -8));

  // ---- Shield arm (far side, mostly steady, holds shield in front) ----
  if (o.shield) {
    c.save();
    c.translate(-2, -21);
    c.rotate(0.35);
    muscle(c, -3, 0, 6, 11, shade(skin, -6));
    c.translate(0, 10);
    c.rotate(0.7);
    muscle(c, -3, 0, 6, 10, shade(skin, -10));
    c.translate(2, 9);
    drawShield(c, o.shield.size, o.shield.size * 1.15, o.shield.face, o.shield.rim, o.shield.boss);
    c.restore();
  }

  // ---- Head ----
  c.save();
  c.translate(0, -33);
  if (o.helmet) drawRomanHelmet(c, o.helmet.color, o.secondary, o.helmet.style, skin);
  else drawFace(c, skin, o.hairColor, o.hairStyle, o.beard);
  c.restore();

  // ---- Weapon arm (near side, swings) ----
  c.save();
  c.translate(6, -20);
  c.rotate(o.weaponUpper);
  muscle(c, -3.5, -2, 7, 13, shade(skin, 4));
  fillRect(c, -3.5, -3, 7, 4, shade(skin, 16)); // shoulder cap
  c.translate(0, 11);
  c.rotate(o.weaponFore);
  muscle(c, -3, 0, 6, 12, shade(skin, -2));
  c.translate(0, 12);
  outlinedRound(c, 0, 0, 3, shade(skin, -6));
  drawWeapon(c, o.weapon);
  c.restore();

  c.restore();
}

function chestKind(id: string | null): ChestKind {
  if (!id) return "none";
  if (id.includes("muscle")) return "muscle";
  if (id.includes("scale") || id.includes("lorica") || id.includes("segment")) return "scale";
  if (id.includes("plate") || id.includes("bronze") || id.includes("steel") || id.includes("iron")) return "plate";
  if (id.includes("leather") || id.includes("harness")) return "leather";
  return "plate";
}

function weaponKind(cat: string): WeaponKind {
  if (cat === "spear" || cat === "halberd") return "spear";
  if (cat === "axe") return "axe";
  if (cat === "mace") return "mace";
  if (cat === "hammer") return "hammer";
  return "sword";
}

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
  const hairColor = HairColors[f.appearance.hairColor] ?? HairColors[0];
  const running = f.state === "run";
  const airborne = f.state === "jump" || !f.onGround;
  const hopY = (running ? f.hopVisual * 14 : airborne ? 6 : 0) * zoom;
  const squashY = running ? f.squash : airborne ? 1.06 : 1;
  const stretchX = running ? 2 - f.squash : 1;
  const idle = f.state === "idle" || f.state === "block";
  const bob = idle ? Math.sin(time * 2.6 + f.group) * 0.8 : 0;

  const legSwing = running ? Math.sin(f.walkT) * 0.55 : 0;
  const legBend = running ? 0.22 + Math.max(0, Math.sin(f.walkT)) * 0.2 : 0.08;

  const chest = armorById(f.loadout.armor.chest);
  const helm = armorById(f.loadout.armor.helmet);
  const helmet =
    helm && !helm.id.includes("cloth") && !helm.id.includes("wrap")
      ? {
          color: helm.color,
          style: (helm.id.includes("crest") ? "crest" : helm.id.includes("ridge") || helm.id.includes("grill") ? "grill" : "open") as
            | "open"
            | "grill"
            | "crest",
        }
      : null;

  const weapon = f.weapon
    ? {
        kind: weaponKind(f.weapon.def.category),
        blade: f.weapon.def.blade,
        haft: f.weapon.def.haft,
        w: f.weapon.def.width,
        len: f.weapon.def.length,
      }
    : null;
  const shield = f.shield
    ? {
        face: f.shield.def.blade,
        rim: f.shield.def.haft,
        boss: shade(f.shield.def.blade, -28),
        size: Math.max(f.shield.def.width, f.shield.def.length) * 1.4,
      }
    : null;

  c.save();
  c.translate(sx, sy - hopY * zoom - bob);
  c.scale(face * stretchX, squashY);
  c.scale(zoom, zoom);

  const swingProgress =
    f.state === "attack" && f.attackDuration > 0 ? 1 - f.attackCd / f.attackDuration : -1;
  let weaponUpper = f.ragdoll.bodies.upperArmR.angle * face;
  let weaponFore = f.ragdoll.bodies.forearmR.angle * face;
  if (swingProgress >= 0) {
    const swingSign = Math.sign(f.aim.x) || face;
    const { upper, fore } = swingArmAngles(swingProgress, swingSign);
    weaponUpper = upper;
    weaponFore = fore;
  }

  drawBody(c, {
    skin,
    primary: f.appearance.primary,
    secondary: f.appearance.secondary,
    chest: chestKind(chest?.id ?? null),
    chestColor: chest?.color ?? f.appearance.primary,
    chestTrim: chest?.trim ?? f.appearance.secondary,
    helmet,
    hairStyle: f.appearance.hair,
    hairColor,
    beard: f.appearance.face === 2 || f.appearance.face === 3,
    weapon,
    shield,
    weaponUpper,
    weaponFore,
    legSwing,
    legBend,
    crouch: f.state === "crouch",
    lean: 0,
    bob,
    flash: f.flash > 0,
  });

  c.restore();
}

export function drawBlockyPortrait(
  c: CanvasRenderingContext2D,
  slotId: string,
  primary: string,
  w: number,
  h: number,
) {
  const bg = c.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#3a2a1c");
  bg.addColorStop(1, "#1a120e");
  c.fillStyle = bg;
  c.fillRect(0, 0, w, h);
  // floor line
  c.fillStyle = "#c9a56a";
  c.fillRect(0, h * 0.86, w, h * 0.14);
  c.fillStyle = "#00000033";
  c.beginPath();
  c.ellipse(w / 2, h * 0.86, w * 0.28, h * 0.02, 0, 0, Math.PI * 2);
  c.fill();

  const z = w / 90;
  c.save();
  c.translate(w / 2 - 4 * z, h * 0.86 - 30 * z);
  c.scale(z, z);

  const kind: WeaponKind =
    slotId === "lancer" || slotId === "spearman"
      ? "spear"
      : slotId === "crusher"
        ? "mace"
        : slotId === "axeman"
          ? "axe"
          : "sword";
  const hasShield = slotId === "swordsman" || slotId === "lancer" || slotId === "crusher";

  drawBody(c, {
    skin: SkinTones[2],
    primary,
    secondary: "#c4843a",
    chest: slotId === "crusher" ? "plate" : slotId === "lancer" ? "scale" : "leather",
    chestColor: shade(primary, -20),
    chestTrim: "#c4843a",
    helmet: { color: "#8aa0b3", style: slotId === "crusher" ? "grill" : "crest" },
    hairStyle: 1,
    hairColor: "#3b2418",
    beard: true,
    weapon: {
      kind,
      blade: kind === "sword" || kind === "spear" ? "#d8e2ea" : "#8aa0b3",
      haft: "#6b4423",
      w: kind === "mace" || kind === "axe" ? 12 : kind === "spear" ? 5 : 8,
      len: kind === "spear" ? 46 : 30,
    },
    shield: hasShield ? { face: shade(primary, 12), rim: "#8aa0b3", boss: "#e8c547", size: 30 } : null,
    weaponUpper: 0.15,
    weaponFore: 0.1,
    legSwing: 0,
    legBend: 0.08,
    crouch: false,
    lean: 0,
    bob: 0,
    flash: false,
  });

  c.restore();
}
