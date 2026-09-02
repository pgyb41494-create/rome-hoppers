import { ARMOR, armorForSlot } from "../armor/catalog";
import { ARENAS } from "../arenas/catalog";
import { Accessories, FaceStyles, HairStyles } from "../core/identity";
import type { Appearance, ArmorSlot, GameModeId, Loadout, SaveData, SettingsData } from "../core/types";
import { ACHIEVEMENTS, CHALLENGES } from "../progression/Achievements";
import { xpForLevel } from "../progression/Save";
import { WEAPONS, weaponById } from "../weapons/catalog";
import { CHAR_SLOTS, TUTORIAL_LINES } from "./charSlots";
import { computeStats, fighterClass, rankTitle, type FighterStats } from "./characterStats";
import { paintModeTiles } from "./modeArt";

export type ScreenId =
  | "tutorial"
  | "main"
  | "character"
  | "weapons"
  | "armor"
  | "settings"
  | "stats"
  | "prefight"
  | "fight";

export interface PrefightInfo {
  mode: GameModeId;
  opponentName: string;
  opponentClass: string;
  opponentStats: FighterStats;
  rewardXp: number;
  rewardCoins: number;
}

export interface VictoryInfo {
  win: boolean;
  title: string;
  xpGain: number;
  coinGain: number;
  perfect: boolean;
}

export class AppUI {
  menus: HTMLElement;
  hud: HTMLElement;
  mobile: HTMLElement;
  toasts: HTMLElement;
  drawerOpen = false;
  tutorialStep = 0;
  onNav: (id: ScreenId | "back" | "start-fight" | "tutorial-next" | "drawer-toggle") => void = () => undefined;
  onPlay: (mode: GameModeId) => void = () => undefined;
  onEquipWeapon: (id: string, off: boolean) => void = () => undefined;
  onEquipArmor: (id: string) => void = () => undefined;
  onAppearance: (key: string, value: number | string) => void = () => undefined;
  onSetting: (key: string, value: unknown) => void = () => undefined;
  onBind: (who: "p1" | "p2", action: string) => void = () => undefined;
  onResult: (action: "menu" | "retry" | "next") => void = () => undefined;
  onCharPage: (delta: number) => void = () => undefined;
  onSelectChar: (id: string) => void = () => undefined;
  onBuyChar: (id: string) => void = () => undefined;
  onPrefightHeal: () => void = () => undefined;

  constructor() {
    this.menus = document.getElementById("menus")!;
    this.hud = document.getElementById("hud")!;
    this.mobile = document.getElementById("mobile-controls")!;
    this.toasts = document.getElementById("toasts")!;
  }

