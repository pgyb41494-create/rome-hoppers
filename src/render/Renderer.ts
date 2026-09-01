import { HairColors, Palette, SkinTones } from "../core/constants";
import { px } from "../core/math";
import type { Appearance, LimbId } from "../core/types";
import { armorById } from "../armor/catalog";
import type { Fighter } from "../character/Fighter";
import type { ArenaInstance } from "../arenas/catalog";
import type { WeaponEntity } from "../weapons/Weapon";
import type { ParticleSystem } from "./Particles";
import type { Camera } from "../engine/Camera";
import { GAME_H, GAME_W } from "../core/constants";
import {
  OUTLINE,
  drawArenaFloor,
  drawAxe,
  drawBleachers,
  drawBow,
  drawCape,
  drawDistantArch,
  drawFace,
  drawHairStrand,
  drawHammer,
  drawHelmet,
  drawLimb,
  drawMace,
  drawPillar,
  drawSandShadow,
  drawShield,
  drawSpear,
  drawSword,
  fillRect,
  outlinedRect,
  shade,
} from "./PixelArt";

export class WorldRenderer {
  buf: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  time = 0;

  constructor() {
    this.buf = document.createElement("canvas");
    this.buf.width = GAME_W;
    this.buf.height = GAME_H;
    this.ctx = this.buf.getContext("2d")!;
    this.ctx.imageSmoothingEnabled = false;
  }

  draw(
    arena: ArenaInstance,
    fighters: Fighter[],
    loose: WeaponEntity[],
    arrows: MatterBodyLite[],
    particles: ParticleSystem,
    camera: Camera,
    dt: number,
  ) {
    this.time += dt;
    const c = this.ctx;
    c.imageSmoothingEnabled = false;
    c.fillStyle = arena.def.bg[0];
    c.fillRect(0, 0, GAME_W, GAME_H);
    this.bg(arena, camera);
    const drawables: { z: number; fn: () => void }[] = [];
    for (const p of arena.props) {
      drawables.push({
        z: p.body.position.y,
        fn: () => this.prop(p.body.position.x, p.body.position.y, p.body.angle, camera, p.hp / p.max),
      });
    }
    for (const w of loose) {
      drawables.push({ z: w.body.position.y, fn: () => this.weapon(w, camera) });
    }
    for (const a of arrows) {
      drawables.push({ z: a.position.y, fn: () => this.arrow(a, camera) });
    }
    for (const f of fighters) {
      drawables.push({ z: f.pelvis.position.y, fn: () => this.fighter(f, camera) });
    }
    drawables.sort((a, b) => a.z - b.z);
    for (const d of drawables) d.fn();
    this.fx(particles, camera);
    this.vignette();
  }

  private bg(arena: ArenaInstance, cam: Camera) {
    const c = this.ctx;
    const def = arena.def;
    const groundScreen = this.w2s(def.w / 2, def.ground, cam).y;

    const sky = c.createLinearGradient(0, 0, 0, groundScreen);
    sky.addColorStop(0, def.bg[0]);
    sky.addColorStop(0.55, def.bg[1] ?? def.bg[0]);
    sky.addColorStop(1, def.bg[2] ?? Palette.sand);
    c.fillStyle = sky;
    c.fillRect(0, 0, GAME_W, GAME_H);

    const par = cam.x * 0.06;
    for (let i = -2; i < 12; i++) {
      const ax = ((i * 90 - par * 0.3) % (GAME_W + 90)) - 40;
      drawDistantArch(c, ax, groundScreen - 90, 50 + (i % 3) * 12, shade(def.bg[1] ?? "#6b3a28", -20));
    }

    for (let i = -2; i < 16; i++) {
      const px0 = i * 52 - (par % 52);
      const ph = 70 + (i % 4) * 18;
      drawPillar(c, px0, groundScreen - 8, ph);
    }

    drawBleachers(c, groundScreen, cam.x, GAME_W);

    for (const p of def.platforms) this.plat(p.x, p.y, p.w, p.h, cam, def.accent);

    drawArenaFloor(c, px(groundScreen), GAME_W);

    for (const pit of def.pits) {
      const s = this.w2s(pit.x, def.ground, cam);
      fillRect(c, s.x - (pit.w / 2) * cam.zoom, s.y, pit.w * cam.zoom, 80, "#1a120e");
      fillRect(c, s.x - (pit.w / 2) * cam.zoom + 4, s.y + 4, pit.w * cam.zoom - 8, 6, "#2a1c12");
    }
    for (const t of def.traps) {
      const s = this.w2s(t.x, t.y, cam);
      for (let i = 0; i < 5; i++) {
        fillRect(c, s.x - 10 + i * 5, s.y - 8, 3, 10, "#8aa0b3");
        fillRect(c, s.x - 9 + i * 5, s.y - 10, 2, 3, shade("#8aa0b3", 20));
      }
    }
  }

