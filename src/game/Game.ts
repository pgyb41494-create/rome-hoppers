import "../styles.css";
import "../styles-hub.css";
import { armorById } from "../armor/catalog";
import { ARENAS } from "../arenas/catalog";
import { AudioEngine } from "../audio/AudioEngine";
import { HairColors } from "../core/constants";
import { rivalAppearance } from "../core/identity";
import type { GameModeId } from "../core/types";
import { Camera } from "../engine/Camera";
import { Input } from "../engine/Input";
import { loadSettings, saveSettings } from "../engine/Settings";
import { Match, campaignOpponent, randomLoadout, type MatchConfig } from "../modes/Match";
import { ACHIEVEMENTS, CHALLENGES } from "../progression/Achievements";
import { grantXp, loadSave, persistSave } from "../progression/Save";
import { ParticleSystem } from "../render/Particles";
import { WorldRenderer } from "../render/Renderer";
import { drawMenuArt, drawPreview, screenToWorld } from "../render/DrawUtil";
import { AppUI, type PrefightInfo, type ScreenId } from "../ui/AppUI";
import { computeStats, fighterClass } from "../ui/characterStats";
import { weaponById } from "../weapons/catalog";

export class Game {
  canvas: HTMLCanvasElement;
  ui = new AppUI();
  save = loadSave();
  settings = loadSettings();
  input: Input;
  audio = new AudioEngine();
  renderer = new WorldRenderer();
  camera = new Camera();
  fx = new ParticleSystem();
  screen: ScreenId = "main";
  match: Match | null = null;
  selectedArena = "colosseum";
  flow: { mode: GameModeId; round: number; wave: number; chapter: number; wins: number } = {
    mode: "quick",
    round: 0,
    wave: 1,
    chapter: 0,
    wins: 0,
  };
  last = performance.now();
  fps = 0;
  fpsT = 0;
  frames = 0;
  pauseLatch = false;
  bindWho: "p1" | "p2" = "p1";
  resultShown = false;
  menuT = 0;
  hudBuilt = false;
  prefight: PrefightInfo | null = null;

  constructor() {
    this.canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
    this.input = new Input(this.canvas, this.settings.mobile);
    this.resize();
    window.addEventListener("resize", () => this.resize());
    window.addEventListener("pointerdown", () => this.audio.resume(), { once: true });
    this.hookUi();
    this.ui.render("main", this.save, this.settings);
    this.ui.setupMobile(this.settings, this.input);
    this.audio.setPhase("menu");
    requestAnimationFrame(this.loop);
  }

  hookUi() {
    this.ui.onNav = (id) => {
      this.audio.ui();
      if (id === "start-fight") {
        this.bootMatch();
        return;
      }
      if (id === "back") {
        this.setScreen(this.screen === "prefight" || this.screen === "main" ? "main" : "main");
        return;
      }
      this.setScreen(id as ScreenId);
    };
    this.ui.onPlay = (mode) => this.startMode(mode);
    this.ui.onEquipWeapon = (id, off) => this.equipWeapon(id, off);
    this.ui.onEquipArmor = (id) => this.equipArmor(id);
    this.ui.onAppearance = (k, v) => {
      (this.save.appearance as unknown as Record<string, unknown>)[k] = v;
      persistSave(this.save);
      this.paintPreview();
    };
    this.ui.onSetting = (k, v) => {
      if (k === "master" || k === "sfx" || k === "music") {
        (this.audio.vols as Record<string, number>)[k] = v as number;
        (this.settings as unknown as Record<string, unknown>)[k] = v;
        this.audio.apply();
      } else if (k === "shake") this.settings.shake = v as number;
      else if (k === "quality") this.settings.quality = v as "low" | "medium" | "high";
      else if (k === "showFps") this.settings.showFps = Boolean(v);
      else if (k === "sens") this.settings.mobile.sensitivity = v as number;
      saveSettings(this.settings);
    };
    this.ui.onBind = (who, action) => {
      this.bindWho = who;
      this.ui.toast("Press a key…");
      this.input.bindCapture = (code) => {
        const binds = who === "p1" ? this.settings.keybinds : this.settings.p2Keybinds;
        (binds as unknown as Record<string, string>)[action] = code;
        saveSettings(this.settings);
        this.setScreen("settings");
      };
    };
    this.ui.onResult = (a) => this.handleResult(a);
    this.ui.menus.addEventListener("click", (e) => {
      const arena = (e.target as HTMLElement).closest?.("[data-arena]") as HTMLElement | null;
      if (arena?.dataset.arena) {
        const id = arena.dataset.arena;
        const def = ARENAS.find((x) => x.id === id);
        if (!def) return;
        if (this.save.level < def.unlockLevel && !this.save.unlockedArenas.includes(id)) {
          this.ui.toast("Arena still locked.");
          return;
        }
        this.selectedArena = id;
        this.ui.toast(`${def.name} selected`);
      }
    });
  }