  render(screen: ScreenId, save: SaveData, settings: SettingsData, prefight?: PrefightInfo, tutorialStep = 0) {
    this.tutorialStep = tutorialStep;
    if (screen === "fight") {
      this.menus.innerHTML = "";
      return;
    }

    const coins = coinRow(save.coins);
    const xpNeed = xpForLevel(save.level);

    if (screen === "tutorial") {
      const line = TUTORIAL_LINES[tutorialStep] ?? TUTORIAL_LINES[TUTORIAL_LINES.length - 1];
      this.menus.innerHTML = `<section class="arena-screen tutorial-screen">
        <canvas id="menu-art" class="tutorial-bg"></canvas>
        <div class="tutorial-dim"></div>
        <div class="dialogue-box">
          <div class="dialogue-portrait"></div>
          <div class="dialogue-name">Trainer</div>
          <p class="dialogue-text">${escapeHtml(line)}</p>
          <span class="dialogue-next">››</span>
        </div>
        <div class="round-nav">
          <button class="round-btn go" data-nav="tutorial-next" aria-label="Continue">✓</button>
        </div>
      </section>`;
    }

    if (screen === "main") {
      this.menus.innerHTML = `<section class="arena-screen hub">
        <canvas id="menu-art" class="menu-bg"></canvas>
        <div class="hub-overlay">
          <header class="logo-banner">
            <span class="logo-sub">ROME</span>
            <div class="logo-main">
              <span class="logo-word">HOP</span>
              <span class="logo-medallion" aria-hidden="true"></span>
              <span class="logo-word">PERS</span>
            </div>
          </header>
          ${coins}
          <div class="mode-grid">
            ${modeTile("campaign", "Career", "area-career")}
            ${modeTile("tournament", "Rebel War", "area-war")}
            ${modeTile("survival", "Arcade", "area-arcade")}
            ${modeTile("versus", "Multiplayer", "area-multi")}
            ${modeTile("quick", "Quick Fight", "area-quick")}
            ${modeTile("training", "Practice", "area-practice")}
          </div>
          <button class="burger-btn" data-nav="drawer-toggle" aria-label="Menu"><span></span></button>
          ${this.drawerOpen ? hubDrawer() : ""}
        </div>
      </section>`;
    }

    if (screen === "prefight" && prefight) {
      const you = computeStats(save);
      this.menus.innerHTML = `<section class="arena-screen sheet">
        ${screenHeader("Next Fight", coins)}
        <div class="prefight-row">
          ${charCard(save.appearance, save.loadout, you, true)}
          <div class="parchment rewards-panel">
            <h3>Base reward</h3>
            <div class="reward-line"><span class="ico-star"></span> ${prefight.rewardXp} fame</div>
            <div class="reward-line"><span class="ico-coin"></span> ${prefight.rewardCoins} denarii</div>
            <hr class="parch-rule" />
            <div class="prefight-action">
              <div class="action-icon wine"></div>
              <div>
                <div class="action-cost"><span class="ico-coin"></span> 25</div>
                <button class="btn" data-heal style="margin-top:4px;width:100%">Healing wine</button>
              </div>
            </div>
            <div class="prefight-action">
              <div class="action-icon"></div>
              <div class="spy-row" style="flex:1">
                <span>Damage health</span>
                <div class="spy-arrows"><button disabled>‹</button><button disabled>›</button></div>
              </div>
            </div>
            <div class="prefight-action locked">
              <div class="action-icon"></div>
              <div>
                <div class="action-cost"><span class="ico-coin"></span> 20</div>
                <small>Unlocks at lvl ${Math.max(2, save.level + 1)}</small>
              </div>
            </div>
          </div>
        </div>
        <div class="round-nav">
          <button class="round-btn back" data-nav="back" aria-label="Back">‹</button>
          <button class="round-btn help" disabled aria-label="Help">?</button>
          <button class="round-btn go" data-nav="start-fight" aria-label="Fight">✓</button>
        </div>
      </section>`;
    }

    if (screen === "character") {
      const ap = save.appearance;
      const stats = computeStats(save);
      const title = rankTitle(save.level, save.stats.wins);
      const page = save.charPage;

      if (page === 0) {
        const activeId = CHAR_SLOTS.find((s) => s.name === save.appearance.name)?.id ?? "swordsman";
        this.menus.innerHTML = `<section class="arena-screen sheet">
          ${screenHeader("Character", coins)}
          <div class="char-pick-row">
            ${CHAR_SLOTS.map((slot) => charSlotCard(slot, save, slot.id === activeId)).join("")}
          </div>
          <p class="char-blurb">${CHAR_SLOTS.find((s) => s.id === activeId)?.blurb ?? classBlurb(stats.className)}</p>
          <div class="round-nav">
            <button class="round-btn back" data-nav="back">‹</button>
            <button class="round-btn help" disabled>?</button>
            <button class="round-btn go" data-nav="main">✓</button>
          </div>
        </section>`;
      } else if (page === 1) {
        this.menus.innerHTML = `<section class="arena-screen sheet">
          ${screenHeader("Character", coins)}
          <div class="char-layout">
            <div class="parchment info-panel">
              <div class="level-ring">Lv ${save.level}</div>
              <h3 class="rank">${title}</h3>
              <div class="fame-bar">
                <label>Fame / next level</label>
                <div class="bar parchment-bar"><span style="width:${(save.xp / xpNeed) * 100}%"></span></div>
                <small>${save.xp} / ${xpNeed}</small>
              </div>
              <ul class="overview">
                <li>Next arena at level ${Math.min(8, save.level + 1)}</li>
                <li>${save.stats.wins} victories · ${save.stats.losses} defeats</li>
                <li>Age: ${16 + save.level}</li>
              </ul>
              <p class="page-dots">PROGRESS 2 / 3</p>
            </div>
            ${charCard(ap, save.loadout, stats, true)}
            <div class="parchment form-panel">
              <p class="class-blurb">${classBlurb(stats.className)}</p>
            </div>
          </div>
          <div class="round-nav">
            <button class="round-btn back" data-char-page="-1">‹</button>
            <button class="round-btn help" disabled>?</button>
            <button class="round-btn go" data-char-page="1">›</button>
          </div>
        </section>`;
      } else {
        this.menus.innerHTML = `<section class="arena-screen sheet">
          ${screenHeader("Character", coins)}
          <div class="char-layout">
            <div class="parchment info-panel">
              <p class="overview">Customize your gladiator's look.</p>
              <p class="page-dots">PROGRESS 3 / 3</p>
            </div>
            ${charCard(ap, save.loadout, stats, true)}
            <div class="parchment form-panel">
              <label class="field">Name <input id="nm" type="text" maxlength="16" value="${escapeHtml(ap.name)}" /></label>
              <label class="field">Skin <input id="skin" type="range" min="0" max="5" value="${ap.skin}" /></label>
              <label class="field">Hair (${HairStyles[ap.hair]}) <input id="hair" type="range" min="0" max="5" value="${ap.hair}" /></label>
              <label class="field">Hair color <input id="hairColor" type="range" min="0" max="7" value="${ap.hairColor}" /></label>
              <label class="field">Face (${FaceStyles[ap.face]}) <input id="face" type="range" min="0" max="4" value="${ap.face}" /></label>
              <label class="field">Height <input id="height" type="range" min="0.86" max="1.16" step="0.01" value="${ap.height}" /></label>
              <label class="field">Build <input id="muscle" type="range" min="0" max="1" step="0.01" value="${ap.muscle}" /></label>
              <label class="field">Colors <input id="primary" type="text" value="${ap.primary}" /> <input id="secondary" type="text" value="${ap.secondary}" /></label>
              <label class="field">Accessory (${Accessories[ap.accessory]}) <input id="accessory" type="range" min="0" max="5" value="${ap.accessory}" /></label>
            </div>
          </div>
          <div class="round-nav">
            <button class="round-btn back" data-char-page="-1">‹</button>
            <button class="round-btn go" data-nav="main">✓</button>
          </div>
        </section>`;
      }
    }

    if (screen === "weapons") {
      this.menus.innerHTML = `<section class="arena-screen sheet scroll">
        ${screenHeader("Armory", coins)}
        <p class="hint" style="text-align:center;margin-bottom:12px">Tap to equip. Shift+tap for offhand.</p>
        <div class="item-grid">${WEAPONS.map((w) => weaponCard(w, save)).join("")}</div>
        <div class="round-nav"><button class="round-btn back" data-nav="back">‹</button></div>
      </section>`;
    }

    if (screen === "armor") {
      const slots: ArmorSlot[] = ["helmet", "chest", "shoulder", "gloves", "legs", "boots"];
      this.menus.innerHTML = `<section class="arena-screen sheet scroll">
        ${screenHeader("Armor", coins)}
        ${slots.map((s) => `<h3 class="slot-title">${s}</h3><div class="item-grid">${armorForSlot(s).map((a) => armorCard(a, save, s)).join("")}</div>`).join("")}
        <div class="round-nav"><button class="round-btn back" data-nav="back">‹</button></div>
      </section>`;
    }

    if (screen === "stats") {
      const s = save.stats;
      this.menus.innerHTML = `<section class="arena-screen sheet scroll">
        ${screenHeader("Records", coins)}
        <div class="stats-grid">
          ${stat("Wins", s.wins)}${stat("Losses", s.losses)}${stat("KOs", s.kos)}
          ${stat("Damage", s.damageDealt | 0)}${stat("Max combo", s.maxCombo)}${stat("Parries", s.parries)}
        </div>
        <h3 class="slot-title">Achievements</h3>
        <div class="item-grid">${ACHIEVEMENTS.map((a) => `<div class="item-card ${save.achievements[a.id] ? "owned" : ""}"><h4>${a.name}</h4><p>${a.desc}</p></div>`).join("")}</div>
        <div class="round-nav"><button class="round-btn back" data-nav="back">‹</button></div>
      </section>`;
    }

    if (screen === "settings") {
      const k = settings.keybinds;
      this.menus.innerHTML = `<section class="arena-screen sheet scroll">
        ${screenHeader("Settings", coins)}
        <div class="parchment form-panel wide" style="max-width:640px;margin:0 auto">
          <label class="field">Master <input id="master" type="range" min="0" max="1" step="0.01" value="${settings.master}" /></label>
          <label class="field">Effects <input id="sfx" type="range" min="0" max="1" step="0.01" value="${settings.sfx}" /></label>
          <label class="field">Music <input id="music" type="range" min="0" max="1" step="0.01" value="${settings.music}" /></label>
          <label class="field">Screen shake <input id="shake" type="range" min="0" max="1.5" step="0.05" value="${settings.shake}" /></label>
          <label class="field">Quality <select id="quality"><option ${settings.quality === "low" ? "selected" : ""}>low</option><option ${settings.quality === "medium" ? "selected" : ""}>medium</option><option ${settings.quality === "high" ? "selected" : ""}>high</option></select></label>
          <div class="bind-grid" style="margin-top:12px">${Object.entries(k).map(([a, v]) => `<div class="bind"><span>${a}</span><button data-bind="${a}">${v}</button></div>`).join("")}</div>
        </div>
        <div class="round-nav"><button class="round-btn back" data-nav="back">‹</button></div>
      </section>`;
    }

    this.bindNav(settings);
    paintModeTiles(this.menus);
  }