  private plat(x: number, y: number, w: number, h: number, cam: Camera, color: string) {
    const s = this.w2s(x, y, cam);
    const c = this.ctx;
    outlinedRect(c, s.x - (w / 2) * cam.zoom, s.y - (h / 2) * cam.zoom, w * cam.zoom, h * cam.zoom, color);
    fillRect(c, s.x - (w / 2) * cam.zoom, s.y + (h / 2) * cam.zoom - 3, w * cam.zoom, 3, "#00000055");
  }

  private fighter(f: Fighter, cam: Camera) {
    const feet = this.w2s(
      (f.ragdoll.bodies.footL.position.x + f.ragdoll.bodies.footR.position.x) / 2,
      Math.max(f.ragdoll.bodies.footL.position.y, f.ragdoll.bodies.footR.position.y),
      cam,
    );
    drawSandShadow(this.ctx, feet.x, feet.y + 2, 16 * cam.zoom);

    if (f.appearance.accessory === 1) this.cape(f, cam);

    const order: LimbId[] = [
      "footL",
      "shinL",
      "thighL",
      "footR",
      "shinR",
      "thighR",
      "upperArmL",
      "forearmL",
      "handL",
      "pelvis",
      "torso",
      "upperArmR",
      "forearmR",
      "handR",
      "head",
    ];
    if (f.shield) this.weapon(f.shield, cam);
    for (const id of order) {
      if (id === "handR" && f.weapon) this.weapon(f.weapon, cam);
      this.limb(f, id, cam);
    }
    if (!this.hasHelmet(f)) this.hair(f, cam);
  }

  private cape(f: Fighter, cam: Camera) {
    const b = f.torso;
    const s = this.w2s(b.position.x - f.facing * 6, b.position.y + 4, cam);
    const c = this.ctx;
    c.save();
    c.translate(px(s.x), px(s.y));
    c.rotate(b.angle);
    drawCape(c, shade(f.appearance.primary, -15), Math.sin(this.time * 3 + f.group) * 2);
    c.restore();
  }

  private hasHelmet(f: Fighter) {
    const h = armorById(f.loadout.armor.helmet);
    return h && !h.id.includes("cloth") && !h.id.includes("wrap");
  }

  private limbKind(id: LimbId): "arm" | "leg" | "torso" | "pelvis" | "hand" | "foot" {
    if (id === "torso") return "torso";
    if (id === "pelvis") return "pelvis";
    if (id.startsWith("hand")) return "hand";
    if (id.startsWith("foot")) return "foot";
    if (id.startsWith("thigh") || id.startsWith("shin")) return "leg";
    return "arm";
  }

  private limb(f: Fighter, id: LimbId, cam: Camera) {
    const b = f.ragdoll.bodies[id];
    const s = this.w2s(b.position.x, b.position.y, cam);
    const c = this.ctx;
    c.save();
    c.translate(px(s.x), px(s.y));
    c.rotate(b.angle);
    const skin = SkinTones[f.appearance.skin] ?? SkinTones[2];
    const z = cam.zoom;
    const w = (b.bounds.max.x - b.bounds.min.x) * z;
    const h = (b.bounds.max.y - b.bounds.min.y) * z;
    const { fill, trim, metal } = this.limbStyle(f, id, skin);
    const drawCol = f.flash > 0 ? "#fff4dc" : fill;

    if (id === "head") {
      const r = Math.max(w, h) / 2;
      if (this.hasHelmet(f)) {
        const helm = armorById(f.loadout.armor.helmet);
        const style = helm?.id.includes("crest") ? "crest" : helm?.id.includes("ridge") ? "grill" : "open";
        drawHelmet(c, r, helm?.color ?? "#8aa0b3", f.appearance.secondary, style as "open" | "grill" | "crest");
      } else {
        drawFace(c, r, drawCol, f.appearance.face, f.facing);
      }
      c.restore();
      return;
    }

    drawLimb(c, this.limbKind(id), w, h, drawCol, trim ?? metal);
    if (id === "torso" && metal) {
      const chest = armorById(f.loadout.armor.chest);
      if (chest?.id.includes("scale") || chest?.id.includes("muscle")) {
        for (let i = 0; i < 5; i++) fillRect(c, -w / 2 + 2, -h / 2 + 3 + i * 5, w - 4, 3, metal);
      }
    }
    c.restore();
  }

  private limbStyle(f: Fighter, id: LimbId, skin: string) {
    const a = f.appearance;
    const slot =
      id === "head"
        ? "helmet"
        : id === "torso"
          ? "chest"
          : id.startsWith("upperArm")
            ? "shoulder"
            : id.startsWith("hand")
              ? "gloves"
              : id.startsWith("thigh") || id.startsWith("shin")
                ? "legs"
                : id.startsWith("foot")
                  ? "boots"
                  : null;
    const piece = slot ? armorById(f.loadout.armor[slot]) : null;
    let fill = skin;
    let trim: string | undefined;
    let metal: string | undefined;

    if (id === "torso" || id === "pelvis") fill = a.primary;
    if (piece) {
      if (slot === "chest") {
        fill = piece.id.includes("leather") || piece.id.includes("harness") ? a.primary : piece.color;
        metal = piece.color;
        trim = piece.trim;
      } else if (slot === "legs") {
        fill = piece.id.includes("wrap") ? a.secondary : piece.color;
        trim = piece.trim;
      } else if (slot === "boots") {
        fill = piece.id.includes("sandal") ? "#c4a574" : piece.color;
        trim = piece.trim;
      } else if (slot === "gloves" || slot === "shoulder") {
        fill = piece.color;
        trim = piece.trim;
      }
    }
    if (id.startsWith("thigh") || id.startsWith("shin")) {
      const legs = armorById(f.loadout.armor.legs);
      if (legs && !legs.id.includes("wrap")) {
        fill = legs.color;
        trim = legs.trim;
      } else fill = skin;
    }
    return { fill, trim, metal };
  }

