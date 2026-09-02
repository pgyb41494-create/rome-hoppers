import Matter from "matter-js";
import { armorById } from "../armor/catalog";
import type { Appearance, ArmorSlot, FighterInput, FighterState, HitInfo, LimbId, Loadout } from "../core/types";
import { clamp, len, norm } from "../core/math";
import { applyJointTarget, applyUpright, createRagdoll, type Ragdoll } from "../physics/Ragdoll";
import { blockPose, crouchPose, IdlePose, jumpPose, runHopPose, staggerPose, StiffStandPose, swingArmAngles, swingPose, walkPose, type PoseMap } from "../physics/Pose";
import { weaponById } from "../weapons/catalog";
import { WeaponEntity } from "../weapons/Weapon";

let nextId = 1;

export class Fighter {
  id: string;
  group: number;
  ragdoll: Ragdoll;
  appearance: Appearance;
  loadout: Loadout;
  weapon: WeaponEntity | null = null;
  shield: WeaponEntity | null = null;
  maxHealth = 100;
  health = 100;
  maxStamina = 100;
  stamina = 100;
  state: FighterState = "idle";
  facing = 1;
  combo = 0;
  comboTimer = 0;
  invuln = 0;
  attackCd = 0;
  dodgeCd = 0;
  jumpCd = 0;
  charge = 0;
  charging = false;
  staggerT = 0;
  downT = 0;
  walkT = 0;
  onGround = false;
  lastInput: FighterInput | null = null;
  aim = { x: 1, y: 0 };
  armorDur: Record<ArmorSlot, number> = {
    helmet: 1,
    chest: 1,
    shoulder: 1,
    gloves: 1,
    legs: 1,
    boots: 1,
  };
  mobility = 1;
  massMul = 1;
  protection: Record<string, number> = {};
  isPlayer = false;
  isDummy = false;
  alive = true;
  freezeT = 0;
  flash = 0;
  footstepT = 0;
  lastHitAt = 0;
  damageTakenThisMatch = 0;
  lastAttackWasThrow = false;
  pendingPickup = false;
  didShoot = false;
  didSwing = false;
  stiffMode = true;
  swingT = 0;
  hopPhase = 0;
  hopVisual = 0;
  hopCooldown = 0;
  squash = 1;
  attackDuration = 0.4;

  constructor(x: number, y: number, appearance: Appearance, loadout: Loadout, group: number, isPlayer = false) {
    this.id = `f${nextId++}`;
    this.group = group;
    this.appearance = appearance;
    this.loadout = loadout;
    this.isPlayer = isPlayer;
    this.ragdoll = createRagdoll(x, y, appearance, group);
    this.applyArmorStats();
  }

  get pelvis() {
    return this.ragdoll.bodies.pelvis;
  }
  get torso() {
    return this.ragdoll.bodies.torso;
  }
  get head() {
    return this.ragdoll.bodies.head;
  }
  get handR() {
    return this.ragdoll.bodies.handR;
  }
  get handL() {
    return this.ragdoll.bodies.handL;
  }

  applyArmorStats() {
    let weight = 0;
    let mob = 1;
    const prot: Record<string, number> = { head: 0, torso: 0, arm: 0, leg: 0 };
    for (const slot of Object.keys(this.loadout.armor) as ArmorSlot[]) {
      const a = armorById(this.loadout.armor[slot]);
      if (!a) continue;
      weight += a.weight;
      mob *= a.mobility;
      this.armorDur[slot] = 1;
      if (slot === "helmet") prot.head += a.protection;
      if (slot === "chest" || slot === "shoulder") prot.torso += a.protection;
      if (slot === "gloves") prot.arm += a.protection;
      if (slot === "legs" || slot === "boots") prot.leg += a.protection;
    }
    this.mobility = clamp(mob, 0.7, 1.15);
    this.massMul = 1 + weight * 0.04;
    this.protection = prot;
    this.maxStamina = 100 - weight * 3;
    this.stamina = this.maxStamina;
  }

