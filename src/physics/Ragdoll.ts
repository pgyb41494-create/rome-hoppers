import Matter from "matter-js";
import { Collision } from "../core/constants";
import type { Appearance, LimbId } from "../core/types";

export type BodyMap = Record<LimbId, Matter.Body>;

export interface Ragdoll {
  bodies: BodyMap;
  list: Matter.Body[];
  constraints: Matter.Constraint[];
  group: number;
}

export function createRagdoll(
  x: number,
  y: number,
  appearance: Appearance,
  group: number,
): Ragdoll {
  const h = appearance.height;
  const w = appearance.width;
  const m = 0.7 + appearance.muscle * 0.6;
  const dens = 0.0012 * m;

  const part = (
    id: LimbId,
    body: Matter.Body,
  ) => {
    body.label = `limb:${group}:${id}`;
    body.collisionFilter = {
      group: -group,
      category: Collision.fighter,
      mask: Collision.world | Collision.weapon | Collision.shield | Collision.prop | Collision.sensor | Collision.pickup,
    };
    body.friction = id.startsWith("foot") ? 0.95 : 0.35;
    body.frictionAir = 0.04;
    body.restitution = 0.05;
    (body as Matter.Body & { plugin: unknown }).plugin = { part: id, fighterGroup: group };
    return body;
  };

  const head = part(
    "head",
    Matter.Bodies.circle(x, y - 46 * h, 9.5 * w, { density: dens * 0.7 }),
  );
  const torso = part(
    "torso",
    Matter.Bodies.rectangle(x, y - 24 * h, 20 * w, 26 * h, { density: dens * 1.3, chamfer: { radius: 4 } }),
  );
  const pelvis = part(
    "pelvis",
    Matter.Bodies.rectangle(x, y - 6 * h, 18 * w, 12 * h, { density: dens * 1.4, chamfer: { radius: 3 } }),
  );
  const upperArmL = part(
    "upperArmL",
    Matter.Bodies.rectangle(x - 16 * w, y - 28 * h, 7 * w, 18 * h, { density: dens * 0.7, chamfer: { radius: 2 } }),
  );
  const upperArmR = part(
    "upperArmR",
    Matter.Bodies.rectangle(x + 16 * w, y - 28 * h, 7 * w, 18 * h, { density: dens * 0.7, chamfer: { radius: 2 } }),
  );
  const forearmL = part(
    "forearmL",
    Matter.Bodies.rectangle(x - 16 * w, y - 10 * h, 6 * w, 16 * h, { density: dens * 0.6, chamfer: { radius: 2 } }),
  );
  const forearmR = part(
    "forearmR",
    Matter.Bodies.rectangle(x + 16 * w, y - 10 * h, 6 * w, 16 * h, { density: dens * 0.6, chamfer: { radius: 2 } }),
  );
  const handL = part(
    "handL",
    Matter.Bodies.rectangle(x - 16 * w, y + 2 * h, 8 * w, 8 * h, { density: dens * 0.5, chamfer: { radius: 2 } }),
  );
  const handR = part(
    "handR",
    Matter.Bodies.rectangle(x + 16 * w, y + 2 * h, 8 * w, 8 * h, { density: dens * 0.5, chamfer: { radius: 2 } }),
  );
  const thighL = part(
    "thighL",
    Matter.Bodies.rectangle(x - 7 * w, y + 12 * h, 9 * w, 20 * h, { density: dens, chamfer: { radius: 3 } }),
  );
  const thighR = part(
    "thighR",
    Matter.Bodies.rectangle(x + 7 * w, y + 12 * h, 9 * w, 20 * h, { density: dens, chamfer: { radius: 3 } }),
  );
  const shinL = part(
    "shinL",
    Matter.Bodies.rectangle(x - 7 * w, y + 32 * h, 7 * w, 18 * h, { density: dens * 0.8, chamfer: { radius: 2 } }),
  );
  const shinR = part(
    "shinR",
    Matter.Bodies.rectangle(x + 7 * w, y + 32 * h, 7 * w, 18 * h, { density: dens * 0.8, chamfer: { radius: 2 } }),
  );
  const footL = part(
    "footL",
    Matter.Bodies.rectangle(x - 6 * w, y + 44 * h, 14 * w, 6 * h, { density: dens * 0.9, chamfer: { radius: 2 } }),
  );
  const footR = part(
    "footR",
    Matter.Bodies.rectangle(x + 6 * w, y + 44 * h, 14 * w, 6 * h, { density: dens * 0.9, chamfer: { radius: 2 } }),
  );

  const bodies: BodyMap = {
    head,
    torso,
    pelvis,
    upperArmL,
    upperArmR,
    forearmL,
    forearmR,
    handL,
    handR,
    thighL,
    thighR,
    shinL,
    shinR,
    footL,
    footR,
  };

  const joint = (
    a: Matter.Body,
    b: Matter.Body,
    ax: number,
    ay: number,
    bx: number,
    by: number,
    stiffness = 0.85,
  ) =>
    Matter.Constraint.create({
      bodyA: a,
      bodyB: b,
      pointA: { x: ax, y: ay },
      pointB: { x: bx, y: by },
      stiffness,
      damping: 0.12,
      length: 0,
    });

  const constraints = [
    joint(head, torso, 0, 10 * h, 0, -13 * h, 0.9),
    joint(torso, pelvis, 0, 13 * h, 0, -6 * h, 0.95),
    joint(torso, upperArmL, -10 * w, -10 * h, 0, -9 * h, 0.8),
    joint(torso, upperArmR, 10 * w, -10 * h, 0, -9 * h, 0.8),
    joint(upperArmL, forearmL, 0, 9 * h, 0, -8 * h, 0.82),
    joint(upperArmR, forearmR, 0, 9 * h, 0, -8 * h, 0.82),
    joint(forearmL, handL, 0, 8 * h, 0, -4 * h, 0.88),
    joint(forearmR, handR, 0, 8 * h, 0, -4 * h, 0.88),
    joint(pelvis, thighL, -6 * w, 6 * h, 0, -10 * h, 0.9),
    joint(pelvis, thighR, 6 * w, 6 * h, 0, -10 * h, 0.9),
    joint(thighL, shinL, 0, 10 * h, 0, -9 * h, 0.88),
    joint(thighR, shinR, 0, 10 * h, 0, -9 * h, 0.88),
    joint(shinL, footL, 0, 9 * h, -2 * w, -3 * h, 0.9),
    joint(shinR, footR, 0, 9 * h, -2 * w, -3 * h, 0.9),
  ];

  return { bodies, list: Object.values(bodies), constraints, group };
}

export function applyUpright(body: Matter.Body, strength: number, damp: number) {
  const err = body.angle;
  const t = -err * strength - body.angularVelocity * damp;
  Matter.Body.setAngularVelocity(body, body.angularVelocity + t);
}

export function applyJointTarget(body: Matter.Body, targetAngle: number, stiffness: number, damping: number) {
  const err = body.angle - targetAngle;
  const t = -err * stiffness - body.angularVelocity * damping;
  Matter.Body.setAngularVelocity(body, body.angularVelocity + t);
}

export function partFromLabel(label: string): LimbId | null {
  const bits = label.split(":");
  return (bits[2] as LimbId) ?? null;
}
