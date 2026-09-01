import Matter from "matter-js";
import { Collision } from "../core/constants";

export class PhysicsWorld {
  engine: Matter.Engine;
  world: Matter.World;

  constructor(quality: "low" | "medium" | "high") {
    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: 1.15, scale: 0.001 },
      enableSleeping: false,
    });
    this.world = this.engine.world;
    this.setQuality(quality);
  }

  setQuality(q: "low" | "medium" | "high") {
    this.engine.positionIterations = q === "low" ? 4 : q === "medium" ? 6 : 8;
    this.engine.velocityIterations = q === "low" ? 3 : q === "medium" ? 4 : 6;
    this.engine.constraintIterations = q === "low" ? 2 : q === "medium" ? 3 : 4;
  }

  step(dt: number) {
    Matter.Engine.update(this.engine, Math.min(dt, 1 / 30) * 1000);
  }

  add(...bodies: (Matter.Body | Matter.Constraint | Matter.Composite)[]) {
    Matter.Composite.add(this.world, bodies);
  }

  remove(...bodies: (Matter.Body | Matter.Constraint | Matter.Composite)[]) {
    for (const b of bodies) Matter.Composite.remove(this.world, b);
  }

  clear() {
    Matter.World.clear(this.world, false);
    Matter.Engine.clear(this.engine);
  }

  static wall(x: number, y: number, w: number, h: number, label = "arena:wall") {
    return Matter.Bodies.rectangle(x, y, w, h, {
      isStatic: true,
      friction: 0.85,
      frictionStatic: 0.9,
      restitution: 0.05,
      label,
      collisionFilter: { category: Collision.world, mask: 0xffff },
      chamfer: { radius: 2 },
    });
  }

  static sensor(x: number, y: number, w: number, h: number, label: string) {
    return Matter.Bodies.rectangle(x, y, w, h, {
      isStatic: true,
      isSensor: true,
      label,
      collisionFilter: { category: Collision.sensor, mask: Collision.fighter },
    });
  }
}