  showVictory(save: SaveData, info: VictoryInfo) {
    const stats = computeStats(save);
    const xpNeed = xpForLevel(save.level);
    const cls = info.win ? "victory-overlay" : "victory-overlay defeat-overlay";
  this.hud.insertAdjacentHTML(
      "beforeend",
      `<div class="${cls}" id="victory">
        <h2 class="victory-title">${escapeHtml(info.title)}</h2>
        <div class="victory-row">
          ${charCard(save.appearance, save.loadout, stats, false)}
          <div class="parchment rewards-panel">
            <h3>Fame / next level</h3>
            <div class="bar parchment-bar"><span style="width:${(save.xp / xpNeed) * 100}%"></span></div>
            <small>${save.xp} / ${xpNeed}</small>
            <hr class="parch-rule" />
            <div class="bonus-line"><span class="ico-star"></span> +${info.xpGain} fame</div>
            <div class="bonus-line"><span class="ico-coin"></span> +${info.coinGain} denarii</div>
            ${info.perfect ? `<div class="bonus-line">Perfect fight bonus!</div>` : ""}
            <div class="bonus-line">Total: ${save.coins} denarii</div>
          </div>
        </div>
        <div class="round-nav" style="position:relative;bottom:auto;margin-top:16px">
          <button class="round-btn go" id="victory-ok">✓</button>
        </div>
      </div>`,
    );
  }