  setScreen(id: ScreenId) {
    this.screen = id;
    if (id !== "fight") {
      this.ui.hideHud();
      this.ui.render(id, this.save, this.settings, this.prefight ?? undefined);
      this.audio.setPhase("menu");
      this.paintPreview();
    }
  }

  paintPreview() {
    const menu = document.getElementById("menu-art") as HTMLCanvasElement | null;
    if (menu) drawMenuArt(menu, this.menuT);
    const prev = document.getElementById("preview") as HTMLCanvasElement | null;
    if (prev) {
      drawPreview(
        prev,
        this.save.appearance.skin,
        this.save.appearance.primary,
        HairColors[this.save.appearance.hairColor] ?? "#1a120e",
        this.save.appearance.height,
        this.save.appearance.width,
      );
    }
  }

  startMode(mode: GameModeId) {
    this.audio.resume();
    this.flow = { mode, round: 0, wave: 1, chapter: this.save.campaignChapter, wins: 0 };
    if (mode === "campaign") this.flow.chapter = this.save.campaignChapter;
    this.prefight = this.buildPrefight();
    this.setScreen("prefight");
  }

  buildPrefight(): PrefightInfo {
    const cfg = this.makeConfig();
    const opp = cfg.p2;
    return {
      mode: this.flow.mode,
      opponentName: opp.appearance.name,
      opponentClass: fighterClass(opp.loadout),
      opponentStats: computeStats(this.save, opp.appearance, opp.loadout),
      rewardXp: 40 + (cfg.mode === "campaign" ? 25 : 0) + this.flow.wave * 4,
      rewardCoins: 25 + this.save.level * 2,
    };
  }

  bootMatch() {
    this.match?.destroy();
    this.resultShown = false;
    const cfg = this.makeConfig();
    this.match = new Match(cfg, this.settings.quality);
    this.camera.x = this.match.arena.def.w / 2;
    this.camera.y = this.match.arena.def.ground - 80;
    this.screen = "fight";
    this.hudBuilt = false;
    this.ui.render("fight", this.save, this.settings);
    this.ui.setupMobile(this.settings, this.input);
    this.audio.setPhase("fight");
  }

  makeConfig(): MatchConfig {
    const { mode, round, wave, chapter } = this.flow;
    const p1 = { appearance: this.save.appearance, loadout: this.save.loadout };
    let arenaId = this.selectedArena;
    let ai = this.settingsAi(mode, wave, chapter, round);
    let p2Human = mode === "versus";
    let dummy = mode === "training";
    let p2 = { appearance: rivalAppearance(), loadout: randomLoadout(this.save.level) };
    let time = 99;
    if (mode === "campaign") {
      const op = campaignOpponent(chapter);
      p2 = { appearance: op.appearance, loadout: op.loadout };
      arenaId = op.arena;
      ai = op.ai;
    }
    if (mode === "tournament") {
      const names = ["Gate Warden", "Dust Twin", "Bronze Heir", "Laurel Beast"];
      p2.appearance = rivalAppearance(names[round] ?? "Rival");
      p2.loadout = randomLoadout(2 + round * 2);
      arenaId = ["colosseum", "castle", "volcano", "colosseum"][round] ?? "colosseum";
    }
    if (mode === "survival") {
      p2.appearance = rivalAppearance(`Wave ${wave}`);
      p2.loadout = randomLoadout(Math.min(8, 1 + Math.floor(wave / 2)));
      ai = wave < 3 ? "novice" : wave < 6 ? "skilled" : wave < 9 ? "veteran" : "champion";
    }
    if (mode === "training") {
      arenaId = "pit";
      time = 999;
      p2.loadout = randomLoadout(1);
    }
    if (mode === "quick") p2.appearance = rivalAppearance("Challenger");
    return { mode, arenaId, p1, p2, p2Human, ai, time, dummy };
  }