  private hair(f: Fighter, cam: Camera) {
    const b = f.head;
    const s = this.w2s(b.position.x, b.position.y, cam);
    const c = this.ctx;
    c.save();
    c.translate(px(s.x), px(s.y));
    c.rotate(b.angle);
    drawHairStrand(c, f.appearance.hair, HairColors[f.appearance.hairColor] ?? HairColors[0], cam.zoom);
    c.restore();
  }

  private weapon(w: WeaponEntity, cam: Camera) {
    const b = w.body;
    const s = this.w2s(b.position.x, b.position.y, cam);
    const c = this.ctx;
    c.save();
    c.translate(px(s.x), px(s.y));
    c.rotate(b.angle);
    const z = cam.zoom;
    const def = w.def;
    const lw = def.width * z;
    const lh = def.length * z;

    if (def.isShield) {
      drawShield(c, lw, lh, def.blade, def.haft, shade(def.blade, -25));
    } else if (def.category === "bow") {
      drawBow(c, lh, def.blade, def.haft);
    } else if (def.category === "spear" || def.category === "halberd") {
      drawSpear(c, lw, lh, def.blade, def.haft);
    } else if (def.category === "axe") {
      drawAxe(c, lw, lh, def.blade, def.haft);
    } else if (def.category === "mace") {
      drawMace(c, lw, lh, def.blade, def.haft);
    } else if (def.category === "hammer") {
      drawHammer(c, lw, lh, def.blade, def.haft);
    } else {
      drawSword(c, lw, lh, def.blade, shade(def.haft, 30), def.haft);
    }
    c.restore();
  }

  private arrow(a: MatterBodyLite, cam: Camera) {
    const s = this.w2s(a.position.x, a.position.y, cam);
    const c = this.ctx;
    c.save();
    c.translate(px(s.x), px(s.y));
    c.rotate(a.angle);
    outlinedRect(c, -12, -2, 20, 4, Palette.cream);
    fillRect(c, 6, -4, 6, 8, Palette.bronze);
    fillRect(c, -14, -1, 4, 2, "#6b4423");
    c.restore();
  }

  private prop(x: number, y: number, angle: number, cam: Camera, hp: number) {
    const s = this.w2s(x, y, cam);
    const c = this.ctx;
    c.save();
    c.translate(px(s.x), px(s.y));
    c.rotate(angle);
    outlinedRect(c, -12, -12, 24, 24, hp > 0.4 ? Palette.leather : Palette.bark);
    fillRect(c, -12, -12, 24, 4, Palette.gold);
    fillRect(c, -8, -4, 16, 2, shade(Palette.leather, -20));
    c.restore();
  }

  private fx(p: ParticleSystem, cam: Camera) {
    const c = this.ctx;
    for (const q of p.list) {
      const s = this.w2s(q.x, q.y, cam);
      c.globalAlpha = Math.max(0, q.life / q.max);
      c.fillStyle = q.color;
      c.fillRect(px(s.x), px(s.y), q.size, q.size);
    }
    c.globalAlpha = 1;
  }

  private vignette() {
    const c = this.ctx;
    const g = c.createRadialGradient(GAME_W / 2, GAME_H / 2, 60, GAME_W / 2, GAME_H / 2, 380);
    g.addColorStop(0, "#0000");
    g.addColorStop(1, "#00000066");
    c.fillStyle = g;
    c.fillRect(0, 0, GAME_W, GAME_H);
  }

  w2s(x: number, y: number, cam: Camera) {
    return {
      x: (x - cam.x) * cam.zoom + GAME_W / 2 + cam.offsetX(),
      y: (y - cam.y) * cam.zoom + GAME_H / 2 + cam.offsetY(),
    };
  }

  blit(target: HTMLCanvasElement) {
    const t = target.getContext("2d")!;
    t.imageSmoothingEnabled = false;
    t.fillStyle = "#000";
    t.fillRect(0, 0, target.width, target.height);
    const scale = Math.max(target.width / GAME_W, target.height / GAME_H);
    const dw = GAME_W * scale;
    const dh = GAME_H * scale;
    t.drawImage(this.buf, (target.width - dw) / 2, (target.height - dh) / 2, dw, dh);
  }
}

export interface MatterBodyLite {
  position: { x: number; y: number };
  angle: number;
}