  private bindNav(settings: SettingsData) {
    this.menus.querySelectorAll("[data-nav]").forEach((el) => {
      el.addEventListener("click", () => {
        const id = (el as HTMLElement).dataset.nav!;
        if (id === "start-fight") this.onNav("start-fight");
        else if (id === "tutorial-next") this.onNav("tutorial-next");
        else if (id === "drawer-toggle") this.onNav("drawer-toggle");
        else this.onNav(id as ScreenId | "back");
      });
    });
    this.menus.querySelectorAll("[data-mode]").forEach((el) => {
      el.addEventListener("click", () => this.onPlay((el as HTMLElement).dataset.mode as GameModeId));
    });
    this.menus.querySelectorAll("[data-char-page]").forEach((el) => {
      el.addEventListener("click", () => this.onCharPage(Number((el as HTMLElement).dataset.charPage)));
    });
    this.menus.querySelectorAll("[data-char]").forEach((el) => {
      el.addEventListener("click", () => {
        const id = (el as HTMLElement).dataset.char!;
        if ((el as HTMLElement).dataset.locked === "1") this.onBuyChar(id);
        else this.onSelectChar(id);
      });
    });
    this.menus.querySelector("[data-heal]")?.addEventListener("click", () => this.onPrefightHeal());
    this.menus.querySelectorAll(".hub-drawer").forEach((el) => {
      el.addEventListener("click", (e) => {
        if ((e.target as HTMLElement).classList.contains("hub-drawer")) this.onNav("drawer-toggle");
      });
    });
    this.menus.querySelectorAll("[data-weapon]").forEach((el) => {
      el.addEventListener("click", (ev) => this.onEquipWeapon((el as HTMLElement).dataset.weapon!, (ev as MouseEvent).shiftKey));
    });
    this.menus.querySelectorAll("[data-armor]").forEach((el) => {
      el.addEventListener("click", () => this.onEquipArmor((el as HTMLElement).dataset.armor!));
    });
    this.bindForms(settings);
  }

