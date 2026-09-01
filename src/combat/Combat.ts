import Matter from "matter-js";
import type { HitInfo, LimbId } from "../core/types";
import { Collision } from "../core/constants";
import { len, norm } from "../core/math";
import type { Fighter } from "../character/Fighter";
import { partFromLabel } from "../physics/Ragdoll";

export interface CombatEvent {
  type: "hit" | "block" | "disarm";
  hit?: HitInfo;
  fighter?: Fighter;
}

export class CombatSystem {
  cooldown = new Map<string, number>();
  events: CombatEvent[] = [];

  begin() {
    this.events = [];
  }

  tick(dt: number) {
    for (const [k, v] of [...this.cooldown]) {
      const n = v - dt;
      if (n <= 0) this.cooldown.delete(k);
      else this.cooldown.set(k, n);
    }
  }

  process(pairs: { bodyA: Matter.Body; bodyB: Matter.Body }[], fighters: Fighter[]) {
    for (const col of pairs) this.consider(col.bodyA, col.bodyB, fighters);
  }

  consider(a: Matter.Body, b: Matter.Body, fighters: Fighter[]) {
    const wa = isStrike(a) ? a : isStrike(b) ? b : null;
    const lb = isLimb(a) ? a : isLimb(b) ? b : null;
    const sh = isShield(a) ? a : isShield(b) ? b : null;
    if (wa && lb) this.hitWeaponLimb(wa, lb, fighters, false);
    else if (wa && sh) this.hitWeaponLimb(wa, sh, fighters, true);
  }

  private hitWeaponLimb(weapon: Matter.Body, limb: Matter.Body, fighters: Fighter[], shield: boolean) {
    const atk = ownerOfWeapon(weapon, fighters);
    const vic = ownerOfLimb(limb, fighters);
    if (!atk || !vic || atk === vic || !atk.alive || !vic.alive) return;
    if (weaponGroup(weapon) === vic.group && !weapon.label.startsWith("arrow")) return;
    const key = `${atk.id}:${vic.id}`;
    if ((this.cooldown.get(key) ?? 0) > 0) return;
    const relx = weapon.velocity.x - limb.velocity.x;
    const rely = weapon.velocity.y - limb.velocity.y;
    const impact = len(relx, rely);
    const attacking = atk.state === "attack" || atk.attackCd > 0;
    const isArrow = weapon.label.startsWith("arrow");
    if (impact < (isArrow ? 0.8 : attacking ? 0.35 : 1.15)) return;
    this.cooldown.set(key, isArrow ? 1 : attacking ? 0.26 : 0.18);
    const def = atk.weapon?.def;
    const n = norm(relx || atk.aim.x || 1, rely || atk.aim.y);
    const part = (partFromLabel(limb.label) ?? "torso") as LimbId;
    const dmgBase = def?.damage ?? (isArrow ? 15 : 10);
    const weight = def?.weight ?? 1;
    const swing = attacking ? Math.max(impact, 2.6) : impact;
    const dmg = dmgBase * (0.26 + swing * 0.09) * (0.7 + weight * 0.15);
    const kb = (def?.knockback ?? 1) * impact * 0.002;
    const hit: HitInfo = {
      attackerId: atk.id,
      victimId: vic.id,
      part,
      damage: Math.max(3, dmg),
      knockback: { x: n.x * kb * 48, y: n.y * kb * 30 - 0.005 },
      impact,
      blocked: false,
      location: shield ? "shield" : vic.locationOf(part),
      weaponId: def?.id ?? "loose",
    };
    const res = vic.takeHit(hit);
    hit.blocked = res.blocked;
    hit.damage = res.applied;
    if (!res.blocked) {
      atk.combo += 1;
      atk.comboTimer = 1.45;
    }
    if (!res.blocked && (part === "handR" || part === "forearmR" || part === "upperArmR") && impact > 8.5) {
      if (Math.random() < 0.18 + impact * 0.015) this.events.push({ type: "disarm", fighter: vic, hit });
    }
    this.events.push({ type: res.blocked ? "block" : "hit", hit, fighter: vic });
    if (isArrow) {
      weapon.label = "arrow:spent";
      weapon.collisionFilter.mask = Collision.world | Collision.prop;
    }
  }
}

function isStrike(b: Matter.Body) {
  return b.label.startsWith("weapon") || b.label.startsWith("arrow");
}
function isLimb(b: Matter.Body) {
  return b.label.startsWith("limb");
}
function isShield(b: Matter.Body) {
  return b.label.includes("buckler") || b.label.includes("scutum") || (b.label.startsWith("weapon") && b.collisionFilter.category === Collision.shield);
}

function weaponGroup(b: Matter.Body) {
  const p = b.label.split(":");
  if (p[0] === "arrow") return Number(p[1]);
  if (p[0] === "weapon") return Number(p[2] ?? p[1]);
  return NaN;
}

function ownerOfWeapon(b: Matter.Body, fighters: Fighter[]) {
  const g = weaponGroup(b);
  const byGroup = fighters.find((f) => f.group === g);
  if (byGroup) return byGroup;
  return fighters.find((f) => f.weapon?.body === b || f.shield?.body === b);
}

function ownerOfLimb(b: Matter.Body, fighters: Fighter[]) {
  const g = Number(b.label.split(":")[1]);
  return fighters.find((f) => f.group === g);
}

export function spawnArrow(from: Fighter, world: Matter.World) {
  if (!from.weapon) return null;
  const n = norm(from.aim.x, from.aim.y);
  const o = from.weapon.body.position;
  const arrow = Matter.Bodies.rectangle(o.x + n.x * 20, o.y + n.y * 16, 24, 3, {
    density: 0.0009,
    frictionAir: 0.004,
    restitution: 0.04,
    angle: Math.atan2(n.y, n.x),
    label: `arrow:${from.group}`,
    collisionFilter: {
      group: -from.group,
      category: Collision.weapon,
      mask: Collision.world | Collision.fighter | Collision.shield | Collision.prop,
    },
  });
  const power = 9 + from.charge * 11;
  Matter.Body.setVelocity(arrow, { x: n.x * power, y: n.y * power - 0.8 });
  Matter.Composite.add(world, arrow);
  return arrow;
}