  spawnGear(world: Matter.World) {
    const wdef = weaponById(this.loadout.weaponId);
    this.weapon = new WeaponEntity(wdef, this.handR.position.x, this.handR.position.y, -0.6);
    const weld = this.weapon.attach(this.handR, this.group);
    Matter.Composite.add(world, [this.weapon.body, weld!]);
    if (this.loadout.offhandId && !wdef.twoHanded) {
      const sdef = weaponById(this.loadout.offhandId);
      this.shield = new WeaponEntity(sdef, this.handL.position.x, this.handL.position.y, 0);
      const sw = this.shield.attach(this.handL, this.group, 0, 2);
      Matter.Composite.add(world, [this.shield.body, sw!]);
    }
  }

  addToWorld(world: Matter.World) {
    Matter.Composite.add(world, [...this.ragdoll.list, ...this.ragdoll.constraints]);
    this.spawnGear(world);
  }

  removeFromWorld(world: Matter.World) {
    for (const c of this.ragdoll.constraints) Matter.Composite.remove(world, c);
    for (const b of this.ragdoll.list) Matter.Composite.remove(world, b);
    if (this.weapon) {
      if (this.weapon.weld) Matter.Composite.remove(world, this.weapon.weld);
      Matter.Composite.remove(world, this.weapon.body);
    }
    if (this.shield) {
      if (this.shield.weld) Matter.Composite.remove(world, this.shield.weld);
      Matter.Composite.remove(world, this.shield.body);
    }
  }

