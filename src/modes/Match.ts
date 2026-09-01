import Matter from "matter-js";
import type { AiDifficulty, Appearance, GameModeId, Loadout } from "../core/types";
import { rivalAppearance } from "../core/identity";
import { Fighter } from "../character/Fighter";
import { FighterAI } from "../ai/FighterAI";
import { CombatSystem, spawnArrow } from "../combat/Combat";
import { ArenaInstance, arenaById, type ArenaDef } from "../arenas/catalog";
import { PhysicsWorld } from "../physics/PhysicsWorld";
import { WeaponEntity } from "../weapons/Weapon";
import { weaponById } from "../weapons/catalog";
import type { Camera } from "../engine/Camera";
import type { ParticleSystem } from "../render/Particles";
import type { AudioEngine } from "../audio/AudioEngine";
import type { FighterInput } from "../core/types";
import { blankInput } from "../engine/Input";
import { len } from "../core/math";

export type MatchPhase = "countdown" | "fight" | "ko" | "done";

export interface MatchConfig {
  mode: GameModeId;
  arenaId: string;
  p1: { appearance: Appearance; loadout: Loadout };
  p2: { appearance: Appearance; loadout: Loadout };
  p2Human: boolean;
  ai: AiDifficulty;
  time: number;
  dummy?: boolean;
  bestOf?: number;
}

export class Match {
  world: PhysicsWorld;
  arena: ArenaInstance;
  fighters: Fighter[] = [];
  ai: FighterAI | null = null;
  combat = new CombatSystem();
  loose: WeaponEntity[] = [];
  arrows: Matter.Body[] = [];
  phase: MatchPhase = "countdown";
  countdown = 3;
  timeLeft: number;
  cfg: MatchConfig;
  winner: 0 | 1 | 2 = 0;
  comboFlash = 0;
  lastThrowWin = false;
  shots: Matter.Body[] = [];
  paused = false;
  hitstop = 0;
  trainingHints = true;

  constructor(cfg: MatchConfig, quality: "low" | "medium" | "high") {
    this.cfg = cfg;
    this.world = new PhysicsWorld(quality);
    const def = arenaById(cfg.arenaId);
    this.arena = new ArenaInstance(def, this.world.world);
    this.timeLeft = cfg.time;
    const a = def.spawn[0];
    const b = def.spawn[1];
    const p1 = new Fighter(a.x, a.y, cfg.p1.appearance, cfg.p1.loadout, 1, true);
    const p2App = cfg.dummy ? { ...rivalAppearance("Dummy"), name: "Dummy" } : cfg.p2.appearance;
    const p2 = new Fighter(b.x, b.y, p2App, cfg.p2.loadout, 2, cfg.p2Human);
    p2.isDummy = !!cfg.dummy;
    p1.addToWorld(this.world.world);
    p2.addToWorld(this.world.world);
    this.fighters = [p1, p2];
    if (!cfg.p2Human && !cfg.dummy) this.ai = new FighterAI(cfg.ai);
    Matter.Events.on(this.world.engine, "collisionStart", (ev) => {
      if (this.phase === "countdown") return;
      this.combat.process(ev.pairs, this.fighters);
      for (const pair of ev.pairs) this.env(pair.bodyA, pair.bodyB);
    });
    Matter.Events.on(this.world.engine, "collisionActive", (ev) => {
      if (this.phase !== "fight") return;
      this.combat.process(ev.pairs, this.fighters);
    });
  }

  env(a: Matter.Body, b: Matter.Body) {
    const labels = [a.label, b.label];
    if (labels.some((l) => l.startsWith("sensor:pit"))) {
      const limb = labels.find((l) => l.startsWith("limb:"));
      if (limb) {
        const g = Number(limb.split(":")[1]);
        const f = this.fighters.find((x) => x.group === g);
        if (f && f.alive) {
          f.health = 0;
          f.alive = false;
          f.state = "dead";
        }
      }
    }
    if (labels.some((l) => l.startsWith("sensor:trap"))) {
      const f = this.fighters.find((x) => x.ragdoll.list.some((bd) => bd === a || bd === b));
      if (f && f.alive) f.health = Math.max(0, f.health - 0.25);
    }
    const crate = this.arena.props.find((p) => p.body === a || p.body === b);
    const strike = [a, b].find((x) => x.label.startsWith("weapon") || x.label.startsWith("arrow"));
    if (crate && strike) {
      crate.hp -= 8;
      if (crate.hp <= 0) {
        Matter.Composite.remove(this.world.world, crate.body);
        this.arena.props = this.arena.props.filter((p) => p !== crate);
      }
    }
  }

