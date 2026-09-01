import type { AiDifficulty, FighterInput } from "../core/types";
import { blankInput } from "../engine/Input";
import { clamp, len } from "../core/math";
import type { Fighter } from "../character/Fighter";
import type { WeaponEntity } from "../weapons/Weapon";

export class FighterAI {
  difficulty: AiDifficulty;
  timer = 0;
  plan: "chase" | "attack" | "block" | "dodge" | "retreat" | "pickup" | "circle" = "chase";
  thinkCd = 0;
  attackHold = 0;
  noise = { x: 0, y: 0 };

  constructor(difficulty: AiDifficulty = "skilled") {
    this.difficulty = difficulty;
    this.retune();
  }

  retune() {
    const d = this.difficulty;
    this.thinkCd = d === "novice" ? 0.42 : d === "skilled" ? 0.22 : d === "veteran" ? 0.12 : 0.07;
  }

  update(dt: number, self: Fighter, enemy: Fighter, loose: WeaponEntity[]): FighterInput {
    const input = blankInput();
    if (!self.alive || self.isDummy) return input;
    this.timer += dt;
    this.attackHold = Math.max(0, this.attackHold - dt);
    this.thinkCd -= dt;

    const dx = enemy.pelvis.position.x - self.pelvis.position.x;
    const dy = enemy.pelvis.position.y - self.pelvis.position.y;
    const dist = len(dx, dy);
    const reach = self.weapon?.def.reach ?? 28;
    const skill = this.skill();

    if (this.thinkCd <= 0) {
      this.thinkCd = this.baseThink() * (0.7 + Math.random() * 0.6);
      this.decide(self, enemy, dist, reach, loose);
      this.noise.x = (Math.random() - 0.5) * (1.1 - skill);
      this.noise.y = (Math.random() - 0.5) * (1.1 - skill);
    }

    const aimX = dx + this.noise.x * 40;
    const aimY = dy - 10 + this.noise.y * 20;
    input.aimX = aimX;
    input.aimY = aimY;

    if (!self.weapon && loose.length) this.plan = "pickup";

    switch (this.plan) {
      case "chase":
        input.moveX = Math.sign(dx);
        if (dist < reach * 1.15) this.plan = "attack";
        if (self.stamina < 22) this.plan = "retreat";
        break;
      case "circle":
        input.moveX = Math.sin(this.timer * 1.4) > 0 ? Math.sign(dx) : -Math.sign(dx);
        input.crouch = Math.sin(this.timer * 3) > 0.7;
        if (dist > reach * 2) this.plan = "chase";
        if (dist < reach * 1.1 && self.stamina > 30) this.plan = "attack";
        break;
      case "attack":
        input.moveX = dist > reach * 0.75 ? Math.sign(dx) : dist < reach * 0.4 ? -Math.sign(dx) : 0;
        if (self.weapon?.def.isRanged) {
          input.attackHeld = dist > 70;
          input.attack = dist > 70;
        } else {
          input.attackHeld = true;
          input.attack = this.attackHold <= 0;
          if (this.attackHold <= 0) this.attackHold = 0.12 + (1 - skill) * 0.25;
        }
        if (enemy.state === "attack" && Math.random() < skill * 0.08) this.plan = "block";
        if (self.stamina < 18) this.plan = "retreat";
        break;
      case "block":
        input.block = true;
        input.moveX = -Math.sign(dx) * 0.4;
        if (enemy.state !== "attack" || self.stamina < 10) this.plan = "circle";
        break;
      case "dodge":
        input.dodge = true;
        input.moveX = -Math.sign(dx);
        this.plan = "circle";
        break;
      case "retreat":
        input.moveX = -Math.sign(dx);
        input.block = enemy.state === "attack";
        if (self.stamina > 45) this.plan = "chase";
        if (!self.weapon) this.plan = "pickup";
        break;
      case "pickup": {
        const w = nearest(self, loose);
        if (w) {
          input.moveX = Math.sign(w.body.position.x - self.pelvis.position.x);
          input.interact = Math.abs(w.body.position.x - self.pelvis.position.x) < 36;
        } else this.plan = "retreat";
        break;
      }
    }

    if (enemy.state === "attack" && dist < reach * 1.3) {
      if (Math.random() < skill * 0.035) {
        input.dodge = true;
        input.moveX = -Math.sign(dx);
      } else if (Math.random() < skill * 0.05) input.block = true;
    }

    if (self.onGround && enemy.pelvis.position.y < self.pelvis.position.y - 40 && Math.random() < skill * 0.02) {
      input.jump = true;
    }

    if (self.weapon && dist < 50 && Math.random() < 0.002 && skill > 0.6) input.throw = true;

    input.moveX = clamp(input.moveX, -1, 1);
    return input;
  }

  private decide(self: Fighter, enemy: Fighter, dist: number, reach: number, loose: WeaponEntity[]) {
    if (!self.weapon && loose.length) {
      this.plan = "pickup";
      return;
    }
    const enemyReach = enemy.weapon?.def.reach ?? 30;
    if (self.stamina < 20) {
      this.plan = "retreat";
      return;
    }
    if (enemy.state === "attack" && dist < enemyReach * 1.2) {
      this.plan = Math.random() < 0.55 ? "block" : "dodge";
      return;
    }
    if (self.weapon?.def.isRanged) {
      this.plan = dist < 70 ? "retreat" : "attack";
      return;
    }
    if (dist > reach * 1.8) this.plan = "chase";
    else if (dist < reach * 0.45) this.plan = "circle";
    else this.plan = "attack";
  }

  private skill() {
    return { novice: 0.28, skilled: 0.55, veteran: 0.78, champion: 0.94 }[this.difficulty];
  }

  private baseThink() {
    return { novice: 0.38, skilled: 0.2, veteran: 0.11, champion: 0.06 }[this.difficulty];
  }
}

function nearest(self: Fighter, loose: WeaponEntity[]) {
  let best: WeaponEntity | null = null;
  let d = 1e9;
  for (const w of loose) {
    const dd = Math.abs(w.body.position.x - self.pelvis.position.x);
    if (dd < d) {
      d = dd;
      best = w;
    }
  }
  return best;
}