  private bindForms(settings: SettingsData) {
    const map: Record<string, string> = {
      nm: "name",
      skin: "skin",
      hair: "hair",
      hairColor: "hairColor",
      face: "face",
      height: "height",
      width: "width",
      muscle: "muscle",
      primary: "primary",
      secondary: "secondary",
      accessory: "accessory",
    };
    for (const [id, key] of Object.entries(map)) {
      const el = this.menus.querySelector("#" + id) as HTMLInputElement | null;
      el?.addEventListener("input", () => {
        const v = el.type === "text" ? el.value : Number(el.value);
        this.onAppearance(key, v);
      });
    }
    for (const id of ["master", "sfx", "music", "shake"]) {
      const el = this.menus.querySelector("#" + id) as HTMLInputElement | null;
      el?.addEventListener("input", () => this.onSetting(id, Number(el.value)));
    }
    const q = this.menus.querySelector("#quality") as HTMLSelectElement | null;
    q?.addEventListener("change", () => this.onSetting("quality", q.value));
    this.menus.querySelectorAll("[data-bind]").forEach((el) => {
      el.addEventListener("click", () => this.onBind("p1", (el as HTMLElement).dataset.bind!));
    });
  }

  showHud(html: string) {
    this.hud.classList.remove("hidden");
    this.hud.classList.add("fight-hud-layer");
    this.hud.innerHTML = html;
  }

  hideHud() {
    this.hud.classList.add("hidden");
    this.hud.classList.remove("fight-hud-layer");
  }

  toast(msg: string) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    this.toasts.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }

  setupMobile(settings: SettingsData, input: { setJoy: (x: number, y: number, a: boolean) => void; setMobileButton: (r: string, d: boolean) => void }) {
    const isTouch = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
    if (!isTouch) {
      this.mobile.classList.add("hidden");
      return;
    }
    this.mobile.classList.remove("hidden");
    const L = settings.mobile;
    this.mobile.innerHTML = `
      <div class="joy" id="joy" style="left:${L.joystick.x * 100}%;top:${L.joystick.y * 100}%"><i id="knob"></i></div>
      ${mbtn("attack", "Atk", L.attack)}
      ${mbtn("block", "Blk", L.block)}
      ${mbtn("jump", "Jump", L.jump)}
      ${mbtn("dodge", "Dodge", L.dodge)}
      ${mbtn("interact", "Grab", L.interact)}
      ${mbtn("throw", "Throw", L.throw)}
    `;
    const joy = this.mobile.querySelector("#joy") as HTMLElement;
    const knob = this.mobile.querySelector("#knob") as HTMLElement;
    const start = { id: -1 };
    const sens = settings.mobile.sensitivity;
    const move = (cx: number, cy: number) => {
      const r = joy.getBoundingClientRect();
      const dx = (cx - (r.left + r.width / 2)) / (r.width / 2);
      const dy = (cy - (r.top + r.height / 2)) / (r.height / 2);
      const m = Math.hypot(dx, dy) || 1;
      const nx = (dx / m) * Math.min(1, m) * sens;
      const ny = (dy / m) * Math.min(1, m) * sens;
      knob.style.transform = `translate(${nx * 28}px, ${ny * 28}px)`;
      input.setJoy(nx, ny, true);
    };
    joy.addEventListener("touchstart", (e) => {
      const t = e.changedTouches[0];
      start.id = t.identifier;
      move(t.clientX, t.clientY);
    });
    window.addEventListener("touchmove", (e) => {
      for (const t of Array.from(e.changedTouches)) if (t.identifier === start.id) move(t.clientX, t.clientY);
    });
    window.addEventListener("touchend", (e) => {
      for (const t of Array.from(e.changedTouches))
        if (t.identifier === start.id) {
          start.id = -1;
          knob.style.transform = "";
          input.setJoy(0, 0, false);
        }
    });
    this.mobile.querySelectorAll(".mbtn").forEach((btn) => {
      const role = (btn as HTMLElement).dataset.role!;
      btn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        input.setMobileButton(role, true);
      });
      btn.addEventListener("touchend", () => input.setMobileButton(role, false));
    });
  }
}