  update(
    dt: number,
    p1: FighterInput,
    p2: FighterInput,
    cam: Camera,
    fx: ParticleSystem,
    audio: AudioEngine,
    shakeMul: number,
  ) {
    if (this.paused) return;
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      dt *= 0.12;
    }
    if (this.phase === "countdown") {
      this.countdown -= dt;
      this.world.step(dt);
      this.fighters[0].update(dt, blankInput(), this.arena.def.ground);
      this.fighters[1].update(dt, blankInput(), this.arena.def.ground);
      if (this.countdown <= 0) this.phase = "fight";
      this.trackCam(cam, dt);
      return;
    }

    if (this.phase === "fight") {
      this.timeLeft -= dt;
      const a = this.fighters[0];
      const b = this.fighters[1];
      let i2 = p2;
      if (this.ai) i2 = this.ai.update(dt, b, a, this.loose);
      if (!p1.aimX && !p1.aimY) {
        p1.aimX = b.torso.position.x - a.torso.position.x;
        p1.aimY = b.torso.position.y - a.torso.position.y;
      }
      a.update(dt, p1, this.arena.def.ground);
      b.update(dt, i2, this.arena.def.ground);
      this.handleActions(a, p1, audio);
      this.handleActions(b, i2, audio);
      this.combat.tick(dt);
      this.world.step(dt);
      this.consumeEvents(cam, fx, audio, shakeMul);
      this.cleanupArrows();
      if (a.onGround && a.state === "run" && a.footstepT <= 0) {
        a.footstepT = 0.28;
        audio.foot();
        fx.dust(a.ragdoll.bodies.footL.position.x, a.ragdoll.bodies.footL.position.y);
      }
      if (!a.alive || !b.alive || this.timeLeft <= 0) {
        this.phase = "ko";
        this.countdown = 1.6;
        if (!a.alive && b.alive) this.winner = 2;
        else if (!b.alive && a.alive) this.winner = 1;
        else {
          this.winner = a.health >= b.health ? 1 : 2;
          if (Math.abs(a.health - b.health) < 0.5) this.winner = 0;
        }
        if (this.winner === 1 && a.lastAttackWasThrow) this.lastThrowWin = true;
        audio.crowd(true);
        if (this.winner === 1) audio.win();
        else audio.lose();
      }
    } else if (this.phase === "ko") {
      this.world.step(dt);
      this.fighters[0].update(dt, blankInput(), this.arena.def.ground);
      this.fighters[1].update(dt, blankInput(), this.arena.def.ground);
      this.countdown -= dt;
      if (this.countdown <= 0) this.phase = "done";
    }
    this.trackCam(cam, dt);
  }

  private handleActions(f: Fighter, input: FighterInput, audio: AudioEngine) {
    if (f.wantsRangedShot()) {
      const ar = spawnArrow(f, this.world.world);
      if (ar) {
        this.arrows.push(ar);
        audio.swing();
      }
    }
    if (f.lastAttackWasThrow && f.weapon && input.throw) {
      const n = { x: f.aim.x, y: f.aim.y };
      const w = f.weapon;
      f.dropWeapon(this.world.world, { x: n.x * 0.04, y: n.y * 0.03 - 0.01 });
      if (w) {
        this.loose.push(w);
        audio.throw();
      }
      f.lastAttackWasThrow = false;
    } else f.lastAttackWasThrow = false;

    if (f.pendingPickup) {
      f.pendingPickup = false;
      this.tryPickup(f);
    }
    if (f.didSwing) {
      audio.swing();
      f.didSwing = false;
    }
  }

  tryPickup(f: Fighter) {
    if (f.weapon) return;
    let best: WeaponEntity | null = null;
    let d = 42;
    for (const w of this.loose) {
      const dd = len(w.body.position.x - f.handR.position.x, w.body.position.y - f.handR.position.y);
      if (dd < d) {
        d = dd;
        best = w;
      }
    }
    if (!best) return;
    const weld = best.attach(f.handR, f.group);
    Matter.Composite.add(this.world.world, weld!);
    f.weapon = best;
    f.loadout.weaponId = best.def.id;
    this.loose = this.loose.filter((x) => x !== best);
  }

  consumeEvents(cam: Camera, fx: ParticleSystem, audio: AudioEngine, shakeMul: number) {
    for (const ev of this.combat.events) {
      if (ev.type === "hit" && ev.hit) {
        const h = ev.hit;
        const body = ev.fighter?.ragdoll.bodies[h.part];
        const x = body?.position.x ?? 0;
        const y = body?.position.y ?? 0;
        fx.spark(x, y, h.impact > 7);
        audio.hit(h.impact, true);
        cam.impact(h.impact, h.knockback.x, h.knockback.y, shakeMul);
        if (h.impact > 6) this.hitstop = 0.05;
        this.comboFlash = 0.4;
        if (h.location === "head") audio.crowd(false);
      }
      if (ev.type === "block" && ev.hit && ev.fighter) {
        const p = ev.fighter.shield?.body.position ?? ev.fighter.handL.position;
        fx.block(p.x, p.y);
        audio.block();
      }
      if (ev.type === "disarm" && ev.fighter?.weapon) {
        const w = ev.fighter.weapon;
        ev.fighter.dropWeapon(this.world.world, { x: (Math.random() - 0.5) * 0.02, y: -0.02 });
        this.loose.push(w);
        audio.armor();
      }
    }
    this.combat.events = [];
  }

  cleanupArrows() {
    this.arrows = this.arrows.filter((a) => {
      if (a.position.y > this.arena.def.h + 80) {
        Matter.Composite.remove(this.world.world, a);
        return false;
      }
      return true;
    });
  }

  trackCam(cam: Camera, dt: number) {
    const a = this.fighters[0].torso.position;
    const b = this.fighters[1].torso.position;
    cam.setBounds(0, 0, this.arena.def.w, this.arena.def.h);
    cam.follow(a.x, a.y, b.x, b.y, dt);
  }

  destroy() {
    Matter.Events.off(this.world.engine, "collisionStart");
    Matter.Events.off(this.world.engine, "collisionActive");
    this.world.clear();
  }
}

