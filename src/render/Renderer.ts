import { HairColors, Palette, SkinTones } from "../core/constants";
import { HairStyles } from "../core/identity";
import { px } from "../core/math";
import type { Appearance, LimbId } from "../core/types";
import { armorById } from "../armor/catalog";
import type { Fighter } from "../character/Fighter";
import type { ArenaInstance } from "../arenas/catalog";
import type { WeaponEntity } from "../weapons/Weapon";
import type { ParticleSystem } from "./Particles";
import type { Camera } from "../engine/Camera";
import { GAME_H, GAME_W } from "../core/constants";

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
      drawables.push({
        z: w.body.position.y,
        fn: () => this.weapon(w, camera),
      });
    }
    for (const a of arrows) {
      drawables.push({
        z: a.position.y,
        fn: () => this.arrow(a, camera),
      });
    }
    for (const f of fighters) {
      drawables.push({
        z: f.pelvis.position.y,
        fn: () => this.fighter(f, camera),
      });
    }
    drawables.sort((a, b) => a.z - b.z);
    for (const d of drawables) d.fn();
    this.fx(particles, camera);
    this.vignette();
  }

  private bg(arena: ArenaInstance, cam: Camera) {
    const c = this.ctx;
    const def = arena.def;
    for (let i = 0; i < 3; i++) {
      const par = 0.15 + i * 0.22;
      const x = -((cam.x * par) % 48);
      c.fillStyle = def.bg[Math.min(i, def.bg.length - 1)];
      if (i === 0) {
        c.fillRect(0, 0, GAME_W, GAME_H);
        continue;
      }
      for (let col = -2; col < 18; col++) {
        const px0 = x + col * 48;
        const h = 40 + ((col * 13) % 50) + i * 20;
        c.fillRect(px(px0), px(GAME_H - 70 - h + i * 8), 20 + i * 6, h);
      }
    }
    for (const p of def.platforms) this.plat(p.x, p.y, p.w, p.h, cam, def.accent);
    const g = this.w2s(def.w / 2, def.ground, cam);
    c.fillStyle = def.bg[2] ?? Palette.sand;
    c.fillRect(0, px(g.y), GAME_W, GAME_H);
    c.fillStyle = "#00000033";
    for (let i = 0; i < GAME_W; i += 8) c.fillRect(i, px(g.y), 4, 4);
    c.fillStyle = "#ffffff18";
    for (let i = 4; i < GAME_W; i += 16) c.fillRect(i, px(g.y) + 8, 8, 8);
    for (const pit of def.pits) {
      const s = this.w2s(pit.x, def.ground, cam);
      c.fillStyle = "#07080c";
      c.fillRect(px(s.x - pit.w / 2 * cam.zoom), px(s.y), px(pit.w * cam.zoom), 80);
    }
    for (const t of def.traps) {
      const s = this.w2s(t.x, t.y, cam);
      c.fillStyle = Palette.crimson;
      c.fillRect(px(s.x - t.w / 2 * cam.zoom), px(s.y), px(t.w * cam.zoom), px(6 * cam.zoom));
    }
    this.columns(def, cam);
  }

  private columns(def: ArenaInstance["def"], cam: Camera) {
    const c = this.ctx;
    c.fillStyle = def.accent + "99";
    for (const x of [80, def.w - 80, 200, def.w - 200]) {
      const s = this.w2s(x, def.ground, cam);
      c.fillRect(px(s.x - 8), px(s.y - 160 * cam.zoom), px(16 * cam.zoom), px(160 * cam.zoom));
      c.fillRect(px(s.x - 14), px(s.y - 168 * cam.zoom), px(28 * cam.zoom), px(10 * cam.zoom));
    }
  }

  private plat(x: number, y: number, w: number, h: number, cam: Camera, color: string) {
    const s = this.w2s(x, y, cam);
    const c = this.ctx;
    c.fillStyle = color;
    c.fillRect(px(s.x - (w / 2) * cam.zoom), px(s.y - (h / 2) * cam.zoom), px(w * cam.zoom), px(h * cam.zoom));
    c.fillStyle = "#00000044";
    c.fillRect(px(s.x - (w / 2) * cam.zoom), px(s.y + (h / 2) * cam.zoom - 3), px(w * cam.zoom), 3);
  }

  private fighter(f: Fighter, cam: Camera) {
    const feet = this.w2s(
      (f.ragdoll.bodies.footL.position.x + f.ragdoll.bodies.footR.position.x) / 2,
      Math.max(f.ragdoll.bodies.footL.position.y, f.ragdoll.bodies.footR.position.y),
      cam,
    );
    this.ctx.fillStyle = "#00000055";
    this.ctx.fillRect(px(feet.x - 14 * cam.zoom), px(feet.y - 2), px(28 * cam.zoom), 4);
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
    this.hair(f, cam);
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
    const col = this.limbColor(f, id, skin);
    const drawCol = f.flash > 0 ? "#f0e6d0" : col;
    c.fillStyle = "#140e0a";
    c.fillRect(px(-w / 2) - 1, px(-h / 2) - 1, px(w) + 2, px(h) + 2);
    c.fillStyle = drawCol;
    if (id === "head") {
      c.beginPath();
      c.arc(0, 0, px(Math.max(w, h) / 2), 0, Math.PI * 2);
      c.fill();
      this.face(f, c, Math.max(w, h) / 2);
    } else {
      c.fillRect(px(-w / 2), px(-h / 2), px(w), px(h));
      c.fillStyle = "#ffffff22";
      c.fillRect(px(-w / 2), px(-h / 2), px(w), 2);
    }
    c.restore();
  }

  private limbColor(f: Fighter, id: LimbId, skin: string) {
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
    if (slot) {
      const piece = armorById(f.loadout.armor[slot]);
      if (piece) {
        if (piece.id.includes("leather") || piece.id.includes("wrap") || piece.id.includes("cloth") || piece.id.includes("sandals")) {
          return slot === "chest" || slot === "legs" ? f.appearance.primary : piece.color;
        }
        return piece.color;
      }
    }
    if (id === "torso" || id === "pelvis") return a.primary;
    return skin;
  }

  private face(f: Fighter, c: CanvasRenderingContext2D, r: number) {
    const face = f.appearance.face;
    c.fillStyle = "#1a120e";
    const dir = f.facing;
    c.fillRect(px(dir * r * 0.2), px(-r * 0.15), 2, 2);
    c.fillRect(px(dir * r * 0.45), px(-r * 0.15), 2, 2);
    if (face === 1) {
      c.fillStyle = "#6b1d2a";
      c.fillRect(px(-r * 0.2), px(r * 0.05), px(r * 0.7), 2);
    }
    if (face === 2) {
      c.fillStyle = f.appearance.primary;
      c.fillRect(px(-r * 0.4), px(-r * 0.35), px(r * 0.8), 3);
    }
    if (face === 3) {
      c.fillStyle = "#3b2418";
      c.fillRect(px(-r * 0.25), px(r * 0.25), px(r * 0.5), 3);
    }
    if (face === 4) {
      c.fillStyle = "#1c242e";
      c.fillRect(px(-r * 0.45), px(-r * 0.1), px(r * 0.9), px(r * 0.45));
    }
  }

  private hair(f: Fighter, cam: Camera) {
    const b = f.head;
    const s = this.w2s(b.position.x, b.position.y, cam);
    const c = this.ctx;
    const col = HairColors[f.appearance.hairColor] ?? HairColors[0];
    const style = HairStyles[f.appearance.hair] ?? "short";
    c.save();
    c.translate(px(s.x), px(s.y));
    c.rotate(b.angle);
    c.fillStyle = col;
    const z = 9 * cam.zoom;
    if (style === "short") c.fillRect(px(-z), px(-z - 3), px(z * 2), 4);
    if (style === "mohawk") c.fillRect(px(-2), px(-z - 8), 4, 10);
    if (style === "tied") {
      c.fillRect(px(-z), px(-z - 2), px(z * 2), 4);
      c.fillRect(px(-3), px(-z - 8), 6, 6);
    }
    if (style === "long") c.fillRect(px(-z), px(-2), px(z * 2), px(z + 6));
    if (style === "wreath") {
      c.fillStyle = Palette.gold;
      c.fillRect(px(-z), px(-z), px(z * 2), 3);
    }
    if (f.appearance.accessory === 1) {
      c.fillStyle = f.appearance.primary;
      const p = this.w2s(f.torso.position.x, f.torso.position.y + 8, cam);
      c.restore();
      c.fillRect(px(p.x - 10 * cam.zoom), px(p.y), px(20 * cam.zoom), px(18 * cam.zoom));
      return;
    }
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
    c.fillStyle = outline(def.haft);
    c.fillRect(px(-lw / 2) - 1, px(-lh / 2) - 1, px(lw) + 2, px(lh) + 2);
    c.fillStyle = def.haft;
    c.fillRect(px(-lw / 4), px(-lh / 2), px(lw / 2), px(lh));
    c.fillStyle = def.blade;
    if (def.isShield) {
      c.fillRect(px(-lw / 2), px(-lh / 2), px(lw), px(lh));
      c.fillStyle = def.haft;
      c.fillRect(px(-3), px(-3), 6, 6);
    } else if (def.category === "bow") {
      c.strokeStyle = def.blade;
      c.lineWidth = 2;
      c.beginPath();
      c.arc(0, 0, lh / 2, -1.2, 1.2);
      c.stroke();
    } else if (def.category === "axe" || def.category === "halberd") {
      c.fillRect(px(-lw / 2), px(-lh / 2), px(lw), px(10 * z));
      c.fillRect(px(-2), px(-lh / 2), 4, px(lh));
    } else if (def.category === "hammer" || def.category === "mace") {
      c.fillRect(px(-lw / 2), px(-lh / 2), px(lw), px(12 * z));
      c.fillRect(px(-2), px(-lh / 2), 4, px(lh));
    } else {
      c.fillRect(px(-lw / 2), px(-lh / 2), px(lw), px(lh * 0.7));
      c.fillStyle = def.haft;
      c.fillRect(px(-2), px(lh * 0.1), 4, px(lh * 0.4));
    }
    c.restore();
  }

  private arrow(a: MatterBodyLite, cam: Camera) {
    const s = this.w2s(a.position.x, a.position.y, cam);
    const c = this.ctx;
    c.save();
    c.translate(px(s.x), px(s.y));
    c.rotate(a.angle);
    c.fillStyle = Palette.cream;
    c.fillRect(-10, -1, 18, 3);
    c.fillStyle = Palette.bronze;
    c.fillRect(6, -3, 6, 6);
    c.restore();
  }

  private prop(x: number, y: number, angle: number, cam: Camera, hp: number) {
    const s = this.w2s(x, y, cam);
    const c = this.ctx;
    c.save();
    c.translate(px(s.x), px(s.y));
    c.rotate(angle);
    c.fillStyle = hp > 0.4 ? Palette.leather : Palette.bark;
    c.fillRect(-12, -12, 24, 24);
    c.fillStyle = Palette.gold;
    c.fillRect(-12, -12, 24, 3);
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
    const g = c.createRadialGradient(GAME_W / 2, GAME_H / 2, 80, GAME_W / 2, GAME_H / 2, 420);
    g.addColorStop(0, "#0000");
    g.addColorStop(1, "#00000055");
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

function outline(hex: string) {
  return "#1a120e";
}

export interface MatterBodyLite {
  position: { x: number; y: number };
  angle: number;
}