  settingsAi(mode: GameModeId, wave: number, chapter: number, round: number) {
    if (mode === "survival") return wave < 3 ? "novice" : wave < 6 ? "skilled" : "veteran";
    if (mode === "campaign") return campaignOpponent(chapter).ai;
    if (mode === "tournament") return (["skilled", "veteran", "veteran", "champion"] as const)[round] ?? "skilled";
    return "skilled";
  }

  equipWeapon(id: string, off: boolean) {
    const w = weaponById(id);
    const owned = this.save.unlockedWeapons.includes(id) || w.unlockLevel <= this.save.level;
    if (!owned) {
      if (this.save.coins >= w.cost && w.unlockLevel <= this.save.level + 2) {
        this.save.coins -= w.cost;
        this.save.unlockedWeapons.push(id);
      } else {
        this.ui.toast("Not yet unlocked.");
        return;
      }
    }
    if (w.isShield || off) this.save.loadout.offhandId = id;
    else {
      this.save.loadout.weaponId = id;
      if (w.twoHanded) this.save.loadout.offhandId = null;
    }
    persistSave(this.save);
    this.setScreen("weapons");
    this.ui.toast(`Equipped ${w.name}`);
  }

  equipArmor(id: string) {
    const a = armorById(id);
    if (!a) return;
    const owned = this.save.unlockedArmor.includes(id) || a.unlockLevel <= this.save.level;
    if (!owned) {
      if (this.save.coins >= a.cost) {
        this.save.coins -= a.cost;
        this.save.unlockedArmor.push(id);
      } else {
        this.ui.toast("Need more denarii.");
        return;
      }
    }
    this.save.loadout.armor[a.slot] = id;
    persistSave(this.save);
    this.setScreen("armor");
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  loop = () => {
    const now = performance.now();
    const dt = Math.min(0.033, (now - this.last) / 1000);
    this.last = now;
    this.frames++;
    this.fpsT += dt;
    if (this.fpsT >= 0.4) {
      this.fps = this.frames / this.fpsT;
      this.frames = 0;
      this.fpsT = 0;
    }
    this.update(dt);
    this.draw(dt);
    requestAnimationFrame(this.loop);
  };

  update(dt: number) {
    this.save.stats.playSeconds += dt;
    this.menuT += dt;
    if (this.screen !== "fight") {
      const art = document.getElementById("menu-art") as HTMLCanvasElement | null;
      if (art) drawMenuArt(art, this.menuT);
      this.drawBackdrop();
      return;
    }
    const m = this.match;
    if (!m) return;
    this.input.poll(this.settings.keybinds, this.settings.p2Keybinds, true);
    if (this.input.pausePressed && !this.pauseLatch) {
      m.paused = !m.paused;
    }
    this.pauseLatch = this.input.pausePressed;

    const p1 = this.input.p1;
    const world = screenToWorld(
      this.input.mouse.x,
      this.input.mouse.y,
      this.canvas.width,
      this.canvas.height,
      this.camera.x,
      this.camera.y,
      this.camera.zoom,
    );
    if (!this.input.usingTouch) {
      p1.aimX = world.x - m.fighters[0].torso.position.x;
      p1.aimY = world.y - m.fighters[0].torso.position.y;
    } else {
      p1.aimX = m.fighters[1].torso.position.x - m.fighters[0].torso.position.x;
      p1.aimY = m.fighters[1].torso.position.y - m.fighters[0].torso.position.y;
    }
    const p2 = this.input.p2;
    if (!p2.aimX && !p2.aimY) {
      p2.aimX = m.fighters[0].torso.position.x - m.fighters[1].torso.position.x;
      p2.aimY = m.fighters[0].torso.position.y - m.fighters[1].torso.position.y;
    }

    this.fx.cap = this.settings.quality === "low" ? 60 : this.settings.quality === "medium" ? 140 : 240;
    m.update(dt, p1, p2, this.camera, this.fx, this.audio, this.settings.shake);
    this.fx.update(dt);
    this.updateHud(m);
    if (m.phase === "done" && !this.resultShown) this.finishMatch(m);
    if (m.fighters[0].health < 30 || m.fighters[1].health < 30) this.audio.setPhase("climax");
  }

  updateHud(m: Match) {
    const a = m.fighters[0];
    const b = m.fighters[1];
    if (!this.hudBuilt) {
      this.hudBuilt = true;
      this.ui.showHud(`
        <div class="fight-hud">
          <div class="fighter-bar left">
            <div class="medallion"></div>
            <div class="bar-wrap">
              <div class="fname" id="n1"></div>
              <div class="hp-ornate"><span id="hp1"></span><div class="hp-text" id="hpt1"></div></div>
            </div>
          </div>
          <div class="fight-timer" id="timer"></div>
          <div class="fighter-bar right">
            <div class="medallion"></div>
            <div class="bar-wrap">
              <div class="fname" id="n2"></div>
              <div class="hp-ornate"><span id="hp2"></span><div class="hp-text" id="hpt2"></div></div>
            </div>
          </div>
          <div class="combo" id="combo" style="position:absolute;left:50%;top:52px;transform:translateX(-50%);font-size:20px;color:#fff;text-shadow:0 2px 8px #000"></div>
        </div>
        <div class="banner hidden" id="banner"></div>
        <div class="pause hidden" id="pause">
          <h2 style="font-family:Cinzel,serif;color:var(--gold)">Paused</h2>
          <button class="primary" id="resume">Resume</button>
          <button id="quit">Quit</button>
        </div>
        ${m.cfg.mode === "training" ? `<div class="hint" style="position:absolute;left:16px;bottom:16px;pointer-events:none;color:#f5ead0;text-shadow:0 2px 4px #000">WASD move · Mouse aim · Click swing · RMB block · Space jump · Shift dodge · E grab · Q throw</div>` : ""}
        <div class="chip hidden" id="fps" style="position:absolute;left:12px;bottom:12px"></div>
      `);
      this.ui.hud.querySelector("#resume")?.addEventListener("click", () => {
        m.paused = false;
      });
      this.ui.hud.querySelector("#quit")?.addEventListener("click", () => {
        m.destroy();
        this.match = null;
        this.setScreen("main");
      });
      (this.ui.hud.querySelector("#n1") as HTMLElement).textContent = a.appearance.name;
      (this.ui.hud.querySelector("#n2") as HTMLElement).textContent = b.appearance.name;
    }
    const setW = (id: string, pct: number) => {
      const el = this.ui.hud.querySelector(id) as HTMLElement | null;
      if (el) el.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    };
    setW("#hp1", (a.health / a.maxHealth) * 100);
    setW("#hp2", (b.health / b.maxHealth) * 100);
    const hpt1 = this.ui.hud.querySelector("#hpt1");
    const hpt2 = this.ui.hud.querySelector("#hpt2");
    if (hpt1) hpt1.textContent = `${Math.max(0, a.health | 0)} / ${a.maxHealth | 0}`;
    if (hpt2) hpt2.textContent = `${Math.max(0, b.health | 0)} / ${b.maxHealth | 0}`;
    const timer = this.ui.hud.querySelector("#timer");
    if (timer) timer.textContent = String(Math.max(0, Math.ceil(m.timeLeft))).padStart(2, "0");
    const combo = this.ui.hud.querySelector("#combo");
    if (combo) combo.textContent = a.combo >= 2 ? `COMBO ${a.combo}` : "";
    const banner = this.ui.hud.querySelector("#banner") as HTMLElement | null;
    if (banner) {
      const show = m.phase === "countdown";
      banner.classList.toggle("hidden", !show);
      if (show) banner.textContent = m.countdown > 0.3 ? String(Math.ceil(m.countdown)) : "FIGHT";
    }
    const pause = this.ui.hud.querySelector("#pause") as HTMLElement | null;
    pause?.classList.toggle("hidden", !m.paused);
    this.ui.hud.style.pointerEvents = m.paused ? "auto" : "none";
    const fps = this.ui.hud.querySelector("#fps") as HTMLElement | null;
    if (fps) {
      fps.classList.toggle("hidden", !this.settings.showFps);
      fps.textContent = `${this.fps | 0} fps`;
    }
  }

  finishMatch(m: Match) {
    this.resultShown = true;
    const win = m.winner === 1;
    const perfect = m.fighters[0].damageTakenThisMatch < 1 && win;
    this.save.stats.damageDealt += 100 - m.fighters[1].health;
    this.save.stats.damageTaken += m.fighters[0].damageTakenThisMatch;
    this.save.stats.maxCombo = Math.max(this.save.stats.maxCombo, m.fighters[0].combo);
    if (win) {
      this.save.stats.wins += 1;
      this.save.stats.kos += 1;
      this.flow.wins += 1;
      grantXp(this.save, 40 + (m.cfg.mode === "campaign" ? 25 : 0) + this.flow.wave * 4);
      this.save.coins += 25 + this.save.level * 2;
      this.unlockAchievement("first-blood");
      if (m.fighters[0].combo >= 5) this.unlockAchievement("combo-5");
      if (m.lastThrowWin) this.unlockAchievement("thrower");
      if (perfect) this.unlockAchievement("perfect");
      this.bumpChallenge("wins-10", 1);
      this.bumpChallenge("kos-25", 1);
    } else {
      this.save.stats.losses += 1;
      grantXp(this.save, 12);
    }
    this.progressModes(win);
    persistSave(this.save);
    this.audio.setPhase("end");
    const title = m.winner === 0 ? "DRAW" : win ? "VICTORY" : "DEFEAT";
    this.ui.hud.style.pointerEvents = "auto";
    this.ui.hud.insertAdjacentHTML(
      "beforeend",
      `<div class="result">
        <h2>${title}</h2>
        <p class="hint">${win ? "The crowd stamps the sand for you." : "The dust takes another name."}</p>
        <p class="hint">+${win ? 40 : 12} XP · ${this.save.coins} denarii · Level ${this.save.level}</p>
        <div class="row">
          <button class="primary" id="r-retry">Fight again</button>
          <button id="r-next">${this.nextLabel()}</button>
          <button id="r-menu">Menu</button>
        </div>
      </div>`,
    );
    this.ui.hud.querySelector("#r-retry")?.addEventListener("click", () => this.handleResult("retry"));
    this.ui.hud.querySelector("#r-next")?.addEventListener("click", () => this.handleResult("next"));
    this.ui.hud.querySelector("#r-menu")?.addEventListener("click", () => this.handleResult("menu"));
  }

  nextLabel() {
    if (this.flow.mode === "campaign") return "Next bout";
    if (this.flow.mode === "tournament") return "Next gate";
    if (this.flow.mode === "survival") return "Next wave";
    return "Rematch";
  }

  progressModes(win: boolean) {
    if (this.flow.mode === "campaign" && win) {
      this.flow.chapter += 1;
      this.save.campaignChapter = Math.max(this.save.campaignChapter, this.flow.chapter);
      if (this.flow.chapter >= 8) this.unlockAchievement("campaign");
    }
    if (this.flow.mode === "tournament" && win) {
      this.flow.round += 1;
      if (this.flow.round >= 4) this.unlockAchievement("champion");
    }
    if (this.flow.mode === "survival" && win) {
      this.flow.wave += 1;
      if (this.flow.wave >= 8) this.unlockAchievement("survivor");
    }
    for (const a of ARENAS) {
      if (this.save.level >= a.unlockLevel && !this.save.unlockedArenas.includes(a.id)) this.save.unlockedArenas.push(a.id);
    }
  }

  handleResult(action: "menu" | "retry" | "next") {
    if (action === "menu") {
      this.match?.destroy();
      this.match = null;
      this.setScreen("main");
      return;
    }
    if (action === "retry") {
      this.bootMatch();
      return;
    }
    if (this.flow.mode === "tournament" && this.flow.round >= 4) {
      this.ui.toast("You wear the laurel.");
      this.setScreen("main");
      this.match?.destroy();
      this.match = null;
      return;
    }
    if (this.flow.mode === "campaign" && this.flow.chapter >= 8) {
      this.ui.toast("Champion of the circlet.");
      this.setScreen("main");
      this.match?.destroy();
      this.match = null;
      return;
    }
    this.bootMatch();
  }

  unlockAchievement(id: string) {
    if (this.save.achievements[id]) return;
    this.save.achievements[id] = true;
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (a) this.ui.toast(`Laurel: ${a.name}`);
  }

  bumpChallenge(id: string, n: number) {
    const c = CHALLENGES.find((x) => x.id === id);
    if (!c) return;
    const cur = this.save.challenges[id] ?? 0;
    this.save.challenges[id] = cur + n;
    if (cur < c.target && this.save.challenges[id] >= c.target) {
      this.save.coins += c.reward;
      this.ui.toast(`Challenge complete: ${c.name}`);
    }
  }

  drawBackdrop() {
    const ctx = this.canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  draw(dt: number) {
    if (this.screen !== "fight" || !this.match) {
      this.drawBackdrop();
      return;
    }
    const m = this.match;
    this.renderer.draw(m.arena, m.fighters, m.loose, m.arrows, this.fx, this.camera, dt);
    this.renderer.blit(this.canvas);
  }
}