export function randomLoadout(level: number): Loadout {
  const pool = ["gladius", "pugio", "hasta", "spatha", "labrys", "star-mace", "forge-hammer", "poleaxe", "recurve"].filter((_, i) => i < 2 + Math.min(6, Math.floor(level / 2)));
  const id = pool[Math.floor(Math.random() * pool.length)] ?? "gladius";
  const two = weaponById(id).twoHanded;
  return {
    weaponId: id,
    offhandId: two ? null : Math.random() > 0.4 ? (level >= 4 && Math.random() > 0.5 ? "scutum" : "buckler") : null,
    armor: {
      helmet: level >= 3 ? "ridge-helm" : "cloth-wrap",
      chest: level >= 4 ? "scale-mail" : "leather-harness",
      shoulder: level >= 2 ? "leather-pads" : null,
      gloves: level >= 6 ? "plated-gauntlets" : "wrap-gloves",
      legs: level >= 5 ? "bronze-greaves" : "wrap-legs",
      boots: level >= 6 ? "iron-boots" : "sandals",
    },
  };
}

export function campaignOpponent(chapter: number): { appearance: Appearance; loadout: Loadout; ai: AiDifficulty; arena: string } {
  const ais: AiDifficulty[] = ["novice", "novice", "skilled", "skilled", "veteran", "veteran", "champion", "champion"];
  const arenas = ["colosseum", "desert", "frozen", "jungle", "volcano", "castle", "pit", "colosseum"];
  const names = ["Dust Pupil", "Sand Warden", "Hoar Guard", "Vine Twin", "Cinder Brute", "Banner Duelist", "Pit Shade", "Laurel King"];
  const app = rivalAppearance(names[chapter] ?? "Rival");
  app.skin = chapter % 6;
  app.hair = chapter % 6;
  app.primary = ["#1a4a4f", "#6b1d2a", "#3a5560", "#3d5a3a", "#a34a32", "#3a3348", "#4a5560", "#c4843a"][chapter] ?? "#1a4a4f";
  return {
    appearance: app,
    loadout: randomLoadout(chapter + 1),
    ai: ais[chapter] ?? "skilled",
    arena: arenas[chapter] ?? "colosseum",
  };
}