  update(dt: number, input: FighterInput, groundY: number) {
    this.lastInput = input;
    this.freezeT = Math.max(0, this.freezeT - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.attackCd = Math.max(0, this.attackCd - dt);
    this.dodgeCd = Math.max(0, this.dodgeCd - dt);
    this.jumpCd = Math.max(0, this.jumpCd - dt);
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (this.comboTimer <= 0) this.combo = 0;
    this.staggerT = Math.max(0, this.staggerT - dt);
    this.downT = Math.max(0, this.downT - dt);

    const p = this.pelvis;
    this.onGround = this.ragdoll.bodies.footL.position.y > groundY - 18 || this.ragdoll.bodies.footR.position.y > groundY - 18;

    if (!this.alive) {
      this.state = "dead";
      return;
    }
    if (this.isDummy) {
      this.applyPose(StiffStandPose, 0.38, 0.14);
      applyUpright(this.torso, 0.28, 0.16);
      applyUpright(this.pelvis, 0.26, 0.14);
      return;
    }

    if (this.health <= 0) {
      this.alive = false;
      this.state = "dead";
      return;
    }

    if (this.staggerT > 0) {
      this.state = "stagger";
      this.applyPose(staggerPose(this.facing), 0.05, 0.04);
      applyUpright(this.torso, 0.04, 0.03);
      this.regen(dt * 0.3);
      return;
    }
    if (this.downT > 0) {
      this.state = "down";
      applyUpright(this.torso, 0.02, 0.02);
      return;
    }

    if (Math.abs(input.moveX) > 0.15) {
      // Facing is locked per side — never flip to face movement or aim.
    }

    const aimLen = Math.hypot(input.aimX, input.aimY);
    if (aimLen > 0.2) {
      this.aim.x = input.aimX / aimLen;
      this.aim.y = input.aimY / aimLen;
    } else {
      this.aim.x = this.facing;
      this.aim.y = input.crouch ? 0.35 : input.jump ? -0.25 : 0;
    }

    this.swingT = Math.max(0, this.swingT - dt);

    if (input.block && this.stamina > 4) {
      this.state = "block";
      this.stamina -= dt * 6;
      this.applyStiffBody(blockPose(this.facing), 0.32);
      this.driveArm(this.facing * 0.9, -0.4, dt, 0.2);
      this.stand(dt, 0.75);
      if (Math.abs(input.moveX) > 0.3) this.move(input.moveX * 0.35, dt);
      return;
    }

    if (input.dodge && this.dodgeCd <= 0 && this.stamina >= 16 && this.onGround) {
      this.dodge(input.moveX || this.facing);
    }

    if (this.state === "dodge") {
      this.stand(dt, 0.3);
      this.driveArm(this.aim.x, this.aim.y, dt, 0.1);
      if (this.dodgeCd < 0.28) this.state = "idle";
      this.regen(dt * 0.2);
      return;
    }

    if (input.attackHeld && !input.block && this.attackCd <= 0 && this.stamina > 5) {
      this.charging = true;
      this.charge = Math.min(1, this.charge + dt * (this.weapon?.def.attackSpeed ?? 1) * 1.4);
    }

    if (this.charging && (!input.attackHeld || this.charge >= 1)) {
      this.doAttack(this.charge);
      this.charging = false;
      this.charge = 0;
    }

    if (input.jump && this.onGround && this.jumpCd <= 0 && this.stamina >= 8) {
      Matter.Body.applyForce(p, p.position, { x: 0, y: -0.045 * this.massMul });
      this.stamina -= 8;
      this.jumpCd = 0.45;
      this.state = "jump";
    }

    if (input.throw) this.tryThrow();
    if (input.interact) this.pendingPickup = true;

    const moving = Math.abs(input.moveX) > 0.15 && this.onGround && !input.crouch;
    if (input.crouch && this.onGround) {
      this.state = "crouch";
      this.applyStiffBody(crouchPose(this.facing), 0.3);
      this.move(input.moveX * 0.35, dt);
    } else if (!this.onGround) {
      this.state = "jump";
      this.applyStiffBody(jumpPose(), 0.28);
      this.move(input.moveX * 0.45, dt);
    } else if (moving) {
      this.state = "run";
      this.walkT += dt * 14 * this.mobility;
      this.hopPhase += dt * 15 * this.mobility;
      this.hopVisual = Math.max(0, Math.sin(this.hopPhase));
      this.squash = 1 - this.hopVisual * 0.14;
      if (this.hopVisual > 0.9 && this.onGround && this.hopCooldown <= 0) {
        const hop = 0.038 * this.massMul;
        Matter.Body.applyForce(this.pelvis, this.pelvis.position, { x: 0, y: -hop });
        Matter.Body.applyForce(this.torso, this.torso.position, { x: 0, y: -hop * 0.55 });
        this.hopCooldown = 0.13;
      }
      this.hopCooldown = Math.max(0, this.hopCooldown - dt);
      this.applyStiffBody({ ...StiffStandPose, ...runHopPose(this.walkT) }, 0.4);
      this.move(input.moveX, dt);
      this.stamina -= dt * 4;
      this.footstepT -= dt;
    } else {
      this.state = "idle";
      this.hopVisual = 0;
      this.squash = 1;
      this.applyStiffBody(StiffStandPose, 0.38);
      this.regen(dt);
    }

    if (this.attackCd > 0.08) {
      this.state = "attack";
      this.swingT = Math.max(this.swingT, this.attackCd);
      this.applyStiffBody(swingPose(this.facing, 0.8 + this.charge * 0.4), 0.34);
    }
    if (this.state === "attack" && this.attackCd > 0) {
      const progress = 1 - this.attackCd / this.attackDuration;
      this.driveSwingArm(progress);
    } else {
      this.driveArm(this.aim.x || this.facing, this.aim.y, dt, 0.14);
    }
    this.stand(dt, this.onGround ? 1.1 : 0.4);
    this.limitSpin();
  }

  stand(dt: number, mul: number) {
    const boot = this.protection.leg ?? 0;
    applyUpright(this.torso, 0.22 * mul, 0.14);
    applyUpright(this.pelvis, 0.2 * mul + boot * 0.05, 0.14);
    applyUpright(this.head, 0.16 * mul, 0.1);
    for (const id of ["thighL", "thighR", "shinL", "shinR", "footL", "footR"] as LimbId[]) {
      applyUpright(this.ragdoll.bodies[id], 0.18 * mul, 0.12);
    }
  }

  applyStiffBody(pose: PoseMap, stiffness: number) {
    const armIds: LimbId[] = ["upperArmL", "forearmL", "handL", "upperArmR", "forearmR", "handR"];
    for (const key of Object.keys(pose) as LimbId[]) {
      if (armIds.includes(key) && this.state === "attack") continue;
      const body = this.ragdoll.bodies[key];
      const target = pose[key];
      if (body && target !== undefined) applyJointTarget(body, target * this.facing, stiffness, 0.12);
    }
  }

  move(dir: number, _dt: number) {
    const speed = 0.0022 * this.mobility / this.massMul;
    const p = this.pelvis;
    const vx = clamp(p.velocity.x + dir * speed * 60, -4.2 * this.mobility, 4.2 * this.mobility);
    Matter.Body.setVelocity(p, { x: vx, y: p.velocity.y });
    Matter.Body.setVelocity(this.torso, { x: vx * 0.98, y: this.torso.velocity.y });
  }

  driveArm(dirX: number, dirY: number, _dt: number, stiffness: number) {
    const n = norm(dirX, dirY);
    const ang = Math.atan2(n.y, n.x);
    const arm = this.ragdoll.bodies.upperArmR;
    const fore = this.ragdoll.bodies.forearmR;
    applyJointTarget(arm, ang - Math.PI / 2, stiffness, 0.08);
    applyJointTarget(fore, ang - Math.PI / 2 + 0.15, stiffness * 0.85, 0.07);
    if (this.weapon) {
      const target = ang - Math.PI / 2;
      applyJointTarget(this.weapon.body, target, stiffness * 0.7, 0.05);
    }
  }

  driveSwingArm(progress: number) {
    const swingSign = Math.sign(this.aim.x) || this.facing;
    const { upper, fore } = swingArmAngles(progress, swingSign);
    const arm = this.ragdoll.bodies.upperArmR;
    const foreBody = this.ragdoll.bodies.forearmR;
    applyJointTarget(arm, upper, 0.45, 0.05);
    applyJointTarget(foreBody, fore, 0.4, 0.04);
    if (this.weapon) {
      applyJointTarget(this.weapon.body, fore - 0.12, 0.32, 0.04);
      if (progress > 0.22 && progress < 0.5) {
        Matter.Body.setAngularVelocity(this.weapon.body, swingSign * (0.35 + progress * 0.4));
      }
    }
  }

  doAttack(charge: number) {
    if (!this.weapon || this.attackCd > 0) return;
    const def = this.weapon.def;
    const cost = def.staminaCost * (0.65 + charge * 0.7);
    if (this.stamina < cost * 0.5) return;
    this.stamina -= cost;
    this.state = "attack";
    this.didShoot = false;
    this.didSwing = true;
    this.attackDuration = 0.32 + (1 / def.attackSpeed) * 0.38;
    this.attackCd = this.attackDuration;
    const power = (0.55 + charge * def.chargeMult) * (0.7 + def.weight * 0.2);
    const n = norm(this.aim.x, this.aim.y);
    const impulse = 0.022 * power * def.weight;
    if (def.isRanged) {
      this.lastAttackWasThrow = false;
      return;
    }
    if (this.lastInput?.block && this.shield) {
      Matter.Body.applyForce(this.shield.body, this.shield.body.position, { x: n.x * impulse * 1.4, y: n.y * impulse * 0.6 });
      Matter.Body.applyForce(this.torso, this.torso.position, { x: n.x * impulse * 0.3, y: 0 });
      return;
    }
    const hand = this.handR;
    Matter.Body.applyForce(hand, hand.position, { x: n.x * impulse, y: n.y * impulse * 0.75 });
    Matter.Body.applyForce(this.weapon.body, this.weapon.body.position, {
      x: n.x * impulse * 1.6,
      y: n.y * impulse * 1.1,
    });
    Matter.Body.setAngularVelocity(this.weapon.body, this.facing * (0.25 + power * 0.35));
    Matter.Body.applyForce(this.torso, this.torso.position, { x: -n.x * impulse * 0.25, y: -0.002 });
  }

  wantsRangedShot() {
    if (this.weapon?.def.isRanged && this.state === "attack" && !this.didShoot) {
      this.didShoot = true;
      return true;
    }
    return false;
  }

  dodge(dir: number) {
    this.state = "dodge";
    this.dodgeCd = 0.55;
    this.invuln = 0.22;
    this.stamina -= 16;
    const p = this.pelvis;
    Matter.Body.applyForce(p, p.position, { x: Math.sign(dir || this.facing) * 0.05, y: -0.012 });
  }

  tryThrow() {
    if (!this.weapon || !this.weapon.weld) return;
    this.lastAttackWasThrow = true;
  }

  regen(dt: number) {
    this.stamina = Math.min(this.maxStamina, this.stamina + dt * 22);
  }

  applyPose(pose: PoseMap, stiffness: number, damp: number) {
    for (const key of Object.keys(pose) as LimbId[]) {
      const body = this.ragdoll.bodies[key];
      const target = pose[key];
      if (body && target !== undefined) applyJointTarget(body, target * this.facing, stiffness, damp);
    }
  }

  limitSpin() {
    for (const b of this.ragdoll.list) {
      if (Math.abs(b.angularVelocity) > 0.55) Matter.Body.setAngularVelocity(b, Math.sign(b.angularVelocity) * 0.55);
      const sp = len(b.velocity.x, b.velocity.y);
      if (sp > 14) Matter.Body.setVelocity(b, { x: b.velocity.x * 14 / sp, y: b.velocity.y * 14 / sp });
    }
  }

  locationOf(part: LimbId): HitInfo["location"] {
    if (part === "head") return "head";
    if (part === "torso" || part === "pelvis") return "torso";
    if (part.startsWith("thigh") || part.startsWith("shin") || part.startsWith("foot")) return "leg";
    return "arm";
  }

  takeHit(hit: HitInfo) {
    if (!this.alive || this.invuln > 0) return { applied: 0, blocked: false };
    let dmg = hit.damage;
    const loc = hit.location;
    if (loc === "shield" || (this.state === "block" && Math.sign(hit.knockback.x) !== this.facing)) {
      const drain = 8 + hit.impact * 6;
      this.stamina -= drain;
      if (this.stamina > 0) {
        dmg *= 0.18;
        Matter.Body.applyForce(this.torso, this.torso.position, { x: hit.knockback.x * 0.25, y: hit.knockback.y * 0.2 });
        return { applied: dmg, blocked: true };
      }
    }
    const prot = this.protection[loc === "shield" ? "torso" : loc] ?? 0;
    dmg *= 1 - clamp(prot, 0, 0.7);
    if (loc === "head") dmg *= 1.45;
    if (loc === "arm") dmg *= 0.7;
    if (loc === "leg") dmg *= 0.8;
    this.health = Math.max(0, this.health - dmg);
    this.flash = 0.12;
    this.damageTakenThisMatch += dmg;
    this.lastHitAt = performance.now();
    Matter.Body.applyForce(this.torso, this.torso.position, { x: hit.knockback.x, y: hit.knockback.y });
    const part = this.ragdoll.bodies[hit.part];
    if (part) Matter.Body.applyForce(part, part.position, { x: hit.knockback.x * 0.6, y: hit.knockback.y * 0.6 });
    if (loc === "head" || hit.impact > 7) {
      this.staggerT = 0.28 + hit.impact * 0.03;
    }
    if (loc === "leg" && hit.impact > 5) {
      Matter.Body.applyForce(this.pelvis, this.pelvis.position, { x: hit.knockback.x * 0.4, y: 0.01 });
    }
    if (this.health <= 0) {
      this.alive = false;
      this.state = "dead";
    }
    return { applied: dmg, blocked: false };
  }

  dropWeapon(world: Matter.World, impulse?: { x: number; y: number }) {
    if (!this.weapon) return;
    const weld = this.weapon.detach();
    if (weld) Matter.Composite.remove(world, weld);
    if (impulse) Matter.Body.applyForce(this.weapon.body, this.weapon.body.position, impulse);
    this.weapon.thrown = true;
    this.weapon.throwTime = 1.6;
    this.weapon = null;
  }

  dropShield(world: Matter.World) {
    if (!this.shield) return;
    const weld = this.shield.detach();
    if (weld) Matter.Composite.remove(world, weld);
    this.shield = null;
  }
}