function hubDrawer() {
  return `<div class="hub-drawer">
    <div class="hub-drawer-panel">
      <button data-nav="character">Character</button>
      <button data-nav="weapons">Armory</button>
      <button data-nav="armor">Armor</button>
      <button data-nav="stats">Records</button>
      <button data-nav="settings">Settings</button>
      <button data-nav="drawer-toggle">Close</button>
    </div>
  </div>`;
}

function charSlotCard(slot: (typeof CHAR_SLOTS)[0], save: SaveData, selected: boolean) {
  const owned = save.unlockedChars.includes(slot.id) || slot.cost === 0;
  const stats = computeStats(save);
  const ap = { ...save.appearance, name: slot.name, primary: slot.primary };
  const loadout: Loadout = {
    ...save.loadout,
    weaponId: slot.loadout.weaponId ?? save.loadout.weaponId,
    offhandId: slot.loadout.offhandId !== undefined ? slot.loadout.offhandId : save.loadout.offhandId,
  };
  return `<div class="char-slot ${owned ? "" : "locked"} ${selected ? "selected" : ""}" data-price="${slot.cost} denarii" data-char="${slot.id}" data-locked="${owned ? 0 : 1}">
    ${charCard(ap, loadout, { ...stats, className: slot.className }, false)}
  </div>`;
}

function charCard(ap: Appearance, loadout: Loadout, stats: FighterStats, withCanvas: boolean) {
  return `<div class="char-card">
    <div class="char-class">${escapeHtml(stats.className)}</div>
    <div class="char-name">${escapeHtml(ap.name)}</div>
    ${withCanvas ? `<canvas class="char-preview" id="preview" width="200" height="220"></canvas>` : `<div style="height:140px"></div>`}
    <div class="stat-badge tl" title="Power">⚔ ${stats.power}</div>
    <div class="stat-badge ml" title="Vitality">♥ ${stats.vitality}</div>
    <div class="stat-badge tr" title="Reach">↔ ${stats.reach}</div>
    <div class="stat-badge bl" title="Defense">⛨ ${stats.defense}</div>
    <div class="stat-badge br" title="Agility">◎ ${stats.agility}</div>
    <div class="hp-strip"><span class="drop"></span> ${stats.maxHp} / ${stats.maxHp}</div>
  </div>`;
}

function modeTile(id: string, label: string, area: string) {
  return `<button class="mode-tile ${area}" data-mode="${id}" type="button">
    <div class="tile-art"><canvas data-mode-art="${id}" width="320" height="180"></canvas></div>
    <span class="mode-label">${label}</span>
  </button>`;
}

function screenHeader(title: string, coins: string) {
  return `<header class="sheet-head"><h2>${title}</h2>${coins}</header>`;
}

function coinRow(n: number) {
  return `<div class="coin-row"><span class="ico-coin"></span><b>${n}</b></div>`;
}

function weaponCard(w: (typeof WEAPONS)[0], save: SaveData) {
  const owned = save.unlockedWeapons.includes(w.id) || w.unlockLevel <= save.level;
  const eq = save.loadout.weaponId === w.id || save.loadout.offhandId === w.id;
  return `<div class="item-card ${owned ? "" : "locked"} ${eq ? "equipped" : ""}" data-weapon="${w.id}">
    <h4>${w.name}</h4><p>${w.description}</p>
    <small>Dmg ${w.damage} · Reach ${w.reach}</small>
  </div>`;
}

function armorCard(a: (typeof ARMOR)[0], save: SaveData, slot: ArmorSlot) {
  const owned = save.unlockedArmor.includes(a.id) || a.unlockLevel <= save.level;
  const eq = save.loadout.armor[slot] === a.id;
  return `<div class="item-card ${owned ? "" : "locked"} ${eq ? "equipped" : ""}" data-armor="${a.id}">
    <h4>${a.name}</h4><p>${a.description}</p>
  </div>`;
}

function stat(k: string, v: number) {
  return `<div class="statbox"><b>${v}</b><span>${k}</span></div>`;
}

function mbtn(role: string, label: string, pos: { x: number; y: number }) {
  return `<button class="mbtn" data-role="${role}" style="left:${pos.x * 100}%;top:${pos.y * 100}%">${label}</button>`;
}

function classBlurb(cls: string) {
  const slot = CHAR_SLOTS.find((s) => s.className === cls);
  if (slot) return slot.blurb;
  return `${cls}s trade reach and weight for a distinct rhythm in the sand.`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

void ARENAS;
void CHALLENGES;
void fighterClass;
void weaponById;
