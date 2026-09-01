import Matter from "matter-js";
import { Collision } from "../core/constants";
import type { WeaponDef } from "../core/types";

export class WeaponEntity {
  body: Matter.Body;
  def: WeaponDef;
  weld: Matter.Constraint | null = null;
  ownerGroup: number | null = null;
  thrown = false;
  throwTime = 0;
  durability = 1;

  constructor(def: WeaponDef, x: number, y: number, angle = -0.4) {
    this.def = def;
    const w = def.isShield ? def.width : def.width;
    const h = def.isShield ? def.length : def.length;
    this.body = Matter.Bodies.rectangle(x, y, w, h, {
      density: 0.0011 * def.weight,
      frictionAir: 0.02,
      restitution: 0.12,
      angle,
      chamfer: { radius: def.isShield ? 6 : 2 },
      label: `weapon:${def.id}`,
      collisionFilter: {
        group: 0,
        category: def.isShield ? Collision.shield : Collision.weapon,
        mask: Collision.world | Collision.fighter | Collision.weapon | Collision.shield | Collision.prop,
      },
    });
  }

  attach(hand: Matter.Body, group: number, offX = 0, offY = 6) {
    this.ownerGroup = group;
    this.thrown = false;
    this.body.collisionFilter.group = -group;
    this.body.label = `weapon:${defId(this)}:${group}`;
    this.weld = Matter.Constraint.create({
      bodyA: hand,
      bodyB: this.body,
      pointA: { x: offX, y: offY },
      pointB: { x: 0, y: -this.def.length * 0.38 },
      stiffness: 0.92,
      damping: 0.15,
      length: 0,
    });
    return this.weld;
  }

  detach() {
    this.body.collisionFilter.group = 0;
    this.ownerGroup = null;
    const w = this.weld;
    this.weld = null;
    return w;
  }
}

function defId(w: WeaponEntity) {
  return w.def.id;
}
